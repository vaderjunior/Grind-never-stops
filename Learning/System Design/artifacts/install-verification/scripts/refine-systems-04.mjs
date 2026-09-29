import {refine,diagram,walk,step} from './refine-systems-helpers.mjs';

refine({id:'observe-and-debug',sections:{
signals:`Ask each signal a question it can answer. A restaurant analogy helps: a count of late orders is a metric, a record about order 42 is a log, and the timed journey of that order resembles a trace.

| Signal | Useful question | Notes-app example | Limit |
| --- | --- | --- | --- |
| Metric | How much, how often, and when? | Save-error fraction or latency distribution | Aggregation can hide one request's cause |
| Log | What happened to this event? | Save request r82 waited for a connection | One record does not measure population frequency |
| Trace | Where did this request spend time? | Connection wait, query, downstream call | A sampled trace does not prove all requests behave alike |

Connect them using stable operation names and controlled request/trace identities. Start with request volume, success/errors, and latency, then follow a representative affected request.

“One trace is slow” and “20% of eligible requests are slow” require different evidence. A fast error can also improve average latency while worsening the service. Compare outcomes as well as durations.`,
timeline:`Use this **invented measured request** to locate waiting. The browser observes 1,000 ms; the server span covers 850 ms.

| Part of this request | Time | Interpretation |
| --- | --- | --- |
| Wait for database connection | 600 ms | No query is executing in this interval |
| Execute database query | 120 ms | Actual query work |
| Other server work | 130 ms | Remaining non-overlapping server time in this example |
| Outside server span | 150 ms | Needs further client/transport instrumentation |
| Total browser observation | 1,000 ms | 850 ms inside + 150 ms outside |

The largest observed wait is acquiring a connection. Investigate pool use and long-held connections before assuming the SQL query itself is slow. CPU at 35% does not contradict a queue of requests waiting on another resource.

The table assumes these intervals do not overlap. Two concurrent 200 ms child spans contribute about 200 ms, not 400 ms, to the shared elapsed path. Follow timestamps and dependencies rather than summing every box in a trace tree.

**Pause and predict:** doubling query speed saves at most 60 ms in this particular breakdown. Would that explain a 600 ms pool wait? Separate a possible improvement from the mechanism causing the symptom.`},
diagram:diagram('debug-hypothesis','Treat a suspected cause as a testable prediction','hypothesis','flowchart LR\nS[Slow saves observed] --> H[Hypothesis: optional call holds DB connections]\nH --> E[Inspect traces and connection usage]\nE --> T[Bounded reversible change]\nT --> P[Predict lower pool wait]\nP --> V{Latency and correct saves improve?}\nV -->|Yes| R[Record supporting evidence and limits]\nV -->|No| N[Revise hypothesis]','An observed correlation is not proof. The controlled test must preserve correct saves; dropping work is not a latency fix.',['Define the affected operation and window.','State a mechanism that could produce the observed wait.','Choose a bounded test with a predicted change.','Compare both user outcomes and the proposed mechanism.']),
walkthrough:walk('trace-a-wait','A slow save can be mostly waiting rather than computing','timeline','These before/after values are fictional observations for learning. They illustrate how to form and test a hypothesis, not a benchmark of this academy.',[
step('Locate a slow example','Population metrics identify a slow-save period, and a sampled affected request takes 1,500 ms.',{BrowserElapsed:'1,500 ms',ServerSpan:'1,200 ms',OutsideServer:'300 ms, cause not yet assigned'}),
step('Break down server time','The server spends most of its interval waiting for a database connection.',{PoolWait:'800 ms',Query:'200 ms',OtherNonOverlappingWork:'200 ms'}),
step('Form a mechanism and prediction','Code inspection suggests an optional network call holds connections. Removing that hold should reduce pool wait if this explanation is right.',{Hypothesis:'Connection held during optional call',PredictedChange:'Pool wait decreases',RequiredCheck:'Saves remain correct'}),
step('Compare the controlled result','A representative post-change example has 100 ms pool wait. With the other illustrated intervals unchanged, elapsed time becomes 800 ms.',{PoolWait:'100 ms',ServerElapsed:'500 ms',BrowserElapsed:'800 ms',Conclusion:'Supports hypothesis within this tested case'})
],'Use a trace to identify a waiting boundary, use other evidence to explain it, and test a prediction without sacrificing the user outcome.'),changes:['Added metric/log/trace purpose and limitation comparisons.','Turned the latency breakdown into a timed table with explicit overlap assumptions.','Added a hypothesis-testing diagram and a fictional before/after state walkthrough.']});

