import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname,'..');
const content = path.join(root,'content');
fs.mkdirSync(path.join(content,'lessons'),{recursive:true});
fs.mkdirSync(path.join(content,'interviews'),{recursive:true});
const sec=(id,title,markdown)=>({id,title,markdown:markdown.trim()});
const diag=(id,title,source,caption,steps)=>({id,title,source,caption,steps});
const choice=(id,prompt,options,answer,explanation)=>({id,type:'choice',prompt,options,answer,explanation});
const num=(id,prompt,answer,unit,tolerance,explanation)=>({id,type:'numeric',prompt,answer,unit,tolerance,explanation});
const open=(id,prompt,answer,explanation)=>({id,type:'open',prompt,answer,explanation});
const cards=pairs=>pairs.map(([front,back])=>({front,back}));
const refs={slo:{title:'Google SRE: Service Level Objectives',url:'https://sre.google/sre-book/service-level-objectives/'},overload:{title:'Google SRE: Handling Overload',url:'https://sre.google/sre-book/handling-overload/'},monitor:{title:'Google SRE: Monitoring Distributed Systems',url:'https://sre.google/sre-book/monitoring-distributed-systems/'},simple:{title:'Google SRE: Simplicity',url:'https://sre.google/sre-book/simplicity/'},interview:{title:'Amazon Jobs: SDE II Interview Prep',url:'https://www.amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep'},c4:{title:'C4 model: Diagrams',url:'https://c4model.com/diagrams'}};
function save(id,body){fs.writeFileSync(path.join(content,'lessons',`${id}.json`),JSON.stringify({id,version:1,status:'drafted',authoredBy:'original',...body,sources:body.sources.map(s=>({...s,checked:'2026-09-29'}))},null,2)+'\n');}
export {save,sec,diag,choice,num,open,cards,refs,content};

