import {refine,diagram,walk,step} from './refine-systems-helpers.mjs';

refine({id:'reliable-events',sections:{
gap:`The app must save a publication and arrange its activity update. A reliable database plus a reliable broker does not make two separate calls one atomic action.

| Order of calls | Crash or failure between them | Incorrect outcome |
| --- | --- | --- |
| Commit note, then send event | Process stops before sending | Published note with no recorded activity obligation |
| Send event, then commit note | Database transaction fails | Event announces a publication that never committed |

Retrying the whole request is not a complete answer. The caller may never retry, and a retry may repeat work that already succeeded.

The missing concept is a **durable obligation**: a record that downstream work remains owed. Earlier transactions protected related rows inside one database. Put the publication fact and its outgoing obligation inside that boundary, rather than pretending an asynchronous arrow commits both stores.`,
outbox:`In one database transaction, publish the note and insert an outbox row. The outbox is a table of outgoing events still owed to downstream systems.

~~~text
BEGIN
  note n28: status = published, version = 6
  outbox E28: type = NotePublished, noteId = n28, version = 6
COMMIT
~~~

Either both rows commit or neither does. The request may return after this commit; the activity page is still allowed to lag.

| Participant | Responsibility | Durable evidence |
| --- | --- | --- |
| Request handler | Accept the business change and publication intent together | Note row plus outbox row |
| Relay | Publish committed outgoing work and track progress | Retained outbox identity/state |
| Activity consumer | Apply one accepted activity effect despite repeated events | Its own protected event/effect record |

The relay sends a row's event to the broker, then records publication progress. A crash after broker acceptance can repeat the publication; the next section handles this remaining gap.

Watch the oldest unsent row and available relay throughput. If publication stalls, obligations accumulate. Retry with limits and backoff, investigate stuck work, and keep enough data to recover. Deleting an unsent row merely to make a dashboard green discards the promise.`},
diagram:diagram('outbox-duplicate','The outbox fixes one gap while the relay can still repeat','duplicates','sequenceDiagram\nparticipant R as Relay\nparticipant B as Broker\nparticipant D as Outbox database\nR->>D: Read unsent event E28\nR->>B: Publish E28\nB-->>R: Accepted under broker contract\nNote over R: Crashes before recording progress\nR->>D: Restart and read unsent E28\nR->>B: Publish same E28 again','Consumer deduplication must protect its effect. This sequence does not include arbitrary external calls in the outbox database transaction.',['Read a committed outstanding event.','Publish it with its stable identity.','Recognize the crash after broker acceptance as an uncertain progress boundary.','Make repeated delivery harmless at the consumer’s authoritative effect.']),
walkthrough:walk('outbox-obligation','A committed note keeps its outgoing work after a crash','outbox','Follow note n28 and event E28. The note row and outbox row share one database; the activity projection is separate.',[
step('Before publication','The note is a draft. There is no accepted publication event.',{Note:'n28 draft, version 5',Outbox:'[]',Activity:'[]'}),
step('Commit both facts','One transaction publishes version 6 and records E28. The downstream page may still show its old state.',{Note:'n28 published, version 6',Outbox:'[E28 unsent]',Activity:'[]'}),
step('Handler stops before sending','A process crash does not erase the obligation because it was committed with the note.',{Note:'Still published',Outbox:'E28 remains unsent',Recovery:'Relay can discover E28'}),
step('Relay and consumer make progress','The relay publishes E28. A duplicate-tolerant consumer commits its activity effect; relay progress is recorded under its own protocol.',{Note:'Published',Outbox:'E28 publication observed',Activity:'One accepted entry for E28'})
],'The outbox is saved evidence of work owed. It removes the lost-obligation gap while leaving explicit relay and consumer recovery rules.'),changes:['Replaced dual-write narration with an order/failure/outcome comparison.','Added an illustrative transaction record and participant responsibility table.','Added relay-repeat diagram and durable-obligation walkthrough.']});

