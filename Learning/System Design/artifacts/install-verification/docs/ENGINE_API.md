# Local course engine and invariants

`shared/schemas.ts` is the executable action contract for HTTP and MCP. `server/engine.ts` contains the shared business rules; the stdio adapter never opens the learner database. Ordinary UI, tools, and resources use the same checked actions. The HTTP server binds to `127.0.0.1`; `PORT` defaults to 4310. No telemetry or external request is made by the engine. The MCP adapter sends bounded requests only to its configured loopback origin.

## Browser API

- `GET /api/catalog`: source manifest enriched with actual publishing status, prepared project specifications, optional glossary, and counts.
- `GET /api/state`: progress, durable drafts/notes, attempts, wrong answers, review cards, interview sessions, suggestion, and `csrfToken`.
- `GET /api/lessons/001`: one lesson with answers and exercise solutions withheld until explicit reveal. Metadata-only sessions return an honest unavailable state.
- `GET /api/interviews`: `{interviews,total,offset}` with stable IDs and aliases, without references.
- `GET /api/search?q=queue`: bounded section hits and working `/#lesson/NNN` links.
- `GET /api/projects/P1`: one prepared project specification and learner skeleton; no reference implementation.
- `GET /api/glossary`: locally authored glossary data when available.
- `POST /api/actions/<action>`: validated JSON with `X-Academy-CSRF` from state, or a protected MCP Bearer token.

Every request validates Host and any supplied Origin; browser mutations additionally require the unguessable request token and JSON content type. The MCP token is generated in the learner data directory and kept outside version control. It is never returned by the HTTP API. Errors have `{error,code,details?}` and preserve existing learner data. The server exposes no filesystem picker, arbitrary-file endpoint, shell runner, or generic code execution endpoint.

## Writes, revisions and retries

`save_note` and `save_draft` use `{targetId,text,revision,idempotencyKey?}`. Initial revision is zero; successful writes increment it. Namespaces include a lesson ID, `exercise:001`, `quiz:001`, `design:001`, `project:P1`, and actual interview session UUIDs. Clients must retain unsaved text on a 409 conflict.

Interview writes require `{sessionId,revision,idempotencyKey}`; each new write increments the revision. A repeated identical request and key returns its prior result. Reusing the key with different input is a conflict. Submit/review writes also require idempotency keys. Each write and its idempotency result commit within one SQLite transaction. Active assessment guards run even when an earlier quiz result is replayed from idempotency storage.

## Assessment and timer behavior

States are `active`, `paused`, `feedback_pending`, `reviewed`; no persisted attempt exists before start. Finishing closes answering without assigning a grade. Timers store accumulated milliseconds plus the last active start timestamp, survive restarts, and stop accumulating while paused. The clock is advisory, never an automatic destructive submission. Each attempt persists a version and full internal definition snapshot so editing a definition cannot change the rubric halfway through an attempt. Public responses omit that snapshot.

Hints are returned only through an explicit request and recorded with a timestamp. Clarifications are fetched one at a time with `{sessionId,index}`. Actual turns store role, kind, UUID, text and timestamp. The engine cannot see the model’s private chat history; callers must explicitly submit each real turn.

Feedback contains every weighted rubric dimension exactly once; scores range from zero to four. A positive score requires exact excerpts of candidate turns, and every excerpt’s turn ID must exist. The engine derives the weighted total. Imported feedback undergoes the same evidence and total checks. Feedback is identified as AI or self assessment, with alternatives, missed opportunities, targeted lessons, retry exercise, uncertainty, and an educational limitation statement. No generated hiring verdict or invented transcript is stored.

## Answer boundaries

Question answers, explanations, exercise solutions and answer-side flashcards are withheld initially. Explicit reveal is separate from submission. An active or paused interview withholds its lesson sections and all lesson answer material, related debrief lessons, previous quiz explanations, wrong-answer entries, and review cards. Search indexes only safe lesson sections. A questions-only workbook strips keys even after earlier reveal. Solutions workbooks and interview debriefs enforce the same engine guards. Linked debriefs can be marked by `debriefLessonId`, `protectedLessonIds`, or a debrief lesson’s interview prerequisite.

Project references require `reveal_project` before `get_project_reference`; a related active assessment blocks both. Projects expose only six allow-listed local Python filenames. Backup files remain private local files; tools return backup identifiers, never the raw SQLite contents during an assessment. These are educational spoiler controls. Someone with access to repository source or the database can inspect local answers.

## Review and progress

Opening, self-completion, attempting, and demonstrated objective-quiz evidence are separate fields. A full objective quiz with at least three objective questions and at least 80% correct can record evidence scoped **only to that objective quiz**. Open responses are never exact-string or keyword graded. A suggestion’s missing prerequisites refer to demonstrated evidence; the reader still permits an intentional override.