save('001',{
objectives:['Explain system design as a chain of justified decisions.','Distinguish state, computation, and communication in one request.','Create a notebook with assumptions, guarantees, and falsifiable evidence.','Identify a simple architecture and one honest limitation.'],
retrieval:['Recall a program you wrote that stored data. What would disappear if its process stopped?','Name a bug where valid-looking input produced an incorrect business result.'],
sections:[sec('start','A small problem with real consequences',`
Core budget: 5 minutes diagnostic, 14 minutes explanation and trace, 8 minutes notebook example, 10 minutes exercise, 5 minutes questions, 3 minutes review. No system-design vocabulary is required yet. Your Python and SQL experience is enough.

Imagine a department needs a borrowing register for 200 pieces of equipment. A student scans a tag, borrows an item, and returns it later. Start by writing what success means: an authorized student can see current availability; an item has at most one active borrower; a confirmed loan remains recorded after restarting the application. These statements immediately tell you more than a list of fashionable components.

System design connects user behavior to mechanisms and their limits. You choose where data lives, who may change it, when a response is safe to return, and how the system behaves when something fails. The design includes ordinary operation and recovery. It is a model you can challenge, not a beautiful drawing you must defend at all costs.

Before reading further, spend two minutes proposing your own design. Preserve it unchanged in the notebook. This is a diagnostic, not a graded exam: later compare how your reasoning changes. Record unknowns rather than filling them with confident guesses.
`),sec('mechanism','Follow one authoritative state change',`
Use one backend application and one persistent database. The browser expresses intent; the application checks the request; the database owns the borrowing record. That separation gives each component a responsibility. The browser must not be the authority on whether an item is available, because two browsers can have old information.

Trace a successful loan in six steps: the student submits item 42; the application identifies the student; it verifies permission; it asks the database to create a loan only if the item is free; the database persists the accepted change; the application returns the resulting loan ID. The response belongs after the persistence decision. A success response sent before saving cannot honestly mean that the loan is recorded.

Now challenge the trace. Two students can submit at the same time. Checking availability and later inserting a loan as unrelated actions allows both to pass the check. You do not need the names of transaction isolation levels yet. You do need the requirement that the check and state transition act as one protected operation. Write that requirement next to the database boundary. M04 will implement it.

A different failure happens when saving succeeds but the response is lost. The student sees an error although the state changed. A design that equates missing response with no change will create duplicate actions. For now record an unresolved outcome and a need to retrieve the current state; later lessons develop retries and idempotency. Good early design exposes such obligations rather than pretending all requests finish cleanly.
`),sec('notebook','A decision notebook that supports learning',`
Keep four short records for each design: assumptions, decisions, unresolved questions, and evidence. An assumption might be “200 items; up to 50 simultaneously active students; one campus.” A decision is “use one database as the authority for active loans.” Its reason is “all competing claims on an item must be compared in one place.” A rejected alternative is “browser-local storage cannot arbitrate between students.” A test is “two simultaneous claims produce exactly one active loan.”

Separate facts from estimates. A stakeholder-supplied item count is a fact for the exercise; a traffic multiplier you guessed is an assumption. Put a confidence level and a validation action beside uncertain numbers. Avoid inventing a precise throughput ceiling for a component you have never measured.

Here is a compact evidence entry:

~~~text
Decision D1: authoritative loans live in one database.
Guarantee: at most one active loan per item.
Failure to test: process stops after saving, before response.
Evidence needed: restart and query the item; inspect active loan count.
Revisit when: one server cannot meet measured peak demand or recovery needs.
~~~

Reading about a guarantee is not evidence that you can implement it. Distinguish “I can explain,” “I have attempted,” and “I demonstrated using this test.” At this stage your evidence may be a precise trace and a counterexample; executable tests will join it later.
`),sec('tradeoffs','The first architecture is allowed to be small',`
One server has a shared failure domain: if it stops, the service is unavailable. Persistent storage can preserve data while the application is down, so unavailability and data loss are different problems. A backup may help recover data but does not automatically keep the service running. Conversely, two application copies cannot recover information that both depend on a lost database to read.

Whether that limitation is acceptable depends on the department's tolerance. If a clerk can use a temporary paper record during a short outage, a modest design may be justified. If this were emergency medical equipment, the consequences and requirements would change. The product name alone does not select the architecture.

Common mistakes are equating more boxes with more reliability, saying “scalable” without a workload, treating every failure as identical, and drawing arrows without stating whether they carry a command, a response, or stored data. Ask of every box: which requirement needs it; what state does it own; what fails if it disappears; what is the simpler alternative?

Optional practice, outside the 45-minute core: inspect one of your previous backend projects and write a missing-response failure trace. Do not add a queue or cache yet; first explain the unmet requirement.
`)],
diagrams:[diag('loan-path','When does a loan become real?',`sequenceDiagram
participant S as Student browser
participant A as Application
participant D as Database authority
S->>A: Borrow item 42
A->>A: Check identity and permission
A->>D: Protected claim on item 42
D-->>A: Persisted loan 81
A-->>S: Confirm loan 81
Note over A,D: Success means the authoritative<br/>change was accepted`, 'All arrows represent a synchronous request or its response. The browser is outside the trusted application boundary. Saving precedes confirmation.', ['The browser submits intent, not authoritative availability.','The application applies identity and permission checks.','The database arbitrates the state change.','Only an accepted stored loan is confirmed.'])],
exercise:{prompt:'In ten minutes, sketch the borrowing register and trace two students attempting to borrow the same item. Write one invariant, one outage consequence, one lost-response ambiguity, and one measurable test. Do not choose a distributed-system product.',minutes:10,rubric:['Names authoritative state and its owner.','Shows the two competing claims, not only the happy path.','Separates unavailable service from lost data.','States an observable result for the proposed test.'],solution:'Use browser → application → persistent loans database. The invariant is active_loans(item_id) ≤ 1. Both students may have seen “free”; only one protected claim may succeed. If the application stops, reads and writes fail temporarily while existing stored loans may survive. If it stops after storing loan 81, the browser cannot infer failure from a timeout. Querying the item or operation state resolves the ambiguity. A concurrency test submits both claims together and checks exactly one accepted loan and one explicit conflict; a restart test checks the accepted loan still exists.'},
questions:[choice('q1','Which observation is evidence of a reliable borrowing operation?',['The diagram has five components.','The accepted loan survives a restart test.','The page loads once.'],'The accepted loan survives a restart test.','A restart test challenges a specified guarantee. Component count and a successful page load do not establish persistence.'),choice('q2','Who should be authoritative about the active borrower?',['Each browser independently','The persistent shared borrowing store','The label printed on the item'],'The persistent shared borrowing store','Shared state needs a shared authority; a stale browser view cannot arbitrate competing updates.'),open('q3','A response disappears after the database saved a loan. What is known, and what remains unknown to the client?','The loan may have been accepted; the missing response does not establish that no state changed. The client needs a way to inspect the authoritative outcome.','Assess the distinction between request outcome and observation, not use of a particular retry product.'),open('q4','When can a single-server design be a defensible decision?','When its measured capacity and accepted outage/recovery behavior meet the scoped requirements, and its limitations and revisit triggers are explicit.','The tradeoff is smaller operational burden against a shared failure domain; “small company” alone is not evidence.')],
flashcards:cards([['System design begins with what?','A user need, a workload, and correctness or service guarantees.'],['What is authoritative state?','The state accepted as the source of truth when representations disagree.'],['Why keep assumptions separate from evidence?','An untested estimate must remain revisable; evidence records an observation.'],['Does a timeout prove no change occurred?','No. The operation may have completed while its response was lost.'],['What does an invariant express?','A condition that must remain true across every accepted state change.'],['What makes a design decision useful?','Its requirement, reason, rejected alternative, and revisit or validation condition.']]),
mentalModel:'Design is a traceable argument: requirement → state and mechanism → guarantee → failure test.',sources:[refs.simple,refs.interview]});

