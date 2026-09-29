import fs from 'node:fs';
const code=(lang,text)=>'```'+lang+'\n'+text+'\n```';
const sec=(id,title,markdown)=>({id,title,markdown});
const term=(term,definition)=>({term,definition});
const choice=(id,prompt,options,answer,explanation)=>({id,type:'choice',prompt,options,answer,explanation});
const open=(id,prompt,answer)=>({id,type:'open',prompt,answer,explanation:answer});
const diagram=(id,sectionId,title,source,caption,steps)=>({id,sectionId,title,source,caption,steps});
const step=(title,explanation,values)=>({title,explanation,state:Object.entries(values).map(([label,value])=>({label,value}))});
const source=(title,url)=>({title,url,checked:'2026-09-29'});
function save(g){g={version:1,status:'drafted',authoredBy:'original',level:'beginner',...g};fs.writeFileSync(`content/guides/${g.id}.json`,JSON.stringify(g,null,2)+'\n');}

save({id:'read-system-diagrams',week:1,title:'Read a system diagram, one arrow at a time',minutes:40,
summary:'Turn boxes and arrows into a story you can explain. Learn what a diagram shows, what it leaves out, and how to check whether its arrows make sense.',
objectives:['Give each box a responsibility rather than guessing its product name.','Read an arrow as a specific message between two named parts.','Separate a picture of responsibilities from a picture of physical computers.'],
terms:[term('Component','A part of a system with a named responsibility, such as checking a request.'),term('Boundary','A line or grouping showing a meaningful separation, such as your browser versus the service you call.'),term('Sequence diagram','A picture that shows messages in a chosen order, usually with time moving downward.'),term('Deployment','The arrangement of running software on computers or other execution environments.')],
retrieval:['What different jobs do the browser, server, and database perform in Pocket Notes?'],
sections:[
sec('question','A diagram should answer a question',`You see three boxes and five arrows. Where do you start? Start with the question the picture answers: **How does a note get saved?**

An architecture picture is a chosen view of a system. It cannot show every detail at once. A city map showing train stations helps you plan a journey; it does not tell you the plumbing beneath every house. Similarly, a request diagram need not show every computer or security rule.

| What you want to explain | A useful picture |
| --- | --- |
| Who uses the application? | People and their connections to the application |
| Which part does which job? | Components and labeled relationships |
| What happens first, next, and last? | A message sequence |
| Where do the programs run? | Computers with the programs drawn inside |

Write a short title before drawing. “How note 42 is saved” is more helpful than “Architecture.” It gives the reader a job to perform while looking.`),
sec('boxes','Read the labels before counting machines',`In our small application, **Browser** means “show the editor and send requests.” **Server** means “check requests and coordinate the work.” **Database** means “keep organized saved notes.”

Those labels describe responsibilities. All three may run on your laptop while learning. A larger deployment may put them on different computers. Three boxes alone do not prove either arrangement.

${code('text','Box: Database\nResponsibility: preserve and retrieve notes\nExample input: save note 42\nExample result: note 42 is saved')}

Use this four-line card for any unfamiliar box. If you cannot name its input and result, you probably need an explanation before adding more boxes.

> **Common mistake:** treating a cloud logo as an explanation. A familiar product still needs a stated job. You can reason about the job before learning that product's settings.`),
sec('arrows','An arrow needs a verb and a payload',`Compare “Browser → Server” with “Browser → Server: save the text Buy coffee.” The second version explains who asks, who receives, and what information moves.

Our overview uses solid arrows for requests and dashed arrows for replies. This is a **local legend**, not a universal law. Other diagrams may use different conventions; read their legend first.

| Arrow | Say it aloud |
| --- | --- |
| Browser → Server | Please save this text |
| Server → Database | Store this note with identity 42 |
| Database → Server | The save completed under the storage contract |
| Server → Browser | Note 42 was saved |

The browser does not need to write directly into the database. The server can check the request and decide which operation is allowed. Login is deliberately outside this first picture; a private application will need it.

**Pause and predict:** if the last reply disappears, has the drawing proved that the database did nothing? No. A missing reply leaves the browser uncertain about the earlier work.`),
sec('order','A sequence adds order to the same story',`A component picture says which parts communicate. A sequence picture helps you inspect the **order** of their messages.

Read it from top to bottom. The participant names identify roles. Horizontal arrows carry messages. The vertical lines let you follow the same participant through the story.

The sequence below tells one successful save. It is not a scale drawing of elapsed time: a long gap on the page does not imply a slow operation. It also does not prove that all requests in a real system happen one after another.

Now trace the worked example. First the text exists only in the browser. After the storage step, a saved record exists. Only after the reply arrives can this browser show a confirmed success. These are different moments, and drawing them separately helps you spot misleading promises.`),
sec('boundaries','Write down what the picture leaves out',`A useful beginner drawing can be small and honest. Add a note such as:

${code('text','Shown: one successful save and its reply\nAssumed: the request is allowed\nOmitted: login, backups, multiple servers\nNot promised: survival of every possible disk failure')}

Later, a boundary might distinguish a public browser from a private application network. Crossing that line raises questions about permission and trust. A boundary is a prompt to explain controls; drawing it does not enforce them.

Keep this checklist beside your sketch:

1. Can I explain the responsibility of every box?
2. Does every important arrow say what moves?
3. Have I stated the order when order matters?
4. Which assumptions would change the picture?

**Interview phrasing:** “This first view shows the save path. I am using one service and one database so we can check the behavior before discussing growth.” That gives the interviewer a clear way to follow you.`)
],
diagrams:[diagram('request-map','arrows','The same saved note connects all three roles','flowchart TD\nB[Browser: edit text] -->|Save Buy coffee| S[Server: check and coordinate]\nS -->|Store note 42| D[(Database: saved notes)]\nD -.->|Save completed| S\nS -.->|Note 42 saved| B','Solid arrows are requests; dashed arrows are replies in this picture. They do not specify physical machines.', ['Read the request label before moving to the next box.','Follow the database result back to the server.','Only the server reply confirms success to this browser.']),diagram('message-order','order','One successful save in order','sequenceDiagram\nparticipant B as Browser\nparticipant S as Server\nparticipant D as Database\nB->>S: Save Buy coffee\nS->>D: Store note 42\nD-->>S: Saved\nS-->>B: Note 42 saved','Time moves downward; vertical spacing does not measure latency. This is one request, not a claim that requests never overlap.', ['The client starts the conversation.','Storage finishes before the confirmed reply.','The client learns the result only when the reply arrives.'])],
walkthroughs:[{id:'save-snapshots',sectionId:'order',title:'Watch where “Buy coffee” exists',intro:'Follow the same text through three snapshots. A box is a responsibility; a snapshot describes its state at one moment.',steps:[step('Before Save','Typing changes the browser. No request has been sent yet.',{Browser:'Buy coffee',Server:'No request yet',Database:'No note 42'}),step('Storage has finished','The server has stored the note. The reply is still on its way to the browser.',{Browser:'Waiting for confirmation',Server:'Sending saved result',Database:'42 → Buy coffee'}),step('The reply arrives','Now the browser can distinguish a confirmed save from a request that is still waiting.',{Browser:'Saved: note 42',Server:'Request finished',Database:'42 → Buy coffee'})],takeaway:'A request, a saved fact, and the client learning about that fact are separate moments.'}],
exercise:{minutes:10,prompt:'Draw a tiny weather page using a browser, a server, and a weather-data source. Label a request and its reply. State one detail you deliberately omitted.',rubric:['Each box has a responsibility.','Request and response arrows carry named information.','One assumption or omission is explicit.'],solution:'The browser asks the server for the weather in Berlin. The server asks its weather-data source for the relevant forecast, receives that data, and returns a displayable response to the browser. Labels should name the city request and forecast response rather than saying only data. The source might be another service or saved data; choose and state the assumption. Authentication, freshness rules, and unavailable-source behavior can be explicitly omitted from this first drawing, then added when studying those requirements.'},
questions:[choice('q1','What can three component boxes establish on their own?',['Three physical computers exist','Three responsibilities have been named','There are exactly three users'],'Three responsibilities have been named','A component view needs separate deployment information to establish physical placement.'),choice('q2','Which arrow label is most useful?',['Data','Magic','Fetch note 42'],'Fetch note 42','A specific operation and identifier make the message understandable.'),choice('q3','A save reply is lost. What does the browser know?',['The database definitely did nothing','The outcome is uncertain from that missing reply alone','The note definitely vanished'],'The outcome is uncertain from that missing reply alone','The work may have completed before the reply was lost.'),open('q4','Why name the omitted details?','It bounds what the picture claims and gives the reader specific follow-up questions instead of implying every concern is solved.'),open('q5','How does a sequence diagram add to a component view?','It shows an order of messages for a chosen scenario; it does not automatically measure time or describe every concurrent request.')],
flashcards:[{front:'What does a component box name?',back:'A responsibility; not necessarily a separate computer.'},{front:'What belongs on an arrow?',back:'The operation or information moving between named participants.'},{front:'What does a sequence diagram emphasize?',back:'Message order in a chosen scenario.'},{front:'Does drawing a trust boundary enforce security?',back:'No. It identifies a separation whose controls must be explained and implemented.'},{front:'Missing save reply means?',back:'The caller may not know whether earlier work committed.'}],mentalModel:'Read a diagram as a story: who asks, what moves, who remembers, and what the caller learns.',sources:[source('C4 model: diagram notation guidance','https://c4model.com/diagrams/notation')]});

