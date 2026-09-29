"""P1 teaching implementation: one SQLite authority, optional disposable cache."""
import hashlib
import secrets
import sqlite3
import time
from urllib.parse import urlparse


class Cache:
    def __init__(self):
        self.data = {}
        self.available = True

    def get(self, key):
        if not self.available:
            raise ConnectionError("injected cache outage")
        return self.data.get(key)

    def put(self, key, value):
        if not self.available:
            raise ConnectionError("injected cache outage")
        self.data[key] = value


class Shortener:
    def __init__(self, path, clock=time.time, cache=None, code_factory=None):
        self.db = sqlite3.connect(path, isolation_level=None, timeout=5)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS links(code TEXT PRIMARY KEY, url TEXT NOT NULL, expires REAL)")
        self.clock, self.cache = clock, cache
        self.code_factory = code_factory or (lambda: secrets.token_urlsafe(6))
        self.metrics = dict(database_reads=0, cache_hits=0, cache_failures=0)

    def create(self, url, ttl=None):
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or len(url) > 4096:
            raise ValueError("a valid HTTP(S) destination without credentials is required")
        if ttl is not None and ttl <= 0:
            raise ValueError("ttl must be positive")
        expires = None if ttl is None else self.clock() + ttl
        for _ in range(10):
            code = self.code_factory()
            if not code or not code.replace("-", "").replace("_", "").isalnum():
                raise ValueError("unsafe generated code")
            try:
                self.db.execute("INSERT INTO links VALUES(?,?,?)", (code, url, expires))
                return code
            except sqlite3.IntegrityError:
                continue
        raise RuntimeError("collision retry budget exhausted")

    def resolve(self, code):
        row = None
        if self.cache:
            try:
                row = self.cache.get(code)
                if row is not None:
                    self.metrics["cache_hits"] += 1
            except ConnectionError:
                self.metrics["cache_failures"] += 1
        if row is None:
            self.metrics["database_reads"] += 1
            row = self.db.execute("SELECT url, expires FROM links WHERE code=?", (code,)).fetchone()
            if row and self.cache:
                try:
                    self.cache.put(code, row)
                except ConnectionError:
                    self.metrics["cache_failures"] += 1
        if row is None or (row[1] is not None and self.clock() >= row[1]):
            raise KeyError(code)
        return row[0]

    def close(self):
        self.db.close()


def partition(key, nodes):
    """Rendezvous hashing simulation, not actual data migration or replication."""
    if not nodes:
        raise ValueError("at least one node required")
    return max(nodes, key=lambda node: hashlib.sha256(f"{key}:{node}".encode()).digest())


def partition_report(keys, old_nodes, new_nodes):
    placements = [partition(k, new_nodes) for k in keys]
    return {"keys": len(keys), "moved": sum(partition(k, old_nodes) != n for k, n in zip(keys, placements)),
            "load": {node: placements.count(node) for node in new_nodes}}
