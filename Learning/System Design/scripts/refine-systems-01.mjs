import {refine,diagram,walk,step} from './refine-systems-helpers.mjs';

refine({id:'cache-freshness-and-cdns',sections:{
old:`At noon, our notes app caches the public caption **Garden** for photo 41. Ten seconds later Maya saves **Spring garden**. At twenty seconds, a visitor still receives **Garden**. The copy may be intact and still be too old for the reader's needs.

Think of a printed timetable: the printing can be perfect while the times are outdated. A cache needs a freshness policy as well as correct bytes.

| Time | Saved caption | Cached caption | What this simple policy allows |
| --- | --- | --- | --- |
| 0 seconds | Garden | Garden, TTL 60 seconds | Serve the copy |
| 10 seconds | Spring garden | Garden, 50 seconds remain | The database edit did not refresh the copy |
| 20 seconds | Spring garden | Garden, 40 seconds remain | An old caption can still be returned |
| 60 seconds | Spring garden | Expired | Refresh before calling this entry fresh |

**TTL means time to live for this cache entry.** It starts from the relevant cache policy boundary, not from every edit elsewhere. A newly filled entry might itself contain an old database value. TTL alone therefore does not prove that data is no more than 60 seconds behind the latest edit.

Before choosing a number, finish this sentence: “This reader may see an older ___ for up to ___, and when that cannot be established we ___.” Public captions and permission revocations should rarely inherit the same answer.`,
version:`For a public image, give changed bytes a new address: /photos/41/v1.jpg becomes /photos/41/v2.jpg. Store the new object first, then update the note's reference to v2. A cache lookup for v2 cannot accidentally match the separate v1 cache key.

~~~text
Image bytes:    v1.jpg stays v1        v2.jpg is a new object
Note metadata: imageUrl = v1.jpg  →   imageUrl = v2.jpg
Old page:      may still point to v1 until the page refreshes
~~~

There are **two freshness questions**: which image version the page names, and whether the CDN has that exact image. Refreshing the image does not refresh every page that contains its address.

Versioned public URLs also do not revoke access. If an old URL remains publicly reachable, it remains usable. Keep private images behind a permission-aware delivery path with an explicit expiry/revocation contract. An unpredictable filename is not authorization.

**Pause and predict:** the CDN has v2, but the browser's cached note response still names v1. Which URL will it request? Follow the reference before blaming the CDN. In an interview, explain the caption update and image delivery as separate paths, each with its own cache key and limits.`},
diagram:diagram('stale-fill','A successful deletion can be followed by a stale fill','refresh','sequenceDiagram\nparticipant R as Reader A\nparticipant D as Database\nparticipant W as Writer B\nparticipant C as Cache\nR->>D: Read caption version 1\nD-->>R: Version 1\nNote over R: Pauses before filling cache\nW->>D: Save version 2\nW->>C: Delete cached version 1\nR->>C: Fill with delayed version 1','This race explains why deletion alone is not a freshness proof. A version-aware or stronger read protocol is needed if the product cannot tolerate this outcome.',['A reader obtains the older version.','A writer saves the new version and invalidates the cache.','The paused reader later fills the cache with its old result.','Check the product freshness contract and protect the fill accordingly.']),
walkthrough:walk('caption-clock','Follow the age of one public caption','old','Use a different caption and a 30-second TTL. This is a teaching model with no invalidation and a read from the current authority on refill.',[
step('Fill the copy','A visitor reads a public caption, and the cache stores that accepted value with its fill time.',{Time:'0 s',Database:'Evening walk, v3',Cache:'Evening walk, v3; expires at 30 s'}),
step('Edit only the authority','The author saves a change. The existing cache entry and its timer do not change in this policy.',{Time:'8 s',Database:'Morning walk, v4',Cache:'Evening walk, v3; 22 s remain'}),
step('Observe a permitted old read','At this moment the old entry is within its TTL. Returning it is permitted only because this public-caption feature accepts that policy.',{Time:'18 s',Returned:'Evening walk, v3',Cache:'12 s remain'}),
step('Refill after expiry','The next read at expiry goes to the current authority and fills a new entry. A lagging refill source would require more reasoning.',{Time:'30 s',Returned:'Morning walk, v4',Cache:'Morning walk, v4; new expiry 60 s'})
],'A TTL is a rule about reuse of one entry. Trace edits, fills, and the source of each fill before making a claim about freshness.'),changes:['Replaced dense TTL prose with a four-row changing-state table.','Added a stale-fill race diagram and a distinct clock walkthrough.','Separated image bytes, metadata references, and private-access limits in an annotated text flow.']});

