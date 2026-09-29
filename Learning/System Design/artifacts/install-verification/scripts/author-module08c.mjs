import {save,sec,diag,choice,num,open,cards} from './lesson-authoring.mjs';
import {refs} from './module08-sources.mjs';

save('076',{
objectives:['Choose wall-clock or monotonic time for a stated measurement.','Calculate the effect of clock offset on a cross-machine ordering claim.','Apply Lamport-clock send/receive rules.','Explain why a larger logical timestamp does not prove causality.'],retrieval:['L071: why should a timeout trace use one local monotonic clock?','L072: which operation order matters for linearizability?','L073: how does a message create a causal dependency?'],
sections:[sec('purpose','A clock answers one kind of question',`
The repair service stores a customer appointment date, measures an API deadline, and sorts events from different workers. Those tasks need different time concepts. A physical wall clock gives a date/time estimate useful to humans and external schedules. A monotonic clock measures elapsed time without moving backward when wall time is adjusted. A logical clock records ordering constraints without claiming elapsed seconds.

Use 5 minutes retrieval, 20 worked calculations, 10 diagram walkthrough, 10 exercise, and 10 questions/cards. Before every timestamp comparison write the intended claim: calendar time, local duration, causal order, or authority expiry. Many bugs arise because a number recorded for one purpose is silently reused for another.
`),sec('skew','Wall-clock order may reverse the actual event order',`
At true time100.000s, worker A completes an edit. A’s clock is80ms fast, so it logs100.080. Worker B observes that completion and performs a dependent action at true time100.030s. B’s clock is60ms slow, so it logs99.970. Sorting those logs by raw wall time puts B before A, although the action depended on the edit. The observed timestamp gap is110ms in the wrong direction.

Clock offset is the difference from a reference at a moment; drift is the rate at which that difference changes. Synchronization can reduce uncertainty under its operating assumptions, but “NTP is enabled” does not provide an application-level zero-skew proof. If clocks have independently bounded error ±ε, timestamps separated by less than or equal to2ε may not establish a strict real-time order. With ε=10ms, a recorded30ms separation establishes an order under that bound; a recorded15ms gap does not.

Last-write-wins using client wall timestamps may choose a clock-fast edit rather than the edit users consider later. Repeating that merge eventually makes replicas agree, but agreement does not repair the lost intention. A deterministic tie-breaker solves equal timestamps, not clock error or missing causal context.
`),sec('duration','Use a local duration clock for local budgets',`
For a one-process deadline, capture start=time.monotonic(), compute deadline=start+budget, and repeatedly compute max(0,deadline-time.monotonic()). The returned reference point is arbitrary; differences between readings are useful. Python’s documentation specifies a monotonic clock unaffected by system-clock updates. Do not store that raw value as an appointment date or compare it directly with a different machine’s raw value.

~~~python
def remaining(deadline, now):
    return max(0.0, deadline - now)

start = 500.0  # injected local monotonic reading
deadline = start + 0.8
assert abs(remaining(deadline, 500.3) - 0.5) < 1e-9
assert remaining(deadline, 500.9) == 0.0
# A wall-clock correction has no input to this calculation.
print("one deadline, remaining budget verified")
~~~

The injection makes the arithmetic test deterministic. It does not test an operating system’s clock implementation. Passing a deadline between hosts requires a protocol for expressing remaining budget or time uncertainty; raw monotonic readings have no portable shared epoch. Restart and suspend behavior also require attention for the chosen API and contract. Do not infer a safe distributed lease from a local timeout example.
`),sec('lamport','Logical time preserves known causal order',`
Define happened-before from local process order, message send before receipt, and transitive closure. With Lamport clocks, increment the local counter for each event. A send carries its counter. On receive, set local=max(local,received)+1. This guarantees that a causally earlier event has a smaller timestamp. The reverse implication does not hold.

Start A=0 and B=0. A performs a local event→1, then sends message M→2. B performs three independent events→1,2,3, then receives M→max(3,2)+1=4. B’s reply send→5; A receives→max(2,5)+1=6. The counter values describe an ordering discipline, not six seconds. B’s independent event at3 has a larger timestamp than A’s send at2 without being caused by it.

An agreed node-ID tie-breaker on (counter,nodeID) can impose a deterministic total order. That order extends the known causal order but also chooses arbitrary order between some concurrent events. It does not turn the system into a consensus protocol or prove that all replicas have learned the same event set.
`),sec('choice','Keep the claim aligned with the mechanism',`
For an incident log, retain wall time for human navigation plus request/trace IDs and causal links where available. For an end-to-end local deadline, use one monotonic budget rather than refreshing the timeout at each hop. For causality, propagate logical context. For ownership, use the actual authority protocol and its stated timing assumptions; attaching a timestamp to a request is insufficient.

The common interview shortcut is “timestamps solve ordering.” Respond with the kind of ordering and a counterexample. Wall clocks can misorder due to skew. Lamport clocks cannot tell whether two unequal counters are causally related. A tie-break can choose an order without validating it as real time. The next lesson adds more causal information through vector timestamps.
`)],diagrams:[diag('logical','Counters move forward when a message carries newer context',`sequenceDiagram
participant A as A counter 0
participant B as B counter 0
Note over A: Local event gives 1
A->>B: Send M with counter 2
Note over B: Three independent events give 3
Note over B: Receive M gives max of 3 and 2 plus 1 = 4
B->>A: Reply with counter 5
Note over A: Receive gives max of 2 and 5 plus 1 = 6`, 'The sent message can be in flight while B performs its three local events. Counter magnitudes are not wall-clock durations or proof of causality in the reverse direction.', ['Increment before the send and carry its value.','Let the receiver advance independently while the message is delayed.','Take the maximum and increment on receipt.','Propagate the new context in the reply.'])],
exercise:{prompt:'A logs an event at100.080s with a clock80ms fast. B logs a dependent event at99.970s with a clock60ms slow. Recover the true times and explain the misleading order. Separately, a process at Lamport7 receives timestamp11 and then sends a reply: give both resulting counters and state what cannot be inferred from a different independent event with counter10.',minutes:10,rubric:['Recovers100.000 and100.030.','Explains offset rather than negative actual latency.','Computes receive12 and send13.','Rejects the converse inference from logical counter order.'],solution:'Subtract A’s+0.080 offset to get100.000. Subtract B’s−0.060 offset to get100.030. B occurred30ms later although its recorded time is110ms earlier. Lamport receipt yields max(7,11)+1=12 and a later send increments to13. An independent event with counter10 is not necessarily a cause of the counter12 event; inequality alone is insufficient.'},
questions:[choice('q1','Which clock is appropriate for measuring a local request’s elapsed duration?',['Wall time with arbitrary adjustments','A local monotonic clock','A Lamport counter'],'A local monotonic clock','Elapsed differences should not move backward with wall-clock correction.'),num('q2','Local Lamport counter8 receives message timestamp5. What is the receive-event counter?',9,'counter',0,'max(8,5)+1=9.'),choice('q3','L(a)<L(b) proves a happened before b:',['True','False'],'False','The implication only runs from causal order to counter order.'),num('q4','Each physical clock has error at most10ms. What is the largest possible relative error between two clocks?',20,'ms',0,'One may be10ms fast and the other10ms slow.'),open('q5','Why can you not subtract two hosts’ raw monotonic readings to estimate request latency?','Their reference points are not a portable shared epoch, so the difference is not a meaningful cross-host duration.','Use an appropriate measurement boundary or clock-uncertainty protocol.')],flashcards:cards([['Wall clock purpose?','Calendar timestamps and external dates with clock uncertainty.'],['Monotonic clock purpose?','Elapsed time and local deadline budgets.'],['Lamport receive rule?','max(local, received)+1.'],['Causality implies Lamport order?','Yes under the protocol; the converse is false.'],['Tie-breaker provides?','A deterministic total order, including arbitrary order between concurrent events.'],['Relative uncertainty of two±ε clocks?','Up to2ε.']]),mentalModel:'A timestamp is evidence with a scope: calendar estimate, local duration, or causal ordering constraint.',sources:[refs.lamport,refs.time]});

