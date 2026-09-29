import {save,sec,diag,choice,num,open,cards} from './lesson-authoring.mjs';
import {refs} from './module08-sources.mjs';

save('078',{
objectives:['Calculate read/write overlap for a fixed replica set.','State the assumptions needed before a quorum equation has meaning.','Construct an incomplete-write read-regression counterexample.','Distinguish read repair, hinted handoff, and background anti-entropy.'],retrieval:['L072: how can a later read of an earlier value violate linearizability?','L077: why do concurrent values need version context?','L071: what does a write timeout leave uncertain?'],
sections:[sec('replicas','Coordinate an operation without a permanent write leader',`
A leaderless store can let a request coordinator contact multiple replicas for a key. Let N denote the key’s fixed home replica count, W the number of required write acknowledgments, and R the number of read responses. These quantities describe a request path; they do not by themselves specify version ordering, durability, repair, membership, or conflict resolution.

Use 5 minutes retrieval, 20 quorum histories, 10 diagram walkthrough, 10 exercise, and 10 questions/cards. Keep replica identities on the page. Drawing “three boxes” without saying which boxes acknowledged the write and answered the read makes an intersection argument impossible to check.
`),sec('overlap','The equation is a set-intersection fact',`
For one fixed set of N replicas, any W-member acknowledgment set and R-member response set must overlap if R+W>N. Their minimum intersection size is max(0,R+W−N). For N=5,W=3,R=3, every such pair overlaps in at least one member. With W=2,R=3, disjoint sets of sizes2 and3 can partition the five replicas, so overlap is not guaranteed.

This establishes an opportunity to encounter information from an acknowledged write. The overlapping member must still retain and return the relevant state or version. The reader must compare responses correctly. Concurrent writes, failed partial writes, discarded versions, membership changes, and stale coordinators need protocol behavior beyond the arithmetic. W>N/2 similarly provides intersection between write-acknowledgment sets in the fixed membership; it does not alone serialize every write.

If three stored copies occupy one failed machine or one failure domain, the equation does not create independent durability. N counts logical participants in this argument, while failure correlation and stable storage semantics belong to separate requirements. State what an acknowledgment means: received in RAM, journaled, or persisted to the required durability boundary.
`),sec('regression','Overlap alone permits a damaging history',`
Use replicas A,B,C, all x=0, W=2,R=2. A writer starts write1 and reaches A only, then stalls. It never receives W acknowledgments. A first read queries A and B, sees1 and0, chooses1 using the store’s version comparison, and returns1 without writing it back. After that read completes, a second read queries B and C and returns0.

Both reads used R=2, and R+W=4>3. Yet the history cannot be explained as a linearizable register if the pending write is included to justify the first read: that write must precede read1, and real time places read1 before read2, leaving no write0 to justify the later0. If the pending write is omitted, the first1 is unexplained. Quorum intersection with a completed W-set did not help because the new value existed on only one replica.

Some atomic-register protocols use carefully ordered versions and a read write-back phase so an observed value becomes sufficiently established before read completion. Other stores deliberately offer weaker semantics and application conflict resolution. The repair is a complete protocol with assumptions, not the sentence “we use majority reads.”
`),sec('sloppy','Changing the participant set can remove the promised overlap',`
Suppose the home set is A,B,C. During failure a sloppy write quorum accepts acknowledgments from A and fallback D. A later read from B and C has no overlap with that acknowledged set, even though someone reports N=3,W=2,R=2. The arithmetic was applied to different universes. The Dynamo paper’s preference-list and temporary fallback mechanisms are useful availability techniques, but their behavior must not be confused with fixed-set overlap.

Hinted handoff stores data temporarily for an unavailable intended replica and later attempts delivery. Read repair compares versions during reads and repairs stale copies according to the selected rules. Background anti-entropy compares replica state independently of foreground reads, often using compact summaries to locate differences. These mechanisms have different triggers and coverage.

A cold key may never benefit from read repair. A lost temporary hint may not supply the intended durability. Background repair must eventually run, have adequate resources, and respect deletes/tombstones and retention rules. Repair restores convergence under conditions; it does not erase a stale answer already returned or restore an earlier broken business promise.
`),sec('budget','Choose a measurable path and a clear contract',`
Increasing R or W changes latency and tolerance to unavailable replicas. If a write waits for three of five acknowledgments, the third qualifying acknowledgment lies on its critical path; the fastest replica is insufficient and the slowest is not always required. Parallel dispatch, timeouts, version reconciliation, read write-back, and repair can add work beyond the simple count.

For the repair app, a draft note store may permit concurrent siblings and later reconciliation. A final exclusive allocation needs a mechanism that enforces exclusivity; putting reservation counters on a leaderless store does not automatically supply it. Select a data path whose actual guarantees fit the invariant.

The local model tests enumerate fixed-set overlaps and reproduce the partial-write/read-regression history. They establish the set calculation and counterexample, not the correctness of a production replication protocol. During an interview, put acknowledged/returned versions next to each node, trace the failure, then name the missing condition. That is stronger evidence than quoting R+W>N.
`)],diagrams:[diag('regression','A partially propagated write can be read and then disappear',`sequenceDiagram
participant W as Writer
participant A as Replica A
participant B as Replica B
participant C as Replica C
participant R as Reader
W->>A: write x = 1
Note over W: W = 2 not reached<br/>write remains pending
R->>A: First read request
A-->>R: x = 1
R->>B: First read request
B-->>R: x = 0
Note over R: Return 1 without write-back
R->>B: Later read request
B-->>R: x = 0
R->>C: Later read request
C-->>R: x = 0
Note over R: Return 0`, 'The diagram shows two completed, non-overlapping reads. Both use R=2 from N=3, but the in-flight write reached only A and the first read did not stabilize it.', ['Distinguish partial propagation from a completed write quorum.','Let the first read expose the newer partial version.','Omit a stabilizing phase in the deliberately weak protocol.','Observe a subsequent read regress to the old value.'])],
exercise:{prompt:'For N=5 calculate minimum R/W overlap for(R=3,W=3) and(R=2,W=3). Then explain why N=3,R=2,W=2 does not prove linearizability using a partial write to A and reads from{A,B} then{B,C}. Finally give a sloppy-quorum example whose acknowledged set and home read set are disjoint.',minutes:10,rubric:['Computes1 and0.','Keeps incomplete write distinct from W acknowledgments.','Shows returned1 then0 with no intervening overwrite.','Names the fixed-universe assumption violated by fallback placement.'],solution:'Minimum overlap is max(0,R+W−N), so1 and0. If an incomplete write1 reaches only A, read{A,B} may return1 while a later read{B,C} returns0 unless the protocol prevents it. The pending write cannot explain both reads under linearizability. For home set{A,B,C}, acknowledgments{A,D} using fallback D can be disjoint from home read{B,C}; quoting N=3 for both sets is invalid.'},
questions:[num('q1','N=7,R=4,W=5: minimum fixed-set overlap?',2,'replicas',0,'4+5−7=2.'),choice('q2','R+W>N alone proves a linearizable register:',['True','False'],'False','Version semantics, incomplete operations, membership, and protocol phases remain relevant.'),choice('q3','Which mechanism can repair a key that nobody reads?',['Read repair alone','Background anti-entropy'],'Background anti-entropy','It runs independently of foreground reads.'),open('q4','What breaks the naive overlap proof for sloppy quorums?','Writes may be acknowledged by fallback nodes outside the fixed home set used for reads, so the compared sets do not share the claimed universe.','Write the actual participant IDs.'),open('q5','Why cannot repair retroactively fix an already returned stale result?','It changes future replica state; the earlier completed operation remains part of the observed history.','A history guarantee concerns what clients already observed.')],flashcards:cards([['Minimum fixed-set R/W overlap?','max(0,R+W−N).'],['R+W>N proves?','Set intersection under fixed membership, not a complete consistency protocol.'],['Sloppy quorum caveat?','Fallback acknowledgments may not overlap the home read set.'],['Read repair trigger?','A foreground read encounters divergent replica versions.'],['Hinted handoff?','Temporary storage later forwards data to its intended unavailable replica.'],['Anti-entropy purpose?','Background comparison and repair, including cold data under its assumptions.']]),mentalModel:'Quorum arithmetic tells you where evidence can meet; the protocol determines what that evidence means and when a result is safe to return.',sources:[refs.dynamo,refs.linear]});