refine({id:'serialization-and-data-formats',sections:{
bytes:`Computers transmit bytes, so text needs an encoding. **UTF-8** maps characters to byte sequences. Some characters use one byte; others use several.

| Value being counted | Visible characters | UTF-8 bytes | Why it matters |
| --- | --- | --- | --- |
| cat | 3 | 3 | These simple Latin letters use one byte each |
| café | 4 | 5 | The é in this precomposed example uses two bytes |
| JSON string "cat" | 3 content characters | 5 | The representation also contains two quotes |

These examples count the exact displayed strings, not an entire HTTP message. More complex text can involve multiple code points for what a person sees as one character. Say whether a limit counts bytes, code points, or user-perceived characters instead of treating them as interchangeable.

An HTTP Content-Type such as application/json identifies the representation type. It does not prove the body parses, meets the schema, or requests an authorized action. Read the walkthrough as distinct checkpoints: decode, parse, validate, then decide permission.`,
schema:`The text {"title":17} is valid JSON, but it violates a contract that requires title to be a string. Successfully parsing a message is only the beginning.

~~~text
bytes → decode text → parse JSON → validate fields → authorize action
        readable?    valid shape? permitted types? may THIS caller do it?
~~~

For a note update, define the meanings before writing the handler:

| Input | Example contract |
| --- | --- |
| title absent | Leave the existing title unchanged |
| title is a string | Validate length, then request that change |
| title is null | Reject unless clearing is explicitly supported |
| ownerId is a real user ID | Still check whether changing ownership is allowed |

Choose an unknown-field policy and payload limits too. Compatibility might require ignoring a new optional field, while a sensitive command may reject unexpected fields. A schema describes valid data; it does not grant the sender authority to use another user's identity. Keep both checks on the receiving side.`,
compression:`Compression spends computation to transmit fewer bytes. Lossless compression reconstructs the original bytes; lossy media compression deliberately changes information. Our JSON example uses lossless compression.

| Stage in the illustrative transfer | Uncompressed | Compressed |
| --- | --- | --- |
| Payload size | 200 KB | 50 KB |
| Transfer at an ideal 1 MB/s | 0.20 s | 0.05 s |
| Extra encode/decode work assumed | 0 | 0.02 s |
| Simplified total | 0.20 s | 0.07 s |

We use decimal units and omit other delays. This is arithmetic, not a benchmark or a promise for every payload. Already-compressed photos may shrink little; repetitive text can behave differently. Measure representative data and include computation as well as network time.

Compression is not encryption. Both compressed and expanded private data need protection. The sender and receiver must agree on the content coding. Bound expanded size as well as transferred size: a tiny compressed input can still demand a large amount of memory when opened.`},
replaceDiagram:'format-layers',diagram:diagram('format-layers','Representation and permission are separate checkpoints','schema','flowchart LR\nB[Received bytes] --> D[Decode agreed encoding]\nD --> P[Parse JSON]\nP --> V[Validate schema and limits]\nV --> A[Authorize caller and action]\nA --> R[Execute permitted operation]\nV -->|Invalid| E[Reject with bounded error]\nA -->|Forbidden| E','This is a logical teaching pipeline. Implementations may combine checks or reject earlier; successfully parsing input never grants permission.',['Interpret bytes using the agreed encoding.','Parse the representation and enforce field and size rules.','Check the caller against the requested resource and action.','Run only the permitted operation and avoid echoing sensitive rejected payloads.']),
walkthrough:walk('note-message','One note update travels as bytes','story','The example contract permits a string title and treats an absent archived field as unchanged. No actual network call is made.',[
step('Start with an intended change','The application wants to change n55 to a new title. It has a value in memory, not yet a transport message.',{Note:'n55',Title:'Queue map',Archived:'Not part of this update'}),
step('Serialize the agreed fields','The sender produces JSON text and encodes it as UTF-8. Object meaning and transmitted representation are different layers.',{JSON:'{"id":"n55","title":"Queue map"}',Encoding:'UTF-8',ContentType:'application/json'}),
step('Parse and validate at the receiver','The receiver checks the message type, allowed fields, string type, and size limits. It can now interpret the requested change.',{ParsedId:'n55',TitleType:'string',Schema:'Valid under this example contract'}),
step('Check authority before applying','The authenticated caller must have edit permission on n55. A valid ownerId or well-formed message would not establish that right.',{Caller:'u9',Permission:'Editor of n55',Result:'Title updated; archived remains unchanged'})
],'A representation tells another process what data means. Validation and authorization decide whether the requested change can proceed.'),changes:['Added byte-count and validation-contract tables with exact example values.','Replaced the compression paragraph calculation with a stage-by-stage cost table.','Refined the representation diagram and authored a message lifecycle walkthrough without copying quiz or exercise solutions.']});

