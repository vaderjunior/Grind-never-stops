import {refine,walk as W,step as S,diagram as D} from './refine-advanced-utils.mjs';

refine('ai-platform-operations',{
sections:{story:`A team approves model version 7 after evaluation. Its artifact exists, metadata is recorded, and an owner is known. A user still cannot necessarily send an inference request to it.

| Responsibility | Question it answers | What it does not prove |
| --- | --- | --- |
| Registry | Which model version and evidence exist? | A running worker is ready |
| Deployment machinery | Which workers should be running? | Every worker has finished loading |
| Request router | Which eligible destination should receive this request? | The answer will be factually correct |

A serving process must load the right artifact and configuration on suitable hardware, become ready, and receive routed traffic. “Version 7 exists” and “version 7 can serve this request now” are different facts.

Tools such as MLflow and KServe occupy useful parts of this picture, with capabilities that depend on the selected version and integration. Learn the responsibilities before memorizing product names. This chapter's platform is an original teaching design, not an employer's internal architecture.`,metrics:`A streamed answer has several clocks. State where each clock starts and ends.

| Measurement | Boundary | User-facing question |
| --- | --- | --- |
| Queue wait | Accepted into queue → selected for execution | How long am I waiting for capacity? |
| Time to first token | Stated request boundary → first output token | When does the response begin? |
| Inter-token delay | One output token → the next | Does the stream proceed smoothly? |
| End-to-end latency | Request start → completed response | When is the full result ready? |

Consider a separate simplified sequential request:

~~~text
0.0 s: request enters queue
0.3 s: queue wait ends; retrieval begins
0.4 s: retrieval ends; initial model work begins
1.0 s: first token reaches the chosen measurement point
~~~

The first visible delay is 0.3 + 0.1 + 0.6 = 1.0 second in this model. Later output adds to completion time. If stages overlap, follow the actual critical path rather than adding overlapping durations.

Also track admitted/rejected work, queue age and depth, input/output tokens, cancellations, runtime errors, and out-of-memory failures. “GPU busy” is context, not evidence of a good experience: high throughput can coexist with an unacceptable first-token delay.`,drill:`Use a small incident table to decide what evidence changes your action.

| Incident | Inspect first | Bounded response to evaluate |
| --- | --- | --- |
| New version is ready but answers regress | Version, affected evaluation slice, traffic cohort | Stop promotion and compare quality evidence |
| Worker disappears during a stream | Last client-visible output and any external effects | Report interruption; apply the stated retry policy |
| Demand arrives before new workers are ready | Queue age, admission rate, available suitable hardware | Bound admission while checking whether capacity can arrive |

For each incident, name a recovery check. “Add monitoring” is incomplete; “verify that excess work is rejected before the queue exceeds its waiting-time objective” is testable.

**Pause and predict:** API Pods double, but the oldest inference request keeps getting older. Which component actually executes the expensive work, and is its capacity increasing?

In an interview, connect each operational decision to a fundamental: identity and quotas admit work, schedulers control waiting, runtimes consume finite memory and compute, and version records make changes explainable. Service health and answer quality need separate evidence.`},
walkthrough:W('candidate-to-serving','Follow a candidate from registry to limited traffic','rollout','In this illustrative rollout, version 9 is a compatible candidate and version 8 currently serves users. The record changes before routing should change.',[
 S('Register the evaluated candidate','The version has an immutable artifact reference and evaluation evidence. Registration alone does not create a ready serving process.',{'Candidate':'version 9 registered','Ready version 9 workers':'0','User traffic':'version 8'}),
 S('Load and warm a worker','Deployment machinery starts compatible capacity. Downloading or loading is not sufficient for routing eligibility.',{'Candidate worker':'loading, then warming','Routing eligibility':'not ready yet','Existing capacity':'version 8 retained'}),
 S('Admit a bounded canary','After the readiness checks pass, a small defined share of compatible traffic reaches the candidate. Evidence is collected for the chosen gate window.',{'Candidate worker':'ready','Traffic policy':'bounded canary share','Promotion state':'gates under observation'}),
 S('Expand only with the required evidence','When the predefined operating and quality gates pass, traffic can increase gradually. A failed gate would stop expansion instead.',{'Gate result':'passes for this observed window','Traffic policy':'gradual expansion','Recovery option':'compatible version 8 capacity retained'})
 ],'Registry state, worker readiness, and routing state are different. Promotion is a policy decision supported by evidence, not a side effect of uploading a model.'),
changes:['Added registry/deployment/router responsibility table.','Replaced dense latency explanation with boundary table and distinct annotated numeric timeline.','Added incident observations/actions table and concrete version rollout walkthrough; retained both reviewed diagrams.']});