refine({id:'streaming-and-replay',sections:{
offset:`Use one partition with offsets 40 through 44. Our explicit convention stores the **next position to read**, not the last record completed.

| Reader | Last completed record | Saved next offset | Currently available unread records |
| --- | --- | --- | --- |
| Activity application | 42 | 43 | 43 and 44 |
| Counting application | 44 | 45 | None |

The bookmarks are independent. Advancing the activity reader does not advance the counting reader. The log still retains entries according to its retention policy.

Now write an activity for record 43, then crash before saving next offset 44. On restart, the saved position is still 43, so that record can be processed again. Saving 44 *before* safely applying 43 creates the opposite risk: a crash can skip uncommitted work.

~~~text
apply record 43 durably → save next offset 44
          crash here ↑ → record 43 can return
~~~

A bookmark and an unrelated database write are not automatically atomic. State whether a supported transaction covers them or whether the destination uses stable identities and duplicate-safe effects. Resume is also possible only while the required log history remains retained.`,
replay:`A corrected consumer can rebuild a broken counts view if the needed history remains. Use a new destination and verify it before switching reads.

| Replay destination | Intended behavior | Main check |
| --- | --- | --- |
| New counts table | Recompute the derived view | Correct counts, versions, deletes, and catch-up |
| Existing email sender | Could notify old users again | Do not enable effects accidentally |
| New search index | Reconstruct searchable state | Current permissions and removed content stay respected |

Replaying is another execution of inputs, not a special promise that side effects disappear. Use an explicit replay mode, separate rebuild consumer, or stable effect policy where appropriate. A fresh consumer group only gives independent progress; it does not make its actions harmless.

Keep event schemas compatible. A reader must understand older versions and missing fields. Changing a field's meaning without changing its contract can corrupt the rebuild.

Retained events may include data later removed for privacy. A replay procedure must honor deletion and access rules instead of resurrecting that data. **Interview phrasing:** “I can rebuild this derived view only from a sufficient, authorized, retained history, with external effects controlled.”`},
diagram:diagram('log-rebuild','Rebuild beside the serving view before switching','replay','flowchart LR\nL[(Retained authorized history)] --> R[Corrected rebuild consumer]\nR --> N[(New counts view)]\nO[(Current serving view)] --> C[Compare representative results]\nN --> C\nC --> V{Validated and caught up?}\nV -->|Yes| S[Switch serving pointer]\nV -->|No| K[Keep old view and investigate]','The capture/catch-up protocol must account for new events during the rebuild. Reading history does not authorize replaying emails or other external effects.',['Start a separate destination from the required retained history.','Apply events with compatible schemas and explicit effect policy.','Catch up ongoing changes and compare meaningful results.','Switch only after the selected correctness and freshness gates pass.']),
walkthrough:walk('offset-after-effect','A bookmark can lag behind a committed effect','offset','Partition P0 retains events 100–103. The destination transaction uses event identity to protect one activity effect.',[
step('Resume from a saved position','The saved next offset is 102, so records through 101 have been accounted for.',{Partition:'P0: 100, 101, 102, 103',NextOffset:'102',Activity:'Through 101'}),
step('Commit record 102’s effect','The activity and its processed marker commit. The reader has not saved its new bookmark yet.',{NextOffset:'Still 102',Activity:'Through 102',ProcessedMarker:'P0/102 committed'}),
step('Restart after a crash','The consumer reads 102 again. The destination recognizes the same event rather than inserting a second effect.',{ReadAgain:'P0/102',Activity:'Still one effect for 102',NextOffset:'102 until progress is saved'}),
step('Advance the bookmark','After safely accounting for 102, save 103 as next. Record 103 remains to be processed.',{NextOffset:'103',UnreadAvailable:'103',DuplicatedEffects:'0 in this protected example'})
],'A saved next offset claims that earlier work is safely accounted for. The destination transaction makes replay of already-accounted work safe.'),changes:['Made next-offset convention and independent reader progress visible in a table.','Added a replay-destination comparison and an annotated crash boundary.','Added rebuild-switch diagram and a protected offset/effect walkthrough.']});

