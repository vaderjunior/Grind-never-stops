import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const path=JSON.parse(fs.readFileSync('content/learning-path.json','utf8'));
const records=[],errors=[];
for(const meta of path.weeks.flatMap(w=>w.guides)){
 const raw=fs.readFileSync(`content/guides/${meta.id}.json`,'utf8'),g=JSON.parse(raw);
 try{
  assert(g.diagrams.length>=2,'Needs two purposeful diagrams.');
  assert.equal(new Set(g.diagrams.map(d=>d.id)).size,g.diagrams.length,'Duplicate diagram ID.');
  assert(g.walkthroughs?.length>=1,'Missing authored walkthrough.');
  for(const story of g.walkthroughs){
   assert(story.id&&story.title&&story.intro&&story.takeaway,'Missing walkthrough teaching.');
   assert(g.sections.some(s=>s.id===story.sectionId),'Walkthrough attached to an unknown section.');
   assert(story.steps.length>=3&&story.steps.length<=6,'Walkthrough must have 3–6 purposeful steps.');
   for(const step of story.steps){
    assert(step.title&&step.explanation&&step.state.length>=2,'Each step needs explanation and concrete state.');
    for(const entry of step.state)assert(typeof entry.label==='string'&&typeof entry.value==='string'&&entry.label.trim()&&entry.value.trim(),'State must be readable text.');
   }
  }
  const text=g.sections.map(s=>s.markdown).join('\n\n');
  const tables=(text.match(/^\|\s*[-:]+\s*\|/gm)||[]).length;
  assert(tables>=1,'Needs a concrete comparison or example table.');
  const paragraphs=text.replace(/```[\s\S]*?```/g,'').split(/\n\s*\n/).filter(p=>!/^\s*[|>#\-\d]/.test(p));
  const words=g.sections.map(s=>s.markdown).join(' ').split(/\s+/).length;
  const storyWords=g.walkthroughs.map(story=>[story.title,story.intro,story.takeaway,...story.steps.flatMap(s=>[s.title,s.explanation,...s.state.map(x=>x.value)])].join(' ')).join(' ').split(/\s+/).length;
  records.push({id:g.id,version:g.version,diagrams:g.diagrams.length,walkthroughs:g.walkthroughs.length,tables,teachingWords:words,walkthroughWords:storyWords,maxParagraphWords:Math.max(...paragraphs.map(p=>p.split(/\s+/).length)),sha256:createHash('sha256').update(raw).digest('hex')});
 }catch(error){errors.push({id:g.id,error:error.message});}
}
const report={checkedAt:new Date().toISOString(),planned:76,passed:records.length,errors,diagrams:records.reduce((n,r)=>n+r.diagrams,0),walkthroughs:records.reduce((n,r)=>n+r.walkthroughs,0),tables:records.reduce((n,r)=>n+r.tables,0),records,limits:['Counts check presence and structure, not whether the teaching is correct or engaging. Independent editorial review remains separate.']};
fs.writeFileSync('artifacts/illustrated-guide-validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,records:undefined},null,2));if(errors.length)process.exitCode=1;
