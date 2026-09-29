import {refine,diagram,walk,step} from './refine-systems-helpers.mjs';

refine({id:'job-lifecycle-and-backpressure',sections:{
states:`A state should make one claim the system can support. For our export service, keep the public meanings distinct even if some transitions are too quick to notice.

| State | Evidence behind it | What it does not claim |
| --- | --- | --- |
| accepted / queued | Durable submission / ready work is waiting | A worker finished |
| running | A current attempt owns execution | Completion is inevitable |
| succeeded | The expected result is durably published | Every browser has downloaded it |
| failed | The terminal policy has ended or input must change | No attempt ever performed work |
| cancellation requested | The intent to stop is recorded | All work has stopped |
| cancelled | The chosen cancellation outcome is established | An earlier external effect was undone |

Store a job version and current attempt identity. A delayed worker can publish only if its expected state and ownership still match at the authoritative transition. Those checks protect the lifecycle; the status badge merely displays it.

A failed attempt can return to waiting while retry budget remains. It should not temporarily announce that the overall job is permanently failed. Similarly, a user clicking Cancel records intent before the worker necessarily stops. **Ask what has actually happened before choosing the word on screen.**`,
capacity:`A queue stores waiting work. It does not add workers or make each worker faster.

| Quantity in the simple steady-rate model | Value |
| --- | --- |
| Arrival rate | 8 jobs/s |
| Five workers at 1 job/s each | 5 jobs/s total completion |
| Backlog growth | 8 − 5 = 3 jobs/s |
| Extra backlog after 60 seconds | 180 jobs |
| Extra backlog after 300 seconds | 900 jobs |

With 900 jobs already ahead and 5 completions each second, a new FIFO job waits roughly 180 seconds before its turn. This assumes similar job costs and no priority changes. Later arrivals join behind it in this model; variability, retries, and scheduling can change the real wait.

Increasing storage for the queue only permits a longer wait. If arrivals permanently exceed completion capacity, every finite waiting room eventually fills. Admission control must reject or defer some demand, or useful capacity must rise.

For a changing rate, recalculate the spare rate. A backlog drains at **completions minus ongoing arrivals**, not at all completions. The walkthrough uses a separate miniature burst to make that visible. Measure oldest-job age alongside counts, because ten long AI jobs can wait differently from ten tiny exports.`},
replaceDiagram:'job-backpressure',diagram:diagram('job-backpressure','The admission decision protects a finite waiting room','protect','flowchart LR\nU[New job with known cost bounds] --> A{Queue and resource budget available?}\nA -->|Yes| Q[Accept into bounded queue]\nA -->|No| B[Busy response with retry policy]\nQ --> W[Workers with concurrency limit]\nW --> D[(Durable job and result state)]\nW --> M[Measure completions and oldest age]\nM -.->|Adjust policy| A','Admission is based on the promised workload and finite resources. The queue cannot guarantee a deadline without capacity and job-cost assumptions.',['Bound the work requested by one job.','Accept only while the chosen queue and resource budget permits.','Limit active work so downstream capacity remains usable.','Use completion rate and waiting age to revisit admission.']),
walkthrough:walk('burst-and-drain','Watch a backlog grow, then drain','capacity','This arithmetic model begins empty, completes 4 jobs/s, and uses smooth rates. At second 3, admission lowers accepted arrivals from 7/s to 2/s.',[
step('Begin a short burst','Seven jobs arrive each second while only four finish. Waiting work grows at three per second.',{Time:'0 s',AcceptedArrivals:'7 jobs/s',Completions:'4 jobs/s',Backlog:'0'}),
step('See the accumulated wait','Three seconds of excess arrivals add nine waiting jobs. The service changes admission rather than accepting indefinite growth.',{Time:'3 s',Backlog:'9 jobs',NewAcceptedRate:'2 jobs/s',SpareCapacity:'2 jobs/s'}),
step('Drain while new jobs still arrive','Three more seconds remove six net waiting jobs. Counting all twelve completions as backlog reduction would ignore six new arrivals.',{Time:'6 s',Backlog:'3 jobs',CompletionsSinceChange:'12',NewArrivalsSinceChange:'6'}),
step('Return to an empty waiting room','Another 1.5 seconds at two spare completions per second drains the remaining three.',{Time:'7.5 s',Backlog:'0',Assumption:'Steady costs and rates; real queues vary'})
],'An admission policy changes the incoming rate; a concurrency policy bounds active work. Both are different from storing more waiting jobs.'),changes:['Made lifecycle states and their limits comparable in a concrete evidence table.','Turned capacity arithmetic into labeled quantities and explicit FIFO assumptions.','Refined the admission diagram and authored a separate burst/drain state walkthrough.']});