refine({id:'identity-and-permissions',sections:{
check:`A logged-in Bob requests GET /notes/42. The server must evaluate **this actor, this action, and this object** under current policy.

| Request context | Policy fact | Decision |
| --- | --- | --- |
| Alice reads her private note | Alice owns it | Allow the read |
| Bob reads Alice's private note | No sharing grant | Deny |
| Workspace viewer requests an update | Viewer has read permission only | Deny the update |
| Workspace editor requests an update | Current edit grant applies | Allow within that grant |

The backend can load the object and check permission, or query directly within an authorized scope. Either way, changing the identifier in the URL must not bypass the decision. Random IDs reduce easy guessing; they do not create authorization.

Hiding an Edit button only changes the interface. A caller can construct the API request. Check workers, downloads, exports, and secondary APIs too.

When a required permission is absent or cannot be established, do not invent a grant. The product can return an appropriate forbidden or unavailable result without exposing another user's private object details.`,
tenant:`NorthCo and SouthCo may each have a note numbered 42. The database and cache must not confuse those namespaces.

~~~text
Unsafe shared key:  note:42
Scoped identity:    tenant:north / note:42
Different object:  tenant:south / note:42
~~~

Adding a tenant string to a key prevents a naming collision only if the tenant context is trustworthy. Validate membership against the authenticated identity; do not accept an arbitrary browser-supplied tenantId as permission.

| Boundary | Context to preserve |
| --- | --- |
| Database query | Authorized tenant and object scope |
| Cache lookup | Tenant plus relevant representation/permission scope |
| Background export | Trusted job origin, tenant, allowed action, and resource scope |
| Audit event | Actor, action, resource reference, outcome, correlation identity |

An export that says “tenant 8” still needs a legitimate origin and suitable service authority. The number is data, not a capability by itself.

Logs are another data store. Retain enough context to investigate a decision while excluding credentials and unnecessary note bodies. Apply access and retention controls to the audit trail itself.`},
diagram:diagram('tenant-boundary','Carry verified scope through every data access path','tenant','flowchart LR\nR[Request with claimed tenant and note] --> I[Verify caller identity]\nI --> P[Validate tenant membership and action]\nP --> Q[Scoped database lookup]\nP --> C[Scoped cache lookup]\nP --> J[Authorized job reference]\nQ --> O[Return only permitted content]\nC --> O\nJ --> W[Worker rechecks required trusted scope]','Scope must come from validated policy, not a caller-controlled string. Caches and jobs retain permission obligations rather than replacing them.',['Establish the caller identity.','Validate the requested tenant and action.','Use that verified scope in database, cache, and job paths.','Protect secondary reads and recorded results under the same policy.']),
walkthrough:walk('same-number-two-tenants','The same note number can name different private objects','tenant','Mina belongs to NorthCo only. Both organizations have a local note 42; the server derives the permitted organization from verified membership.',[
step('Establish the caller context','The authenticated session identifies Mina. Membership allows NorthCo, not SouthCo.',{Actor:'Mina',AllowedTenant:'NorthCo',RequestedObject:'note 42'}),
step('Build a scoped lookup','The application looks up the NorthCo note and cache representation. The number 42 alone is insufficient.',{DatabaseScope:'tenant = NorthCo, note = 42',CacheKey:'tenant:north:note:42',Candidate:'NorthCo note'}),
step('Challenge a changed tenant field','A request now claims SouthCo with the same note number. The server re-evaluates membership before accessing private data.',{ClaimedTenant:'SouthCo',VerifiedMembership:'NorthCo only',Decision:'No SouthCo access'}),
step('Keep the denial bounded','The response does not return SouthCo’s note or sensitive existence details. An audit event records the attempted boundary crossing.',{ReturnedContent:'No private SouthCo note',Audit:'Actor, action, scoped reference, denial',Authority:'Server-side policy'})
],'Authentication identifies the caller. Authorization binds that caller to an action and scoped resource across every path that can return data.'),changes:['Added an actor/action/object decision table.','Reworked tenant key collisions into concrete records and boundary responsibilities.','Added a verified-scope diagram and a two-tenant walkthrough without using real private data.']});