save('079',{
objectives:['Choose an explicit conflict policy for concurrent edits.','Implement a state-based grow-only counter with componentwise-max merge.','Explain why idempotent state merge is different from duplicate user intent.','Demonstrate a convergent result that violates a business invariant.'],retrieval:['L077: how do incomparable version vectors identify concurrent intentions?','L078: what assumptions are needed for eventual repair?','L037: why is operation identity separate from retrying delivery?'],
sections:[sec('optional','Extension: decide what a conflict means',`
This red extension enriches later collaboration and multi-writer designs; it does not gate the essential L080 assessment. Use 5 minutes retrieval, 20 merge reasoning, 10 diagram walkthrough, 10 exercise, and 10 questions/cards. The goal is to explain a merge law and its limits, not memorize a catalog of data types.

When two disconnected users change a repair note, possible policies include choosing a deterministic winner, retaining both versions for manual reconciliation, merging independent fields, or adopting a data type with defined concurrent-operation semantics. Each policy answers a product question. “Resolve conflicts automatically” is incomplete until a lost edit, concurrent delete, and repeated delivery have specified outcomes.

Last-write-wins can be simple but may discard a valid concurrent intention. Field-level merge can preserve an address change and a phone change, yet independently merging start and end times may yield an invalid interval. The granularity at which values merge must respect relationships between fields.
`),sec('algebra','A state-based CRDT makes repeated merging predictable',`
For a state-based CRDT, the state has a partial order, local updates move upward, and merge computes a least upper bound. The join is associative, commutative, and idempotent. With the required dissemination, replicas receiving the same information converge despite merge order and duplicate state delivery. Operation-based designs have their own delivery and ordering assumptions; do not transfer state-merge claims to arbitrary duplicated operations.

These conditions explain a concrete counter. Give each replica its own nonnegative component. Only A increments A’s component and only B increments B’s. Merge takes componentwise maximum; displayed value is the sum. From[0,0], A increments twice→[2,0], B increments three times→[0,3], and either merge order produces[2,3], value5.

A single scalar counter merged with max would instead produce max(2,3)=3, losing two increments. Summing the two full states on every delivery would duplicate counts when a state is resent. The per-replica representation distinguishes independent contributions from repeated knowledge of the same contribution.
`),sec('code','Check the merge laws on the small model',`
~~~python
def merge(a, b):
    assert len(a) == len(b)
    return tuple(max(x, y) for x, y in zip(a, b))

a, b, c = (2, 0), (0, 3), (1, 4)
assert merge(a, b) == (2, 3)
assert sum(merge(a, b)) == 5
assert merge(a, a) == a
assert merge(a, b) == merge(b, a)
assert merge(merge(a, b), c) == merge(a, merge(b, c))
assert merge(merge(a, b), b) == (2, 3)
print("grow-only state merge examples verified")
~~~

The example tests representative states; the componentwise maximum law supports the general argument. It assumes stable replica identity and no counter reset under the same identity. Adding and retiring actors requires a lifecycle protocol. A user clicking “add” twice may generate two legitimate local increments, and both will survive merging. Idempotent merge handles duplicate transmission of the same state, not duplicate business intent creation.

For decrementable values, a PN-counter uses separate grow-only positive and negative components, deriving sum(P)−sum(N). Merge remains componentwise maximum in each half. This gives arithmetic convergence, not a guarantee that the result stays nonnegative.
`),sec('invariant','Agreement can preserve the wrong outcome perfectly',`
There is one portable generator. East and West are disconnected and each sees available=1. Each accepts a reservation and records its own decrement. A convergent PN representation later contains two decrements; starting from1 gives1−2=−1. The replicas agree on a negative result, but the product already promised one physical item to two jobs.

Clamping the displayed number to0 hides the arithmetic without retracting either accepted reservation. Last-write-wins discarding one reservation record erases evidence without notifying the affected job. A better design can require coordination for final allocation, preallocate non-overlapping reservation rights to sites, or accept tentative requests that are explicitly not confirmed. Preallocation limits availability when a site exhausts its rights and needs redistribution. Name that cost.

Convergence is especially useful when operations can be defined so their combination is always acceptable, such as accumulating independent telemetry counts. For shared text, richer CRDT structures can preserve concurrent editing semantics, but deletion, ordering, metadata growth, identity, and user intention still need careful design. A grow-only counter example is not an implementation of collaborative text.
`),sec('choose','Specify the merge contract before selecting an algorithm',`
For a repair checklist, ask whether concurrent add/remove should favor add, favor remove, or retain an explicit conflict. For a notification preference, ask whether a concurrent opt-out may be overridden. For a capacity-limited allocation, show the finite resource invariant before suggesting a counter. The data type must fit those decisions.

Then state dissemination, duplicate/reorder assumptions, actor identity, persistence, and garbage-collection rules. A replica that is never heard from again cannot be assumed to have learned a deletion. The same metadata that supports convergence can impose retention costs.

The supplied local tests exercise the max-merge laws over a finite state set, repeated delivery, and the negative-stock counterexample. They do not model a production network or prove arbitrary domain invariants. Explain both success and failure: the counter converges under its model, and that is precisely why the invariant counterexample is so instructive.
`)],diagrams:[diag('counter','Independent contributions merge without duplicate delivery inflation',`flowchart LR
Z[Initial state 0,0] --> A[A increments twice: 2,0]
Z --> B[B increments three times: 0,3]
A --> M[Componentwise maximum: 2,3]
B --> M
M --> V[Displayed value = 5]
B --> D[Duplicate delivery of 0,3]
M --> J[Merge again: still 2,3]
D --> J`, 'Each actor owns one component. The repeated object is the same state contribution; two newly created user increments would be distinct effects.', ['Keep each replica’s accumulated contribution separate.','Use maximum to retain the newest known component value.','Sum components only when reading the counter value.','Observe that duplicate state delivery cannot inflate it.'])],
exercise:{prompt:'A and B start a grow-only counter at[0,0]. A increments4times and B2times. Merge the states, deliver B’s state again, and report both values. Then model one available item with two disconnected accepted decrements using a PN-style total. Explain one design that preserves the stock invariant and its availability cost.',minutes:10,rubric:['Obtains[4,2] and total6.','Duplicate state delivery leaves total6.','Derives1−2=−1 without hiding accepted reservations.','Proposes actual authority or non-overlapping rights rather than merely a different merge order.'],solution:'Merge[4,0] with[0,2] to obtain[4,2], value6; max-merging[0,2] again is unchanged. Starting stock1 with separate decrements from two sites yields−1 after convergence. Require final allocation through an invariant-preserving authority, refusing/pending when unavailable, or preallocate the single right to only one site so the other cannot confirm an allocation without transferring that right. Either limits acceptance on some disconnected path.'},
questions:[num('q1','G-counter states[5,1] and[3,4] merge. What is the displayed total?',9,'count',0,'Componentwise max gives[5,4], whose sum is9.'),choice('q2','Idempotent state merge ensures two independently created user requests count only once:',['True','False'],'False','Duplicate state delivery is different from duplicate business intents.'),choice('q3','A convergent PN-counter automatically prevents overselling:',['True','False'],'False','It can converge to a negative quantity after independently accepted decrements.'),open('q4','Why does scalar max lose independent increments?','It chooses the largest aggregate rather than retaining each actor’s independent contribution.','Per-actor components distinguish information sources.'),open('q5','What three algebraic merge properties handle order and repeated state delivery?','Associativity, commutativity, and idempotence, within the stated state-based protocol and dissemination assumptions.','These are convergence properties, not all business invariants.')],flashcards:cards([['State-based merge laws?','Associative, commutative, and idempotent join.'],['G-counter value?','Sum of per-replica grow-only components.'],['G-counter merge?','Componentwise maximum.'],['PN-counter value?','Sum of positive components minus sum of negative components.'],['Convergence guarantees nonnegative stock?','No; concurrent accepted decrements can exceed available rights.'],['How preserve scarce rights without global contact each time?','Preallocate disjoint rights under a correct transfer protocol, limiting acceptance where rights run out.']]),mentalModel:'A merge law can make replicas agree; only a domain argument shows whether the agreed result keeps the promises already made.',sources:[refs.crdt]});