refine({id:'first-design-url-shortener',sections:{
data:`Our starting contract has two requests and one persistent mapping.

| Request | Input | Accepted result |
| --- | --- | --- |
| POST /links | Public HTTP(S) destination and client-scoped operation ID | Stored unique code and short address |
| GET /k7p2 | The code in the path | Redirect to its saved destination, or an honest lookup error |

The links table retains code, destination_url, and creation identity. A unique code cannot silently change to a different destination. Duplicate creation identities must match their original input and resolve through a protected acceptance path.

For example:

~~~text
code:          k7p2
destination:   https://photos.example/public/garden
createIntent:  client7/request19
~~~

Visiting the short code yields HTTP 302 with a Location header containing the saved destination. The browser makes a **second request** to that address. The shortener need not fetch the page itself just to redirect.

If an authoritative lookup succeeds and finds no code, report not found. If the database cannot be reached, report unavailable or an appropriate error: inability to look up the mapping is not evidence that it is absent. Validate allowed destination schemes at creation, and remember that the destination still enforces access to its own content.`,
paths:`There are two different repeats to handle. Keep their identities separate.

| Situation | Same or different intention? | Protected decision |
| --- | --- | --- |
| Two creates choose code k7p2 | Different mappings want one public key | Unique code constraint; generate a new candidate for the loser |
| The caller repeats one create after a lost reply | Several attempts at one intended mapping | Resolve the same operation ID and compatible input |
| An old operation ID arrives with a different destination | Ambiguous or conflicting reuse | Reject or apply an explicit conflict contract |

The unique constraint prevents replacing an existing link during a collision. Retrying candidate generation is bounded; a rare conflict should be handled, not hidden by overwriting someone else's destination.

For client retries, duplicate detection and the accepted mapping belong in one protected database workflow. If the first attempt committed, return its existing code. A new random code for every network attempt would create several mappings for one intent.

**Interview phrasing:** “The code identifies the public mapping; the operation ID identifies the creation intent. I enforce both meanings separately.”

Test both conditions deliberately. Force the generator to propose an occupied code, then an unused code. Separately repeat one creation identity with matching input and inspect the returned mapping. These are proposed learner checks, not a claim that an unimplemented shortener has passed them.`},
diagram:diagram('create-intent','A lost creation reply does not require a new mapping','paths','sequenceDiagram\nparticipant C as Caller\nparticipant A as Shortener\nparticipant D as Mapping database\nC->>A: Create with operation Q8 and destination\nA->>D: Protect operation identity and unique code\nD-->>A: Accepted code m4dq\nA--xC: Reply lost\nC->>A: Retry Q8 with same destination\nA->>D: Resolve accepted Q8\nD-->>A: Existing code m4dq\nA-->>C: Same short link','The database workflow must enforce the identity and input match atomically. Random code generation alone does not make retries safe.',['Submit one creation intent with a stable identifier.','Accept a unique mapping under that identity.','Treat a lost reply as uncertain knowledge.','Resolve the same intent on retry instead of inventing a new one.']),
walkthrough:walk('redirect-two-requests','One short link causes two browser requests','data','Use code m4dq for a public workshop page. The database already contains this accepted immutable mapping.',[
step('Ask the shortener','The browser contacts the shortener with a code. It has not requested the workshop site yet.',{Request:'GET /m4dq',DestinationKnownToBrowser:'Not yet',Mapping:'m4dq → https://events.example/workshop'}),
step('Return routing information','The app finds the saved mapping and returns a redirect response rather than the workshop HTML.',{Status:'302',Location:'https://events.example/workshop',BodyResponsibility:'Shortener response only'}),
step('Follow the address','The browser sends another request, now to the destination service. That service has its own availability and access rules.',{Request:'GET https://events.example/workshop',Receiver:'Workshop site',Shortener:'No longer fetching page bytes'}),
step('Render the destination response','The workshop site responds under its own contract. A valid redirect does not guarantee that destination will always exist.',{VisiblePage:'Workshop response',SavedMapping:'Unchanged',Limit:'Destination can later fail or require login'})
],'A redirect tells the browser where to ask next. The saved mapping, creation retries, and destination behavior are three separate responsibilities.'),changes:['Reworked APIs and stored data into a compact request table and record example.','Separated code collisions from repeated creation attempts with a decision comparison.','Added lost-reply diagram and a distinct browser redirect walkthrough.']});

