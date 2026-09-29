import fs from 'node:fs';
import crypto from 'node:crypto';

// One-time independent review corrections. Do not rerun an authoring generator.
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const assessment = guide => hash(JSON.stringify({ exercise: guide.exercise, questions: guide.questions, flashcards: guide.flashcards }));
const report = JSON.parse(fs.readFileSync('artifacts/refinement-advanced.json', 'utf8'));
const entries = report.chapters.map(entry => {
  const path = `content/guides/${entry.id}.json`;
  const bytes = fs.readFileSync(path);
  if (hash(bytes) !== entry.sha256) throw new Error(`Frozen author hash differs: ${entry.id}`);
  const guide = JSON.parse(bytes);
  return { entry, path, guide, beforeAssessment: assessment(guide) };
});
const find = id => entries.find(e => e.entry.id === id).guide;
const replace = (object, key, before, after) => {
  if (!object[key].includes(before)) throw new Error(`Review text no longer matches: ${before.slice(0, 70)}`);
  object[key] = object[key].replace(before, after);
};

find('interview-game-plan').walkthroughs[0].steps[1].state.find(s => s.label === 'Destination').value = 'https://notes.example/public/trees';

const notifications = find('design-notifications');
replace(notifications.sections.find(s => s.id === 'flow'), 'markdown',
  'A notification worker receives the comment event, verifies the event category and recipient relationship, and creates the durable intent if it is new. It creates the in-app item and eligible channel work. The email worker checks current relevant preferences, chooses the template, acquires a provider rate budget, and submits the message. Store the attempt state and provider reference when available.',
  'A notification worker receives the comment event and verifies the event category and recipient relationship. In this teaching design, one transaction in the notification database creates the unique intent, in-app item, and durable records for eligible channel work. Commit them together so a crash cannot leave an accepted intent with missing delivery work. A duplicate event finds that same committed set.\n\nAn email worker separately claims the durable channel work, checks current relevant preferences, chooses the template, acquires a provider rate budget, and submits the message. Store the attempt state and provider reference when available. The local transaction does not include the external provider; that later boundary still needs the retry and uncertainty policy below.');
notifications.walkthroughs[0].steps[2].explanation = 'One local transaction accepts the unique intent, inbox item, and durable channel work for this event, recipient, and category. They either commit together or can all be retried.';
notifications.walkthroughs[0].steps[2].state.push({ label: 'Channel work', value: 'durable in the same commit' });
const outboxDiagram = notifications.diagrams.find(d => d.id === 'notification-outbox');
outboxDiagram.source = 'flowchart LR\nA[Create comment] --> T[Source database transaction]\nT --> C[(Comment)]\nT --> O[(Outbox event)]\nO --> P[Publisher]\nP --> Q[Queue]\nQ --> N[Notification database transaction]\nN --> I[(Unique intent and inbox item)]\nN --> J[(Durable channel work)]\nJ --> E[Email attempt worker]';
outboxDiagram.steps[2] = 'Commit the unique notification, inbox item, and channel work together.';
outboxDiagram.steps[3] = 'Dispatch external channels separately with current preferences and tracked outcomes.';
outboxDiagram.caption = 'The source commit and the notification commit are separate local transactions; email submission remains an external effect.';
const channelDiagram = notifications.diagrams.find(d => d.id === 'notification-state-boundaries');
channelDiagram.source = 'flowchart TB\nE[Event e_47] --> N[Notification n_63 for learner_12]\nN --> I[One in-app inbox item]\nN --> J[Durable email work]\nJ --> A[Email attempt a_1]\nA --> P[Provider acceptance evidence]\nA --> R[Retry decision if temporary failure]\nR --> B[Attempt a_2 for same n_63]';
channelDiagram.caption = 'Intent, inbox item, and channel work commit together. Email submission happens later and has its own uncertain outcome.';
channelDiagram.steps[1] = 'Commit the unique inbox item and durable channel work with that intent.';

find('design-rate-limiter').walkthroughs[0].intro = 'This example has capacity 8 and refill 3 tokens/s. Six one-token requests arrive first; a later request costs four tokens. All decisions use one authoritative elapsed clock.';
find('design-file-storage').walkthroughs[0].intro = 'Follow an already-ready club photo through a rename and a private download. Watch which metadata changes and which byte version stays the same.';
find('design-search-and-autocomplete').walkthroughs[0].title = 'An older response must not replace newer suggestions';
find('design-payments').walkthroughs[0].intro = 'Attempt P73 has waited longer than the investigation threshold. Follow a periodic status lookup that resolves the existing provider operation.';
replace(find('full-mock-interview').sections.find(s => s.id === 'change'), 'markdown',
  'Continue for about ten minutes. Then spend the final five minutes summarizing the design and one remaining risk. Leave a clear boundary around work that would require a deeper follow-up.',
  'Use minutes 25–35 to adapt the design. Spend minutes 35–40 stress-testing the revised explanation. Use the final five minutes to summarize the design and one remaining risk. Leave a clear boundary around work that would require a deeper follow-up.');

