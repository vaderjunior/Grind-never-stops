import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const reportPath='artifacts/guide-review-engine.json';
const scope=JSON.parse(readFileSync('artifacts/refinement-systems.json','utf8')).scope;
const hash=x=>createHash('sha256').update(x).digest('hex');
export function review(id,notes,edit){
 if(!scope.includes(id))throw Error('Outside review scope '+id);
 const old=JSON.parse(readFileSync(reportPath,'utf8'));
 const report=old.reviewRound==='illustrative-refinement'?old:{reviewRound:'illustrative-refinement',reviewer:'Independent curriculum agent',name:'Middle 24 guides: visual teaching refinement',reviewedAt:new Date().toISOString(),source:'Full prose, tables, diagrams, walkthrough state transitions, exercise and question keys read independently. Arithmetic and failure traces reasoned through explicitly.',limits:['AI editorial review, not human or learner-outcome validation.','No live distributed service was deployed for this textual review.','Final global Mermaid, browser and PDF checks are performed separately by the parent agent.'],records:[],previousReview:old};
 if(report.records.some(x=>x.id===id))throw Error('Already reviewed '+id);
 const path=`content/guides/${id}.json`,raw=readFileSync(path,'utf8'),g=JSON.parse(raw);
 const protectedHash=hash(JSON.stringify({questions:g.questions,exercise:g.exercise,flashcards:g.flashcards}));
 if(edit)edit(g);
 if(hash(JSON.stringify({questions:g.questions,exercise:g.exercise,flashcards:g.flashcards}))!==protectedHash)throw Error('Protected content changed '+id);
 const after=edit?JSON.stringify(g,null,2)+'\n':raw;if(edit)writeFileSync(path,after);
 report.records.push({id,sha256:hash(after),beforeReviewSha256:hash(raw),notes,protectedAssessmentSha256:protectedHash,changed:hash(raw)!==hash(after)});
 report.records.sort((a,b)=>scope.indexOf(a.id)-scope.indexOf(b.id));report.reviewedAt=new Date().toISOString();report.count=report.records.length;writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log('Reviewed '+id);
}
