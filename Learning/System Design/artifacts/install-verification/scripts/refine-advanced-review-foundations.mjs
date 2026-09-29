import fs from 'node:fs';
import crypto from 'node:crypto';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const baseline=JSON.parse(fs.readFileSync('artifacts/refinement-foundations.json','utf8'));
const previous=JSON.parse(fs.readFileSync('artifacts/guide-review-curriculum.json','utf8'));
const paragraphStarts={
 'connection-and-protocol-basics':{
  layers:['You do not need to memorize the entire OSI model'],
  tcp:['The application still needs a rule','Nor does an established TCP connection'],
  udp:['QUIC is another important example'],
  tls:['Some metadata, such as network endpoints'],
  versions:['A network or deployment may also require fallback'],
  rpc:['gRPC commonly generates client and server code','Generated code can make the call look like a local function'],
  'worked-flow':['The API saves the job and returns its identity.','If the model response times out']
 },
 'processes-threads-and-concurrency':{
  machine:['For this guide, imagine an ordinary laptop'],
  process:['Two instances of the same API program','A process boundary offers useful separation'],
  thread:['Runtime details matter:'],
  waiting:['If each database operation independently waits'],
  'event-loop':['Move suitable CPU-heavy work'],
  cpu:['Measure CPU utilization, queue delay'],
  race:['Across API processes, a process-local lock is insufficient:'],
  design:['This adds a queue and status lifecycle']
 },
 'cache-patterns-and-invalidation':{writes:['Examples to investigate include accepting only suitable versions']},
 'service-boundaries':{remote:['If three sequential remote calls'],ownership:['Across services, prefer a defined API'],worked:['Define what happens after a worker crashes'],decision:['Draw the before and after request paths','A good boundary makes a responsibility easier']},
 'dns-and-addresses':{ip:['For this lesson, you do not need to calculate network masks'],connection:['Modern HTTP/3 uses QUIC']},
 'request-journey':{'protocol-depth':['TCP is one set of rules','HTTP/3 uses another transport called QUIC']},
 'databases-and-sql':{story:['A database adds rules and query operations']}
};
const notes={
 'what-is-system-design':['Read the full three-role story, save/read diagrams, exercise and checks. The draft-to-record states correctly separate stored facts from confirmation.','Replaced stale week-specific wording for memory/storage study with “the next chapters,” matching the expanded foundation sequence.'],
 'computer-and-server-basics':['Checked CPU-seconds, bits/bytes, and upload-memory arithmetic: 100 × 8 MB + 250 MB = 1,050 MB; limiting buffers to 50 gives 650 MB.','The resource diagnosis diagram presents hypotheses, and the walkthrough labels payload-only totals and bounded admission. No content correction required.'],
 'request-journey':['Checked page-then-data chronology (40/70/75/120 ms), request fields, reuse diagram, and displayed-note failure cases.','The diagram and prose preserve connection security versus application authorization and label timing as illustrative. No content correction required.'],
 'dns-and-addresses':['Checked hostname/path separation, DNS hierarchy, existing-cache TTL example, diagnostic table and path-change walkthrough.','Corrected the connection diagram to show the URL’s explicit/default port feeding the endpoint separately from the DNS address. Ordinary hostname lookup must not appear to supply the application port.'],
 'apis-without-jargon':['Checked method/path and input/result examples, scoped edit walkthrough and timeout-result diagram.','Validation, caller identity and record permission remain separate; title update retains the same note identity. No content correction required.'],
 'connection-and-protocol-basics':['Checked all layer comparisons, TCP/QUIC limits, streaming direction, TLS-hop diagram and byte-stream walkthrough.','Clarified that the invented length prefix counts payload bytes and uses single-byte ASCII characters; changed the state label from 3 characters to 3 bytes. This prevents generalizing a character count to arbitrary encoded text.','Rechecked RFC 9293’s ordered byte-stream semantics and added the official TCP reference.'],
 'data-that-survives':['Checked saved-copy versus cache-copy roles, process-restart walkthrough, backup timeline and exercise outcomes.','Aligned the pause-and-predict backup count with the adjacent diagram’s two notes. Persistent copies, retained backups and restore testing remain distinct.'],
 'processes-threads-and-concurrency':['Verified the blocking 210 ms versus overlapping 105/115 ms example and 20 ms CPU → ideal 50/s arithmetic.','Checked separate process dictionaries, thread sharing, callback-blocking diagram and seat-race explanation. The walkthrough’s shared-storage ending is a proposed redesign, not automatic copying. No content correction required.'],
 'databases-and-sql':['Checked every sample row, owner-filter result and rename-through-join walkthrough.','Stable identities, editable labels and foreign-key versus authorization meanings agree across tables, diagrams and checks. No content correction required.'],
 'sql-in-small-steps':['Verified original three-note query results, descending tie-breaker/limit walkthrough, join table, left-join zero-count rule and writes.','Parameters remain distinct from authorization; NULL and NOT NULL are not confused with empty strings. No content correction required.'],
 'find-data-with-indexes':['Checked directory-to-card mapping 41 → C, owner/note composite-index rationale and scan/output distinction.','The maintenance diagram assigns row/index coordination to the database, and diagrams make no physical-access-count or benchmark claim. No content correction required.'],
 'database-families':['Checked concrete document/key-value/event tables, tie-broken e3/e2/e1 range, graph direction/depth and changed-query walkthrough.','The comparisons present candidate fits with overlapping capabilities, independent growth limits and authorization. No content correction required.'],
 'transactions-and-correctness':['Checked half-completed move/activity table, affected-row caveat, stable-permission assumption, revision conflict example and commit/lost-response states.','The walkthrough distinguishes accepted state from caller knowledge and uses operation evidence rather than equating silence with rollback. No content correction required.'],
 'data-modeling-basics':['Checked membership composite identities, rename and count-maintenance diagrams, deliberate historical snapshots and many-to-many exercise.','Made the reader-role walkthrough explicitly deny the attempted edit before the separate authorized promotion. The same user’s other notebook role stays unchanged.'],
 'choose-a-database':['Checked workload card, 20 × 1 kB versus 20 × 2 MB table, registry joins/JSON reasoning and evaluation walkthrough.','Performance and restoration steps are proposed evidence to collect, not reported outcomes. No content correction required.'],
 'blobs-files-and-objects':['Verified 50 × 4 MB = 200 MB and metadata totals, interface distinction, private delivery path and upload lifecycle.','The walkthrough keeps bytes-existing, content-verified and metadata-ready separate, with access still required. Cross-store recovery and cleanup are explicit. No content correction required.'],
 'measure-before-scaling':['Checked attempted/completed rates, 60 MB logical storage, nested 900/100/30 ms timers and (9 × 100 + 2,000) ÷ 10 = 290 ms walkthrough.','Means are not treated as every-user experience or batch wall time. No content correction required.'],
 'grow-one-server':['Checked one/two/three app capacities against the 60/s shared dependency and the separate failure-headroom assumptions.','The walkthrough explicitly resets to a three-ready-instance starting scenario before losing one, rather than pretending capacity appears instantly after a failure. No content correction required.'],
 'gateways-and-proxies':['Checked forward/reverse responsibilities, combined entry policies, trusted identity boundary, readiness lag and 2 → 1 → 0 in-flight draining states.','Corrected one diagram step to identify A as the instance being replaced; “replacement instance” could incorrectly imply draining the new backend.'],
 'service-boundaries':['Checked modular versus deployment boundaries, partial failure, durable extraction and optional dependency fallback.','The 20 ms start / 100 ms elapsed deadline correctly gives an 80 ms wait, and cancellation does not claim remote termination. No content correction required.'],
 'load-balancing':['Checked round-robin outcomes, health-information lag and cumulative assigned CPU work A 400 ms versus B 20 ms.','Counts are not equated with simultaneous load or latency, and retries retain outcome uncertainty. No content correction required.'],
 'remember-with-caches':['Verified 90% hit fraction, 5/55 ms paths → 10 ms modeled mean, and distinct main/cached values after edit.','The miss/hit/evict sequence preserves the saved record and explicit public representation scope. No content correction required.'],
 'redis-from-scratch':['Checked command/type examples, atomic increment versus repetition, configured durability limits and the full 0/25/85 second TTL walkthrough.','Rechecked official Redis SET and TTL docs: plain SET discards an existing expiry, explicit EX establishes the replacement lifetime, and current TTL returns -1 for no expiry and -2 for absent keys. No content correction required.'],
 'cache-patterns-and-invalidation':['Checked stale-refill ordering, read/write-pattern limits, 100-to-1,000 fallback load and three-local-waiter timeline.','The coalescing example stays within one process and exact representation scope, bounds waiters and clears in-flight state; no global freshness or cross-process guarantee is implied. No content correction required.']
};
const records=[];
for(const id of baseline.scope){
 const file=`content/guides/${id}.json`,before=fs.readFileSync(file,'utf8'),g=JSON.parse(before);
 const protectedBefore=hash(JSON.stringify({id:g.id,questions:g.questions,flashcards:g.flashcards,exercise:g.exercise}));
 if(protectedBefore!==baseline.guides.find(x=>x.id===id).protectedFieldsSha256)throw Error('Pre-review protected fields changed: '+id);
 const section=id=>g.sections.find(s=>s.id===id);
 for(const [sectionId,starts] of Object.entries(paragraphStarts[id]||{}))for(const start of starts)section(sectionId).markdown=section(sectionId).markdown.replace(' '+start,'\n\n'+start);
 if(paragraphStarts[id])notes[id].push('Split remaining long prose at explicit concept boundaries (mechanism versus limits, setup versus result, or definition versus example); retained the causal order and all content.');
 if(id==='what-is-system-design')section('failure').markdown=section('failure').markdown.replace('We will examine memory, disks, and backups in week 2;','The next chapters examine memory, disks, and backups;');
 if(id==='dns-and-addresses'){
  const d=g.diagrams.find(d=>d.id==='dns-request');
  d.source='flowchart LR\nU[URL: scheme hostname and path] --> D[Resolve hostname when needed]\nD --> A[Usable network address]\nU --> P[Explicit port or scheme default]\nA --> C[Reach endpoint and establish HTTPS security]\nP --> C\nC --> H[HTTP request for notes slash 42]\nH --> S[Application checks access and returns note]';
  d.caption='Ordinary hostname lookup supplies address information; the URL supplies an explicit port or a scheme default. DNS success does not itself establish HTTPS, authenticate the user, or fetch the note.';
 }
 if(id==='connection-and-protocol-basics'){
  const w=g.walkthroughs[0];w.intro='This invented teaching format sends a payload byte count, a colon, and a word using ASCII characters that each occupy one byte. It demonstrates framing, not actual HTTP syntax; arbitrary text can use several bytes per character.';
  w.steps[0].explanation='The sender marks each word with its payload byte count so a receiver can find the boundary.';
  w.steps[1].state.find(s=>s.label==='Known length').value='3 bytes';
  if(!g.sources.some(s=>s.url==='https://www.rfc-editor.org/rfc/rfc9293.html'))g.sources.push({title:'IETF — TCP RFC 9293',url:'https://www.rfc-editor.org/rfc/rfc9293.html',checked:'2026-09-29'});
 }
 if(id==='data-that-survives')section('backup').markdown=section('backup').markdown.replace('Your 09:00 backup contains three notes;','Your 09:00 backup contains notes 41 and 42;');
 if(id==='data-modeling-basics'){
  const s=g.walkthroughs[0].steps[1];s.explanation='The server checks the matching notebook/user pair, not an unrelated role. A reader cannot edit under this example’s role policy, so this attempted edit is denied.';
  if(!s.state.some(x=>x.label==='Edit outcome'))s.state.push({label:'Edit outcome',value:'Denied while the role is reader'});
 }
 if(id==='gateways-and-proxies')g.diagrams.find(d=>d.id==='drain-transition').steps[0]='Mark A, the instance being replaced, ineligible for new work.';
 const after=JSON.stringify(g,null,2)+'\n';
 const protectedAfter=hash(JSON.stringify({id:g.id,questions:g.questions,flashcards:g.flashcards,exercise:g.exercise}));
 if(protectedAfter!==protectedBefore)throw Error('Protected fields changed: '+id);
 if(!notes[id]||g.walkthroughs.length!==1||g.diagrams.length<2)throw Error('Missing review or visuals: '+id);
 for(const d of g.diagrams)if(!g.sections.some(s=>s.id===d.sectionId)||d.steps.length<3)throw Error('Diagram shape: '+id);
 for(const w of g.walkthroughs){if(!g.sections.some(s=>s.id===w.sectionId)||w.steps.length<3||w.steps.length>5||w.steps.some(s=>s.state.length<2||s.state.length>4))throw Error('Walkthrough shape: '+id);}
 if(before!==after)fs.writeFileSync(file,after);
 const old=previous.records?.find(r=>r.id===id);
 records.push({id,sha256:hash(after),beforeReviewSha256:old?.beforeReviewSha256??hash(before),notes:notes[id],changed:old?.changed||before!==after,protectedAssessmentSha256:protectedAfter});
}
const report={reviewer:'interface agent — independent review of curriculum agent refinements',reviewedAt:new Date().toISOString(),scope:baseline.scope,method:'Read full updated prose, tables, diagrams, walkthrough transitions, exercises, objective answer keys, open-response guidance and flashcards. Checked illustrative arithmetic and accepted-state boundaries. Made six targeted teaching corrections plus concept-boundary paragraph breaks in seven guides, without altering protected assessment content.',referencesChecked:[{url:'https://www.rfc-editor.org/rfc/rfc9293.html',purpose:'Ordered byte-stream contract for the framing walkthrough'},{url:'https://redis.io/docs/latest/commands/set/',purpose:'SET replacement and TTL behavior'},{url:'https://redis.io/docs/latest/commands/ttl/',purpose:'TTL special reply meanings'}],checks:{records:records.length,allProtectedAssessmentsUnchanged:true,walkthroughAndDiagramStructure:true,rendering:'Parent owns the final shared render after content freeze'},records};
fs.writeFileSync('artifacts/guide-review-curriculum.json',JSON.stringify(report,null,2)+'\n');
console.log(`${records.length} guides reviewed; ${records.filter(r=>r.changed).length} files corrected; protected assessments unchanged.`);
