import {save,sec,diag,choice,num,open,cards} from './lesson-authoring.mjs';
export const refs={constraints:{title:'PostgreSQL 18: Constraints',url:'https://www.postgresql.org/docs/18/ddl-constraints.html'},indexes:{title:'PostgreSQL 18: Multicolumn indexes',url:'https://www.postgresql.org/docs/18/indexes-multicolumn.html'},cover:{title:'PostgreSQL 18: Index-only scans and covering indexes',url:'https://www.postgresql.org/docs/18/indexes-index-only-scans.html'},explain:{title:'PostgreSQL 18: Using EXPLAIN',url:'https://www.postgresql.org/docs/18/using-explain.html'},isolation:{title:'PostgreSQL 18: Transaction isolation',url:'https://www.postgresql.org/docs/18/transaction-iso.html'},locks:{title:'PostgreSQL 18: Explicit locking',url:'https://www.postgresql.org/docs/18/explicit-locking.html'},transactions:{title:'PostgreSQL 18: Transactions',url:'https://www.postgresql.org/docs/18/tutorial-transactions.html'}};

save('031',{
objectives:['Derive entities and relationships from concrete operations.','Choose stable identifiers and scoped uniqueness.','Separate data ownership from convenient representations.','Trace a query from API scope through relational keys.'],retrieval:['From L023: which response fields should not automatically be writable?','From L026: why must object IDs remain scoped to authorization?'],
sections:[sec('access','Start with questions the product must answer',`
Core 55 minutes: retrieval 5, mechanism 18, worked schema 8, exercise 10, questions 10, review 4. Design a university equipment-loan database. Required operations are: find a physical item by barcode, list a student's current loans, create a loan for an available item, and show an item's borrowing history. These operations reveal relationships more reliably than drawing a table for every noun in a product pitch.

Distinguish an equipment model from a physical item. “Microscope X” describes a kind of object; barcode CAM-0042 identifies one copy. A loan connects one physical item to one borrower over time. If the schema stores only a model name on a loan, it cannot establish which copy is held or whether that copy has two active borrowers.

Write the access paths with scope, predicate, order, and returned fields. “Current loans for borrower 9 in department 3, newest first, at most 50” is a designable query. “Make loan lookup fast” is not. Save these paths next to the schema so an index decision later has a workload to support.
`),sec('keys','Identity survives changes in description',`
A primary key identifies a row; a natural key is meaningful in the domain, such as an issued barcode; a surrogate key is an assigned identity without that business meaning. A surrogate key does not eliminate the need to enforce natural uniqueness where the product requires it. Names are usually poor identities because they can change or collide.

Decide the scope of uniqueness. A barcode may be unique across the institution or only within a department. If local uniqueness is intended, use the department together with the barcode. Likewise, a foreign key to an item ID alone may not prove that a loan's department matches the item's department. Model tenant or department scope in the relevant key relationship when it is part of the invariant.

One-to-many relationships belong naturally in references from the many side: many loans refer to one item. Many-to-many membership can use a linking table with a composite key to prevent duplicate membership. Avoid comma-separated ID lists for data you must join, constrain, or update independently; they make referential checks and partial updates harder.
`),sec('schema','An inspectable schema sketch',`
The following SQL is a relational pattern with explicit IDs supplied by the caller/test fixture. It is not a complete migration or production server. Its basic constructs can be exercised with SQLite in the forthcoming relational lab; PostgreSQL-specific concurrency examples are labeled separately.

~~~sql
CREATE TABLE items (
  department_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  barcode TEXT NOT NULL,
  description TEXT NOT NULL,
  PRIMARY KEY (department_id, item_id),
  UNIQUE (department_id, barcode)
);
CREATE TABLE loans (
  department_id INTEGER NOT NULL,
  loan_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  borrower_id INTEGER NOT NULL,
  opened_at TEXT NOT NULL,
  returned_at TEXT,
  PRIMARY KEY (department_id, loan_id),
  FOREIGN KEY (department_id, item_id)
    REFERENCES items(department_id, item_id)
);
~~~

The composite foreign key prevents a loan from referring to an item outside its declared department. The borrower relationship would need a corresponding scoped borrower table; leaving it out here is an explicit boundary of the sketch, not a recommendation to ignore user identity. In a real PostgreSQL schema use suitable timestamp types rather than the portable text representation shown for the small lab.

Trace GET current loans: derive the authorized department and borrower, select loans with that scope and returned_at IS NULL, order by opened_at and loan_id, and return a bounded page. The query's identity scope comes from trusted context. A foreign key supports referential integrity but does not itself authorize the requesting user.
`),sec('evolution','Separate current truth from recorded history',`
Should a loan display the item's current description or the description at borrowing time? The answer is a product decision. Joining the current item record reflects later corrections. Storing a description snapshot on the loan preserves the historical wording but duplicates data intentionally. Name the field accordingly so a future developer does not “fix” history by synchronizing it with current metadata.

Avoid erasing an item that still has required loan history without deciding what historical references mean. You might retire it while retaining its identity. A cascade delete can be appropriate for some dependent data but disastrous for an audit history; choose actions from lifecycle requirements, not convenience.

The schema still does not enforce one active loan per item. That is a cross-row invariant addressed with constraints in L032 and transaction behavior in L036–038. A convincing schema review states what is protected and what remains a requirement. Common mistakes are treating every field as a key, using mutable display text as identity, omitting tenant scope, and assuming a foreign key replaces permission checks.

Optional practice: add a borrower table and an explicit retirement state, then state the deletion contract before writing cascading rules.
`)],diagrams:[diag('relationships','Model the physical copy, then its history',`erDiagram
DEPARTMENT ||--o{ ITEM : owns
ITEM ||--o{ LOAN : has_history
BORROWER ||--o{ LOAN : takes
ITEM {
  int department_id PK
  int item_id PK
  string barcode
}
LOAN {
  int department_id PK
  int loan_id PK
  int item_id FK
  int borrower_id FK
  timestamp returned_at
}`, 'The diagram depicts relationships, not the entire schema. Department scope must also constrain the relevant references; the text sketch includes the item relationship and calls out the omitted borrower table.', ['Identify one physical item independently of its model.','Attach each historical loan to that item.','Attach the actor through a borrower relationship.','Carry scope through keys where the invariant needs it.'])],exercise:{prompt:'A library tracks book editions, physical copies, and loans. Specify their identities and two access patterns. Explain why ISBN cannot identify a physical copy, and choose whether a loan should display the current title or its original title snapshot.',minutes:10,rubric:['Separates edition from physical copy.','Uses stable copy and loan identifiers.','States scope/filter/order for access paths.','Justifies current-versus-historical representation.'],solution:'Edition identity can include ISBN under a documented edition policy; each physical copy needs its own copy_id or barcode, because many copies share one ISBN. A loan references copy_id and borrower_id with its own loan_id. Access paths might be current loans for a borrower ordered by due date and loan ID, and complete copy history ordered by opened time and loan ID. Joining the current title supports corrected metadata; a title_at_borrow snapshot preserves historical documents. Either is defensible if explicitly named and consistently maintained.'},questions:[choice('q1','Which identifies one physical copy of a book?',['Its shared edition ISBN alone','A unique copy identifier within its declared scope','Its display title'],'A unique copy identifier within its declared scope','Many copies can share the same edition and title.'),choice('q2','A surrogate primary key removes the need for business uniqueness constraints:',['True','False'],'False','An assigned ID does not prevent two rows with the same required unique barcode.'),open('q3','Why include department_id in a foreign-key relationship?','When the domain requires related rows to share department scope, the composite reference can enforce that relationship instead of merely locating an item with some global ID.','The schema must express the actual invariant; authorization remains separate.'),open('q4','What makes an access pattern useful for index design?','It specifies scoped filters, ordering, row limits, projected fields, and expected frequency or selectivity.','A vague request for fast queries does not identify a traversal.'),open('q5','When is a duplicated title on a loan appropriate?','When it deliberately records historical wording at the time of the loan, with its snapshot meaning explicit.','Intentional historical data differs from an accidentally stale copy.')],flashcards:cards([['Entity versus representation?','The domain identity versus fields shown about it.'],['Surrogate key?','An assigned identity distinct from business meaning.'],['Natural uniqueness still needed?','Yes, when the business forbids duplicate values within a scope.'],['Composite foreign key helps?','Enforce a relationship including scope such as tenant or department.'],['Access pattern includes?','Scope, filter, order, limit, returned fields, and frequency.'],['History versus current state?','A recorded past fact may intentionally differ from today’s description.']]),mentalModel:'Model what must stay identifiable, then trace the exact questions and transitions through those identities.',sources:[refs.constraints]});