refine({id:'copying-data',sections:{
trace:`In our primary/replica model, one database accepts writes and another applies copies. Edit note 42 from **Buy tea** to **Buy coffee**. The primary can hold the new value while the replica still holds the old one.

| Event | Primary | Replica | What a reader may observe |
| --- | --- | --- | --- |
| Before edit | Buy tea | Buy tea | Both agree |
| Primary commits edit | Buy coffee | Buy tea | A replica read can be old |
| Replica receives change | Buy coffee | Not necessarily applied yet | Receipt alone does not prove a query sees it |
| Replica applies change | Buy coffee | Buy coffee | This replica includes the edit |

**Asynchronous replication** may acknowledge before the replica catches up. That can reduce waiting, but a primary failure before copying can leave an acknowledged update missing from a promoted copy, depending on recovery options.

**Synchronous replication** waits for a configured replication condition. Ask whether that means received, durably stored, or applied for reads. Waiting adds latency or may stop writes while a required node is unavailable. It does not automatically make every read from every copy current.`,
numbers:`Suppose the primary handles 900 reads/s and 100 writes/s. Move 600 suitable reads/s to two replicas:

| Destination | Illustrative user reads/s | Writes to account for |
| --- | --- | --- |
| Primary | 300 | 100 original writes/s |
| Replica A | 300 | Applies copied changes |
| Replica B | 300 | Applies copied changes |

The user-read count moved; the write history did not divide into three independent datasets. Replication itself consumes network, storage, and processing. These request counts therefore do not predict CPU usage or latency by themselves.

Replication and sharding answer different questions. Replication asks for another copy of the same data; sharding divides different data among owners. A system can use both, but each needs its own rationale.

Now draw a boundary around the physical host and shared storage. If all three copies depend on the same failed host, the diagram has more database icons without independent protection. Name what can fail together before claiming the extra copy provides availability.`},
diagram:diagram('version-aware-read','Do not route an immediate follow-up read blindly','user','flowchart LR\nS[Save acknowledged at position P] --> R[Follow-up read requires P]\nR --> C{Chosen replica has applied P?}\nC -->|Yes| V[Serve from that replica]\nC -->|No| W[Bounded wait or authoritative fallback]\nW --> E[Return result or explicit inability to meet contract]','A position is meaningful only within the replication protocol. Receipt, persistence, and application are different; fallback must respect the operation deadline.',['Remember the position required by the completed write.','Check whether the selected replica has applied at least that position.','Wait briefly or route to an appropriate authoritative read path if it has not.','Do not silently return an older value under a read-your-writes promise.']),
walkthrough:walk('delayed-copy','The write is saved before every copy can read it','trace','The teaching system orders note changes by replication position. Acknowledgement is asynchronous, and the follow-up read requires the acknowledged position.',[
step('Both copies agree','Before the edit, the primary and replica have applied position 204.',{Primary:'n7 = draft; position 204',Replica:'n7 = draft; position 204',RequiredRead:'None yet'}),
step('Acknowledge the new edit','The primary saves published at position 205 and acknowledges. The replica has not applied that change.',{Primary:'n7 = published; position 205',Replica:'n7 = draft; position 204',RequiredRead:'At least 205'}),
step('Protect the immediate refresh','A replica read at 204 cannot satisfy this session’s requirement. Route to a suitable current authority or wait within the deadline.',{ChosenReplica:'204, insufficient',Action:'Use authoritative read path',Returned:'published at 205'}),
step('The replica catches up','Once position 205 is applied, that replica can satisfy the same minimum-position read.',{Primary:'205',Replica:'205',ReplicaValue:'published'})
],'A successful write and a readable copy are separate milestones. Pick the reader-visible promise before choosing how to route reads.'),changes:['Converted replication milestones into a concrete value table.','Separated moved reads from copied writes in the capacity example.','Added a follow-up read decision diagram and a version-position walkthrough.']});