refine({id:'kubernetes-building-blocks',sections:{
deployment:`A Deployment declares the desired version and replica count for an appropriate application workload. For the notes API, start with three Pods using one template.

| Object or participant | Responsibility | Does each user request pass through it? |
| --- | --- | --- |
| Deployment | Manages rollout and ReplicaSets | No |
| ReplicaSet | Maintains matching Pod count | No |
| Pod | Runs the application container(s) | The selected application receives the request |
| Service/network data plane | Provides stable discovery and reaches eligible backends | Traffic uses its configured networking behavior |

The word replica here means another **application Pod**, not a synchronized database copy. Three API Pods may all depend on one database. If that dependency fails, all three can become unable to serve notes.

During a release, the Deployment coordinates old and new ReplicaSets. Replacement still needs spare resources, startup, readiness, and safe shutdown. Old and new code must understand the stored data they share. A rollout object cannot make an incompatible migration safe just by starting containers gradually.`,
declarative:`Declare what should be true, then inspect what is currently true. The Kubernetes API accepts configuration; controllers repeatedly compare it with observed state and act. This comparison is **reconciliation**.

| Observation | Desired replicas | Existing/ready condition | What still needs to happen |
| --- | --- | --- | --- |
| Normal operation | 3 | Three ready Pods | Continue observing |
| One managed Pod disappears | 3 | Two remain ready | Create and start a replacement if possible |
| Replacement exists but cannot fit | 3 | New Pod Pending | Find suitable node capacity or correct its requirements |
| Replacement starts but is unready | 3 | Three exist, two ready | Satisfy startup/readiness conditions |

Stopping a Pod manually does not change the declared count. To intentionally run two replicas, change the desired configuration rather than repeatedly fighting the controller.

~~~text
intent recorded → controller creates missing object → scheduler places Pod
               → node starts containers → readiness makes it useful for traffic
~~~

Every arrow can wait or fail. Inspect status and events at the boundary that is stuck. “Desired = 3” is an instruction; “ready = 3” is an observation. Neither alone proves every business request is correct.`},
replaceDiagram:'control',diagram:diagram('control','Management maintains Pods; it does not execute note requests','declarative','flowchart TB\nU[Operator declares three replicas] -.-> API[Kubernetes API and desired state]\nAPI -.-> D[Deployment manages ReplicaSet]\nD -.-> R[ReplicaSet maintains matching Pods]\nR -.-> P[New Pod object]\nP -.-> S[Scheduler selects suitable node]\nS -.-> N[Node runtime starts containers]\nN -.-> O[Observed startup and readiness]','All dotted arrows here describe management, not the HTTP request path. Capacity, image availability, and application readiness can prevent desired state from becoming useful capacity.',['Record the intended application version and count.','Let the ownership chain create missing Pods.','Place and start those Pods on suitable nodes.','Observe readiness separately from object creation.']),
walkthrough:walk('desired-observed','Three desired Pods can temporarily mean only two ready','declarative','The notes Deployment asks for three replicas. The database remains healthy; this walkthrough follows only one Pod replacement.',[
step('The desired and observed counts agree','Pods A, B, and C are ready and can be selected for ordinary traffic.',{Desired:'3',Existing:'A, B, C',Ready:'3'}),
step('One Pod disappears','C is gone. The desired count remains three, so the controller sees a difference.',{Desired:'3',Existing:'A, B',Ready:'2',ManagementAction:'Create replacement D'}),
step('A replacement object is not capacity yet','D exists but is Pending while scheduling requirements are unresolved. A and B still carry available traffic.',{Desired:'3',Existing:'A, B, D',Ready:'2',DState:'Pending'}),
step('Placement and readiness finish','D is scheduled, starts, and meets readiness. Endpoint changes propagate before ordinary new traffic uses it.',{Desired:'3',Ready:'3 after propagation',DState:'Ready',Limit:'No claim of zero interrupted requests'})
],'Reconciliation closes a desired-versus-observed gap over time. The application and data design still own correct requests and durable state.'),changes:['Separated workload-object responsibilities from the traffic path in a comparison table.','Made desired/existing/ready counts explicit rather than equating replicas with capacity.','Refined the control-plane diagram and authored a pending replacement walkthrough.']});