const notes = {
  'interview-game-plan': [
    'Made the accepted destination an absolute URL matching the record table; the redirect trace now cannot be misread as a same-origin relative redirect.',
    'Checked the 45-minute allocation, create/read ownership, operation identity, and separate browser destination request.'
  ],
  'estimates-and-tradeoffs': [
    'No correction needed. Checked decimal units, daily/retained storage, previews, rounded peak throughput, worker failure capacity, and upload-size sensitivity walkthrough.',
    'Estimates explicitly distinguish illustrative arithmetic from measured capacity and explain the changed design pressure.'
  ],
  'design-notifications': [
    'Closed a missing local failure boundary: intent, inbox item, and durable channel-work records now commit together in the notification database. A duplicate cannot skip unfinished fan-out after a partial local commit.',
    'Updated both diagrams and the walkthrough to show the local commit; kept provider submission outside it and preserved provider uncertainty, preferences, and acceptance-versus-reading distinctions.'
  ],
  'design-rate-limiter': [
    'Clarified that the first burst contains six one-token requests and the later request costs four; the old intro could imply every request cost four.',
    'Checked 8→2→3.5 rejected→5→1 arithmetic, fractional refill, atomic decision, clock scope, and independent-region budget limitations.'
  ],
  'design-chat': [
    'No correction needed. Checked durable acceptance versus device receipt/read evidence, room/sender operation identity, atomic local message publication intent, and gateway-independent history.',
    'Walkthrough preserves one stored sequence and does not equate a read report with transport delivery.'
  ],
  'chat-reconnect-and-scale': [
    'No correction needed. Checked confirmed subscription before high-water replay, overlap deduplication, contiguous cursor, overflow recovery, and legitimate allocator/filter gaps.',
    'Replay through 203 and buffered event 204 preserve coverage under the explicitly stated committed-log assumptions.'
  ],
  'design-news-feed': [
    'No correction needed. Current post/policy remains authoritative; stale feed candidates are hydrated and filtered before display.',
    'Checked repeated fan-out, bounded refill after filtering, tie-broken cursor caveats, and walkthrough candidate counts.'
  ],
  'feed-fanout-and-ranking': [
    'No correction needed. Checked 100,000-fold fan-out contrast, safe overlapping policy transition, logical post deduplication, ranking order, and explicit continuity/fallback contracts.',
    'Private/deleted content filtering remains required during ranker failure; latency arithmetic is explicitly sequential.'
  ],
  'design-file-storage': [
    'Replaced an implementation-only reference to the protected exercise with a plain introduction to the rename/download story.',
    'Checked immutable content references, verified finalization, metadata identity, cleanup references, and bounded signed-grant revocation limitations.'
  ],
  'file-sync-and-conflicts': [
    'No correction needed. Incoming changes preserve unsynced drafts/base versions before applying remote state, and cursor advancement follows durable accounting.',
    'The walkthrough retains the conflict while applying remote version 5 and only then checkpoints 301; it does not imply the user has resolved the conflict.'
  ],
  'design-video-platform': [
    'No correction needed. Attempt outputs remain isolated and publication points to a coherent immutable set, preserving the earlier stale-worker correction.',
    'Checked segment bit/byte arithmetic, buffer 4−2+6=8 seconds, bandwidth assumptions, and media-access boundaries.'
  ],
  'design-search-and-autocomplete': [
    'Changed the walkthrough title: the old response arrives later in the trace, so calling it faster contradicted the shown event order.',
    'Checked request 42 remains displayed after obsolete reply 41, inverted-index intersection, versioned index updates, and private-title/cache authorization.'
  ],
  'design-bookings': [
    'No correction needed. Checked the distinction between a cached observation and one atomic inventory claim, exact hold identity/deadline enforcement, and no open transaction during human checkout.',
    'The two-contender walkthrough makes no click-order fairness promise; payment compensation does not weaken the seat invariant.'
  ],
  'design-payments': [
    'Replaced an implementation-only protected-scenario mention with a learner-facing explanation of periodic reconciliation.',
    'Checked unresolved versus failed state, provider-specific retry retention, verified evidence, repeatable local effects, and separate settlement/refund lifecycles.'
  ],
  'coordination-and-leases': [
    'No correction needed. New authority is established at the resource before usable handoff; old epoch 61 fails after 62 is registered.',
    'Leases do not stop old processes, a highest-seen token has a stated limitation, and majority size is not presented as a complete consensus protocol.'
  ],
  'change-data-safely': [
    'No correction needed. Checked gap-free snapshot/change boundary, deletion and permission validation, 200-second net catch-up estimate, and rollback compatibility.',
    'The membership walkthrough reconstructs accepted facts only and leaves external effects disabled during replay.'
  ],
  'mcp-platform-architecture': [
    'No correction needed. Reviewed actor roles, bounded lookup authorization, observation freshness, durable application identity versus protocol IDs, stream lifetime, and safe replication.',
    'Preserves the previously sourced 2026-07-28 transport model and clearly labels the older 2025-11-25 session model used by the installed SDK adapter; no new protocol claims added.'
  ],
  'platform-security-and-tenancy': [
    'No correction needed. Actor/workload/audience distinctions, queue revocation policy, tenant scope across data paths, gateway bypass, and secret lifecycle remain explicit.',
    'Credential C1→C2 walkthrough permits overlap only by assumption and does not declare rotation finished before all consumers switch and C1 is retired.'
  ],
  'ai-system-design': [
    'No correction needed. Terms define prefill and KV cache before optional serving depth; request lifecycle keeps partial output distinct from completion and human authority.',
    'Checked 6,000/300=20 response/s estimate with measured-workload caveats, cancellation cleanup, bounded admission, and separate quality evaluation.'
  ],
  'model-serving-and-gpus': [
    'No correction needed. Checked 14 decimal GB weights, 128 KiB/token and 1 GiB KV estimate, active memory versus arithmetic upper bound, and parallelism distinctions.',
    'Both decode schedules are internally consistent and explicitly abstract prefill and wall time; they do not claim a throughput benchmark.'
  ],
  'rag-and-inference': [
    'No correction needed. Checked source/version/access metadata, authorization before model exposure, cache revocation, and separation of prefix computation from final-answer caching.',
    'The Friday-hours walkthrough retains the 16:00 exception alongside the general 18:00 rule and verifies actual citation support.'
  ],
  'ai-platform-operations': [
    'No correction needed. Registry metadata, ready workers, and routing remain separate; canary expansion depends on both operating and quality gates.',
    'Checked sequential 0.3+0.1+0.6=1.0-second timing, slow model capacity startup, meaningful readiness, and fallback/rollback compatibility limits.'
  ],
  'full-mock-interview': [
    'Made the final schedule explicit: adapt 25–35, stress-test 35–40, summarize 40–45. The previous prose left five minutes unassigned.',
    'The added walkthrough and diagrams are process-only; they provide no PlotShare architecture or timed requirement. Candidate brief and the timed requirement itself remain unchanged.'
  ],
  'capstone-and-readiness-plan': [
    'No correction needed. Checked failure-test evidence, bounded local-demo claims, independent versus assisted attempts, and specific changed-problem retests.',
    'The fictional walkthrough demonstrates one narrower skill improvement while retaining a revocation gap; it awards no automatic readiness.'
  ]
};