refine({id:'split-data-into-shards',sections:{
key:`Start with the question the application asks most often: **“Give me this owner's newest notes.”** An owner_id shard key keeps those records together, so one lookup can find the owner’s shard.

| Candidate key | Convenient operation | Cost or hotspot to investigate |
| --- | --- | --- |
| owner_id | List one owner's notes | One huge owner can overload its shard |
| creation month | Archive an old month | Current-month writes concentrate together |
| note_id | Look up one individual note | Owner lists may contact many shards |

A router maps a key to its current shard. That route is not permission: the server must still verify that this caller may read the owner's notes.

~~~text
authenticated request → validate owner scope → find current shard → query notes
~~~

Table partitioning inside one database is not automatically data spread across separate machines. State whether you are dividing tables locally or assigning ownership across database nodes. The same word can hide very different operational boundaries.`,
route:`For intuition, compute hash(owner_id) mod 3. A deterministic hash gives the same numeric result for the same input under the same rule; mod means the remainder after division.

| Example hash output | With 3 shards | With 4 shards |
| --- | --- | --- |
| 5 | 2 | 1 |
| 8 | 2 | 0 |
| 11 | 2 | 3 |

Changing the divisor changes these routes **without moving any stored notes**. A reader using the new rule can arrive at an empty destination while its data remains in the old shard. These sample owners all happened to start on shard 2; they are chosen to expose the movement, not to demonstrate balanced distribution.

Production schemes may use an explicit ownership directory, ranges, or a more stable hash-ring/token layout. Consistent hashing can reduce changed placement under its model; it does not transfer data, stop two writers, or divide a hot key by itself.

Treat a routing change as a migration: copy a consistent starting set, catch up changes, validate, and perform a protected ownership handoff. Readers and writers need an agreed mapping epoch, or version of the route. The walkthrough is an example protocol outline, not a complete production migration implementation.`},
diagram:diagram('shards-and-copies','Dividing data and copying data are different directions','problem','flowchart TB\nR[Router using owner placement] --> A[Shard A owns owners 1 to 4]\nR --> B[Shard B owns owners 5 to 8]\nA -->|Replicate same shard data| AC[Replica of shard A]\nB -->|Replicate same shard data| BC[Replica of shard B]','The owner ranges are illustrative. Sharding divides ownership; replication copies each shard’s data under its own consistency and recovery protocol.',['Choose a placement rule for different data.','Route one owner to its current authoritative shard.','Replicate that shard if another copy is required.','Plan failures and migrations for both ownership and copies.']),
walkthrough:walk('move-owner','Changing a route requires moving the data safely','route','Owner u17 moves from shard 2 to shard 3 using a directory. This is a bounded outline: the actual system must enforce capture and ownership handoff.',[
step('Old route is authoritative','All accepted writes for u17 go to shard 2 under route epoch 6.',{Directory:'u17 → shard 2, epoch 6',Shard2:'Through change P80',Shard3:'No u17 copy'}),
step('Copy while retaining changes','Load a consistent copy through P80 into shard 3. The old owner remains authoritative and records later changes for catch-up.',{Directory:'Still shard 2',Shard2:'Now through P81',Shard3:'Copy through P80'}),
step('Catch up and establish handoff','Apply P81, validate the copy, and use a protected handoff that stops old-epoch writes before the new owner is usable.',{Shard2:'Old writes fenced at handoff',Shard3:'Validated through P81',NewEpoch:'7 established by protocol'}),
step('Publish the new route','Clients use epoch 7. Stale routes are rejected or redirected under the migration protocol, rather than accepting conflicting writes.',{Directory:'u17 → shard 3, epoch 7',WriteOwner:'Shard 3 only',OldCopy:'Retained under rollback policy'})
],'Placement math does not move records. Migration must connect the copied data, later writes, and one enforceable ownership decision.'),changes:['Added a shard-key decision table tied to actual queries and hot keys.','Made modulo-remapping consequences visible with three computed examples.','Added a shard-versus-replica diagram and a catch-up/ownership walkthrough.']});

