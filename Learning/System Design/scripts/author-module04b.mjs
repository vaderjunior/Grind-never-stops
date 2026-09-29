import {save,sec,diag,choice,num,open,cards} from './lesson-authoring.mjs';
import {refs} from './author-module04.mjs';

save('033',{
objectives:['Explain a B-tree lookup as ordered navigation.','Choose composite-key order from equality, range, and sort needs.','Account for index maintenance and storage costs.','Distinguish covering data from guaranteed index-only execution.'],retrieval:['From L024: why does pagination require a unique tie-breaker?','From L031: name the scope, filter, order, and projection of an access pattern.'],
sections:[sec('intuition','An index is another representation you must maintain',`
Core 55 minutes: retrieval 5, mechanism 18, worked query 8, exercise 10, questions 10, review 4. A table containing ten million activity rows can answer “the newest 20 for tenant 7” by inspecting the entire collection, but that does not exploit what the query knows. An ordered index keeps selected keys arranged so the database can navigate to a relevant region and continue from there.

A B-tree family index uses a hierarchy of pages with separator keys. A lookup narrows the key interval at each level until it reaches leaf entries. Large page fan-out keeps the height relatively small; the useful mental model is a few navigation steps followed by scanning the relevant ordered range, not binary search through every individual row. Actual implementation details and I/O depend on the engine, cache, and key sizes.

Index entries point to or otherwise identify the row representation. Reading the full row can require additional storage access unless the index contains everything needed and the engine can establish visibility from it. Indexes consume disk and memory, and inserts/updates/deletes must maintain them. Ten speculative indexes can make writes slower and reduce useful cache space without helping the real query mix.
`),sec('order','Composite keys are ordered tuples',`
For tenant-scoped activity ordered by time and ID, consider (tenant_id, created_at DESC, id DESC). The first equality selects one tenant's contiguous region; the following fields provide the desired order and cursor boundary. This aligns the physical navigation with the API's access pattern from L024.

An index ordered (created_at, tenant_id) has a different arrangement: rows from many tenants interleave within time order. It can support time-wide queries well, but tenant-only lookup may need more work. “The same columns appear” does not mean the same traversal. Equality on leading fields and a range on the next field is a useful initial design rule for B-trees, not an absolute statement that later columns can never help. PostgreSQL 18 can use skip-scan strategies in some cases; inspect the actual plan instead of repeating a blanket leftmost-prefix slogan.

Place low-cardinality flags with care. status='active' may select nearly every row or only a tiny minority. A selective partial index for active rows can help a specific query, but only when the planner can establish that the query satisfies its predicate. Data distribution, update frequency, and query form matter more than the word status.
`),sec('worked','Derive the index from a bounded page',`
The workload requests tenant 7's latest entries, continuing below a saved timestamp/ID pair:

~~~sql
CREATE INDEX entries_by_tenant_time
ON entries(tenant_id, created_at DESC, id DESC);

SELECT id, created_at, title
FROM entries
WHERE tenant_id = :tenant
  AND (created_at < :last_time
       OR (created_at = :last_time AND id < :last_id))
ORDER BY created_at DESC, id DESC
LIMIT 20;
~~~

This is a PostgreSQL-oriented pattern sketch, not an executed plan claim. The query begins in tenant 7's ordered region and seeks the continuation boundary rather than counting an ever-growing offset. A row-value comparison can express the same lexicographic condition where supported, with matching null and sort semantics.

If title is frequently returned and small, an INCLUDE(title) index may store it as payload without making it an ordering key. In PostgreSQL, that can enable index-only scans when visibility information permits; merely including the columns does not guarantee that heap fetches disappear. Large included values enlarge the index and increase maintenance cost. Measure the tradeoff with representative reads and writes.

Suppose a title averages 300 bytes and there are ten million rows. Adding that payload introduces roughly 3 GB of raw title bytes before entry and page overhead. This rough lower-bound estimate is enough to reject “cover everything for free.” Compression and layout depend on implementation; measure actual index size if the decision matters.
`),sec('failure','Do not optimize yesterday’s query by accident',`
A query that wraps an indexed field in a function may need a matching expression index or a rewritten predicate. An implicit type conversion can also change index usability. These are reasons to inspect a plan, not to assume that a named index must be used. A sequential scan can be appropriate for a large fraction of a table, especially when random row fetches would cost more.

Updates to indexed values create maintenance work; a timestamp rewritten on every heartbeat can make an index expensive even when read traffic is low. Highly skewed tenants can make a plan that suits a small tenant poor for a large one. Record which parameter values and distribution your benchmark covers.

Common misconceptions: every index lookup is O(1); an index sorts the table itself; a covering index always avoids row access; column order is cosmetic; forcing index use proves optimization. The goal is less useful work and acceptable write cost under the real access pattern. Optional practice: compare index sizes and plans on the supplied local relational fixture, noting that SQLite behavior is not proof of PostgreSQL visibility behavior.
`)],diagrams:[diag('btree','Navigate by scope, then scan the ordered range',`flowchart TD
Q[Tenant 7 and cursor time plus ID] --> R[Index root separator keys]
R -->|Choose tenant 7 interval| P[Internal page]
P -->|Locate cursor boundary| L[Leaf entries ordered by time and ID]
L -->|Next 20 matching entries| X[Fetch projected row fields]
L -.->|More leaf entries if needed| N[Adjacent leaf page]`, 'A conceptual ordered-page view, not a byte-level diagram of PostgreSQL. It shows why key order and a bounded range matter.', ['Use the leading equality to select a region.','Navigate to the range or cursor boundary.','Read only the relevant ordered entries where possible.','Account for row visibility and projection fetches.'])],exercise:{prompt:'Compare indexes (tenant_id, status, created_at DESC, id DESC) and (created_at DESC, tenant_id, status) for “latest 20 open tickets for one tenant.” Explain which better matches the initial access pattern, one write cost, and one different query that may favor the other order.',minutes:10,rubric:['Uses equality scope and status before ordered range.','Retains an ID tie-breaker.','Acknowledges maintenance/storage cost.','Avoids absolute planner claims without a plan.'],solution:'The first aligns equality on tenant and status with a descending time/ID range, making a good initial candidate. Maintaining changed status/time values costs index writes and space. A cross-tenant time-window scan may favor a time-leading index. Actual plans and distribution can change the result; PostgreSQL may use other strategies, so validate with representative parameter values and projected columns.'},questions:[choice('q1','Why does composite column order matter?',['It changes the lexicographic regions the index can navigate','It only changes display labels','All permutations are equivalent'],'It changes the lexicographic regions the index can navigate','Equality/range/order requirements align differently with each tuple order.'),choice('q2','Including every projected column guarantees a PostgreSQL index-only scan:',['True','False'],'False','Visibility and planner choices still matter; included payload can only enable the possibility.'),num('q3','Ten million rows each add 300 payload bytes. Raw payload size in decimal GB?',3,'GB',0.01,'10,000,000 × 300 / 1,000,000,000 = 3 before index overhead.'),open('q4','Why might a sequential scan be sensible?','When a large fraction of rows is needed or ordered/random index fetches cost more than scanning the table, depending on layout and cache.','Index usage is not itself the optimization goal.'),open('q5','What evidence should accompany a new index?','The targeted query and distribution, plan, measured read effect, write/maintenance cost, and actual size under a representative workload.','A single fast read without write cost does not establish the full tradeoff.')],flashcards:cards([['B-tree mental model?','Navigate ordered separator pages, then scan a relevant leaf range.'],['Composite index order?','Lexicographic tuple order, not a set of interchangeable columns.'],['Useful starting pattern?','Equality scope followed by range/order fields, verified against the engine’s plan.'],['Covering payload costs?','Space, cache pressure, and write maintenance.'],['Index-only guarantee?','Requires engine-specific visibility and a chosen suitable plan, not only included columns.'],['Optimization target?','Useful workload performance and cost, not forcing an index name into a plan.']]),mentalModel:'An index prearranges one access path; choose its order from the query and pay its write and space bill explicitly.',sources:[refs.indexes,refs.cover]});

