import {readFileSync,writeFileSync} from 'node:fs';
import {save,sec as S,diag as D,choice as Q,num as N,open as O,cards as C} from './lesson-authoring.mjs';
const manifest=JSON.parse(readFileSync('content/manifest.json','utf8'));
const source=(title,url)=>({title,url,checked:'2026-09-29'});
const documents=source('MongoDB 8.3 — Data-modeling best practices','https://www.mongodb.com/docs/manual/data-modeling/best-practices/');
const dynamo=source('Amazon DynamoDB — Query key conditions','https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html');
const fulltext=source('Elastic — Full-text search','https://www.elastic.co/docs/solutions/search/full-text');
const refresh=source('Elastic — Near real-time search','https://www.elastic.co/docs/manage-data/data-store/near-real-time-search');
const graph=source('Neo4j — Graph database concepts','https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/');
const spatial=source('PostGIS — Spatial indexes','https://postgis.net/documentation/faq/spatial-indexes/');
const objects=source('Amazon S3 — User guide overview','https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html');
const wal=source('PostgreSQL 18 — Write-Ahead Logging','https://www.postgresql.org/docs/18/wal-intro.html');
const rocks=source('RocksDB — Overview','https://github.com/facebook/rocksdb/wiki/RocksDB-Overview');
const columns=source('ClickHouse — Columnar databases','https://clickhouse.com/resources/engineering/what-is-columnar-database');
const mysql=source('MySQL 8.4 — InnoDB and ACID','https://dev.mysql.com/doc/refman/8.4/en/mysql-acid.html');
const redis=source('Redis Open Source — Persistence','https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/');
const budget=S('session-budget','Core time and optional practice','Core 55 minutes: 5 retrieval, 18 explanation/diagrams, 8 worked example, 10 exercise, 10 Q1–Q3, 4 comparison/cards. Q4–Q5 and extension questions are optional. The examples use explicitly bounded data and do not establish vendor throughput, durability, or scaling claims.');