Flashcards become available after lesson completion, reveal, or submission. The deterministic SM-2-inspired scheduler is intentionally simple: initial ease 2.5; again resets repetition count and schedules ten minutes later; hard uses `ceil(previousDays * 1.2)` with a one-day floor and lowers ease by 0.15; good gives one day, then six days, then `ceil(previousDays * ease)`; easy gives four days, then eight days, then `ceil(previousDays * ease * 1.3)` and increases ease by 0.15. Ease stays within 1.3–3.0. Again lowers ease by 0.2. Every rating is retained. The wrong-answer collection independently preserves incorrect attempt history with content versions.

## Persistence and backups

SQLite uses WAL, foreign keys, a busy timeout, and incremental migrations (`user_version` 1 and 2). A newer unsupported schema causes a clear startup failure; it never resets data. Export is a versioned JSON learner-record envelope; import validates all rows and merges only new IDs, preserving existing records and reporting skips. Historical content versions are retained. Exports/imports are unavailable during active interviews.

`create_backup` invokes Node’s SQLite online backup API. `restore_backup` accepts only a listed generated backup ID, checks integrity and schema/record validity, creates a safety backup of current data, then transactionally restores records. It never overwrites an arbitrary path. Stdio shutdown/EOF closes only the adapter; the ordinary backend remains owned by its terminal process. Ctrl+C closes HTTP, optional Vite middleware, and the database.

## Executed checks

`tests/engine.test.ts` exercises durable notes/attempts, versions, idempotency, conflicts, numeric and open grading, timer pause/restart, weighted evidence, answer boundaries, deterministic review, migration, injected DB failure rollback, consistent backup/restore, HTTP Host/Origin/CSRF, and a real official MCP client subprocess. Project tests live under `projects/tests/` and use isolated temporary SQLite databases. See `QA_REPORT.md` for the current executed run and remaining gaps.
# Guided six-month path (SQLite schema 3)

`GET /api/learning-path` returns the saved path object with derived `weeks[].days[].guideAvailable` and `weeks[].guides[].guideAvailable`, plus `contentCounts`. Availability reflects an actually loaded guide file, never a planned title. Content is loaded at server startup; restart after authoring new guides.

`GET /api/guides/:slug` and MCP `get_guide {guideId}` return the guide. Slugs contain lowercase letters, digits and hyphens (1–64 characters). Unknown or unpublished guides return `CONTENT_UNAVAILABLE` (404). Question keys/explanations, exercise solutions and flashcards stay withheld until `reveal_guide {guideId}`. Submitting a quiz returns explanations for submitted questions only, without revealing the entire guide. Guides currently have no mapping to legacy timed assessments.

`open_guide {guideId}` creates `{id,guideId,revision:1,openedAt,completedAt:null,bookmarked:false,position:'',updatedAt}`; opening again is semantically idempotent and does not mark completion. `save_guide_progress {guideId,revision,completed?,bookmarked?,position?,idempotencyKey?}` checks the current revision and increments it. Self-completion is not a proficiency claim. `submit_guide_quiz {guideId,answers,idempotencyKey}` uses the same numeric/choice rules as legacy quizzes; open responses remain ungraded. It updates `attemptedAt` and the progress revision, but does not mark completion or interview readiness. Refresh state before saving a subsequent progress edit.

`state.guideProgress` and `state.guideAttempts` are separate from legacy numeric lesson records. `save_note` and `save_draft` accept `targetId:'guide:slug'`, with the existing optimistic revision contract. MCP tools and `course://learning-path` / `course://guides/{guideId}` resources use these same server operations.

Schema 3 adds only `guide_progress` and `guide_attempts`. SQLite v1/v2 databases migrate without changing existing records. Version-1 JSON exports retain their envelope and add those two arrays; older exports that omit them remain importable with empty defaults. SQLite v1/v2 backups remain restorable: their absent guide tables represent empty guide history at that historical point, and a safety backup captures current state first. Newer unsupported SQLite schemas are rejected.

Guide completion, quiz attempt, or explicit reveal seeds the existing spaced-review scheduler with `cardId:'guide:slug:index'`. Returned cards include `guideId` instead of `lessonId` and otherwise keep the same `front`, `back`, interval, ease, history and rating behavior. Seeding again preserves the learned schedule. `record_review` accepts both namespaces; imports validate exactly one owning namespace. `search_course` searches guide explanatory sections as well as legacy lesson sections, never exercise solutions, quiz keys, or card backs. Guide results contain `guideId`, a `/#guide/slug?section=section-id` URL, and a `course://guides/slug#section-id` reference.