save('034',{
objectives:['Read estimated versus observed plan work.','Explain selectivity and why distribution affects plans.','Diagnose an N+1 query pattern separately from a slow query.','Choose a bounded join or batch without multiplying result rows accidentally.'],retrieval:['From L033: why may a sequential scan be reasonable?','From L004: how can one user action amplify internal work?'],
sections:[sec('evidence','Ask where the database spends work',`
Core 55 minutes: retrieval 5, explanation 18, worked plan 8, exercise 10, questions 10, review 4. A “slow database” report may mean one expensive scan, thousands of cheap round trips, waiting for a lock, or waiting for a connection. Separate those intervals before changing a schema or buying a larger machine.

EXPLAIN shows the plan selected by the optimizer, including estimated rows and cost. EXPLAIN ANALYZE executes the statement and reports observed timing/row counts. In PostgreSQL, costs are planner units, not milliseconds. For a mutation, ANALYZE really performs the mutation; use an appropriate test database or a deliberate rollback workflow and understand any effects that rollback does not reverse. Do not run it casually on production writes.

Read a plan from the work-producing nodes upward. A scan finds rows; filters discard candidates; joins combine inputs; sorts establish order; limits may stop work early depending on the plan. Compare estimated and actual row counts at the point they diverge. Multiply per-loop work by loops where appropriate; a tiny node executed thousands of times can dominate.
`),sec('selectivity','The same predicate can describe very different work',`
Selectivity is the fraction of rows matching a condition under the relevant population. tenant_id=7 might match 100 rows for a small department or half the table for a giant tenant. status='open' might be rare in one service and nearly universal in another. Statistics help the optimizer choose among scans and joins, but stale or incomplete statistics can misrepresent correlations and skew.

For an invented example, a plan estimates 100 rows after filtering but actually produces 800,000. The join strategy and memory decisions downstream were made from a very different expected workload. Investigate data distribution, stale statistics, parameter values, and correlated predicates before forcing a specific operator. The error is evidence of a model mismatch, not proof of a particular remedy.

A filter that returns 20 rows after scanning ten million may indicate an index opportunity. A query returning eight million of ten million rows may reasonably scan broadly. Selectivity alone is not the full cost model: row width, required ordering, page locality, cache state, and index maintenance matter too.
`),sec('nplusone','A fast query repeated 101 times is still expensive',`
Suppose GET /loans first fetches 100 loans, then fetches each borrower's name with one separate query. That is 101 queries. At an illustrative 2 ms of serial round-trip overhead per query, communication overhead alone is about 202 ms, before useful database work. A join or batched borrower lookup could reduce the round trips to one or two. These are derived arithmetic assumptions, not measured performance.

A joined query for one borrower per loan might be:

~~~sql
SELECT l.loan_id, l.opened_at, b.display_name
FROM loans AS l
JOIN borrowers AS b
  ON b.department_id = l.department_id
 AND b.borrower_id = l.borrower_id
WHERE l.department_id = :department
ORDER BY l.opened_at DESC, l.loan_id DESC
LIMIT 100;
~~~

Join cardinality matters. If you also join each loan to many audit events, one loan can appear several times. Applying LIMIT 100 to the multiplied rows may return far fewer than 100 distinct loans and truncate child collections. Page parent identities first, then fetch related rows in a bounded batch or use a query structure that preserves the desired result contract.

For the one-to-many case, a two-query pattern can be clearer: retrieve the 100 parent rows under the cursor contract; collect their IDs; fetch children WHERE parent_id IN (...) under the same authorized scope. The batch itself needs a size bound and a consistency policy if rows change between queries.
`),sec('measurement','Measure the workload, not a lucky warm request',`
Record query text shape, parameters or safe distributions, row counts, index definitions, statistics state, cache conditions, concurrency, and transaction boundaries. Compare p50/p95/p99 where the sample supports them, plus lock wait and connection-pool wait. One warm single-client run cannot establish a multi-user service objective.

Failure scenarios: an ORM lazily loads a relationship during serialization; a count query scans a full dataset on every page; a tenant-filter omission makes both a performance and isolation incident; a join multiplies parent rows; a query plan changes after data growth. Each has a different correction. Merely adding a cache can preserve the wrong result or hide the root cause temporarily.

Common misconceptions: optimizer cost equals elapsed milliseconds; ANALYZE only simulates; all joins are slower than separate queries; an index scan always means a good plan; a small returned page implies little scanned work. Optional practice: run EXPLAIN QUERY PLAN on the local SQLite fixture and compare before/after index creation. Label it SQLite evidence, and do not infer PostgreSQL operator behavior from it.
`)],diagrams:[diag('amplification','One page can create a hundred extra round trips',`flowchart LR
P[One page request] --> L[Query 100 loans]
L --> N[100 separate borrower queries]
N --> R[Assemble response]
P -.->|Alternative bounded path| B[One joined query or two batched queries]
B --> R`, 'The diagram compares query-count shapes. It does not claim joins are universally faster; cardinality, plans, and consistency still need review.', ['Count queries per user action.','Separate round-trip overhead from execution time.','Choose a bounded join or batch matching relationship cardinality.','Measure the full endpoint again, including authorization and serialization.'])],exercise:{prompt:'An endpoint returns 50 projects, then loads each project’s owner and ten recent events separately. It runs 101 queries: one project query plus 50 owner and 50 event queries. Propose a bounded alternative and explain why a naive project-owner-event join with LIMIT 50 can change the page semantics.',minutes:10,rubric:['Recognizes round-trip amplification.','Pages parent identities before one-to-many expansion.','Batches related data with limits and authorization scope.','States consistency and measurement assumptions.'],solution:'Fetch the 50 projects under a stable parent cursor. Join owners if each project has one owner, or batch distinct owner IDs. Fetch bounded recent events for those project IDs with an explicit per-parent limit using a suitable query or prepared fixture. A naive join creates up to many rows per project; LIMIT 50 limits joined rows, not 50 projects. Preserve the result contract and test query count, row count, and endpoint latency under representative concurrency.'},questions:[choice('q1','PostgreSQL EXPLAIN ANALYZE on an UPDATE:',['Only predicts the mutation','Actually executes it','Cannot show row counts'],'Actually executes it','Use a safe test setting and understand rollback limitations.'),num('q2','1 page query plus 80 serial lookups, each with 3 ms round-trip overhead: overhead alone?',243,'ms',0.01,'81 × 3 = 243 ms under the stated serial model.'),choice('q3','LIMIT 20 after a one-to-many join always returns 20 parents:',['True','False'],'False','It limits joined result rows unless the query deliberately preserves parent pagination.'),open('q4','Why compare estimated and actual row counts?','A large divergence identifies where the planner’s data model differs from observed workload, affecting subsequent operator choices.','Investigate statistics, skew, and correlations before forcing a plan.'),open('q5','What can make a small response expensive?','Scanning or sorting many discarded rows, repeated lookups, lock/pool waits, or large one-to-many intermediate results.','Returned row count alone does not measure work.')],flashcards:cards([['EXPLAIN versus ANALYZE?','Plan estimates versus executing and observing the statement.'],['Planner cost units?','An optimizer model, not elapsed milliseconds.'],['Selectivity?','Fraction of the relevant row population matching a predicate.'],['N+1?','One collection query followed by one extra query per result, often amplified further.'],['One-to-many pagination risk?','LIMIT may count expanded joined rows rather than parent entities.'],['Useful plan discrepancy?','A large estimated-versus-actual row mismatch at a work-producing node.']]),mentalModel:'Count work at every level: requests, queries, loops, scanned rows, joined rows, and waits.',sources:[refs.explain]});
