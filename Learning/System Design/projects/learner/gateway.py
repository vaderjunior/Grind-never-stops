"""P6 learner skeleton. Stub tokens are output units, not real model tokenizer IDs."""
import time


class FakeClock:
    def __init__(self):
        self.now = 0.

    def __call__(self):
        return self.now

    def advance(self, seconds):
        self.now += seconds


class StubProvider:
    def __init__(self, clock, tokens=("Hello", " ", "world"), token_seconds=.02, fail_at=None):
        self.clock, self.tokens, self.token_seconds, self.fail_at = clock, tokens, token_seconds, fail_at

    def stream(self):
        for index, token in enumerate(self.tokens):
            self.clock.advance(self.token_seconds)
            if index == self.fail_at:
                raise ConnectionError("injected provider disconnect")
            yield token


class Gateway:
    def __init__(self, budgets, max_concurrent=2, clock=time.monotonic):
        self.remaining, self.active, self.requests, self.telemetry = dict(budgets), {}, {}, []
        self.max_concurrent, self.clock = max_concurrent, clock
        # L286: add a lock around admission+reservation and release+accounting.

    def stream(self, tenant, request_id, provider, max_tokens, cancel=None, timeout=5):
        # L269: a generator, closing provider in finally on disconnect.
        # L286: reserve maximum tokens before provider starts; isolate tenants.
        # L287: release unused reservations on errors, timeout, cancellation, close.
        # L288: record TTFT, duration, delivered units and request outcome explicitly.
        raise NotImplementedError("P6 bounded streaming gateway")
        yield  # Preserve generator API shape for the learner.
