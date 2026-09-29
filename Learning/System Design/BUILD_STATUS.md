# Build status — illustrated Learn course

Updated 29 September 2026. Learn at `http://127.0.0.1:4310/#learn` is the primary course. All 72 existing chapters received an individual illustrative teaching pass, and four foundation chapters were added. The original numbered library remains a separate partial reference collection.

The subsequent diagram-label repair covers all 258 course and library diagrams: native SVG labels, ordinary flows displayed top to bottom, readable default sizing with internal scrolling, and a text alternative. All 258 passed label geometry/visibility checks in desktop/mobile and light/dark modes. Production zoom, expansion, keyboard controls, and representative printing passed. See [diagram rendering](docs/DIAGRAM_RENDERING.md) and [the visibility report](artifacts/diagram-readability/report.json).

| Item | Current result |
| --- | --- |
| Course | 76 chapters, 24 flexible weeks, 152 study steps |
| Foundations | 36 chapters in the first eight weeks |
| Teaching sections | 82,522 counted body words, plus authored walkthrough explanations |
| Worked walkthroughs | 76, with concrete state at each step |
| Guide diagrams | 165 original diagrams |
| Example/comparison tables | 161 |
| All diagrams, including library | 258 rendered, zero failures |
| Independent AI editorial review | 76 current file hashes matched |
| Glossary | 396 entries: 366 guided terms plus 30 unique legacy terms |

New chapters teach reading architecture diagrams, HTTP requests/responses/errors, pagination, and bytes/bandwidth/units. Existing lessons now combine shorter prose, concrete records, diagrams, comparisons, prediction prompts, and worked stories. The first combined system walkthrough remains guided; a full design interview is not expected during the foundations.

The reader supports forward/back/restart controls, keyboard step selection, search across walkthrough teaching, and printing every walkthrough step. Diagram narration highlights only explicitly mapped targets. Saved-place restoration yields when the learner starts interacting. These changes preserve existing guide IDs, exercises, question keys, and flashcard identities. The exact before/after audit records zero assessment changes across the original 72 guides.

## Verification

Production build and nine application integration tests passed. Fourteen Learn browser journeys and eight illustrated-topic journeys passed with no JavaScript errors or outbound requests. All diagram sources rendered; source hashes bind the report to current diagrams. Eight existing SQL example checks and seven new pagination/arithmetic checks passed. Desktop, mobile, dark mode, and representative printed pages were visually inspected. Current evidence is in [QA_REPORT.md](QA_REPORT.md).

The current Redis print sample is 16 pages and includes all five walkthrough steps, diagram narration, and full labels. The tallest-diagram print sample is two pages including its separate readable label list. The prior first-module library sample is 45 pages. The dependency lock is unchanged from the successful clean installation with 349 audited packages and zero advisories reported at that check. Portable-source build/start verification uses isolated data. Real learner records remain under `data/` and are excluded from the source ZIP.

## Existing collection and limits

The original library still has 300 catalog entries, 105 authored bodies, and 195 metadata-only entries; its statuses are 95 drafted, 10 reviewed, and zero fully validated. Six prepared Python projects cover 24 milestones. Sixteen interview definitions cover part of the 63 catalog assessment slots. The unchanged Python reference project suite was rerun to retain a complete execution record: 30 tests passed; see [project-validation.json](artifacts/project-validation.json).

Core study works offline after installation. Optional references and an external AI client require their own connection. Both requested reference repositories remain unchanged; original teaching and diagrams link to their sources without copying their assets.

Independent AI review is not human expert certification or learner-outcome evidence. No live Redis, Kafka, Kubernetes, GPU, or cloud deployment was tested. The one explicitly approved live Codex read test from the earlier delivery was not repeated. Current browser verification is Windows/Edge. Read [README.md](README.md) for setup and [docs/ILLUSTRATED_TEACHING.md](docs/ILLUSTRATED_TEACHING.md) for authoring details.
