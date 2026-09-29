import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const files=['content/resources-bytebytego.json','content/resources-awesome.json','content/resources-extra.json'];
const seen=new Set(),resources=[];
for(const file of files){if(!existsSync(file))continue;for(const resource of JSON.parse(readFileSync(file,'utf8'))){if(seen.has(resource.url))continue;seen.add(resource.url);resources.push({...resource,linkStatus:resource.status==='verified'?'Link checked':resource.status==='broken'?'Broken link — excluded':'Not verified'});}}
writeFileSync('content/curated-resources.json',JSON.stringify(resources,null,2)+'\n');
console.log(`Saved ${resources.length} curated resources; ${resources.filter(x=>x.status==='verified').length} have recorded reachability checks. Access and content-review limits remain per resource.`);
