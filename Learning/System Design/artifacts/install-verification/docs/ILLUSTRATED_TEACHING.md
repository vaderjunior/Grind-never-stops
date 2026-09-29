# Illustrated teaching refinement

The learning path follows the user's SQL/NoSQL example: introduce a useful question, show a small concrete example, draw the mechanism, explain the tradeoff, and ask the learner to apply it. Extra length is useful only when it improves understanding.

The original 72 Learn chapters were revisited individually. Four foundation chapters fill specific gaps: reading diagrams, reading HTTP messages/errors, pagination, and calculation units. Existing guide IDs and assessment/card identities remain stable.

## How a chapter teaches

- Short paragraphs explain one idea at a time. Tables compare concrete choices or show actual records.
- Two or more original diagrams show different mechanisms, decisions, or failure paths. Captions identify the assumptions and limits.
- An authored walkthrough lets the learner move through a small example and inspect its state at each step. These are teaching examples, separate from hidden exercise solutions.
- Worked numbers, common mistakes, and prediction prompts connect the pictures to reasoning. Exercises and objective checks remain available after the explanation.
- Print includes every walkthrough step and diagram narration. The screen shows one walkthrough state at a time and supports native keyboard-operated buttons.

## Authoring a walkthrough

`content/guides/*.json` may contain a `walkthroughs` array. Each story has `id`, `title`, `sectionId`, `intro`, `steps`, and `takeaway`. Each step has a `title`, an `explanation`, and a `state` array of `{label, value}` strings. Use three to six meaningful steps and two to four concise state values. Attach it to the section whose idea it demonstrates. Do not include an assessment solution or a future timed requirement in an earlier teaching story.

State values should be concrete: a record identity, a version, a queue position, a result, or a measured assumption. A sequence of generic slogans does not constitute a worked example. Define new terms before using them.

Diagram narration does not infer highlighted edges from the number of steps. Explicit `activeEdges` or `activeNodes` annotations can highlight authored targets; unannotated narration leaves the whole diagram visible. This avoids falsely implying that a caption describes an unrelated arrow.

## Evidence

`artifacts/illustrated-change-audit.json` compares content and protected assessments with the previous delivered bundle. `artifacts/illustrated-guide-validation.json` checks every visual teaching structure. Independent review reports record exact final file hashes and substantive findings. The count of diagrams or tables is evidence of presence, not proof of teaching quality.

The browser scripts exercise state changes, previous/next/restart controls, keyboard selection, mobile width, hidden solutions, and print. Numerical and SQL examples have a separate executable check. See `QA_REPORT.md` for results and practical limits.

The JSON files remain canonical. Historical authoring scripts can overwrite later editorial corrections; do not rerun them without reviewing the changes and refreshing review hashes.
