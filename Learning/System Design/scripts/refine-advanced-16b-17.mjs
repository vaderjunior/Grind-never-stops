import {refine,diagram as D,walk as W,step as S} from './refine-advanced-utils.mjs';

refine('design-rate-limiter',{
sections:{contract:`“100 requests per minute” is incomplete. Ask **who spends the allowance, which work it protects, and how bursts behave**.

| Contract | What it counts | Boundary to explain |
| --- | --- | --- |
| Fixed window | Requests in each named calendar minute | Two bursts can straddle a minute boundary |
| Rolling window | Requests in the preceding sixty seconds | Decisions must account for overlapping history |
| Token bucket | Stored credit plus credit earned over time | Idle time permits a burst up to capacity |

For this design, use a bucket per authenticated account and operation family: capacity twenty tokens, refill two tokens/s. A normal read costs one token. A costly export can have a separate policy.

After enough idle time, twenty reads can start immediately. Continuing credit arrives at two per second. This does **not** promise at most 120 requests in every rolling minute; capacity and refill define a different contract.

~~~text
trusted account + operation family + policy version
                    ↓
          one particular shared bucket
~~~

Do not use an unverified account field from the request body as the identity source. Decide what a policy change does to old credit instead of accidentally granting every caller a fresh burst.`,regions:`Compare regional designs against the same global promise.

| Design | Benefit | Cost or limit |
| --- | --- | --- |
| One authoritative bucket | One order for decisions on that subject | Cross-region delay and dependency |
| Full independent bucket in every region | Local decisions | Multiplies the intended global allowance |
| Static divided allowance | A known aggregate bound | Idle regional credit may be unusable elsewhere |

For a defined interval, a 60-request budget could be divided into 35 and 25. This is a reservation example, not an implementation of a time-refilling global token bucket. Every reservation needs the same interval definition and enforced local accounting.

Reassigning unused allowance is more difficult: the old region must not keep spending a share after it moves. This chapter deliberately stops at static reservations.

**Interview phrase:** “I can trade some utilization for a stated admission bound; dynamic reallocation needs its own coordination protocol.”`},
addedDiagram:D('limiter-shared-balance','failure','Fallback allowances add across independent servers','flowchart TB\nF[Shared decision unavailable] --> A[Server A: at most 5 reserved requests]\nF --> B[Server B: at most 5 reserved requests]\nA --> T[At most 10 extra requests in this fallback period]\nB --> T\nT --> E[Exhaust allowance then return defined rejection]','This illustrative bound assumes exactly two reserved budgets, one defined fallback period, and no accidental budget resets. It is not a universal recommended allowance.',['Identify every independent spender.','Assign a finite allowance to each.','Add the allowances to state the aggregate exposure.','Stop spending when the reservation is exhausted.']),
walkthrough:W('fractional-credit','Watch a bucket earn and spend credit','algorithm','This separate example has capacity 8, refill 3 tokens/s, and a request cost of 4. All decisions use one authoritative elapsed clock.',[
 S('Begin with full credit','The bucket has accumulated its maximum. More idle time cannot raise it above eight.',{'Time':'0 s','Tokens':'8','Capacity':'8','Refill':'3 tokens/s'}),
 S('A short burst consumes six','Six admitted one-token requests spend six units. No refill time has elapsed in this simplified burst.',{'Time':'0 s','Tokens':'2','Admitted work':'6 one-token requests'}),
 S('Half a second is not zero time','The next decision earns 1.5 tokens. A cost-four request is rejected without spending its cost.',{'Time':'0.5 s','Available':'3.5 tokens','Request cost':'4','Decision':'reject; retain 3.5'}),
 S('Retry only when credit is available','Another half second earns 1.5. The atomic decision can now spend four and leave one.',{'Time':'1.0 s','Before spending':'5 tokens','Decision':'allow cost 4','Remaining':'1 token'})
 ],'Capacity limits saved credit; elapsed time earns credit; only an admitted request spends it. Keep all three rules inside one protected decision.'),
changes:['Added a contract comparison table and concrete regional reservation example.','Added a bounded fallback-budget diagram.','Added a fractional-refill walkthrough with numbers distinct from the protected exercise.']});

