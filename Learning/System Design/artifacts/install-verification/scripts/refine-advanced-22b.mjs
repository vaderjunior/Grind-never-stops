import {refine,walk as W,step as S} from './refine-advanced-utils.mjs';

refine('change-data-safely',{
sections:{switch:`A target with the same number of rows can still contain the wrong rows. Validate meanings, not only counts.

| Check | Example question | Why count alone misses it |
| --- | --- | --- |
| Current versions | Is document 17 at the accepted revision? | An old version still counts as one row |
| Deletion | Is a known removed document suppressed? | A stale record can replace a missing record in the total |
| Permission | Can each test principal see only allowed results? | Row totals do not describe audience |
| Representative queries | Do expected useful documents appear? | Correctly copied text can be analyzed incorrectly |

Use bounded read-only shadow queries to compare generations without overloading the live source. Record which differences are intended and which are defects.

Switch the serving pointer only after the declared catch-up and validation gates. Keep the old generation during a defined observation window if it remains compatible and updated.

Rollback is not merely changing an address. Old code must understand newly accepted formats and semantics. An expand-and-contract change adds compatible fields first, updates readers and writers in stages, and removes old fields only after the compatibility window closes.`,history:`Event sourcing changes which record is authoritative.

| Record type | Meaning | Example |
| --- | --- | --- |
| Incoming command | A request that can be rejected | “Upgrade membership M17” |
| Accepted domain event | A fact accepted under domain rules | “Membership M17 upgraded to Pro” |
| Projection | A derived current view | M17 currently has tier Pro |

A normal database commonly stores current state with logs supporting durability or change capture. In event sourcing, the accepted domain event history itself is the authority; projections fold that history into useful views.

This supports reconstruction and audit only with deliberate ordering, event versions, correction semantics, and personal-data handling. It is not equivalent to retaining every HTTP request, and it is not automatically simpler than ordinary create/read/update/delete operations.

~~~text
replay accepted facts → rebuild the intended view
                    ↛ automatically issue fresh external commands
~~~

A historical payment fact can update a report. It must not silently create another charge. Keep external effects behind an explicit, enforced policy in replay mode.

**Pause and predict:** a rejected upgrade request appears in an access log. Should replaying that log turn the membership into Pro? A request log is not the accepted domain history.`},
walkthrough:W('event-versus-view','Rebuild a current view from accepted facts','history','A small membership history shows why requests, accepted events, and projections are different. No external effects are enabled in this reconstruction.',[
 S('Start from the retained history','The authoritative stream contains two accepted domain facts with a defined order.',{'Membership':'M17','Event 1':'Opened at Basic','Event 2':'Tier changed to Pro','Replay effects':'disabled'}),
 S('Apply the first fact','A new projection applies the opening event and records the resulting current state.',{'Projection generation':'B','Applied through':'event 1','Current tier':'Basic'}),
 S('Apply the next fact','The next accepted fact changes the derived tier. It does not submit the original upgrade command again.',{'Applied through':'event 2','Current tier':'Pro','New provider call':'none'}),
 S('Validate what was reconstructed','Compare the intended current view and event position. A discarded or rejected request is not inserted as an accepted fact.',{'Current view':'M17 / Pro','History boundary':'event 2','Authority':'accepted events','Validation':'state plus boundary'})
 ],'A replay interprets accepted history to reconstruct a view. It does not decide anew whether past requests should succeed.'),
changes:['Added migration validation questions beyond counts in a table.','Added command/event/projection comparison and an effect-boundary text flow.','Added a membership-event reconstruction walkthrough while retaining both reviewed migration/replay diagrams.']});

refine('mcp-platform-architecture',{
sections:{actors:`An engineer asks an assistant for a training deployment’s status. Name the participants before drawing Pods.

| Participant | In this example | Responsibility |
| --- | --- | --- |
| Human | Engineer asking the question | Express the task and authorized scope |
| AI host | The assistant application | Coordinate interaction, model output, and tool policy |
| MCP client | Host-side protocol component | Communicate with this MCP server |
| MCP server | Remote status service | Expose a bounded capability and enforce request rules |
| Downstream system | Platform API | Supply actual deployment evidence |

The model is not a trusted network administrator. Tool descriptions and schemas help select and validate an operation; they do not grant unlimited authority.

Tools expose operations, resources expose retrievable context, and prompts expose reusable interaction templates where supported. Their protocol shapes do not choose your business permissions.

Start with get_deployment_status, a bounded read. This conceptual design does not contact a real SAP or Kyma deployment.

**Pause and predict:** which participant knows whether the current engineer may inspect the requested tenant? “The model chose the tool” is not an access-control rule.`,replicas:`Two replicas can serve independent requests if each validates identity and can reach the needed authoritative state. A stateless handler does not require the same process’s private memory on the next request.

| Identity or state | Lifetime and purpose | Do not confuse it with… |
| --- | --- | --- |
| JSON-RPC request ID | Correlates one protocol exchange | A durable business duplicate guarantee |
| Authenticated principal | The verified actor for authorization | A free-form tool argument |
| Application operation key | One intended action across allowed retries | A new key for each attempt |
| Job identity | Durable work and status | The lifetime of a response stream |
| Conversation context | Information used by the host interaction | Permanent permission for all tools |

For a future write tool, store the operation key, compatible request fingerprint, and result at a shared concurrency boundary. Otherwise two replicas can both create work under the same logical intent.

~~~text
request to replica A ─┐
                     ├→ shared protected operation record
retry to replica B ───┘
~~~

The exact operation contract still defines retention and conflict behavior. A protocol request ID does not supply those rules automatically.

Durable jobs and preferences may live in a database while handlers remain stateless. Active streams still occupy a particular replica and need the separate cancellation/drain policy below.`},
walkthrough:W('bounded-status-request','Carry identity and evidence through one tool call','request','A read-only example asks about deployment train_24 in an allowed staging environment. The trace does not perform a real platform call.',[
 S('Select a bounded capability','The host proposes the status tool with structured identifiers under its interaction policy.',{'Tool':'get_deployment_status','Environment':'staging','Deployment':'train_24','Mode':'illustrative read-only'}),
 S('Establish the permitted target','The server validates the authenticated engineer and resolves the tenant/environment mapping. It does not accept an arbitrary caller-supplied URL as authority.',{'Principal':'verified engineer','Tenant mapping':'allowed team_8 staging','Target':'train_24','Authorization':'passed for this lookup'}),
 S('Obtain downstream evidence','A scoped platform API call returns its actual observation. A timeout would instead produce an unknown or explicitly stale outcome.',{'Downstream identity':'scoped read capability','Observed state':'ready','Observation time':'recorded with result'}),
 S('Return the bounded result','The response reports the observation and the audit records actor, target, time, and outcome without credentials.',{'Result':'ready at observation time','Audit target':'team_8 / staging / train_24','Secrets in result/log':'none'})
 ],'Discovery names a capability. Each real request still crosses identity, target authorization, and evidence boundaries.'),
changes:['Added a human/host/client/server/downstream actor table.','Added a five-identity comparison and shared-state text flow.','Added a read-only status walkthrough; preserved revision-specific transport/session/cancellation sections and both reviewed diagrams.','Reopened the matching 2026 and earlier 2025 official transport specifications.']});
