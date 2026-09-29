# System Design Academy

The user's latest direction takes priority: a broad, patient foundation like their supplied ChatGPT lessons, followed by distributed systems, reliability, Kubernetes/Kyma, MCP platforms, AI infrastructure, and interviews. Learn contains 76 authored chapters over 24 flexible weeks, with 36 foundations before larger design problems. Every guide now has original diagrams, concrete tables, and an authored step-through walkthrough. Preserve these illustrative teaching structures and existing assessment/card identities. Content clarity is the main deliverable; the application is its tool. Preserve the original 300-session catalog as a separate partial reference library and never count metadata-only entries as authored lessons. The main learning path lives in content/learning-path.json, with original chapters in content/guides/. External curated resources supplement the offline teaching. Do not rerun old authoring scripts over edited JSON without preserving editorial corrections and refreshing exact-hash review evidence.

## Architecture
React/TypeScript + Vite; one Node 24 local HTTP backend owning SQLite; an official MCP SDK stdio adapter calls the same protected loopback API. Bind to 127.0.0.1. No paid API or remote service is needed for ordinary study. Never expose arbitrary shell execution or filesystem reads through the API.

## Sources and authoring
Keep the original blueprint files intact. `content/manifest.json` preserves source catalog IDs/titles, module dependencies, priorities, timings, routes, and project links. Author original material in `content/lessons/NNN.json` and private assessment material in `content/interviews/`. Metadata provenance is separate from original teaching material. Red extensions cannot become implicit general-route prerequisites. Lessons 227/247 require 079; 297/298 require a selected specialist branch.

Keep answers and debriefs out of candidate retrieval, search, and exports before reveal. The local filesystem is not an anti-cheating boundary. Feedback must cite actual submitted evidence. Self-assessment and AI feedback are explicitly labeled.

## Working rules
Preserve learner state under data/. Use migrations and transactions. Test security and reveal behavior at the backend, meaningful persistence/quiz/interview journeys, and genuine SDK subprocess communication. Keep stdout reserved for MCP protocol. No public deployment or client configuration edits without user authorization.

Diagram changes must preserve complete visible labels, readable default sizing, and the text alternative. Use the shared Mermaid configuration with root-level htmlLabels false. Run the actual reader visibility check (`npm run test:diagrams`) when changing rendering; a successful Mermaid render alone does not prove labels are visible. See docs/DIAGRAM_RENDERING.md.

## Continuation contract
Read the project instructions, BUILD_STATUS.md, content/content-status.json, and QA_REPORT.md. Continue the first unfinished required item, preserve completed work and learner data, run relevant checks, and update the records. Do not restart the project or replace finished content with templates. Record actual evidence and limitations.