const records = [];
let changed = 0;
for (const { entry, path, guide, beforeAssessment } of entries) {
  if (assessment(guide) !== beforeAssessment) throw new Error(`Assessment changed: ${entry.id}`);
  if (guide.version !== entry.version) throw new Error(`Version changed: ${entry.id}`);
  for (const w of guide.walkthroughs) {
    if (!guide.sections.some(s => s.id === w.sectionId) || w.steps.length < 3 || w.steps.length > 5) throw new Error(`Walkthrough shape: ${entry.id}`);
    for (const s of w.steps) if (s.state.length < 2 || s.state.length > 4) throw new Error(`Walkthrough states: ${entry.id}`);
  }
  for (const d of guide.diagrams) if (!guide.sections.some(s => s.id === d.sectionId) || d.steps.length < 3) throw new Error(`Diagram anchoring: ${entry.id}`);
  const bytes = `${JSON.stringify(guide, null, 2)}\n`;
  const afterSha256 = hash(bytes);
  if (afterSha256 !== entry.sha256) { fs.writeFileSync(path, bytes); changed++; }
  records.push({ id: entry.id, sha256: afterSha256, notes: notes[entry.id], changed: afterSha256 !== entry.sha256, beforeSha256: entry.sha256, assessmentUnchanged: true });
}
const review = {
  schemaVersion: 2,
  reviewer: 'engine agent, independent editorial cross-review of the 24 refined advanced chapters',
  reviewedAt: new Date().toISOString(),
  scope: records.map(r => r.id),
  method: 'Read every updated teaching section, table, walkthrough step/state/takeaway, and diagram source/caption/step. Also read each exercise/rubric/solution and every question/answer/explanation. Checked arithmetic, state transitions, authority and failure boundaries, prerequisite vocabulary, and accidental solution disclosure. Applied focused corrections to the frozen published JSON only.',
  checks: { reviewed: records.length, corrected: changed, assessmentCollectionsUnchanged: records.length, anchoredWalkthroughsChecked: records.length, diagramsChecked: entries.reduce((n, e) => n + e.guide.diagrams.length, 0) },
  limitations: [
    'This is a manual editorial and semantic review, not a production benchmark or proof of every architecture.',
    'No new niche product or protocol facts were introduced. Existing previously verified primary sources were reused; this pass did not re-open every citation or watch linked videos.',
    'Diagram semantics and attachment anchors were checked. Root owns final Mermaid rendering, browser review, answer-withholding integration checks, and global validation.',
    'Exercise, question, and flashcard collections were preserved byte-for-byte in their JSON serialization. Guide versions remain v2 within the same unpublished refinement batch.'
  ],
  records
};
fs.writeFileSync('artifacts/guide-review-interface.json', `${JSON.stringify(review, null, 2)}\n`);
console.log(JSON.stringify(review.checks));
