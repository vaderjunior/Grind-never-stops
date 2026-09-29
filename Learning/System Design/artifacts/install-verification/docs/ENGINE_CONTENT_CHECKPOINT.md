# Engine and content checkpoint at the learning-path pivot

Bulk course authoring stopped at the user's requested pivot toward a beginner-friendly six-month guided path. This file records implementation evidence and exact boundaries; it is not a completion claim for the 300-session academy.

## Backend and prepared labs

- Shared TypeScript engine, loopback HTTP server, SQLite migrations, durable notes/drafts/attempts/reviews/interviews, real official-SDK MCP stdio adapter, versioned record import/export, and guarded reference retrieval are implemented.
- Seven engine integration tests passed. They include an actual MCP subprocess/client, persistence, timer restart, feedback evidence/weights, idempotency/conflicts, answer boundaries, migration, restore, HTTP protections, and immutable interview-definition snapshots.
- Six Python standard-library project references and separate learner TODO skeletons are present. All 24 source-mapped milestone checks passed, plus two real HTTP/WebSocket transport tests.
- The L089 coordination lab and its four deterministic history/fencing tests passed. Total Python checks last executed: 30.
- Project specs are `content/projects/P1.json` through `P6.json`; guides are `projects/P1.md` through `P6.md`. `docs/ENGINE_API.md` records the API and guarantees. References are teaching implementations with explicit limitations, not production systems.

## Authorship from the engine worker

The following 20 lesson packages are authored as drafts: 059, 069, 081–090, 091–094, 096–099. M09 is complete as a drafted module, with actual definitions `interview_017` and `interview_018`. L059/L069/L099 wrap the prepared P1.2/P1.3/P3.1 projects and their executed tests.

M10 assessment sessions 095 and 100 are **not authored**. No work started on the subsequently proposed M15 or M22–25 assignment before the user pivot. The authoring scripts contain individually written original content; they do not imply editorial approval or visual validation. Their JSON publishing status remains drafted.

The new beginner path must use its own guide identifiers and learner state, preserving the original lesson IDs and existing learner records. Its source contract and acceptance checks are being established separately.
