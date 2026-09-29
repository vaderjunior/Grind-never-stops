import {refine,step,diagram} from './refine-foundations-utils.mjs';
refine('transactions-and-correctness',(g,a)=>{
 a.replace('story','Now imagine two separate saved steps. First, the server changes note 41 to Shared. Before it inserts the activity row, the process stops. When the app restarts, the note moved but the history is missing. Reversing the order is no better: the history can claim a move while the note remains in Personal. The problem is the gap between related changes.',`Two separately accepted writes leave a dangerous gap:

| Accepted state when the process stops | Note location | Activity | Product rule satisfied? |
| --- | --- | --- | --- |
| Before either write | Personal | No move recorded | Yes: no move accepted |
| Move saved, activity not saved | Shared | Missing | No |
| Activity saved first, move not saved | Personal | Claims Shared | No |
| Both related changes accepted | Shared | Matching move | Yes |

Simply reversing two independent writes moves the gap. We need the database to accept the related changes as one group.`);
 a.replace('concurrency','The first save asks to change note 41 where revision is 3 and sets revision to 4. It succeeds. The second also requires revision 3, but the row now has 4, so it changes no row. The server reports a conflict and offers Maya the new text to compare. It must not quietly label the second save successful. This is a simple way to protect user intention without teaching all isolation levels today.',`The rule has an observable result:

| Attempt | Expected revision | Stored revision before attempt | Result |
| --- | --- | --- | --- |
| First tab | 3 | 3 | Save new title and revision 4 |
| Second tab | 3 | 4 | Change no row; report conflict |

The second tab should offer Maya the current text to compare. It must not quietly label a zero-row change successful. This protects the editing intention without requiring every isolation level today.`);
 a.append('boundaries','> **Interview phrasing:** “My transaction covers the note and activity in this database. A response can be lost after commit, so I distinguish the stored outcome from what the browser knows. A separate email or file operation needs its own recovery rule.”');
 g.diagrams.push(diagram('commit-versus-response','boundaries','A completed commit can outlive a lost response','sequenceDiagram\nparticipant B as Browser\nparticipant A as Application\nparticipant D as Database\nB->>A: Move note 41\nA->>D: Commit move and matching activity\nD-->>A: Commit accepted\nA--xB: Success response lost\nNote over B: Outcome unknown to browser\nNote over D: Both database changes accepted','This trace assumes commit succeeded and the later response was lost. Other timeouts can happen earlier, so a timeout alone does not tell which trace occurred.',['The database accepts the grouped changes.','The application tries to return the successful outcome.','A lost response leaves the browser uncertain without undoing the commit.']));
 g.walkthroughs=[{id:'accepted-but-not-heard',sectionId:'boundaries',title:'Two views of the same completed move',intro:'Follow a successful commit followed by a missing browser response. Permission is stable during the move, as assumed in the earlier transaction trace.',steps:[step('Before the move','The two records agree that no move has been accepted yet.',{'Note 41':'Personal','Move activity':'None for this operation','Browser':'Move requested'}),step('Commit the group','The database accepts both related changes. The application receives that result.',{'Note 41':'Shared','Move activity':'Personal → Shared','Application knows':'Commit accepted'}),step('Lose the response','The browser’s waiting period ends without a result. Its knowledge differs from the stored facts.',{'Database state':'Both changes accepted','Browser knows':'No response received','Browser display':'Outcome uncertain'}),step('Read to establish current state','The app can retrieve permitted current state and relevant operation evidence. It must not infer rollback from silence.',{'Current note':'Shared','Matching activity':'Present','Next action':'Explain confirmed state before repeating'})],takeaway:'Database atomicity describes the accepted records. It does not guarantee the caller receives the confirmation message.'}];
 return {changes:['Displayed the invalid half-move states and conditional-revision outcomes in small tables.','Added a commit-versus-lost-response sequence and knowledge/state walkthrough.','Preserved permission-stability assumptions and explained the transaction boundary in interview language.']};
});
refine('data-modeling-basics',(g,a)=>{
 a.replace('keys','For membership, the pair notebook_id and user_id can be unique: one current membership record for that user in that notebook. This is a composite key. The role belongs to the pair. Maya may be an editor in one notebook and a reader in another, so role should not be stored as one universal property of Maya.',`For membership, the pair notebook_id and user_id can be unique: one current membership for that user in that notebook. This is a **composite key**.

| notebook_id | user_id | role |
| --- | --- | --- |
| 20 | 7 | editor |
| 21 | 7 | reader |

User 7 is the same person in both rows. The role belongs to the **pair**, not to the person alone. Updating one membership should not silently change the other.`);
 a.replace('history','The snapshot is deliberate evidence of an earlier fact, not a broken copy that should always track the present. Name it accordingly and explain its retention and privacy rules. Avoid a vague field called user_name whose meaning shifts between current identity and historical display text.',`Name fields according to the question they answer:

| Field | Meaning | Effect of a later rename |
| --- | --- | --- |
| user_id | Identity used to find the current user | Relationship stays the same |
| display_name_at_publish | Name recorded at that event | Keeps the earlier fact |

The snapshot is deliberate history, not a broken current copy. Explain retention and privacy rules. A vague user_name field can conceal whether the product means “now” or “at that event.”`);
 a.append('normalization','> **Pause and predict:** If 499 of 500 copied notebook titles change, what is the “correct” current name? Different rows disagree. Keeping one current notebook row removes this particular multi-copy update problem; it does not remove the need for correct concurrent updates to that row.');
 g.diagrams.push(diagram('rename-one-fact','normalization','One current title, many stable references','flowchart LR\nR[Rename notebook 20] --> T[Update title in notebook row]\nT --> N[(20: Summer trip)]\nA[Note 41 references 20] --> N\nB[Note 42 references 20] --> N\nC[Other notes reference 20] --> N','Arrows from notes are relationships, not writes. A query obtains the current title through notebook 20; deliberate historical snapshots have a different meaning.',['Locate the one record that owns the current title.','Update that fact without changing notebook identity.','Let every note retain its reference to the same notebook.']));
 g.walkthroughs=[{id:'role-belongs-to-membership',sectionId:'keys',title:'The same person can have two different roles',intro:'Extend the example with notebook 21, “Recipes.” Role is a fact about a person in a particular notebook.',steps:[step('Create two memberships','Maya edits Travel but only reads Recipes. One user-level role cannot express both.',{'User':'7 — Maya','Membership 20 / 7':'editor','Membership 21 / 7':'reader'}),step('Ask to edit notebook 21','The server checks the matching notebook/user pair, not an unrelated role.',{'Requested notebook':'21','Matching pair':'21 / 7','Current role':'reader'}),step('Change one membership','An authorized owner promotes Maya to editor in notebook 21. Only that relationship changes.',{'Changed pair':'21 / 7','New role':'editor','Membership 20 / 7':'Still editor'}),step('Prevent contradictory duplicates','A uniqueness rule on the pair rejects a second current row for 21 / 7 with a competing role.',{'Unique identity':'notebook_id + user_id','Rows for 21 / 7':'One current row','Role location':'On that relationship'})],takeaway:'To place a field correctly, ask which identity or combination of identities determines its meaning.'}];
 return {changes:['Made composite membership keys and current-versus-historical fields concrete with tables.','Added a one-fact rename diagram and targeted update-anomaly prediction.','Added a relationship-role walkthrough that separates user identity from notebook permissions.']};
});
refine('choose-a-database',(g,a)=>{
 a.replace('questions','Write four access patterns in ordinary language: create a note for a known owner; show one owner’s newest notes; open one note after checking permission; move a note while recording its activity. Also record two important promises: accepted note text survives an application restart, and a private note is not returned to an unauthorized user. Now a storage choice has something concrete to satisfy.',`Write a small workload card before naming a product:

| User question or change | Data and behavior needed |
| --- | --- |
| Create a note | Known owner, bounded text, saved identity |
| List my newest notes | Owner filter, defined order, bounded result |
| Open one note | Known identity and permission check |
| Move a note | Note change and matching activity accepted together |

Add the promises: accepted text survives an application restart, and a private note is not returned to an unauthorized user. Now a storage candidate has concrete requirements to satisfy.`);
 a.replace('relational','The previous two guides already gave us a small relational design, an index candidate, and a transaction boundary.','Earlier chapters gave us a small relational design, an index candidate, and a transaction boundary.');
 a.replace('photos','For an original teaching example, suppose a note’s metadata is about 1 kB and its photo is 2 MB. Using decimal units, 1 kB is 1,000 bytes and 1 MB is 1,000,000 bytes. Twenty metadata records are about 20 kB. Twenty full photos are about 40 MB. The large difference explains why fetching the list’s small information separately is useful. It does not prove that a specific storage product is required for a small local app.',`Use decimal units: 1 kB is 1,000 bytes and 1 MB is 1,000,000 bytes.

| Requested representation | One item | Twenty items |
| --- | --- | --- |
| Searchable note metadata | About 1 kB | About 20 kB |
| Original photo content | About 2 MB | About 40 MB |

The screen can ask for small records and suitable previews rather than every original. This calculation motivates separating access paths; it does not prove a particular storage product is required.`);
 a.append('verify','> **Common mistake:** Comparing a single repeated-key benchmark with an owner-list page. They ask the store to do different work. Keep query shape, result size, data distribution, concurrent changes, and recovery requirements comparable.');
 g.diagrams.push(diagram('candidate-evaluation','verify','A candidate earns its place through the workload','flowchart LR\nQ[Write query and correctness requirements] --> C[Choose simplest plausible candidate]\nC --> E[Evaluate representative data and failures]\nE --> F{Meets the requirements?}\nF -->|Yes| K[Keep it and record revisit triggers]\nF -->|No| I[Identify the missing capability]\nI --> C','This is a decision process, not a performance benchmark. A new product is one possible change; queries, indexes, payloads, and operating practices can also be the issue.',['Specify required queries and accepted-state rules.','Evaluate a candidate using representative work and recovery checks.','Keep or revise the design based on the actual gap and the cost of changing it.']));
 g.walkthroughs=[{id:'registry-workload-card',sectionId:'ai',title:'A model registry choice develops from questions',intro:'This is a reasoning exercise for an AI deployment registry, not a claim that these candidates have been benchmarked.',steps:[step('Begin with an identity lookup','The first screen opens a known deployment. Many database families can support that question.',{'Query':'Open deployment 301','Known value':'deployment_id','Required result':'One bounded configuration'}),step('Add operational filters','Operators also need a filtered list with owning-team information. A bare key lookup no longer explains the whole workload.',{'Query':'Team 8 failed deployments','Filter fields':'team_id, status','Related record':'Team name'}),step('Separate varying settings from ownership','One candidate is related tables plus validated JSON settings. The settings shape does not erase ownership relationships.',{'Core records':'Teams and deployments','Variable settings':'Validated JSON candidate','Large model bytes':'Artifact reference only'}),step('Define the evidence to collect','Evaluate the real filters, representative large teams, writes, and restoration. Keep the decision revisitable.',{'Read test':'Team/status result and plan','Write test':'Required related changes','Recovery test':'Restore accepted registry data'})],takeaway:'Choose a candidate from the whole workload, then verify its guarantees and operating cost. A convenient first query is not the whole design.'}];
 return {changes:['Turned access patterns into an explicit workload card and photo sizing into a unit-labeled table.','Removed fragile relative chapter wording and added a workload-comparison mistake callout.','Added an evaluation-loop diagram and AI registry decision walkthrough without claiming unexecuted benchmarks.']};
});
refine('blobs-files-and-objects',(g,a)=>{
 a.replace('photo','Suppose one image is 4 MB and its searchable record is 1 kB, using decimal units. A list of fifty records is about 50 kB. Fifty full images total about 200 MB. The difference comes from what the screen asks for, not from a magical product. Fetch small list information first, then load the needed preview or full content.',`The representation changes the amount of data needed:

| Data requested | One photo | Fifty photos |
| --- | --- | --- |
| Searchable metadata | 1 kB | About 50 kB |
| Full image bytes | 4 MB | About 200 MB |

These are decimal teaching values. The list can fetch small information first, then the needed preview or full content. The saving comes from requesting less data, not a magical product.`);
 a.replace('upload','Use explicit states for our photo: uploading, ready, and failed. First, the server checks Maya’s permission and creates an attachment record with a generated storage key and uploading state. Second, upload the content. Third, verify the completed object’s expected size and content properties, then mark the attachment ready. Only ready attachments appear as completed photos.',`Use states with observable meanings:

| State | What the app knows | Show as a completed photo? |
| --- | --- | --- |
| uploading | Attachment identity exists; content is not yet accepted as complete | No |
| ready | Required content checks passed and metadata was updated | Yes, to permitted callers |
| failed | This attempt did not complete under the policy | No |

The server first checks Maya’s permission and creates an uploading record with a generated key. It uploads the content, verifies expected size and content properties, and only then marks the attachment ready.`);
 a.append('objects','> **Common mistake:** “The key contains an owner ID, so it is private.” A label helps organize content; storage policy and application access checks decide who may retrieve it. A guessed or leaked key must not bypass the intended access rule.');
 g.diagrams.push(diagram('private-photo-read','delivery','Metadata helps locate bytes; permission controls delivery','sequenceDiagram\nparticipant B as Browser\nparticipant A as Application\nparticipant D as Metadata database\nparticipant O as Content store\nB->>A: Open attachment 81\nA->>D: Check membership and ready attachment\nD-->>A: Permitted record and storage key\nA->>O: Get content using server access\nO-->>A: Image bytes\nA-->>B: Permitted image response','This drawing chooses server-mediated delivery. A scoped expiring-link design has a different content path and must protect the link as a capability.',['Identify the attachment through the application.','Check access and readiness using the metadata relationship.','Retrieve and deliver bytes only under the chosen access policy.']));
 g.walkthroughs=[{id:'photo-ready-state',sectionId:'upload',title:'Follow attachment 81 from identity to ready content',intro:'A normal 4 MB garden-photo upload shows why a record, stored bytes, and readiness are separate facts.',steps:[step('Reserve an attachment identity','After checking access to note 41, create a stable attempt with a generated storage key.',{'Attachment':'81, note 41','State':'uploading','Key':'photos/81/original-v1'}),step('Transfer the bytes','Stored bytes may exist while the metadata remains uploading. Existence alone is not the completed-app state.',{'Content size':'4 MB expected','Stored bytes':'Upload completed','Metadata state':'uploading'}),step('Verify the representation','Check required size and supported content properties. A matching filename alone is insufficient.',{'Expected size':'4 MB','Observed size':'4 MB','Content checks':'Passed for this example'}),step('Publish readiness','Accept the ready metadata update before presenting the attachment as complete. Retrieval still checks permission.',{'Metadata state':'ready','Visible attachment':'81','Access rule':'Permitted notebook member'})],takeaway:'“Some bytes exist” and “the app has accepted a complete attachment” are different states. Give their transition a clear rule.'}];
 return {changes:['Added representation-size and explicit upload-state tables.','Added private-content retrieval diagram with server-mediated-delivery scope.','Added attachment-readiness walkthrough and key-versus-permission mistake callout while preserving the reviewed recovery graph.']};
});
