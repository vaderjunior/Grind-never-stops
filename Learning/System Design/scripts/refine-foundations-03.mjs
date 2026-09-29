import {refine,step,diagram} from './refine-foundations-utils.mjs';
refine('databases-and-sql',(g,a)=>{
 a.replace('rows','The primary key of users is user_id. The primary key of notes is note_id. Each identifies exactly one row in its table. The title is not a good primary key: Maya can write two notes called Weekend plan, and she can rename a note without wanting a new identity. A display name has the same problem. An identifier should identify the thing, rather than depend on a label people expect to edit.',`Keep three roles separate:

| Value | Role | What can change without changing the note? |
| --- | --- | --- |
| note_id = 42 | **Primary key:** identifies one note row | Keep this stable |
| owner_id = 7 | Relationship to a user identity | Ownership changes require an explicit rule |
| title = Weekend plan | Editable display text | Rename it or reuse the same title on another note |

The users table similarly uses user_id as its primary key. Display names and titles make poor identities because people expect to edit them and duplicates are possible.`);
 a.replace('query','Read it in everyday language: return the identifier and title, from the notes table, keeping rows whose owner is 7, ordered by identifier. The result contains 41/Garden photo and 42/Weekend plan. Row 43 does not pass the condition. SELECT does not itself mean “fast”; it describes the answer. The index chapter later in this week explains how an index can help find matching rows.',`Read the query as a question about the answer: from notes, keep owner 7, return the identity and title, and order by identity. The visible result is:

| note_id | title |
| --- | --- |
| 41 | Garden photo |
| 42 | Weekend plan |

Row 43 belongs to owner 9, so it does not pass this condition. SELECT describes the answer; it does not itself mean “fast.” The index chapter explains how the database can reduce search work.`);
 a.append('choices','> **Interview phrasing:** “I would keep the user’s current name in one user row and store the owner identity on each note. That lets a rename update one fact while queries still follow the relationship.”');
 g.diagrams.push(diagram('query-shape','query','A query selects both rows and columns','flowchart LR\nT[Notes 41 and 42 and 43] --> F[Keep owner 7]\nF --> R[Matching notes 41 and 42]\nR --> C[Return note ID and title]\nC --> O[Order by note ID]','This is reasoning about the requested result, not a promise about physical execution order. Permission scope must be supplied correctly by the application.',['Choose the table containing the facts.','Apply the owner condition to decide which rows qualify.','Choose the returned columns and an explicit order.']));
 g.walkthroughs=[{id:'rename-one-user',sectionId:'choices',title:'A rename changes one fact while relationships remain',intro:'Use the tiny tables above. We are changing a display name, not the identity or ownership of any note.',steps:[step('Read the current records','Both notes refer to user 7. They do not need their own permanent copy of the user’s current name.',{'User 7':'Maya','Note 41 owner':'7','Note 42 owner':'7'}),step('Rename the user','The application changes the name on the user row under its normal validation and permission rules.',{'User row changed':'7 → Maya Chen','Note 41 owner':'7','Note 42 owner':'7'}),step('Join for a display','A query matches owner_id 7 to user_id 7 and obtains the current name.',{'Note 41 result':'Garden photo — Maya Chen','Note 42 result':'Weekend plan — Maya Chen','Copied name fixes':'None needed here'})],takeaway:'A relationship points to a stable identity. The display text can change without rewriting every referring record.'}];
 return {changes:['Clarified primary identity, relationship keys, and editable labels in a comparison table.','Displayed the SQL result as actual rows and added a query-shape diagram.','Added a rename walkthrough and reasoned interview sentence tied to the data model.']};
});
refine('sql-in-small-steps',(g,a)=>{
 a.replace('join','The rows are (10, Redis basics, Ajay), (11, Queue practice, Ajay), and (12, Database questions, Mira). ON describes the matching rule. Qualifying columns with table names makes the intended identity clear when both tables contain id.',`The matching rule produces a small, inspectable result:

| notes.id | notes.title | users.name |
| --- | --- | --- |
| 10 | Redis basics | Ajay |
| 11 | Queue practice | Ajay |
| 12 | Database questions | Mira |

ON describes the matching rule. Table names distinguish notes.id from users.id; their numerical values do not need to be equal because the match uses notes.owner_id.`);
 a.replace('constraints','A primary key makes each row\'s identity unique and non-null. A foreign key can require notes.owner_id to reference an existing users.id. A NOT NULL rule can require a title value. A CHECK constraint can restrict values, such as requiring a nonnegative stored count.',`Let the database enforce simple stored-data rules:

| Rule | Example | Invalid record it can reject |
| --- | --- | --- |
| Primary key | Unique, non-null notes.id | A second note with id 10 |
| Foreign key | owner_id references users.id | A nonexistent owner |
| NOT NULL | Title must have a value | Missing title represented by NULL |
| CHECK | Stored count must be nonnegative | A count of −2 |

NOT NULL does not by itself reject an empty string. Choose each rule for the requirement it actually enforces.`);
 a.append('writes','> **Pause and predict:** The example updates note 13. If the WHERE clause were removed, which rows qualify? Every row. Read a write’s condition aloud before considering its effect. This is a paper example, not a prompt to try an unrestricted update on real data.');
 g.diagrams.push(diagram('write-scope','writes','The write condition defines the affected rows','flowchart TB\nU[UPDATE title] --> W{Condition present?}\nW -->|WHERE id equals 13| O[Only matching row is a candidate]\nW -->|No WHERE clause| A[Every row is a candidate]\nO --> C[Check affected rows and business result]\nA --> C','Candidate rows are also subject to database rules and the full statement. Application authorization and concurrency conditions must still be included where required.',['Identify the change being requested.','Inspect the condition selecting records.','Check the affected-row result rather than assuming the intended business action occurred.']));
 g.walkthroughs=[{id:'filter-order-limit',sectionId:'order',title:'Reason through Ajay’s newest note',intro:'Follow the logical result of the shown query. The database may use a different physical plan to compute the same answer.',steps:[step('Start from three rows','The table contains notes for two owners. Display position is not a creation-time guarantee.',{'Candidates':'10, 11, 12','Owner values':'1, 1, 2','Created order':'1, 3, 2'}),step('Keep owner 1','The WHERE condition keeps Ajay’s two records and excludes the other owner.',{'Remaining IDs':'10, 11','Created order':'1, 3','Excluded':'12'}),step('Apply the requested order','Descending creation order puts the larger value first; id supplies the tie-breaker if necessary.',{'Ordered IDs':'11, 10','Order values':'3, 1','Tie-breaker':'id descending'}),step('Return one row','LIMIT 1 bounds the result. It says nothing by itself about how much work the physical plan performed.',{'Returned ID':'11','Returned title':'Queue practice','Rows returned':'1'})],takeaway:'Filter, ordering, selected columns, and row limit each describe a different part of the intended answer.'}];
 return {changes:['Replaced compact join-output prose with a real result table.','Added a constraint/rejected-record table including NOT NULL versus empty text.','Added write-scope decision flow, condition prediction, and a logical query-result walkthrough with explicit optimizer caveat.']};
});
refine('find-data-with-indexes',(g,a)=>{
 a.replace('lookup','Use a small paper version. Write note IDs 12,18,41,57,88 on five cards. Make a separate ordered list linking each ID to its card. To find 41, consult the list and pick that card. Now ask for every card: the list provides little benefit because you must collect all five anyway. We use cards to expose the distinction, not to claim a specific number of disk operations for a real database.',`Use five paper cards and a separate directory:

| Ordered search value | Location of the note card |
| --- | --- |
| 12 | Card A |
| 18 | Card B |
| 41 | Card C |
| 57 | Card D |
| 88 | Card E |

For note 41, use the directory to choose Card C. For every note, all five cards still need to be collected. This paper model shows search versus output work; it does not predict a real database’s disk operations.`);
 a.replace('cost','When Maya creates note 100001, the database stores the row and updates each relevant index. If she changes a field present in an index, that index needs appropriate maintenance too. Indexes occupy storage and can add work to writes. Ten unnecessary indexes may make a read-heavy screen no better while making every save more expensive.',`A read shortcut adds write responsibilities:

| Change | Stored row | Relevant index work |
| --- | --- | --- |
| Create note 100001 | Add the new record | Add entries to its indexes |
| Change an indexed value | Store the new value | Maintain the affected search organization |
| Add another index | Keep the same logical records | Store and maintain another structure |

Indexes occupy storage and can add write work. Ten unnecessary indexes may leave the screen no faster while making every save more expensive.`);
 a.append('problem','> **Common mistake:** “Returning one row means reading one row.” A result count describes the output. Without a suitable search path, finding that one result can still require inspecting many candidates.');
 g.diagrams.push(diagram('index-maintenance','cost','A new record also updates its search structures','flowchart LR\nS[Save note 100001] --> D[Database coordinates the write]\nD --> R[(Note row)]\nD --> P[Primary identity index]\nD --> O[Owner and note index]\nR --> C[Commit under database rules]\nP --> C\nO --> C','This is a responsibility sketch. The database controls the physical ordering and recovery of row and index changes; application code does not manually perform these three writes.',['Submit the logical row change.','Let the database maintain the relevant row and index structures.','Include added storage and write cost when evaluating an index.']));
 g.walkthroughs=[{id:'directory-to-card',sectionId:'lookup',title:'Find one record, then ask for all records',intro:'Use the five-card directory above. The card model explains organization without promising an exact tree shape or access count.',steps:[step('State the question','A known note identity is selective: the user wants one particular record.',{'Requested ID':'41','Directory IDs':'12, 18, 41, 57, 88','Needed output':'One note'}),step('Find its location','The directory maps the search value to a card location.',{'Matched entry':'41 → Card C','Selected card':'C','Unrelated cards':'A, B, D, E'}),step('Read the record','The selected card supplies the fields requested by the application.',{'Card C':'41 — Garden photo','Result count':'1','Directory role':'Locate the record'}),step('Change the question','Asking for every note still requires the entire output. An index cannot eliminate the cost of producing it.',{'New question':'Return all five notes','Needed cards':'A, B, C, D, E','Output count':'5'})],takeaway:'An index can avoid unrelated search work. It cannot make the required output disappear.'}];
 return {changes:['Made the paper directory and row/index-maintenance costs visible as tables.','Added coordinated index-maintenance diagram and output-versus-work mistake callout.','Added a concrete identity-lookup walkthrough followed by a changed all-records question.']};
});
refine('database-families',(g,a)=>{
 a.replace('keyvalue','Imagine a labeled drawer: note:41 points to a saved value. A basic key-value operation asks “give me the value for this exact label.” Another replaces that value. The application must know or derive the key before looking it up. Keys should include the scope that makes them unique, such as an account identity when identifiers repeat across accounts.',`A basic key-value operation asks for one exact label:

| Known key | Value stored for that key |
| --- | --- |
| note:41 | A serialized record for Garden |
| session:abc | The application’s session record |
| account:7:preference:theme | dark |

A **serialized record** is data encoded into bytes or text so it can be stored or sent. The application must know or derive the key before looking it up. Include the scope that makes keys unique, such as an account identity when identifiers repeat across accounts. Another operation can replace the value under the key.`);
 a.replace('widecolumn','Consider a growing history of note edits. The frequent question is “show edits for owner 7 on this date, newest first.” A Cassandra-style model can group rows by an owner-and-date partition key and order records inside that group using an edit time plus an identity to distinguish ties.',`Consider “show edits for owner 7 on this date, newest first.” A Cassandra-style model can use an owner-and-date **partition key**, the values choosing one group, then order rows within the group by edit time and an identity for ties:

| Group key | Edit time | Edit identity | Changed note |
| --- | --- | --- | --- |
| owner 7, 29 September | 10:05 | e3 | 42 |
| owner 7, 29 September | 10:02 | e2 | 41 |
| owner 7, 29 September | 10:02 | e1 | 41 |
| owner 9, 29 September | 10:04 | e4 | 43 |

The owner 7 query can target its known group. The edit identity distinguishes the two events at 10:02.`);
 a.append('documents','> **Pause and predict:** A note’s embedded labels fit in a short list, but its edit history grows every day. Must both stay inside one document? No. Choose a bounded document for the fields read together and a separately managed history when independent growth calls for it.');
 g.diagrams.push(diagram('known-event-group','widecolumn','A query chooses one group and an order inside it','flowchart LR\nQ[Owner 7 on 29 September] --> P[Group key: owner 7 and date]\nP --> E3[10:05 e3]\nE3 --> E2[10:02 e2]\nE2 --> E1[10:02 e1]\nX[Owner 9 on same date] --> Y[Different group]','Arrows within the selected group indicate the requested result order, not network messages. Group size and busy owners still need limits; this does not show a physical cluster.',['Use the query’s owner and date to select a known group.','Order that group’s events with a tie-breaker.','Recognize that a different cross-owner question needs another supported access path.']));
 g.walkthroughs=[{id:'event-question-changes',sectionId:'widecolumn',title:'One event layout, two different questions',intro:'The sample layout groups edits by owner and date. Watch how a new question changes the work it needs.',steps:[step('Name the repeated query','The application knows both values used to select a group.',{'Owner':'7','Date':'29 September','Requested order':'Newest first'}),step('Read the matching range','The owner 7 group holds three edits; equal times use the edit identity as a tie-breaker.',{'Selected group':'7 / 29 September','Ordered events':'e3, e2, e1','Owner 9 events':'Outside this group'}),step('Ask a cross-owner question','“All edits to note 41” no longer supplies the same group key and may span days or owners under the product’s rules.',{'New filter':'note_id = 41','Known owner/date':'Not supplied','Existing layout':'Does not directly answer it'}),step('Make the extra access path explicit','Investigate a supported index, another organized view, or a different model. Maintaining another view brings update and consistency work.',{'Needed organization':'Find by note identity','Extra work':'Keep representations consistent','Decision input':'Query frequency and data size'})],takeaway:'A storage organization is useful because of a question. A changed question may require a changed access path, not a slogan about database families.'}];
 return {changes:['Added concrete key/value and grouped-event rows rather than relying only on family descriptions.','Defined serialization and partition key locally.','Added an ordered-group diagram, changed-query walkthrough, and bounded-document prediction while retaining product-overlap caveats.']};
});
