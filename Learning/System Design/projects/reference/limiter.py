"""P2 token buckets with an injected clock; SQLite serializes shared admission."""
import sqlite3
import time
from contextlib import closing


def calculate(tokens, last, now, capacity, rate, cost):
    if capacity <= 0 or rate <= 0 or cost <= 0 or cost > capacity:
        raise ValueError("require positive capacity/rate and 0 < cost <= capacity")
    now = max(now, last)  # Backward wall-clock changes cannot mint tokens.
    tokens = min(capacity, tokens + (now - last) * rate)
    allowed = tokens + 1e-9 >= cost
    return {"allowed": allowed, "tokens": max(0., tokens - cost) if allowed else tokens,
            "last": now, "retry_after": 0. if allowed else (cost - tokens) / rate}


class LocalLimiter:
    def __init__(self, capacity, rate, clock=time.monotonic):
        self.capacity, self.rate, self.clock = capacity, rate, clock
        self.buckets = {}

    def admit(self, tenant, cost=1):
        now = self.clock()
        tokens, last = self.buckets.get(tenant, (self.capacity, now))
        result = calculate(tokens, last, now, self.capacity, self.rate, cost)
        self.buckets[tenant] = result["tokens"], result["last"]
        return result


class SharedLimiter:
    def __init__(self, path, capacity, rate, clock=time.time, failure_policy="closed"):
        if failure_policy not in ("open", "closed"):
            raise ValueError("explicit open/closed policy required")
        self.path, self.capacity, self.rate, self.clock, self.failure_policy = path, capacity, rate, clock, failure_policy
        with closing(sqlite3.connect(path, timeout=5)) as db, db:
            db.execute("CREATE TABLE IF NOT EXISTS buckets(tenant TEXT PRIMARY KEY, tokens REAL, last REAL)")
        self.unavailable = False

    def admit(self, tenant, cost=1):
        # Validate even when storage is down: an invalid request never gains fail-open privileges.
        calculate(self.capacity, 0, 0, self.capacity, self.rate, cost)
        try:
            if self.unavailable:
                raise sqlite3.OperationalError("injected store outage")
            with closing(sqlite3.connect(self.path, timeout=5)) as db, db:
                db.execute("BEGIN IMMEDIATE")
                now = self.clock()
                row = db.execute("SELECT tokens,last FROM buckets WHERE tenant=?", (tenant,)).fetchone()
                tokens, last = row or (self.capacity, now)
                result = calculate(tokens, last, now, self.capacity, self.rate, cost)
                db.execute("INSERT INTO buckets VALUES(?,?,?) ON CONFLICT(tenant) DO UPDATE SET tokens=excluded.tokens,last=excluded.last",
                           (tenant, result["tokens"], result["last"]))
                return {**result, "degraded": False}
        except sqlite3.OperationalError:
            return {"allowed": self.failure_policy == "open", "degraded": True, "retry_after": 1.}


def allocate_regions(global_capacity, allocations):
    """Static disjoint reservations: partition-safe bound, potentially stranded capacity."""
    if any(v < 0 for v in allocations.values()) or sum(allocations.values()) > global_capacity:
        raise ValueError("regional reservations exceed global capacity")
    return dict(allocations)