refine({id:'rate-limits-and-abuse',sections:{
bucket:`A token bucket makes the permitted burst visible. Imagine room for 10 tokens, refilling at 2 tokens/s, never above 10. Each admitted operation spends a positive validated cost.

| Event | Calculation | Balance/result |
| --- | --- | --- |
| Begin full | Capacity 10 | 10 tokens |
| Eight immediate searches, cost 1 each | 10 − 8 | 2 tokens |
| Wait one second without work | min(10, 2 + 2) | 4 tokens |
| One request costs 3 | 4 − 3 | Admit; 1 token |
| Another immediately costs 2 | Only 1 is available | Deny; keep 1 |

Capacity controls the short burst. Refill controls the ongoing budget. The cost can represent weighted work, but accepting a negative cost would create tokens rather than protect the service.

Make refill, capacity cap, affordability check, and debit one atomic decision at the enforcing authority. Concurrent callers must not both spend the same token. Use a suitable monotonic time source inside one process; distributed enforcement needs a declared time/authority policy. Client timestamps do not prove refill time has passed.`,
distributed:`Several local limiters do not become one global limit just because they use the same configuration.

| Enforcement design | Benefit | Cost or limit |
| --- | --- | --- |
| Independent per-instance buckets | Fast local decisions | Four 10/s allowances can admit roughly 40/s across four instances |
| Shared atomic authority | More precise common budget | Adds a dependency and coordination latency |
| Allocated local budgets | Less frequent coordination | Unused capacity or bounded overshoot depends on the allocation protocol |

If the shared limiter cannot be reached, choose a policy deliberately. Failing open admits without confirmed enforcement; failing closed rejects. A costly privileged operation may require denial or a small separately authorized emergency allowance. A low-risk read may use bounded local admission. Name the risk and scope.

**Rate is not concurrency.** Ten requests/s lasting 30 seconds imply roughly 300 simultaneous operations in steady conditions. Even a correct rate counter may need a separate active-work cap, deadline, and bounded queue.

In an interview, describe the budget key, unit, algorithm, atomic operation, allowed burst, and failure behavior. Counting requests is useful only when it connects to the scarce resource you intend to protect.`},
diagram:diagram('rate-and-concurrency','A request must fit both time-rate and active-work budgets','distributed','flowchart LR\nR[Request with validated positive cost] --> B{Rate budget available?}\nB -->|No| X[Reject with clear retry policy]\nB -->|Yes| C{Active-work slot available?}\nC -->|No| Q[Reject or enter bounded queue]\nC -->|Yes| W[Run with deadline]\nW --> F[Release active slot on actual completion]','The two controls have different state. Their coordination and charge/refund rules must be specified; drawing sequential checks is not an atomic multi-store implementation.',['Validate identity scope and operation cost.','Check the time-based admission budget under its atomic contract.','Bound simultaneous expensive work separately.','Release resources when the work ends, including cancellation handling.']),
walkthrough:walk('small-bucket','Spend a finite burst, then wait for refill','bucket','A separate teaching bucket holds 6 tokens, refills 1 token/s, and each operation costs 2. One authority performs atomic decisions.',[
step('Begin full','The bucket has enough budget for three immediate operations.',{Time:'0 s',Capacity:'6',Balance:'6',Cost:'2 per operation'}),
step('Use the burst','Three operations are admitted at the same illustrated time. They debit the shared balance rather than each seeing an independent full bucket.',{Time:'0 s',Admitted:'3',Balance:'0'}),
step('Too soon for another','One second refills one token, less than the next cost. The denied request does not spend a negative balance.',{Time:'1 s',Balance:'1',RequestedCost:'2',Decision:'Deny; balance stays 1'}),
step('Enough budget returns','At second 2 the bucket reaches two tokens. One operation can be admitted and returns the balance to zero.',{Time:'2 s',BeforeDecision:'2 tokens',Decision:'Admit one',AfterDecision:'0 tokens'})
],'The refill rate controls how fast budget returns; the capacity controls how much can be saved for a burst. Neither bounds how long admitted work stays active.'),changes:['Turned token arithmetic into an inspectable event table.','Added a local/shared enforcement comparison and explicit rate-versus-concurrency distinction.','Added a two-budget diagram and a separate small-bucket walkthrough.']});

