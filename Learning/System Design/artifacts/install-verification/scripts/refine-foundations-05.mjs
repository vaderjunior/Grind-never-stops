import {refine,step,diagram} from './refine-foundations-utils.mjs';
refine('measure-before-scaling',(g,a)=>{
 a.replace('question','Latency measures the duration of one operation. If Maya clicks Save at noon and sees confirmation 200 milliseconds later, the user-visible save latency is 200 ms. One second contains 1,000 milliseconds, so this is 0.2 seconds. Throughput counts completed operations per time interval. If fifty saves finish in ten seconds, the average completed throughput is five saves per second.',`Two measurements answer different questions:

| Measure | Question | Example and units |
| --- | --- | --- |
| Latency | How long did one operation take? | Save confirmation after 200 ms = 0.2 seconds |
| Completed throughput | How much work finished per interval? | 50 saves ÷ 10 seconds = 5 saves/second |

One second contains 1,000 milliseconds. Keep time per operation separate from operations per time; overlapping work means these are not generally reciprocals.`);
 a.replace('trace','In a second teaching example, total user-visible time is 900 ms. The application’s measured processing takes 100 ms, including a 30 ms database query. The remaining 800 ms is outside that application timer. It may include network transfer, browser work, or separate image requests. Replacing the database because it is a familiar box would miss the evidence. First inspect what happened outside the timer.',`Keep nested timers visible:

| Timer or remainder | Illustrative duration | Relationship |
| --- | --- | --- |
| Click to useful visible page | 900 ms | Whole measured user action |
| Application processing | 100 ms | Inside the user action |
| Database query | 30 ms | Already included in the 100 ms |
| Time outside the application timer | 800 ms | 900 − 100, not yet explained |

Do not add 900 + 100 + 30; those intervals overlap by inclusion. The unexplained 800 ms may include network transfer, browser work, or separate image requests. Investigate those measurements before replacing the database.`);
 g.diagrams.push(diagram('timer-boundaries','trace','A smaller timer can sit inside a larger one','flowchart TB\nsubgraph U[User action: 900 ms]\nB[Browser and network work] --> A\nsubgraph A[Application timer: 100 ms]\nC[Checks and response work] --> D[Database query: 30 ms included]\nend\nA --> I[Images and browser display]\nend','Boxes indicate measurement inclusion, not scale or precise physical scheduling. Work outside the application timer is not yet attributed to a specific cause.',['Choose the user-visible start and finish.','Locate the application interval within that measurement.','Recognize the database timer is part of application time and avoid double counting.']));
 g.walkthroughs=[{id:'average-hides-slow-user',sectionId:'trace',title:'Ten requests, one unusually long wait',intro:'These are invented observations of the same action. Keep individual outcomes visible before reducing them to an average.',steps:[step('Observe nine quick results','Nine actions complete in 100 ms each. This says nothing yet about the tenth.',{'Observed results':'9','Each duration':'100 ms','Total of durations':'900 ms'}),step('Include the slow result','The tenth user waits 2,000 ms. Adding durations is for computing a mean, not wall-clock batch duration.',{'Tenth duration':'2,000 ms','Total of durations':'2,900 ms','Number of results':'10'}),step('Compute the mean','Divide the sum of these ten durations by ten.',{'Mean latency':'290 ms','Quick users':'100 ms each','Slow user':'2,000 ms'}),step('Choose the next investigation','Inspect the slow request’s path and compare similar observations. The mean alone does not explain its cause.',{'Question':'Why was this request slow?','Needed evidence':'Its measured segments','Do not infer':'Every user waited 290 ms'})],takeaway:'A mean summarizes observations; it does not replace their spread, their failure outcomes, or their measurement boundaries.'}];
 return {changes:['Separated latency and throughput with explicit units and nonreciprocal overlap caveat.','Replaced timer prose with a containment table and nested-timer diagram.','Added an average-versus-individual-experience walkthrough that distinguishes summed durations from batch wall time.']};
});
refine('grow-one-server',(g,a)=>{
 a.replace('arithmetic','Now suppose the shared database can sustain only 60 of the required database operations per second, and each request needs one. The combined system cannot simply promise 80 requests/s through that database. Its shared limit is 60 under the stated model. Adding a third application copy still leaves that same constraint.',`Now add a shared database limit. Assume each request needs one database operation:

| Application arrangement | Nominal application capacity | Shared database limit | Combined upper bound in this model |
| --- | --- | --- | --- |
| One instance | 40 requests/s | 60 operations/s | 40 requests/s |
| Two instances | 80 requests/s | 60 operations/s | 60 requests/s |
| Three instances | 120 requests/s | 60 operations/s | 60 requests/s |

The smallest required capacity limits the completed path under these assumptions. Extra app instances alone do not raise the database limit. Real operation mix and contention must still be measured.`);
 a.replace('decision','Vertical growth is often a straightforward step because one instance remains one instance, but machine sizes have limits and replacing or restarting a machine can interrupt service. Horizontal growth can share work and permit some copies to fail, but it adds routing, deployment, state-sharing, and observation work. Neither is automatically cheaper or more reliable in every context.',`Compare the mechanism and its new responsibility:

| Choice | What changes? | What still needs attention? |
| --- | --- | --- |
| Do less repeated work | Reuse a prepared thumbnail | Correct invalidation when the original changes |
| Grow vertically | Give one machine the limiting resource | Size limits and replacement interruption |
| Grow horizontally | Add application instances | Routing, shared state, deployment, and surviving capacity |

Neither growth direction is automatically cheaper or more reliable in every context.`);
 a.append('horizontal','> **Pause and predict:** A has the only saved copy in its local dictionary; B is healthy and ready. Does routing the next read to B recover the note? No. Routing and saved-state placement are separate parts of the design.');
 g.diagrams.push(diagram('shared-capacity-limit','arithmetic','Two app paths meet the same database limit','flowchart LR\nR[Requests] --> A[App A: 40 requests per second]\nR --> B[App B: 40 requests per second]\nA --> D[Shared database: 60 operations per second]\nB --> D\nD --> O[At most 60 completed requests per second in this model]','Each request is assumed to need one database operation. These supplied capacities are illustrative and exclude other limits; the drawing is not a measured production result.',['Add the capacities of independent application copies only under the stated assumptions.','Follow both paths into the required shared dependency.','Apply the shared limit to the end-to-end promise.']));
 g.walkthroughs=[{id:'surviving-capacity',sectionId:'arithmetic',title:'Healthy capacity is not surviving capacity',intro:'For this separate example, assume the database supports at least 100 operations/s, each request needs one, and each app instance sustains 40 requests/s for this workload.',steps:[step('Run two instances','The nominal app capacity is 80 requests/s against a peak demand of 50.',{'Instances':'A and B','Nominal capacity':'80 requests/s','Peak demand':'50 requests/s'}),step('Lose instance A','B remains healthy but its individual capacity is below peak demand.',{'Survivors':'B only','Nominal capacity':'40 requests/s','Capacity shortfall':'10 requests/s'}),step('Start from three ready instances','With three instances before the failure, losing one leaves two ready survivors.',{'Initial instances':'A, B, C','After losing A':'B and C','Surviving capacity':'80 requests/s'}),step('State the remaining assumptions','The arithmetic needs a working routing path and sufficient shared capacity. Detection and draining still take time.',{'Peak demand':'50 requests/s','Required shared capacity':'At least the actual completed load','Unproven by arithmetic':'Instant failover or latency guarantee'})],takeaway:'Check peak demand against survivors, then verify routing and shared dependencies. Spare arithmetic capacity is only one part of failure handling.'}];
 return {changes:['Added shared-bottleneck and growth-choice tables in place of dense comparisons.','Added an end-to-end capacity diagram and a healthy-versus-surviving-capacity walkthrough.','Preserved assumptions about one database operation per request and added state-placement prediction.']};
});
refine('gateways-and-proxies',(g,a)=>{
 a.replace('gateway','Do not draw three mandatory boxes merely because there are three names. Instead ask which responsibilities are needed and whether one component can perform them clearly. Separate components can be justified by ownership, scaling, isolation, or capabilities, but every extra hop adds configuration and failure behavior to understand.',`One running component may perform several jobs:

| Responsibility | Question it answers |
| --- | --- |
| Reverse proxy | Where should this incoming service request be forwarded? |
| Load balancing | Which eligible instance should receive it? |
| API entry policies | Does this request satisfy shared identity, size, or rate rules? |
| Resource authorization | May this caller perform this action on this particular note? |

The last rule still needs the application’s resource knowledge. Do not draw three mandatory machines because three intermediary names appear. Separate components can be justified, but each hop adds configuration and failure behavior.`);
 a.replace('walk','creates or propagates a trace identity under a trusted policy,','creates or propagates a trace identity—a label for connecting observations about this request—under a trusted policy,');
 a.replace('walk','Suppose instance A is being replaced. Stop giving it new traffic when it is no longer ready, allow in-flight work an appropriate drain period, and route new work to ready instance B. Existing connections and delayed health information mean this is a transition, not a magical instantaneous switch.',`Replacing A has separate states:

| Instance A state | New requests | Already accepted work |
| --- | --- | --- |
| Ready | Eligible for selection | Continues |
| Draining | Stop selecting it after routing learns the change | Given a bounded chance to finish |
| Stopped | Not eligible | Unfinished outcomes need the application’s failure policy |

**Draining** means letting existing work finish while stopping new work. Existing connections and delayed health information make this a transition, not an instantaneous switch.`);
 a.append('gateway','> **Common mistake:** Trusting an incoming user-id header merely because its name looks internal. The entry/backend arrangement must establish which identity information is authentic and prevent a client-supplied value from impersonating another caller.');
 g.sections.find(s=>s.id==='kubernetes').title='Optional preview: where Kubernetes traffic configuration fits';
 g.diagrams.push(diagram('drain-transition','health','Readiness and draining change which work is accepted','flowchart LR\nA[Instance A ready] --> D[Mark A unready for new traffic]\nD --> R[Routing observes updated eligibility]\nR --> B[Send new work to ready B]\nD --> F[Allow A existing work a bounded drain period]\nF --> S[Stop A under shutdown policy]','The two branches can overlap. Propagation delays, existing connections, and time-limited shutdown mean this is not a guarantee that every in-flight request succeeds.',['Mark the replacement instance ineligible for new work.','Let routing shift new requests after observing that state.','Handle already accepted work under a bounded drain and shutdown policy.']));
 g.walkthroughs=[{id:'replace-one-backend',sectionId:'walk',title:'Replace A while B receives new requests',intro:'Assume B has enough spare capacity. This example distinguishes new selection from work already accepted by A.',steps:[step('Both instances are ready','A already has two requests in progress. The entry can choose either eligible instance.',{'A eligibility':'Ready','A in-flight requests':'2','B eligibility':'Ready'}),step('Begin draining A','A becomes unready for new work, but routing needs to observe that change. Existing work has not vanished.',{'A desired eligibility':'No new work','A in-flight requests':'2','Routing knowledge':'Updating'}),step('Routing uses the new state','A new request goes to B. One of A’s earlier requests finishes during its drain period.',{'New request destination':'B','A in-flight requests':'1','A new selections':'Stopped after update'}),step('Finish under the shutdown policy','If A’s last request completes within the deadline, it can stop with no remaining work. Otherwise the documented timeout/failure policy applies.',{'A in-flight requests':'0 in this successful trace','A process':'Can stop','Service entry':'Still routes to B'})],takeaway:'Removing an instance from new selection is different from finishing work already on it. Explain both transitions.'}];
 return {changes:['Added responsibility and draining-state tables, with local definitions of draining and trace identity.','Labeled later Kubernetes material as an optional preview.','Added a readiness/drain diagram, changing-backend walkthrough, and identity-header trust callout.']};
});
refine('service-boundaries',(g,a)=>{
 a.replace('remote','A local function call and a network request may look similarly simple in source code, especially when a client library hides the request. Their failure models differ. A remote request needs serialization, addressing, connection handling and a response contract. It can fail because a process is down, a route is unavailable, the connection is slow, or the response is lost after the remote work succeeds.',`A local function and a remote request can look similar in code while requiring different handling:

| Concern | In-process call | Remote call adds… |
| --- | --- | --- |
| Moving inputs | Pass local values | Encode values for transfer, called serialization |
| Finding the callee | Call a known function | Address and connection handling |
| Waiting | Local execution and its own dependencies | Network and remote-process delay |
| Missing result | Follow the function/runtime behavior | The remote action may have succeeded before its response was lost |

A client library can hide syntax, but it cannot remove the communication boundary.`);
 a.replace('ownership','Owning data means owning its permitted changes, not necessarily buying a separate database server for every table on day one.','**Authoritative owner** means the component responsible for accepting a fact’s official changes. Owning data means owning those permitted changes, not necessarily buying a separate database server for every table on day one.');
 a.replace('split','Costs remain: more builds and releases, configuration, credentials, telemetry, integration tests, failure handling and version compatibility.',`Costs remain:\n\n| New responsibility | Concrete question |
| --- | --- |
| Releases and compatibility | Can old API and new worker versions communicate? |
| Credentials and permissions | Which service may access this private document? |
| Observation, also called telemetry | Can we connect caller timing to worker failures? |
| Failure handling and tests | What state remains after one side succeeds and the other fails? |
\nA separate process must earn these responsibilities through a useful benefit.`);
 a.append('failure','> **Pause and predict:** Recommendations run in their own process, but the notes API waits forever for them. Are note reads protected from a recommendation outage? No. The caller needs bounded waiting and a permitted fallback as well as process separation.');
 g.diagrams.push(diagram('optional-dependency','failure','An optional dependency needs an explicit fallback','flowchart LR\nN[Read permitted note] --> R[Ask for optional recommendations]\nR --> T{Useful result within budget?}\nT -->|Yes| F[Return note with suggestions]\nT -->|No| B[Return note without suggestions]','This fallback is valid only because recommendations are optional in this example. Never replace required authorization or saved-note correctness with a permissive fallback.',['Classify the dependency as optional for this product action.','Give its wait a defined time and resource budget.','Return a useful permitted note even when the optional result is unavailable.']));
 g.walkthroughs=[{id:'optional-suggestions-deadline',sectionId:'failure',title:'Keep a note read useful when suggestions are slow',intro:'The example permits a note without suggestions. Times are illustrative and describe the caller’s policy, not measured service performance.',steps:[step('Obtain the permitted note','The required access check and note read finish. The response can still be useful without extra suggestions.',{'Elapsed':'20 ms','Note data':'Ready and permitted','Suggestions':'Optional'}),step('Start bounded optional work','The caller allows the recommendation call until elapsed time 100 ms, an 80 ms waiting budget here.',{'Recommendation start':'20 ms','Deadline':'100 ms elapsed','Wait budget':'80 ms'}),step('Reach the deadline','No useful suggestion arrived in time. Stop waiting and request cancellation where supported; remote work may still be running.',{'Elapsed':'100 ms','Suggestion result':'Unavailable within budget','Caller action':'Take documented fallback'}),step('Return the useful result','Return the note without suggestions and record the dependency outcome for diagnosis.',{'Note response':'Returned','Suggestions':'Omitted under product rule','Observation':'Recommendation deadline exceeded'})],takeaway:'Separate deployment alone does not isolate a user journey. The caller’s wait and fallback rules decide what the user experiences.'}];
 return {changes:['Converted local-versus-remote behavior and service operating costs into concrete comparisons.','Defined serialization, authoritative ownership, and telemetry in context.','Added an optional-dependency decision diagram and bounded-wait walkthrough with cancellation uncertainty preserved.']};
});
