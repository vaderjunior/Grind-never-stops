import {refine,walk as W,step as S} from './refine-advanced-utils.mjs';

refine('design-bookings',{
sections:{seat:`Priya and Mateo both see tonight’s seat A12 as available. That can be a truthful recent observation in both browsers. It cannot become two confirmed promises.

**Invariant:** for one show and seat, at most one current active claim may exist under the declared hold/booking lifecycle. A12 in tomorrow’s show is a different inventory item.

| Observation or decision | Example | May it be stale? |
| --- | --- | --- |
| Seat-map read | “A12 looked free a moment ago” | Yes, under the browsing policy |
| Atomic claim | “H1 now owns this show/seat” | Must follow the authoritative current rule |
| Confirmation | “This same valid hold becomes booked” | Must check the exact current claim |

A receptionist with one physical ticket can show it to two people but hand it to only one. The authoritative check-and-change plays that role in software.

~~~text
read free → pause → write held     can race
check claimable AND change owner   must be one protected decision
~~~

**Pause and predict:** adding ten API servers creates how many copies of the physical seat? Separate request capacity from inventory.`,scale:`Make viewing inexpensive while keeping checkout authoritative.

| Path | Useful optimization | Rule that remains |
| --- | --- | --- |
| Browse a seat map | Cache approximate availability | Explain that availability can change |
| Request a hold | Bound admission and contention | One authoritative check-and-change |
| Enter payment details | Continue outside a long database transaction | Persist a bounded hold identity |

If 5,000 people contend for one seat, more servers can receive requests but cannot grant 5,000 seats. Bound waiting and reject excess work clearly so retries do not overwhelm the authority.

Fairness is a separate requirement. The first successful transaction is not necessarily the first human click; network timing and scheduling intervene.

**Interview phrase:** “Browsing can be approximate; the hold is the inventory promise.” Point to the operation that makes one contender lose, then test the existing late-confirmation timeline.`},
walkthrough:W('one-seat-one-decision','See where two observations become one claim','claim','A separate show has one available seat B9. Zoe and Kai see the same cached map. The order below is illustrative, not a fairness guarantee.',[
 S('Both view availability','The browsers have the same recent observation. Neither has a hold identity.',{'Inventory key':'show_5 / B9','Stored state':'available','Zoe and Kai':'both viewing free'}),
 S('Zoe’s claim reaches the authority','The protected predicate matches and the database accepts one hold.',{'Inventory key':'show_5 / B9','Current hold':'Q101','Owner':'Zoe','State':'held until authority deadline'}),
 S('Kai’s claim reaches the same boundary','The predicate no longer finds a claimable seat. It returns an unavailable result rather than creating another active holder.',{'Current hold':'Q101','Owner':'Zoe','Kai result':'unavailable','Active claims':'1'}),
 S('The interface catches up','Kai can refresh or choose another seat. Zoe continues checkout using Q101 without keeping the original database transaction open.',{'Kai next action':'choose another seat','Zoe checkout identity':'Q101','Original transaction':'already committed'})
 ],'The shared mutation decides inventory. The map and the browser only describe or request that decision.'),
changes:['Added observation-versus-promise and browse/checkout responsibility tables.','Added a compact race-versus-atomic-operation flow.','Added a contention walkthrough with different identities from the protected late-payment exercise.']});

refine('design-payments',{
sections:{identity:`Persist one intended operation before asking the provider to act.

| Field | Example role | Why retain it? |
| --- | --- | --- |
| Local attempt identity | P42 | Find the same intent after a retry or restart |
| Order, amount, currency | Exact request parameters | Detect conflicting reuse |
| Provider idempotency key | K42 | Invoke the provider’s repeat-operation contract |
| Provider operation reference | E9 when learned | Resolve and compare external evidence |
| Local knowledge state | pending / verified result | Tell the user what is actually known |

Protect local duplicate checkout submissions so they find the same attempt rather than create racing records. A different purchase needs its own identity.

Provider idempotency has a scope, retention period, and parameter policy. Reusing a key outside that contract is not a universal guarantee. Once retention may have expired, investigate the existing operation rather than assuming the next request will still be deduplicated.

An HTTP success can report an accepted, still-processing operation. Store the actual provider lifecycle state rather than translating every successful response into final settlement.`,records:`Use a second evidence route when callbacks are missing. Reconciliation compares unresolved local attempts with authoritative provider operations or the appropriate reports.

| Local record | Verified external evidence | Appropriate next step |
| --- | --- | --- |
| Unresolved attempt | Operation still processing | Keep a truthful pending state |
| Order says unpaid | Matching operation succeeded | Validate identity/amount and apply the allowed local transition once |
| One order | Two distinct successful operations | Preserve evidence and open a discrepancy workflow |
| Any state | Contradictory or unverified message | Investigate; do not silently force success |

Callbacks and reconciliation may discover the same result. The business transition itself must be repeatable, not only the callback handler.

Keep amounts exact and attach a currency. Retain operation history so a current total can be explained. Where a ledger is required, correcting entries preserve history instead of rewriting previous entries.

This teaching model is not an accounting or regulatory completeness claim. The actual product and provider contract define the required records.

**Pause and predict:** does reaching a local “pending too long” timer prove the provider failed? An investigation deadline changes the recovery action, not the external fact.`},
walkthrough:W('reconcile-one-attempt','Resolve a pending record from verified evidence','records','A separate attempt P73 has waited longer than the investigation threshold. This trace uses a provider status lookup rather than the protected duplicate-webhook scenario.',[
 S('Find unresolved work','The reconciliation worker selects P73 using its saved provider reference. It does not create another intended charge.',{'Local attempt':'P73','Provider reference':'ext_31','Local knowledge':'unresolved','Action':'query existing operation'}),
 S('Compare the evidence','The provider reports the operation’s succeeded state. The application verifies that reference, amount, and currency match P73.',{'Reference':'ext_31 matches','Amount/currency':'match saved request','Provider operation':'succeeded'}),
 S('Accept one local transition','An allowed conditional transition records the evidence and updates the associated order workflow. Another evidence path must resolve to the same business result.',{'Local attempt':'verified succeeded','Order transition':'applied once','Evidence reference':'ext_31 retained'}),
 S('Report the provider-specific outcome','The status endpoint reports the known operation result. Later settlement, refunds, or disputes remain their own lifecycle facts where applicable.',{'User status':'verified operation result','Original history':'retained','New financial operation':'none created by reconciliation'})
 ],'Reconciliation learns what happened to an existing operation; it should not manufacture a new operation to remove uncertainty.'),
changes:['Replaced dense identity and reconciliation paragraphs with record/evidence tables.','Added a verified-status reconciliation walkthrough separate from duplicate-webhook exercise details.','Retained provider-specific retention, lifecycle, uncertainty, and exact-money constraints; rechecked official Stripe idempotency/webhook references.']});