save('046',{objectives:['Identify aggregate boundaries from joint reads, writes, and invariants.','Distinguish key lookup, indexed queries, and scans.','Choose embedding or references using size, lifecycle, and update constraints.'],retrieval:['L032: which object owns the business invariant?','L037: how can a version check prevent a stale update?'],sections:[
S('problem','A convenient JSON shape can become a correctness trap',`A shopping service keeps a cart as one object keyed by cart ID. Most operations retrieve its line items together, and each edit changes a bounded set of lines. This is a plausible aggregate: data with a shared access and update boundary. The same team proposes embedding every order ever placed by a customer into that customer's profile. The second array grows without bound, changes independently, and must be queried by time and status. Similar JSON syntax hides very different workloads.

A key-value interface makes retrieval by a known key straightforward. A document model exposes named fields and may support secondary indexes and richer queries. Neither label implies that arbitrary fields are automatically indexed, that every update across records is atomic, or that schema design can wait indefinitely. Your model must state its actual operations and their costs.`),
S('mechanism','Draw the aggregate around a bounded responsibility',`Embedding is useful when related fields are read together, updated together, bounded in size, and share lifecycle. References are useful when related records have independent lifecycles, many-to-many relationships, high cardinality, or a growth pattern that would make one record enormous. The choice is not normalization versus ignorance: an embedded historical shipping address can intentionally differ from a customer's current address because the historical snapshot means something else.

MongoDB documents describe single-document writes as atomic; multi-document transactions are available, but that does not remove the modeling cost of cross-record invariants. A cart total and cart items can fit one protected aggregate. Global available stock belongs to a different shared invariant: atomically editing a cart document does not reserve stock across all customers.

An index offers a specific access path at a maintenance and storage cost. In DynamoDB's Query API, the key condition fixes one partition-key value and can constrain the sort key; an arbitrary non-key predicate is not magically the same access path. A broad scan plus a filter can inspect far more data than the result count suggests. Name the examined candidate population, not only the ten records eventually returned.`),
S('trace','Two users edit one cart version',`The cart contains version 12 and three lines. Client A reads it and adds a book; client B reads the same version and changes a quantity. If both replace the whole document unconditionally, the last writer can erase the other's change. Use a conditional update on version 12, or an appropriate atomic operation whose invariant is clear. The first accepted replacement advances to version 13; the second detects a conflict and reloads/reconciles. This applies L037 at an aggregate boundary rather than assuming a document format removes races.

Assume carts are bounded to 50 lines, each encoded as 200 bytes plus a 2-KB header. The rough maximum payload is 12 KB before indexes and encoding details. Reading one cart is plausibly a bounded operation. An unbounded order-history array with 20,000 orders at 1 KB each is about 20 MB before overhead and grows forever. Even without quoting a vendor size limit, the bandwidth, contention, pagination, and independent-retention concerns already justify rethinking the boundary.

An order can embed the price and delivery address agreed at purchase time, while referencing mutable product and customer identities. Do not overwrite historical price snapshots because a product changes price today. Distinguish duplicated meaning from accidentally duplicated current truth.`),
S('model','Executable conditional-replacement model',`This single-threaded model illustrates conflict detection. A real engine must perform comparison and update atomically; copying this dictionary code into a concurrent server does not provide that property.

\`\`\`python
cart = {"version": 12, "items": {"book": 1}}

def replace(expected: int, items: dict[str, int]) -> bool:
    if cart["version"] != expected:
        return False
    cart["items"] = dict(items)
    cart["version"] += 1
    return True

assert replace(12, {"book": 2}) is True
assert replace(12, {"book": 1, "pen": 1}) is False
assert cart == {"version": 13, "items": {"book": 2}}
print("stale aggregate replacement rejected")
\`\`\`

Expected output is the printed sentence. Failure scenarios include partial updates of duplicated views, missed tenant predicates on secondary access paths, and hot aggregates serializing too many unrelated edits. Validation remains necessary even with flexible storage: distinguish absent, null, empty, and zero; version the meaning of fields used by multiple app releases.

Common misconceptions: a document is schemaless, a key-value store cannot have transactions, or choosing a document database means every business object should be one document. These are category labels; the actual boundary and configured operations determine the behavior. Optional practice: introduce cart sharing and a stock reservation, then state exactly which invariant crosses the cart boundary.`),budget],diagrams:[D('aggregate','One atomic aggregate does not cover every business rule',`flowchart LR
A[Client A expects v12] --> C[Conditional cart write]
B[Client B expects v12] --> C
C -->|First accepted: v13| D[(Bounded cart aggregate)]
C -->|Stale expected version| E[Conflict and reconcile]
D -.->|Separate invariant| S[(Shared stock authority)]`, 'Cart replacement and global inventory protection are separate mechanisms. The dotted arrow identifies a relationship, not an atomic cross-store commit.', ['Both clients read the same cart version.','One conditional replacement advances the version.','The stale replacement is rejected rather than erasing the accepted change.','Stock reservation still needs its own shared correctness boundary.'])],exercise:{minutes:10,prompt:'Model a customer profile, active cart, and immutable purchase history. Explain one embedding decision and one reference decision. A cart has a 2-KB header and at most 50 lines of 200 bytes: estimate its payload. Show the outcome of two whole-cart writes using the same expected version.',rubric:['Embed bounded jointly accessed cart lines; separate unbounded order history.','Keep historical prices/addresses meaningful snapshots.','Calculate 12 KB using decimal units and reject one stale replacement.'],solution:'Use a bounded cart aggregate with line items, a version, and clear ownership. Keep purchase history in separate order records indexed by customer and time, because it grows and has its own lifecycle. Embed immutable purchase-time price/address snapshots in each order while referencing current customer/product identities. Payload estimate is 2,000+50×200=12,000 bytes. With both clients expecting version 12, one atomic conditional replacement succeeds and increments to 13; the second fails its condition and must reconcile. This does not establish a global stock reservation guarantee.'},questions:[Q('q1','Which is a strong reason to reference records instead of embedding all of them?',['Unbounded child growth and independent lifecycle','The data has a string field','References always eliminate network calls'],'Unbounded child growth and independent lifecycle','A giant shared aggregate can create size, contention, access, and retention problems.'),N('q2','A 2,000-byte header plus 50 lines of 200 bytes totals how many bytes?',12000,'bytes',0,'2,000 + 50×200 = 12,000 bytes before encoding/index overhead.'),Q('q3','Does an atomic cart-document update alone reserve global product stock?',['Yes','No; global stock is a separate shared invariant','Only if JSON is used'],'No; global stock is a separate shared invariant','Atomicity covers a stated operation boundary, not every related entity.'),O('q4','Why can copying a historical address be correct rather than inconsistent duplication?','It records the address agreed for that order, a different fact from the customer’s current address.','First identify meaning and lifecycle; equal-looking values need not represent the same mutable truth.'),O('q5','Why can a filter returning ten records still be expensive?','It may inspect a much larger candidate set if the predicate lacks a suitable access path.','Result count does not equal work examined. Use keys/indexes and inspect execution behavior.')],flashcards:C([['Aggregate boundary?','A bounded unit of related reads, writes, and invariant ownership.'],['Embed when?','Joint access/update and bounded shared lifecycle justify it.'],['Reference when?','Independent lifecycle, large cardinality, or flexible cross-record access outweighs embedding.'],['Conditional document replacement?','Accept only the expected version, then advance it atomically.'],['Historical price copy?','Often a deliberate purchase-time fact, not a stale copy of today’s price.']]),mentalModel:'Choose the atomic and access boundary first; a convenient document shape is only its representation.',sources:[documents,dynamo]});