save('032',{
objectives:['Place a business invariant at its shared authority.','Select appropriate row, uniqueness, and reference constraints.','Recognize normalization and deliberate duplication tradeoffs.','Explain why application prechecks cannot replace database constraints.'],retrieval:['From L031: distinguish a copy identity from a display description.','From L030: show two requests overselling one item.'],
sections:[sec('authority','Every writer must face the same rule',`
Core 55 minutes: retrieval 5, mechanism 18, worked SQL 8, exercise 10, questions 10, review 4. Suppose a UI checks that barcode B17 is unused before creating an item. Two clients both check before either writes. Both see absence. Without a shared uniqueness rule, both insert successfully. The application precheck improves the message but cannot arbitrate concurrent writers.

Put enforceable invariants at the database authority used by all relevant writes. A NOT NULL requirement prevents missing mandatory data; a row CHECK can bound quantity; a UNIQUE rule arbitrates key collisions; a foreign key constrains references. The application still validates early for helpful errors and limits, but the authority remains the final defense.

Constraints express only the rules actually encoded. A primary key prevents duplicate identity, not unauthorized ownership transfer. A nonnegative available count may still coexist with two accepted reservations if the application loses one decrement. Test the complete business invariant across all involved records, not only the easiest numeric column.
`),sec('normalization','Store each current fact under a clear owner',`
Imagine every loan row repeats the borrower's current email. Changing that address requires updating many historical rows, and a partial update leaves conflicting “current” values. Separating borrower identity and current profile gives one owner for that fact. Loans reference the borrower. This is the practical motivation for normalization: avoid update, insertion, and deletion anomalies created by mixing independent facts.

Normalization does not forbid every duplicate. A shipping address captured on a completed order is historical evidence, not another current profile field. A derived current-loan count can accelerate a frequent query, but it creates a maintenance and reconciliation obligation. Call it derived, identify its source of truth, and decide whether lag is acceptable.

If a denormalized count controls acceptance, stale maintenance can break correctness. “Borrower has fewer than three active loans” cannot safely rely on an asynchronously updated display counter unless the product accepts the possible excess. Performance decisions must preserve the role of the field in the invariant.
`),sec('constraints','Make one-active-loan explicit',`
For the equipment service, PostgreSQL supports a unique partial index to restrict only active loans:

~~~sql
CREATE UNIQUE INDEX one_active_loan_per_item
ON loans(department_id, item_id)
WHERE returned_at IS NULL;
~~~

This permits many completed loans for an item and at most one row considered active by that predicate. Every path that creates or reopens a loan must face the rule. A concurrent conflict becomes an explicit unsuccessful write rather than two accepted borrowers. The index expresses this particular state model; if reservations, loans, and maintenance blocks all compete for the same item across separate tables, a new shared model or transaction protocol is needed.

For a positive quantity, use both NOT NULL and CHECK(quantity > 0). PostgreSQL CHECK treats a null result differently from false; do not assume a comparison alone rejects missing values. PostgreSQL does not support arbitrary cross-row queries as a reliable CHECK invariant. Prefer supported uniqueness, reference, exclusion, or transaction mechanisms appropriate to the rule. Other engines have their own semantics, so verify the target version.

Trace a return: update the active row's returned_at under authorization. After the update commits, a later loan can satisfy the unique active predicate. If return and replacement loan belong to one business operation, their atomicity and ordering need a transaction. Do not temporarily delete the old history to bypass the index.
`),sec('failures','The maintenance path is also a writer',`
An import script, administrator tool, migration, and background job can bypass UI validation. Database rules help preserve shared invariants across those paths. They can also reject a backfill unexpectedly if old data violates the proposed rule. Before adding a constraint, inspect and reconcile existing data, plan how validation interacts with writes, and test migration failure behavior. L113 later treats online migrations in depth.

Consider a derived active-loan count updated in a separate transaction. If the loan insert succeeds but count update fails, the display is wrong. If the count is used to authorize the next loan, the business rule may be wrong too. Decide whether to maintain it atomically with the source, recompute it, or keep it nonauthoritative with a reconciliation process.

Common misconceptions: constraints make transactions unnecessary; normalization means joins are always expensive; any duplicated value is bad; a uniqueness precheck is enough under low traffic; a migration is outside the application's correctness boundary. Even two overlapping requests suffice to expose the race. Optional practice: attempt duplicate active loans and completed historical loans in the local relational lab, and explain why only the former must fail.
`)],diagrams:[diag('constraint','All writers meet one authoritative rule',`flowchart LR
U[User API] --> D[(Loans authority)]
I[Import tool] --> D
J[Background job] --> D
D --> C{Unique active item constraint}
C -->|Rule satisfied| A[Accepted write]
C -->|Competing active loan| R[Conflict]
D -.->|Derive accepted-row count| S[Display active count]`, 'The dotted arrow describes a derived view; acceptance depends on the authoritative rule, not a stale displayed count.', ['Enumerate every writer.','Encode the shared active-loan invariant at the authority.','Translate constraint failure into the operation contract.','Keep derived views from silently becoming acceptance authority.'])],exercise:{prompt:'An app limits each username to one account and stores a current display name in both accounts and every comment. Propose a uniqueness rule and a normalized model. Then identify a legitimate reason to preserve a separate historical display-name snapshot, and explain why a pre-insert SELECT does not prevent collisions.',minutes:10,rubric:['Defines username normalization/scope before uniqueness.','Uses authoritative database uniqueness.','Separates current profile from comment identity.','Distinguishes historical snapshot from accidental duplicate current state.'],solution:'Define whether usernames are case-sensitive and tenant-scoped; enforce uniqueness on the chosen canonical value and scope. Comments reference account_id; current display name comes from accounts. A display_name_at_post snapshot can be legitimate if the product needs historical presentation, but it must be named as such and not treated as current. Two SELECT checks can both observe absence before inserts; the database uniqueness rule arbitrates the race.'},questions:[choice('q1','Why retain a database uniqueness rule after app validation?',['All writers and concurrent attempts need one arbiter','It replaces authorization','It guarantees low latency'],'All writers and concurrent attempts need one arbiter','Prechecks alone cannot exclude another concurrent insertion.'),choice('q2','A historical order address should always update with the user profile:',['True','False'],'False','It may intentionally record the delivery instruction at purchase time.'),open('q3','Why can a nonnegative stock column still coexist with overselling?','Lost updates can leave the displayed count at zero while two reservation rows were accepted; the invariant spans accepted effects, not only a column range.','Inspect the full history and related records.'),open('q4','When is denormalization appropriate?','When measured access needs justify it and its ownership, update, lag, and reconciliation behavior are explicit.','A derived display can tolerate lag that an acceptance decision cannot.'),open('q5','Why check existing data before adding a constraint?','A new rule may reject old rows or ongoing writes; migration must reconcile violations and preserve a valid transition plan.','A schema change is itself a state transition requiring evidence.')],flashcards:cards([['Precheck versus constraint?','Helpful early feedback versus shared authoritative enforcement.'],['Normalization helps avoid?','Conflicting copies and update/insertion/deletion anomalies.'],['Partial unique index?','Uniqueness over only rows satisfying its predicate.'],['Derived field needs?','A source owner, maintenance path, lag policy, and reconciliation.'],['Who counts as a writer?','APIs, imports, jobs, admin tools, and migrations.'],['History duplication?','Valid when it deliberately preserves a past fact with clear semantics.']]),mentalModel:'One current fact has one owner; every accepted writer must obey the invariant at that owner.',sources:[refs.constraints]});
