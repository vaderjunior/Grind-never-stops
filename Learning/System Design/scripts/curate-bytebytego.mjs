import fs from 'node:fs';
const inventory=JSON.parse(fs.readFileSync('artifacts/bytebytego-inventory.json','utf8'));
// These public pages were opened with web.run and their expected guide text/title read.
// Verified means link/content identity, not endorsement of every technical claim.
const picked=[
['what-happens-when-you-type-a-url-into-your-browser',[1],'Visual reinforcement for the browser-to-server journey after the original first explanation. The example is HTTP/TCP; it is not every modern transport.'],
['how-does-the-domain-name-system-dns-lookup-work',[1],'Follow a named resolver through DNS lookup after domain and address are defined. Treat timings as context-specific.'],
['how-does-rest-api-work',[2],'A visual checklist after the original request/response guide; its short text is not a standalone beginner lesson.'],
['what-does-acid-mean',[4],'A vocabulary recap after a concrete transaction example. Read alongside the guide’s explicit failure and isolation scope.'],
['what-is-a-load-balancer',[6],'Locate the traffic distributor in a small multi-server app before exploring its many types.'],
['proxy-vs-reverse-proxy',[6],'Compare which side of a conversation the intermediary serves, after the main load-balancing walkthrough.'],
['top-5-caching-strategies',[6,7],'Optional visual vocabulary for read/write cache paths. Our original guide supplies freshness and failure reasoning.'],
['a-crash-course-in-database-sharding',[9],'Introduces partition keys, placement approaches, and cross-shard costs after the learner understands one table.'],
['consistent-hashing',[9],'Shows why changing a modulo divisor moves keys. Treat vendor examples as historical illustrations, not current architecture evidence.'],
['cap-theorem-one-of-the-most-misunderstood-terms',[10],'A discussion prompt after precise partition histories. Keep formal availability distinct from merely returning an HTTP response.'],
['delivery-semantics',[8,11],'Compare delivery terms after tracing one thumbnail task. Our guide distinguishes message delivery from a once-only business effect.'],
['how-do-we-detect-node-failures-in-distributed-systems',[13,22],'A visual catalog of heartbeat approaches after learning that timeout means suspicion, not proof of death.'],
['how-to-ace-system-design-interviews-like-a-boss',[15,24],'Optional interview structure once components have concrete meaning. Use a complete small design before deep dives.'],
['how-to-design-google-docs',[19],'Later comparison exercise for collaboration paths; a teaching sketch, not verified current product internals.'],
['how-to-avoid-double-payment',[21],'Motivates stable operation identity through a user-visible duplicate-charge problem. Our core material supplies the atomic effect/deduplication boundary and limits.']
];
const resources=picked.map(([slug,weeks,why])=>{const g=inventory.guides.find(x=>x.id===slug);if(!g)throw new Error(slug);return{id:'bbg-'+slug,title:g.title,url:g.url+'/',provider:'ByteByteGo',kind:'visual-guide',access:'Free public guide; linked courses or other destinations may have separate access requirements.',checkedAt:'2026-09-29',status:'verified',why,weeks};});
fs.writeFileSync('content/resources-bytebytego.json',JSON.stringify(resources,null,2)+'\n');
console.log(`Saved ${resources.length} individually opened reference pages.`);
