import fs from 'node:fs';
import path from 'node:path';
import {save,sec,diag,choice,num,open,cards,content} from './lesson-authoring.mjs';
export const refs={tasks:{title:'Python 3.14 documentation: Coroutines and tasks',url:'https://docs.python.org/3/library/asyncio-task.html'},sync:{title:'Python 3.14 documentation: asyncio synchronization primitives',url:'https://docs.python.org/3/library/asyncio-sync.html'},threads:{title:'Python 3.14 documentation: threading',url:'https://docs.python.org/3/library/threading.html'},futures:{title:'Python 3.14 documentation: concurrent.futures',url:'https://docs.python.org/3/library/concurrent.futures.html'},dev:{title:'Python 3.14 documentation: Developing with asyncio',url:'https://docs.python.org/3/library/asyncio-dev.html'},http:{title:'IETF RFC 9110: HTTP Semantics, HTTPWG edition',url:'https://httpwg.org/specs/rfc9110.html'},problem:{title:'IETF RFC 9457: Problem Details for HTTP APIs',url:'https://www.rfc-editor.org/info/rfc9457/'},auth:{title:'OWASP Authorization Cheat Sheet',url:'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html'},page:{title:'Google AIP-158: Pagination',url:'https://google.aip.dev/158'},simple:{title:'Google SRE: Simplicity',url:'https://sre.google/sre-book/simplicity/'}};