save({id:'http-requests-and-errors',week:2,title:'HTTP requests, responses, and errors you can read',minutes:45,
summary:'Inspect a real-looking conversation between an app and its server. Learn to read methods, paths, headers, bodies, status codes, and a lost reply.',objectives:['Identify the parts of a request and response.','Distinguish successful creation, accepted work, rejection, and unavailable service.','Explain why a timeout does not prove an operation failed.'],
terms:[term('HTTP method','A request word such as GET or POST that communicates the intended kind of operation.'),term('Header','A named field carrying message metadata, such as its content format.'),term('Body','The content carried by a message, such as a JSON note.'),term('Status code','A three-digit response code indicating the HTTP outcome.'),term('Timeout','The caller stops waiting after a chosen time; this alone does not cancel all remote work.')],retrieval:['An API describes operations and their rules. What should the notes API do when asked to save an empty note?'],
sections:[sec('request','Open one envelope',`An HTTP request is a message with several parts. Think of an envelope with an instruction, an address, a few handling notes, and possibly a document inside.

Here is a **simplified readable HTTP/1.1-style sketch**, not a complete wire message or a command to run:

${code('http','POST /notes HTTP/1.1\nHost: notes.example\nContent-Type: application/json\n\n{"text":"Buy coffee"}')}

| Part | Meaning in this example |
| --- | --- |
| POST | Submit data for the operation the API defines |
| /notes | The target collection |
| Host | Which host the request addresses |
| Content-Type | The body uses JSON |
| Body | The actual note text |

The API still has to define what POST /notes does. HTTP is the conversation framework; your application contract gives this operation its business meaning. HTTP/2 and HTTP/3 encode messages differently while retaining these concepts.`),
sec('response','Read the reply before celebrating',`After creating the note, our server returns another simplified sketch:

${code('http','HTTP/1.1 201 Created\nContent-Type: application/json\nLocation: /notes/42\n\n{"id":42,"text":"Buy coffee"}')}

The status reports creation. The Location field identifies the created resource in this example. The body gives the client its useful result.

Compare two user-interface states:

| What happened | Honest display |
| --- | --- |
| User pressed Save | Saving… |
| Server confirmed the defined save operation | Saved |
| Caller stopped waiting | Could not confirm; check status |

A success code does not, by itself, specify replication, backups, or survival of every storage failure. Those are parts of the service's durability contract. Ask what the server promises before translating “success” into a stronger claim.`),
sec('status','Use a small set of outcomes well',`You do not need to memorize every status code. Learn the decisions the common ones help the client make.

| Code | Typical meaning here | A useful next step |
| --- | --- | --- |
| 200 | Retrieval succeeded | Show the returned result |
| 201 | A resource was created | Keep its returned identity |
| 202 | Work was accepted, not necessarily finished | Follow the documented job/status interface |
| 400 | The request is invalid | Correct the input |
| 401 | Valid authentication credentials are needed | Follow the authentication flow |
| 403 | The server refuses this operation | Check permission; repeating unchanged is not a remedy |
| 404 | The requested resource is unavailable at this address | Check the identifier and visibility rules |
| 429 | This caller is being limited | Respect the documented retry policy |
| 503 | The service cannot currently handle the request | Apply a bounded recovery policy |

These are examples, not a complete retry algorithm. Some services use 404 to avoid revealing that a private resource exists. A 403 does not promise that every earlier identity check succeeded. Read the API contract as well as the code.`),
sec('methods','The verb and the operation must agree',`GET asks for a representation, such as reading note 42. It should not be used as the public API operation for “charge this card.” A browser or intermediary can revisit a GET for reasons unrelated to a deliberate business action.

PUT has idempotent HTTP semantics: repeating the same intended replacement should not add another independent replacement effect. This does not mean every response has identical bytes or that the implementation cannot log each request.

POST is not inherently safe to retry as a new business operation. An API can add a stable operation identity and duplicate handling. We will build that mechanism later.

> **Pause and predict:** if “create job” receives 202, should the UI show “job finished”? No. In our API, it should show the job identity and check its documented status. Accepted work and completed work are separate facts.`),
sec('lost-reply','What if the operation finishes but its reply is lost?',`The step-through example follows a note creation whose response does not arrive. Watch the database state and the browser's knowledge separately.

The risky shortcut is “I timed out, so I will create another note.” The first operation may already exist. The right recovery depends on the API: perhaps query a known operation identity, or retry using a documented duplicate-safe request key.

Timeouts still matter. Waiting forever consumes client and server resources. The lesson is to bound the wait **and** define how an uncertain result is recovered.

**Interview phrasing:** “I will distinguish an explicit input rejection from an unknown result after a timeout. For operations that must not duplicate, the API needs a stable request identity and a way to recover the original outcome.” You have now connected a small HTTP detail to a system-level correctness rule.`)],
diagrams:[diagram('http-exchange','response','Read both halves of the conversation','sequenceDiagram\nparticipant C as Client\nparticipant S as Notes API\nparticipant D as Saved notes\nC->>S: POST notes with text\nS->>D: Create note 42\nD-->>S: Stored\nS-->>C: 201 and note 42','This example responds after the defined durable save. Actual durability depends on the service storage contract.', ['Read the request method and target.','The API performs its promised save.','The client reads both status and returned identity.']),diagram('result-branches','status','A reply and no reply are different branches','flowchart TD\nR[Request sent] --> H{Reply received?}\nH -->|Yes| C[Read status and contract]\nH -->|No before deadline| U[Outcome may be unknown]\nC --> S[Success: show documented result]\nC --> E[Rejection: inspect reason]\nU --> P[Use documented recovery policy]','This teaching map groups outcomes; not every rejection or temporary error should be retried.', ['First distinguish a response from a missing response.','Interpret a returned status using the operation contract.','Recover unknown results without blindly duplicating effects.'])],
walkthroughs:[{id:'lost-create-reply',sectionId:'lost-reply',title:'Saved on the server, uncertain in the browser',intro:'A fictional API accepts one creation request. The response is lost after storage finishes.',steps:[step('The client submits','The note has not yet been confirmed. The UI should communicate that uncertainty.',{Client:'Saving…',Database:'No new note'}),step('The server saves','The saved fact now exists even though the caller has not seen its reply.',{Client:'Still waiting',Database:'Note 42 stored',Response:'201 on the return path'}),step('The deadline expires','The caller stops waiting. That timer does not undo note 42.',{Client:'Outcome unconfirmed',Database:'Note 42 still stored',Recovery:'Check documented operation status'})],takeaway:'The client timing out and the database rolling back are different events.'}],
exercise:{minutes:10,prompt:'Your image API accepts an upload request and starts a thumbnail job. Choose a response meaning, a useful returned identifier, and an honest UI message. Explain what the client should avoid if the response is lost.',rubric:['Accepted work is distinguished from completion.','A job or operation identity supports later lookup.','No blind duplicate creation after a timeout.'],solution:'A documented 202 response can mean the thumbnail job was accepted. Return a durable job identity and a status location so the client can display Processing and check progress. Do not display Thumbnail ready merely because the job entered the system. If the response is lost, follow a recovery contract such as retrying with the same supported operation key or querying a known operation identity. Creating a new unrelated job on every retry can duplicate expensive work. The API must define retention and identity rules rather than relying on a status code alone.'},
questions:[choice('q1','What does Content-Type describe?',['The body format','How many servers exist','Whether backups passed'],'The body format','It tells a receiver how the message content is represented.'),choice('q2','Our thumbnail API returns 202. What is established?',['The thumbnail is finished','The work was accepted under the API contract','The browser may ignore the job ID'],'The work was accepted under the API contract','Accepted does not mean completed.'),choice('q3','A request times out after the server saved its data. What remains possible?',['The saved data still exists','The timer automatically deleted it','The server never received anything'],'The saved data still exists','A caller timer does not automatically reverse remote work.'),open('q4','Why is a retry policy more than a list of status codes?','The policy also depends on the operation, whether its outcome is known, duplicate handling, deadlines, and server guidance.'),open('q5','Why is GET a poor public contract for charging a card?','GET is intended as a safe retrieval method; clients and intermediaries may repeat retrievals without intending a new business action.')],flashcards:[{front:'201 versus 202?',back:'201 reports creation; 202 reports acceptance without promising completion.'},{front:'Request body?',back:'The content carried by the message, such as a JSON note.'},{front:'Timeout proves rollback?',back:'No; the remote operation may already have completed.'},{front:'Where does business meaning live?',back:'In the API operation contract, alongside HTTP semantics.'},{front:'Why return a stable identity?',back:'It lets the client refer to the same saved resource or operation later.'}],mentalModel:'Read the envelope, inspect the outcome, and separate remote facts from what the caller knows.',sources:[source('HTTP semantics: RFC 9110','https://www.rfc-editor.org/rfc/rfc9110.html'),source('MDN: HTTP response status codes','https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status')]});

