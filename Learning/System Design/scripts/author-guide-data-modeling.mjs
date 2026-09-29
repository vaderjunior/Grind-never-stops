import {guide,sec,diag,choice,open,cards,terms,source} from './guide-worker-utils.mjs';
const visual=(sectionId,...args)=>({...diag(...args),sectionId});
guide('data-modeling-basics',{
summary:'Turn a product story into records, keys, and relationships, then see exactly when copying data helps and when it creates contradictions.',
objectives:['Choose stable identities for records.','Represent one-to-many and many-to-many relationships.','Explain normalization through a concrete update problem.','Design a deliberate copied view with a freshness and repair rule.'],
terms:terms([['Entity','A kind of thing the application records, such as a user or note.'],['Primary key','The field or fields that uniquely identify one row.'],['Foreign key','A database rule requiring a reference to match an existing referenced key.'],['Cardinality','How many records on one side can relate to records on another side.'],['Normalization','Organizing facts according to what they describe, reducing avoidable duplication and contradictory updates.'],['Denormalization','Deliberately storing redundant or combined data to make a particular operation easier.']]),
retrieval:['Why should a note keep the same identity after a title change?','How does a join combine information without permanently combining its stored tables?'],
sections:[sec('story','The model begins before the table names',`
Maya wants notebooks containing notes. She can rename a notebook, share it with Arun, and change Arun’s role later. A photo can be attached to a note. Begin by writing these sentences rather than creating a giant table of every field that comes to mind.

Identify the things with their own identities: users, notebooks, notes, and photo attachments. Identify facts about each thing: a user has a display name; a notebook has a title; a note has text. Then identify relationships: a note belongs to a notebook, and a user can be a member of a notebook with a role.

This resembles sorting paperwork into folders by what each document describes. The analogy helps locate facts, but databases also enforce rules and handle simultaneous updates. A tidy folder arrangement alone cannot prevent two programs from making incompatible changes. Data modeling gives those later rules a clear structure.
`),sec('keys','Separate identity from the label people see',`
A notebook called Travel may later become Summer trip. Its notebook_id should remain stable. Titles may repeat, and users may change their names. Using those editable labels as every reference makes renaming expensive and ambiguity likely.

A primary key uniquely identifies a row. It can be one generated identifier or a combination of fields that is truly unique for the intended record. A generated number is a convenient label, not proof that the caller may access the row. Avoid revealing private data just because somebody guessed a valid identifier.

For membership, the pair notebook_id and user_id can be unique: one current membership record for that user in that notebook. This is a composite key. The role belongs to the pair. Maya may be an editor in one notebook and a reader in another, so role should not be stored as one universal property of Maya.
`),sec('tables','Write a small set of rows you can inspect',`
Use these small tables before considering scale:

| users.user_id | display_name |
| --- | --- |
| 7 | Maya |
| 9 | Arun |

| notebooks.notebook_id | title |
| --- | --- |
| 20 | Travel |

| notes.note_id | notebook_id | title |
| --- | --- | --- |
| 41 | 20 | Packing |
| 42 | 20 | Train times |

| memberships.notebook_id | user_id | role |
| --- | --- | --- |
| 20 | 7 | editor |
| 20 | 9 | reader |

Read one relationship aloud: note 41 belongs to notebook 20. Read another: user 9 is a reader of notebook 20. Neither sentence depends on the current notebook title. The membership table stores facts about a relationship; it is not redundant merely because the other two identities already exist.
`),sec('relationships','One-to-many and many-to-many answer different questions',`
One notebook can contain many notes, while this initial product gives each note one notebook. That is one-to-many. Put the notebook reference on each note. If a notebook can be empty, zero notes is a valid count; say so instead of assuming every relationship requires at least one child.

Users and notebooks have a many-to-many relationship: a user can join several notebooks, and a notebook can have several users. The membership table connects them. To list Arun’s notebooks, find membership rows for user 9, then match their notebook identities to the notebook table.

Putting user_ids into a comma-separated string such as "7,9" inside the notebook row makes individual membership updates and constraints awkward. Some databases support arrays with useful operations, but an array does not automatically give the same relationship and uniqueness rules. Choose a representation because it fits operations, not because fewer visible tables look simpler.
`),sec('normalization','Follow a rename to understand normalization',`
Imagine every note row also copied notebook_title and Maya’s current display name. Notebook 20 has 500 notes. Renaming Travel to Summer trip now requires changing 500 copies. If only 499 change, the application has contradictory answers about one notebook. This is an update anomaly: duplicated facts disagree because an intended update is incomplete.

Instead, keep the current notebook title in the notebook row and reference that identity from notes. A rename changes one current fact. Queries that need the title join to that row. This is the practical motivation for normalization: each fact belongs with the thing or relationship that determines it.

Do not interpret this as “split every field into its own table.” Title and text both describe one note and can live together. Formal normal forms provide more precise rules, but the first useful question is simple: if this fact changes, how many supposedly current copies must I update, and could they disagree?
`),sec('rules','Constraints make some mistakes impossible to commit',`
A foreign key can require notes.notebook_id to reference an existing notebook. A uniqueness rule can prevent two current membership rows for the same notebook/user pair. A required-field rule can reject a missing note identity. A check can restrict role to allowed values. These checks protect stored structure even if one code path forgets a validation.

They do not enforce every product rule automatically. A valid notebook identity does not prove Maya may move a note into it. The server must check her access, and related state changes may need a transaction and suitable concurrent-update behavior.

Choose deletion semantics deliberately. Should deleting a notebook delete its notes, reject the operation until they are moved, or mark the notebook inactive? A database can implement several policies. Cascading deletion is powerful precisely because many related rows may disappear. The model should record the intended product behavior rather than accepting an accidental default.
`),sec('copies','A useful copy needs a maintenance contract',`
Suppose the home page repeatedly displays each notebook with its current note count. Counting all notes on every request may eventually be costly. A stored note_count can make reads easier, but it duplicates a fact that can also be derived from notes. This is denormalization.

For a small local transaction, inserting a note and increasing its notebook’s count can happen together. Deletes and moves must update the count too. A missed path makes the counter wrong. Alternatively, a background process can update a display count later, if the page explicitly tolerates that delay. Then provide a reconciliation job: recompute the true count and repair disagreement.

Keep the original record set clear. A displayed count is not sufficient evidence that a note exists or that a user may read it. Denormalization trades cheaper reads for write, freshness, and repair responsibilities. Measure the original query before taking on that work.
`),sec('history','A snapshot is not always an erroneous duplicate',`
Consider an activity record saying Maya published a note at 10:00. Should it display Maya’s current name next month, or preserve the name shown at publication? Those are different requirements. A reference to user_id supports looking up the current name. A recorded display_name_at_publish preserves a historical snapshot.

The snapshot is deliberate evidence of an earlier fact, not a broken copy that should always track the present. Name it accordingly and explain its retention and privacy rules. Avoid a vague field called user_name whose meaning shifts between current identity and historical display text.

Likewise, a deployment record might reference a current model family while recording the exact model version it ran. Changing today’s preferred version must not rewrite what ran yesterday. Data modeling includes time and meaning, not only table shape. Decide which facts may change and which records describe completed events.
`),sec('ai','Worked example: teams, deployments, and model versions',`
An AI platform has teams, model versions, and deployments. Model version 12 is an immutable published artifact description. Deployment 301 runs that version for team 8 in one region. Team 8 may run several deployments, and version 12 may be used by several teams.

Create teams(team_id, name), model_versions(version_id, model_name, artifact_key), and deployments(deployment_id, team_id, version_id, region, status). References connect a deployment to its owner and exact artifact version. Do not copy a model’s huge parameter file into every deployment record; artifact_key points to stored bytes covered in the next storage chapter.

To answer “which teams are affected by retiring version 12?”, find deployments referencing 12, then join their team identities. To rename team 8, update its team row. To preserve a historical deployment report, record the particular version and relevant historical facts rather than asking a mutable alias what it means later. One carefully chosen identity can prevent an ambiguous operational investigation.
`),sec('checkpoint','Test the model with changes, not just reads',`
Walk the model through creating, renaming, sharing, moving, and deleting. Ask what rows change and what must remain true after each operation. Draw a counterexample: two membership rows with conflicting roles, a note referencing a nonexistent notebook, or a stale copied title. Identify the rule that rejects or repairs it.

Common mistakes include one large table repeating every person’s details, arrays chosen only to avoid a relationship table, and copied counters without a repair strategy. The opposite mistake is excessive decomposition that makes ordinary operations difficult without protecting a useful rule.

Your checkpoint is to explain where each fact lives, what identifies it, and what happens when it changes. That is a stronger foundation for database selection than deciding first that everything will be a document, a cache entry, or a table.
`)],
diagrams:[visual('relationships','relations','Separate ownership of facts from membership relationships',`flowchart LR
U[(Users: one row per person)] -->|User identity| M[(Memberships: notebook and user pair)]
N[(Notebooks: one current title)] -->|Notebook identity| M
N -->|One notebook has many notes| T[(Notes: each references notebook)]`,'Relationship arrows show references and multiplicity in this teaching model, not request traffic.',['Find a person by stable identity.','Read the membership pair to find their notebook role.','Read the notebook title from its current record.','Find notes that reference that notebook.']),visual('copies','counter','A copied count creates a second fact to maintain',`flowchart TB
C[Create or delete a note] --> T[One database transaction]
T --> N[(Stored note rows)]
T --> K[(Maintained notebook count)]
N -.->|Periodic recomputation| R[Compare actual count with stored count]
K -.-> R
R --> F[Investigate and repair disagreement]`,'This chosen design updates the local count with its note change and still checks correctness. An asynchronous view would have a different freshness contract.',['Identify the base note records.','Update the note and count under the chosen transaction rule.','Remember moves and deletes, not only creates.','Recompute to detect missed update paths.'])],
exercise:{minutes:12,prompt:'Add tags to Pocket Notes: each note can have many tags, and a tag can label many notes. Sketch the tables and keys. Then explain how renaming one tag works and how you would maintain an optional displayed tag count.',rubric:['Uses stable tag identity and a note/tag relationship.','Prevents duplicate current note/tag pairs.','Distinguishes the base relationship rows from a copied count and its repair.'],solution:'Use tags(tag_id, name) and note_tags(note_id, tag_id), with a unique pair and appropriate references. Rename one tag row; the links keep using its identity. Compute the count from note_tags initially. If storing a copied count later, maintain it for both adding and removing links, choose a transaction or stated delay, and periodically reconcile it against the base relationships.'},
questions:[choice('q1','Where does a user’s role in one notebook belong?',['One global role field on the user','The notebook/user membership','The note title'],'The notebook/user membership','The same person can have different roles in different notebooks.'),choice('q2','What does normalization reduce in the rename example?',['Contradictory copies of the current notebook title','Every database join','The need for any application validation'],'Contradictory copies of the current notebook title','The current title is stored with the notebook it describes.'),choice('q3','A copied note count needs which additional responsibility?',['No further work','An update and repair policy','A new identity for every read'],'An update and repair policy','Its value can drift if a create, delete, or move does not maintain it.'),open('q4','Why might a historical display-name snapshot legitimately differ from today’s user name?','It records what was shown at an earlier event; the two fields describe different times and must be named and retained accordingly.','A historical fact should not silently be treated as a current copied field.'),open('q5','Why does a foreign key not replace authorization?','It checks that a referenced record exists under the database rule, not whether this caller is allowed to read or change it.','Stored relationships and caller permissions answer different questions.')],
flashcards:cards([['Stable key separates?','Record identity from editable display labels.'],['Many-to-many membership?','A relationship record connects two identities and can hold facts about that pair.'],['Normalization practical question?','Which fact describes which entity or relationship, and how many current copies need changing?'],['Denormalization cost?','Maintaining, refreshing, and repairing redundant data.'],['Snapshot versus current copy?','A snapshot intentionally describes an earlier point in time.']]),mentalModel:'Put a fact with the thing it describes; if you copy it, state which copy decides truth and how the others stay useful.',
sources:[source('PostgreSQL: constraints and relationships','https://www.postgresql.org/docs/18/ddl-constraints.html'),source('PostgreSQL: joins between tables','https://www.postgresql.org/docs/18/tutorial-join.html'),source('PostgreSQL: transactions','https://www.postgresql.org/docs/18/tutorial-transactions.html'),source('MongoDB: embedding and references','https://www.mongodb.com/docs/manual/data-modeling/')]
});
