import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const ids=['what-is-system-design','computer-and-server-basics','request-journey','dns-and-addresses','apis-without-jargon','connection-and-protocol-basics','data-that-survives','processes-threads-and-concurrency','databases-and-sql','sql-in-small-steps','find-data-with-indexes','database-families','transactions-and-correctness','data-modeling-basics','choose-a-database','blobs-files-and-objects','measure-before-scaling','grow-one-server','gateways-and-proxies','service-boundaries','load-balancing','remember-with-caches','redis-from-scratch','cache-patterns-and-invalidation'];
const reportPath='artifacts/refinement-foundations.json';
const hash=x=>createHash('sha256').update(x).digest('hex');
export const step=(title,explanation,values)=>({title,explanation,state:Object.entries(values).map(([label,value])=>({label,value:String(value)}))});
export const diagram=(id,sectionId,title,source,caption,steps)=>({id,sectionId,title,source,caption,steps});
export function refine(id,change){
  if(!ids.includes(id))throw Error('Out-of-scope guide '+id);
  const path=`content/guides/${id}.json`,before=readFileSync(path,'utf8'),g=JSON.parse(before);
  const report=existsSync(reportPath)?JSON.parse(readFileSync(reportPath,'utf8')):{date:'2026-09-29',author:'curriculum agent',scope:ids,reviewStatus:'Awaiting independent editorial review of these refinements',guides:[]};
  if(report.guides.some(x=>x.id===id))throw Error('Already refined: use a separate corrective patch, not regeneration: '+id);
  const protectedBefore=hash(JSON.stringify({id:g.id,questions:g.questions,flashcards:g.flashcards,exercise:g.exercise}));
  const api={
    replace(sectionId,oldText,newText){const s=g.sections.find(s=>s.id===sectionId);if(!s||!s.markdown.includes(oldText))throw Error(`${id}/${sectionId} missing replacement`);s.markdown=s.markdown.replace(oldText,newText);},
    append(sectionId,text){const s=g.sections.find(s=>s.id===sectionId);if(!s)throw Error(`${id}/${sectionId} missing section`);s.markdown+='\n\n'+text;},
    set(sectionId,text){const s=g.sections.find(s=>s.id===sectionId);if(!s)throw Error(`${id}/${sectionId} missing section`);s.markdown=text;}
  };
  const details=change(g,api);g.version=(g.version||1)+1;
  const protectedAfter=hash(JSON.stringify({id:g.id,questions:g.questions,flashcards:g.flashcards,exercise:g.exercise}));
  if(protectedBefore!==protectedAfter)throw Error('Protected learning identities or answers changed '+id);
  if(g.diagrams.length<2||g.walkthroughs?.length!==1)throw Error('Visuals missing '+id);
  for(const d of g.diagrams)if(!g.sections.some(s=>s.id===d.sectionId)||d.steps.length<3)throw Error('Diagram association '+id+'/'+d.id);
  for(const w of g.walkthroughs){if(!g.sections.some(s=>s.id===w.sectionId)||w.steps.length<3||w.steps.length>5)throw Error('Walkthrough structure '+id);for(const s of w.steps)if(s.state.length<2||s.state.length>4||s.state.some(v=>typeof v.value!=='string'))throw Error('Walkthrough state '+id);}
  const after=JSON.stringify(g,null,2)+'\n';writeFileSync(path,after);
  report.guides.push({id,versionBefore:JSON.parse(before).version,versionAfter:g.version,beforeSha256:hash(before),sha256:hash(after),protectedFieldsSha256:protectedAfter,diagrams:g.diagrams.length,walkthrough:g.walkthroughs[0].id,...details,remainingGaps:['Independent editorial cross-review and final rendered-page QA are pending for this refinement.','Examples are teaching scenarios, not measurements of a deployed service.']});
  report.guides.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));report.completed=report.guides.length;writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(id+' refined: '+g.diagrams.length+' diagrams, '+g.walkthroughs[0].steps.length+' walkthrough steps');
}
