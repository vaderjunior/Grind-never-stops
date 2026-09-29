"""P4 SQL message log is authoritative; live notifications and presence are hints."""
import sqlite3
import time
from contextlib import contextmanager


class Hub:
    """In-process pub/sub stand-in shared by worker objects; deliberately lossy."""
    def __init__(self):
        self.subscribers = []
        self.available = True

    def publish(self, room, seq):
        if self.available:
            for subscriber in list(self.subscribers):
                try:
                    subscriber(room, seq)
                except (OSError, ConnectionError):
                    pass  # A disconnected receiver cannot roll back committed messages.


class Chat:
    def __init__(self, path, clock=time.time, hub=None):
        self.path, self.clock, self.hub = path, clock, hub
        with self.connection() as db:
            db.executescript("""
              CREATE TABLE IF NOT EXISTS members(room TEXT,user TEXT,PRIMARY KEY(room,user));
              CREATE TABLE IF NOT EXISTS rooms(room TEXT PRIMARY KEY,next_seq INTEGER);
              CREATE TABLE IF NOT EXISTS messages(room TEXT,seq INTEGER,user TEXT,client_key TEXT,body TEXT,
                PRIMARY KEY(room,seq),UNIQUE(room,user,client_key));
              CREATE TABLE IF NOT EXISTS presence(room TEXT,user TEXT,expires REAL,PRIMARY KEY(room,user));
            """)

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=5)
        try:
            with db:
                yield db
        finally:
            db.close()

    def add_member(self, room, user):
        # Administrative setup method, deliberately absent from public WebSocket commands.
        with self.connection() as db:
            db.execute("INSERT OR IGNORE INTO members VALUES(?,?)", (room, user))
            db.execute("INSERT OR IGNORE INTO rooms VALUES(?,1)", (room,))

    @staticmethod
    def authorize(db, room, user):
        if not db.execute("SELECT 1 FROM members WHERE room=? AND user=?", (room, user)).fetchone():
            raise PermissionError("membership required")

    def send(self, room, user, key, body):
        if not key or len(key) > 100 or not body or len(body) > 4000:
            raise ValueError("bounded message and idempotency key required")
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            self.authorize(db, room, user)
            previous = db.execute("SELECT seq,body FROM messages WHERE room=? AND user=? AND client_key=?", (room, user, key)).fetchone()
            if previous:
                if previous[1] != body:
                    raise ValueError("idempotency key reused for a different message")
                return previous[0]
            seq = db.execute("SELECT next_seq FROM rooms WHERE room=?", (room,)).fetchone()[0]
            db.execute("UPDATE rooms SET next_seq=next_seq+1 WHERE room=?", (room,))
            db.execute("INSERT INTO messages VALUES(?,?,?,?,?)", (room, seq, user, key, body))
        if self.hub:
            self.hub.publish(room, seq)
        return seq

    def since(self, room, user, cursor=0, limit=100):
        if not isinstance(cursor, int) or cursor < 0 or not 1 <= limit <= 100:
            raise ValueError("invalid cursor or limit")
        with self.connection() as db:
            self.authorize(db, room, user)
            return [dict(room=room, seq=row[0], user=row[1], body=row[2]) for row in db.execute(
                "SELECT seq,user,body FROM messages WHERE room=? AND seq>? ORDER BY seq LIMIT ?", (room, cursor, limit))]

    def heartbeat(self, room, user, ttl=30):
        if not 1 <= ttl <= 120:
            raise ValueError("presence TTL must be 1..120 seconds")
        with self.connection() as db:
            self.authorize(db, room, user)
            db.execute("INSERT INTO presence VALUES(?,?,?) ON CONFLICT(room,user) DO UPDATE SET expires=excluded.expires", (room, user, self.clock() + ttl))

    def online(self, room, user):
        with self.connection() as db:
            self.authorize(db, room, user)
            return [r[0] for r in db.execute("SELECT user FROM presence WHERE room=? AND expires>? ORDER BY user", (room, self.clock()))]
