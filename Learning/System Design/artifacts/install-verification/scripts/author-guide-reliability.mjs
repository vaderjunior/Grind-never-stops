import fs from 'node:fs';
import {guide,sec,diag,choice,open,cards,terms,source} from './guide-worker-utils.mjs';
const visual=(sectionId,...args)=>({...diag(...args),sectionId});
guide('reliability-controls',{
level:'intermediate',summary:'Turn “handle failure” into specific waiting, retry, isolation, and recovery policies that protect a user-visible promise.',
objectives:['Define an SLI, SLO, and SLA with one measured example.','Allocate a deadline across attempts and waiting.','Distinguish retry safety from retry timing and load.','Explain circuit breakers, bulkheads, and health checks through concrete failures.'],
terms:terms([['SLI','Service-level indicator: a defined measurement of service behavior important to users.'],['SLO','Service-level objective: a target for an SLI over a stated window.'],['SLA','Service-level agreement: a commitment specifying service expectations and agreed consequences or remedies.'],['Timeout','A limit on how long a particular operation is allowed to wait.'],['Deadline','The latest time at which the overall operation remains useful or permitted.'],['Retry budget','A bound on additional attempts so recovery work cannot grow without control.'],['Circuit breaker','A policy that temporarily stops calls to a failing dependency and later permits limited recovery probes.'],['Bulkhead','Isolation of resources or workload groups so one failure cannot consume every shared capacity pool.']]),
retrieval:['Why does a timeout not prove a database write failed?','How can retries increase load on a service already struggling?'],
sections:[sec('promise','Start with the user’s successful action',`
Maya opens a note. A useful reliability promise concerns whether she receives the permitted content within an acceptable time, not merely whether a server process is running. A service can have every process alive while requests wait forever for a database connection.

Define an eligible request carefully. For our teaching example, measure valid authenticated note-read requests at the application edge. A good event returns the correct permitted note response within one second. Requests rejected because the caller lacks access are outside this example’s eligible population; actual policy must define all exclusions explicitly so teams cannot hide failures by relabeling them.

An SLI is the measured fraction of good eligible events. An SLO sets a target, such as 99.9% over a rolling 30-day window. This is an illustrative product decision, not a universal recommended target. An SLA is an agreement with defined obligations and consequences; it may use a different scope or target. A dashboard target alone is not automatically an SLA.
`),sec('budget','Use the target to make a concrete decision',`
Suppose one million eligible reads occur in the window. At a 99.9% target, the allowance is 0.1%, or 1,000 bad events. If 1,100 are bad, only 998,900 are good: 99.89%. The target has been missed by 100 bad events under this simplified fixed-count example.

The allowed bad fraction is often called an error budget. It does not mean deliberately failing those requests is desirable. It creates a way to discuss reliability risk and development pace. A team might pause risky changes when failures consume the allowance rapidly, while repairing the cause. Define that policy before an incident.

A single percentage can hide important groups. If all failures affect one small customer, the overall number may look fine while their experience is terrible. Inspect relevant regions, customers, and operations alongside the aggregate. Also distinguish a measurement gap from a measured success; missing telemetry should not silently improve the SLI.
`),sec('time','One user deadline contains several waits',`
A timeout bounds a specific wait, such as one database call. A deadline bounds the whole user operation. If every layer independently waits a full second, a one-second user promise can turn into several seconds of sequential waiting.

Use an illustrative one-second request budget. Local processing and final response work need 200 milliseconds in total. That leaves 800 milliseconds for dependency attempts and any retry delay. If the first attempt consumes 300 milliseconds and backoff consumes 100, at most 400 remain for another attempt. Real overhead and elapsed time must be measured, so the next timeout is clipped to the actual remaining deadline.

Propagate the remaining budget rather than resetting it at each hop. Cancellation can release resources when the caller gives up, but cancellation is cooperative and does not prove an already-committed change was undone. A timed-out save may still have succeeded. The caller needs an operation identity or result lookup, not an assumption that time limits imply rollback.
`),sec('retry','Retry only when repetition can be safe and useful',`
A retry is another attempt at the same intended operation. It can recover from a transient communication problem. It cannot fix a permanently invalid request, and it may worsen overload. Classify the failure and check the remaining deadline before attempting again.

For reads without side effects, repetition is often straightforward under the API’s contract. For publishing a note or charging usage, a lost response leaves the outcome uncertain. Reuse the same logical operation identity and require duplicate handling where the effect is accepted. Generating a new identity for each attempt defeats that protection.

Avoid retrying independently at every layer. If three layers each permit three attempts, one user action can cause up to 27 attempts at the deepest dependency. Decide which layer owns recovery, cap attempts, and impose a shared additional-work budget. A retry counter visible only inside one helper does not reveal the service-wide amplification.
`),sec('backoff','Give recovery space without synchronizing every caller',`
Backoff increases waiting between retry attempts. An illustrative sequence could allow delays up to 100, 200, and 400 milliseconds, capped by the operation deadline and attempt limit. Jitter adds controlled randomness so thousands of clients do not all retry at exactly the same instant.

Imagine a theatre exit with several groups told to return in precisely ten seconds. They form another crowd at the same moment. Spreading return times can reduce that synchronized wave. The analogy has limits: a software retry also consumes network, connection, and application capacity, and random waiting cannot create capacity that does not exist.

Respect meaningful server guidance such as a supported retry-after response, while preserving the caller’s deadline. Track retry attempts separately from original operations. If new useful work is 100 requests per second and retries add 80, the dependency handles 180 attempts per second before considering duplicates or abandoned work. The retry policy must fit that load.
`),sec('breaker','Stop hammering a dependency that cannot serve useful work',`
A circuit breaker watches relevant outcomes for a dependency. In the closed state, calls normally pass. If the configured failure evidence crosses its threshold, it opens and rejects or redirects new calls quickly. After a controlled interval, a half-open state allows a small number of probes. Successful probes can close it; continued failures keep it open.

This resembles an electrical breaker interrupting a troubled circuit, but software thresholds are estimates about remote behavior. A few slow requests do not prove a dependency is dead. Choose measurement windows, minimum samples, and which errors count. A customer’s invalid input should not necessarily open a breaker for every other customer.

Opening protects resources and can help recovery; it also denies some attempts that might have succeeded. Define the user result: a clearly unavailable response, a delayed job, or an allowed older read. A breaker does not repair corrupted data or guarantee that every replica shares the same view of health.
`),sec('bulkheads','Keep one bad dependency from using every worker',`
Pocket Notes has an optional photo-enhancement service. If all request workers wait on that service, even plain text reads can stall. A bulkhead gives that work a limited pool or concurrency allowance so it cannot occupy every resource the core request path needs.

For example, reserve a bounded allowance for enhancement calls and reject or queue additional enhancement work under an explicit capacity policy. Keep note reads on a separately protected path. Isolation can also be per customer so one account’s batch job cannot consume every shared slot.

The cost is unused capacity in one pool while another waits, plus configuration complexity. Bulkheads protect only the resources actually separated: two pools sharing one saturated database may still fail together. Draw the shared dependencies. Pair isolation with admission control—deciding how much work to accept—and a bounded queue rather than moving the overload into unlimited memory.
`),sec('health','Ask a health check a narrow question',`
Readiness asks whether an instance should receive new work now. Liveness asks whether it is stuck badly enough that restarting this instance may help. Startup checks give slow initialization its own allowance. The exact mechanism depends on the platform, but the questions remain distinct.

If a shared database is unavailable, making every application’s liveness check fail can restart all instances without fixing the database. That may add recovery traffic and erase useful local state. Readiness can stop routing new work to an unsuitable instance, but rejecting every instance also affects availability. State the service’s degraded behavior deliberately.

A green probe is evidence about the tested path, not proof that every user action succeeds. Use user-facing measurements and dependency observations alongside probes. During shutdown, stop accepting new work and allow bounded draining of existing work before termination. A process disappearing immediately can interrupt otherwise healthy requests.
`),sec('ai','Worked example: an AI gateway with two different needs',`
An AI gateway serves two operations: listing deployments and generating an answer. Listing metadata should remain responsive even when GPU generation is saturated. Put generation behind its own concurrency limit and bounded waiting policy, while keeping registry reads separately protected.

For generation, track queue delay, time to first output, and total completion as distinct measurements. A response can start promptly yet take too long to finish. If a deadline expires, request cancellation where supported and account for any computation already performed. Retrying an expensive generation can consume additional capacity and money; after partial output, silently restarting may also duplicate text.

Use a breaker for a failing external model provider only with a defined fallback. A different model can have different privacy, behavior, and cost properties, so switching is a product policy rather than an invisible networking trick. For nonessential enrichment, a clear partial result may be useful. For authorization or spending limits, bypassing the failed check is not graceful degradation.
`),sec('test','Test a failure story and its recovery',`
Choose one experiment: delay the enhancement dependency beyond its deadline. Predict how many requests can wait, how many retries are allowed, what the user sees, and which core actions remain available. Then restore the dependency and observe probe traffic, queue drainage, and the user-facing success fraction.

Common mistakes are unbounded retries, independent full timeouts at every hop, liveness checks that restart healthy processes for someone else’s failure, and fallback that returns a misleading success. Reliability controls are useful only when their combined behavior is understandable. Your checkpoint is a timeline and a resource bound, followed by a user-visible result.
`)],
diagrams:[visual('time','deadline','All attempts share one remaining deadline',`flowchart LR
S[Request starts: 1000 ms total] --> L[Reserve 200 ms for local and response work]
L --> A[First dependency attempt: 300 ms]
A --> B[Backoff: 100 ms]
B --> R[At most 400 ms remains for dependency work]
R --> C{Useful and safe to retry?}
C -->|Yes| T[Attempt clipped to actual remaining time]
C -->|No| E[Return defined result]`,'Illustrative budget arithmetic, not measured production timeout settings. Actual elapsed time and overhead determine the remaining deadline.',['Start with the user deadline.','Reserve required local work.','Subtract attempts and waiting from one budget.','Retry only when safe, useful, and still within the remaining time.']),visual('breaker','breaker-states','A breaker limits attempts while looking for recovery',`stateDiagram-v2
[*] --> Closed
Closed --> Open: Failure threshold met
Open --> HalfOpen: Controlled probe interval
HalfOpen --> Closed: Recovery evidence sufficient
HalfOpen --> Open: Probe fails
Closed --> Closed: Normal calls
Open --> Open: New calls rejected or fallback`,'Thresholds and error classification are part of the policy. State names do not choose a safe fallback for the application.',['Measure outcomes with a defined window and sample rule.','Open when the chosen evidence says calls are harmful.','Allow a limited recovery probe.','Resume only after the configured recovery evidence.'])],
exercise:{minutes:12,prompt:'A request has a 1,000 ms deadline and reserves 200 ms for local work. A dependency attempt takes 300 ms, then backoff takes 100 ms. Calculate the maximum remaining dependency time. Next, explain whether an uncertain publish operation may be blindly retried and how to protect unrelated note reads when the dependency stalls.',rubric:['Computes 400 ms before additional overhead.','Uses stable identity/outcome handling for the uncertain effect.','Names bounded isolation and user-visible failure behavior.'],solution:'1,000−200−300−100 leaves at most 400 ms; actual elapsed overhead can reduce it. An uncertain publish may already have committed, so reuse its operation identity and supported duplicate handling or look up its result. Protect note reads with a bounded separate allowance for the stalled dependency, reasonable deadlines, and a defined unavailable or pending response rather than unlimited waiting.'},
questions:[choice('q1','An SLI is which of these?',['A defined measured indicator','Automatically a legal agreement','A command to restart every server'],'A defined measured indicator','An SLO sets its target; an SLA is an agreement with defined commitments.'),choice('q2','One million eligible events at a 99.9% target allow how many bad events in the simple count?',['100','1,000','10,000'],'1,000','0.1% of one million is 1,000.'),choice('q3','Does a timeout prove the remote write did not commit?',['Yes','No'],'No','The result may have been accepted before its response was delayed or lost.'),open('q4','Why combine retry caps, backoff, jitter, and a deadline?','They bound repeated work, create recovery space, reduce synchronized waves, and stop work after the user operation is no longer useful.','Each control addresses a different failure-amplification mechanism.'),open('q5','Why can a shared-database liveness check be harmful?','It can restart otherwise healthy app instances for an external problem that restarting them cannot repair, adding disruption and recovery traffic.','Readiness, degradation, and dependency repair need deliberate policies.')],
flashcards:cards([['SLI / SLO / SLA?','Measurement / target / agreement with specified commitments.'],['Timeout versus deadline?','One wait limit versus the end-to-end time budget.'],['Jitter purpose?','Spread retry timing so clients do not form synchronized waves.'],['Circuit breaker versus bulkhead?','Stop likely harmful calls versus isolate resource consumption.'],['Timeout plus retry safety?','An uncertain effect needs stable identity and outcome handling, not an assumption of rollback.']]),mentalModel:'Bound time, repeated work, and shared resources while preserving an honest result for the user.',
sources:[source('Google SRE: service-level objectives','https://sre.google/sre-book/service-level-objectives/'),source('AWS Builders Library: timeouts, retries, backoff, and jitter','https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/'),source('Microsoft: circuit breaker pattern','https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker'),source('Microsoft: bulkhead pattern','https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead'),source('Kubernetes: liveness, readiness, and startup probes','https://kubernetes.io/docs/concepts/workloads/pods/probes/')]
});
const savedFile='content/guides/reliability-controls.json';
const saved=JSON.parse(fs.readFileSync(savedFile,'utf8'));
saved.sources.push(source('gRPC: deadlines and propagation','https://grpc.io/docs/guides/deadlines/'),source('Google SRE: handling overload','https://sre.google/sre-book/handling-overload/'));
fs.writeFileSync(savedFile,JSON.stringify(saved,null,2)+'\n');
