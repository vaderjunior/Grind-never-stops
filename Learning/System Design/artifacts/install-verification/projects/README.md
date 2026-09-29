# Prepared system-design labs

These six labs implement the source curriculum’s 24 milestones. Each has a separate learner skeleton with deliberate TODOs, a working reference implementation, a project-specific guide, and deterministic tests. They use Python 3.11+ and standard-library SQLite; no cloud, broker, model API, GPU, or paid service is required. The academy website does not run arbitrary submitted code: run lab commands explicitly in a terminal.

| Project | Guide | Scheduled lessons |
|---|---|---|
| P1 URL shortener | [P1.md](P1.md) | 039, 059, 069, 152 |
| P2 Rate limiter | [P2.md](P2.md) | 138, 139, 158, 159 |
| P3 Job processing | [P3.md](P3.md) | 099, 129, 148, 149 |
| P4 Chat backend | [P4.md](P4.md) | 173, 174, 188, 189 |
| P5 Event pipeline | [P5.md](P5.md) | 109, 119, 238, 239 |
| P6 AI inference gateway | [P6.md](P6.md) | 269, 286, 287, 288 |

## Windows setup and commands

Run from the repository root. If Python is installed through the Windows launcher:

```powershell
py -3 --version
py -3 -m unittest discover -s projects/tests -v
```

If the command is `python` on your machine, replace `py -3` with `python`. In WSL use `python3`. There is no pip installation. On the tested Codex workstation the bundled interpreter was:

```powershell
& 'C:\Users\ajayt\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m unittest discover -s projects/tests -v
```

That absolute path is machine-specific; it is not a portable Python installation requirement. The normal academy reading UI only needs Node. Reference tests run against temporary databases and remove their own fixtures. They never read or mutate `data/academy.sqlite`.

Select one prepared milestone, edit its learner file, and run its tests against your solution:

```powershell
$env:ACADEMY_LAB_IMPLEMENTATION = 'learner'
py -3 -m unittest discover -s projects/tests -p test_projects.py -k P1_1 -v
Remove-Item Env:ACADEMY_LAB_IMPLEMENTATION
```

The TODO skeleton intentionally fails until implemented. The default is `reference`; the reference implementation provides explained, inspectable solution code. The transport tests exercise the prepared reference transport independently. Setup/environment repair is outside the milestone’s 60-minute learning budget.

## Optional HTTP and WebSocket harnesses

P1 provides a real persistent HTTP create/redirect path, bound only to `127.0.0.1:4311`:

```powershell
py -3 projects/serve_shortener.py
# In another terminal while this optional lab server runs:
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4311/links -ContentType application/json -Body '{"url":"https://example.com"}'
```

P4 supplies a real, deliberately small WebSocket scaffold at `127.0.0.1:4312`:

```powershell
py -3 projects/serve_chat.py
```

It prints two ephemeral local test-user URLs. Connect with a WebSocket-capable client and send JSON text frames:

```json
{"op":"send","room":"study","key":"my-message-1","body":"Hello"}
{"op":"since","room":"study","cursor":0}
{"op":"heartbeat","room":"study"}
```

Persist the highest applied `seq`; after reconnect request only messages after that cursor. The command response acknowledges durable storage. The scaffold does not claim automatic end-user delivery or a production authentication system. Its live hub is a lossy in-process stand-in; the deterministic multi-worker tests share a DB and exercise serialization. Text-frame size is bounded, client masking is required, fragmentation/compression are unsupported, and idle connections time out after 30 seconds. Do not expose these teaching servers publicly.

Ctrl+C stops either harness. Their default databases are inside `projects/data/`; keep those separate from learner records. Their tokens change on restart. No server is started by the ordinary study app.

## Project 3 operational handover

An operator first checks queued/running/dead counts, oldest available time, claim expiry and attempt count. Stop new claims before shutting down a worker; let bounded current work complete within a grace period. A forced termination leaves the lease to expire. A replacement worker obtains a fresh token, and old-token completion is rejected. Requeue a dead letter only after inspecting its cause and choosing a new logical job identity or a documented replay action; never wipe the durable queue to “fix” it.

Use the SQLite backup API. Verify a backup by opening it independently, inspecting a completed job and its effect ledger, and running a claim/completion exercise in the restored copy. Copying just the main file while WAL writes are active does not establish a consistent backup. Keep the original and restored copies distinguishable during a drill.

## Evidence and honest guarantees

Each guide gives a bounded task, expected result, injected fault, stopping rule, and optional extensions. Tests prove the stated teaching invariants under their fixtures, not production readiness. Useful evidence includes exact command output, a counterexample before a fix, recovery duration with units, and a statement of what is still unmodeled.

P1’s hashing demo assigns keys but does not move data. P2’s static regional reservations trade utilization for bounded partition behavior. P3’s atomic effect ledger covers only the same SQLite transaction, not email/payment effects. P4 preserves room order but makes no global ordering claim. P5’s additive totals accept late events but do not implement event-time windows. P6 uses simulated token units and time, cannot interrupt arbitrary blocking providers, and is not an inference model or real provider billing measurement.
