import {refine,walk as W,step as S} from './refine-advanced-utils.mjs';

refine('model-serving-and-gpus',{
sections:{weights:`A model download is not the whole serving-memory budget.

| Memory use | What it holds | What changes it? |
| --- | --- | --- |
| Weights | Learned parameters | Model architecture and representation |
| Runtime buffers | Temporary computation and framework allocations | Runtime, kernels, and batch shape |
| KV state | Active attention history | Context lengths, active sequences, and implementation |
| Headroom | Space for variation and operating needs | Chosen safe workload envelope |

For a rough weight estimate, seven billion parameters at two bytes each is fourteen billion bytes: 14 decimal GB. That alone does not show that a nominal 16 GB device can serve the intended workload.

Quantization can use fewer bits for some values, but scales, format overhead, hardware support, and output quality still matter. A compressed download size is not the complete resident footprint.

Keep decimal GB separate from binary GiB. Record model, precision, architecture, runtime, and context limits beside measurements so comparisons remain meaningful.

**Pause and predict:** weights fit, but a burst of long contexts fails. Which additional budget in the table should be inspected?`,batching:`Batching combines sequences to use numerical execution more effectively. The question is when a finished sequence frees capacity for another.

| Scheduling approach | Conceptual behavior | Cost to examine |
| --- | --- | --- |
| Simple fixed group | Admit a group and keep it together until completion | Short requests can leave unused capacity while long ones remain |
| Continuous active set | Change admitted sequences at supported iteration boundaries | Scheduling, prefill, memory, and latency interact |

The existing diagram follows A needing four decode steps and B needing two. C needs three and enters after B finishes. The active set changes while A is still running.

This is an iteration trace, not a wall-clock benchmark. Prefill, kernel shape, active memory, and request lengths change how long an iteration takes. More aggregate throughput does not guarantee lower latency for each user.

vLLM is one serving engine with batching and KV-memory management. Check its installed release before applying defaults or tuning parameters.

**Interview phrase:** “I would compare throughput and per-request latency under the real length distribution, not merely maximize batch size.”`},
walkthrough:W('scheduler-active-set','Watch a finished sequence make room','batching','A separate conceptual decode schedule has room for two sequences. R1 needs 2 steps, R2 needs 4, and waiting R3 needs 1. Prefill and wall-time variation are deliberately abstracted.',[
 S('Run the first iteration','R1 and R2 each make one decode step. R3 waits because both active slots are in use.',{'Active':'R1, R2','Remaining afterward':'R1: 1; R2: 3','Waiting':'R3: 1'}),
 S('A sequence finishes','The second iteration completes R1. Its active state can be released under the scheduler’s rules.',{'Active during step':'R1, R2','Remaining afterward':'R1: 0; R2: 2','Freed capacity':'one sequence slot'}),
 S('Admit the waiting sequence','R3 joins R2 at the next supported boundary. After this step R3 is complete while R2 still has one step.',{'Active during step':'R2, R3','Remaining afterward':'R2: 1; R3: 0','Waiting':'none'}),
 S('Finish the longer sequence','R2 completes its final step. This does not imply equal real duration for the four iterations.',{'Active during step':'R2','Remaining afterward':'0','Claim demonstrated':'changing active set, not a speed benchmark'})
 ],'Continuous batching can reuse capacity before the longest request ends. Admission must still fit memory and latency constraints.'),
changes:['Added a complete serving-memory responsibility table with explicit GB/GiB limits.','Added fixed-versus-continuous scheduling comparison.','Added a distinct request/remaining-step scheduler walkthrough; preserved KV formula, safety caveats, and both reviewed diagrams.']});

refine('rag-and-inference',{
sections:{ingest:`Ingestion prepares searchable pieces without losing what they mean or who may read them.

| Chunk field | Example | Why keep it? |
| --- | --- | --- |
| Source identity | room-policy | Find the authoritative document |
| Document version | 6 | Distinguish current evidence from old text |
| Location | “Opening hours,” paragraph 2 | Show supporting context and citation |
| Access reference | staff-policy scope | Apply the required audience check |
| Text | Rule plus its relevant exception | Avoid a misleading fragment |

Choose meaningful boundaries. Separating “open until 18:00” from “except Friday, until 16:00” can retrieve the rule while losing the condition needed by the question.

Embeddings help locate semantically related text; keyword search helps exact names, numbers, and unusual identifiers. A hybrid design can use both. Similarity does not prove truth or permission.

Updates and deletions must reach the derived index. Store versions and indexing progress, define a freshness target, and prevent old chunks from indefinitely claiming to be current. Rebuilds need the same supported snapshot/catch-up reasoning as other derived views.`,serving:`Two caches reuse different things.

| Cache | Reuses | Must still be decided |
| --- | --- | --- |
| Final-answer cache | Previously generated text | Audience, document versions, model/template versions, freshness and revocation |
| Serving prefix cache | Matching-prefix computation state | Serving compatibility, isolation, memory policy, and new output work |

Question text alone is not a safe key for a private answer. The same sentence can have different permitted evidence for different people.

A prefix cache does not establish correctness or make generation free. It may reduce repeated input processing while later decoding still occurs. Sharing state also needs appropriate isolation and side-channel consideration under the actual implementation.

**Interview phrase:** “I will state what is being reused and under which audience and version conditions.” Then trace a document update, a permission revocation, and a question with no supporting evidence.

Vector-index internals and fine-grained GPU scheduling are optional depth after the derived-data and trust story is sound.`},
walkthrough:W('retrieve-the-exception','Follow evidence that changes the answer','answer','An authorized staff member asks when a study room closes on Friday. The permitted policy has a general rule and a nearby exception.',[
 S('Establish the question and audience','The service resolves the current access scope before deciding which private passages may enter a prompt.',{'Question':'Friday closing time?','Scope':'authorized staff','Source sought':'room-policy'}),
 S('Retrieve complete supporting context','The selected permitted evidence from version 6 includes both the ordinary hours and Friday exception.',{'General rule':'closes at 18:00','Friday exception':'closes at 16:00','Source/version':'room-policy / 6'}),
 S('Construct bounded model context','The model receives the allowed passage with its source location. Retrieved text remains evidence, not authority to perform actions.',{'Prompt evidence':'rule plus exception','Source location':'Opening hours, paragraph 2','Tool authority':'none added by document'}),
 S('Check the supported answer','The response should use the Friday condition and point to the supporting passage. A citation is inspected for support rather than accepted as proof by itself.',{'Expected supported answer':'16:00 on Friday','Evidence check':'exception supports the statement','Action performed':'answer only'})
 ],'Retrieval quality includes preserving the condition that changes the answer. Permission and source support remain separate checks.'),
changes:['Added chunk-identity/meaning table and a concrete rule-versus-exception example.','Added final-answer versus prefix-cache comparison.','Added an allowed-evidence walkthrough distinct from the private-tenant cache assessment; preserved both reviewed diagrams.']});
