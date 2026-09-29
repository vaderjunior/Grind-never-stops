import fs from 'node:fs';
import path from 'node:path';
import {save,sec,diag,choice,num,open,cards,refs,content} from './author-module01.mjs';

save('006',{
objectives:['Derive retained logical data from writes, record size, and retention.','Separate logical size from replicas, indexes, backups, and free space.','Convert bytes/s to bits/s correctly.','Identify what dominates a storage or bandwidth estimate.'],retrieval:['From L004: why does registered-user count not determine traffic?','From L003: distinguish durability from availability.'],
sections:[sec('scope','A request rate does not tell you how much data exists',`
Core budget: retrieval 5, explanation 18, worked calculation 8, exercise 10, questions 10, review 4 minutes. Consider a field-observation app where students attach a photo to a short record. Use decimal units throughout: 1 kB = 1,000 bytes, 1 MB = 1,000,000 bytes, and 1 GB = 1,000,000,000 bytes. Binary KiB/MiB/GiB are legitimate but different; always state the convention.

Assume 200,000 new observations daily. Each contains 1,500 bytes of metadata and one compressed 2 MB photo. Retain both for 90 days. Logical metadata growth is 300 MB/day; photos grow by 400 GB/day. Before adding any infrastructure multiplier, the photo path is already more than a thousand times larger. Optimizing metadata size by 20% barely changes the overall storage decision.

The basic retained-data model is writes/day × bytes/write × retained days, assuming steady arrivals, fixed record sizes, and timely deletion. Updates complicate it: overwriting a record may not grow live logical data, while version history and logs do. Deletion removes live records according to policy but may not immediately reclaim physical space or remove copies from backups. The model must say which population it counts.
`),sec('layers','Build a ledger of copies and overheads',`
Metadata live size is 200,000 × 1,500 × 90 = 27 GB. Photo live size is 200,000 × 2,000,000 × 90 = 36 TB. Suppose the teaching design keeps three full metadata copies, one additional index allocation equal to 40% of base metadata on each copy, and 30% free-space reserve expressed as usable data occupying 70% of provisioned disk. Metadata provisioned capacity is 27 × 1.4 × 3 / 0.7 = 162 GB.

Notice the reserve convention. “Add 30%” produces 147.42 GB, where the reserve is 30% of used bytes but only about 23% of provisioned capacity. “Leave 30% of the disk free” means divide by 0.7. Both can be legitimate planning conventions; using the same phrase for both causes mistakes.

Do not apply the metadata replication factor blindly to photos. Their chosen storage system may use replication or erasure coding with a different physical multiplier. For this exercise use two full photo copies: 72 TB before free space and backups. This is an arithmetic assumption, not a recommendation for a durability target. Copy count alone says nothing about independent failure domains or accidental deletion.

Keep backups in another ledger. A daily full backup retained for seven days is very different from incremental changed blocks with periodic full snapshots. State the mechanism before multiplying. Temporary migration copies, compaction space, and restore workspaces can dominate a nearly full system; these belong in peak physical capacity, not just steady live data.
`),sec('bandwidth','Follow the bytes in each direction',`
Suppose observations arrive at a peak of 40 writes/s. Metadata ingress is 60,000 bytes/s. Photo ingress is 80 MB/s, which is 640 megabits/s before protocol overhead: multiply bytes by eight. A nominal 1 gigabit/s link does not promise that an application will sustain the full nominal rate; framing, encryption, competing traffic, and actual network paths need measurement.

Now consider reads. If 100 users/s each view a page with 12 thumbnails of 40 kB each, thumbnail egress is 48 MB/s or 384 megabits/s. If the page accidentally downloads twelve full 2 MB photos instead, egress becomes 2.4 GB/s or 19.2 gigabits/s. Representation size changed demand by fifty times without changing user count or page RPS.

Replication traffic is a different flow. Each new 2 MB photo copied once creates another 2 MB internal transfer. Restoring 10 TB over an effective 100 MB/s path takes 100,000 seconds, roughly 27.8 hours, before validation and operational overhead. Thus a bandwidth estimate can invalidate a recovery promise even when normal requests fit.

An arithmetic-only Python example:

~~~python
def bits_per_second(rps: float, payload_bytes: int) -> float:
    return rps * payload_bytes * 8

assert bits_per_second(40, 2_000_000) == 640_000_000
restore_hours = 10_000_000_000_000 / 100_000_000 / 3600
assert round(restore_hours, 1) == 27.8
print("photo ingress: 640 Mbit/s; minimum restore: 27.8 h")
~~~

Run with Python 3.11+ using only the standard library. These are dimensional calculations, not a network benchmark.
`),sec('failure','Question the largest and least certain terms',`
Large payloads often have skewed size distributions. A mean is useful for total stored volume, but a maximum or high percentile may matter for a single-request memory limit. Compression depends on actual data; a tenfold assumed compression ratio is not free capacity until tested on representative samples. Encrypted or already compressed content may compress poorly.

A retention backlog changes live storage. If cleanup stops for five days, this workload adds another 2 TB of photos before copies. A logging mistake that stores entire payloads can create an unexpected second data lake. A backup job can saturate the same link used for foreground requests even though the average daily traffic appears modest.

Common misconceptions: all data gets the same replication multiplier; replicas replace backups; storage cost is only live rows; bits and bytes are interchangeable; user uploads equal total network traffic. Trace every major copy and transfer explicitly. End with the dominant quantity and the question that most reduces uncertainty.

Optional practice outside the core: measure the encoded sizes of ten real sample records, without uploading private data. Compare average, maximum, and a justified planning value.
`)],diagrams:[diag('copies','Where does one observation become several allocations?',`flowchart LR
U[Student] -->|2 MB photo plus 1500 B metadata| A[Upload boundary]
A -->|Metadata only| M[(Authoritative metadata)]
A -->|Photo bytes| P[(Photo content store)]
M -.->|Replicated copy| MR[(Metadata replica)]
P -.->|Content copy| PR[(Photo copy)]
M -.->|Scheduled backup traffic| B[(Separate backup)]`, 'Solid arrows are upload flows; dotted arrows create additional copies. The simplified picture does not imply a production durability guarantee or exact physical layout.', ['Count one logical record first.','Split small metadata from large content.','Allocate replicas and indexes per storage path.','Count backup and recovery traffic separately.'])],exercise:{prompt:'A sensor service stores 5 million readings/day at 200 bytes each for 30 days. Indexes add 50% to base data. Keep two full copies and leave 25% of allocated disk free. Compute live base data, provisioned storage excluding backups, and peak ingress at 20,000 readings/s. Use decimal units.',minutes:10,rubric:['Computes base retention before multipliers.','Applies indexes to each stored copy.','Divides by 0.75 for the stated free fraction.','Converts bytes to bits without mixing units.'],solution:'Base data = 5,000,000 × 200 × 30 = 30 GB. Including indexes: 45 GB; two copies: 90 GB; disk allocation 90/0.75 = 120 GB. Peak ingress = 20,000 × 200 = 4 MB/s = 32 Mbit/s, excluding headers and replication. Backup capacity and historical logs remain separate unspecified terms.'},questions:[num('q1','2 million 500-byte records each day for 10 days: logical storage in decimal GB?',10,'GB',0.01,'2,000,000 × 500 × 10 / 1,000,000,000 = 10.'),num('q2','Convert 12 MB/s to megabits/s using decimal units.',96,'Mbit/s',0.01,'Each byte contains eight bits.'),choice('q3','If 90 GB used must occupy at most 75% of disk, what allocation is needed?',['112.5 GB','120 GB','90 GB'],'120 GB','90 / 0.75 = 120; simply adding 25% uses a different reserve definition.'),open('q4','Why are replicas and backups separate budget items?','They have different mechanisms, retention, and failure purposes; replicated deletion can propagate to all replicas while a retained backup may preserve earlier state.','Neither copy count nor backup existence proves recovery without testing.'),open('q5','Which should you investigate first: a 20% uncertainty in 27 GB metadata or a 2× uncertainty in 36 TB photos?','The photo size because its absolute impact dominates; also check whether the uncertain term changes the architecture.','Sensitivity should prioritize consequential uncertainty.')],flashcards:cards([['Retained logical bytes?','Write rate × bytes per new item × retention duration with consistent units.'],['MB versus MiB?','Decimal million bytes versus 2^20 bytes.'],['Bits per byte?','Eight.'],['Provisioning with free fraction f?','Used bytes / (1 − f).'],['Why count restoration bandwidth?','A recovery deadline may be impossible over the available effective transfer rate.'],['What is a storage ledger?','Separate live content, indexes, replicas, backups, logs, temporary copies, and reserve.']]),mentalModel:'Count logical information once, then account for every copy, representation, retention rule, and byte transfer.',sources:[refs.slo]});