refine({id:'consistency-in-plain-language',sections:{
session:`Start with what one person expects across requests. These promises solve different surprises.

| Promise | Small history it prevents | What it does not automatically promise |
| --- | --- | --- |
| Read your writes | You save v9, then your session reads a state before v9 | Every other user immediately sees v9 |
| Monotonic reads | You read v9, then later see v7 in the same ordered history | You necessarily see the newest global value |
| Causal consistency | You see a reply before the message it depends on | One total real-time order of all unrelated operations |

A session can carry a required version or route suitable reads to the writer. A replica must meet that version before returning a promised result; otherwise use a bounded wait, appropriate fallback, or explicit inability to meet the contract.

Versions need a defined order and scope. Arbitrary timestamps from unsynchronized machines are not a substitute. A note revision, a per-partition position, and a global protocol revision may have different meanings.

**Pause and predict:** a reader saw v9 without writing it, then receives v7. Which session promise matters? Focus on the observed history, not whether the user pressed Save.`,
worked:`Draw invocation and response points. The overlap between operations matters as much as the returned value.

| History for one register | Interpretation under the stated model |
| --- | --- |
| Write Finished starts; read returns Draft; write then completes | Can be linearizable: place the read before the overlapping write |
| Write Finished completes; a later read returns Draft; no other write | Violates linearizability: the completed write must come first |
| One session reads v8, then v6 | Violates its monotonic-read promise for this version history |

A **register** is a simple stored value with read and write operations. Linearizability gives those operations one order that respects already completed operations. It does not require disk changes to happen simultaneously on every machine.

The first history does not mean every old read is acceptable. Its permission comes from the overlap. Move the read's start until after the write's response, and the reasoning changes.

For a booking or transfer, also identify the protected multi-field operation and transaction rules. A strong individual read alone does not make a multi-step read/check/write sequence atomic. Use a timeline to state the promise before choosing replica coordination or database settings.`},
diagram:diagram('causal-message','Show the cause before exposing its dependent reply','session','flowchart LR\nM[Message M accepted] --> R[Reply R records dependency on M]\nR --> C{Reader has required cause M?}\nC -->|Yes| V[Expose reply R]\nC -->|No| W[Fetch or wait for cause under contract]\nW --> V','This illustrates a user-visible causal dependency, not a complete causal-consistency algorithm. Permission checks still apply to both records.',['Accept the original message.','Associate its reply with the dependency that matters.','Check that the reader can observe the required cause under the chosen contract.','Expose the dependent result only when the contract is met.']),
walkthrough:walk('overlap-register','Move the read across the write response','strong','One register starts at blue. No other writes occur. Times are illustrative logical observations, not synchronized-clock machinery.',[
step('A write begins','The caller asks to change blue to green. It has not yet received completion.',{Time:'t1',StoredHistory:'blue before this write',Write:'In progress'}),
step('A read overlaps','A different read starts and returns blue before the write response. A single order can place this read first.',{Time:'t2',ReadResult:'blue',AllowedOrder:'Read, then write'}),
step('The write completes','The writer receives success. Every later-starting operation must respect that completed write in a linearizable history.',{Time:'t3',WriteResult:'Success: green',OverlappingRead:'Already finished'}),
step('A later read begins','This new read cannot return blue under the stated contract, since no intervening write restored it.',{Time:'t4',RequiredObservation:'green',Reason:'Write completed before this read began'})
],'Linearizability constrains a history, not a slogan such as “all replicas always match.” Identify which operations overlap before judging their results.'),changes:['Converted session guarantees into concrete prevented histories and limitations.','Reworked the three-history comparison around call/response timing.','Added a causal dependency diagram and an independent register walkthrough.']});

