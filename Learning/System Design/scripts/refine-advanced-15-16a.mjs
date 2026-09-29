import {refine,diagram as D,walk as W,step as S} from './refine-advanced-utils.mjs';

refine('interview-game-plan',{
sections:{contract:`Start with a **record** and two **operations**. The record is the information that must survive; an operation is something the service promises to do.

| Item | Small example | Why it matters |
| --- | --- | --- |
| Link identity | link_204 | Still identifies the record if display text changes |
| Public code | maple7 | Visitors use this to find the destination |
| Destination | https://notes.example/public/trees | The saved address, not a value guessed during a redirect |
| Creator | user_8 | Checked against the authenticated caller |
| Expiration | tomorrow at 18:00 UTC | Changes whether a lookup may redirect |

Sketch the contracts beside the table:

~~~text
POST /links + destination + operation key
    → accepted short code, or a defined rejection

GET /s/maple7
    → redirect, expired/not found, or temporarily unavailable
~~~

Authentication identifies the caller. Authorization decides whether that caller may act. A body field saying creator=user_8 is not proof of either.

Keep click analytics as a separate record and optional path. A visitor should not wait for an analytics dashboard before reaching the destination.

**Pause and predict:** which field must the redirect handler inspect when expiration becomes a requirement? Point to it in the record before adding another box.`},
addedDiagram:D('interview-decision-loop','focus','Let a requirement choose the next detail','flowchart LR\nR[Requirement: fast popular redirects] --> Q[Question: where is read work spent?]\nQ --> M[Estimate and measure the lookup path]\nM --> C[Consider a bounded cache]\nC --> F[Explain misses expiry and deletion]\nF --> R','A design conversation is iterative. The cache is a candidate choice, not an automatic answer to every prompt.',['Name the product behavior that matters.','Locate the work that could prevent it.','Choose a mechanism and state its cost.','Check whether failure or a changed requirement invalidates the choice.']),
walkthrough:W('one-link-two-journeys','Follow one fact through your explanation','flow','Use different people for creation and reading. Keep the same saved link visible as the story moves.',[
 S('The creator makes a request','Maya asks to create a link. The application has received an intention; there is no accepted mapping yet.',{'Caller':'Maya / user_8','Operation key':'create_52','Mapping':'not accepted'}),
 S('The database accepts the record','Validation and authorization pass. The database accepts the unique code and the result belonging to this operation key.',{'Link':'link_204','Code':'maple7','Destination':'/public/trees','Operation result':'create_52 → maple7'}),
 S('A visitor follows the code','Arun requests the short code. The handler retrieves the accepted mapping and checks its expiration and policy.',{'Caller':'Arun','Lookup':'maple7','Mapping':'link_204','Policy':'eligible now'}),
 S('Close the loop','The browser receives a redirect and starts a separate destination request. Optional analytics may still be pending.',{'Required result':'redirect returned','Next browser request':'destination page','Analytics':'may lag'})
 ],'A complete explanation shows what is accepted, where it is stored, and how a different request uses it.'),
changes:['Replaced a dense contracts paragraph with an example record table and annotated request/response flow.','Added a requirement-to-mechanism decision diagram and a four-step link lifecycle walkthrough.','Added a pause-and-predict prompt without revealing the protected deletion exercise.']});

refine('estimates-and-tradeoffs',{
sections:{traffic:`Follow the units instead of jumping from people straight to servers. Under our invented inputs, one million daily active users each upload two 3 MB photos.

| Calculation | Result | What it describes |
| --- | --- | --- |
| 1,000,000 × 2 | 2,000,000 uploads/day | User operations |
| 2,000,000 ÷ 86,400 | about 23 uploads/s | Average operation rate |
| 23 × 3 MB | about 69 MB/s | Average incoming file bytes |
| About 5 × average | about 115 uploads/s and 345 MB/s | Assumed peak, rounded |

The peak factor is an assumption to investigate, not a law of traffic. Carry a sensible range instead of presenting the rounded numbers as exact measurements.

**One request count can hide very different work.** Sending a 1 kB metadata request and uploading a 3 MB photo are both one operation, but their byte costs differ by roughly 3,000 times.

This supports investigating direct object uploads: the API authorizes the operation and records metadata, while the object-storage path carries the bytes. The application still owns permission, completion validation, and cleanup.

**Interview phrase:** “The byte path is my first concern under these assumptions; I would verify the file-size distribution before choosing capacity.”`,capacity:`Suppose a representative load test finds that one worker sustainably processes fifty thumbnail jobs per second. Peak demand is 200 jobs/s.

| Available workers | Modeled capacity | What the arithmetic says |
| --- | --- | --- |
| 4 | 200 jobs/s | Exactly matches demand; no spare worker |
| 5 | 250 jobs/s | One worker can disappear while 200 jobs/s remains |
| 5, but storage limits the fleet to 170 jobs/s | 170 jobs/s | More worker arithmetic does not remove the shared limit |

This is a capacity model with equal workers and the tested image mix. It is not a guarantee for larger images, a different machine, or a slower dependency.

During a finite burst, a queue stores excess work. During a lasting deficit, the queue keeps growing. Decide how old a job may become before the service rejects, delays, or changes its promise.

**Common mistake:** calling the arithmetic minimum “reliable.” A reliability argument must also name the failure being tolerated and the capacity that survives it.`},
addedDiagram:D('operation-versus-bytes','defend','Two paths answer two different load questions','flowchart TB\nU[One authorized upload] --> A[API handles identity and metadata]\nU --> B[Object path handles file bytes]\nA --> Q[Measure operations per second]\nB --> V[Measure bytes per second]\nQ --> C[Choose capacity from measured bottleneck]\nV --> C','This compares responsibilities, not a complete signed-upload protocol. Authorization and publication checks remain required.',['Separate the control request from the file transfer.','Count the operations on the API path.','Count the bytes on the content path.','Test the path that actually limits the workload.']),
walkthrough:W('small-attachment-estimate','Make an estimate change one decision','defend','A separate practice scenario uses 120 attachments per minute at 5 MB each. We will change only file size to see what the conclusion depends on.',[
 S('Count the requests','Convert the stated minute into seconds before considering storage or machine counts.',{'Input':'120 uploads/minute','Time conversion':'60 seconds/minute','Operation rate':'2 uploads/s'}),
 S('Attach the payload size','Each operation carries 5 MB. The service receives 10 MB of file data each second under the smooth-arrival assumption.',{'Operation rate':'2 uploads/s','Average file':'5 MB','Incoming bytes':'10 MB/s'}),
 S('Vary the uncertain input','Suppose real files average 20 MB. The number of uploads is unchanged, but the byte path now carries four times as much data.',{'Operation rate':'2 uploads/s','Average file':'20 MB','Incoming bytes':'40 MB/s'}),
 S('Name the next measurement','Measure sizes and burst shape before selecting the transfer path or its capacity. The estimate points to the sensitive input.',{'Decision':'investigate file-transfer capacity','Sensitive input':'file size and bursts','Status':'estimate, not a benchmark'})
 ],'Changing one input at a time reveals which design decision the estimate can actually support.'),
changes:['Turned traffic arithmetic and worker headroom into explicit unit tables.','Added a control-versus-byte-path diagram.','Added a different-number sensitivity walkthrough that does not expose the protected file-retention exercise.']});

