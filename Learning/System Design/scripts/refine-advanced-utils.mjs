import fs from 'node:fs';
import crypto from 'node:crypto';

const digest = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
export const diagram = (id, sectionId, title, source, caption, steps) => ({id,sectionId,title,source,caption,steps});
export const step = (title, explanation, values) => ({title,explanation,state:Object.entries(values).map(([label,value])=>({label,value:String(value)}))});
export const walk = (id,title,sectionId,intro,steps,takeaway) => ({id,title,sectionId,intro,steps,takeaway});

// Split long ordinary paragraphs at sentence boundaries. Lists, tables, code,
// and already concise paragraphs retain their original structure.
function readable(markdown){
 let inCode=false;
 return markdown.split(/\n\n/).map(block=>{
   const fences=(block.match(/^(?:```|~~~)/gm)||[]).length;
   const wasInCode=inCode;if(fences%2)inCode=!inCode;
   if(wasInCode||fences||/^(?:\||>|[-*] |\d+\. |#)/.test(block)||block.split(/\s+/).length<75)return block;
   const sentences=block.split(/(?<=[.!?])\s+(?=[A-Z“])/);if(sentences.length<3)return block;
   const chunks=[];let pending='';
   for(const sentence of sentences){pending+=(pending?' ':'')+sentence;if(pending.split(/\s+/).length>=45){chunks.push(pending);pending='';}}
   if(pending){if(pending.split(/\s+/).length<12&&chunks.length)chunks[chunks.length-1]+=' '+pending;else chunks.push(pending);}
   return chunks.join('\n\n');
 }).join('\n\n');
}

export function refine(id,{sections={},addedDiagram,walkthrough,changes,gaps=[]}){
 const allowed=['interview-game-plan','estimates-and-tradeoffs','design-notifications','design-rate-limiter','design-chat','chat-reconnect-and-scale','design-news-feed','feed-fanout-and-ranking','design-file-storage','file-sync-and-conflicts','design-video-platform','design-search-and-autocomplete','design-bookings','design-payments','coordination-and-leases','change-data-safely','mcp-platform-architecture','platform-security-and-tenancy','ai-system-design','model-serving-and-gpus','rag-and-inference','ai-platform-operations','full-mock-interview','capstone-and-readiness-plan'];
 if(!allowed.includes(id))throw Error('Guide outside owned scope: '+id);
 const file=`content/guides/${id}.json`,raw=fs.readFileSync(file,'utf8'),g=JSON.parse(raw);
 const protectedBefore=digest({questions:g.questions,exercise:g.exercise,flashcards:g.flashcards});
 const beforeVersion=g.version;
 for(const s of g.sections){if(sections[s.id]!==undefined)s.markdown=sections[s.id];if(s.kind!=='timed-change')s.markdown=readable(s.markdown);}
 for(const key of Object.keys(sections))if(!g.sections.some(s=>s.id===key))throw Error(`${id}: unknown section ${key}`);
 if(addedDiagram){g.diagrams=g.diagrams.filter(d=>d.id!==addedDiagram.id);g.diagrams.push(addedDiagram);}
 g.walkthroughs=[walkthrough];
 if(!g.sections.some(s=>s.id===walkthrough.sectionId&&s.kind!=='timed-change'))throw Error(`${id}: unsafe walkthrough placement`);
 if(walkthrough.steps.length<3||walkthrough.steps.length>5||walkthrough.steps.some(s=>s.state.length<2||s.state.length>4))throw Error(`${id}: invalid walkthrough steps`);
 if(g.diagrams.length<2||g.diagrams.some(d=>d.steps.length<3))throw Error(`${id}: diagram contract unmet`);
 if(protectedBefore!==digest({questions:g.questions,exercise:g.exercise,flashcards:g.flashcards}))throw Error(`${id}: protected assessment changed`);
 g.version=Math.max(2,g.version);
 fs.writeFileSync(file,JSON.stringify(g,null,2)+'\n');
 const reportFile='artifacts/refinement-advanced.json';
 const report=fs.existsSync(reportFile)?JSON.parse(fs.readFileSync(reportFile,'utf8')):{scope:'Last 24 Learn chapters in path order',method:'Full chapter reading, original illustrated refinements, assessment-preserving edits; independent cross-review pending.',chapters:[]};
 const previous=report.chapters.find(c=>c.id===id);
 report.chapters=report.chapters.filter(c=>c.id!==id);
 report.chapters.push({id,file,previousVersion:previous?.previousVersion??beforeVersion,version:g.version,beforeSha256:previous?.beforeSha256??digest(raw),sha256:digest(fs.readFileSync(file,'utf8')),assessmentSha256:protectedBefore,changes:['Split long ordinary paragraphs at meaningful sentence boundaries.',...changes],diagrams:g.diagrams.length,walkthrough:{id:walkthrough.id,sectionId:walkthrough.sectionId,steps:walkthrough.steps.length},gaps,review:'awaiting independent editorial and final diagram review'});
 report.chapters.sort((a,b)=>allowed.indexOf(a.id)-allowed.indexOf(b.id));report.updatedAt=new Date().toISOString();
 fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
 console.log(`${id}: v${g.version}, ${g.diagrams.length} diagrams, ${walkthrough.steps.length} walkthrough steps`);
}