save('047',{objectives:['Explain how inverted postings differ from a row-by-row substring scan.','Trace token analysis, candidate retrieval, ranking, and visibility.','Separate searchable freshness from authoritative durability and authorization.'],retrieval:['L033: how does an index avoid examining every row?','L041: why are accepted persistence and visible results distinct events?'],sections:[
S('problem','Find relevant documents without reading every document',`A support team searches a million incident reports for “payment timeout.” Scanning every full body for every query is expensive, and raw substring matching treats punctuation, word forms, and relevance poorly. An inverted index maps a term to the documents that contain its analyzed representation. For the two-term query, the engine can combine candidate lists instead of reading every body.

Retrieval and ranking are separate. Retrieval chooses plausible candidates under the query semantics. Ranking orders them using a declared relevance model and signals. A high score means useful according to that model; it is neither a factual correctness guarantee nor proof that a document is current or authorized for the caller.`),
S('mechanism','Analyze both sides of the lookup',`An analyzer can tokenize text, normalize case, and apply language-specific transformations. The index records terms, document IDs, and often positions or frequencies. Query analysis must be compatible with the indexed representation. A keyword field used for exact identifiers should not necessarily use the same transformations as a prose field. Lowercasing may be reasonable for a title and wrong for a case-sensitive credential or opaque identifier.

For AND semantics, intersect postings; for OR, union them. Phrase search requires positional information rather than mere co-occurrence. Ranking may account for term frequency, document length, rarity, business signals, or a learned model. This lesson's toy intersection intentionally does none of that. An API must say whether filters, ranking, and pagination create a stable experience under concurrent index updates.

Search engines often make accepted changes searchable through a refresh of search-visible structures. Elastic describes this as near real-time search; its configured refresh behavior is not a universal one-second promise. Persistence, replication, and search visibility have distinct mechanisms. A database row may already be authoritative while the derived search index still lacks it. The UI can show “saved, indexing” rather than claiming the write vanished.`),
S('worked','A tiny original index with inspectable behavior',`These three reports use intentionally simple whitespace tokens. Punctuation handling, stemming, stop words, phrase positions, deletion, concurrency, and relevance are omitted. Run the complete Python block to inspect the mechanism.

\`\`\`python
from collections import defaultdict

documents = {1: "payment timeout retry", 2: "payment approved",
             3: "image timeout retry"}
postings: dict[str, set[int]] = defaultdict(set)
for document_id, text in documents.items():
    for term in set(text.lower().split()):
        postings[term].add(document_id)

def search_all(query: str) -> list[int]:
    terms = query.lower().split()
    if not terms:
        return []
    sets = [postings.get(term, set()) for term in terms]
    return sorted(set.intersection(*sets))

assert search_all("payment timeout") == [1]
assert search_all("timeout retry") == [1, 3]
assert search_all("payments") == []  # no stemming is implemented
print(search_all("payment timeout"))
\`\`\`

Expected output is [1]. For a phrase “timeout payment,” report 1 contains both words but not in that order; our AND function would still return it. That is a query-contract mismatch, not an inverted-index failure. Supporting phrases requires stored positions and a different predicate.

If an index contains 2 million documents with 120 distinct indexed terms each, it has roughly 240 million term-document associations before positional/frequency data, dictionaries, and compression. This estimate is not 240 million separate disk reads; compressed posting lists and skip structures change access work. High-frequency terms produce much larger candidate sets than rare identifiers.`),
S('failure','A searchable copy is a new lifecycle responsibility',`Suppose report 1 changes from public to private in the source database while its indexed access fields lag. Search snippets can leak content if authorization trusts only the stale copy. Use a visibility design that meets the product's security contract: enforce access at the appropriate authoritative boundary and avoid revealing unauthorized snippets before filtering. Measure index lag and define deletion/update propagation, reconciliation, and rebuild procedures. Later modules cover reliable event propagation.

A missing recent document may reflect ingestion delay, refresh delay, analyzer mismatch, a query filter, or stale pagination—not necessarily lost storage. Investigate each boundary with document ID, source version, ingest status, and searchable version. Deleting a source row without deleting its indexed representation leaves stale content behind.

Common misconceptions: a search score proves truth, refreshing makes a cross-system update atomic, or adding Elasticsearch/OpenSearch means the source database is unnecessary. Search can own data in some designs, but that choice must explicitly carry transactional, audit, authorization, and recovery responsibilities. For a modest text corpus, existing database full-text features may be the simpler baseline. Add a separate search service only when its query behavior and operational burden are justified.`),budget],diagrams:[D('search-path','Accepted data and searchable data have different boundaries',`flowchart LR
W[Document write] -->|Commit| D[(Authoritative document store)]
D -.->|Versioned projection update| A[Analyzer]
A --> P[(Derived postings and fields)]
P -->|Refresh visibility| V[Searchable view]
Q[User query] --> QA[Compatible query analysis]
QA -->|Candidate terms| V
V --> R[Rank and enforce visibility contract]
R --> O[Authorized results]`, 'The dashed projection edge is asynchronous in this exercise. Permission changes must not rely on an unspecified stale index for a strict access guarantee.', ['Persist the authoritative document and its version.','Analyze and update a derived representation.','Make that representation visible to search.','Retrieve, rank, and apply the required authorization contract before exposing content.'])],exercise:{minutes:10,prompt:'Your write API confirms a report immediately, but search finds it only later. List three boundaries to inspect. Then explain why changing a report from public to private needs more than eventually deleting a search result. For the provided Python model, distinguish AND search from phrase search.',rubric:['Separate source persistence, projection ingestion, and searchable refresh.','Prevent unauthorized snippets/results during stale-index windows.','Use positions for phrase order, not just posting intersection.'],solution:'Record the source commit/version, projection ingestion checkpoint/version, and search-visible version after refresh. Confirm query analysis and filters as additional possibilities. A public-to-private update can leave indexed text visible temporarily; a strict authorization contract must prevent exposure at response/snippet construction or coordinate visibility conservatively until the permission change is enforced. Eventual cleanup alone admits an unauthorized window. The toy AND search only proves every query term occurs somewhere; phrase search needs positions and adjacency/order checks. Refreshing one index cannot atomically commit another database.'},questions:[Q('q1','What does an inverted index map?',['Each term to candidate documents or occurrences','Each user to a server only','Every row to its physical RAM address'],'Each term to candidate documents or occurrences','The mapping reverses document-to-terms into term-to-documents for selective retrieval.'),Q('q2','What extra information does phrase matching need beyond term co-occurrence?',['Word positions/order','Only document count','A larger Boolean flag'],'Word positions/order','Both terms can occur in different places or reversed order without forming the requested phrase.'),N('q3','Two million documents × 120 distinct indexed terms gives how many million term-document associations?',240,'million associations',0,'2×120=240 million before positions, dictionaries and compression.'),O('q4','Can a successful write be durable but not searchable yet?','Yes, projection ingestion and refresh visibility may occur after the authoritative write.','Investigate each boundary and state the user-visible freshness contract.'),O('q5','Why is a stale permission field dangerous?','It can admit a document or snippet after access was revoked; enforce the required authorization before disclosure.','Search freshness is allowed to vary only within a defined correctness and security contract.')],flashcards:C([['Inverted index?','Terms point to matching documents or occurrences.'],['AND query?','Intersect candidate postings for all required terms.'],['Phrase query?','Check positions and ordering, not just co-occurrence.'],['Index refresh?','Makes newly indexed structures searchable; not a cross-system transaction.'],['Search ranking versus authority?','Relevance orders candidates; correctness, freshness, and authorization need their own contracts.']]),mentalModel:'Search is analyzed retrieval over a particular visible copy; relevance, recency, and authority are separate questions.',sources:[fulltext,refresh]});

