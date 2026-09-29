import {refine,walk as W,step as S} from './refine-advanced-utils.mjs';

refine('platform-security-and-tenancy',{
sections:{identities:`A human request and a service connection carry different identities.

| Question | Example | Required decision |
| --- | --- | --- |
| Who requested work? | Ajay in NorthCo operations | Is this person allowed this action and object? |
| Which workload connects downstream? | analysis-worker | Is this service allowed that dependency operation? |
| On whose behalf is it acting? | Validated NorthCo job context | Does delegated scope match this job? |
| Who is a token intended for? | The named API audience | Will the receiving resource accept this credential? |

A broad service credential does not give every caller that service’s privileges. If downstream sees only the workload identity, the service must prevent unauthorized user requests from reaching that authority. Where supported, scoped delegation lets downstream enforce a caller boundary too.

Verify tokens using the protocol’s supported signature checks or authenticated issuer checks and established libraries. Validate issuer, audience, expiry, and required permissions. Do not forward an arbitrary incoming token to every endpoint.

**Common mistake:** reading “valid token” as “may do anything.” Validity, intended recipient, and permission answer different questions.`,secrets:`A secret needs controlled use and replacement, not just a hiding place.

| Stage | Concrete question |
| --- | --- |
| Limit access | Which workload needs which dependency action? |
| Distribute | How does the running process obtain the credential without a repository or log copy? |
| Introduce replacement | Can consumers use the new credential while the dependency accepts it? |
| Verify transition | Which consumers still use the old credential? |
| Retire | When is the old credential rejected, and how is failure observed? |

Kubernetes Secrets hold sensitive configuration, but base64 is reversible encoding. Access control, encryption at rest where configured, safe distribution, and avoiding logs still matter. A supported managed secret store or workload identity may reduce long-lived static credentials.

Rotation follows the dependency’s real policy. A controlled overlap may be possible; it is not universally supported. Restarting all workers at once can disrupt service, while never retiring the old credential defeats the purpose.

An analysis worker might need incident reads and report writes, without deployment modification or access to every tenant’s secrets. Least privilege limits damage from compromise; it does not replace validation or monitoring.

**Pause and predict:** a new credential is stored, but every worker still has the old value in memory. Has rotation finished? Identify the missing observation.`},
walkthrough:W('rotate-scoped-credential','Verify a credential transition before retiring the old one','secrets','Assume this dependency supports a planned overlap of two scoped credentials. This is an illustrative lifecycle, not a live secret value or a command sequence.',[
 S('Know the starting consumers','Two worker groups use credential version C1 for incident reads. The credential is not copied into job payloads.',{'Credential version':'C1','Consumers':'worker groups A and B','Allowed action':'incident reads'}),
 S('Introduce the replacement','The dependency accepts C2 under the same deliberately limited scope. Consumers can begin switching.',{'Dependency accepts':'C1 and C2 during planned overlap','New version':'C2','Scope':'still incident reads'}),
 S('Observe actual use','Group A has switched but group B has not. Rotation is incomplete even though the new value exists in the secret mechanism.',{'Group A':'C2 verified','Group B':'C1 still in use','Retire C1 now?':'not yet under this plan'}),
 S('Retire after the transition gate','Once both groups are verified on C2, retire C1 according to policy and monitor for remaining old-credential failures.',{'Group A and B':'C2 verified','C1':'retired at dependency','Observation':'old-credential failures monitored'})
 ],'Creating a new credential is only one step. Rotation finishes when consumers have moved and the old authority is actually retired.'),
changes:['Added human/workload/delegated/audience identity comparison.','Reworked secret handling into a lifecycle table with a pause-and-predict prompt.','Added a scoped rotation walkthrough with an explicit overlap assumption; preserved tenant and queued-revocation sections and both reviewed diagrams.']});

refine('ai-system-design',{
sections:{capacity:`Counting requests alone hides important work differences.

| Request | Input | Requested output | Pressure to inspect |
| --- | --- | --- | --- |
| Short draft | A paragraph | 50 tokens | Interactive latency |
| Long draft | A long conversation | 2,000 tokens | Context processing, active memory, and generation time |

Both are one request. They are not the same amount of work. Use request limits alongside appropriate token and concurrency budgets.

Suppose a measured configuration sustains 6,000 output tokens/s for a representative mix. With 300 output tokens per completed response, the arithmetic is:

~~~text
6,000 tokens/s ÷ 300 tokens/response ≈ 20 responses/s
~~~

This is one measured operating point, not a hardware constant. Input length, model, batching, memory, and latency targets can change it. Keep headroom and measure distributions.

Long concurrent contexts use working memory, including KV cache. Larger batches can raise aggregate throughput while increasing a particular user’s wait. A bounded queue makes the waiting policy explicit; an unlimited queue only hides overload.

**Interview phrase:** “I need the token-length mix and latency target before turning request rate into serving capacity.”`,quality:`Evaluate delivery and content with different evidence.

| Dimension | What to observe | Failure it can reveal |
| --- | --- | --- |
| Queue time | Time before useful execution begins | Admission or scheduling pressure |
| First-token time | When partial output begins | Slow startup or input processing |
| Completion time | When the whole draft finishes | Long generation hidden by an early token |
| Cancellation cleanup | Work and resources after cancellation | Abandoned expensive computation |
| Draft quality | Representative reviewed examples | Fluent but invented or inappropriate advice |

A customer-message test set should include ambiguous and incomplete cases. Sometimes a useful draft asks for information instead of inventing a policy.

Compare model and prompt versions before a rollout. A smaller fallback can remain reachable while producing a different quality, privacy, or cost profile. Treat that as a product choice, not an invisible equivalent replacement.

**Pause and predict:** one response arrives quickly but invents a refund rule. Which evaluation failed? Availability and usefulness must both be examined.`},
walkthrough:W('draft-request-lifecycle','Follow an admitted request to a completed draft','request','A support agent requests a draft. The service’s first version never sends it to the customer automatically.',[
 S('Bound the requested work','The gateway validates tenant access and accepts the input within a chosen output and time budget.',{'Request':'draft_64','Input':'within configured limit','Output cap':'120 tokens','Product authority':'draft only'}),
 S('Process the input','The serving endpoint begins prefill with fixed model and prompt-template versions for this attempt.',{'State':'processing input','Model/template':'fixed for attempt','User-visible text':'none yet'}),
 S('Stream partial text','Generated tokens reach the browser. The partial draft is visible but the lifecycle is not complete.',{'State':'generating','Visible output':'partial draft','Completion flag':'false'}),
 S('Record completion for review','The endpoint reports successful completion and the application retains only the permitted history. The human decides whether to send the draft.',{'State':'completed draft','Human review':'still required','Customer message sent':'no automatic send'})
 ],'Streaming changes when text becomes visible. It does not transfer application authority to the model or turn partial output into completion.'),
changes:['Added request-work comparison and an annotated token-capacity calculation.','Added a delivery-versus-quality observation table.','Added a draft lifecycle walkthrough with explicit partial/completed states and human review.']});
