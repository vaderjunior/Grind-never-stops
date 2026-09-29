// Read-only reference-repository inspection. Outputs original inventory, no source copies.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
const root=path.resolve('reference-repos/system-design-101');
const tracked=execFileSync('git',['-C',root,'ls-files'],{encoding:'utf8'}).trim().split(/\r?\n/);
const commit=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const unquote=s=>s?.trim().replace(/^(['"])(.*)\1$/,'$2');
const field=(front,key)=>unquote(front.match(new RegExp('^'+key+':\\s*(.*)$','m'))?.[1]);
function parse(rel){
 const raw=fs.readFileSync(path.join(root,rel),'utf8').replace(/\r\n/g,'\n');
 const match=raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
 if(!match)throw new Error('Missing frontmatter '+rel);
 const [,front,body]=match;
 const categories=(front.match(/^categories:\s*\n((?:[ \t]+.*\n)*)/m)?.[1]||'').split('\n').map(x=>x.match(/^\s+-\s+(.+)/)?.[1]).filter(Boolean).map(unquote);
 const images=[...body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(x=>x[1]);
 const links=[...raw.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)].map(x=>x[1]);
 const text=body.replace(/!\[[^\]]*\]\([^)]+\)/g,'').trim();
 const id=path.basename(rel,'.md');
 return {id,title:field(front,'title'),description:field(front,'description'),createdAt:field(front,'createdAt'),sort:Number(field(front,'sort'))||0,categories,localPath:path.join(root,rel).replaceAll('\\','/'),repositoryPath:rel,url:'https://bytebytego.com/guides/'+id,githubUrl:'https://github.com/ByteByteGoHq/system-design-101/blob/'+commit+'/'+rel.split('/').map(encodeURIComponent).join('/'),image:field(front,'image'),images,links,bodyWords:text.split(/\s+/).filter(Boolean).length,sha256:crypto.createHash('sha256').update(raw).digest('hex')};
}
const categories=tracked.filter(x=>x.startsWith('data/categories/')&&x.endsWith('.md')).map(parse).sort((a,b)=>a.sort-b.sort);
const guides=tracked.filter(x=>x.startsWith('data/guides/')&&x.endsWith('.md')).map(parse);
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
const readmeOrder=[...readme.matchAll(/^  \* \[[^\]]+\]\(https:\/\/bytebytego\.com\/guides\/([^)]+)\)/gm)].map(x=>x[1]);
const missingFromReadme=guides.filter(g=>!readmeOrder.includes(g.id)).map(g=>g.id);
const unknownReadme=readmeOrder.filter(id=>!guides.some(g=>g.id===id));
const unknownCategories=guides.flatMap(g=>g.categories.filter(c=>!categories.some(x=>x.id===c)).map(c=>({guide:g.id,category:c})));
const bodies=guides.map(g=>g.bodyWords).sort((a,b)=>a-b);
const absoluteImages=[...new Set([...guides,...categories].flatMap(g=>[g.image,...g.images]).filter(Boolean))];
const localImages=tracked.filter(x=>/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(x));
const localMissing=[];
for(const item of [...guides,...categories])for(const target of [...item.images,...item.links]){
 if(/^(https?:|mailto:|#|\/)/.test(target))continue;
 const disk=path.resolve(path.dirname(item.localPath),decodeURIComponent(target.split('#')[0]));
 if(!fs.existsSync(disk))localMissing.push({file:item.repositoryPath,target});
}
const placement={
 'api-web-development':'Month1 foundations; Month2 API details; Month3 load balancing',
 'real-world-case-studies':'Months5–6 optional case-study reading after building a baseline',
 'ai-machine-learning':'Optional specialization after the core six-month route',
 'database-and-storage':'Month2 basic data and queries; Month4 replication/partitioning',
 'technical-interviews':'Browser journey in Month1; formal mock framework in Months5–6',
 'caching-performance':'Month3 cache/CDN concepts; measured failures in Month4',
 'payment-and-fintech':'Month5 optional correctness case study; domain glossary first',
 'software-architecture':'Months3–5 after one working app; avoid pattern memorization',
 'devtools-productivity':'Optional onboarding support; not a prerequisite catalog',
 'software-development':'Optional coding bridge and implementation practice',
 'cloud-distributed-systems':'Months3–4 core scaling/failures; platform catalogs optional',
 'how-it-works':'Months1–6 selected contextual examples, not a fixed sequence',
 'devops-cicd':'Months4–5 operations after the app has a deployable shape',
 'security':'Month1 identity versus permission; Month2 sessions; revisit every design',
 'computer-fundamentals':'Month1 prerequisite bridge; processes/concurrency in Month2'
};
const inventory={checkedAt:new Date().toISOString(),repository:'https://github.com/ByteByteGoHq/system-design-101',commit,scope:'Every tracked path inventoried; every category and guide frontmatter/body scanned for metadata, counts, and link targets. Human teaching review is representative, not a fact-check of all400 guides. No upstream scripts executed or repository files modified.',counts:{trackedFiles:tracked.length,categories:categories.length,guides:guides.length,readmeEntries:readmeOrder.length,uniqueReadmeGuides:new Set(readmeOrder).size,localImages:localImages.length,distinctImageTargets:absoluteImages.length,guidesUnder50BodyWords:guides.filter(g=>g.bodyWords<50).length,medianBodyWords:bodies[Math.floor(bodies.length/2)]},localImages,missingFromReadme,unknownReadme,unknownCategories,localMissing,categories:categories.map(c=>({...c,guideCount:guides.filter(g=>g.categories.includes(c.id)).length,proposedPlacement:placement[c.id]})),guides:guides.map(g=>({...g,readmeIndex:readmeOrder.indexOf(g.id)+1,remoteStatus:'not individually checked'})),imageTargets:absoluteImages};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/bytebytego-inventory.json',JSON.stringify(inventory,null,2)+'\n');
let out='# ByteByteGo full topic map\n\nOriginal inventory of the unmodified local reference clone. Source titles identify the referenced articles; they are not academy lesson titles or copied teaching content. Checked commit `'+commit+'`. External status is not implied by local presence. See [review](REFERENCE_REVIEW_BYTEBYTEGO.md).\n\n';
out+='All '+guides.length+' unique guide files are mapped below in the repository’s category order. A guide may appear under more than one category. The proposed placement is an original teaching judgment, not an upstream curriculum.\n\n';
for(const cat of categories){
 out+='## '+cat.title+' ('+guides.filter(g=>g.categories.includes(cat.id)).length+')\n\n'+placement[cat.id]+'.\n\n';
 out+='Category metadata: ['+cat.repositoryPath+'](<'+cat.localPath+'>).\n\n| Topic | Local Markdown | Source page | Body words |\n|---|---|---|---:|\n';
 for(const g of guides.filter(g=>g.categories.includes(cat.id)).sort((a,b)=>readmeOrder.indexOf(a.id)-readmeOrder.indexOf(b.id))){out+='| '+g.title.replaceAll('|','\\|')+' | [file](<'+g.localPath+'>) | [ByteByteGo]('+encodeURI(g.url)+') | '+g.bodyWords+' |\n';}
 out+='\n';
}
fs.writeFileSync('docs/REFERENCE_TOPICS_BYTEBYTEGO.md',out);
console.log(JSON.stringify({...inventory.counts,localImages,missingFromReadme,unknownReadme,unknownCategories,localMissing,categories:inventory.categories.map(c=>({id:c.id,count:c.guideCount,sort:c.sort}))},null,2));