refine({id:'background-jobs',sections:{
flow:`Begin with a saved jobs table; a separate messaging product is optional at this stage. Job 81 belongs to photo 41 and asks for preview version small1.

| Stored field | Initial example | Reason to retain it |
| --- | --- | --- |
| job_id | 81 | Find the same work after reconnecting |
| photo_id and source version | 41, original2 | Read the intended input |
| requested operation | small1 preview | Know which transformation is owed |
| status | pending | Tell worker and user what has happened |
| result location | empty until published | Point to the verified output |

If note creation and its job row belong to one product action in the same database, accept both in one transaction. This does not include the earlier upload to a separate object store; that upload still has its own state and cleanup rules.

A worker claims pending work with a protected state change, records running, creates the preview, then publishes succeeded and its result. Begin with one worker, but make the ownership assumption explicit. Adding workers without an atomic claim can let two choose the same row.

**The receipt is a job ID, not a finished image.** The browser asks for status and displays pending, running, succeeded, or a useful failure. Recovery may still repeat execution after a crash; next week's retry chapter explains that boundary.`,
capacity:`A waiting line buys time; it creates no processing power. Ten previews handled serially at two seconds each take about twenty seconds for the last completion. A quick receipt improves responsiveness without shortening the work itself.

For a smooth-rate teaching model, track the **difference** between arrivals and completions:

| Phase | Arrivals | Completions | Change in waiting jobs |
| --- | --- | --- | --- |
| Ten-second burst | 6/s | 4/s | +2/s, therefore +20 jobs |
| Recovery after burst | 2/s | 4/s | −2/s, therefore 10 s to drain those 20 |

Dividing by 4 would ignore new work arriving during recovery. Real tasks vary in cost, so measure oldest-job age and completion rates as well as counts.

Set an admission limit and give a truthful busy or pending response when the promise cannot be met. A worker on the same machine can still compete with note reads for CPU and memory. Moving work out of the request changes scheduling; it does not automatically isolate resources.

**Pause and predict:** if arrival and completion rates are equal, does an existing backlog shrink? It stays until spare capacity or reduced demand creates a positive drain rate.`},
diagram:diagram('job-lifecycle','A status value must correspond to recoverable work','recover','flowchart LR\nP[Pending job with durable input] --> C[Protected claim]\nC --> R[Running attempt]\nR --> S[Verified result and succeeded state]\nR --> F[Failure classified]\nF -->|Retry allowed| P\nF -->|Cannot recover automatically| E[Visible failed state]','This is the application lifecycle, not a guarantee that workers execute exactly once. Claim ownership, abandoned attempts, and safe publication need explicit rules.',['Store the input and intended transformation before issuing a receipt.','Protect the transition from pending to a current running attempt.','Publish success only after a valid result exists.','Classify a stopped or failed attempt before retrying or reporting failure.']),
walkthrough:walk('preview-receipt','A receipt arrives before a preview','waiting','Follow a new preview job J90 for photo 52. Its original object has already been uploaded and verified.',[
step('Accept the obligation','The database accepts the note and pending preview job together. The app can now give the browser a recoverable identity.',{Note:'Photo 52 exists',Job:'J90 pending',Browser:'Preview processing'}),
step('Perform the slow part','A worker claims the job and reads the recorded input. The user can leave this page without erasing the job.',{Job:'J90 running',Input:'photo52/original3',Result:'Not yet published'}),
step('Publish useful completion','The worker verifies the preview and records its location with success under the current job ownership.',{Job:'J90 succeeded',Result:'photo52/original3/small1',Browser:'Can retrieve finished preview'}),
step('Return after reconnecting','The browser asks about the existing identity instead of submitting another preview request.',{Request:'Status of J90',DurableState:'Succeeded',VisibleOutcome:'Same completed preview'})
],'Return early only after recording the promised work, and show success only after recording the promised result.'),changes:['Reworked the job-table explanation into concrete stored data and lifecycle responsibilities.','Made burst and recovery arithmetic visible in a two-phase table.','Added a recoverable-state diagram and a receipt-to-result walkthrough.']});