refine({id:'reliable-systems',sections:{
domains:`Redundancy works against failures it actually separates. Draw the shared boundary, not just a second box.

| Added copy | Failure it may survive | Failure it still shares |
| --- | --- | --- |
| Two processes on one host | One process exits | Host power or operating-system failure |
| Two hosts on one shared dependency | One host fails | Shared database or network dependency outage |
| Two database replicas | Some node/storage failures under their protocol | Bad deletion replicated to both |
| Two regions | Some regional failures | Shared bad release, credential, or authority design |

A **failure domain** is a group that can disappear or misbehave together. Circle application hosts, storage, entry routing, network, identity, and relevant configuration. Two regions can still use the same expired credential.

Do not claim independence just because the labels differ. For each extra copy, complete two sentences: “This survives ___ because ___” and “This still fails when ___.” That turns a topology into an assessable reliability claim.`,
degrade:`Suggested tags are optional; preserving the user's note is essential. If the save handler waits for tag suggestions before committing, a slow optional service blocks the core action.

~~~text
Fragile: validate → wait for tags → save note → respond
Revised: validate → save note → respond “Saved; tags pending”
                                  ↘ separate bounded tag work
~~~

| Failure | Useful remaining behavior | Misleading behavior to avoid |
| --- | --- | --- |
| Tag service unavailable | Return the durably saved note without tags | Make every save wait for tags |
| Database rejects the save | Show a truthful save failure or unresolved state | Display Saved anyway |
| Public examples view lags | Serve permitted older data if the contract allows | Reuse that policy for private deletion confirmation |

Graceful degradation preserves a useful declared promise. It may omit optional material, show a pending job, or return an allowed older view. The fallback must mean what the user thinks it means.

Keep optional calls and queued work bounded so they cannot occupy all connections, memory, or workers needed by saves. A new asynchronous arrow is helpful only when the resource and recovery behavior supports the promised separation.`},
diagram:diagram('survivor-budget','A surviving server still has finite capacity','capacity','flowchart LR\nD[Demand after one server fails] --> P[Classify essential and optional work]\nP --> E[Reserve bounded capacity for essential actions]\nP --> O[Admit optional work only within remaining budget]\nE --> S[Surviving service capacity]\nO --> S\nP --> R[Reject excess work early and clearly]','Priority is an explicit product policy, not an assertion that all demand fits. Test the safe measured capacity and the recovery delay under the required workload.',['Measure how much capacity survives the chosen failure.','State which actions the product prioritizes.','Bound accepted work to actual remaining resources.','Reject or defer excess demand instead of hiding it in unlimited waiting.']),
walkthrough:walk('survive-one-instance','Redundancy needs spare capacity to keep its promise','capacity','Two instances can each comfortably serve 70 requests/s in this illustrative workload. Current demand is 120/s: 60 essential saves and 60 optional requests.',[
step('Before failure','Load is shared. The combined comfortable capacity exceeds current demand.',{Instances:'2 ready',SafeCapacity:'140 requests/s',Demand:'120 requests/s'}),
step('Lose one instance','One survivor remains. The original demand now exceeds the measured safe capacity by fifty requests/s.',{Instances:'1 ready',SafeCapacity:'70 requests/s',ExcessDemand:'50 requests/s'}),
step('Apply a declared admission policy','Reserve capacity for the 60 essential saves, admit 10 optional requests, and reject or defer the other 50 honestly.',{EssentialAdmitted:'60/s',OptionalAdmitted:'10/s',OptionalNotAdmitted:'50/s'}),
step('Observe and restore capacity','A replacement must start and become ready before its capacity counts. Verify saves remain correct and timely while optional work recovers.',{Replacement:'Starting, then ready after checks',Evidence:'Save outcomes and latency',Limit:'Shared database failure remains separate'})
],'A second instance does not guarantee full peak service after one fails. State surviving capacity, priority policy, and the user-visible limit.'),changes:['Replaced generic redundancy prose with failure-domain comparisons.','Made optional-work separation visible in before/after flows and fallback outcomes.','Added survivor admission diagram and a fully calculated capacity walkthrough.']});