save({id:'pagination-from-scratch',week:3,title:'Pagination: read a large list in small, reliable pieces',minutes:45,
summary:'Use six rows to understand page size, offsets, cursors, ties, and changing data. A list API is a contract about order and continuation.',objectives:['Explain why list responses need a bound.','Trace an offset page and a cursor page through changing rows.','Choose a stable ordering and explain what pagination does not guarantee.'],terms:[term('Pagination','Returning a large result in bounded pieces.'),term('Offset','A number of matching rows to skip before returning a page.'),term('Cursor','A continuation value that identifies a place in an ordered result.'),term('Tie-breaker','An additional ordering field that makes equal primary values unambiguous.'),term('Snapshot','A view of data from a defined point or consistency boundary, rather than an automatically changing live list.')],retrieval:['What do ORDER BY and LIMIT do? Why might an index help a query that lists one owner’s notes?'],
sections:[sec('bound','A small screen does not need every row',`Imagine a user has 100,000 notes. Their phone can initially show only twenty titles. Returning every note would transfer unnecessary bytes and make the server and phone do work the current screen does not need.

The API can return a page of twenty plus a continuation value. The next request asks for the next piece.

${code('json','{"items":[{"id":60},{"id":50}],"next":"after-50"}')}

This tiny teaching response uses a readable cursor label. A real API may encode or sign its continuation state. It should still validate limits and filters on the server.

| Decision | A possible contract |
| --- | --- |
| Default page size | 20 rows |
| Maximum page size | 100 rows |
| Order | Newest immutable creation time, then ID |
| Completion | No next cursor means this traversal has no further page |

Do not accept an unbounded client limit just because the interface usually requests twenty. The boundary protects resources even when a client behaves differently.`),
sec('offset','Count how many rows to skip',`For an easy example, sort these immutable IDs from largest to smallest:

${code('text','60, 50, 40, 30, 20, 10\nPage size = 2\nPage 1: skip 0 → 60, 50\nPage 2: skip 2 → 40, 30')}

That is offset pagination. It is easy to understand and can suit small administrative lists.

Now insert ID 70 before fetching page two. The list becomes 70, 60, 50, 40, 30, 20, 10. Skipping two now returns **50, 40**. The client has already seen 50.

The offset did not remember an item. It remembered a count of positions in a result that later changed. A deletion before the boundary can shift rows in the other direction and cause a skip.

> **Pause and predict:** if your list changes often, does increasing the page size fix that boundary problem? It changes the amount of work, but it does not make a position count stable.`),
sec('cursor','Continue after a value instead of after a count',`For our descending ID example, the first page ends at 50. The next request asks for IDs **less than 50**, still in descending order, with limit two.

${code('sql','SELECT id, title\nFROM notes\nWHERE owner_id = 7 AND id < 50\nORDER BY id DESC\nLIMIT 2;')}

It returns 40, 30 whether or not 70 was inserted before the boundary. This is often called keyset pagination. An appropriate index, such as one beginning with owner and ID for this query, can help seek to the relevant region.

That does not mean every cursor is automatically fast. The actual filter, ordering, index, and database plan still matter. Nor does it mean the new ID 70 appears in this existing traversal; the user may refresh to see newly added items.

The worked example below keeps the page boundary visible so you can compare the two policies directly.`),
sec('ties','Equal timestamps need one more field',`A real notes app may sort by creation time. Two notes can share the same timestamp, so time alone is not always a complete ordering.

| Created at | ID | Descending position |
| --- | --- | --- |
| 12:00:00 | 52 | First |
| 12:00:00 | 51 | Second |
| 11:59:59 | 50 | Third |

Use both creation time and ID in the order. A continuation after the second row must carry both boundary values. Its condition means “an earlier time, or that same time and a smaller ID.”

If you carry only the time, a page boundary can lose some rows with equal timestamps. If you sort by an editable field, rows can move across your cursor while you traverse. Immutable ordering fields simplify the contract, but do not provide a complete snapshot by themselves.`),
sec('contract','Name the promises the cursor does not make',`A cursor is a place to continue, not a permission slip. Every request still checks the caller's access to the rows. A token should be bound to its intended filters and sort order; otherwise a client may continue a different query accidentally or maliciously.

Pagination also does not automatically freeze a changing dataset. When an export needs an exact, consistent view, the system needs a snapshot or another explicitly defined export strategy. That is a stronger requirement than “show the next twenty current notes.”

| Need | Candidate starting approach |
| --- | --- |
| Small stable admin list with page numbers | Bounded offset pagination |
| Large changing feed traversed sequentially | Cursor over a suitable stable order |
| Exact consistent report | Defined snapshot/export workflow |

**Interview phrasing:** “I would specify ordering, a maximum page size, and continuation semantics. A cursor helps traverse this indexed order, but it does not replace authorization or promise a frozen dataset.” This explains the behavior instead of just naming pagination.`)],
diagrams:[diagram('page-request','bound','One page at a time','sequenceDiagram\nparticipant C as Client\nparticipant A as List API\nparticipant D as Database\nC->>A: First page, limit 2\nA->>D: Ordered bounded query\nD-->>A: 60 and 50\nA-->>C: Items and cursor after 50\nC->>A: Next page after 50','The readable cursor stands for a documented continuation contract. Authorization occurs on every request.', ['Request a bounded first page.','Return its rows and a continuation value.','Use the continuation for the next request.']),diagram('cursor-choice','cursor','Insertion before the boundary changes an offset','flowchart TD\nA[First page: 60 and 50] --> I[Insert new row 70]\nI --> O[Offset: skip first two current rows]\nI --> K[Keyset: IDs below 50]\nO --> X[Returns 50 and 40]\nK --> Y[Returns 40 and 30]','This example orders immutable integer IDs descending. General cursor designs need complete ordering and explicit update behavior.', ['The first page ends at ID 50.','An insertion shifts current row positions.','A value boundary remains below ID 50.'])],
walkthroughs:[{id:'moving-boundary',sectionId:'cursor',title:'Follow an insertion between page requests',intro:'Page size is two. We compare the same requests against a deliberately small changing list.',steps:[step('Read the first page','Both policies begin with the same two rows.',{List:'60, 50, 40, 30, 20, 10',Seen:'60, 50',Boundary:'Offset 2; cursor 50'}),step('A new item arrives','The new item moves every old position one place to the right.',{List:'70, 60, 50, 40, 30, 20, 10',Seen:'60, 50',Cursor:'Still 50'}),step('Fetch the next piece','The keyset request follows the saved value boundary. The offset request counts current positions.',{Offset:'50, 40 — repeats 50',Keyset:'40, 30','New item':'70 appears on refresh'})],takeaway:'An offset tracks a position count; a keyset cursor tracks a value in a defined order.'}],
exercise:{minutes:10,prompt:'IDs are 90, 80, 70, 60, 50 in descending order. Page one returns 90, 80. Before page two, row 90 is deleted. Compare offset 2 with a keyset condition id < 80. Explain which row an offset traversal misses.',rubric:['Trace the current list after deletion.','Calculate each page from its actual rule.','Name the missing row and avoid promising full snapshot semantics.'],solution:'After deletion the current list is 80, 70, 60, 50. Offset 2 skips 80 and 70, then returns 60 and 50, so the traversal misses 70. The keyset condition id < 80 returns 70 and 60 and continues from the known value boundary. This example benefits from immutable IDs and a consistent descending order. It does not prove the entire traversal is a frozen snapshot: other records may be deleted or become inaccessible, and updates to an ordering field require a defined policy.'},questions:[choice('q1','Why bound a list response?',['To reduce unnecessary work and transfer','To remove authorization','To make all databases identical'],'To reduce unnecessary work and transfer','A page should match useful work and have a server-enforced maximum.'),choice('q2','After IDs 12 and 11 in descending order, which keyset condition continues below the boundary?',['id < 11','id > 12','Skip any random two rows'],'id < 11','The next page continues below the last returned value.'),choice('q3','Several records share a timestamp. What does a stable cursor need?',['Only the timestamp','A complete order including a tie-breaker','No ORDER BY'],'A complete order including a tie-breaker','The boundary must distinguish tied rows.'),open('q4','Why must authorization run for a cursor request?','The cursor describes continuation, not permission. Access can differ between users or change between requests.'),open('q5','Does keyset pagination automatically give an exact snapshot export?','No. A changing dataset can still be updated or deleted. Exact export consistency needs its own defined strategy.')],flashcards:[{front:'Offset?',back:'A count of matching rows to skip in the current result.'},{front:'Keyset cursor?',back:'A boundary value in a complete ordering.'},{front:'Why add an ID to timestamp ordering?',back:'To break equal-time ties unambiguously.'},{front:'Cursor equals authorization?',back:'No; every request still enforces access.'},{front:'Pagination equals snapshot?',back:'No; snapshot consistency is a separate contract.'}],mentalModel:'A page needs a size, an order, and a way to continue. State what happens when the list changes.',sources:[source('PostgreSQL: LIMIT and OFFSET','https://www.postgresql.org/docs/18/queries-limit.html'),source('PostgreSQL: row comparisons','https://www.postgresql.org/docs/18/functions-comparisons.html')]});

