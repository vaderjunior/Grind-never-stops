# FORM — your local System Design Academy

Start in **Learn** at [http://127.0.0.1:4310/#learn](http://127.0.0.1:4310/#learn). The main course now teaches the building blocks before asking you to design large systems.

## Start the app

Requirements: Node.js 24.13 or newer and npm. Verified on Windows with PowerShell, Node 24.13.0, npm 11.6.2, and Microsoft Edge.

```powershell
Set-Location 'D:\AIOps Infra Path\Learning\System Design'
npm run setup
npm start
```

`setup` installs the locked dependencies and builds the app. Internet is needed for initial installation. On later visits, run `npm start` and open the local URL. Press Ctrl+C in its terminal to stop. `npm run dev` is available when editing the interface. The app binds to your computer's loopback address, not the public network.

The source ZIP can be extracted elsewhere; run the same commands from its extracted directory. Do not replace an existing `data/` directory when moving source files.

## What to study

The primary course contains **76 authored chapters across 24 flexible weeks**, with **36 foundation chapters in the first eight weeks**. Each chapter contains plain-language definitions, worked examples, diagrams, a small exercise with an explained solution, five checks, and five recall cards. The illustrative teaching pass revisited every original chapter and added four foundation workshops: reading diagrams, HTTP responses/errors, pagination, and units. Every chapter now has an interactive worked walkthrough, at least two original diagrams, and concrete example or comparison tables.

1. Computers, requests, DNS, protocols, APIs, memory, SQL, indexes, data models, and storage families.
2. Capacity, scaling, gateways, service boundaries, Redis, cache patterns, containers, queues, and job lifecycles.
3. Replication, sharding, consistency, partitions, events, permissions, and rate limits.
4. Reliability, observability, recovery, Kubernetes, and interview communication.
5. Notifications, rate limiting, chat, feeds, files, video, search, bookings, and payments.
6. Coordination, migrations, MCP platforms, GPU/model serving, RAG, AI operations, and final mocks.

Plan roughly 5–7 hours a week. Study steps can be combined into longer sessions every two days. Repeat a week when needed. Early exercises explain one component at a time; larger interview problems follow the foundation. The calendar does not lock content or claim that reading alone establishes interview readiness.

For your first session: open **Learn → Start learning**, trace the save/read diagram, write your explanation, save it, answer the checks, and only then reveal the worked example. Mark the lesson complete when you can explain its main idea. Visit **Review queue** for recall practice. **Glossary** and course search link back to relevant teaching.

Later, use **Interview practice** for a saved coaching/exam session. Candidate turns, pauses, hints, feedback, and debrief are separate records. An external AI can help through MCP, but the app never invents an interview score. Open-ended guide answers are saved for comparison, not automatically graded by keywords.

## Your records and offline use

Learner records live under `data/` in SQLite. Practice drafts also recover in the current browser; use **Save my work** to put them in the durable learner record. **Settings → Export records** creates portable JSON. Database backups and restore use the SQLite backup workflow, with a safety snapshot before replacement. Keep backups outside the device too if protection against device loss matters.

Core lessons, diagrams, search, quizzes, notes, review, and interview records work offline after installation. Optional articles/videos require internet and may have their own access requirements. AI tutoring uses your selected provider: requested course excerpts and submitted conversation material leave the laptop through that client. Running this app locally does not run the model locally. No analytics or telemetry is built into the study app.

In a worked walkthrough, use **Next step** to see what changes, or choose a numbered step with the mouse or keyboard. Use **Print chapter** for the current guided lesson, then your browser's Save as PDF; printing includes every walkthrough step. Unrevealed worked solutions stay absent. The older library also has lesson/module workbooks with explicit questions/solutions controls. See `docs/ILLUSTRATED_TEACHING.md` for the teaching approach. Canonical teaching and diagrams are editable in `content/guides/*.json`; printed output uses the same content.

Diagrams keep their labels readable and show ordinary flows from top to bottom. Scroll inside a large diagram or use its expand/zoom controls. **Read diagram as text** provides its explanation and every label. Printed chapters include those labels too. See `docs/DIAGRAM_RENDERING.md` for the renderer and full-course visibility checks.

## References and the earlier course library

Both requested GitHub repositories were cloned to `reference-repos/` and reviewed. The main course uses original text and diagrams; curated external links credit their creators. The unchanged reference clones are not bundled in the source ZIP. See the two `docs/REFERENCE_REVIEW_*.md` reports for inventories, checked links, limitations, and licensing observations.

The original **300-session Course library remains a separate, partial reference collection**: currently 105 authored session bodies and 195 metadata-only entries. It is not a completed 300-session textbook and is not the prerequisite route for Learn. The 76-chapter Learn path is fully authored. Its independent AI editorial review is distinct from learner testing or expert certification. Six Python project skeletons, reference implementations, and 24 prepared milestones remain available; see `projects/README.md`.

## Verification and AI connection

```powershell
npm run check
npm run test:browser:learn
npm run test:browser:illustrated
npm run test:browser
npm run diagrams
npm run doctor
```

Browser scripts use installed Edge on Windows and isolated test records under `artifacts/`; they do not write to your learner database. See `QA_REPORT.md` for executed results and limits, `docs/MCP_SETUP.md` for the tested local stdio client, and `docs/ENGINE_API.md` for API/reveal boundaries. The one explicitly approved live Codex retrieval succeeded using ephemeral configuration; no personal client settings were changed.

Authoring scripts are preparation tools. The JSON files are the editable content source; rerunning an older authoring script can replace later editorial corrections. Validate current content and review hashes after any change.
