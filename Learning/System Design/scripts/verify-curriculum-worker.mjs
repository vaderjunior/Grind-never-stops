import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const python=process.env.ACADEMY_PYTHON||'C:/Users/ajayt/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const version=spawnSync(python,['--version'],{encoding:'utf8',windowsHide:true});
if(version.status!==0)throw Error('Set ACADEMY_PYTHON to a Python 3.11+ executable.');
const output=path.join(root,'artifacts/curriculum-examples');fs.mkdirSync(output,{recursive:true});
const results=[];
for(const id of ['004','006','007','008','021','022','024']){
 const file=path.join(root,`content/lessons/${id}.json`);const raw=fs.readFileSync(file,'utf8');const lesson=JSON.parse(raw);let count=0;
 for(const section of lesson.sections)for(const match of section.markdown.matchAll(/~~~python\s*\n([\s\S]*?)~~~/g)){
  const target=path.join(output,`${id}-${++count}.py`);fs.writeFileSync(target,match[1]);
  const run=spawnSync(python,[target],{encoding:'utf8',timeout:10000,windowsHide:true,cwd:root});
  results.push({kind:'executable-example',lessonId:id,sha256:createHash('sha256').update(raw).digest('hex'),sectionId:section.id,ok:run.status===0,stdout:run.stdout,stderr:run.stderr,status:run.status});
 }
}
for(const [label,args] of [
 ['runtime-harness',['-m','unittest','discover','-s','labs/runtime-harness','-v']],
 ['relational-sqlite',['-m','unittest','discover','-s','labs/relational','-v']],
 ['P1.1-reference',['projects/tests/test_projects.py','Labs.test_P1_1_L039_persistence_collision_and_redirect','-v']]
]){const run=spawnSync(python,args,{encoding:'utf8',timeout:20000,windowsHide:true,cwd:root,env:{...process.env,ACADEMY_LAB_IMPLEMENTATION:'reference'}});results.push({kind:'lab',label,args,ok:run.status===0,stdout:run.stdout,stderr:run.stderr,status:run.status});}
const report={date:new Date().toISOString(),python:version.stdout.trim(),results,limits:['SQLite tests do not establish PostgreSQL isolation, row-lock, or planner behavior.','Runtime harness state is process-local and in-memory.','P1.1 reference test reopens the same database file; it is not a disk-loss or power-loss test.','This record is execution evidence, not independent pedagogical review or complete application acceptance.']};
fs.writeFileSync(path.join(root,'artifacts/curriculum-worker-qa.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({python:report.python,checks:results.length,passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).map(r=>r.lessonId||r.label)},null,2));
if(results.some(r=>!r.ok))process.exitCode=1;