refine('coordination-and-leases',{
sections:{partition:`When agreement is unavailable, name which operation must pause instead of labeling the whole product simply “down.”

| Operation | Can it continue in this report example? | Reason |
| --- | --- | --- |
| Read an already published report | Often yes, if its storage is reachable | No new ownership decision is required |
| Compute a private candidate report | Possibly, under a resource policy | Duplicate computation may only waste work |
| Establish new publication ownership | Wait or fail if safe agreement cannot be obtained | Must not invent conflicting authority |
| Replace the shared published result | Only under the resource’s current authority rule | This is where stale work can damage state |

A worker unable to reach the coordinator cannot assume its old authority lasts forever. The report authority must enforce the chosen current-epoch and validity protocol.

Separating private calculation from shared publication often reduces the need for broad locking. If a unique constraint or conditional write already protects the real mutation, prefer explaining that boundary first.

**Interview phrase:** “I can tolerate duplicate calculation here; I must prevent stale publication.”`,interview:`Use a three-part explanation:

~~~text
who grants authority → how new authority reaches the resource
                    → where an old mutation is rejected
~~~

Point to the destination check in the stale-worker diagram. A lease expiring is a protocol event, not a command that physically stops old code.

| Mechanism | What it contributes | What it cannot establish alone |
| --- | --- | --- |
| Lease | A defined time-limited ownership rule | Old process termination |
| Ordered fencing token | Distinguishes newer from older authority | Rejection by a destination that ignores it |
| Consensus-backed coordinator | Agreement within its protocol scope | Atomicity of unrelated external effects |

Ask whether the destination supports the required conditional update. If it ignores tokens, consider an enforceable gateway or another workflow; attaching an unused number changes nothing.

Consensus internals are optional deeper study. General backend reasoning begins with the ownership scope, handoff, destination enforcement, and what becomes unavailable during uncertainty.`},
walkthrough:W('private-work-public-result','Separate work in progress from the protected publication','partition','Two workers have produced candidate reports. Follow how the resource accepts one current publication without pretending the coordinator can stop every old CPU instruction.',[
 S('Compute candidates privately','Worker A has an older candidate. B has a newer ownership grant. Neither candidate path alone changes the public report.',{'A candidate':'private output a','B candidate':'private output b','Public report':'existing revision'}),
 S('Establish usable authority','The handoff protocol registers B’s epoch 62 at the report authority before considering B’s publication authority usable.',{'Coordinator grant':'B / epoch 62','Resource epoch':'62 established','Scope':'monthly report for team_5'}),
 S('Publish under the protected check','B’s authorized request carries epoch 62. The resource accepts the conditional publication for this scope.',{'Submitted epoch':'62','Resource epoch':'62','Published result':'B candidate'}),
 S('Reject stale mutation at its destination','A’s delayed epoch 61 request reaches the same resource. Its old authority is rejected even if A is still running.',{'Submitted epoch':'61','Resource epoch':'62','Decision':'reject stale publication','A process':'may still execute'})
 ],'Protection comes from an enforced publication boundary. Agreement and token issuance elsewhere are necessary only as far as the chosen protocol requires, and are not substitutes for that check.'),
changes:['Added an operation-by-operation availability table and mechanism/limit comparison.','Added an explicit grant→resource→rejection flow.','Added a concrete publication-state walkthrough preserving the reviewed handoff/fencing nuance.']});