save('021',{
objectives:['Distinguish process isolation, threads, and cooperative tasks.','Identify whether a request is waiting for I/O or consuming CPU.','Explain why blocking work stalls an event loop.','Choose a bounded execution model without promising unmeasured speedups.'],retrieval:['From L007, what happens to in-flight work when latency rises at fixed request rate?','From M02, name a point where a network request waits without computing.'],
sections:[sec('models','Where does one request execute?',`
Core: retrieval 5, mechanism and diagrams 18, worked trace 8, exercise 10, questions 10, review 4 minutes. Imagine an endpoint that retrieves a weather reading, converts its units, and returns a response. It waits much longer for a network reply than it spends converting a number. The execution model decides what the server can do while it waits.

A process has its own address space and resources. Separate processes can isolate a crash and execute independently, but exchanging data requires a communication mechanism. Threads run within a process and share memory. That makes access convenient and introduces coordination obligations. An asynchronous task is a unit of work scheduled by an event loop; it cooperatively yields at suitable await points instead of requiring one thread per unfinished request.

Concurrency means several operations make progress during overlapping lifetimes. Parallelism means execution actually occurs at the same instant on different execution resources. Two network requests may overlap while one event-loop thread alternates their short compute steps. Calling this concurrent does not claim simultaneous execution of Python code.

For the usual GIL-enabled CPython build, CPU-bound Python threads do not generally execute Python bytecode in parallel. Extensions may release the GIL, and free-threaded builds change relevant behavior; record the interpreter build rather than making a claim about all Python implementations. Threads can still be useful for I/O. CPU-heavy work often needs a process pool or another appropriately measured execution path.
`),sec('trace','What an event loop can and cannot schedule',`
Trace request A: read input, initiate an asynchronous network operation, and await its result. While A is suspended, request B can validate its input and initiate another operation. When A's I/O becomes ready, its task resumes and converts the result. The operating system and networking library signal readiness; the task does not need to spin in a loop checking constantly.

Now replace the asynchronous operation with a synchronous call that blocks the event-loop thread for two seconds. B cannot run on that loop during those two seconds, even if B only wants a trivial response. Writing async def around a blocking call does not make the call cooperative. Similarly, a long pure-Python computation with no yield blocks progress on that loop.

A bounded thread executor can bridge a blocking I/O library, but it introduces queueing and cancellation limitations. Canceling the await does not reliably stop a function already running in a thread. A process executor can run CPU work separately, but arguments and results must cross the process boundary, and startup/serialization costs can dominate tiny tasks. Choose a mechanism by occupied resources and failure needs, then measure it.
`),sec('example','An observable scheduling example',`
The following is an executable standard-library simulation for Python 3.11+. Each sleep models I/O readiness, not a real external service. It checks completion and shows interleaving; wall-clock timing is intentionally not asserted because machines and schedulers vary.

~~~python
import asyncio

async def fetch(label: str) -> str:
    print(label, "start")
    await asyncio.sleep(0.01)
    print(label, "ready")
    return label

async def main() -> None:
    results = await asyncio.gather(fetch("A"), fetch("B"))
    assert results == ["A", "B"]
    print("both complete")

asyncio.run(main())
~~~

Expected shape: both start messages appear before ready messages, followed by “both complete.” The returned list follows argument order; that is not proof that real requests complete in the same order. In the L029 harness, blocking versus cooperative execution is tested through controlled progress events rather than a fragile benchmark.

If incoming demand is 100/s and each operation remains in flight for 0.5 s, average concurrency is about 50 under L007's stable assumptions. That does not require 50 CPU cores. It does require enough sockets, memory, and downstream capacity. Creating unbounded tasks merely moves the bottleneck to those resources.
`),sec('choice','A runtime is not an overload policy',`
Use async I/O when your libraries cooperate and many requests wait. Use a limited thread pool for blocking I/O that cannot be replaced immediately. Consider processes for substantial CPU work when the overhead and state-sharing model are acceptable. A synchronous small service may be entirely adequate for a modest workload; complexity should follow evidence.

Failure scenarios: a blocking DNS or SDK call freezes an event loop; an unbounded executor queue consumes memory; a worker process dies while holding an unfinished task; a shared thread mutation races with another request. None is repaired solely by renaming the endpoint asynchronous. Attach ownership, limits, deadlines, and error propagation to the execution choice.

Common misconceptions are “async makes CPU work faster,” “threads cannot help Python,” “one process means no concurrency,” and “await always gives another task a useful chance to run.” Some awaits complete immediately; cooperative behavior depends on what is awaited. Optional depth: compare the same I/O workload with threads and async using a real local test server, clearly labeling all measurements.
`)],diagrams:[diag('event-loop','Overlap waiting, not arbitrary computation',`sequenceDiagram
participant L as Event loop
participant A as Task A
participant B as Task B
participant N as I/O readiness
L->>A: Run short computation
A->>N: Begin operation and await
L->>B: Run while A waits
B->>N: Begin operation and await
N-->>A: Ready to resume
L->>A: Continue to result`, 'A and B share one loop thread in this model. The diagram does not show CPU parallelism or guarantee completion order.', ['A runs until it suspends on I/O.','The loop can run B during that wait.','Readiness makes A eligible again.','A long blocking function would prevent the scheduling step.'])],exercise:{prompt:'An async endpoint downloads a file using a blocking SDK, then compresses it using CPU-heavy Python, then returns. Identify two separate causes of event-loop blockage and propose bounded execution choices. State what cancellation of a thread await does not guarantee.',minutes:10,rubric:['Distinguishes blocking I/O from CPU computation.','Proposes cooperative library or bounded I/O executor.','Proposes measured CPU execution outside the loop when needed.','Does not promise that thread cancellation stops running work.'],solution:'The synchronous SDK blocks the loop while waiting; replace it with cooperative I/O or use a bounded thread executor with its own timeout. Compression consumes CPU on the loop; consider a process pool or a suitable native implementation, measuring serialization and work size. Limit admission to either path. Canceling the caller waiting for a thread result may abandon the result while the underlying function keeps running, so the SDK needs its own bounded timeout and cleanup plan.'},questions:[choice('q1','Two requests overlap network waits on one event-loop thread. This demonstrates:',['Concurrency','Guaranteed CPU parallelism','No resource use while waiting'],'Concurrency','Lifetimes overlap; waiting still retains sockets and memory, and does not imply simultaneous CPU execution.'),choice('q2','What makes a blocking SDK cooperative?',['Putting it inside async def','Using an actual asynchronous API or moving the blocking call to a suitable bounded executor','Renaming it fetch_async'],'Using an actual asynchronous API or moving the blocking call to a suitable bounded executor','Syntax alone does not change how the underlying function waits.'),open('q3','When might separate processes be appropriate?','For substantial CPU work or isolation requirements when communication, startup, and state costs are justified.','Mention evidence and overhead rather than claiming processes always speed work.'),num('q4','At 60 requests/s and mean 0.5 s in flight, what is average concurrency?',30,'requests',0.01,'60 × 0.5 = 30 under compatible stable assumptions.'),open('q5','Why can async still run out of resources?','Each unfinished task may retain memory, sockets, buffers, and downstream slots; unbounded admission can exhaust them despite efficient waiting.','Execution efficiency does not replace an overload policy.')],flashcards:cards([['Concurrency?','Overlapping progress or lifetimes of operations.'],['Parallelism?','Simultaneous execution on multiple execution resources.'],['Process versus thread?','Separate address space versus shared memory within a process.'],['Event-loop blockage?','A synchronous wait or long computation prevents other tasks on that loop from running.'],['Does async def make a library nonblocking?','No; the underlying operation must cooperate or run outside the loop.'],['Canceling an executor await guarantees what?','The caller may stop waiting; a running thread function may continue.']]),mentalModel:'Choose where work computes, where it waits, and which resources remain occupied during both phases.',sources:[refs.threads,refs.dev,refs.futures]});