refine('full-mock-interview',{
sections:{brief:`Design PlotShare, a service that helps a city allocate community-garden plots. Residents join a waiting list for a garden. When a plot becomes available, the city offers it to an eligible resident, who has a limited time to accept.

Residents can view their current applications and offers. City staff can release a plot, correct an eligibility decision, and inspect why an allocation happened.

| Initial fact | Assumption supplied for this exercise |
| --- | --- |
| Coverage | 200 gardens and 20,000 plots |
| Residents | 80,000 |
| Seasonal opening | 5,000 requests per minute; most days are quieter |
| Payments | Outside the initial scope |
| Notifications | Email may announce an offer; its status must be inspectable in the application |
| Allocation rule | One plot must not be accepted by two residents for the same allocation period |

These are original interview assumptions, not measured traffic from a real service. Ask what other policy is required before interpreting “eligible,” “waiting list,” or “limited time.” A technical queue does not automatically implement a fair civic policy.`,clarify:`Spend roughly the first five minutes asking questions that could change the design. For example, what determines list order, can one resident apply to several gardens, who may alter eligibility, and how quickly must residents see an accepted offer? These are questions to investigate, not instructions to select an architecture.

For a solo attempt, choose reasonable rules and write them down. Distinguish a product rule from an implementation assumption. “Only authorized city staff may correct eligibility” is a policy; “requests are always delivered once” is an unsafe convenience. Explain which rules need stronger enforcement and which views may lag.

Use the next ten minutes to propose the smallest complete design. Walk one resident through joining, receiving an offer, and accepting. Give each box a responsibility and each arrow a named request or fact.

Estimate seasonal requests per second and discuss burst headroom rather than presenting an average as a guarantee. Keep your own notes visible and the worked answer closed.`,finish:`Save your actual attempt before reading the reference. Mark statements you are confident in and places where you guessed.

| Evidence line | Fill it using your own attempt |
| --- | --- |
| Central guarantee | What must remain true? |
| Enforcing mechanism | Where did your explanation show the decision? |
| Remaining challenge | Which failure or uncertainty still needs work? |

Only afterward reveal the example and compare decisions, not vocabulary. A different design can be sound under explicit assumptions.

If you missed a guarantee, replay that exact failure with your revised design. Label reasoning produced after reading the answer as assisted practice. The next chapter turns these observations into a targeted plan; one completed mock does not prove readiness for every interview.`},
addedDiagram:D('mock-evidence-loop','finish','Keep attempt evidence separate from later learning','flowchart LR\nA[Save your own explanation] --> B[Identify claims and gaps]\nB --> C[Explicitly reveal the reference]\nC --> D[Compare decisions under assumptions]\nD --> E[Retest one gap on a changed problem]','A process diagram only: it supplies no PlotShare components, records, or solution. Later assisted work should not be relabeled as the original attempt.',[
 'Save the explanation before reading reference material.',
 'Point to the actual claim, trace, or missing evidence.',
 'Reveal the example only after the attempt and compare reasoning.',
 'Use a changed problem to collect new independent evidence.'
 ]),
walkthrough:W('mock-working-record','Follow a practice record without opening the solution','setup','This is an illustrative time-and-evidence record, not an architecture. Use it to organize your own 45-minute attempt; the later requirement remains in its separate reveal control.',[
 S('Start with a blank working page','Begin the timer and keep the reference closed. Record the candidate brief in your own words.',{'Time':'0 minutes','Working artifact':'blank page plus brief','Reference':'closed'}),
 S('Record clarifications','Write the questions you asked and the assumptions you selected. Do not quietly treat guesses as given requirements.',{'Time':'about 5 minutes','Working artifact':'questions and explicit assumptions','Reference':'closed'}),
 S('Capture your own normal journey','Save the explanation you developed, including named responsibilities and arrows. The walkthrough does not supply those choices.',{'Time':'about 15 minutes','Working artifact':'your diagram and request trace','Reference':'closed'}),
 S('Summarize after examining failures and the change','Use the remaining time to state your guarantee, reasoning, and unresolved risk. Keep the actual words you used.',{'Time':'about 40 minutes','Working artifact':'attempt evidence and remaining risk','Reference':'closed'}),
 S('Finish before comparing','Save the completed attempt. You may now choose to reveal the example; that remains an explicit action.',{'Time':'45 minutes','Working artifact':'saved original attempt','Reference':'still closed until requested'})
 ],'The purpose of the record is to preserve what you demonstrated independently. It neither grades the design nor supplies the timed requirement.'),
changes:['Turned candidate facts into a compact table while preserving the problem.','Removed a premature example of the later city-wide acceptance policy from the public clarification section.','Added evidence worksheet, process-only diagram, and solution-free practice-record walkthrough.','Kept the entire timed-change section and all private assessment content unchanged.']});