refine({id:'ship-and-recover',sections:{
compatibility:`Pocket Notes changes from an active flag to a status field. For this teaching migration, active=true means status=active and active=false means status=archived. Define that mapping before copying data.

| Stage | Readers | Writers and stored data | Recovery concern |
| --- | --- | --- | --- |
| Expand | Old readers still use active | Add nullable status; old rows remain valid | Old code must keep working |
| Migrate | New code handles missing status | Backfill repeatably; keep representations aligned atomically | Interrupted batches can resume |
| Switch | New readers use validated status | Continue compatible writes during rollback window | Old readers still understand new writes |
| Contract | Old readers are retired | Remove active only after the window closes | Old binary is no longer a sufficient rollback |

Use bounded batches and record progress. Count rows, compare meaningful samples, and verify the actual mapping rather than assuming a completed script copied the right business meaning.

Temporary duplicate representations add complexity. State which value is authoritative during each stage and keep related writes in one transaction where possible. Two unrelated stores written independently would introduce another consistency gap.

**Pause and predict:** can you roll back a reader after removing the only field it understands? Artifact retention and data compatibility are different parts of recovery.`,
restore:`A backup is useful only if you can recover the service from it. Our teaching policy creates hourly backups and keeps an independently controlled copy. Those assumptions do not constitute a complete production policy.

| Drill check | Evidence to collect |
| --- | --- |
| Obtain the selected copy | Correct recovery point, integrity check, required access |
| Restore into an isolated location | Live data remains preserved while investigation continues |
| Start compatible application | Required binary, configuration, keys, and credentials available |
| Validate meaning | Known notes, counts, relationships, access behavior |
| Continue work | Create and read a new test note successfully |

Measure the whole sequence: discovery, decision, access, restoration, validation, and reopening. A fast file copy can be followed by a long wait for a missing encryption key.

A checksum detects certain byte changes; it does not prove correct relationships or usable application behavior. Replication can preserve availability through some hardware failures, while retained independent history helps after a bad deletion has propagated.

Keep the restored environment separate until checked. Record which failures the drill did and did not simulate. A successful local restore is bounded evidence, not proof of a region-loss recovery target.`},
diagram:diagram('restore-isolated','Validate a restored copy before replacing the serving state','restore','flowchart LR\nB[Selected retained backup] --> I[Restore into isolated environment]\nI --> A[Start compatible application]\nA --> V[Check known records and permissions]\nV --> W[Create and read a new test record]\nW --> D{Recovery criteria met?}\nD -->|Yes| P[Plan controlled traffic and write handoff]\nD -->|No| F[Preserve evidence and investigate]','This is a safe rehearsal outline. A real handoff must account for writes accepted during the incident; restoring a file alone does not make that decision.',['Choose a recovery point and preserve the current state.','Restore separately with the required software and keys.','Test data meaning and continued application work.','Plan the serving handoff only after validation.']),
walkthrough:walk('expand-before-contract','Old and new readers overlap safely','compatibility','The illustrative mapping is active=false → archived. One database transaction keeps the two representations aligned during the compatibility window.',[
step('Expand without changing old meaning','Add the new nullable column. Old code still reads the original flag.',{Record:'n12',Active:'false',Status:'null',Reader:'Old code sees archived through active=false'}),
step('Backfill the agreed mapping','A repeatable migration fills status from the chosen authoritative old representation.',{Active:'false',Status:'archived',Validation:'Mapping agrees for n12'}),
step('Run both compatible versions','New code reads status. Compatible writes retain active so old readers and rollback still work.',{OldReader:'Uses active',NewReader:'Uses status',WriteRule:'Update both atomically under defined mapping'}),
step('Contract only after retirement','Once old readers and the rollback window are gone, the old field can be removed deliberately.',{RemainingField:'status',OldBinary:'No longer a sufficient rollback',RequiredEvidence:'No remaining old readers and verified data'})
],'An application rollback works only while old code can interpret the current stored state. Expand-and-contract makes that window explicit.'),changes:['Replaced migration narration with reader/writer stages and a concrete value mapping.','Added a restore-evidence checklist table.','Added isolated-restore diagram and a mixed-version data walkthrough.']});

