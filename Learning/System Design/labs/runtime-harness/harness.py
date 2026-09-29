"""Local teaching harness. Standard library only; deliberately not production code."""
from __future__ import annotations

import argparse
import asyncio
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen


def cursor_page(ids: list[int], after: int | None, size: int) -> list[int]:
    if not 1 <= size <= 100:
        raise ValueError("size must be between 1 and 100")
    return [i for i in sorted(set(ids), reverse=True)
            if after is None or i < after][:size]


async def counter_example(protected: bool) -> int:
    """Force both unsafe tasks to observe the same old state deterministically."""
    counter = 0
    lock = asyncio.Lock()
    both_read = asyncio.Event()
    reads = 0

    async def increment() -> None:
        nonlocal counter, reads
        if protected:
            async with lock:
                old = counter
                await asyncio.sleep(0)
                counter = old + 1
        else:
            old = counter
            reads += 1
            if reads == 2:
                both_read.set()
            await both_read.wait()
            counter = old + 1

    await asyncio.gather(increment(), increment())
    return counter


class Inventory:
    """One-process authority; persistence and cross-process safety are out of scope."""
    def __init__(self, quantity: int = 1) -> None:
        self.quantity = quantity
        self.accepted: list[str] = []
        self._lock = threading.Lock()

    def reserve(self, actor: str) -> bool:
        with self._lock:
            if self.quantity <= 0:
                return False
            self.quantity -= 1
            self.accepted.append(actor)
            return True


class WorkBudget:
    """Reject excess work instead of retaining an unbounded queue of requests."""
    def __init__(self, slots: int) -> None:
        if slots <= 0:
            raise ValueError("slots must be positive")
        self._slots = threading.BoundedSemaphore(slots)
        self._lock = threading.Lock()
        self.active = 0
        self.maximum = 0

    def run(self, work) -> object:
        if not self._slots.acquire(blocking=False):
            raise OverflowError("all teaching work slots are occupied")
        with self._lock:
            self.active += 1
            self.maximum = max(self.maximum, self.active)
        try:
            return work()
        finally:
            with self._lock:
                self.active -= 1
            self._slots.release()


def handler_for(budget: WorkBudget):
    class Handler(BaseHTTPRequestHandler):
        server_version = "AcademyTeachingHarness/1"

        def log_message(self, fmt: str, *args) -> None:
            print(json.dumps({"event": "request", "message": fmt % args}), flush=True)

        def respond(self, status: int, body: dict) -> None:
            encoded = json.dumps(body).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def do_GET(self) -> None:
            url = urlparse(self.path)
            query = parse_qs(url.query)
            if url.path == "/health":
                self.respond(200, {"status": "ready", "teaching_only": True})
                return
            if url.path == "/work":
                try:
                    delay = int(query.get("delay_ms", ["50"])[0])
                    if not 0 <= delay <= 1000:
                        raise ValueError("delay_ms must be 0..1000")
                    def simulated_io() -> dict:
                        started = time.monotonic()
                        time.sleep(delay / 1000)
                        return {"simulated_io_ms": delay,
                                "elapsed_ms": round((time.monotonic()-started)*1000, 2)}
                    result = budget.run(simulated_io)
                    self.respond(200, result)
                except ValueError as error:
                    self.respond(400, {"error": str(error)})
                except OverflowError:
                    self.respond(503, {"error": "capacity_full", "retryable": True})
                return
            if url.path == "/items":
                try:
                    after = int(query["after"][0]) if "after" in query else None
                    size = int(query.get("size", ["2"])[0])
                    self.respond(200, {"items": cursor_page(list(range(1, 11)), after, size)})
                except ValueError as error:
                    self.respond(400, {"error": str(error)})
                return
            self.respond(404, {"error": "not_found"})
    return Handler


def request(url: str) -> dict:
    try:
        with urlopen(url, timeout=3) as response:
            return {"status": response.status, "body": json.load(response)}
    except HTTPError as error:
        return {"status": error.code, "body": json.load(error)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    server = sub.add_parser("serve")
    server.add_argument("--port", type=int, default=8766)
    server.add_argument("--slots", type=int, default=2)
    sub.add_parser("demo")
    args = parser.parse_args()
    if args.command == "serve":
        httpd = ThreadingHTTPServer(("127.0.0.1", args.port), handler_for(WorkBudget(args.slots)))
        print(f"Teaching server: http://127.0.0.1:{httpd.server_port}; Ctrl+C stops it.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            httpd.server_close()
    else:
        print(json.dumps({"unsafe_counter": asyncio.run(counter_example(False)),
                          "protected_counter": asyncio.run(counter_example(True)),
                          "cursor_after_insert": cursor_page([6,5,4,3,2,1],4,2)}))


if __name__ == "__main__":
    main()
