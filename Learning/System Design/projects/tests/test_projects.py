"""Twenty-four milestone checks. Default: references. Set ACADEMY_LAB_IMPLEMENTATION=learner for your solutions."""
import concurrent.futures
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import threading
import unittest
from contextlib import closing

ROOT = Path(__file__).resolve().parents[1]
implementation = os.environ.get("ACADEMY_LAB_IMPLEMENTATION", "reference")
if implementation not in ("reference", "learner"):
    raise ValueError("implementation must be reference or learner")
sys.path.insert(0, str(ROOT / implementation))
from shortener import Shortener, Cache, partition, partition_report
from limiter import LocalLimiter, SharedLimiter, allocate_regions
from jobs import JobQueue, drain
from chat import Chat, Hub
from events import Pipeline
from gateway import Gateway, FakeClock, StubProvider


class Labs(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.now = 1000.

    def path(self, name="lab.sqlite"):
        return str(Path(self.temp.name) / name)

    def shortener(self, **kwargs):
        instance = Shortener(self.path(), clock=lambda: self.now, **kwargs)
        self.addCleanup(instance.close)
        return instance

    def queue(self, **kwargs):
        instance = JobQueue(self.path(), clock=lambda: self.now, **kwargs)
        self.addCleanup(instance.close)
        return instance

    def pipeline(self):
        instance = Pipeline(self.path())
        self.addCleanup(instance.close)
        return instance

    def test_P1_1_L039_persistence_collision_and_redirect(self):
        codes = iter(["same", "same", "next"])
        service = self.shortener(code_factory=lambda: next(codes))
        a = service.create("https://example.com/a")
        b = service.create("https://example.com/b")
        self.assertNotEqual(a, b)
        restarted = self.shortener()
        self.assertEqual(restarted.resolve(a), "https://example.com/a")
        self.assertEqual(restarted.resolve(b), "https://example.com/b")
        with self.assertRaises(ValueError):
            service.create("javascript:alert(1)")

    def test_P1_2_L059_cache_outage_and_expiry(self):
        cache = Cache()
        service = self.shortener(cache=cache)
        code = service.create("https://example.com", ttl=10)
        service.resolve(code)
        service.resolve(code)
        self.assertEqual(service.metrics["database_reads"], 1)
        self.assertEqual(service.metrics["cache_hits"], 1)
        cache.available = False
        self.assertEqual(service.resolve(code), "https://example.com")
        self.assertEqual(service.metrics["database_reads"], 2)
        self.now += 10
        cache.available = True
        with self.assertRaises(KeyError):
            service.resolve(code)

    def test_P1_3_L069_partition_movement_is_bounded(self):
        keys = [str(i) for i in range(1000)]
        report = partition_report(keys, ["a", "b"], ["a", "b", "c"])
        self.assertGreater(report["moved"], 200)
        self.assertLess(report["moved"], 450)
        for key in keys:
            before, after = partition(key, ["a", "b"]), partition(key, ["a", "b", "c"])
            self.assertTrue(before == after or after == "c")

    def test_P1_4_L152_skew_evidence_and_failure_budget(self):
        report = partition_report(["viral"] * 900 + [str(i) for i in range(100)], ["a", "b"], ["a", "b", "c"])
        self.assertGreater(max(report["load"].values()), 900)
        service = self.shortener(code_factory=lambda: "fixed")
        service.create("https://example.com/one")
        with self.assertRaises(RuntimeError):
            service.create("https://example.com/two")

    def test_P2_1_L138_exact_refill_and_backwards_clock(self):
        limiter = LocalLimiter(2, 1, clock=lambda: self.now)
        self.assertTrue(limiter.admit("alice")["allowed"])
        self.assertTrue(limiter.admit("alice")["allowed"])
        self.assertFalse(limiter.admit("alice")["allowed"])
        self.now += .5
        self.assertAlmostEqual(limiter.admit("alice")["retry_after"], .5)
        self.now -= 10
        self.assertFalse(limiter.admit("alice")["allowed"])
        self.now += 10.5
        self.assertTrue(limiter.admit("alice")["allowed"])

    def test_P2_2_L139_concurrent_atomic_admission(self):
        limiter = SharedLimiter(self.path(), 10, 1, clock=lambda: self.now)
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
            admitted = list(pool.map(lambda _: limiter.admit("tenant")["allowed"], range(50)))
        self.assertEqual(sum(admitted), 10)

    def test_P2_3_L158_regional_budget_conservation(self):
        self.assertEqual(sum(allocate_regions(100, {"eu": 60, "us": 40}).values()), 100)
        with self.assertRaises(ValueError):
            allocate_regions(100, {"eu": 70, "us": 50})

    def test_P2_4_L159_explicit_degraded_policy(self):
        for policy, expected in [("open", True), ("closed", False)]:
            limiter = SharedLimiter(self.path(policy + ".sqlite"), 1, 1, failure_policy=policy)
            limiter.unavailable = True
            self.assertEqual(limiter.admit("tenant")["allowed"], expected)
            self.assertTrue(limiter.admit("tenant")["degraded"])

    def test_P3_1_L099_expired_worker_cannot_commit(self):
        queue = self.queue()
        queue.enqueue("job1", {"value": 2})
        old = queue.claim(10)
        self.now += 10
        new = queue.claim(10)
        self.assertNotEqual(old["token"], new["token"])
        with self.assertRaises(PermissionError):
            queue.complete("job1", old["token"], 4)
        queue.complete("job1", new["token"], 4)
        self.assertEqual(queue.metrics(), {"done": 1})

    def test_P3_2_L129_retries_and_dead_letters(self):
        queue = self.queue(max_attempts=2)
        queue.enqueue("bad", {})
        claim = queue.claim()
        queue.fail("bad", claim["token"], "transient")
        self.assertIsNone(queue.claim())
        self.now += 2
        claim = queue.claim()
        queue.fail("bad", claim["token"], "poison")
        self.assertEqual(queue.metrics(), {"dead": 1})

    def test_P3_3_L148_bounded_queue_and_graceful_stop(self):
        queue = self.queue(capacity=1)
        queue.enqueue("one", {"n": 1})
        with self.assertRaises(OverflowError):
            queue.enqueue("two", {})
        stop = threading.Event()
        stop.set()
        self.assertEqual(drain(queue, lambda x: x, stop), 0)
        stop.clear()
        self.assertEqual(drain(queue, lambda x: x["n"] * 2, stop), 1)

    def test_P3_4_L149_duplicate_and_restore_drill(self):
        queue = self.queue()
        queue.enqueue("one", {"n": 1})
        queue.enqueue("one", {"n": 1})
        with self.assertRaises(ValueError):
            queue.enqueue("one", {"n": 2})
        claim = queue.claim()
        queue.complete("one", claim["token"], 2)
        backup = self.path("backup.sqlite")
        queue.backup(backup)
        with closing(sqlite3.connect(backup)) as restored:
            self.assertEqual(restored.execute("SELECT state FROM jobs").fetchone()[0], "done")
            self.assertEqual(restored.execute("SELECT count(*) FROM effects").fetchone()[0], 1)

    def chat(self, hub=None):
        chat = Chat(self.path(), clock=lambda: self.now, hub=hub)
        chat.add_member("room", "alice")
        chat.add_member("room", "bob")
        return chat

    def test_P4_1_L173_durable_order_and_idempotence(self):
        chat = self.chat()
        self.assertEqual(chat.send("room", "alice", "a1", "hello"), 1)
        self.assertEqual(chat.send("room", "alice", "a1", "hello"), 1)
        self.assertEqual(chat.send("room", "bob", "b1", "hi"), 2)
        restarted = self.chat()
        self.assertEqual([m["seq"] for m in restarted.since("room", "alice")], [1, 2])

    def test_P4_2_L174_reconnect_cursor_and_lost_notification(self):
        hub = Hub()
        chat = self.chat(hub)
        received = []
        hub.subscribers.append(lambda room, seq: received.append(seq))
        chat.send("room", "alice", "one", "one")
        hub.available = False
        chat.send("room", "alice", "two", "two")
        self.assertEqual(received, [1])
        self.assertEqual([m["seq"] for m in chat.since("room", "bob", 1)], [2])

    def test_P4_3_L188_multiple_workers_and_presence_expiry(self):
        hub = Hub()
        a, b = self.chat(hub), self.chat(hub)
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            sequences = list(pool.map(lambda i: (a if i % 2 else b).send("room", "alice", str(i), str(i)), range(20)))
        self.assertEqual(sorted(sequences), list(range(1, 21)))
        a.heartbeat("room", "alice", 10)
        self.assertEqual(b.online("room", "bob"), ["alice"])
        self.now += 10
        self.assertEqual(b.online("room", "bob"), [])

    def test_P4_4_L189_unauthorized_and_conflicting_writes(self):
        chat = self.chat()
        with self.assertRaises(PermissionError):
            chat.send("room", "mallory", "x", "attack")
        with self.assertRaises(PermissionError):
            chat.since("room", "mallory")
        chat.send("room", "alice", "a", "original")
        with self.assertRaises(ValueError):
            chat.send("room", "alice", "a", "changed")
        self.assertEqual(len(chat.since("room", "bob")), 1)

    def event(self, event_id, amount=10, event_time=100, version=1):
        return {"id": event_id, "account": "a", "event_time": event_time, "version": version,
                "amount" if version == 1 else "amount_minor_units": amount}

    def test_P5_1_L109_partition_order_and_idempotent_ingest(self):
        p = self.pipeline()
        first = p.ingest(self.event("one"))
        self.assertEqual(p.ingest(self.event("one")), first)
        second = p.ingest(self.event("two"))
        self.assertEqual(first[0], second[0])
        self.assertEqual(second[1], first[1] + 1)

    def test_P5_2_L119_duplicates_and_late_events(self):
        p = self.pipeline()
        p.ingest(self.event("one", 10, 200))
        p.ingest(self.event("late", -3, 100))
        p.consume()
        p.consume()
        self.assertEqual(p.reconcile()["actual"], {"a": 7})
        self.assertTrue(p.reconcile()["matches"])

    def test_P5_3_L238_crash_atomicity_restart_and_replay(self):
        p = self.pipeline()
        p.ingest(self.event("one"))
        with self.assertRaises(RuntimeError):
            p.consume(crash_before_checkpoint=True)
        self.assertEqual(p.reconcile()["actual"], {})
        restarted = self.pipeline()
        restarted.consume()
        self.assertTrue(restarted.reconcile()["matches"])
        self.assertTrue(restarted.replay("backfill-v2")["matches"])

    def test_P5_4_L239_schema_migration_conflicts_and_reconciliation(self):
        p = self.pipeline()
        p.ingest(self.event("v1", 10))
        p.ingest(self.event("v2", 20, version=2))
        with self.assertRaises(ValueError):
            p.ingest(self.event("v2", 999, version=2))
        with self.assertRaises(ValueError):
            p.ingest(self.event("future", version=3))
        p.consume()
        self.assertEqual(p.reconcile()["actual"], {"a": 30})

    def gateway(self):
        clock = FakeClock()
        return clock, Gateway({"alice": 100, "bob": 100}, max_concurrent=1, clock=clock)

    def test_P6_1_L269_cancellable_stream(self):
        clock, gateway = self.gateway()
        stream = gateway.stream("alice", "r1", StubProvider(clock), 3)
        self.assertEqual(next(stream), "Hello")
        stream.close()
        self.assertEqual(gateway.telemetry[-1]["status"], "cancelled")
        self.assertEqual(gateway.remaining["alice"], 99)
        self.assertEqual(gateway.active["alice"], 0)

    def test_P6_2_L286_tenant_admission_and_budget_reservations(self):
        clock, gateway = self.gateway()
        stream = gateway.stream("alice", "r1", StubProvider(clock), 10)
        next(stream)
        with self.assertRaises(OverflowError):
            list(gateway.stream("alice", "r2", StubProvider(clock), 10))
        self.assertEqual(len(list(gateway.stream("bob", "r3", StubProvider(clock), 2))), 2)
        stream.close()
        with self.assertRaises(OverflowError):
            list(gateway.stream("bob", "r4", StubProvider(clock), 100))

    def test_P6_3_L287_provider_error_and_timeout_release_reservation(self):
        clock, gateway = self.gateway()
        with self.assertRaises(ConnectionError):
            list(gateway.stream("alice", "fail", StubProvider(clock, fail_at=1), 3))
        self.assertEqual(gateway.remaining["alice"], 99)
        self.assertEqual(gateway.telemetry[-1]["status"], "provider_error")
        self.assertEqual(list(gateway.stream("alice", "timeout", StubProvider(clock, token_seconds=2), 3, timeout=1)), [])
        self.assertEqual(gateway.telemetry[-1]["status"], "timeout")
        self.assertEqual(gateway.active["alice"], 0)

    def test_P6_4_L288_latency_cost_and_repeat_request_evidence(self):
        clock, gateway = self.gateway()
        for index in range(10):
            list(gateway.stream("alice", str(index), StubProvider(clock), 3))
        self.assertEqual(sum(row["output_tokens"] for row in gateway.telemetry), 30)
        self.assertAlmostEqual(gateway.telemetry[0]["ttft_seconds"], .02)
        self.assertAlmostEqual(gateway.telemetry[0]["duration_seconds"], .06)
        self.assertEqual(gateway.remaining["alice"], 70)
        with self.assertRaises(ValueError):
            list(gateway.stream("alice", "0", StubProvider(clock), 3))


if __name__ == "__main__":
    unittest.main(verbosity=2)