refine({id:'kubernetes-networking',sections:{
service:`A Service gives clients a logical destination while Pods change. For a normal ClusterIP Service, the virtual address and Service port are the client-facing entry; targetPort identifies the selected backend port.

| Configuration or state | Example | Question it answers |
| --- | --- | --- |
| Service name | notes-api | Which logical application? |
| Selector | app=notes | Which Pods match? |
| Service port | 80 | Which port does the client contact? |
| targetPort | 8080 | Where does the backend listen? |
| EndpointSlice conditions | Selected addresses and readiness | Which endpoints are currently represented and eligible? |

The **data plane** is the running machinery carrying application traffic. The **control plane** manages configuration and desired state. The data plane implements forwarding using endpoint information; a Service object is not normally a separate HTTP application process.

~~~text
client → Service address:80 → eligible Pod address:8080 → notes process
          logical stable entry       changing backend
~~~

Labels are literal configuration. app=notes does not match app=note. A correct label with a wrong target port also fails. Inspect matches, endpoint state, and the actual listener before adding more replicas.`,
policy:`A namespace organizes objects; it is not automatically a complete network or tenant boundary. NetworkPolicy needs a networking implementation that enforces the standard's supported traffic rules.

| Policy question | Standard model to remember |
| --- | --- |
| No policy selects a Pod for a direction | That direction starts unrestricted by NetworkPolicy |
| Applicable policies select that direction | Their allowed traffic sets combine additively |
| Two policies appear to disagree | There is no last-rule-wins deny override in this model |
| One Pod calls another | Source egress and destination ingress must both permit the connection when isolated |

Egress means outgoing traffic; ingress means incoming. Other cluster controls can impose additional restrictions. A policy declaration in an unsupported network implementation is not evidence that traffic is blocked.

For a notes backend, permit the intended entry or internal callers and remember required outbound dependencies such as DNS and the database. Test both an allowed and disallowed source. Current connections and particular networking paths have implementation details, so validate the actual environment.

Reachability is still not user permission. A permitted proxy carries many users. The application must verify trustworthy identity and authorize the particular note. Keep encryption, Pod network rules, cluster API permissions, and per-user access as distinct controls.`},
replaceDiagram:'kubernetes-internal',diagram:diagram('kubernetes-internal','Compare the Service port with the actual backend listener','service','flowchart LR\nC[Client resolves notes-api] --> V[Service virtual address port 80]\nV --> A[Ready Pod A target port 8080]\nV --> B[Ready Pod B target port 8080]\nS[Selector app equals notes] -.-> E[EndpointSlice addresses and conditions]\nE -.->|Configure forwarding| V\nA --> P[Application listens on 8080]\nB --> P','This is the logical ClusterIP case. Forwarding implementations differ, and endpoint information propagates over time; a Service is not necessarily a user-space HTTP proxy.',['Resolve the stable Service destination.','Use the Service port from the client.','Select an eligible endpoint using the configured data plane.','Reach the port where that Pod’s application actually listens.']),
walkthrough:walk('service-listener-mismatch','A successful DNS lookup can still lead to the wrong port','debug','A reports Service uses port 8080, selector app=reports, and targetPort 7000. Ready Pods match the selector but actually listen on 7001. This is a separate teaching example.',[
step('Resolve the name','Cluster DNS returns the Service address. Only the name-lookup stage has succeeded.',{Name:'reports Service',ServicePort:'8080',DNS:'Resolved',Conclusion:'No proof of a working backend yet'}),
step('Inspect selected endpoints','The selector matches ready report Pods. The target configuration still sends traffic to 7000.',{Selector:'app=reports matches',ReadyPods:'A and B',TargetPort:'7000'}),
step('Compare with the process listener','The program is listening on 7001. Adding replicas with the same mismatch would not repair the path.',{ApplicationListener:'7001',ConfiguredTarget:'7000',Mismatch:'Forwarding reaches the wrong port'}),
step('Correct and verify the smallest boundary','Align targetPort with the intended listener, wait for configuration propagation, and test a permitted request through the Service.',{TargetPort:'7001',ReadyEndpoints:'Verified after update',Result:'Application request succeeds in this example'})
],'Check name, Service reference, selector, readiness, target port, network policy, and application response separately. More replicas do not fix the wrong destination.'),changes:['Added a Service-field map and annotated client/backend port flow.','Turned NetworkPolicy semantics into a precise comparison table while preserving additive/default behavior.','Refined the internal routing diagram and authored a distinct listener-mismatch walkthrough.']});