save('002',{
objectives:['Convert vague adjectives into testable requirements.','Write non-goals that protect scope.','Express business invariants independently of implementation.','Negotiate compromises without silently weakening correctness.'],retrieval:['From L001: where did the borrowing register keep its authoritative state?','Explain why a missing response can leave the client uncertain.'],
sections:[sec('problem','“Build a booking system” is not yet a specification',`
Core budget: retrieval 5, explanation 18, worked clarification 8, exercise 10, questions 10, review 4 minutes. This lesson uses a campus rehearsal-room booking service. We deliberately separate describing required behavior from choosing transactions or locks, which come later.

A request to “make booking fast, secure, and scalable” contains aspirations but almost no acceptance criteria. Which rooms? Who is allowed to reserve them? Are overlapping reservations allowed for setup time? Can someone edit a confirmed booking? Does “fast” concern viewing availability or receiving confirmation? Clarifying these points is engineering work: each answer can change state ownership, query patterns, or the response contract.

Start with the user journey. A student browses rooms, chooses a start and end time, submits a reservation, and later cancels it. A facilities administrator can block a room for maintenance. Restrict the initial release to one campus and authenticated students. Payments, recurring bookings, and automatic conflict resolution are non-goals. A non-goal does not mean “never”; it means the current design does not promise that behavior.
`),sec('invariants','Write guarantees that survive changes of technology',`
A functional requirement describes an action: reserve a room. An invariant constrains every valid result: two confirmed reservations for the same room must not overlap. A service objective constrains observed behavior: 99% of valid availability searches complete within 500 ms during the specified peak workload. An operational constraint limits your choices: one part-time operator and one campus deployment. Keep these categories separate because they are checked differently.

For half-open time intervals [start, end), reservations overlap when start_A < end_B and start_B < end_A. Half-open intervals allow a booking ending at 11:00 and another beginning at 11:00, if the product permits no turnaround time. If cleaning needs ten minutes, incorporate that explicitly rather than changing comparison operators accidentally.

An invariant should describe the business, not a favored tool. “Use a lock” is not an invariant. “At most one confirmed reservation covers any instant for a room” is. Many mechanisms might enforce it. Conversely, “availability pages may lag by 30 seconds” can be an acceptable compromise only if the final confirmation still arbitrates the authoritative state. A stale hint is not permission to violate the booking rule.

Scope each guarantee. “No duplicate bookings” could mean no overlapping room occupancy or no repeated result from one retried action. Those are different conditions. Write the exact entities and transitions. Ask what happens if two students reserve simultaneously or an administrator closes a room while a student is choosing it.
`),sec('worked','A clarification exchange and its consequences',`
Candidate: “Do we need global rooms or one campus?” Stakeholder: “One campus, 40 rooms.” Consequence: no global placement requirement has been established.

Candidate: “Is a displayed slot guaranteed until the user submits?” Stakeholder: “No, but an accepted reservation must not conflict.” Consequence: searching can provide a provisional view while confirmation needs an authoritative check.

Candidate: “Can the system reject new bookings if it cannot verify availability?” Stakeholder: “Yes; browsing can stay available from a slightly old view.” Consequence: different operations have different failure policies. Showing old availability may be tolerable; inventing a confirmation is not.

Candidate: “What is most painful: a slow page or two groups arriving for the same room?” Stakeholder: “Double booking is worse.” Consequence: when speed and correctness conflict, preserve the invariant and return a clear unsuccessful or unresolved result.

Record the result as a contract:

~~~text
Action: confirm a reservation for room_id, start, end, student_id.
Preconditions: start < end; student authorized; room usable.
Accepted result: reservation ID with a confirmed time interval.
Invariant: confirmed intervals for the same room do not overlap.
Rejected result: explicit conflict, invalid input, or unavailable decision.
Non-goals: payments, recurring series, cross-campus operation.
~~~

This does not yet implement safe concurrency. It tells later mechanisms what they must prove. If you cannot describe a counterexample, your requirement may be too vague to test.
`),sec('compromises','Negotiation is explicit, not accidental',`
Some requirements can move: result freshness, image quality, or the size of a search page. Others may define the product's validity: isolation between private accounts or preserving confirmed reservations. You may negotiate either category with the relevant owner, but must not silently trade away an invariant because a component is inconvenient.

Consider three alternatives during an outage. Reject confirmation and keep browsing: bookings are temporarily unavailable, but no unverified booking is accepted. Accept a tentative request and clearly label it pending: this changes the API and user expectation; it is not a confirmed booking. Accept every request as confirmed and reconcile later: this breaks the stated invariant and requires a different product agreement. Naming a queue does not make the third option correct.

Failure scenarios should be requirement probes. If deletion of a student account must remove their private data, what happens to an audit record? The answer may require separate retention policies and pseudonymous references, rather than a blanket deletion claim. Do not invent legal deadlines; record the policy owner and a question.

Common misconceptions: non-functional means optional; low latency means low average only; a non-goal is irrelevant forever; choosing a database proves business correctness. Each mistakes a label for an observable contract. End clarification by reading back a small list of agreed guarantees and the most consequential uncertainty.
`)],
diagrams:[diag('confirmation','An available-looking slot is only a proposal',`flowchart LR
B[Browse provisional availability] -->|Choose room and interval| P[Submit proposal]
P -->|Authoritative check| C{Can confirm safely?}
C -->|Yes| A[Persist confirmed reservation]
C -->|Conflict| R[Reject with conflict]
C -->|Cannot decide| U[Return unavailable or pending]
A -->|Only then| S[Send confirmed ID]`, 'The diagram distinguishes a convenient view from a correctness decision. “Pending” must be a documented product state, never a disguised confirmation.', ['Browsing supports selection but grants no ownership.','The proposed interval reaches the authority.','Only a safe accepted change becomes confirmed.','An unknown decision must be communicated honestly.'])],
exercise:{prompt:'A stakeholder says “Build a fast parcel-locker booking app.” In ten minutes write three clarifying questions, two non-goals, two invariants, one measurable service objective, and an outage compromise. Include what would make your compromise unacceptable.',minutes:10,rubric:['Questions change architecture or response guarantees.','Invariants identify entities and forbidden states.','Objective includes operation, threshold, percentile, and workload or window.','Compromise preserves or explicitly renegotiates the invariant.'],solution:'Ask whether reservations are for a specific compartment, whether one user may hold several, and whether pickup must work when the network is down. Initial non-goals could be payment and cross-city transfers. Invariants: a compartment has at most one active allocation; only the intended recipient or authorized operator may unlock it. Example objective: 99% of valid reservation decisions within 800 ms at 40 requests/s, measured over one campus business day. During inability to inspect current allocation, browsing approximate availability may continue but confirmation fails explicitly. This is unacceptable if stakeholders require guaranteed offline reservation; that would require a changed allocation protocol and further design.'},
questions:[choice('q1','Which is a business invariant?',['Use PostgreSQL.','At most one active allocation per locker.','The service should be modern.'],'At most one active allocation per locker.','It constrains valid states independently of implementation.'),choice('q2','A stale availability page is permitted. What follows?',['Confirmation may ignore conflicts.','Confirmation still must preserve the agreed invariant.','All operations must use stale data.'],'Confirmation still must preserve the agreed invariant.','Freshness for a view and correctness for an accepted change are different guarantees.'),choice('q3','Which clarification is most useful first?',['Which queue brand should we use?','What outcome would be unacceptable even during failure?','Should the logo be blue?'],'What outcome would be unacceptable even during failure?','Failure consequences identify required guarantees before components are chosen.'),open('q4','Explain the difference between pending and confirmed during an outage.','Pending records intent awaiting a decision; confirmed asserts that the acceptance conditions were satisfied. The UI and API must expose that distinction.','A queue can hold pending work, but its presence does not establish the business outcome.'),open('q5','Should a faster confirmation path be adopted if it can occasionally double-book?','Only if stakeholders explicitly accept a different invariant and its consequences. Under the current contract it is invalid even when latency improves.','A valid tradeoff names the sacrificed guarantee and the decision owner.')],
flashcards:cards([['Functional requirement?','An action the system must support.'],['Invariant?','A condition preserved by every accepted transition.'],['Non-goal?','A behavior deliberately excluded from the current scope.'],['Why clarify failure behavior early?','It determines when the system may accept, reject, or defer work.'],['Can stale reads coexist with strict confirmation?','Yes, if the final authoritative check enforces the invariant.'],['What makes an objective measurable?','A defined operation, population, threshold, measurement window, and observation point.']]),mentalModel:'Clarify what may be approximate, what must remain true, and what the system is allowed to say when it cannot decide.',sources:[refs.slo]});

