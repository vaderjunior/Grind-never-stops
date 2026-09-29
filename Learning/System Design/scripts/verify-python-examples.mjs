import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const bundled='C:/Users/ajayt/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const python=process.env.ACADEMY_PYTHON||(existsSync(bundled)?bundled:'python');
const version=spawnSync(python,['--version'],{encoding:'utf8',windowsHide:true});
if(version.error||version.status!==0)throw Error('Python 3.11+ required. Set ACADEMY_PYTHON to its executable path.');
const out=resolve('artifacts/python-examples');mkdirSync(out,{recursive:true});const results=[];
for(const file of readdirSync('content/lessons').filter(f=>/^00[4678]\.json$/.test(f))){
 const l=JSON.parse(readFileSync(`content/lessons/${file}`,'utf8'));let index=0;
 for(const s of l.sections)for(const match of s.markdown.matchAll(/(?:~~~|```)python\s*\n([\s\S]*?)(?:~~~|```)/g)){
  const script=resolve(out,`${l.id}-${++index}.py`);writeFileSync(script,match[1]);
  const r=spawnSync(python,[script],{encoding:'utf8',timeout:10000,windowsHide:true});results.push({lessonId:l.id,sectionId:s.id,ok:r.status===0,stdout:r.stdout,stderr:r.stderr,exitCode:r.status});
 }
}
const report={python:version.stdout.trim(),results};writeFileSync('artifacts/python-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(results.some(r=>!r.ok))process.exitCode=1;
