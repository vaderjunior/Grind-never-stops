import {guide,S,C,O,N,F,D,R} from './guide-utils.mjs';
const diagram=(sectionId,...args)=>({...D(...args),sectionId});
guide({id:'sql-in-small-steps',minutes:60,summary:'Use one tiny users-and-notes dataset to read, filter, join, count, and safely change records. See the result of each query before adding another idea.',objectives:['Read a SELECT query in terms of its intended result.','Use filters, ordering, joins, and aggregates on concrete rows.','Explain constraints and parameterized queries.','Distinguish what a query requests from how the database executes it.'],terms:[{term:'SQL',definition:'A language used to define, query, and modify data in relational databases.'},{term:'Projection',definition:'Choosing which columns appear in a query result.'},{term:'Join',definition:'Combining rows from relations according to a stated matching condition.'},{term:'Aggregate',definition:'A calculation over several rows, such as counting them.'},{term:'NULL',definition:'A marker for a missing or unknown value, with special comparison behavior.'},{term:'Parameterized query',definition:'A query whose data values are passed separately from its SQL structure.'}],retrieval:['What makes a primary key useful?','How does a note point to its owner in the users table?'],sections:[
S('dataset','Start with five rows you can inspect',`We will use two tables. Do not think about millions of requests yet. First make the relationship and the answer visible.

| users.id | users.name |
|---|---|
| 1 | Ajay |
| 2 | Mira |

| notes.id | owner_id | title | created_order |
|---|---|---|---|
| 10 | 1 | Redis basics | 1 |
| 11 | 1 | Queue practice | 3 |
| 12 | 2 | Database questions | 2 |

Each note has one owner. The created_order number is an artificial teaching sequence so the example stays independent of timestamp formatting. A real schema would define its creation timestamp and ordering policy explicitly. Note 11 is the newest by this sequence, even though it is not the final displayed row.

SQL lets you state which result you want. The database chooses an execution strategy, such as scanning rows or using an index. You will study that choice next; getting the requested result right comes first.`),
S('select','SELECT chooses columns; FROM chooses the table',`To list note titles, ask for the title column from notes:

~~~sql
SELECT title FROM notes;
~~~

The result contains three titles. Without an ORDER BY clause, SQL does not promise a particular row order. A result that happens to look insertion-ordered during a tiny experiment is not a stable application contract.

To include identities, write SELECT id, title FROM notes. The selected columns form the result shape; choosing a subset is sometimes called projection. SELECT * asks for every column. It is convenient when exploring, but an API usually benefits from requesting explicit columns so an added private field does not accidentally become part of a returned representation.

The semicolon terminates a statement in common SQL tools. Keywords are often capitalized for readability; capitalization of keywords is not what makes the query correct.`),
S('filter','WHERE narrows the rows',`Ajay wants only his notes:

~~~sql
SELECT id, title
FROM notes
WHERE owner_id = 1;
~~~

The matching note IDs are 10 and 11. The predicate owner_id = 1 is evaluated as a condition on rows. An AND combines required conditions, while an OR allows alternatives; parentheses make intended grouping clear.

An application should derive the allowed owner or workspace scope from trusted identity and authorization rules. Letting a browser choose arbitrary owner_id values without checking permissions would expose other people's notes. A query filter can implement part of an access boundary, but the database does not automatically know which browser user should be trusted.

For this dataset the filter answers a product question: “Which notes belong to this user?” This is an access pattern. Writing these questions before choosing a database keeps technology selection connected to real behavior.`),
S('order','ORDER BY makes order explicit; LIMIT bounds a page',`To retrieve Ajay's newest note under our sequence:

~~~sql
SELECT id, title
FROM notes
WHERE owner_id = 1
ORDER BY created_order DESC, id DESC
LIMIT 1;
~~~

DESC means descending order, so larger values come first. The result is note 11, Queue practice. The additional id ordering provides a defined tie-breaker if creation-order values ever tie. A production timestamp can tie too, so stable pagination often needs a unique tie-breaker.

LIMIT 1 bounds returned rows; it does not prove the database only inspected one row. Without an appropriate access path, it may still need to examine and sort many candidates. The next index chapter explains how query shape affects work.

Offset-based pagination can skip a number of sorted rows, but inserts and deletes can shift positions between requests. Cursor-based pagination can carry the last observed ordering values. You do not need to implement either now; remember that page size, order, and consistency across pages are separate decisions.`),
S('join','A join follows the relationship',`Suppose a report needs a note title and its owner's name. The name is stored once in users, rather than copied into each note:

~~~sql
SELECT notes.id, notes.title, users.name
FROM notes
JOIN users ON notes.owner_id = users.id
ORDER BY notes.id;
~~~

The rows are (10, Redis basics, Ajay), (11, Queue practice, Ajay), and (12, Database questions, Mira). ON describes the matching rule. Qualifying columns with table names makes the intended identity clear when both tables contain id.

A join is not inherently a slow or bad operation. Its cost depends on the data, indexes, matching conditions, result size, and execution plan. Conversely, a poorly specified join can create far more rows than intended. If every note is paired with every user instead of matching owners, this dataset produces six combinations, most of them wrong for the question.

An inner join keeps matches. A left join keeps every row from its left side and fills unmatched right-side columns with NULL. That distinction matters when listing users who have no notes.`),
S('count','Count rows and group by a meaningful key',`To count notes per owner:

~~~sql
SELECT owner_id, COUNT(*) AS note_count
FROM notes
GROUP BY owner_id
ORDER BY owner_id;
~~~

The result is owner 1 with count 2 and owner 2 with count 1. GROUP BY forms groups, and COUNT(*) counts rows in each group. AS gives the result column a useful name.

This query does not list users with zero notes because it starts from notes. To include those users, start from users, left join notes, and count the matched note identity. Counting COUNT(*) after a left join can count the preserved user row even when no note matched; COUNT(notes.id) avoids counting the NULL unmatched identity.

When the intended result is “how many deployments does each team own?”, the same relationship reasoning applies. First decide whether teams with zero deployments should appear; that product choice determines the query shape.`),
S('writes','INSERT, UPDATE, and DELETE change data',`INSERT adds a row; UPDATE changes matching rows; DELETE removes matching rows. This inserts a new note using the same simple schema:

~~~sql
INSERT INTO notes (id, owner_id, title, created_order)
VALUES (13, 2, 'Cache questions', 4);

UPDATE notes SET title = 'Cache exercises'
WHERE id = 13;
~~~

The WHERE condition is critical. Omitting it from UPDATE or DELETE can affect every row in the table. In an application, combine the intended object identity with the relevant authorization and concurrency checks rather than relying only on a user's supplied identifier.

An update that affects zero rows is not always a successful business action. The row may be absent, the permission scope may exclude it, or an expected-version condition may no longer match. Inspect the result and decide what the API should report. These examples are learning statements, not an instruction to run changes on a real production database.`),
S('constraints','Let the database reject impossible records',`A primary key makes each row's identity unique and non-null. A foreign key can require notes.owner_id to reference an existing users.id. A NOT NULL rule can require a title value. A CHECK constraint can restrict values, such as requiring a nonnegative stored count.

Constraints protect shared data even when multiple application paths write it. An application-level check that an owner exists can race with another change; the database relationship rule is enforced at the authoritative write boundary under the database's semantics.

NULL needs special attention. It is not the same as an empty string or zero. To test missing values use IS NULL or IS NOT NULL, rather than treating equality with NULL like ordinary equality. Functions and comparisons handle NULL according to SQL rules, so inspect the behavior before using it in counts or permissions.

Constraints do not encode every business policy. A complicated cross-row rule may require a transaction, locking, conditional updates, or another design. Learn to separate simple row/schema rules from concurrent workflows.`),
S('parameters','Keep values separate from SQL structure',`Suppose a user searches for a title containing an apostrophe. Building SQL by attaching raw user text to a query string can break its syntax and allow SQL injection, where supplied text changes the intended command structure.

Use a database driver's parameter binding. Conceptually the query is SELECT id FROM notes WHERE owner_id = :owner and the value is provided separately as owner = 1. Placeholder syntax differs by driver: named markers, question marks, or numbered placeholders are common. Do not copy a placeholder from one library into another without checking its API.

Parameter binding protects the structure/value boundary; it does not replace authorization. A perfectly parameterized query can still return another user's private notes if the application passes the wrong owner scope. Similarly, dynamic column or table names often require a fixed allowlist rather than ordinary value parameters.`),
S('platform','Use the same reasoning for a model registry',`Replace users with teams and notes with model_deployments. A deployment record may contain deployment_id, team_id, model_version, region, and status. “List active deployments for this team, newest first” gives you a filter and ordering. “Show each deployment with its owning team's name” gives you a relationship and join.

If the product needs a reliable change of owner plus an audit record, a transaction can keep those updates together. If it only needs to fetch a configuration by a known key, a simpler lookup may be enough. The workload determines which operations matter.

Before moving on, predict each tiny query's output without executing it. Then ask what changes when a user has no notes or two records share a creation time. These edge cases build the habit that matters in design interviews: specify the result and its assumptions before arguing about scale.`)],diagrams:[diagram('join','join','A matching owner key supplies the name',`flowchart LR
N10[Note 10: owner 1] --> U1[User 1: Ajay]
N11[Note 11: owner 1] --> U1
N12[Note 12: owner 2] --> U2[User 2: Mira]`,'The join follows owner_id = users.id, not row position or display order.',['Read the note owner key.','Find the matching user identity.','Combine the requested fields.','Preserve only matches for this inner join.']),diagram('order','query-intent','A useful way to reason about this query result',`flowchart LR
A[Notes rows] --> B[Keep owner 1]
B --> C[Order newest first with tie-breaker]
C --> D[Return one row with selected fields]`,'This is a logical teaching trace; an optimizer may execute an equivalent physical plan in a different order.',['Identify the candidate records.','Apply the requested owner condition.','Apply the stable result order.','Return the requested bounded shape.'])],exercise:{minutes:15,prompt:'Using the original three-note dataset, write a query for Mira’s newest note title and predict its result. Then add a third user with no notes conceptually: which join and count expression would include that user with zero?',rubric:['Owner filter and deterministic order are explicit.','Predicted result uses the original data.','Zero-note users remain in the result without a false count of one.'],solution:'SELECT id, title FROM notes WHERE owner_id = 2 ORDER BY created_order DESC, id DESC LIMIT 1 returns note 12, Database questions. To include users with zero notes, start FROM users LEFT JOIN notes ON users.id = notes.owner_id, group by the user identity (and name if selected), and use COUNT(notes.id). COUNT(*) would count the left-preserved row for a user with no note and can incorrectly give one.'},questions:[C('q1','Without ORDER BY, a repeated SELECT promises insertion order?',['Yes','No','Only with SELECT *'],'No','A stable application order requires an explicit ordering contract.'),N('q2','How many notes belong to owner 1 in the original dataset?',2,'notes','Note IDs 10 and 11 reference owner 1.',0),C('q3','Which comparison checks for a missing SQL value?',['value = NULL','value IS NULL','value = 0'],'value IS NULL','NULL represents missing/unknown information and has special comparison rules.'),O('q4','Why does LIMIT 1 not prove a query is cheap?','The database may still inspect or sort many candidate rows before finding the required first result; indexes and the execution plan determine physical work.'),O('q5','What does a parameterized query protect, and what does it not decide?','It separates data values from SQL command structure to prevent injection through values. It does not decide whether the caller may access the chosen records.')],flashcards:[F('WHERE versus selected columns?','WHERE filters rows; the SELECT list chooses returned fields.'),F('JOIN ... ON?','Combine rows using the stated matching relationship.'),F('Stable newest-first result?','Explicit order with a suitable unique tie-breaker.'),F('Count zero-child parents?','Left join from parents and count a non-null child identity.'),F('SQL safety has two different checks?','Bind values safely and enforce the caller’s authorized data scope.')],mentalModel:'First predict the rows and columns the product needs. Then choose the query and inspect how the database performs it.',sources:[R('PostgreSQL 18 — Querying a table','https://www.postgresql.org/docs/18/tutorial-select.html'),R('PostgreSQL 18 — Joins between tables','https://www.postgresql.org/docs/18/tutorial-join.html'),R('PostgreSQL — Data definition and constraints','https://www.postgresql.org/docs/current/ddl-constraints.html')]});
console.log('Authored stepwise SQL practice.');
