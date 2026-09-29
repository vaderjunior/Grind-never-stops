# Runtime harness: Lesson 029

Teaching implementation, not a production HTTP server. Python 3.11+ standard library only; no package installation or cloud account. The executable tests cover local scope; in-memory state disappears at restart and a lock does not protect a second process.

In PowerShell from the repository root:

```powershell
python labs/runtime-harness/harness.py demo
python -m unittest discover -s labs/runtime-harness -v
```

If Python is not on PATH, use an installed Python 3.11+ interpreter's absolute path with PowerShell's `&` invocation operator. This build was tested with the bundled Python 3.12.14; the app itself uses Node and does not require Python for reading.

Expected demo: unsafe counter 1, protected counter 2, cursor continuation [3,2]. All 12 tests should pass. Timeouts in event-based tests bound a hung test; they are not performance assertions.

Optional HTTP observation, in a separate PowerShell terminal:

```powershell
python labs/runtime-harness/harness.py serve --slots 2
```

Open [health](http://127.0.0.1:8766/health), [work](http://127.0.0.1:8766/work?delay_ms=100), or [items](http://127.0.0.1:8766/items?size=2). The server binds loopback only. Ctrl+C shuts it down. Tests automatically create their own ephemeral loopback server and stop it; there is no background daemon.

Exercise: predict the lost-update trace, run the demo, then inspect `test_bound_rejects_and_releases`. Explain why the extra request gets a defined rejection and why the slot can be reused after an exception. Change the slot count in your local experiment and update the corresponding scenario rather than asserting an arbitrary elapsed speedup. Save the command, Python version, observed result, and one scope limitation in your notebook. Stop once you can explain those results; adding production persistence is later work.

The `time.sleep` call simulates blocking I/O in a worker thread. It is not a model of real provider reliability. The HTTP server's internal thread handling is intentionally simple; this exercise bounds the admitted work, not a production-grade connection accept queue.
