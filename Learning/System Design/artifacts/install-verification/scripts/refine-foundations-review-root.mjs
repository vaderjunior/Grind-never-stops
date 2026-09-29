import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
const records=[];
const notes={
 'read-system-diagrams':['Read complete prose, diagrams, walkthrough, exercise, questions and cards.','No substantive issue found: local arrow legend, responsibility versus deployment, order versus elapsed time, and saved fact versus browser knowledge are explicit.'],
 'http-requests-and-errors':['Read complete prose, diagrams, walkthrough, exercise, questions and cards.','Fixed recovery trace: the caller now retains operation key op-17 before submission, and the fictional API explicitly supports lookup by that key. A lost resource identity alone would not have supported the shown status lookup.','Clarified 404 as no current representation or undisclosed existence, and labeled the error-response diagram branch broadly enough to include temporary server failures.'],
 'pagination-from-scratch':['Read complete prose, diagrams, walkthrough, exercise, questions and cards.','Manually traced insertion example and deletion exercise: offset and keyset outputs are correct. Full ordering, tie-breaker, authorization, mutable data and snapshot limits are stated. No substantive change needed.'],
 'numbers-bytes-and-units':['Read complete prose, diagrams, walkthrough, exercise, questions and cards.','Recomputed 100 Mbit/s = 12.5 MB/s; 6 GB transfer = 480 s; 50 × 2 MB/s = 800 Mbit/s; retention = 1.296 TB and three copies = 3.888 TB; exercise = 10 MB/s = 80 Mbit/s.','Defined telemetry in ordinary language and added decimal TB to the unit table before its later use.']
};
for(const id of Object.keys(notes)){
 const path=`content/guides/${id}.json`,g=JSON.parse(readFileSync(path,'utf8'));
 const protectedHash=hash(JSON.stringify({questions:g.questions,exercise:g.exercise,flashcards:g.flashcards}));
 if(id==='http-requests-and-errors'){
  const s=g.sections.find(x=>x.id==='status');s.markdown=s.markdown.replace('The requested resource is unavailable at this address','No current representation, or existence is not disclosed');
  const d=g.diagrams.find(x=>x.id==='result-branches');d.source=d.source.replace('Rejection: inspect reason','Error response: inspect reason');
  const w=g.walkthroughs[0];w.intro='A fictional API accepts one creation request and supports recovery by a caller-supplied operation key. The client keeps op-17 before sending; the response is lost after storage finishes.';
  w.steps[0].state.push({label:'Retained operation key',value:'op-17'});
  w.steps[0].explanation='The client submits with the supported operation key op-17 and retains it. The note has not yet been confirmed, so the UI shows uncertainty.';
  w.steps[2].state.find(x=>x.label==='Recovery').value='Look up op-17 under this API contract';
 }
 if(id==='numbers-bytes-and-units'){
  const u=g.sections.find(x=>x.id==='units');u.markdown=u.markdown.replace('| KiB, MiB, GiB |','| TB | 1,000,000,000,000 bytes |\n| KiB, MiB, GiB |');
  const r=g.sections.find(x=>x.id==='retention');r.markdown=r.markdown.replace('A telemetry service receives 1,000 events/s.','A telemetry service collects observations about a system, such as request events. In this example it receives 1,000 events/s.');
 }
 if(hash(JSON.stringify({questions:g.questions,exercise:g.exercise,flashcards:g.flashcards}))!==protectedHash)throw Error('Protected content changed '+id);
 const raw=JSON.stringify(g,null,2)+'\n';writeFileSync(path,raw);records.push({id,sha256:hash(raw),notes:notes[id],protectedAssessmentSha256:protectedHash});
}
const previous=JSON.parse(readFileSync('artifacts/guide-review-root.json','utf8'));
writeFileSync('artifacts/guide-review-root.json',JSON.stringify({reviewer:'Independent curriculum agent',name:'Four new visual foundation chapters',reviewedAt:new Date().toISOString(),source:'Full independent textual and state-transition review of the current JSON, including assessment answer keys; arithmetic recomputed by reviewer.',limits:['AI editorial review, not human or learner-outcome validation.','Global Mermaid render and browser/PDF checks are owned by the parent agent.'],records,previousReview:previous},null,2)+'\n');
console.log('Reviewed four new root guides; protected assessment fields unchanged.');