save({id:'numbers-bytes-and-units',week:5,title:'Bytes, bandwidth, and units without guessing',minutes:45,
summary:'Build a small calculation ledger. Convert bits and bytes, distinguish rates from quantities, and use estimates to ask better design questions.',objectives:['Distinguish bits, bytes, decimal prefixes, and binary prefixes.','Calculate a payload rate and an ideal transfer-time lower bound.','Keep assumptions, overhead, and headroom separate from arithmetic.'],terms:[term('Bit','One binary digit; a basic unit of information.'),term('Byte','Eight bits in the systems discussed here.'),term('Bandwidth','A rate at which a connection can carry information, often advertised in bits per second.'),term('Payload','The application content itself, before counting surrounding protocol and storage overhead.'),term('Headroom','Capacity intentionally left unused so variation and failures do not immediately exhaust the system.')],retrieval:['Which resource moves data between computers? How does that differ from the place that keeps saved data?'],
sections:[sec('units','First write the unit beside the number',`“The file is 20” is not enough information. Twenty bytes, megabytes, and gigabytes describe very different amounts. “The network does 100” is also incomplete: it needs an amount **per unit of time**.

Use the table as a small reference, not a memorization exercise:

| Written unit | Meaning |
| --- | --- |
| b | bit |
| B | byte; 8 bits |
| kB, MB, GB | 1,000; 1,000,000; 1,000,000,000 bytes |
| KiB, MiB, GiB | 1,024; 1,048,576; 1,073,741,824 bytes |
| Mbit/s | Million bits each second |
| MB/s | Million bytes each second |

For this chapter, all MB and GB values are decimal. A 100 Mbit/s connection has a theoretical raw rate of 12.5 MB/s because 100 divided by 8 is 12.5. Application throughput will usually be lower. Always check a dashboard's documented units rather than assuming its labels are precise.`),
sec('amount-rate','An amount and a rate answer different questions',`A photo occupies **4 MB**. A link transfers **20 MB/s**. A queue holds **300 jobs**. Workers finish **30 jobs/s**.

Look at the units before calculating:

${code('text','amount ÷ rate = time\n4 MB ÷ 20 MB/s = 0.2 s\n300 jobs ÷ 30 jobs/s = 10 s')}

The queue calculation assumes no new arrivals and a sustained finish rate. The file calculation ignores setup time, shared traffic, retransmission, and other overhead. They are useful idealized baselines, not promises to a user.

Now compare a different question: “How much data arrives each second?” That requires a number of operations per second multiplied by bytes per operation. Write the units so they cancel visibly. This habit catches many mistakes before a calculator is needed.`),
sec('payload','Follow a small upload workload',`Assume 50 users each upload one 2 MB photo in the same second. That is 50 uploads/s during this example burst, not an estimate of average daily behavior.

${code('text','50 uploads/s × 2 MB/upload = 100 MB/s\n100 MB/s × 8 bits/byte = 800 Mbit/s')}

This is the incoming photo payload rate. It excludes HTTP/TLS overhead and any extra internal copies. A nominal 1 Gbit/s link is therefore not a comfortably proven deployment just because 800 is below 1,000.

| Separate question | Extra information needed |
| --- | --- |
| Can the entry link carry it? | Sustained usable throughput and other traffic |
| Can the storage keep up? | Write throughput, latency, and request behavior |
| Can thumbnails keep up? | Processing time and worker capacity |

A system can pass the network calculation and still queue behind slow processing. Count the limiting resource on the actual request path.`),
sec('transfer','A transfer estimate is a lower bound',`Suppose a backup contains 6 GB and the only available connection is advertised at 100 Mbit/s. Ignore overhead for the first pass.

${code('text','6 GB = 6,000 MB\n100 Mbit/s ÷ 8 = 12.5 MB/s\n6,000 MB ÷ 12.5 MB/s = 480 s = 8 min')}

Eight minutes is an ideal transfer lower bound at that full raw rate. Recovery may also require reading the backup, verification, decompression, restoring indexes, and starting the application. Those activities can overlap or serialize depending on the implementation.

> **Common mistake:** calling this “our recovery time.” It estimates one part of recovery under optimistic assumptions. A restore drill measures the actual end-to-end result.

In an interview, say “the transfer alone takes at least about eight minutes under these assumptions” rather than promising an eight-minute recovery.`),
sec('retention','Multiply the right things, once each',`A telemetry service receives 1,000 events/s. Each stored logical event is estimated at 500 bytes. Keep 30 days.

${code('text','1,000 events/s × 500 B/event = 500,000 B/s\n500,000 B/s × 86,400 s/day = 43.2 GB/day\n43.2 GB/day × 30 days = 1,296 GB')}

That is about 1.296 TB of logical payload. Three complete physical copies would be 3.888 TB of that payload before indexes, metadata, spare capacity, and other storage overhead. Compression could reduce some bytes; do not assume its ratio without representative data.

Keep your ledger in three rows: logical payload, required copies, and additional overhead. Do not multiply by a replication factor twice because both your source number and your later estimate already included it.

**Pause and predict:** doubling retention doubles the retained payload in this steady-rate example. Does it necessarily double CPU capacity for live ingestion? No. Ingestion rate has not changed, though larger storage can change other operational work.`),
sec('explain','Use numbers to choose the next check',`An estimate is valuable when it changes a decision. If the calculated payload approaches available network capacity, measure sustained throughput and consider reducing transfer or increasing capacity. If the amount is tiny, investigate another bottleneck.

Use this short spoken pattern:

1. “I assume this number of operations per second.”
2. “Each carries roughly this many bytes.”
3. “That implies this payload rate.”
4. “I still need overhead, peak behavior, and failure headroom.”

For an AI platform, separate the size of a model artifact from how often it is downloaded and how much GPU memory a running model needs. A file size is not automatically the full memory budget. You will study those extra components later.

The goal is not impressive arithmetic. It is an explanation another person can check, correct, and use to choose a small experiment.`)],
diagrams:[diagram('unit-path','units','Convert once, keep the unit visible','flowchart LR\nA[100 Mbit per second] -->|Divide by 8| B[12.5 MB per second]\nB --> C[Raw transfer capacity]\nC --> D[Measure usable application throughput]','Decimal units are used here. Protocol overhead and shared resources reduce usable application throughput.', ['Read the capital or lowercase unit carefully.','Convert bits to bytes by dividing by eight.','Treat raw capacity as an upper bound, not observed throughput.']),diagram('rate-path','payload','From uploads to an incoming payload rate','flowchart TD\nA[50 uploads each second] --> C[100 MB each second]\nB[2 MB per upload] --> C\nC -->|Multiply by 8| D[800 Mbit each second]\nD --> E[Add overhead and check real capacity]','The workload is an illustrative burst. Average traffic, internal copies, and processing capacity are separate estimates.', ['State request rate and size separately.','Multiply to obtain payload bytes per second.','Compare compatible units before considering headroom.'])],walkthroughs:[{id:'transfer-ledger',sectionId:'transfer',title:'Build the backup-transfer estimate',intro:'Keep a ledger rather than doing invisible mental conversions.',steps:[step('State the quantities','The size is an amount; the link figure is a rate.',{Backup:'6 GB',Link:'100 Mbit/s',Units:'Decimal'}),step('Convert to matching byte units','Use megabytes on both sides so the division is meaningful.',{Backup:'6,000 MB','Raw rate':'12.5 MB/s',Conversion:'8 bits per byte'}),step('Divide and bound the claim','This covers ideal transfer, not the full restore procedure.',{Transfer:'480 s = 8 min',Overhead:'Not counted yet',Recovery:'Needs measured restore steps'})],takeaway:'Correct arithmetic becomes useful only when the unit and the scope of the claim stay attached.'}],
exercise:{minutes:10,prompt:'An API returns a 25 kB payload 400 times each second. Calculate its outgoing payload rate in MB/s and Mbit/s using decimal units. Name two reasons the required connection capacity may be larger.',rubric:['Multiply requests/s by bytes/response.','Convert decimal bytes to bits correctly.','Distinguish payload from overhead and headroom.'],solution:'400 responses/s × 25 kB/response = 10,000 kB/s = 10 MB/s. Multiplying by eight gives 80 Mbit/s of application payload. Protocol headers, encrypted framing, other requests, retransmissions, and demand spikes can require more connection capacity. Deliberate failure headroom may also be needed. These numbers do not tell us whether application CPU or database work can produce the responses at the required rate; those resources need separate checks.'},questions:[choice('q1','How many bits are in one byte here?',['8','1','1,000'],'8','Use eight bits per byte when converting these rates.'),choice('q2','What unit results from MB divided by MB/s?',['Seconds','MB squared','Requests'],'Seconds','The byte amount cancels, leaving time.'),choice('q3','Does an ideal transfer estimate establish the full recovery time?',['Yes, always','No, other recovery work and overhead remain','Only if the file has a short name'],'No, other recovery work and overhead remain','Restore verification, startup and actual throughput also matter.'),open('q4','Why label a number as logical payload before multiplying by copies?','It prevents double counting and makes explicit which storage overhead and replication assumptions remain.'),open('q5','What should follow a rate estimate close to a resource limit?','Measure representative sustained behavior, include overhead and peak/failure headroom, and investigate other resources on the same path.')],flashcards:[{front:'One MB in this chapter?',back:'1,000,000 bytes; MiB means 1,048,576 bytes.'},{front:'Convert Mbit/s to MB/s?',back:'Divide by eight, using matching decimal prefixes.'},{front:'Amount divided by rate?',back:'Time, when the units describe the same quantity.'},{front:'Payload estimate includes overhead?',back:'Only if explicitly stated; account for protocol and storage overhead separately.'},{front:'Why keep headroom?',back:'So variation and failures do not immediately exhaust capacity.'}],mentalModel:'Write the unit, show the cancellation, and label the assumptions before trusting the number.',sources:[source('NIST: metric SI prefixes','https://www.nist.gov/pml/owm/metric-si-prefixes'),source('NIST: prefixes for binary multiples','https://physics.nist.gov/cuu/Units/binary.html')]});
console.log('Authored four illustrated foundation chapters.');