refine('capstone-and-readiness-plan',{
sections:{review:`Read a saved mock transcript and your diagram. Point to evidence rather than rating how familiar the words feel.

| Skill | Useful evidence | Insufficient evidence by itself |
| --- | --- | --- |
| Clarification | A question changed a requirement or assumption | A long list of questions with no consequence |
| Estimation | Units, assumptions, and a resulting design decision | A large number written without a workload |
| Correctness | A state transition survives the chosen failure trace | A database name or “use retries” |
| Access control | The trace checks whether this actor may read or act | A login box alone |
| Communication | A listener can follow one complete request | Many components with unlabeled arrows |

Mark a skill **not yet shown** when the attempt contains no evidence. This is a statement about the record, not a judgment that you cannot learn it.

Separate independent reasoning from answers produced after hints or while reading an example. Self-assessment should say it is self-assessment. AI feedback should cite actual statements and identify uncertainty rather than infer confidence from eloquent wording.

Look for repeated weaknesses across different problems. Missing units once may be a slip; repeatedly treating a timeout as proof of failure is a reasoning pattern worth repairing. Several correct multiple-choice answers cannot cancel a critical gap in a design conversation.`,plan:`Choose at most three gaps. Pair each with a bounded exercise and a way to inspect changed-problem evidence.

| Observed gap | Short practice | Evidence to seek next |
| --- | --- | --- |
| Estimates omit units | Three five-minute workload calculations | Units and one design consequence stated aloud |
| Explanations wander | A two-minute request trace with five boxes | A listener can reconstruct the named messages |
| Permission checks are vague | Trace one allowed and one denied read | No protected content crosses the boundary before authorization |

Then repeat a changed problem without consulting the earlier solution. Moving from public search to permission-sensitive retrieval should change the access story. Transfer, rather than remembering a familiar drawing, is the goal.

Schedule two focused practice sessions, one full mock, and a review session each week at a sustainable pace. Keep room for work and rest. If the checkpoint remains unclear, extend the plan.

**Common mistake:** marking a gap fixed immediately after reading a clear explanation. First collect a new attempt that shows you can apply the reasoning independently.

Six months is a structure for study, not a guarantee of mastery on a particular date.`},
walkthrough:W('one-gap-new-evidence','Turn one vague claim into a targeted practice record','plan','The following learner record is fictional and illustrative. It shows how evidence can improve without claiming the user has completed any task.',[
 S('Find the missing behavior','In a saved file-sharing mock, the explanation said “the cache makes reads fast” but never traced who may read the file.',{'Evidence':'cache statement, no permission trace','Skill status':'not yet shown','Chosen gap':'authorize before returning private data'}),
 S('Practice one bounded trace','The learner draws allowed and denied reads with five boxes. The example is open, so this is labeled assisted practice.',{'Exercise':'two-minute allowed/denied read','Help used':'reference example visible','Evidence type':'assisted practice'}),
 S('Try a changed context independently','With the reference closed, the learner explains private-title autocomplete and traces which suggestions the current actor is allowed to see.',{'Changed problem':'private-title suggestions','Help used':'none during this attempt','Evidence':'access scope checked before returning titles'}),
 S('Record what the new attempt establishes','The saved explanation now supports a narrower claim: an independent permission trace was shown. Revocation freshness still needs a separate test.',{'New evidence':'independent allowed/denied trace','Remaining gap':'permission-revocation freshness','Next step':'one bounded revocation scenario'})
 ],'A useful practice plan changes because of new evidence. It records the remaining limit instead of converting one improvement into automatic overall readiness.'),
changes:['Added evidence-versus-insufficient-evidence comparison for five interview skills.','Replaced dense practice-plan prose with gap/drill/evidence table and explicit assisted-versus-independent distinction.','Added a concrete four-stage learning record with remaining uncertainty; preserved both reviewed diagrams.']});