save('022',{
objectives:['Construct an interleaving that loses an update.','Protect a local critical section and state its scope.','Bound active work separately from queued work.','Propagate cancellation while releasing owned resources.'],retrieval:['From L021: why can tasks interleave on a single event-loop thread?','From L002: describe an invariant independent of a locking mechanism.'],
sections:[sec('race','A single thread does not make a multi-step operation atomic',`
Core: retrieval 5, mechanism 18, trace 8, exercise 10, questions 10, review 4 minutes. Suppose two requests increment a shared counter. Each reads the value, waits for another operation, then writes the old value plus one. Starting at zero, A reads zero, B reads zero, A writes one, and B writes one. Two successful increments leave one: a lost update.

The bug is an interleaving across a read-modify-write operation. Threads are not required; tasks can yield between those steps. Conversely, the presence of multiple threads does not automatically make every operation incorrect. Identify the shared state, invariant, and critical section precisely. Here the invariant is that each accepted increment contributes one to the counter.

A local asynchronous lock can serialize those steps within one event loop. A thread lock can coordinate participating threads in one process. Neither lock coordinates a second application process or a second server unless an explicit shared authority participates. Using a process-local lock around a database update does not establish system-wide correctness. M04 introduces the database boundary where persistent invariants belong.
`),sec('limits','Bound ownership, not only the rate of starting tasks',`
A semaphore with capacity N limits how many cooperating operations hold a slot at once. It is useful for protecting a downstream connection pool or CPU executor. But launching a million tasks that all wait for a semaphore still creates a million waiting tasks. Bound both active work and waiting work, or reject admission before retaining a large request body.

Suppose at most ten external calls may run and at most twenty requests may wait. The thirty-first request should receive an explicit overload policy rather than silently allocating another waiting task. That policy may reject immediately, ask a client to retry later, or defer durable background work under a separate contract. A semaphore by itself expresses none of those choices.

Holding a lock while waiting for unrelated network I/O lengthens the critical section and creates convoying. If the state transition can be safely split, take a snapshot under the lock, release it, compute outside, then validate a version before committing. That is a pattern requiring careful correctness reasoning, not permission to release a lock halfway through an invariant. Prefer the simplest protected operation until you can prove the split.
`),sec('cleanup','Cancellation is a request to stop, not time travel',`
In cooperative async code, cancellation is delivered at an opportunity for the task to observe it. Use finally or context managers to release slots, close owned resources, and finish required cleanup. After cleanup, allow cancellation to propagate; swallowing it may keep unwanted work alive and confuse its caller. A database write already committed cannot be undone just because the client disconnected.

An executable Python 3.11+ illustration protects two intentionally interleaved updates:

~~~python
import asyncio

async def main() -> None:
    lock = asyncio.Lock()
    counter = 0
    async def increment() -> None:
        nonlocal counter
        async with lock:
            previous = counter
            await asyncio.sleep(0)  # force a scheduling opportunity
            counter = previous + 1
    await asyncio.gather(increment(), increment())
    assert counter == 2
    print("counter=2")

asyncio.run(main())
~~~

The sleep is deliberate test instrumentation, not a recommended reason to hold a lock. Remove the lock while keeping this interleaving and both tasks read zero before either writes. The L029 harness tests that failure deterministically. This is a local concurrency demonstration, not a durable distributed counter.
`),sec('failure','Trace ownership during every exit',`
Consider a request that acquires a downstream slot, starts a call, then is canceled. If release happens only after a normal return, the slot leaks. Repeated cancellations eventually leave no capacity even while no useful calls run. An asynchronous context manager around slot ownership makes normal completion, exceptions, and cancellation share the release path.

Cleanup itself can fail or block. Set reasonable bounds, log an actionable error, and distinguish resource cleanup from compensating a business action. Deleting a confirmed booking because its client disconnected is not merely cleanup; it changes product state and requires an explicit policy.

Common misconceptions are “the GIL protects my business transaction,” “async code cannot race,” “a semaphore bounds every queue,” “a timeout rolls back all effects,” and “catching every exception makes shutdown reliable.” Ask what each participant owns, which transitions are protected, and where cancellation can be observed. Optional depth: test cancellation while waiting for a slot versus while holding one; the resource accounting should return to its baseline in both cases.
`)],diagrams:[diag('lost-update','Two requests overwrite the same old value',`sequenceDiagram
participant A as Request A
participant C as Shared counter
participant B as Request B
A->>C: Read 0
B->>C: Read 0
A->>A: Compute 0 plus 1
B->>B: Compute 0 plus 1
A->>C: Write 1
B->>C: Write 1
Note over A,B: Final value 1 loses one accepted increment`, 'This unsafe history concerns local shared state. A protected read-modify-write must exclude the competing operation across the entire critical section.', ['A takes a snapshot.','B takes the same snapshot before A commits.','Each computes a locally plausible answer.','The second write replaces, rather than adds to, the first effect.'])],exercise:{prompt:'Review this pseudocode: acquire_slot(); result = await provider(); release_slot(); return result. Describe the cancellation leak, rewrite the ownership structure, and explain why a ten-slot semaphore still allows an unbounded waiting queue.',minutes:10,rubric:['Shows cancellation or exception bypassing release.','Uses finally/context manager with matching acquisition scope.','Separates active-call count from waiting-task count.','Does not claim that caller cancellation reverses remote effects.'],solution:'If provider() raises or the task is canceled, release_slot() is skipped. Use an async slot context manager or acquire followed by try/finally with release in the finally block. Ensure only successfully acquired slots are released. A semaphore limits holders; every additional task can still wait, holding memory and request context. Add a bounded admission queue or reject excess arrivals. If the remote provider already acted, cancellation does not automatically undo its action.'},questions:[choice('q1','Can a single-threaded event loop lose a read-modify-write update?',['No','Yes, when competing tasks interleave across yields','Only if there are two CPUs'],'Yes, when competing tasks interleave across yields','Atomicity is about the whole transition, not the thread count alone.'),choice('q2','A process-local lock coordinates:',['All servers automatically','Only participants sharing that lock in its supported scope','Every database client'],'Only participants sharing that lock in its supported scope','Other processes do not share the same in-memory lock.'),open('q3','What must be bounded besides active calls?','Waiting tasks or requests and retained input/resources, with a defined admission policy when full.','A semaphore alone does not limit the number of waiters.'),open('q4','Why re-raise cancellation after cleanup?','So the caller and structured execution scope can observe that the work was canceled instead of accidentally continuing it as success.','Cleanup should not hide the operation’s state.'),open('q5','When is releasing a lock before I/O unsafe?','When another operation can change the protected state and the later write no longer validates the invariant or original version.','A safe split needs a proof or revalidation, not merely a shorter lock duration.')],flashcards:cards([['Lost update?','Two operations derive writes from the same old value, and one overwrites the other effect.'],['Critical section?','The complete state transition that competing operations must not interleave unsafely.'],['Semaphore bounds?','Concurrent holders, not automatically the number waiting.'],['Local lock scope?','Its participating event loop or process, not other servers.'],['Why finally?','To release owned resources across normal, error, and cancellation exits.'],['Cancellation cannot do what?','Undo effects already committed locally or remotely by itself.']]),mentalModel:'Every resource needs an owner, every shared transition a protected boundary, and every exit a cleanup path.',sources:[refs.sync,refs.tasks]});
