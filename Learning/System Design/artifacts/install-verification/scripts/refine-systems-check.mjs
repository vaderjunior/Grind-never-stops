import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {owned} from './refine-systems-helpers.mjs';
const reportPath='artifacts/refinement-systems.json';
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
assert.deepEqual(report.guides.map(g=>g.id),owned);
for(const r of report.guides){
  const raw=fs.readFileSync(r.path,'utf8'),g=JSON.parse(raw);
  assert.equal(g.id,r.id);assert.equal(g.version,r.originalVersion+1);
  assert.equal(hash(raw),r.sha256,`${r.id}: content changed after recorded refinement`);
  assert.equal(hash({questions:g.questions,exercise:g.exercise,flashcards:g.flashcards}),r.protectedContentSha256,`${r.id}: protected learning content changed`);
  assert.equal(g.walkthroughs.length,1);assert(g.diagrams.length>=2);
  assert(g.sections.some(s=>s.markdown.includes('| ---')),'Each guide needs an authored concrete comparison/example');
  assert(g.sections.map(s=>s.markdown).join(' ').split(/\s+/).length>=550);
  const sections=new Set(g.sections.map(s=>s.id));
  for(const d of g.diagrams){assert(sections.has(d.sectionId));assert(d.caption&&d.steps.length>=3);assert(d.source);}
  const w=g.walkthroughs[0];assert(sections.has(w.sectionId));assert(w.intro&&w.takeaway);
  assert(w.steps.length>=3&&w.steps.length<=5);
  for(const s of w.steps){assert(s.title&&s.explanation);assert(s.state.length>=2&&s.state.length<=4);for(const v of s.state)assert(typeof v.label==='string'&&typeof v.value==='string'&&v.label&&v.value);}
}
report.localChecks={checkedAt:new Date().toISOString(),command:'node scripts/refine-systems-check.mjs',reviewedGuides:owned.length,exactCurrentHashes:owned.length,protectedQuizExerciseFlashcardHashes:owned.length,walkthroughs:owned.length,diagramAnchors:report.guides.reduce((n,g)=>n+g.diagrams.length,0),result:'passed',limits:'This verifies structure, anchoring, immutable assessment material, and current hashes. It does not replace the separate editorial review or root-owned Mermaid/UI rendering.'};
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.localChecks,null,2));
