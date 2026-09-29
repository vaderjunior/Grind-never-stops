"""P1 learner skeleton. Deliberate TODOs: complete one milestone at a time."""
import sqlite3
import time


class Cache:
    def __init__(self):
        self.data, self.available = {}, True

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
        self.db = sqlite3.connect(path, isolation_level=None)
        self.db.execute("CREATE TABLE IF NOT EXISTS links(code TEXT PRIMARY KEY,url TEXT NOT NULL,expires REAL)")
        self.clock, self.cache, self.code_factory = clock, cache, code_factory
        self.metrics = dict(database_reads=0, cache_hits=0, cache_failures=0)

    def create(self, url, ttl=None):
        # L039: validate HTTP(S), generate bounded safe code, retry UNIQUE conflicts.
        raise NotImplementedError("P1.1 create")

    def resolve(self, code):
        # L039 DB lookup; L059 cache-aside with outage fallback and expiry on EVERY read.
        raise NotImplementedError("P1.1/P1.2 resolve")

    def close(self):
        self.db.close()


def partition(key, nodes):
    # L069: highest stable hash of key+node; never use Python's randomized hash().
    raise NotImplementedError("P1.3 rendezvous assignment")


def partition_report(keys, old_nodes, new_nodes):
    # L152: return keys count, moved count, and per-node request load.
    raise NotImplementedError("P1.4 movement/skew evidence")