save('048',{objectives:['Distinguish relationship traversal from exact-key and spatial search.','Bound graph exploration and identify high-degree expansion.','Use a spatial prefilter followed by the correct exact distance predicate.'],retrieval:['L031: what query does an index or model need to serve?','L034: why can a selective starting point change a query plan?'],sections:[
S('problem','“Near” can mean connected or geographically close',`A platform engineer asks which services depend on a failing database within two dependency hops. A dispatcher asks which couriers are within two kilometers of a restaurant. Both questions use “near,” but the first concerns relationships and the second concerns geometry. A hash lookup alone does not express either relation.

A property graph models entities as nodes and typed relationships as edges, with properties on both. A traversal follows selected edges under bounds. A relational adjacency table and recursive query can also answer graph-shaped questions; the presence of relationships does not force a new database. Choose a specialized graph engine when its access model, workload, and operating tradeoffs earn the extra system.`),
S('mechanism','A traversal needs a starting set, direction, and stopping rule',`For the dependency question, represent service → depends_on → dependency. Starting at a failed database and finding impacted services requires following incoming dependency edges, not blindly following the stored direction. Limit hop depth, track visited nodes where appropriate, and decide whether repeated paths or distinct reachable nodes are wanted. Cycles such as A→B→A otherwise cause infinite traversal or duplicate work in a naive algorithm.

If the average branching factor were 30 and there were no overlaps, three expansions could examine roughly 30+900+27,000=27,930 neighbor appearances. Real graphs have skew, cycles, and repeated vertices, so this is a warning model rather than an exact forecast. A high-degree hub can dominate even a small graph. Restrict relationship type, tenant, time/version, and depth before expanding whenever those predicates are semantically valid.

Spatial search commonly uses an index to prune by bounding regions, followed by an exact geometric predicate. A rectangular bounding box around a circle includes points outside the radius. Latitude/longitude degrees are not meters; the correct type, coordinate reference system, units, and distance model matter. PostGIS documents index-aware predicates such as ST_DWithin. Whether a query uses an index should be checked in its plan, not assumed from the presence of spatial columns.`),
S('worked','A bounded reverse-dependency traversal',`The following Python example returns distinct affected nodes up to a hop bound, excluding the failed starting node. It uses an explicitly prepared reverse adjacency list and visits a vertex once. It is a single-process graph model, not a distributed service registry.

\`\`\`python
from collections import deque

dependents = {"db": ["api", "worker"], "api": ["web"],
              "worker": ["api"], "web": ["api"]}

def affected(start: str, max_hops: int) -> set[str]:
    seen = {start}
    queue = deque([(start, 0)])
    while queue:
        node, depth = queue.popleft()
        if depth == max_hops:
            continue
        for dependent in dependents.get(node, []):
            if dependent not in seen:
                seen.add(dependent)
                queue.append((dependent, depth + 1))
    return seen - {start}

assert affected("db", 1) == {"api", "worker"}
assert affected("db", 2) == {"api", "worker", "web"}
assert affected("db", 8) == {"api", "worker", "web"}
print(sorted(affected("db", 2)))

\`\`\`

Expected output is ['api', 'web', 'worker']. The visited set prevents the api/web cycle from expanding indefinitely. This query answers reachability, not whether each service actually fails: retries, redundancy, cached state, and optional dependencies affect real impact. The topology's freshness is another explicit assumption.`),
S('spatial','The candidate box is not the final answer',`In an illustrative flat plane measured in kilometers, the search center is (0,0) with radius 2. The box −2≤x≤2 and −2≤y≤2 includes point (1.9,1.9), but its Euclidean distance is about 2.69 km, so the exact radius test rejects it. The box reduces work; it does not establish the final predicate. On Earth, use an appropriate geospatial library and type instead of treating this planar arithmetic as universally correct.

A PostGIS-oriented query sketch can use a geography column and ST_DWithin(location, query_point, 2000), where the selected geography semantics interpret distance in meters. Its table setup, extension, index, and query plan must be checked in a real database; the snippet is conceptual until those dependencies exist.

Failure scenarios include reversed relationship direction, an unbounded fan-out, a stale graph snapshot, degree-versus-meter confusion, and disclosing cross-tenant locations during candidate gathering. Authorization should constrain exposed results and intermediate data appropriately. Common misconceptions are that graph databases make every graph query cheap and that an index result is always exact. Indexes remove impossible work; the requested semantics still determine the answer.`),budget],diagrams:[D('graph-spatial','Different notions of neighborhood require different predicates',`flowchart LR
D[(Failed database)] -->|Reverse dependency| A[API]
D -->|Reverse dependency| W[Worker]
A -->|Second hop| U[Web UI]
W -->|Repeated node| A
Q[Location query] --> B[Bounding-region candidate filter]
B --> E[Exact distance predicate]
E --> R[Authorized within-radius results]`, 'The graph arrows show reverse dependency traversal for impact analysis. The spatial pipeline is a separate access pattern, not an edge relationship between services and couriers.', ['Start graph traversal from a selective known node and the correct edge direction.','Bound hops and prevent repeated expansion of cycles.','For locations, let a spatial region prefilter reduce candidates.','Apply the exact coordinate-aware predicate before returning results.'])],exercise:{minutes:10,prompt:'A dependency graph has A→B and B→A, where arrows mean depends on. Explain how to find unique dependents of B within two hops without looping. Separately, decide whether (1.9,1.9) lies within radius 2 of (0,0) in a flat kilometer coordinate system, despite passing the bounding box.',rubric:['Traverse incoming dependencies with a visited set and depth limit.','Distinguish unique vertices from all paths.','Compute distance √7.22≈2.687 and reject the spatial false positive.'],solution:'Use reverse edges from dependency to dependent, start with B visited, and expand only while depth is below two. A is reached and B is not re-expanded when the cycle returns. Return distinct vertices excluding the starting failure; a paths query would have different output semantics. For the location, x²+y²=1.9²+1.9²=7.22, greater than radius²=4, so it is outside. A rectangular index prefilter can include it safely only if the final exact predicate rejects it. The planar example does not define Earth-distance semantics.'},questions:[Q('q1','What prevents an unbounded naive traversal around a cycle?',['More RAM alone','A visited policy and a stopping bound appropriate to the query','Alphabetical node names'],'A visited policy and a stopping bound appropriate to the query','The traversal must state whether it counts paths or unique vertices and when to stop.'),Q('q2','Does a rectangular bounding-box match prove within-circle distance?',['Yes','No, corner candidates may be outside the radius','Only with an SQL database'],'No, corner candidates may be outside the radius','The box is a useful superset used for pruning, followed by the exact predicate.'),N('q3','A no-overlap branching model of 30 per hop across three hops visits how many neighbor appearances?',27930,'neighbor appearances',0,'30+30²+30³ = 27,930, excluding the start node.'),O('q4','Why can a two-hop query still be expensive?','A high-degree starting node or intermediate hub can produce a huge candidate set.','Depth bounds do not bound degree; query-selective predicates and cardinality estimates still matter.'),O('q5','Why does reachable dependency not prove actual user-visible outage?','Redundancy, optional calls, caches, and runtime state can change impact; graph topology is only one input.','A structural model must not be presented as a complete operational failure measurement.')],flashcards:C([['Traversal contract?','Starting set, edge direction/type, stopping rule, and path-versus-vertex semantics.'],['High-degree graph risk?','Even a few hops can expand an enormous neighborhood.'],['Spatial box role?','Reject impossible candidates cheaply; exact geometry decides the final answer.'],['Latitude/longitude units?','Angular degrees, not automatically meters.'],['Graph database necessary for every relationship?','No. Relational adjacency models may be an adequate simpler baseline.']]),mentalModel:'A neighborhood is a predicate with direction, units, bounds, and freshness—not merely a picture of connected things.',sources:[graph,spatial,source('PostGIS — ST_DWithin semantics','https://postgis.net/docs/ST_DWithin.html')]});