save('003',{
objectives:['Distinguish latency, throughput, availability, and durability.','Interpret percentiles without confusing them with maximum latency.','Define a user-facing indicator and its target.','Compute a simple request-based error budget.'],retrieval:['From L002, give a functional requirement and a separate invariant.','What does a confirmed response promise in the borrowing example?'],
sections:[sec('metrics','Four questions, four different measurements',`
Core budget: 5 minutes retrieval, 18 explanation, 8 arithmetic, 10 exercise, 10 questions, 4 review. Reuse a photo-notebook service: a user saves a photo with a caption, then opens an album. This is an invented workload, not a description of a commercial product.

Latency asks how long one operation takes. Throughput asks how many operations cross a specified boundary per unit time. Availability asks whether the requested useful service can be obtained. Durability asks whether accepted information remains preserved over the stated period and failures. A service may be available but return the wrong account's photos, so correctness is not supplied by any of these performance numbers.

An upload can take two seconds while the system finishes 500 uploads per second if many uploads overlap. There is no contradiction: one is a duration and one is a rate. A process can be down while its stored photos remain safe. Conversely, it can answer every request promptly after accidentally deleting half the albums. That is high request availability for some operations and terrible data preservation.

Always name the operation and observation point. Upload-start to first response, upload-start to fully stored photo, and album-click to visible image are different latencies. A server-side timer cannot see all time spent waiting in the browser or traversing the network.
`),sec('distributions','The average can hide the user who is stuck',`
Suppose 100 album requests contain 95 durations of 100 ms and five durations of 2,000 ms. Their arithmetic mean is (95 × 100 + 5 × 2,000) / 100 = 195 ms. Using nearest-rank percentiles, p95 is 100 ms and p99 is 2,000 ms. A p95 target alone permits the slowest five percent to be much worse. p99 is not the maximum, and a percentile from 100 observations is much less stable than the same percentile from a large representative population.

Specify how the distribution is gathered. Mixing image thumbnails with huge uploads can make a single latency number unhelpful. Counting only successful responses can conceal fast failures or exclude the worst timeouts. Measure errors and success latency together, and explain your treatment of timed-out operations.

Do not average the p99 values of two servers to obtain a fleet p99. One server may have ten requests and the other ten thousand; even weighting their percentile values does not reconstruct their distributions. Combine the underlying observations or compatible histograms. The purpose of the percentile is to describe a population, not to provide a convenient number detached from that population.

In the walkthrough, predict where the user-visible timer starts and stops. If a backend reports 80 ms but an image becomes visible after 900 ms, investigate the gap before claiming the database is slow.
`),sec('objectives','Turn a measurement into a decision',`
An SLI is the measurement definition; an SLO is a target for that measurement. A practical album-read SLI might be the fraction of valid album reads that return the authorized album within 500 ms, measured at the local gateway during a rolling 28-day window. An initial SLO might require that fraction to be at least 99.5%. Those numbers are exercise assumptions and require product agreement in real work. An SLA adds an agreement and consequences; it is not merely another spelling of SLO.

For 200,000 eligible requests, a 99.5% success target permits 1,000 bad requests in the window: 200,000 × (1 − 0.995). If 700 are already bad, 300 remain under this simplified fixed-volume calculation. A moving window and future request volume change the available budget, so a production dashboard needs exact window semantics.

Do not convert that request budget into minutes of downtime without assumptions. A five-minute outage during a busy event may affect more users than an hour overnight. A time-based objective is a different measure. Likewise, a storage durability target needs a definition of accepted data and failure scope; “we have backups” is a mechanism claim, not a measured loss probability.

An objective earns its place when missing it leads to an action: reduce overload, investigate a slow dependency, or improve recovery. CPU utilization is often diagnostic evidence. It does not by itself tell you whether users can complete the operation.
`),sec('failure','Use the dimensions to diagnose, not decorate',`
Consider a deployment that doubles completed requests per second but increases p99 from 400 ms to 4 seconds. It improved one rate while potentially violating the interactive objective. A batch import might welcome that tradeoff; a user waiting for a booking decision may not. Decide using the operation's needs.

Now stop the application process while leaving its disk intact. Availability drops; no data loss has yet been shown. Restore the process from an old snapshot that misses yesterday's confirmed photos. Availability returns, but durability has failed for those photos. Your report should describe both events separately so the team does not celebrate recovery while overlooking missing data.

Common mistakes include claiming “99.9% uptime” without a window, promising “zero latency,” excluding all failures from the denominator, interpreting p99 as a guarantee on every request, and treating replication or backup count as proof of durability. Prefer a small set of precise measurements to a page of unexplained percentages.

Optional depth: instrument a familiar script with a monotonic timer and collect a distribution. This extension is separate from the scheduled arithmetic exercise; no instrumentation library is required for the core.
`)],diagrams:[diag('timers','Which latency does the user experience?',`sequenceDiagram
participant U as User
participant B as Browser
participant A as Application
participant S as Storage
U->>B: Open album and start user timer
B->>A: Read album
Note over A: Server timer starts
A->>S: Read photo metadata
S-->>A: Album data
A-->>B: Response and stop server timer
B->>B: Decode and display images
B-->>U: Album visible and stop user timer`, 'Server latency is a subset of the journey. The drawing shows ordering, not measured durations.', ['User-visible timing begins with the action.','Application timing excludes earlier client and network delay.','Storage is one segment of application work.','Rendering completes after the server has already replied.'])],
exercise:{prompt:'An API receives 80,000 eligible requests. 240 fail, and another 160 return correctly but slower than the 600 ms objective. Define a combined good-request SLI, compute its value, and decide whether it meets 99.6%. Explain what a backup does and does not tell you about this result.',minutes:10,rubric:['Counts failed and slow outcomes once each using the disjoint categories stated.','Shows denominator and units.','Distinguishes target from observed result.','Separates recovery/data preservation from request performance.'],solution:'Good = 80,000 − 240 − 160 = 79,600. SLI = 79,600/80,000 = 99.5%, below 99.6%. Budget is 320 bad requests; there are 400, an excess of 80. The supplied categories are disjoint; with real data use a union so slow failures are not counted twice. A backup may support recovery of stored information, but it does not establish response latency or request availability.'},questions:[choice('q1','Which has units of requests/second?',['Latency','Throughput','Durability'],'Throughput','Latency has time units; throughput is a flow rate.'),choice('q2','p99 is 800 ms. What does this describe?',['Every request is below 800 ms.','The 99th-percentile point of the defined observed population.','The mean is 800 ms.'],'The 99th-percentile point of the defined observed population.','A percentile is neither a maximum nor a mean; sample and window definitions matter.'),num('q3','At a 99.9% target, how many bad requests are allowed among 500,000 eligible requests?',500,'requests',0,'500,000 × 0.001 = 500.'),open('q4','The service is available after restoration but loses the last hour of confirmed writes. Which claims must be separated?','Serving has resumed, but accepted data was lost. Availability recovery does not establish durability.','Name the affected period and accepted-data boundary; avoid treating a healthy process as complete recovery.'),open('q5','When might you accept a throughput gain with worse latency?','For a workload whose completion deadline tolerates the slower individual response, such as a bounded batch import, if the agreed objective still holds.','The same change can be valid for batch work and invalid for interactive requests.')],flashcards:cards([['Latency?','Elapsed time for an operation at a stated boundary.'],['Throughput?','Operations or bytes completed per unit time.'],['Availability versus durability?','Can I use the service now versus is accepted data preserved?'],['SLI versus SLO?','Measurement definition versus target for it.'],['Request error budget?','Eligible requests × allowed bad fraction, with exact window semantics.'],['Can fleet p99 be obtained by averaging server p99s?','No; aggregate distributions or compatible histograms.']]),mentalModel:'Duration, rate, usability, and preservation are separate promises. Define the population before interpreting a number.',sources:[refs.slo,refs.monitor]});