refine('design-notifications',{
sections:{data:`Separate the message we intend to show from the attempts used to deliver it.

| Record | Example | Its responsibility |
| --- | --- | --- |
| Comment | c_47 on design_9 | Own the actual discussion text |
| Notification | n_63 for event e_47 and learner_12 | Own one logical inbox item |
| Channel attempt | a_1: n_63 by email | Record one attempt and provider evidence |

A uniqueness rule on event, recipient, and category can keep repeated event processing from creating two logical inbox items. It does not prevent all repeated external emails.

An attempt also needs status, next_attempt_at, and any provider reference. Several attempts can belong to one notification without becoming several user intentions.

Preferences say which categories and channels the learner permits. A template version identifies the wording used. Link to the real comment rather than copying unnecessary private discussion text into queues and logs.

**Pause and predict:** if a message is offered twice by the queue, which identity should stay the same? Keep the business event identity separate from an individual worker attempt.`,scope:`Our course app notifies a learner when a study partner comments on a shared design. Start with in-app and email delivery, preferences, history, and bounded retries. The comment must remain discoverable even when email is delayed.

| State you can observe | What it supports | What it does not establish |
| --- | --- | --- |
| Comment and outbox committed | The source change and publication intent were saved | A notification worker has run |
| In-app item created | One inbox item exists | The learner opened it |
| Provider accepted | The provider accepted that email submission | Inbox delivery or human reading |

Leave marketing campaigns and international SMS routing outside this first design. State names should describe evidence rather than make “sent” cover every stage.

**Interview phrase:** “I can promise durable notification intent at comment acceptance; external delivery has a separate state and failure policy.”`},
addedDiagram:D('notification-state-boundaries','flow','One logical item can have several channel attempts','flowchart TB\nE[Event e_47] --> N[Notification n_63 for learner_12]\nN --> I[One in-app inbox item]\nN --> A[Email attempt a_1]\nA --> P[Provider acceptance evidence]\nA --> R[Retry decision if temporary failure]\nR --> B[Attempt a_2 for same n_63]','The branches are distinct records and outcomes. Provider acceptance does not prove a person read the email.',['Keep the event and recipient tied to one notification identity.','Create the in-app item under its uniqueness rule.','Track provider evidence on the channel attempt.','If retry is allowed, keep the logical notification identity.']),
walkthrough:W('repeated-comment-event','A repeated event does not need a second inbox item','outbox','Follow successful publication and then a repeated queue delivery. This trace concerns our own inbox database, whose uniqueness rule we control.',[
 S('Accept the comment','One database transaction saves the comment and its outbox event.',{'Comment':'c_47 committed','Outbox event':'e_47 committed','Inbox item':'none yet'}),
 S('Deliver the event','The publisher offers e_47 to the queue. The source comment already exists even if the publisher later runs again.',{'Event identity':'e_47','Queue deliveries':'first delivery','Source record':'c_47'}),
 S('Create the logical notification','The worker accepts one item for this event, recipient, and category.',{'Notification':'n_63','Uniqueness key':'e_47 / learner_12 / comment','Inbox items':'1'}),
 S('See the same event again','Another delivery has the same business identity. The database resolves it to the existing notification instead of creating another.',{'Event identity':'e_47 again','Notification':'existing n_63','Inbox items':'still 1','Email evidence':'tracked separately'})
 ],'Queue deliveries and logical notifications are different counts. The uniqueness boundary protects only the effect it actually owns.'),
changes:['Added explicit durable-record and delivery-evidence tables.','Added channel-attempt branching diagram and concrete duplicate-event walkthrough.','Clarified inbox uniqueness versus external provider outcomes while leaving the crash-recovery exercise protected.']});