refine({id:'regions-and-disaster-recovery',sections:{
timeline:`Put the target and the observed recovery on a clock. In this example, the outage starts at 14:00, the latest usable recovery point is 13:57, and useful service returns at 14:24.

| Measurement | Observation | What it tells us |
| --- | --- | --- |
| Recovery point gap | 14:00 − 13:57 = 3 minutes | Up to this recent interval may be absent, depending on retained writes |
| Service interruption | 14:24 − 14:00 = 24 minutes | End-to-end recovery under our start/finish definitions |
| Agreed targets | RPO 5 minutes, RTO 30 minutes | Both met in this one illustrated drill |

Now account for the 24 minutes: detection 4, decision 3, access to resources 2, data recovery 8, validation 5, traffic movement 2. Fast database promotion alone is only part of that journey.

DNS caches, client reconnects, missing keys, and verification can dominate recovery. A configured replication interval is not proof of the actual worst gap while the system is busy or broken. Measure usable recovery state and rehearse the whole path.

Targets are intentions until tested. Describe a target as demonstrated only for the scenario and workload that produced the evidence.`,
options:`Buy preparation according to the tolerated interruption and data gap. These labels name families of designs; inspect what is actually ready.

| Approach | Prepared before failure | Work still likely during recovery |
| --- | --- | --- |
| Backups and rebuild | Retained copies and recovery instructions | Restore data and reconstruct service capacity |
| Pilot light | Essential data and a small running core | Start or expand the rest of the service |
| Warm standby | Reduced working environment | Increase capacity and establish serving authority |
| Full service in multiple regions | More serving capacity already running | Resolve state/ownership and shared dependency failures |

More continuous preparation can remove recovery steps, but it costs money and operational work. Multi-region writes also require explicit consistency, conflict, or ownership rules.

Two application regions sharing one unavailable database region are not independent write services. A modest notes app may meet its stated target with backups and rehearsed restoration; another product may require more prepared capacity.

**Interview phrasing:** “First I will define RTO and RPO for the user journey, then compare the preparation needed to demonstrate them. A region count alone is not the guarantee.”`},
diagram:diagram('recovery-journey','Data promotion is only one stage of recovery time','timeline','flowchart LR\nF[Failure begins] --> D[Detect and decide]\nD --> A[Obtain keys credentials and capacity]\nA --> R[Recover data and valid write authority]\nR --> V[Validate application behavior]\nV --> T[Move traffic and reconnect clients]\nT --> S[Useful service restored]','The elapsed interval spans the whole chain under a declared start and finish definition. Parallel work may overlap; do not double-count it when measuring a real drill.',['Start from the user-visible disruption definition.','Include access and capacity prerequisites.','Recover both suitable data and enforceable authority.','Validate the complete journey and move clients before declaring restoration.']),
walkthrough:walk('regional-drill','Measure the gap and the full restoration, not only promotion','timeline','A separate fictional drill targets RPO 2 minutes and RTO 20 minutes. The latest verified usable recovery state is 09:59; failure begins at 10:00.',[
step('Define the evidence at failure','The team records the disruption boundary and the latest usable recovery point rather than inferring it from a scheduled copy interval.',{FailureStart:'10:00',UsableRecoveryPoint:'09:59',PotentialGap:'Up to 1 minute under this model'}),
step('Recover under valid authority','Access, capacity, data checks, and the system’s ownership protocol are completed. A new writer is not declared safe solely because a button was pressed.',{Time:'10:11',WriteAuthority:'Established by the selected protocol',UserService:'Not yet declared restored'}),
step('Complete the user journey','Application checks pass and clients reconnect through the new serving path at 10:16.',{Time:'10:16',MeasuredInterruption:'16 minutes',UserCheck:'Read and permitted write succeed'}),
step('Compare and preserve the limits','Both targets were met in this scenario. Failback still needs to preserve writes accepted by the new authority.',{RTOComparison:'16 ≤ 20 minutes',RPOComparison:'1 ≤ 2 minutes',Scope:'This drill only; not every disaster'})
],'Recovery time measures useful service, and recovery point measures usable data. Both require evidence and definitions beyond the topology.'),changes:['Added RTO/RPO clock arithmetic and a full recovery-stage breakdown.','Compared preparation options by what is ready and what remains to do.','Added an end-to-end recovery diagram and a distinct timed drill walkthrough.']});