save('004',{
objectives:['Translate active users and actions into operation rates.','Separate average traffic from a stated peak scenario.','Account for API amplification and workload mix.','Use ranges and dimensional checks instead of false precision.'],retrieval:['From L003: explain why requests/second and milliseconds cannot substitute for each other.','From L002: name a non-goal before estimating a product.'],
sections:[sec('model','Count behavior before servers',`
Core budget: retrieval 5, explanation 18, worked arithmetic 8, exercise 10, questions 10, review 4 minutes. We estimate a reading-list app where users save links and browse a personal list. The figures are explicit invented assumptions, not measurements from an existing service.

Registered accounts are not a request rate. Start with a population active within a stated interval, multiply by actions per active person in that interval, and divide by interval seconds. Units should cancel: users/day × actions/user × requests/action gives requests/day. Dividing by seconds/day yields requests/second. In everyday interview shorthand “DAU × actions per user per day” means the same calculation, but writing units prevents accidentally multiplying by an extra day.

Suppose the app has one million registered accounts, 100,000 daily active users, and each active user opens their list 12 times and saves two links per day. Browse volume is 1.2 million operations/day; saves are 200,000/day. Average browse rate is about 13.9/s, save rate 2.31/s, and combined rate 16.2/s. One million accounts alone could have suggested an enormous service while hiding a modest actual flow.

An action is not necessarily an API request. If opening a list fetches a page of data and then separately fetches permissions and unread counts, one action makes three API calls. If each page triggers one query per item, internal database demand may be amplified again. Keep user actions, external requests, and internal operations in separate rows.
`),sec('peaks','A peak needs a timescale and a cause',`
Daily average rate spreads work across all 86,400 seconds. If most users are in one time zone or a notification prompts them simultaneously, that average misses the decisive load. For this exercise, assume a busiest one-minute window at eight times the daily mean. External peak is then about 130 requests/s under the one-call-per-action model. Eight is a scenario assumption to validate, not a universal industry multiplier.

A one-second burst, one-minute peak, and one-hour peak can require different handling. A buffer may absorb a brief surge for delay-tolerant work; it cannot erase sustained demand that exceeds completion capacity. An interactive deadline can also make buffering unsuitable. State whether arrivals are spread evenly within your peak window; 7,800 requests in one minute could arrive smoothly or in one second.

Traffic mix may change during the peak. During an import launch, saves might dominate, even though reads dominate the daily average. A single overall multiplier assumes the mix stays fixed. Split the estimate when the architecture is sensitive to write cost, expensive search, large uploads, or a hot account.

Geographic and tenant skew also matter. A global average does not say how much reaches one region or one customer's partition. Record the largest plausible concentration before assuming traffic is evenly spread.
`),sec('worked','An estimate you can recompute aloud',`
Use round numbers until a decision needs precision. Here is an executable standard-library arithmetic example, intended for Python 3.11 or newer. Save as traffic.py and run python traffic.py. Expected output is shown; the companion verification script checks these equations.

~~~python
def average_rps(dau: int, actions_each: int, calls_each: int = 1) -> float:
    assert dau >= 0 and actions_each >= 0 and calls_each >= 0
    return dau * actions_each * calls_each / 86_400

browse = average_rps(100_000, 12)
save = average_rps(100_000, 2)
assert round(browse + save, 1) == 16.2
print(f"average={browse + save:.1f}/s peak={(browse + save) * 8:.1f}/s")
# average=16.2/s peak=129.6/s
~~~

Sensitivity is more useful than extra decimal places. If daily active users are between 50,000 and 200,000, the same behavior produces 8.1–32.4 requests/s average and roughly 65–259/s at eightfold peak. If browse requires three calls, combined daily calls become 3.8 million, or 44.0/s average and 352/s peak. That uncertainty changes the result more than rounding 86,400 to 100,000.

Do not conclude “one server supports this” without measurements and request cost. State instead: “The demand model is about 130/s peak under these assumptions; next I need per-operation service cost and a representative benchmark.”
`),sec('reasoning','Use the number to choose the next question',`
The estimate should answer a design question. If the initial concern is network capacity, request counts alone are insufficient; the next lesson introduces bytes. If the concern is memory held by unfinished requests, duration matters; L007 connects rate and concurrency. If the concern is a business correctness race, even two simultaneous writes can violate an invariant, so low traffic is no excuse to ignore it.

Failure scenarios begin in the workload model. A client retry after every timeout can add attempted requests without increasing useful user actions. A periodic job scheduled for every tenant at midnight can produce a concentrated burst. A product announcement can synchronize readers on one object. Record these as scenarios rather than quietly folding them into a vague safety factor.

Common errors include using monthly active users as daily active users, dividing by hours while labeling the result per second, applying a peak multiplier twice, estimating every operation as equally expensive, and confusing completed throughput with offered demand during overload. Use a small table with population, action, interval, multiplier, and uncertainty to expose these errors.

Optional practice: estimate one day of a service you use, with an honest low/high range and a plan to measure it. Do not research private traffic numbers and present guesses as company facts.
`)],diagrams:[diag('funnel','Turn human actions into component demand',`flowchart LR
U[100000 daily active users] -->|12 browses each| B[1200000 browse actions per day]
U -->|2 saves each| W[200000 save actions per day]
B -->|1 API call per action| T[1400000 API calls per day]
W -->|1 API call per action| T
T -->|Divide by 86400 seconds| R[16.2 average requests per second]
R -->|Assumed 8x one-minute peak| P[129.6 peak requests per second]`, 'This is a demand calculation, not a measured benchmark or server-capacity claim. The one-call assumption is deliberately visible.', ['Select active population and time interval.','Count read and write actions separately.','Apply API amplification explicitly.','Convert units, then apply one stated peak scenario.'])],exercise:{prompt:'Estimate a course app with 60,000 daily active students. Each opens 20 lesson pages and submits three quizzes daily. Each page makes two API calls; each quiz submission makes one. Assume a sixfold peak with the same mix. Compute average and peak API requests/s, then name two assumptions that could invalidate this peak estimate.',minutes:10,rubric:['Separates page actions from API calls.','Includes quiz submissions.','Divides by 86,400 and applies peak once.','Challenges time distribution or changing operation mix.'],solution:'Page calls = 60,000 × 20 × 2 = 2,400,000/day. Quiz calls = 180,000/day. Total = 2,580,000/day; average 29.86/s and peak 179.17/s. A synchronized exam can concentrate quiz writes much more than reads; one-minute averages can hide one-second bursts. Bots, retries, or a changed page API also alter amplification.'},questions:[num('q1','10,000 users each make 86.4 requests/day. What is average demand?',10,'requests/s',0.05,'10,000 × 86.4 / 86,400 = 10.'),choice('q2','A sixfold peak multiplier is best described as:',['A universal constant','A stated workload assumption requiring validation','A guarantee provided by a load balancer'],'A stated workload assumption requiring validation','Its validity depends on user behavior and aggregation window.'),choice('q3','Which can increase requests without increasing useful user actions?',['Retries after timeouts','Renaming an endpoint','Reducing registered-account count only'],'Retries after timeouts','Retries are extra attempts for the same intent.'),open('q4','Why is a per-operation traffic mix useful?','Different operations can have different CPU, storage, network, and correctness costs; peak mix may differ from daily mix.','A total RPS number hides expensive operations and state contention.'),open('q5','Is one server enough for 200 requests/s?','The rate alone is insufficient. Need request cost, service objectives, measured sustainable capacity, and recovery requirements.','A good answer requests decision-relevant evidence instead of asserting an arbitrary capacity.')],flashcards:cards([['Average request rate?','Active population × actions each × requests each / interval seconds.'],['Seconds in a day?','86,400.'],['What must accompany a peak multiplier?','Its timescale, scenario, operation mix, and uncertainty.'],['User action versus request?','One intent can trigger several external or internal calls.'],['Offered demand versus throughput?','Arrivals attempted versus work actually completed at a boundary.'],['Why estimate a range?','Uncertain behavior often dominates rounding precision.']]),mentalModel:'Population × behavior × amplification ÷ time. Every multiplier is an assumption you should be able to explain.',sources:[refs.monitor]});
