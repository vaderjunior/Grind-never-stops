"""P2 learner skeleton. Run exact-clock tests before concurrency tests."""
import time


class LocalLimiter:
    def __init__(self, capacity, rate, clock=time.monotonic):
        self.capacity, self.rate, self.clock = capacity, rate, clock
        self.buckets = {}

    def admit(self, tenant, cost=1):
        # L138: return allowed,tokens,last,retry_after. Clamp refill at capacity;
        # preserve last timestamp when the clock moves backwards.
        raise NotImplementedError("P2.1 token bucket")


class SharedLimiter:
    def __init__(self, path, capacity, rate, clock=time.time, failure_policy="closed"):
        self.path, self.capacity, self.rate = path, capacity, rate
        self.clock, self.failure_policy, self.unavailable = clock, failure_policy, False
        # L139: create buckets(tenant PRIMARY KEY,tokens,last); close setup connection.

    def admit(self, tenant, cost=1):
        # L139: acquire BEGIN IMMEDIATE before reading+refilling+debiting.
        # L159: return {allowed,degraded,retry_after} on injected store outage.
        raise NotImplementedError("P2.2/P2.4 atomic shared limiter")


def allocate_regions(global_capacity, allocations):
    # L158: validate nonnegative reservations and conservation of global bound.
    raise NotImplementedError("P2.3 regional reservation budget")