save('049',{objectives:['Distinguish block, file, and object interfaces without inferring every guarantee from the category.','Separate large immutable content from transactional metadata.','Trace partial failures when content and metadata have different authorities.'],retrieval:['L006: how do object count, size, retention, and bandwidth affect storage?','L036: what lies inside one atomic transaction?'],sections:[
S('problem','A thumbnail is not a row-shaped business fact',`A document portal stores 2-MB PDFs along with ownership, title, permissions, and upload status. Keeping everything in one database may be a valid small-scale baseline, especially if it simplifies atomicity and backups. As blob volume dominates, the database's backup, replication, and query paths may move many bytes irrelevant to a metadata query. Separating content from metadata can change that cost—but introduces a second consistency boundary.

Do not choose object storage solely because files are large. Identify read/write patterns, mutability, range access, access controls, lifecycle, latency, recovery, and transaction needs. A storage interface is a contract for addressing and manipulating bytes, not a universal answer about reliability or speed.`),
S('interfaces','Three levels of meaning over bytes',`Block storage exposes addressable blocks to a host; the host typically builds a filesystem or database layout above it. File storage exposes hierarchical paths and file operations with filesystem/protocol semantics. Object storage exposes objects addressed by keys through an API, commonly with whole-object creation/replacement, metadata, range reads, and provider-specific lifecycle features. Capabilities such as conditional writes, versioning, consistency, and rename semantics must be checked for the actual implementation.

An object key that contains slashes may resemble a path without providing atomic filesystem directory rename. Conversely, attaching a block volume to a host does not itself implement a multi-writer shared filesystem. The layers can be composed, but translating APIs does not magically preserve every semantic expectation.

For our portal, a relational metadata row can own document ID, tenant ID, owner, content key/version, byte count, digest, state, and creation time. The object store owns the content bytes. A key is an address, not permission: the read path must authenticate and authorize before exposing content or an appropriately scoped temporary read capability. Never infer privacy merely from a hard-to-guess object name.`),
S('trace','Publish only after verifying the object',`A simple state machine begins with a metadata row in pending state and a unique upload ID. The client uploads bytes to a restricted staging key, or the application streams them under explicit limits. The service verifies expected size and digest, checks that the object version is available under the storage contract, and atomically changes the metadata row to ready with that immutable key/version. Readers expose only ready documents. Repeating completion for the same upload ID must return the same accepted document or detect a conflict.

This is not an atomic transaction across arbitrary database and object APIs. If the object upload succeeds but metadata finalization fails, an orphan object may remain. A reconciliation/cleanup job can remove unreferenced expired staging objects after a safe grace period. If metadata points to content before upload completes, readers can see a broken document; the ready transition order prevents that particular failure. Object deletion and permission revocation also need explicit ordering rather than two unrelated best-effort writes.

Suppose 100,000 documents/day average 2 MB and are retained for 90 days. Raw content is 18 TB decimal before versions or redundancy. At 600 bytes of metadata per document, the 9-million-document catalog is 5.4 GB raw before indexes and overhead. This difference can motivate separation, but does not by itself establish transaction rates, bandwidth peaks, or a vendor bill.`),
S('exercise-model','Executable state transition, with a deliberately narrow claim',`The following model validates publication against an in-memory object dictionary. It does not model real transfer, authentication, durable transactions, or atomicity across storage systems.

\`\`\`python
from hashlib import sha256

objects: dict[str, bytes] = {}
row = {"state": "pending", "key": "tenant7/upload9", "bytes": 3,
       "digest": sha256(b"abc").hexdigest()}

def ready() -> bool:
    data = objects.get(row["key"])
    if data is None or len(data) != row["bytes"]:
        return False
    if sha256(data).hexdigest() != row["digest"]:
        return False
    row["state"] = "ready"
    return True

assert ready() is False
objects[row["key"]] = b"bad"
assert ready() is False
objects[row["key"]] = b"abc"
assert ready() is True
assert ready() is True
print("only verified content becomes ready")
\`\`\`

Expected output is the printed sentence. In a real service, immutable object identity/version and the metadata update's concurrency guard prevent another writer from swapping bytes between verification and publication. A digest detects mismatch under its assumptions; it is not authorization, a signature of who uploaded, or proof that the content is safe to execute.

Common misconceptions: object storage is always eventually consistent; every successful PUT atomically changes a database row; a file path and object prefix have identical rename semantics; and deleting metadata immediately reclaims all retained object versions. Verify the selected provider's actual guarantees and lifecycle. Optional depth: design a garbage-collection grace period that does not remove a slow but still-valid upload.`),budget],diagrams:[D('blob-publish','Two authorities, one visible ready transition',`sequenceDiagram
participant C as Authorized client
participant A as Upload service
participant M as Metadata authority
participant O as Object bytes
C->>A: Create bounded upload
A->>M: Insert pending upload ID
C->>O: Upload to restricted staging key
C->>A: Complete upload ID
A->>O: Verify bytes and immutable version
O-->>A: Verified object identity
A->>M: Conditional pending to ready
A-->>C: Document ready
Note over M,O: Orphans need reconciliation; no shared atomic commit`, 'The user-visible ready state is committed after content verification. The two stores still need cleanup and recovery rules for partial failures.', ['Create a pending upload with ownership and limits.','Transfer bytes without making the document readable.','Verify the exact immutable content identity.','Commit ready metadata, while retaining an orphan-cleanup strategy for earlier failures.'])],exercise:{minutes:10,prompt:'Draw the two partial-failure cases for an upload: object exists but metadata finalization failed; metadata says ready but content is absent. Propose ordering and cleanup rules that prevent broken reads without claiming an atomic cross-store transaction. Estimate 90-day raw bytes for 100,000 daily uploads of 2 MB.',rubric:['Publish ready only after checking a stable content version.','Treat orphan cleanup as idempotent, bounded, and grace-period aware.','Compute 18 trillion bytes while excluding replication/versions explicitly.'],solution:'100,000×2,000,000×90=18,000,000,000,000 bytes, or 18 decimal TB. Create pending metadata, upload a unique immutable object, verify its identity/size/digest, then atomically mark metadata ready. A failure before ready may leave a hidden orphan, which a reconciliation process can collect after ownership checks and an expiry grace period. Never publish a mutable key whose bytes can be swapped after verification. Readers accept only ready metadata and still handle storage unavailability as a service failure rather than silently returning wrong content. This orders a workflow; it is not a transaction across both systems.'},questions:[Q('q1','What does an object key alone establish?',['An object address, not access permission','A user’s authorization','A cross-store transaction'],'An object address, not access permission','Authorization is a separate policy and enforcement step.'),N('q2','100,000 daily uploads × 2 MB × 90 days gives how many decimal TB?',18,'TB',0,'100,000×2,000,000×90 / 10^12 = 18 TB before versions and redundancy.'),Q('q3','Which visibility order avoids publishing an incomplete upload?',['Ready metadata first, upload later','Verify stable uploaded content, then mark metadata ready','Return success before storing either'],'Verify stable uploaded content, then mark metadata ready','It may leave recoverable hidden orphans but avoids this particular ready-without-content race.'),O('q4','Why can deleting metadata fail to reclaim all content storage?','Objects, versions, retention policies, and partial failures have separate lifecycles.','A cleanup/reconciliation contract must name what is removed and when.'),O('q5','When might keeping blobs inside the relational database be defensible?','For bounded volume and access patterns where simpler atomicity, operations, and backup outweigh blob overhead.','Architecture follows measured requirements; separation itself adds state and failure handling.')],flashcards:C([['Block interface?','Addressable blocks; a host manages higher-level filesystem/database meaning.'],['File interface?','Paths and file operations with filesystem/protocol semantics.'],['Object interface?','Key-addressed content through an API with implementation-specific guarantees.'],['Upload publication boundary?','Ready metadata should reference verified stable content.'],['Two-store partial failure?','Hidden orphan bytes or missing content require explicit ordering, recovery, and cleanup.']]),mentalModel:'Name who owns the bytes, who owns the business fact, and how they agree before the user sees success.',sources:[objects]});
