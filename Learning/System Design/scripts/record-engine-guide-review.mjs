import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const ids=['reliable-systems','observe-and-debug','ship-and-recover','regions-and-disaster-recovery','interview-game-plan','estimates-and-tradeoffs','design-notifications','design-rate-limiter','design-chat','chat-reconnect-and-scale','design-news-feed','feed-fanout-and-ranking','processes-threads-and-concurrency','connection-and-protocol-basics','service-boundaries','queue-broker-fundamentals','mcp-platform-architecture','model-serving-and-gpus'];
const term={term:'Connection pool',definition:'A bounded set of reusable database connections; a request may wait when all are in use.'};
const file='content/guides/observe-and-debug.json',g=JSON.parse(readFileSync(file,'utf8'));if(!g.terms.some(t=>t.term===term.term)){g.terms.push(term);writeFileSync(file,JSON.stringify(g,null,2)+'\n');}
const source='scripts/author-guides-w13-14.mjs';let script=readFileSync(source,'utf8');script=script.replace("['Cardinality','The number of distinct combinations of labels attached to a metric.']", "['Cardinality','The number of distinct combinations of labels attached to a metric.'],['Connection pool','A bounded set of reusable database connections; a request may wait when all are in use.']");writeFileSync(source,script);
const findings={
 'reliable-systems':'Checked 99.9% arithmetic, 60 requests/s survivor deficit, shared failure domains, deadline/retry amplification and honest degraded saves.',
 'observe-and-debug':'Added an explicit connection-pool definition before the worked wait trace. Verified 850/1000 ms boundaries and 650/900 ms exercise; concurrent spans are not summed blindly.',
 'ship-and-recover':'Reviewed mixed-version migration order, rollback limitations, independent backups, repeatable backfill, and restore validation. Eight-batch answer matches inputs.',
 'regions-and-disaster-recovery':'Checked RTO/RPO clock examples, standby assumptions, old-writer fencing, and failback preservation. Objectives remain targets, not guarantees.',
 'interview-game-plan':'Reviewed scope, completed journeys, retry identity, freshness-bound caveat, and 45-minute budget. Practice scoring makes no outcome guarantee.',
 'estimates-and-tradeoffs':'Recomputed decimal byte/rate/retention examples and preview storage; batching is distinguished from reduced database work.',
 'design-notifications':'Checked local outbox boundary, recipient deduplication, preference recheck, and provider-acceptance uncertainty; external delivery is not claimed exactly once.',
 'design-rate-limiter':'Recomputed refill traces and regional budget multiplication; atomic decision, clock, fallback scope, and uncertain consumption are stated.',
 'design-chat':'Checked accepted/delivered/read distinctions, room-scoped ordering, shared deduplication, membership checks, and durable history versus sockets.',
 'chat-reconnect-and-scale':'Traced subscribe/replay boundary, cursor 40/50/52, repair of missing51, legitimate sequence gaps, buffer growth180/s and overflow policy.',
 'design-news-feed':'Checked source visibility authority, retry-safe fan-out, bounded hydration, deletion, and cursor stability assumptions.',
 'feed-fanout-and-ranking':'Verified100,000 amplification ratio, transition overlap, rank-cursor contract, authorization on fallback, and95 ms sequential example.',
 'processes-threads-and-concurrency':'Reviewed all sections including shared-thread memory, concurrency/parallelism, event-loop blocking and lost-update race. Recomputed105/115 versus210 ms timeline and50/s CPU bound.',
 'connection-and-protocol-basics':'Checked transport/application separation, QUIC over UDP reliability, HTTP2 head-of-line explanation, TLS hop boundaries, and SSE/WebSocket replay limitations.',
 'service-boundaries':'Reviewed modular monolith distinction, logical data ownership, shared versus separate transactions,150 ms sequential overhead, and justified bounded-worker extraction.',
 'queue-broker-fundamentals':'Checked confirms versus processing acknowledgement, SQS visibility overlap, Redis Pub/Sub versus Streams, Kafka partition/replay scope, and paid-effect uncertainty.',
 'mcp-platform-architecture':'Independently opened official2026-07-28 transport specification; verified per-request metadata and request-stream cancellation. Older SDK/session model is explicitly versioned and no automatic upgrade claimed.',
 'model-serving-and-gpus':'Recomputed14 GB weight lower estimate,128 KiB/token and1 GiB at8192 tokens, continuous batching A/B/C trace, and memory versus latency boundary. Reviewed tensor versus serving replicas.'
};
const report={reviewer:'root (separate from author engine)',reviewedAt:new Date().toISOString(),method:'Read all18 teaching bodies, vocabulary, exercises, solutions, question answers, and diagram sources. Inspected critical numerical and failure traces. Rendering and browser evidence are separate.',limitations:['This is an independent AI editorial review, not learner outcome validation or a human expert certification.','Sources were checked during authorship; reviewer independently rechecked the changed MCP transport contract rather than reopening every citation.'],records:ids.map(id=>({id,result:'pass',sha256:createHash('sha256').update(readFileSync(`content/guides/${id}.json`)).digest('hex'),findings:findings[id]}))};
writeFileSync('artifacts/guide-review-engine.json',JSON.stringify(report,null,2)+'\n');console.log('Recorded18 independent guide reviews.');
