import fs from 'node:fs';
for(const file of ['scripts/author-guides-week03.mjs','content/guides/databases-and-sql.json','content/guides/find-data-with-indexes.json']){
 let text=fs.readFileSync(file,'utf8');
 text=text.replace(/\b(note|notes|user|owner|is|literal|contains|and|Row|uses|from|returns|not|value|all|return|IDs|find|stores|newest)(?=\d)/g,'$1 ')
 .replaceAll('LIMIT20','LIMIT 20').replaceAll('note_id44','note_id=44').replaceAll('owner_id9','owner_id=9');
 fs.writeFileSync(file,text);
}
for(const file of ['scripts/author-guide-redis.mjs','content/guides/redis-from-scratch.json']){
 let text=fs.readFileSync(file,'utf8').replaceAll('https://redis.io/docs/latest/operate/oss_and_stack/management/eviction/','https://redis.io/docs/latest/develop/reference/eviction/');
 fs.writeFileSync(file,text);
}
for(const file of ['scripts/author-guide-data-modeling.mjs','content/guides/data-modeling-basics.json']){
 let text=fs.readFileSync(file,'utf8').replaceAll('match an existing permitted key','match an existing referenced key');
 fs.writeFileSync(file,text);
}
for(const file of ['scripts/author-guide-kubernetes.mjs','scripts/author-guide-reliability.mjs','content/guides/kubernetes-building-blocks.json','content/guides/reliability-controls.json']){
 let text=fs.readFileSync(file,'utf8').replaceAll('https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/','https://kubernetes.io/docs/concepts/workloads/pods/probes/');
 fs.writeFileSync(file,text);
}
const reliability=JSON.parse(fs.readFileSync('content/guides/reliability-controls.json','utf8'));
for(const [title,url] of [['gRPC: deadlines and propagation','https://grpc.io/docs/guides/deadlines/'],['Google SRE: handling overload','https://sre.google/sre-book/handling-overload/']])if(!reliability.sources.some(s=>s.url===url))reliability.sources.push({title,url,checked:'2026-09-29'});
fs.writeFileSync('content/guides/reliability-controls.json',JSON.stringify(reliability,null,2)+'\n');
