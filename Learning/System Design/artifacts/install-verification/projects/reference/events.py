"""P5 partitioned log and transactional projection/checkpoint in the same SQLite DB."""
import hashlib
import json
import sqlite3


class Pipeline:
    def __init__(self, path, partitions=4):
        self.db = sqlite3.connect(path, isolation_level=None, timeout=5)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript("""
          CREATE TABLE IF NOT EXISTS config(id INTEGER PRIMARY KEY,partitions INTEGER);
          CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,partition_id INTEGER,offset INTEGER,
            account TEXT,amount INTEGER,event_time REAL,version INTEGER,payload TEXT,UNIQUE(partition_id,offset));
          CREATE TABLE IF NOT EXISTS checkpoints(projection TEXT,partition_id INTEGER,offset INTEGER,PRIMARY KEY(projection,partition_id));
          CREATE TABLE IF NOT EXISTS totals(projection TEXT,account TEXT,amount INTEGER,PRIMARY KEY(projection,account));
          CREATE TABLE IF NOT EXISTS applied(projection TEXT,event_id TEXT,PRIMARY KEY(projection,event_id));
        """)
        existing = self.db.execute("SELECT partitions FROM config WHERE id=1").fetchone()
        if existing and existing[0] != partitions:
            self.db.close()
            raise ValueError("partition count is immutable for this teaching log")
        self.db.execute("INSERT OR IGNORE INTO config VALUES(1,?)", (partitions,))
        self.partitions = partitions

    def ingest(self, event):
        version = event.get("version", 1)
        if version not in (1, 2):
            raise ValueError("unknown event schema; quarantine upstream instead of guessing")
        amount = event.get("amount") if version == 1 else event.get("amount_minor_units")
        if not isinstance(amount, int) or isinstance(amount, bool) or not event.get("account") or not event.get("id"):
            raise ValueError("ID, account, and integer minor-unit amount required")
        payload = json.dumps(event, sort_keys=True)
        partition = int.from_bytes(hashlib.sha256(event["account"].encode()).digest()[:4], "big") % self.partitions
        self.db.execute("BEGIN IMMEDIATE")
        try:
            existing = self.db.execute("SELECT payload,partition_id,offset FROM events WHERE id=?", (event["id"],)).fetchone()
            if existing:
                if existing[0] != payload:
                    raise ValueError("event ID payload conflict")
                self.db.execute("COMMIT")
                return existing[1], existing[2]
            offset = self.db.execute("SELECT coalesce(max(offset),0)+1 FROM events WHERE partition_id=?", (partition,)).fetchone()[0]
            self.db.execute("INSERT INTO events VALUES(?,?,?,?,?,?,?,?)", (event["id"], partition, offset, event["account"], amount, event["event_time"], version, payload))
            self.db.execute("COMMIT")
            return partition, offset
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def consume(self, projection="live", crash_before_checkpoint=False, batch=100):
        if not 1 <= batch <= 1000:
            raise ValueError("bounded batch required")
        applied = 0
        for partition in range(self.partitions):
            self.db.execute("BEGIN IMMEDIATE")
            try:
                row = self.db.execute("SELECT offset FROM checkpoints WHERE projection=? AND partition_id=?", (projection, partition)).fetchone()
                cursor = row[0] if row else 0
                rows = self.db.execute("SELECT id,offset,account,amount FROM events WHERE partition_id=? AND offset>? ORDER BY offset LIMIT ?", (partition, cursor, batch)).fetchall()
                for event_id, offset, account, amount in rows:
                    inserted = self.db.execute("INSERT OR IGNORE INTO applied VALUES(?,?)", (projection, event_id)).rowcount
                    if inserted:
                        self.db.execute("INSERT INTO totals VALUES(?,?,?) ON CONFLICT(projection,account) DO UPDATE SET amount=totals.amount+excluded.amount", (projection, account, amount))
                        applied += 1
                    cursor = offset
                if crash_before_checkpoint and rows:
                    raise RuntimeError("injected crash after projection write, before checkpoint")
                self.db.execute("INSERT INTO checkpoints VALUES(?,?,?) ON CONFLICT(projection,partition_id) DO UPDATE SET offset=excluded.offset", (projection, partition, cursor))
                self.db.execute("COMMIT")
            except Exception:
                self.db.execute("ROLLBACK")
                raise
        return applied

    def replay(self, projection):
        if projection == "live":
            raise ValueError("use a new projection name for a safe backfill")
        while self.consume(projection):
            pass
        return self.reconcile(projection)

    def reconcile(self, projection="live"):
        expected = dict(self.db.execute("SELECT account,sum(amount) FROM events GROUP BY account"))
        actual = dict(self.db.execute("SELECT account,amount FROM totals WHERE projection=?", (projection,)))
        return {"matches": expected == actual, "expected": expected, "actual": actual}

    def close(self):
        self.db.close()
