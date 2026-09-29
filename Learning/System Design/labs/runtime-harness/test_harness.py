import asyncio
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from http.server import ThreadingHTTPServer
from harness import Inventory, WorkBudget, counter_example, cursor_page, handler_for, request


class RuntimeTests(unittest.TestCase):
    def test_forced_lost_update_and_protection(self):
        self.assertEqual(asyncio.run(counter_example(False)), 1)
        self.assertEqual(asyncio.run(counter_example(True)), 2)

    def test_two_claims_preserve_inventory(self):
        inventory = Inventory(1)
        barrier = threading.Barrier(2)
        def claim(actor):
            barrier.wait(timeout=2)
            return inventory.reserve(actor)
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(claim, ["alice", "bob"]))
        self.assertEqual(sorted(results), [False, True])
        self.assertEqual(inventory.quantity, 0)
        self.assertEqual(len(inventory.accepted), 1)

    def test_bound_rejects_and_releases(self):
        budget = WorkBudget(1)
        entered, release = threading.Event(), threading.Event()
        def held_work():
            entered.set()
            if not release.wait(timeout=2):
                raise AssertionError("test release was never signaled")
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(budget.run, held_work)
            self.assertTrue(entered.wait(timeout=2))
            try:
                with self.assertRaises(OverflowError):
                    budget.run(lambda: None)
            finally:
                release.set()
            future.result(timeout=2)
        self.assertEqual(budget.active, 0)
        self.assertEqual(budget.maximum, 1)
        self.assertEqual(budget.run(lambda: "reused"), "reused")

    def test_exception_does_not_leak_slot(self):
        budget = WorkBudget(1)
        def failure():
            raise RuntimeError("injected failure")
        with self.assertRaises(RuntimeError):
            budget.run(failure)
        self.assertEqual(budget.active, 0)
        self.assertEqual(budget.run(lambda: 7), 7)

    def test_cursor_ignores_newer_insert(self):
        first = cursor_page([5,4,3,2,1], None, 2)
        self.assertEqual(first, [5,4])
        self.assertEqual(cursor_page([6,5,4,3,2,1], first[-1], 2), [3,2])

    def test_cursor_survives_deleted_anchor(self):
        self.assertEqual(cursor_page([5,3,2,1], 4, 2), [3,2])

    def test_invalid_page_size(self):
        for size in [0,101,-1]:
            with self.assertRaises(ValueError):
                cursor_page([1], None, size)

    def test_cancellation_releases_async_semaphore(self):
        async def scenario():
            slots = asyncio.Semaphore(1)
            entered = asyncio.Event()
            async def work():
                async with slots:
                    entered.set()
                    await asyncio.Event().wait()
            task = asyncio.create_task(work())
            await entered.wait()
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
            await asyncio.wait_for(slots.acquire(), timeout=1)
            slots.release()
        asyncio.run(scenario())


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1",0),handler_for(WorkBudget(2)))
        cls.thread = threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def test_health_real_http(self):
        result = request(self.base+"/health")
        self.assertEqual(result["status"],200)
        self.assertTrue(result["body"]["teaching_only"])

    def test_items_real_http(self):
        result = request(self.base+"/items?after=8&size=2")
        self.assertEqual(result["body"]["items"],[7,6])

    def test_bad_delay_real_http(self):
        self.assertEqual(request(self.base+"/work?delay_ms=9000")["status"],400)

    def test_simulated_work_real_http(self):
        result = request(self.base+"/work?delay_ms=0")
        self.assertEqual(result["status"],200)
        self.assertEqual(result["body"]["simulated_io_ms"],0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
