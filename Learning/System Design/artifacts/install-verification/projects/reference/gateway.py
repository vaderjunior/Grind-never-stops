"""P6 deterministic local token stub: no model, network, GPU, or paid API."""
import threading
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
        self.remaining = dict(budgets)
        self.max_concurrent, self.clock = max_concurrent, clock
        self.active, self.requests, self.telemetry = {}, {}, []
        self.lock = threading.Lock()

    def stream(self, tenant, request_id, provider, max_tokens, cancel=None, timeout=5):
        """Generator caller MUST close on client disconnect; cancellation also checked per token."""
        if not isinstance(max_tokens, int) or max_tokens <= 0 or timeout <= 0:
            raise ValueError("positive token ceiling and deadline required")
        with self.lock:
            if request_id in self.requests:
                raise ValueError("request ID already used; this demo does not replay partial streams")
            if tenant not in self.remaining:
                raise PermissionError("unknown tenant")
            if self.active.get(tenant, 0) >= self.max_concurrent:
                raise OverflowError("tenant concurrency limit")
            if self.remaining[tenant] < max_tokens:
                raise OverflowError("tenant token budget exhausted")
            self.remaining[tenant] -= max_tokens  # Reserve upper bound atomically before dispatch.
            self.active[tenant] = self.active.get(tenant, 0) + 1
            self.requests[request_id] = "active"
        started, first, count, status = self.clock(), None, 0, "completed"
        source = provider.stream()
        try:
            while count < max_tokens:
                if cancel is not None and cancel.is_set():
                    status = "cancelled"
                    break
                if self.clock() - started >= timeout:
                    status = "timeout"
                    break
                try:
                    token = next(source)
                except StopIteration:
                    break
                if self.clock() - started > timeout:
                    status = "timeout"
                    break
                if cancel is not None and cancel.is_set():
                    status = "cancelled"
                    break
                count += 1
                first = first if first is not None else self.clock()
                yield token
        except GeneratorExit:
            status = "cancelled"
            raise
        except Exception:
            status = "provider_error"
            raise
        finally:
            source.close()
            with self.lock:
                self.remaining[tenant] += max_tokens - count
                self.active[tenant] -= 1
                self.requests[request_id] = status
                self.telemetry.append({"tenant": tenant, "request_id": request_id, "status": status, "output_tokens": count,
                    "ttft_seconds": None if first is None else first - started, "duration_seconds": self.clock() - started,
                    "illustrative_cost_units": count, "model": "stub-token-is-one-output-unit"})