refine({id:'containers-and-deployment',sections:{
package:`An image is the packaged starting point for a workload: application files, a suitable runtime, dependencies, and startup metadata. Building it does not start a server.

| Thing | Example | Does it contain the new note Maya saves tomorrow? |
| --- | --- | --- |
| Source | notes-api code at revision r12 | No; it describes behavior |
| Image | Built artifact identified by a digest | No; it is the tested starting package |
| Container | Instance A started from that image | Only if the process receives or stores it |
| Durable database | Saved note n61 | Yes, after a successful commit under its contract |

Think of one prepared recipe kit producing several cooking sessions. Each session has its own work in progress. Several containers from one image likewise have separate process state.

A registry stores images for machines to fetch. A digest identifies exact artifact content; a tag such as latest can be moved to different content. Record which digest was tested and deployed, and use compatible runtime environments. Packaging reduces environment surprises; it does not prove application correctness or supply live user data.`,
release:`Deploy a small note-title display change. Keep **artifact identity**, **traffic readiness**, and **business correctness** as separate checks.

~~~text
build identified image → test → start new instance → wait for readiness
                                               ↓
                     send limited traffic → verify save and read
                                               ↓
                         expand or stop → drain retired instance
~~~

Introduce the new instance while old healthy capacity still serves users. Confirm it can load required configuration and use its dependencies. Route a suitable share of traffic, then inspect errors, latency, and representative results before replacing more instances.

An old and new version overlap during a rolling update. Both must understand the data they encounter. A green startup probe does not prove that a new title belongs to the correct user's note.

When retiring an instance, stop new work and allow bounded time for active requests to finish or be handed off. The application must cooperate with termination signals and grace periods. A worker that acknowledges an unfinished job during shutdown can lose work even if the platform successfully starts its replacement.`},
replaceDiagram:'container-layers',diagram:diagram('container-layers','Replace the process while retaining the saved record','storage','flowchart LR\nI[Image digest D12] --> A[Old container A]\nI --> B[Replacement container B]\nA -->|Commit note n61| DB[(Durable database)]\nB -->|Read note n61| DB\nA -.-> X[Private memory disappears on replacement]','Both instances start from the same artifact. Persistent data survives only according to the separately configured storage guarantees; the image does not restore private memory.',['Identify the image used to start each instance.','Commit durable user data outside the replaceable process state.','Allow the replacement to reconnect to the intended data store.','Expect private memory and unpreserved scratch state to be absent.']),
walkthrough:walk('replace-notes-instance','What actually moves to the replacement?','storage','An application replacement uses the same image digest D12 and database. This example assumes that database remains available and durable.',[
step('Start A','Instance A starts from the image and connects to the notes database.',{Image:'D12',Container:'A',Database:'n61 = saved draft'}),
step('Change two kinds of state','A user commits n62. A temporary progress counter remains only in A’s memory.',{Database:'n61 and n62 committed',MemoryInA:'progress = 4',Image:'Still D12'}),
step('Replace A with B','B starts with fresh private memory. Neither reusing the digest nor the container name transfers A’s variables.',{Container:'B',MemoryInB:'Fresh startup values',Database:'n61 and n62 still committed'}),
step('Verify the user journey','Read n62 through B, then perform a small permitted save. These checks test more than whether B has a running process.',{Read:'n62 returned',Write:'New test save succeeds',Limit:'No claim of recovery if the database also failed'})
],'The image recreates the program environment. The data design recreates access to durable user state.'),changes:['Added a source/image/container/database comparison with a concrete saved-record distinction.','Rewrote deployment as a short annotated decision flow.','Refined the persistence diagram and added a replacement walkthrough with explicit memory and database states.']});

