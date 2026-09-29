import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'System_Design_Course_Blueprint.md');
const source = fs.readFileSync(sourcePath, 'utf8');
const html = fs.readFileSync(path.join(root, 'System_Design_Course_Blueprint.html'), 'utf8');
const modules = [], lessons = [], projects = [];
let current;
for (const line of source.split(/\r?\n/)) {
  const heading = line.match(/^### (M\d{2}) — (.+)$/);
  if (heading) { current = {id: heading[1], title: heading[2], source: 'catalog'}; modules.push(current); }
  const details = line.match(/^\*\*Phase (\w) · prerequisites:\*\* (.+?)\. \*\*Exit skill:\*\* (.+)$/);
  if (details && current) Object.assign(current, {phase: details[1], prerequisites: details[2].match(/M\d{2}/g) || [], prerequisiteText: details[2], exitSkill: details[3]});
  const row = line.match(/^\| (\d{3}) \| (.+?) \| ([🟢🟡🔴]+) ([BIA]) \| (\d+) \|$/u);
  if (row) {
    const [,id,title,prioritySymbol,depth,minutes] = row;
    const assessment = title.match(/^\[([ABCD])\]/);
    const project = title.match(/\[P(\d)\.(\d)\]/);
    lessons.push({id,moduleId:current.id,title,priority:({'🟢':'essential','🟡':'important','🔴':'extension'})[prioritySymbol],depth,minutes:Number(minutes),type:assessment?'assessment':project?'project':/^Review [ABCD]:/.test(title)?'debrief':'teaching',...(assessment?{assessmentType:assessment[1]}:{}),...(project?{project:{id:`P${project[1]}`,milestone:Number(project[2])}}:{}),source:'catalog',prerequisites:[]});
  }
  const projectRow = line.match(/^\| (P\d) — (.+?) \| ([\d, ]+) \| (.+?) \| (.+?) \|$/);
  if (projectRow) projects.push({id:projectRow[1],title:projectRow[2],milestones:projectRow[3].split(', ').map((lessonId,index)=>({lessonId,number:index+1})),baselineArtifact:projectRow[4],acceptanceEvidence:projectRow[5].split('; '),source:'catalog'});
}
for (const lesson of lessons) {
  const module = modules.find(m=>m.id===lesson.moduleId);
  lesson.prerequisites = [...module.prerequisites.map(id=>String(Number(id.slice(1))*10).padStart(3,'0')), ...lessons.filter(l=>l.moduleId===lesson.moduleId && l.id<lesson.id && l.priority!=='extension' && !['297','298'].includes(l.id)).map(l=>l.id)];
  if (['227','247'].includes(lesson.id)) lesson.prerequisites.push('079');
  if (['297','298'].includes(lesson.id)) lesson.prerequisiteAlternatives = [{label:'Advanced branch',lessons:['250']},{label:'AI branch',lessons:['290']}];
  if (lesson.id==='298') lesson.prerequisites.push('297');
}
let interviewIndex = 0;
for (const lesson of lessons.filter(l=>l.type==='assessment')) lesson.interviewId = `interview_${String(++interviewIndex).padStart(3,'0')}`;
const idsFor = ids => ids.flatMap(id=>lessons.filter(l=>l.moduleId===id).map(l=>l.id));
const range = (from,to)=>Array.from({length:to-from+1},(_,i)=>`M${String(i+from).padStart(2,'0')}`);
const manifest = {version:1,title:'System Design: From First Principles to Interview Readiness',source:{file:'System_Design_Course_Blueprint.md',sha256:crypto.createHash('sha256').update(source).digest('hex'),date:'2026-09-29'},prerequisiteInterpretation:'A required module is represented by its exit checkpoint; prior non-extension lessons are explicit within each module. This operational mapping is an authored interpretation of the source module-level skill requirements. L297–298 require either specialist branch and are omitted from the general route; they do not gate L299–300.',modules,lessons,projects,routes:{recommended:idsFor([...range(1,19),...range(26,29),...range(20,25),'M30']),numerical:lessons.map(l=>l.id),general:idsFor([...range(1,19),'M30']).filter(id=>!['297','298'].includes(id)&&lessons.find(l=>l.id===id).priority!=='extension')},checkpoints:['060','120','150','190','250','290','300'],rubric:[['requirements','Requirements and scope',10],['estimates','Workload and estimates',8],['api','API contracts',6],['data','Data modeling and ownership',10],['architecture','Coherent architecture',12],['scalability','Scalability and bottlenecks',10],['reliability','Reliability and recovery',10],['consistency','Consistency and invariant protection',10],['security','Security and isolation',6],['observability','Observability and operability',6],['tradeoffs','Alternatives and tradeoff reasoning',6],['communication','Communication, prioritization, and adaptation',6]].map(([id,label,weight])=>({id,label,weight}))};

export function validateManifest(m) {
  assert.equal(m.modules.length,30); assert.equal(m.lessons.length,300);
  assert.equal(m.lessons.filter(l=>l.type==='assessment').length,63);
  assert.equal(m.projects.length,6); assert.equal(m.lessons.filter(l=>l.project).length,24);
  assert.equal(m.lessons.reduce((sum,l)=>sum+l.minutes,0),16955);
  assert.equal(m.lessons.filter(l=>l.id<='190').reduce((sum,l)=>sum+l.minutes,0),10730);
  const all = new Map(m.lessons.map(l=>[l.id,l])); assert.equal(all.size,300);
  const moduleIds = new Set(m.modules.map(mod=>mod.id));
  for(const mod of m.modules) for(const id of mod.prerequisites) assert(moduleIds.has(id),`Unknown module dependency ${id}`);
  for(let i=0;i<300;i++) assert.equal(m.lessons[i].id,String(i+1).padStart(3,'0'));
  for(const l of m.lessons){
    assert(moduleIds.has(l.moduleId)); assert(['essential','important','extension'].includes(l.priority)); assert(l.minutes>=45&&l.minutes<=60);
    for(const id of l.prerequisites) assert(all.has(id),`Unknown dependency ${id}`);
    for(const alt of l.prerequisiteAlternatives||[]) for(const id of alt.lessons) assert(all.has(id));
    if(l.priority!=='extension') assert(!l.prerequisites.some(id=>all.get(id).priority==='extension'),`Optional extension gates ${l.id}`);
  }
  const visited = new Set(), active = new Set();
  function visit(id){assert(!active.has(id),`Prerequisite cycle at ${id}`);if(visited.has(id))return;active.add(id);for(const dep of all.get(id).prerequisites)visit(dep);active.delete(id);visited.add(id);}
  m.lessons.forEach(l=>visit(l.id));
  for(const p of m.projects){assert.equal(p.milestones.length,4);for(const mark of p.milestones){const l=all.get(mark.lessonId);assert.equal(l.project.id,p.id);assert.equal(l.project.milestone,mark.number);}}
  for(const [route,ids] of Object.entries(m.routes)){assert.equal(new Set(ids).size,ids.length);ids.forEach(id=>assert(all.has(id),`${route}: unknown lesson`));const done=new Set();for(const id of ids){for(const dep of all.get(id).prerequisites)assert(done.has(dep),`${route}: prerequisite ${dep} absent before ${id}`);done.add(id);}}
  assert(m.lessons.find(l=>l.id==='227').prerequisites.includes('079'));
  assert(m.lessons.find(l=>l.id==='247').prerequisites.includes('079'));
  const paired = m.lessons.filter(l=>/^Design .+\bI(?:\s*\/[^:]+)?:/.test(l.title)); assert.equal(paired.length,43);
  return {modules:m.modules.length,lessons:m.lessons.length,assessments:63,projects:6,milestones:24,pairedCaseStudies:paired.length,minutes:16955};
}
const report = validateManifest(manifest);
// Inspect the complete HTML catalog independently; all 300 source rows must agree.
const cells = [...html.matchAll(/<tr>\s*<td>(\d{3})<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td[^>]*>(\d+)<\/td>\s*<\/tr>/g)];
const decode = text=>text.replace(/<[^>]+>/g,'').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
assert.equal(cells.length,300);
for(const [,id,title,,minutes] of cells){const lesson=lessons.find(l=>l.id===id);assert.equal(decode(title),lesson.title);assert.equal(Number(minutes),lesson.minutes);}
fs.mkdirSync(path.join(root,'content'),{recursive:true});
if(process.argv.includes('--check')) assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'content/manifest.json'),'utf8')),manifest,'Manifest is stale; run npm run curriculum:import');
else fs.writeFileSync(path.join(root,'content/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({...report,htmlCatalogMatches:true},null,2));

