// Records reviews actually performed by the curriculum worker; this is not an automatic quality grader.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const folder=path.join(root,'content/reviews');fs.mkdirSync(folder,{recursive:true});
const reviewed={
'011':['Independent text review: naming/address/port boundaries, cached TTL versus connection lifetime, and diagnostic scope are consistent.','Cold/warm arithmetic independently recomputed: 155 ms and 55 ms.'],
'012':['Independent text review: TCP stream ordering, UDP message behavior, receiver flow control, and network congestion are correctly separated.','Bandwidth-delay arithmetic checked: 100 Mbit/s × 40 ms = 500000 bytes; transport ACK is not a business commit.'],
'013':['Independent text review: TLS endpoints, plaintext termination, trusted identity context, and object authorization remain distinct.','The forged-header exercise requires both channel and identity repair; 30 ms × 2 handshakes = 60 ms.'],
'014':['Independent text review: safe/idempotent/cacheable are distinct; repeated effect does not require identical response bytes.','Conditional version update includes atomicity and affected-row interpretation; idempotency-key storage is not attributed to HTTP.'],
'015':['Independent assessment review: clarifications localize certificate-name failure before HTTP, and the solution preserves verified identity during DNS migration.','The candidate brief does not disclose the fault; remediation is within taught lessons.'],
'016':['Independent text review: HTTP/2 versus HTTP/3 head-of-line behavior is scoped by layer and shared congestion/metadata constraints.','Ten 100 ms slots = idealized 100 operations/s; the exercise controls confounding variables.'],
'017':['Independent text review: connection assignment differs from request load, sticky state is not durability, and health checks are scoped observations.','Reported new-client routing-arrow correction was incorporated by root; 20 × 50 = 1000 configured connections.'],
'018':['Independent text review: typed code generation does not replace authorization, business validation, retry semantics, or cancellation handling.','Protocol alternatives are justified by client ecosystem and streaming needs; no universal speed multiplier is claimed.'],
'019':['Independent text review: connection recovery requires retained history, cursor/snapshot coherence, and authorization; slow consumers have bounded policies.','Arithmetic checked: 4000 polls/s, 25.6 Mbit/s response bodies, 312.5 MiB illustrative buffers.'],
'020':['Independent assessment review: multiple justified transport choices are accepted and storage internals beyond the taught scope are not required.','Reference reasoning distinguishes durable messages from ephemeral typing state and tests reconnect gaps and bounded buffering.']};
for(const [id,evidence] of Object.entries(reviewed)){
 const raw=fs.readFileSync(path.join(root,`content/lessons/${id}.json`),'utf8');
 const assessment=id==='015'?'interview_003':id==='020'?'interview_004':null;
 const review={lessonId:id,sha256:createHash('sha256').update(raw).digest('hex'),result:'pass',reviewer:'curriculum-worker (independent of M02 author)',reviewedAt:'2026-09-29',scope:'Substantive textual pedagogy, technical reasoning, examples, questions, and diagram-source consistency; not final visual or full product acceptance.',evidence,...(assessment?{assessmentId:assessment,assessmentSha256:createHash('sha256').update(fs.readFileSync(path.join(root,`content/interviews/${assessment}.json`))).digest('hex')}:{})};
 fs.writeFileSync(path.join(folder,`${id}.json`),JSON.stringify(review,null,2)+'\n');
}
console.log('Recorded 10 independently reviewed M02 session packages at current content hashes.');