refine({id:'kubernetes-operations',sections:{
resources:`Requests help Kubernetes account for placement; limits bound consumption according to the resource type. Neither guarantees a particular application latency.

| Example setting | Plain meaning | Important limit |
| --- | --- | --- |
| CPU request 500m | Account for half a CPU unit | Not a promise of a particular requests/s rate |
| Memory request 256Mi | Account for 256 mebibytes | Not a hard maximum of actual use |
| CPU limit | Restrict allowed CPU consumption | Work can be throttled despite spare CPU elsewhere |
| Memory limit | Bound memory under runtime enforcement | Exceeding the effective allowance can lead to termination |

In a manifest, 256Mi is one quantity string. A mebibyte is 1,048,576 bytes, so this request represents 268,435,456 bytes. Actual working memory depends on the program, concurrency, libraries, and input.

Suppose note reads are cheap but export compression needs CPU. A very low CPU limit can make exports slow. A low memory allowance can restart the process on ordinary large inputs; starting it again does not restore private memory.

Measure representative startup and peak behavior, leave appropriate headroom, and inspect termination/throttling evidence. Increasing every resource field blindly may hide the bottleneck or make Pods unschedulable.`,
probes:`A probe is useful only when its failure causes the right action.

| Check | Question | Intended consequence of failure |
| --- | --- | --- |
| Startup | Has initialization completed? | Repeated failure at the threshold kills the container subject to restart policy |
| Readiness | Is it suitable for intended new traffic? | Remove ordinary ready-endpoint eligibility; does not itself request restart |
| Liveness | Is it stuck in a way restart should repair? | Threshold failure can trigger container restart |

While a configured startup probe has not succeeded, it gates liveness and readiness checks. That allowance is finite, not permission to remain stuck forever.

Use a process deadlock as a possible liveness case. A brief shared-database outage is different: restarting every dependent application can add load without fixing the database. Choose bounded degradation/readiness behavior for the actual service contract.

Keep checks inexpensive and specific. Endpoint changes propagate, so readiness is not an instant recall of in-flight traffic. A healthy probe also does not prove the correct note reaches the correct user. Test a representative user journey alongside health state.`,
scaling:`HPA means Horizontal Pod Autoscaler. It uses configured metrics and policy to adjust desired replicas; the controller does not instantly create ready application capacity.

| Simplified CPU example | Value |
| --- | --- |
| Current eligible Pods | 3 |
| Average use relative to CPU requests | 80% |
| Target | 60% |
| Proportional suggestion | 3 × 80 / 60 = 4 Pods |

Real HPA behavior also includes bounds, tolerance, missing metrics, readiness, and stabilization rules. The arithmetic is an illustration, not an exact forecast of the next control decision.

~~~text
metric observed → desired count changed → Pod scheduled → image starts → ready
                    this number alone is not added serving capacity
~~~

If suitable node capacity is absent, desired replicas can rise while useful capacity stays flat. Node scaling is related but separate. CPU can also be a poor signal for workers waiting on a slow dependency while job age grows.

Choose metrics that reflect the bottleneck and install the required metrics infrastructure. Keep admission bounded and check shared dependencies: more workers can overload one database instead of helping users.`},
replaceDiagram:'hpa-loop',diagram:diagram('hpa-loop','A desired replica can be blocked before it serves traffic','scaling','flowchart LR\nM[Observe configured metric] --> H[HPA chooses desired count within policy]\nH --> S{Suitable node capacity?}\nS -->|No| P[Pod remains Pending and capacity unchanged]\nS -->|Yes| I[Fetch image and start workload]\nI --> R{Readiness passes?}\nR -->|No| W[Not ordinary ready traffic capacity]\nR -->|Yes| C[Observe useful serving capacity]\nC --> M','This shows stages and possible delays, not exact controller internals. Scaling is useful only when workload and downstream limits allow the extra Pods to help.',['Measure the intended workload signal.','Adjust desired replicas under the configured policy.','Check scheduling and readiness before counting capacity.','Verify user outcomes and shared dependencies after scale-out.']),
walkthrough:walk('pod-health-lifecycle','Running, ready, and restart-worthy are different observations','probes','A notes Pod loads configuration at startup. Its readiness check depends on a required service; its liveness check tests a local condition a restart can repair.',[
step('Initialize within the startup allowance','The container is running but still loading configuration. Startup has not succeeded, so normal readiness/liveness checks remain gated.',{Process:'Running',Startup:'Not yet successful',TrafficEligibility:'Not ready'}),
step('Become ready','Initialization succeeds. The app passes readiness and can join ordinary traffic as endpoint state propagates.',{Startup:'Succeeded',Readiness:'Pass',Liveness:'Pass',TrafficEligibility:'Eligible after propagation'}),
step('Lose a required dependency briefly','Readiness fails under this chosen contract. The local process remains healthy, so the liveness check does not demand restart.',{Readiness:'Fail',Liveness:'Pass',Action:'Remove ordinary new-traffic eligibility',InFlightWork:'Still needs bounded handling'}),
step('Recover and verify','The dependency recovers, readiness passes, and the normal path is verified before treating the incident as resolved.',{Readiness:'Pass',RestartCount:'Unchanged in this scenario',Evidence:'Permitted save and read work again'})
],'Health checks decide specific actions. Keep restart, traffic eligibility, desired replica count, and correct user behavior as separate observations.'),changes:['Added concrete resource quantities and their enforcement limitations.','Converted startup/readiness/liveness into an action comparison while preserving startup failure semantics.','Made HPA arithmetic/stages visible, refined its diagram, and authored a changing health-state walkthrough.']});