refine({id:'partitions-and-quorums',sections:{
choice:`East has acknowledged changing a value from 0 to 1. A later read reaches West, which still has 0 and cannot communicate with East.

| West's action during this split | Consequence for this request |
| --- | --- |
| Return the old 0 immediately | Can violate the linearizable read contract |
| Wait until the required evidence is available | Cannot guarantee a successful response while the split persists |
| Refuse with a clear temporary-unavailable result | Honest operational behavior, but not CAP's successful availability |

CAP's argument uses a precise availability definition: a nonfailed node eventually serves every request according to the operation's valid response contract. A fast arbitrary error does not satisfy the same successful read/write service.

Operational SLO percentages and latency deadlines are also important, but they are not identical to that theorem definition. Avoid the slogan “pick any two.” You cannot wish unreliable communication away. State what this particular operation does when it cannot obtain the evidence its correctness promise requires.

A product may continue serving older public browsing data while refusing an inventory claim. That is a scoped product decision, not a single label for the entire architecture.`,
quorum:`Take a fixed replica set A, B, C. A write waits for W = 2 acknowledgements. A read collects R = 2 responses. Because R + W > N, the two groups must share at least one replica.

| Completed write group | Possible read group | Shared replica |
| --- | --- | --- |
| A and B | A and B | A and B |
| A and B | A and C | A |
| A and B | B and C | B |

Overlap gives new information somewhere to meet the read. It is **not the whole consistency protocol**. The reader must recognize versions, handle concurrent and partial writes, and obey membership/failure assumptions. Returning only the first response could discard the useful evidence from the other replica.

For N = 5, W = 3, R = 3, minimum overlap is one. A 3–2 network split leaves only the group of three able to form a majority. That arithmetic alone does not specify safe leader election, commits, reads, or recovery.

Substitute replicas outside the fixed set can invalidate this simple argument. Before saying “quorums make it consistent,” name the actual protocol and show how it treats conflicting or unfinished operations.`},
diagram:diagram('partition-choice','The same split can allow browsing and block a claim','business','flowchart TB\nS[Required coordination link unavailable] --> B[Public catalog read]\nS --> C[Last-seat claim]\nB --> P{Product permits older catalog?}\nP -->|Yes| O[Serve allowed cached view]\nP -->|No| U[Explain unavailable result]\nC --> Q{Valid commit authority reachable?}\nQ -->|Yes| A[Attempt protected claim]\nQ -->|No| U','The diagram expresses operation-specific contracts. It does not claim a cache can confirm inventory or that returning an error satisfies CAP availability.',['Identify the operation affected by the split.','Check the browsing freshness promise separately from inventory correctness.','Commit a claim only through a valid authority and protocol.','Return an honest unavailable result where the guarantee cannot be met.']),
walkthrough:walk('quorum-evidence','Find the newer version inside an overlapping read','quorum','Three fixed replicas store a versioned value. This walkthrough demonstrates overlap only; it does not implement a complete linearizable register.',[
step('Begin with agreement','All three replicas hold version 4.',{A:'v4 = amber',B:'v4 = amber',C:'v4 = amber'}),
step('A write reaches two replicas','The protocol’s illustrated write condition is met by A and B. C remains behind.',{A:'v5 = teal',B:'v5 = teal',C:'v4 = amber',Acknowledgements:'A and B'}),
step('Read from a different pair','The read collects B and C. B is the intersection with the completed write group.',{ReadGroup:'B and C',BReply:'v5 = teal',CReply:'v4 = amber',Intersection:'B'}),
step('Use evidence under a protocol','For this simple ordered-version example, v5 is recognizable. A real implementation still needs rules for concurrent and incomplete writes.',{Candidate:'v5 = teal',RequiredRule:'Resolve versions and operation state',NotProven:'Full linearizability from overlap alone'})
],'Quorum arithmetic explains why evidence can overlap. The protocol explains which evidence constitutes a safe result.'),changes:['Replaced CAP slogans with a response/consequence comparison.','Added an explicit three-pair overlap table and retained all protocol caveats.','Added operation-specific partition behavior diagram and a versioned quorum evidence walkthrough.']});
