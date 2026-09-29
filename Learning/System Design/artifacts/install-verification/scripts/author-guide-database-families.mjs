import {guide,sec,diag,choice,open,cards,terms,source} from './guide-worker-utils.mjs';
const visual=(sectionId,...args)=>({...diag(...args),sectionId});
guide('database-families',{
summary:'Understand what relational, document, key-value, wide-column, and graph databases make convenient by asking each one concrete questions.',
objectives:['Read a small example in each database family.','Connect a data shape to its recurring queries.','Explain why flexible documents still need rules.','Distinguish graph traversal from ordinary related rows.'],
terms:terms([['Data model','The way records and their relationships are represented.'],['Access pattern','A question or update the application performs repeatedly.'],['Document','A record containing named fields, possibly with nested records and lists.'],['Key-value pair','A label and the value retrieved using that label.'],['Partition key','A value used to group related records and determine their placement.'],['Graph traversal','Following relationships from one record to connected records.']]),
retrieval:['How does an owner identifier connect a note to a user?','What changes when a query needs twenty matching records instead of one known identity?'],
sections:[sec('start','Begin with five questions, not five logos',`
Pocket Notes has users, notes, labels, and photos. We might ask for one note by its identity, a user’s newest notes, all notes carrying a label, recent editing events, or every note linked to a particular research topic. These questions can describe the same product while asking the storage system to do different work.

A database family describes a useful way to organize and operate on data. It does not determine every feature of every product. Think of organizing a workshop: drawers work well for labeled parts, a project box keeps related materials together, and a wall map shows connections. The analogy helps explain organization; it does not tell us anything about database speed, durability, or concurrent updates.

This chapter compares organizations. We will not deploy five databases. A modest application can often answer all its initial questions with one well-chosen database. Learning alternatives helps recognize a new requirement, rather than giving us a shopping list.
`),sec('relational','Relational tables connect facts through keys',`
Our users table has user_id and display_name. The notes table has note_id, owner_id, and title. Each row represents one record. The owner_id value connects a note to a user. A query can filter notes, order them, and join matching user information into the result. A join combines related facts for a question; it does not permanently glue the tables together.

Suppose user 7 is Maya, and notes 41 and 42 belong to her. To display her notes with her current name, match their owner_id to the users table. Renaming Maya changes one user record. Both notes still point to the same identity and display the new name when queried.

This organization is convenient when many questions combine relationships or filter records in different ways. Constraints can reject invalid stored relationships, and transactions can group supported changes. Neither feature chooses business rules for you. The application must still ask the right question and enforce the caller’s permission.
`),sec('documents','Documents keep a bounded record together',`
A document store could represent a note like this:

~~~json
{"note_id":41,"owner_id":7,"title":"Garden",
 "labels":["home","summer"],"photo":{"key":"photos/p81","width":1200}}
~~~

The photo field is nested: it contains a smaller record inside the note. If opening one note commonly needs these fields together, that shape is convenient. Different note types might carry different optional fields. A checklist could have items; a photo note could have dimensions.

Flexible does not mean rule-free. Require a valid owner, reject nonsensical dimensions, and define how older readers handle new fields. An unlimited edit history embedded in one note keeps growing, making reads and updates expensive or exceeding product limits. Give independently growing information its own records when appropriate. Referencing another document is also possible; embedding everything is not the definition of a document database.
`),sec('keyvalue','A known key is a very specific question',`
Imagine a labeled drawer: note:41 points to a saved value. A basic key-value operation asks “give me the value for this exact label.” Another replaces that value. The application must know or derive the key before looking it up. Keys should include the scope that makes them unique, such as an account identity when identifiers repeat across accounts.

This is attractive for a lookup such as session:abc, where abc is an opaque session identity. It is less directly expressive for “find every note edited yesterday by members of this team.” A product may offer indexes or richer structures, or the application may maintain another mapping. Those capabilities have costs and consistency rules; they do not arise from the key-value label alone.

Redis is one example with useful structures beyond plain values. We will learn its commands and failure behavior separately. A key-value store is not necessarily a temporary cache: whether data is replaceable depends on the application’s role for that store.
`),sec('widecolumn','Wide-column models organize a known range of records',`
Consider a growing history of note edits. The frequent question is “show edits for owner 7 on this date, newest first.” A Cassandra-style model can group rows by an owner-and-date partition key and order records inside that group using an edit time plus an identity to distinguish ties.

The partition is a collection of related rows, not a requirement to draw a table with thousands of visible columns. The important idea is planning the grouping and order around a query. Requesting one owner’s day can then target a known group. Asking for all failed edits across all owners may need a differently organized table or another supported access path.

Dates bound growth only if the chosen time window fits the actual workload. One extremely busy owner can still create a large or busy partition. This family should also not be confused with a column-oriented analytics engine, which stores column values efficiently for analytical scans. Similar words describe different design decisions.
`),sec('graph','Graphs make paths through relationships explicit',`
Suppose notes link to topics, topics cite papers, and papers refer to other papers. The question becomes “starting at this topic, which related papers can I reach in two steps?” In a property graph, nodes represent things such as notes or papers. Relationships connect them and can have a name and properties. A traversal follows those connections under a query’s rules.

An ordinary ownership relationship alone does not require a graph database. Relational tables can represent edges and answer many relationship queries too. A graph model becomes interesting when multi-step paths are central, variable, and worth evaluating with representative data.

Bound the traversal. “Follow every connection forever” can visit enormous parts of a graph or repeatedly encounter cycles. State direction, permitted relationship types, depth, and result limits. Also check access: a private paper should not become visible merely because a public note points toward it. Convenient navigation does not erase permission boundaries.
`),sec('compare','Ask the same product different questions',`
Compare these candidate fits without turning them into absolute rules:

| Repeated question | Natural organization to investigate | What still needs thought |
| --- | --- | --- |
| Notes with their owners and team permissions | Related tables | Indexes, joins, transaction boundaries |
| One note with bounded nested settings | Document | Validation, update conflicts, record growth |
| Value for an already-known session identity | Key-value | Expiration, loss behavior, alternate queries |
| One owner’s ordered events in a time window | Wide-column grouping | Partition size, skew, other access paths |
| Paths from a topic through related papers | Graph | Traversal bounds and authorization |

These are starting hypotheses. Real products overlap. PostgreSQL can store JSON; a document database can support transactions; a key-value product may expose secondary indexes. Investigate the exact features and guarantees needed. “SQL is always correct” and “NoSQL is always fast” replace reasoning with slogans.
`),sec('ai','Worked example: an AI deployment registry',`
An AI platform runs model deployments. A deployment is a configured running instance of a model. Our registry records deployment identity, owning team, region, status, model version, and resource settings. First question: “Which failed deployments belong to my team?” Second: “Open this deployment’s full configuration.” Third: “Show configuration changes for this deployment during the last hour.”

Start with related team and deployment tables for ownership and filtering. A nested JSON settings field can hold differing CPU and GPU configuration shapes, with validation. That single database may satisfy the first two questions well; nested settings alone do not force a separate document product.

If measured event volume later makes the third question difficult, evaluate a separately organized event history keyed by deployment and time window. If the platform instead needs multi-step dependency impact—models using datasets produced by jobs—evaluate a graph representation of those dependencies. Each addition answers a concrete question and introduces another copy or store to operate. The word AI does not automatically determine the database family.
`),sec('practice','Change a requirement and watch the tradeoff',`
Try a small decision exercise. A configuration service initially retrieves a whole record by deployment identity. A key-based or document model is plausible. Then operators require searching all deployments by team, region, status, and model version. The old direct lookup is still useful, but it no longer explains the whole workload.

List the new questions, candidate indexes or derived views, update frequency, and required freshness. Compare expanding the existing store with choosing a relational model. Do not silently promise arbitrary filtering without identifying how the records will be found. Conversely, do not migrate simply because a new query exists; measure its size and frequency.

Common mistakes are equating a family with one brand, treating nested data as proof that SQL cannot work, and choosing a scalable write path without checking required reads. Your checkpoint is to explain one convenient query and one awkward query for each family. A well-understood boundary is more valuable than memorizing five product names.
`)],
diagrams:[visual('compare','questions','Choose an organization from the question',`flowchart TB
Q[What question repeats?] --> R[Combine related records]
Q --> D[Read bounded nested record]
Q --> K[Find one known key]
Q --> W[Read one grouped ordered range]
Q --> G[Follow relationship paths]
R --> RT[Investigate relational tables]
D --> DT[Investigate documents]
K --> KT[Investigate key-value]
W --> WT[Investigate wide-column model]
G --> GT[Investigate graph model]`,'These are candidate fits, not exclusive features or automatic product choices.',['Write the question in ordinary language.','Identify the lookup, grouping, or traversal it needs.','Consider an organization that supports that work.','Check update rules and operational costs before choosing.']),visual('graph','paths','Following a relationship is different from fetching one known key',`flowchart LR
T[Topic: useful model evaluation] -->|discussed in| N[Note 41]
N -->|cites| P[Paper A]
P -->|cites| B[Paper B]
P -->|cites| C[Paper C]`,'Original illustrative graph. A query needs an allowed starting point, relationship types, and a depth limit.',['Start at the permitted topic.','Follow the discussed-in relationship to a note.','Follow its citation to a paper.','Stop or continue only according to the query’s depth and access rules.'])],
exercise:{minutes:12,prompt:'For an AI deployment registry, list a candidate organization for: opening a known configuration, filtering by team and status, and exploring three levels of dataset dependencies. Explain why these questions do not necessarily require three deployed products.',rubric:['Matches organizations to specific questions.','Recognizes overlapping product capabilities.','Names costs or limits of adding another store.'],solution:'A known configuration fits a key lookup or document, while team/status filtering and ownership fit relational tables with suitable indexes. Dependency paths invite a graph representation with bounded traversal. One relational database may meet all initial needs, including JSON settings and edge tables. Evaluate actual query costs before adding products; each additional store brings synchronization, recovery, permission, and operating work.'},
questions:[choice('q1','Does a nested configuration automatically require a document database?',['Yes','No'],'No','Relational products can support structured JSON and other representations; choose from the full workload.'),choice('q2','What must a basic key-value lookup already know?',['The value’s key','Every row in the store','The database password of every user'],'The value’s key','The key tells the store which value to retrieve.'),choice('q3','Which question most directly suggests evaluating graph traversal?',['Fetch known note 41','Find papers reached through three citation relationships','Store one image byte sequence'],'Find papers reached through three citation relationships','It asks for paths through connected records.'),open('q4','Why plan a wide-column partition around a query and bounded growth?','Grouping controls which records a request can target and how much work one partition accumulates; poor grouping can scatter reads or create a hotspot.','State both convenient retrieval and the busy-partition risk.'),open('q5','What rules remain necessary in a flexible document?','Required fields, types or valid shapes, ownership, size limits, version compatibility, and update-conflict behavior.','Flexible storage does not define the application’s correctness rules.')],
flashcards:cards([['Family versus product?','A family describes an organization; exact products have overlapping features and different guarantees.'],['Document advantage?','Related bounded nested fields can be read together.'],['Basic key-value question?','What value belongs to this known key?'],['Wide-column modeling focus?','Grouping and ordering records for planned queries.'],['Graph traversal must bound?','Starting points, relationship types, direction, depth, and allowed results.']]),mentalModel:'Choose the organization that makes your recurring questions and updates understandable; check what becomes harder.',
sources:[source('PostgreSQL: JSON types','https://www.postgresql.org/docs/18/datatype-json.html'),source('MongoDB: data modeling','https://www.mongodb.com/docs/manual/data-modeling/'),source('Redis: data types','https://redis.io/docs/latest/develop/data-types/'),source('Apache Cassandra: logical data modeling','https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/data-modeling_logical.html'),source('Neo4j: graph database concepts','https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/')]
});