refine('design-chat',{
sections:{scope:`Start with study-group rooms of at most fifty people: authorized members send text, receive it promptly while online, and recover history after being offline.

Leave voice calls, enormous public broadcasts, attachments, and end-to-end encryption architecture outside this first design. Transport encryption and authorization still apply to private text.

| Visible state | Evidence required in this product | Still unknown |
| --- | --- | --- |
| Accepted | Message committed to durable storage | Whether another device received it |
| Delivered | Recipient device acknowledged receipt | Whether the person viewed it |
| Read | Client reported the defined viewing event | What the person understood or remembers |

A successful socket write is not all three. Decide the meaning of each user-interface check mark before designing the messages that update it.

**Pause and predict:** a recipient closes the app before the server stores a message. Which component must remember the message so it can appear tomorrow?`,model:`Give identity, content, and order separate fields.

| Fact | Example | Owner or rule |
| --- | --- | --- |
| Room | study_6 | Room and membership records |
| Intended send | user_14 / send_81 | Reused only for the same intended text in this room |
| Accepted message | msg_108 | Durable message store |
| Room position | sequence 108 | Assigned by the room’s defined authority |
| Display time | server timestamp | Useful for display; not the sole ordering authority |

Store the room, sender, client message ID, text, and accepted sequence. A unique room/sender/client-ID combination finds a repeated send. Reject different text under that same identity rather than silently changing its meaning.

A database transaction or designated durable room owner assigns the sequence and stores the message. Unrelated rooms do not need one global order.

Device clocks can differ and network arrivals can be delayed. A timestamp alone therefore does not explain a strict room order. The next chapter adds edits, deletions, and reconnect behavior to this model.`},
addedDiagram:D('chat-evidence-stages','send','Three observations require three different events','sequenceDiagram\nparticipant S as Sender\nparticipant A as Chat API\nparticipant D as Durable history\nparticipant R as Recipient device\nS->>A: Send text with stable identity\nA->>D: Commit message and delivery event\nD-->>A: Accepted sequence\nA-->>S: Accepted\nA->>R: Illustrative live delivery\nR-->>A: Device receipt\nNote over R: User later opens the conversation\nR-->>A: Read report under product rule','The delivery arrow abstracts the worker and gateway shown elsewhere. Each receipt is application evidence, not proof of human comprehension.',['Wait for durable commit before reporting accepted.','Deliver through the live path when a recipient is reachable.','Record device receipt separately.','Record read only under the stated client/product rule.']),
walkthrough:W('message-evidence','Follow the evidence behind the check marks','scope','Sara sends “Review at 3?” in study_6. Omar is connected. We follow an ordinary successful send without assuming that saving and reading happen together.',[
 S('Sara presses send','The client records an intended send and shows a pending state while the service validates it.',{'Room':'study_6','Client identity':'send_81','Client display':'pending'}),
 S('The service accepts the message','The durable transaction commits msg_108 at room position 108. The sender can now see accepted.',{'Message':'msg_108','Room position':'108','Storage':'committed','Recipient evidence':'none yet'}),
 S('Omar’s device receives it','The device acknowledges the application message. It may be in the background while Omar does something else.',{'Message':'msg_108','Device receipt':'recorded','User viewing':'not reported'}),
 S('The client reports viewing','Omar opens the conversation. Its read report updates the product’s read state under the chosen rule.',{'Message':'msg_108','Read report':'through room position 108','Meaning':'client reported viewing'})
 ],'Do not compress durable acceptance, device receipt, and user-visible reading into one unexplained “sent” state.'),
changes:['Turned message states and data ownership into concrete tables.','Added a receipt-evidence sequence diagram.','Added a normal-send walkthrough distinct from the lost-response assessment.']});