save('007',{
objectives:['Use Little’s law with a consistent boundary and averages.','Distinguish arrival rate, concurrency, and worker count.','Explain why a queue grows when arrivals exceed completion capacity.','Estimate backlog drain time and challenge stability assumptions.'],retrieval:['From L004: what is the difference between offered demand and completed throughput?','From L003: why is p99 not an average?'],
sections:[sec('intuition','Requests occupy the system while time passes',`
Core budget: retrieval 5, mechanism 18, worked model 8, exercise 10, questions 10, review 4 minutes. Picture a service as a room with an entrance and an exit. Arrival rate counts how quickly work enters; concurrency counts how much unfinished work is inside; latency measures how long each item remains. Worker count tells you how many processing slots exist, which is related but not identical to unfinished work.

For a stable long-run system, Little’s law is L = λW: average items in the chosen system equals average effective throughput times average time spent there. If 200 requests/s complete and mean end-to-end time is 0.15 s, average in-flight requests are 30. The units cancel: requests/s × s = requests. The result says nothing by itself about CPU utilization or the number of operating-system threads.

Choose the boundary before using the equation. If time includes waiting and execution, L includes queued and executing requests. If time covers only a database call, L counts database calls inside that boundary. Mixing total application latency with database-only throughput produces a number with no coherent interpretation.

Use compatible averages over a representative stable period. Plugging p99 latency into Little’s law does not yield p99 concurrency. Correlations and distributions matter for tails. A continuously growing queue is not in the steady state assumed by the simple long-run calculation; it needs a transient backlog model.
`),sec('queue','The queue records work you have not finished',`
Use a deliberately simple fluid model: in each one-second interval, 120 jobs arrive and workers can finish 100. Starting empty, backlog grows by 20 jobs/s: after ten seconds, 200 jobs wait. The model smooths event timing and job sizes; it is an illustration, not a prediction of real percentile latency.

When arrivals fall to 80/s, spare completion capacity is 20/s, so those 200 extra jobs take ten seconds to drain. Dividing by total capacity would give two seconds and ignore the ongoing new arrivals. If arrivals stay at 100/s, there is no spare rate to clear the backlog. If each job times out before reaching a worker, the system must discard or cancel it deliberately; otherwise workers may spend capacity on results nobody needs.

A queue does not add service capacity. It can absorb a finite burst by exchanging memory or durable storage and waiting time for smoother work. For an interactive operation with a short deadline, that exchange may be unacceptable. A finite queue plus explicit admission policy can provide a predictable failure instead of allowing memory to grow until the process dies. The detailed policies arrive in M10.

Even average demand below capacity does not eliminate waiting. Real arrivals bunch together and job durations vary. A worker may be busy with a slow item when several short ones arrive. As spare capacity shrinks, there are fewer opportunities to catch up after variation. The exact delay distribution requires a more specific model or measurement; no universal “safe CPU percentage” follows from this lesson.
`),sec('worked','Concurrency is a resource budget',`
Suppose a report endpoint accepts 50 requests/s and each request spends an average 2 seconds waiting for a remote source plus 0.1 seconds computing. Average end-to-end concurrency is approximately 50 × 2.1 = 105 requests, provided the system is stable and the measurements cover the same population. If each in-flight request retains a 4 MB buffer, those buffers alone average roughly 420 MB.

The endpoint is not necessarily using 105 CPU cores. Waiting may consume a socket and memory while little CPU executes. Conversely, CPU-heavy work needs actual execution capacity. Distinguish the resource occupied during each phase before choosing a concurrency model. M03 connects this to threads and event loops.

A small deterministic Python simulation of the earlier queue:

~~~python
def step(backlog: int, arrivals: int, capacity: int) -> int:
    return max(0, backlog + arrivals - capacity)

backlog = 0
for _ in range(10):
    backlog = step(backlog, 120, 100)
assert backlog == 200
for _ in range(10):
    backlog = step(backlog, 80, 100)
assert backlog == 0
print("peak backlog=200; drained after 10 seconds")
~~~

This executable Python 3.11+ standard-library model treats arrivals and completion capacity as aggregate one-second quantities. It does not simulate individual service times, ordering, retries, or a real scheduler. Its test establishes the arithmetic behavior of the model only.
`),sec('failures','Slow dependencies become local pressure',`
At unchanged arrival rate, a slower downstream service makes requests remain in your process longer. A jump from 100 ms to 2 s at 100 requests/s changes average in-flight work from 10 to 200. Memory, connections, and file descriptors can fill before CPU looks busy. Retrying adds arrivals, potentially making the original slowdown worse.

A concurrency limit creates another boundary. If you allow only 50 downstream calls at once and each holds its slot for 2 s, a rough saturated completion bound is 25 calls/s under those assumptions. Accepting 100/s without another policy accumulates waiting work. Raising the limit might improve throughput if the dependency has spare capacity, or overload it further if it is already saturated. Measurement and dependency limits decide.

Common misconceptions: throughput equals concurrent users; average latency can be replaced with p99 in the equation; a queue solves overload forever; a larger thread pool creates CPU; low average utilization proves no burst risk. Keep the boundaries and assumptions visible.

Optional depth: instrument a workload to estimate average in-flight work from area under a concurrency-versus-time curve, then compare it with completion rate × mean duration. Account for work already present at the window start and unfinished at its end.
`)],diagrams:[diag('queue-boundary','What is inside Little’s-law boundary?',`flowchart LR
A[Arrivals per second] --> Q
subgraph SYS[Measured system boundary]
Q[Waiting jobs] -->|Admit to worker| W[Executing jobs]
end
W --> D[Completed jobs per second]
T[Mean time includes waiting and execution] -.-> SYS`, 'L counts both waiting and executing jobs when W covers their full time inside this boundary. The dotted annotation is not a data flow.', ['Choose the entrance and exit.','Count every unfinished job inside.','Measure average time between those same boundaries.','Use compatible stable averages; model growing backlog separately.'])],exercise:{prompt:'A stable endpoint completes 80 requests/s at mean duration 250 ms. Estimate average in-flight requests. Then a burst delivers 140 jobs/s to a 100 jobs/s worker system for five seconds. How large is the extra backlog, and how long to drain it when arrivals drop to 75/s?',minutes:10,rubric:['Converts milliseconds to seconds.','Uses mean, not a percentile.','Computes excess arrival rate for burst backlog.','Uses spare capacity during drain.'],solution:'Average concurrency = 80 × 0.25 = 20. Burst backlog = (140 − 100) × 5 = 200 jobs. Spare capacity after the burst is 100 − 75 = 25/s; drain time = 200/25 = 8 seconds. These are stable-average and fluid-model estimates respectively, not measured tail latency.'},questions:[num('q1','Stable throughput 300/s and mean time 0.2 s imply what average concurrency?',60,'requests',0.01,'L = 300 × 0.2 = 60.'),choice('q2','Can p99 time replace mean time in Little’s law?',['Yes, yielding p99 concurrency','No, the simple relation uses compatible averages','Only when measured in milliseconds'],'No, the simple relation uses compatible averages','A relationship between means does not transform arbitrary percentiles.'),num('q3','Backlog 600, capacity 100/s, ongoing arrivals 80/s: fluid-model drain time?',30,'seconds',0.01,'Spare capacity is 20/s; 600 / 20 = 30.'),open('q4','Why might memory rise while CPU stays low after a dependency slows?','More requests remain in flight waiting for the dependency, retaining buffers and connections without continuously executing CPU work.','Reason from occupied resources and duration, not a generic “server is slow” label.'),open('q5','When can buffering a burst be a valid compromise?','When the burst is bounded, the queue has a bound, spare capacity later drains it, and the added delay remains acceptable for the operation.','It cannot repair sustained excess demand or an already expired deadline.')],flashcards:cards([['Little’s law?','Average work inside = effective throughput × mean time inside, under compatible stable conditions.'],['Concurrency versus worker count?','Unfinished work versus execution slots; queued and waiting work may exceed workers.'],['Backlog growth rate?','Arrival rate minus completion capacity when positive.'],['Drain time with ongoing arrivals?','Backlog / (capacity − arrival rate), when the denominator is positive.'],['Can queues create capacity?','No; they trade waiting and storage for temporary smoothing.'],['Why define boundaries?','Counts, rate, and duration must describe the same system and population.']]),mentalModel:'A slowdown keeps work inside longer; the extra work must fit somewhere or be rejected.',sources:[refs.overload]});