save('077',{
objectives:['Compute vector timestamps for local and receive events.','Classify vector pairs as equal, causally ordered, or concurrent.','Use retained version context to distinguish stale replacement from concurrent edits.','Explain the limits of actor identity and metadata pruning.'],retrieval:['L076: why does a larger Lamport counter fail to prove causality?','L073: why must causal dependencies travel with a write?','L032: why does stable identity matter beyond a display name?'],
sections:[sec('need','One number can hide the difference we need',`
Two technicians edit a repair plan while disconnected. Alice changes the battery procedure and Bob changes the safety note. A scalar counter may order their updates by an arbitrary tie-break, but the product wants to know whether one edit knowingly superseded the other or whether both must be reconciled. Retaining separate knowledge of each writer’s progress allows that distinction.

Use 5 minutes retrieval, 20 vector calculations, 10 diagram walkthrough, 10 exercise, and 10 questions/cards. The examples use a fixed three-process model [A,B,C], reliable actor identity, counters that never reset within that identity, and propagation on every modeled message. These assumptions matter to the claimed causal interpretation.
`),sec('rules','Track known progress for each process',`
Each process begins with [0,0,0]. Before a local event or send, increment its own component. A send includes the vector. For receipt, merge componentwise maxima with the received vector, then increment the receiver’s own component. For vectors u and v, u≤v means every component of u is no greater than the corresponding component of v. Strict u<v additionally requires at least one smaller component.

If neither u≤v nor v≤u, the vectors are incomparable: under this complete model they represent concurrent events. Concurrent here means neither is in the other’s recorded causal past, not that two CPU instructions occurred at exactly the same wall-clock instant. Equal vectors are the same logical context for comparison; do not label equality as strict causal precedence.

These component comparisons are distinct from lexicographic list sorting. Python’s ordinary list < comparison is lexicographic, so [2,0,0] < [3,0,0] happens to agree in one case but [2,0,0] < [2,1,0] does not establish a general-purpose implementation. Explicitly compare all components.
`),sec('worked','A complete three-process trace',`
A makes edit a with vector[1,0,0]. B independently makes edit b with[0,1,0]. They are incomparable: A has knowledge B lacks and B has knowledge A lacks. A sends its state as a separate event[2,0,0]. B receives and merges into[2,2,0], because its local component advances from1 to2 at receipt. B now knows A’s send and its preceding edit as well as its own earlier edit.

B sends the reconciled context to C as[2,3,0]. C receives and becomes[2,3,1]. C’s context dominates both original edits. A still at[2,0,0] has not necessarily learned B’s edit just because B learned A’s. Causality flows along actual messages; receipt in one direction does not imply symmetric knowledge.

Compare additional pairs: [3,1,0] < [3,2,1], while [3,1,0] and[2,2,0] are concurrent. Summing components loses information: [3,0,0] and[0,3,0] have equal sum but different independent histories. A vector is not a vote count or a physical timestamp.
`),sec('versions','Version vectors adapt the idea to stored values',`
The Dynamo paper describes retaining causal context with object versions so a descendant can supersede an ancestor while concurrent siblings remain for reconciliation. Database version vectors and event vector clocks share a comparison idea, but their actor choice and increment events depend on the actual protocol. Do not copy the per-event teaching algorithm and assume it matches every database’s metadata format.

In an original object example, stored plan P has context[2,1]. Alice reads P and writes a replacement with[3,1]. Bob, still holding P, writes[2,2]. Neither replacement includes the other, so discarding one as merely “older” would lose a concurrent intention. A resolver that observes both can produce a new merged version whose context covers both plus the resolver’s own update under the chosen protocol.

If a client omits context and sends only the plan body, the store may be unable to tell “new edit based on current plan” from “blind overwrite based on stale plan.” Carry and validate the version context. It does not grant authorization; the API must still enforce who may edit the plan.
`),sec('limits','Metadata is part of the correctness boundary',`
With a fixed n-actor vector, comparison and merge cost O(n) and the metadata stores n counters. At eight bytes per counter, 200 actors require1600 raw counter bytes before actor identifiers and serialization overhead. If every short-lived client becomes an actor, metadata growth may dominate a small value. Sparse encodings, replica-level identities, and other version schemes trade precision and lifecycle complexity.

Reusing an actor identity after resetting its counter can make new events appear old. Removing a component merely because it looks ancient can erase evidence needed to distinguish concurrent versions from descendants. Pruning therefore needs a protocol argument about stability, membership, or accepted loss of causal precision; it is not just JSON cleanup.

Our tests compare vectors and reproduce the small message trace. They do not verify distributed membership changes, arbitrary metadata compaction, or a production version protocol. In an interview, finish with the consequence: detect concurrent intentions, preserve the required alternatives, and choose an application-aware resolution. Detection is useful evidence but does not decide which repair plan is safe.
`)],diagrams:[diag('vector','Knowledge is merged along message direction',`sequenceDiagram
participant A as A
participant B as B
participant C as C
Note over A: Edit a at [1,0,0]
Note over B: Edit b at [0,1,0]
A->>B: Send at [2,0,0]
Note over B: Receive at [2,2,0]
B->>C: Send at [2,3,0]
Note over C: Receive at [2,3,1]
Note over A: A still lacks b`, 'Components are ordered [A,B,C]. Send and receive are separately counted events. The initial edits are concurrent even though the diagram places their notes one after another.', ['Increment only the actor’s own component for its local event.','Carry all known components on send.','Merge maxima and then increment the receiver.','Do not infer reverse knowledge from a one-way message.'])],
exercise:{prompt:'Compare u=[4,1,0] and v=[3,2,0]. A third actor C at[0,0,2] receives u, then receives v. Calculate both receive vectors using merge-then-local-increment. Explain why choosing whichever initial vector has the larger sum is not a concurrency detector.',minutes:10,rubric:['Identifies u and v as incomparable.','Calculates[4,1,3] then[4,2,4].','Applies receiver increment after each merge.','Explains loss of per-actor knowledge in a scalar sum.'],solution:'u has a larger A component but smaller B component, so the events are concurrent in the stated model. C merges u with[0,0,2] and increments C to obtain[4,1,3]. It merges v to[4,2,3] and increments C to[4,2,4]. Both initial sums are5, but equal sums do not imply equal context; a scalar sum loses which actor’s events were observed.'},
questions:[choice('q1','How do[2,0] and[1,1] compare?',['First causally precedes second','Second causally precedes first','Concurrent under the stated complete model'],'Concurrent under the stated complete model','Each has one component the other lacks.'),choice('q2','How do[2,1] and[2,3] compare?',['First strictly precedes second','Concurrent','Equal'],'First strictly precedes second','Every first component is≤the second and one is smaller.'),num('q3','A dense vector has200 counters at8bytes each. Raw counters alone occupy how many bytes?',1600,'bytes',0,'200×8=1600, excluding identities and encoding.'),open('q4','Why does reset-and-reuse of an actor ID threaten causal comparison?','New events with reused low counters can be mistaken for old known progress under the same identity.','Identity and counter lifecycle are part of the protocol.'),open('q5','Does detecting concurrent edits tell you their correct business merge?','No. It establishes neither supersedes the other causally; application semantics must choose how to retain or reconcile intentions.','Causal metadata is evidence, not an automatic domain decision.')],flashcards:cards([['Vector u≤v?','Every component of u is≤the matching component of v.'],['Concurrent vector events?','Neither vector dominates the other under the complete model.'],['Receive rule?','Componentwise maximum, then increment the receiver’s own component.'],['Equal vectors mean strict precedence?','No; equality and strict causality are distinct.'],['Metadata pruning risk?','Removing causal knowledge can make version relationships ambiguous or incorrect.'],['Version context replaces authorization?','No. Permission is enforced separately.']]),mentalModel:'A vector records whose progress an event knows; incomparable knowledge exposes concurrency instead of inventing an order.',sources:[refs.dynamo,refs.lamport]});