refine({id:'reliability-controls',sections:{
budget:`An error budget connects a reliability target to counted outcomes. Use one million eligible reads and a 99.9% target for this fixed-count example.

| Quantity | Calculation | Value |
| --- | --- | --- |
| Allowed bad fraction | 100% − 99.9% | 0.1% |
| Allowed bad events | 1,000,000 × 0.001 | 1,000 |
| Observed bad events | Measured under the declared rules | 1,100 |
| Good fraction | 998,900 / 1,000,000 | 99.89% |

The target is missed by 100 bad events in this example. This does not mean a team should deliberately fail its allowance. It gives the team a shared way to discuss risk, incident repair, and whether to pause risky changes.

Define the counting and response policy beforehand. Missing telemetry must not quietly become successful requests. Inspect important customer and regional groups too: an acceptable aggregate can hide a badly affected minority.

**Interview phrasing:** “I will define a good eligible event, measure it over a stated window, and use the target to guide action. A percentage alone is not a user guarantee.”`,
time:`A timeout bounds one wait. A deadline bounds the whole operation. Resetting a full timeout at every hop can turn one user deadline into several consecutive delays.

| One-second example budget | Amount |
| --- | --- |
| Local processing and final response reserve | 200 ms |
| Initial dependency budget | 800 ms |
| First attempt consumes | 300 ms |
| Backoff consumes | 100 ms |
| Maximum left for another attempt | 400 ms before any further overhead |

~~~text
one deadline → spend on attempt → spend on delay → retry only if time remains
                never reset the original allowance at the next hop
~~~

The second timeout must be clipped to actual remaining time, not merely the illustrative subtraction. Scheduling and local processing can consume more than expected. Propagate the deadline and reserve room to return a meaningful result.

Cancellation can stop wasted work when supported, but it is cooperative. A timed-out save may already have committed. Reuse the intended operation identity or resolve its status; timeout is not rollback. An expired budget may justify an honest unresolved result rather than another attempt.`},
replaceDiagram:'deadline',diagram:diagram('deadline','Each wait spends from one remaining allowance','time','flowchart LR\nD[One user deadline] --> A[Compute remaining time and response reserve]\nA --> C{Safe useful attempt fits?}\nC -->|Yes| W[Attempt with clipped timeout]\nW --> R{Outcome known?}\nR -->|No| B[Bounded backoff spends time too]\nB --> A\nC -->|No| E[Stop attempts and report known state]\nR -->|Yes| S[Return verified result]','This is a recovery decision flow, not permission to repeat arbitrary effects. Each retry also needs stable operation identity, an appropriate error class, and an attempt/work budget.',['Set one deadline for the user action.','Account for elapsed time and response work before each attempt.','Spend backoff from the same allowance.','Stop when a safe useful retry cannot fit, preserving uncertainty honestly.']),
walkthrough:walk('one-allowance','A second attempt receives only the remaining budget','time','The teaching operation has a 900 ms total budget. Reserve 150 ms for local work and the final response, leaving 750 ms for dependency attempts and delay.',[
step('Allocate one allowance','Do not grant 900 ms independently to every helper. This example separates the local reserve from the dependency budget.',{TotalBudget:'900 ms',LocalReserve:'150 ms',DependencyBudget:'750 ms'}),
step('First attempt ends without a result','The first wait consumes 250 ms. The operation outcome is unresolved; retrying still requires an appropriate idempotency/status contract.',{ConsumedDependencyTime:'250 ms',DependencyRemaining:'500 ms',Outcome:'Unknown'}),
step('Backoff also spends time','A 100 ms delay leaves only 400 ms for another dependency attempt, before additional unplanned overhead.',{Backoff:'100 ms',DependencyRemaining:'400 ms',LocalReserve:'Still reserved, not extra time'}),
step('Clip or stop','The next attempt gets at most the actual remaining allowance. If it cannot finish usefully, stop and return a truthful unresolved/unavailable result.',{NextTimeout:'At most 400 ms, clipped to real deadline',FreshFullTimeout:'Not permitted by this budget',FinalAction:'Return verified result or explicit uncertainty'})
],'Deadlines bound total waiting; idempotency bounds repeated effects; retry budgets bound extra work. A reliable policy needs all relevant boundaries.'),changes:['Reworked error-budget and request-deadline arithmetic into inspectable tables.','Added a concise one-deadline annotated flow and operational interview phrasing.','Refined the deadline diagram and authored a separate allowance-spending walkthrough.']});