refine('chat-reconnect-and-scale',{
sections:{gap:`A connection reopening does not fill in the history that arrived while it was closed.

| Event | Client view | Hidden problem |
| --- | --- | --- |
| Ben has applied through 40 | Cursor 40 | Later messages may exist |
| History returns 41–50 | Cursor can reach 50 | Live subscription is not active yet |
| Alice sends 51 | Ben receives nothing | It falls between the two operations |
| Subscription activates; 52 arrives | Ben sees 52 | Message 51 is still missing |

Both individual requests succeeded. The combined transition failed.

Subscribing before replay can deliberately create overlap instead. The same event may arrive from history and live delivery; stable identities let the client recognize it. This still needs a confirmed subscription boundary, bounded buffers, and repair rules.

**Common mistake:** treating WebSocket as a replay protocol. It carries messages over a live connection; your application must define how missing history is recovered.`,bounds:`A mobile client applies twenty events/s while a busy room produces two hundred. A buffer retaining all traffic grows by about 180 events/s. More memory buys time; it does not change the rate imbalance.

| Condition | Defined response | What must not happen |
| --- | --- | --- |
| Small temporary delay | Buffer within size and age limits | Grow memory without a bound |
| Buffer limit reached | Enter explicit repair/resync mode | Drop events but report caught up |
| Requested cursor expired | Return expired-cursor state and a recovery path | Return an empty success as though nothing changed |

A snapshot must name the state it contains and the replay position associated with it. Older message history may still require separate pagination.

Protect each connection with its own budget so a slow device cannot hold every room worker. The server may stop live delivery and require bounded catch-up; that is more honest than keeping an unfinishable promise.

**Pause and predict:** which resource is growing when arrival rate exceeds application rate? Draw the buffer, then point to the policy that eventually stops growth.`},
addedDiagram:D('chat-repair-state','bounds','Overflow changes the mode instead of hiding loss','flowchart LR\nL[Live with bounded buffer] --> C{Within size and age limits?}\nC -->|Yes| A[Apply and advance safe cursor]\nA --> L\nC -->|No| R[Explicit resync required]\nR --> H[Authorized snapshot or bounded replay]\nH --> V[Verify catch-up boundary]\nV --> L','The recovery path requires a snapshot/replay contract and retained data. A reconnect alone is not evidence of catch-up.',['Measure the backlog for this connection.','Continue only while the buffer stays within its limits.','Report resync when ordinary live delivery can no longer keep its promise.','Resume after the recovery boundary is established.']),
walkthrough:W('bounded-replay-bridge','Build an overlap that the client can account for','handoff','Use a separate room trace with client cursor 200. The live subscription is confirmed before the committed replay boundary is read.',[
 S('Establish the live buffer','The gateway confirms this room subscription is active. Newly committed events can now be retained within its finite allowance.',{'Applied cursor':'200','Subscription':'active','Buffer':'empty'}),
 S('Read the boundary','The durable log reports H=203. Event 204 commits afterward and enters the live buffer.',{'Replay boundary':'203','Replay range':'201–203','Buffer':'204'}),
 S('Apply the finite replay','The client applies 201, 202, and 203. Any copies of those same positions from the live path are overlap, not new history.',{'Applied cursor':'203','Completed replay':'201–203','Buffer after overlap removal':'204'}),
 S('Join the live stream','The next required committed event is 204, which can now be applied. The client is live under the same repair and memory limits.',{'Applied cursor':'204','Buffer':'empty','Mode':'live with gap and overflow checks'})
 ],'The high-water mark makes catch-up finite. Stable positions make overlap safe; neither feature permits skipping required history.'),
changes:['Replaced the reconnect-race paragraph with an event timeline table.','Added explicit overflow/expired-cursor outcomes and a repair-state diagram.','Added a different-position subscription/replay walkthrough without exposing the assessment ordering sequence.']});
