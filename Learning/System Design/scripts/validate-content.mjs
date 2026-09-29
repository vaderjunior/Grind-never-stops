import {readFileSync,writeFileSync,existsSync,readdirSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {z} from 'zod';
const manifest=JSON.parse(readFileSync('content/manifest.json','utf8'));
const id=z.string().regex(/^\d{3}$/), text=z.string().min(1);
const question=z.object({id:text,type:z.enum(['choice','numeric','open']),prompt:text,options:z.array(text).optional(),answer:z.union([text,z.number()]),explanation:text,tolerance:z.number().nonnegative().optional(),unit:z.string().optional()});
const lessonSchema=z.object({id,version:z.number().int().positive(),status:z.enum(['drafted','reviewed','validated']),objectives:z.array(text).min(1),retrieval:z.array(text),sections:z.array(z.object({id:text,title:text,markdown:text})).min(1),diagrams:z.array(z.object({id:text,title:text,source:text,caption:text,steps:z.array(text)})),exercise:z.object({prompt:text,minutes:z.number().positive(),rubric:z.array(text).min(1),solution:text}),questions:z.array(question),flashcards:z.array(z.object({front:text,back:text})),mentalModel:text,sources:z.array(z.object({title:text,url:z.string().url()}))});
const interviewSchema=z.object({id:z.string().regex(/^interview_\d{3}$/),lessonId:id,title:text,aliases:z.array(text),minutes:z.number().min(45).max(60),brief:text,hints:z.array(text).min(1),clarifications:z.array(z.object({question:text,answer:text})).min(1),changes:z.array(text).min(1),rubric:z.array(z.object({id:text,label:text,weight:z.number().positive()})),referenceSolution:text,debrief:text,remediation:z.array(id)});
const errors=[],warnings=[],records=[];
const addError=(msg)=>errors.push(msg);
assert.equal(manifest.lessons.length,300);assert.equal(manifest.modules.length,30);
assert.equal(new Set(manifest.lessons.map(l=>l.id)).size,300);
const ids=new Set(manifest.lessons.map(l=>l.id));
const moduleIds=new Set(manifest.modules.map(m=>m.id));
const byId=new Map(manifest.lessons.map(l=>[l.id,l]));
assert.equal(manifest.lessons.filter(l=>l.type==='assessment').length,63);
assert.equal(manifest.projects.length,6);
assert.equal(manifest.projects.flatMap(p=>p.milestones).length,24);
assert.equal(manifest.lessons.reduce((n,l)=>n+l.minutes,0),16955);
const visiting=new Set(),visited=new Set();
function visit(id){if(visiting.has(id))throw Error(`Prerequisite cycle at ${id}`);if(visited.has(id))return;visiting.add(id);const l=byId.get(id);for(const p of l.prerequisites){assert(ids.has(p),`${id} references unknown prerequisite ${p}`);visit(p);}visiting.delete(id);visited.add(id);}
for(const meta of manifest.lessons){
 assert(moduleIds.has(meta.moduleId));assert(meta.minutes>=45&&meta.minutes<=60);visit(meta.id);
 const file=`content/lessons/${meta.id}.json`;
 let record={id:meta.id,moduleId:meta.moduleId,title:meta.title,state:'metadata-only',wordCount:0,evidence:[],limitations:['Teaching or assessment package not authored.']};
 if(existsSync(file)){
  try {
   const raw=readFileSync(file,'utf8'),l=lessonSchema.parse(JSON.parse(raw));assert.equal(l.id,meta.id);
   assert.equal(new Set(l.sections.map(s=>s.id)).size,l.sections.length,'Duplicate section IDs');
   assert.equal(new Set(l.questions.map(q=>q.id)).size,l.questions.length,'Duplicate question IDs');
   const wordCount=l.sections.map(s=>s.markdown).join(' ').split(/\s+/).length;
   if(meta.type==='teaching'){
    assert(l.objectives.length>=3,'Teaching needs at least 3 objectives');assert(l.questions.length>=4,'Teaching needs substantive conceptual/tradeoff questions');
    assert(l.flashcards.length>=5,'Teaching needs at least 5 cards');assert(l.diagrams.length>=1,'Teaching needs an explanatory diagram');
    assert(wordCount>=350,'Teaching body below structural minimum; this threshold does not establish sufficient depth');
    assert(l.exercise.solution.length>=150,'Exercise solution needs worked reasoning');
   }
   for(const q of l.questions){if(q.type==='choice')assert(q.options?.includes(String(q.answer)),`${q.id}: answer absent from options`);if(q.type==='numeric'){assert.equal(typeof q.answer,'number');assert(q.unit,`${q.id}: numeric unit missing`);}}
   const hash=createHash('sha256').update(raw).digest('hex');
   let state='drafted',evidence=['Schema, references, objective answer structure and minimum teaching components checked.'];
   const reviewFile=`content/reviews/${meta.id}.json`;
   if(existsSync(reviewFile)){const review=JSON.parse(readFileSync(reviewFile,'utf8'));if(review.sha256===hash&&review.result==='pass'){state='reviewed';evidence.push(...review.evidence);}}
   record={...record,state,wordCount,sha256:hash,evidence,limitations:state==='drafted'?['Substantive independent editorial review and visual diagram verification remain.']:['Complete acceptance review not yet recorded.']};
   if(meta.type==='assessment'){
    const iFile=`content/interviews/${meta.interviewId}.json`;assert(existsSync(iFile),'Assessment definition missing');const interview=interviewSchema.parse(JSON.parse(readFileSync(iFile,'utf8')));assert.equal(interview.lessonId,meta.id);assert.equal(interview.rubric.reduce((n,r)=>n+r.weight,0),100);for(const p of interview.remediation)assert(ids.has(p),`Unknown remediation ${p}`);
   }
  }catch(e){addError(`${meta.id}: ${e.message}`);record.limitations=[`Validation failed: ${e.message}`];}
 }
 records.push(record);
}
for(const [route,steps] of Object.entries(manifest.routes)){assert.equal(new Set(steps).size,steps.length,`${route} duplicate steps`);for(const step of steps)assert(ids.has(step),`${route}: unknown lesson ${step}`);}
for(const p of manifest.projects)for(const m of p.milestones)assert(ids.has(m.lessonId),`Unknown project milestone ${m.lessonId}`);
const available=records.filter(r=>r.state!=='metadata-only');
const counts={catalog:300,authored:available.length,metadataOnly:300-available.length,drafted:records.filter(r=>r.state==='drafted').length,reviewed:records.filter(r=>r.state==='reviewed').length,validated:records.filter(r=>r.state==='validated').length};
warnings.push('Structural validation is not pedagogical review. No automatic promotion to validated.');
const report={version:1,generatedAt:new Date().toISOString(),counts,records,errors,warnings};
writeFileSync('content/content-status.json',JSON.stringify(report,null,2)+'\n');
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/content-validation.json',JSON.stringify({counts,errors,warnings},null,2)+'\n');
console.log(JSON.stringify({counts,errors,warnings},null,2));if(errors.length)process.exitCode=1;