refine({id:'queues-and-retries',sections:{
crash:`Write the evidence in order. A dispatcher and the result database are separate in this example.

| Moment | Result authority | Dispatcher knows | Risk if the worker stops now |
| --- | --- | --- | --- |
| Job received | No result | Delivery is outstanding | Work needs recovery |
| Result and success recorded | One accepted result | Delivery is still outstanding | The same job may return |
| Acknowledgement accepted | One accepted result | Delivery handled | This delivery can be retired |

The job-table model can use its own saved succeeded state as completion evidence. A separate queue needs a consumer acknowledgement as well. Neither diagram should imply a transaction across unrelated systems.

Carry the same intended operation identity on retries. Job 81 for photo 41, original version 2, is distinct from a later job for original version 3. The ID and recorded inputs must agree; reusing an ID with changed input needs a conflict response or another explicit contract.

**A silent worker may be paused, not dead.** Another attempt can overlap when the old one resumes. The destination must reject stale ownership or tolerate safe repeated effects under the actual write protocol. A timer alone cannot make old code stop.`,
policy:`Retry when another attempt could help and repeating the effect is safe under the contract.

| Observation | Useful next action | What repetition cannot prove |
| --- | --- | --- |
| Temporary storage connection failure | Retry within deadline and budget | That the first attempt did nothing |
| Unsupported input format | Fail visibly until input changes | That waiting will make the same bytes valid |
| Response lost after submission | Resolve the same operation identity | That a fresh ID is merely a retry |
| Retry allowance exhausted | Failed or needs-attention outcome | That silently dropping the job completed it |

Backoff spaces attempts. Illustrative waits of about one, two, and four seconds can include small random variation, called jitter, so workers do not return together. Choose actual delays from the deadline and service needs.

Count attempts separately from intended jobs. If 100 jobs each get two additional tries, the workers can perform 300 attempts. Repeated work can worsen the dependency failure that triggered it.

For interview practice, stop a worker after its result is accepted but before the dispatcher learns that fact. Explain the repeated identity and the exact protected effect. Then replace the database effect with external email: its receiver needs a separate contract, so the local transaction alone no longer proves a once-only outcome.`},
diagram:diagram('protected-effect','Keep duplicate detection and the effect in one acceptance boundary','effect','flowchart LR\nJ[Delivery with operation ID] --> T{Local database transaction}\nT -->|ID already committed| O[Return existing result]\nT -->|New valid ID| C[Insert effect and processed ID together]\nC --> K[Commit both]\nK --> A[Acknowledge delivery]\nO --> A','The atomic boundary covers only these local database records. An unrelated email, model call, or payment needs its own effect protocol.',['Read the intended operation identity and compatible inputs.','Use one protected transaction for duplicate detection and the local effect.','Return the existing outcome for a committed duplicate.','Acknowledge after the authoritative result is durable.']),
walkthrough:walk('repeat-result','Two attempts, one accepted activity entry','effect','Job J18 should create one local PreviewReady activity row. Its processed-ID record and activity row share a database transaction.',[
step('First delivery','No accepted effect exists yet, so the worker begins the protected local operation.',{Delivery:'J18, attempt A',ProcessedIds:'[]',ActivityRows:'[]'}),
step('Commit the effect','The transaction commits the activity and J18’s processed marker together.',{ProcessedIds:'[J18]',ActivityRows:'[PreviewReady for J18]',Acknowledgement:'Not yet received by dispatcher'}),
step('Crash and redeliver','The dispatcher still lacks completion evidence. Attempt B receives the same identity and checks the destination.',{Delivery:'J18, attempt B',ProcessedIds:'[J18]',ActivityRows:'Still one row'}),
step('Recognize the existing outcome','B returns the committed result and acknowledges. It does not insert another activity row.',{AcceptedEffects:'1',PhysicalDeliveries:'2',Dispatcher:'Completion now observed'})
],'At-least-once delivery can repeat execution. Safe local effects come from the atomic identity-and-effect boundary, not the number of deliveries.'),changes:['Replaced the crash-window paragraph with an evidence table.','Added a retry decision comparison and kept external-effect limits explicit.','Added a local transaction diagram and an evolving two-delivery walkthrough.']});

