import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const reportPath='artifacts/refinement-systems.json';
// The path can grow while parallel authors work; ownership stays with this original allocation.
export const owned=['cache-freshness-and-cdns','serialization-and-data-formats','background-jobs','containers-and-deployment','queues-and-retries','queue-broker-fundamentals','job-lifecycle-and-backpressure','first-design-url-shortener','copying-data','split-data-into-shards','consistency-in-plain-language','partitions-and-quorums','reliable-events','streaming-and-replay','identity-and-permissions','rate-limits-and-abuse','reliable-systems','reliability-controls','observe-and-debug','kubernetes-building-blocks','ship-and-recover','kubernetes-networking','regions-and-disaster-recovery','kubernetes-operations'];
const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
export const step=(title,explanation,state)=>({title,explanation,state:Object.entries(state).map(([label,value])=>({label,value:String(value)}))});
export const walk=(id,title,sectionId,intro,steps,takeaway)=>({id,title,sectionId,intro,steps,takeaway});
export const diagram=(id,title,sectionId,source,caption,steps)=>({id,title,sectionId,source,caption,steps});
export function refine({id,sections,diagram:visual,replaceDiagram,walkthrough,changes,gaps=[]}) {
  assert(owned.includes(id),'Only the middle 24 guides may be edited');
  const file=`content/guides/${id}.json`,raw=fs.readFileSync(file,'utf8'),g=JSON.parse(raw);
  const report=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')):{schemaVersion:1,scope:owned,method:'Full prose read followed by original instructional rewrites. Comparison tables, concrete state changes, and diagrams explain the same user-facing guarantees. Quiz answers, exercise solutions, and flashcard order are preserved.',guides:[],limitations:['Examples are original teaching models, not production measurements.','Previously reviewed primary references are reused; no new product guarantee is inferred from an illustrative diagram.','Structural and arithmetic checks are separate from independent editorial and rendered UI review.']};
  const previous=report.guides.find(x=>x.id===id);
  const protectedBefore=hash({questions:g.questions,exercise:g.exercise,flashcards:g.flashcards});
  for(const [sectionId,markdown] of Object.entries(sections)) {
    const section=g.sections.find(s=>s.id===sectionId); assert(section,`Missing section ${id}/${sectionId}`);
    section.markdown=markdown.trim();
  }
  assert(g.sections.some(s=>s.id===visual.sectionId));
  const visualIndex=g.diagrams.findIndex(d=>d.id===(replaceDiagram??visual.id));
  if(visualIndex>=0) g.diagrams[visualIndex]={...visual,id:g.diagrams[visualIndex].id}; else g.diagrams.push(visual);
  assert(g.diagrams.length>=2);
  assert(g.sections.some(s=>s.id===walkthrough.sectionId));
  assert(walkthrough.steps.length>=3&&walkthrough.steps.length<=5);
  for(const s of walkthrough.steps)assert(s.state.length>=2&&s.state.length<=4);
  g.walkthroughs=[walkthrough];
  g.version=(previous?.originalVersion??g.version)+1;
  assert.equal(hash({questions:g.questions,exercise:g.exercise,flashcards:g.flashcards}),protectedBefore);
  const updated=JSON.stringify(g,null,2)+'\n';fs.writeFileSync(file,updated);
  const entry={id,path:file,originalVersion:previous?.originalVersion??g.version-1,version:g.version,originalSha256:previous?.originalSha256??hash(raw),sha256:hash(updated),protectedContentSha256:protectedBefore,sectionsRewritten:Object.keys(sections),diagrams:g.diagrams.map(d=>({id:d.id,sectionId:d.sectionId})),walkthroughId:walkthrough.id,walkthroughSteps:walkthrough.steps.length,changes,gaps,bodyWords:g.sections.map(s=>s.markdown).join(' ').split(/\s+/).length};
  report.guides=report.guides.filter(x=>x.id!==id).concat(entry).sort((a,b)=>owned.indexOf(a.id)-owned.indexOf(b.id));
  report.generatedAt=new Date().toISOString();
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(`${id}: v${g.version}, ${entry.bodyWords} body words, ${g.diagrams.length} diagrams, ${walkthrough.steps.length} walkthrough steps`);
}
