"""P3 durable leases plus a transactional local effect ledger (not arbitrary exactly-once I/O)."""
import json
import sqlite3
import time
import uuid
from contextlib import closing


class JobQueue:
    def __init__(self, path, clock=time.time, capacity=100, max_attempts=3):
        self.db = sqlite3.connect(path, isolation_level=None, timeout=5)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript("""
          CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,payload TEXT,state TEXT,attempts INTEGER,
            available REAL, lease_until REAL, token TEXT, last_error TEXT);
          CREATE TABLE IF NOT EXISTS effects(job_id TEXT PRIMARY KEY,result TEXT);
        """)
        self.clock, self.capacity, self.max_attempts = clock, capacity, max_attempts

    def enqueue(self, job_id, payload):
        value = json.dumps(payload, sort_keys=True)
        self.db.execute("BEGIN IMMEDIATE")
        try:
            existing = self.db.execute("SELECT payload FROM jobs WHERE id=?", (job_id,)).fetchone()
            if existing:
                if existing[0] != value:
                    raise ValueError("idempotency conflict")
            else:
                count = self.db.execute("SELECT count(*) FROM jobs WHERE state IN ('queued','running')").fetchone()[0]
                if count >= self.capacity:
                    raise OverflowError("bounded queue is full")
                self.db.execute("INSERT INTO jobs VALUES(?,?,'queued',0,?,NULL,NULL,NULL)", (job_id, value, self.clock()))
            self.db.execute("COMMIT")
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def claim(self, lease_seconds=30):
        if lease_seconds <= 0:
            raise ValueError("lease must be positive")
        now = self.clock()
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self.db.execute("UPDATE jobs SET state=CASE WHEN attempts>=? THEN 'dead' ELSE 'queued' END, token=NULL WHERE state='running' AND lease_until<=?", (self.max_attempts, now))
            job = self.db.execute("SELECT * FROM jobs WHERE state='queued' AND available<=? ORDER BY available,id LIMIT 1", (now,)).fetchone()
            if not job:
                self.db.execute("COMMIT")
                return None
            token = uuid.uuid4().hex
            self.db.execute("UPDATE jobs SET state='running',attempts=attempts+1,lease_until=?,token=? WHERE id=?", (now + lease_seconds, token, job["id"]))
            result = dict(self.db.execute("SELECT * FROM jobs WHERE id=?", (job["id"],)).fetchone())
            self.db.execute("COMMIT")
            result["payload"] = json.loads(result["payload"])
            return result
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def _owned(self, job_id, token):
        job = self.db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not job or job["state"] != "running" or job["token"] != token or job["lease_until"] <= self.clock():
            raise PermissionError("stale or expired claim token")
        return job

    def complete(self, job_id, token, result):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self._owned(job_id, token)
            self.db.execute("INSERT OR IGNORE INTO effects VALUES(?,?)", (job_id, json.dumps(result, sort_keys=True)))
            self.db.execute("UPDATE jobs SET state='done',token=NULL WHERE id=?", (job_id,))
            self.db.execute("COMMIT")
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def fail(self, job_id, token, error):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            job = self._owned(job_id, token)
            state = "dead" if job["attempts"] >= self.max_attempts else "queued"
            self.db.execute("UPDATE jobs SET state=?,available=?,last_error=?,token=NULL WHERE id=?",
                            (state, self.clock() + min(60, 2 ** job["attempts"]), str(error)[:500], job_id))
            self.db.execute("COMMIT")
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def metrics(self):
        return dict(self.db.execute("SELECT state,count(*) FROM jobs GROUP BY state").fetchall())

    def backup(self, destination):
        with closing(sqlite3.connect(destination)) as target:
            self.db.backup(target)

    def close(self):
        self.db.close()


def drain(queue, handler, stop, max_jobs=100):
    """Graceful worker: finish an owned unit before checking stop; no new claim after stop."""
    processed = 0
    while processed < max_jobs and not stop.is_set():
        job = queue.claim()
        if job is None:
            break
        try:
            queue.complete(job["id"], job["token"], handler(job["payload"]))
        except Exception as error:
            queue.fail(job["id"], job["token"], error)
        processed += 1
    return processed
