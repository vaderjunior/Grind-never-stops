from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text(encoding='utf-8'))
guides=read('artifacts/guide-validation.json');visual=read('artifacts/illustrated-guide-validation.json');reviews=read('content/guide-review-status.json');diagrams=read('artifacts/diagram-validation.json');glossary=read('artifacts/guide-glossary-build.json');audit=read('artifacts/illustrated-change-audit.json')
readability=read('artifacts/diagram-readability/report.json');controls=read('artifacts/diagram-readability/controls-report.json');printing=read('artifacts/diagram-readability/print-report.json')
assert readability['total']==258 and readability['passed'] and controls['passed']
redis_pages=printing['redisPages']
assert guides['authored']==76 and not guides['errors'] and visual['passed']==76 and not visual['errors']
assert reviews['reviewed']==76 and not reviews['unmatched']
assert diagrams['failed']==0 and audit['assessmentChanges']==[]
overview=f'''# Build status — illustrated Learn course

Updated 29 September 2026. Learn at `http://127.0.0.1:4310/#learn` is the primary course. All 72 existing chapters received an individual illustrative teaching pass, and four foundation chapters were added. The original numbered library remains a separate partial reference collection.

The subsequent diagram-label repair covers all 258 course and library diagrams: native SVG labels, ordinary flows displayed top to bottom, readable default sizing with internal scrolling, and a text alternative. All 258 passed label geometry/visibility checks in desktop/mobile and light/dark modes. Production zoom, expansion, keyboard controls, and representative printing passed. See [diagram rendering](docs/DIAGRAM_RENDERING.md) and [the visibility report](artifacts/diagram-readability/report.json).

| Item | Current result |
| --- | --- |
| Course | 76 chapters, 24 flexible weeks, 152 study steps |
| Foundations | 36 chapters in the first eight weeks |
| Teaching sections | {guides['words']:,} counted body words, plus authored walkthrough explanations |
| Worked walkthroughs | {visual['walkthroughs']}, with concrete state at each step |
| Guide diagrams | {visual['diagrams']} original diagrams |
| Example/comparison tables | {visual['tables']} |
| All diagrams, including library | {diagrams['total']} rendered, zero failures |
| Independent AI editorial review | 76 current file hashes matched |
| Glossary | {glossary['total']} entries: {glossary['guideTerms']} guided terms plus 30 unique legacy terms |

New chapters teach reading architecture diagrams, HTTP requests/responses/errors, pagination, and bytes/bandwidth/units. Existing lessons now combine shorter prose, concrete records, diagrams, comparisons, prediction prompts, and worked stories. The first combined system walkthrough remains guided; a full design interview is not expected during the foundations.

The reader supports forward/back/restart controls, keyboard step selection, search across walkthrough teaching, and printing every walkthrough step. Diagram narration highlights only explicitly mapped targets. Saved-place restoration yields when the learner starts interacting. These changes preserve existing guide IDs, exercises, question keys, and flashcard identities. The exact before/after audit records zero assessment changes across the original 72 guides.

## Verification

Production build and nine application integration tests passed. Fourteen Learn browser journeys and eight illustrated-topic journeys passed with no JavaScript errors or outbound requests. All diagram sources rendered; source hashes bind the report to current diagrams. Eight existing SQL example checks and seven new pagination/arithmetic checks passed. Desktop, mobile, dark mode, and representative printed pages were visually inspected. Current evidence is in [QA_REPORT.md](QA_REPORT.md).

The current Redis print sample is {redis_pages} pages and includes all five walkthrough steps, diagram narration, and full labels. The tallest-diagram print sample is two pages including its separate readable label list. The prior first-module library sample is 45 pages. The dependency lock is unchanged from the successful clean installation with 349 audited packages and zero advisories reported at that check. Portable-source build/start verification uses isolated data. Real learner records remain under `data/` and are excluded from the source ZIP.

## Existing collection and limits

The original library still has 300 catalog entries, 105 authored bodies, and 195 metadata-only entries; its statuses are 95 drafted, 10 reviewed, and zero fully validated. Six prepared Python projects cover 24 milestones. Sixteen interview definitions cover part of the 63 catalog assessment slots. The unchanged Python reference project suite was rerun to retain a complete execution record: 30 tests passed; see [project-validation.json](artifacts/project-validation.json).

Core study works offline after installation. Optional references and an external AI client require their own connection. Both requested reference repositories remain unchanged; original teaching and diagrams link to their sources without copying their assets.

Independent AI review is not human expert certification or learner-outcome evidence. No live Redis, Kafka, Kubernetes, GPU, or cloud deployment was tested. The one explicitly approved live Codex read test from the earlier delivery was not repeated. Current browser verification is Windows/Edge. Read [README.md](README.md) for setup and [docs/ILLUSTRATED_TEACHING.md](docs/ILLUSTRATED_TEACHING.md) for authoring details.
'''
(root/'BUILD_STATUS.md').write_text(overview,encoding='utf-8')
qa=f'''# QA report — illustrated teaching refinement

Updated 29 September 2026. Windows/PowerShell, Node 24.13.0, npm 11.6.2, Microsoft Edge, and bundled Python 3.12.14. Browser and integration checks use isolated data; no test completion was inserted into the user's learner database.

## Current content evidence

| Check | Executed result | Evidence |
| --- | --- | --- |
| Individual refinement | All 72 existing guide bodies changed; four new chapters; existing exercises/questions/cards unchanged | [Before/after audit](artifacts/illustrated-change-audit.json) |
| Guide structure | 76 authored, no missing files/errors, {guides['words']:,} body words | [Guide validation](artifacts/guide-validation.json) |
| Illustrated structures | 76 walkthroughs, {visual['diagrams']} guide diagrams, {visual['tables']} tables; valid section anchors and concrete state fields | [Illustrated validation](artifacts/illustrated-guide-validation.json) |
| Independent AI review | 76 matching current file hashes | [Merged review status](content/guide-review-status.json), four `artifacts/guide-review-*.json` reports |
| Diagram execution | {diagrams['total']} diagrams rendered; zero failures | [Diagram report](artifacts/diagram-validation.json), including source hashes |
| Diagram label visibility | All 258 passed in desktop light/dark and 390px light/dark; zero HTML labels, clipping/visibility failures, or page overflow | [Visibility report](artifacts/diagram-readability/report.json) |
| Diagram controls | Four production-page checks passed: full text, zoom/expansion/focus, keyboard panning, print sizing | [Controls report](artifacts/diagram-readability/controls-report.json) |
| Existing SQL examples | Eight executed checks passed | [SQL report](artifacts/guide-sql-validation.json) |
| New worked examples | Seven checks passed: pagination insertion/deletion and unit arithmetic | [Worked example report](artifacts/illustrated-example-validation.json) |
| Glossary | {glossary['total']} entries; original 60-entry glossary preserved | [Glossary build](artifacts/guide-glossary-build.json) |

Each author read the assigned chapters and recorded per-guide changes in `artifacts/refinement-foundations.json`, `refinement-systems.json`, and `refinement-advanced.json`. Another agent reviewed teaching prose, state transitions, diagram meaning, worked examples, and answer keys. Corrections included a recoverable request identity after a lost HTTP reply, notification commit boundaries, retry-policy scope, precise networking labels, and definitions before new terms. Review records are exact-hash AI editorial evidence; structural counts alone do not establish teaching quality.

## Application checks

The TypeScript/Vite production build passed. Nine integration tests passed: durable records; idempotency/revisions; objective-only grading; interview state and reveal boundaries; spaced review; SQLite migrations/rollback/backups/restore; loopback host/origin/CSRF rules; genuine SDK subprocess communication; versioned interview definitions; and guide progress/export compatibility. The added case confirms walkthrough teaching can be searched while exercise solutions and quiz answers remain absent from candidate retrieval and search.

[Learn browser acceptance](artifacts/learning-browser/report.json) records 14 passing journeys covering the default path, local diagrams, state-step controls, durable drafts, objective grading, explicit reveal, bookmarks/completion, the next chapter, guided dashboard progress, week navigation, 390px width, Redis search, review cards, glossary links, and printing.

[Illustrated browser acceptance](artifacts/illustrated-browser/report.json) covers eight representative chapters: diagram reading, HTTP, pagination, units, database choice, Redis, quorums, and GPU serving. It checks every authored state in their walkthroughs, forward/back/restart controls, keyboard selection, diagram counts, tables, hidden solutions, and mobile width. These runs recorded no JavaScript errors or external requests. Screenshots were visually inspected in desktop/mobile and dark mode.

The current Redis sample PDF is {redis_pages} pages. Print checks assert all walkthrough steps are visible while exercise solutions remain withheld. Diagram pages 4, 9, and 11 were visually checked after the label repair. Both pages of the tallest-diagram sample were checked: its complete figure is kept together, followed by a full-size label list. [Print evidence](artifacts/diagram-readability/print-report.json) records this scope; it is not exhaustive testing of every chapter's pagination or every printer.

The installed Mermaid version gives root-level `htmlLabels` precedence over the deprecated flowchart setting, so the previous configuration still emitted embedded HTML labels. The shared configuration now produces native SVG text. The actual React reader was checked across all 258 diagrams; geometry checks cover labels against SVG bounds and flow-node shape bounds, visibility, and default rendered font size (observed minimum 12.25 CSS pixels). Wide diagrams pan inside their frames instead of shrinking the entire graph further. Every diagram's caption, narration, and labels can be read as ordinary text. Authored JSON and assessment identities were unchanged; all 76 review hashes still match. These checks supplement, rather than equate to, human inspection of every browser rendering.

## Retained baseline evidence

The earlier library browser suite passed 12 journeys, with a 45-page first-module PDF, before this refinement. The shared diagram renderer was rechecked across all current library and guide sources. Existing library and embedded-example reports remain under `artifacts/browser/`, `artifacts/python-validation.json`, and `artifacts/curriculum-worker-qa.json`.

The unchanged Python reference project suite was rerun during final evidence review because the retained reports did not document its complete earlier run. All 30 tests passed with no errors, failures, or skips; [project-validation.json](artifacts/project-validation.json) records this execution. These are isolated local project/transport checks, not deployed cloud systems.

The approved live Codex test was one read-only L001/start retrieval with ephemeral configuration and no learner writes. It was not repeated for this refinement. Broader MCP lifecycle behavior is covered by local SDK/API tests; a full model-led learner interview was not conducted. See [MCP setup](docs/MCP_SETUP.md) and [the prior client report](artifacts/client/codex-report.json).

## Portable source and setup

The source ZIP excludes learner records, credentials, `node_modules`, reference clones, and test databases. Its dependency lock is unchanged from the prior fresh `npm ci` (349 audited packages, zero audit-reported vulnerabilities at that time). The current portable source is built and smoke-tested independently with fresh isolated data; [clean-install-report.json](artifacts/clean-install-report.json) records production assets, schema version 3, 76 available guides, walkthrough availability, withheld exercise solutions, and no seeded completion.

## Scope and practical limits

The earlier 300-entry library remains partial: 105 authored and 195 metadata-only, with 10 reviewed and zero fully validated entries. There are 16 interview definitions and six prepared projects/24 milestones. Learn is the complete 76-chapter route. Forty-eight of 49 optional resource records were verified at the recorded date; the mismatched autocomplete reference is flagged and not used as verified teaching. Reference review methods remain in `docs/REFERENCE_REVIEW_*.md`.

No human learning trial or interview-outcome validation was performed. No live Redis/Kafka/Kubernetes/GPU/cloud deployment was exercised. Portable SQL checks use SQLite and do not establish PostgreSQL-specific planner or failover behavior. Browser coverage is Windows/Edge; assistive technologies, other browsers, operating systems, and print configurations need separate testing. External links and dependency advisories can change.

Reproduce with `npm run check`, `npm run build`, `npm run test:browser:learn`, `npm run test:browser:illustrated`, `npm run test:diagrams`, `npm run test:diagram-controls`, and `npm run diagrams`. The local app can be checked with `npm run doctor`. Historical authoring scripts can overwrite editorial fixes; current guide JSON is canonical.
'''
(root/'QA_REPORT.md').write_text(qa,encoding='utf-8')
print('Updated status and QA documentation from final current reports.')