refine({id:'queue-broker-fundamentals',sections:{
patterns:`Ask what each consumer should receive before choosing a product.

| Need | Useful model | Document-upload example |
| --- | --- | --- |
| One logical job handled by a worker | Work queue | One accepted summary, though attempts may repeat |
| Several applications react independently | Publish/subscribe | Indexing and audit both receive the upload fact |
| Readers resume or reread retained history | Log | Analytics replays last week's retained events |

These models can combine. An exchange or topic can route copies into several queues. Members of one consumer group can divide a log's partitions, while another group reads the same history independently.

**Intended recipient is different from physical delivery count.** A queue intended for one worker can still redeliver after an uncertain acknowledgement. A log retained for replay can still lose needed history when retention expires.

Before drawing arrows, complete three statements: who should get this fact, who owns progress, and how long can it be read again? Product words such as topic and stream do not answer those questions by themselves.`,
operate:`Choose by required behavior, then check the selected product's exact mode and configuration.

| Candidate role | Useful starting question | Limit that still needs design |
| --- | --- | --- |
| RabbitMQ queue | Do routing and explicit consumer acknowledgements fit? | Queue type, persistence, confirms, retries |
| SQS queue | Does managed task delivery fit the environment? | Standard versus FIFO contract, visibility, deletion |
| Kafka log | Do several readers need partitioned retained history? | Key ordering, offsets, retention, sink effects |
| Redis Pub/Sub | Is a missed live hint acceptable? | Disconnected subscribers miss publications |
| Redis Streams | Do retained entries and consumer progress fit? | Persistence, retention, pending work, recovery |

This is a comparison of **roles**, not a universal ranking. RabbitMQ has streams too; Redis messaging features have different contracts. Use the preceding sections to inspect the chosen mode rather than infer behavior from a logo.

For independent AI jobs, a managed work queue may be sufficient. Several applications replaying lifecycle events may justify a retained log. Keep the model call's uncertain outcome and cost separate from broker delivery guarantees.

Observe oldest-job age, arrival/completion rates, in-flight work, retries, dead-letter reasons, and provider quotas. Test publication failure, duplicate delivery, worker loss before and after result save, slow inference, and expired credentials. A failed-job replay keeps its logical identity and an explicit operator decision; deleting stuck work is not recovery.`},
replaceDiagram:'messaging-patterns',diagram:diagram('messaging-patterns','Same upload, three different delivery intentions','patterns','flowchart TB\nD[Document uploaded] --> Q[Summary work queue]\nQ --> W[One logical summary handled by workers]\nD --> P[Publish event to interested applications]\nP --> I[Index application]\nP --> A[Audit application]\nD --> L[Retained event log]\nL --> C[Counter reader with its own offset]\nL --> R[Rebuild reader with its own offset]','These are alternative or combined logical models, not a requirement to install three brokers. Retries, retention, and publication durability remain explicit.',['Choose whether a task should have one logical effect.','Choose whether separate applications each need the event.','Choose whether retained rereading is required.','Configure progress and recovery for the selected model.']),
walkthrough:walk('independent-readers','A delayed audit consumer does not stop summary work','patterns','A document event E70 is routed to two durable application queues. Each application has its own completion boundary; this is one possible publish/subscribe implementation.',[
step('Publish one fact','A recoverable publisher sends the accepted upload event. Routing creates work for summary and audit independently.',{Event:'E70, document d8 version 2',SummaryQueue:'[E70]',AuditQueue:'[E70]'}),
step('Summary finishes','The summary worker saves its result and acknowledges only its own delivery.',{SummaryQueue:'[]',SummaryResult:'Saved for E70',AuditQueue:'[E70] waiting'}),
step('Audit resumes later','The audit worker consumes its durable backlog. The earlier summary acknowledgement did not consume this application’s copy.',{SummaryResult:'Unchanged',AuditQueue:'E70 in flight',AuditRecord:'Not committed yet'}),
step('Audit records the fact','Audit commits its protected effect and acknowledges. Both intended applications now have their own accepted outcome.',{SummaryQueue:'[]',AuditQueue:'[]',Outcomes:'Summary result and audit record'})
],'A competing work queue divides work; an independent subscription gives each application its own work and progress. The two intentions are not interchangeable.'),changes:['Rewrote messaging-pattern prose as recipient/progress/retention decisions.','Added a concrete product-role comparison without inventing universal guarantees.','Refined the branching diagram and authored independent subscriber state progression.']});
