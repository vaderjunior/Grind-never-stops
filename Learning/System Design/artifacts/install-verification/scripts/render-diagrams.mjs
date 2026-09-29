import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {diagramConfig,prepareDiagramSource} from '../shared/diagrams.ts';
const out=resolve('artifacts/diagrams');mkdirSync(out,{recursive:true});
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...(existsSync(edge)?{executablePath:edge}:{})});
const page=await browser.newPage({viewport:{width:1400,height:1000}});
await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body><main id="diagram"></main></body></html>');
await page.addScriptTag({path:resolve('node_modules/mermaid/dist/mermaid.min.js')});
await page.evaluate(config=>globalThis.mermaid.initialize(config),diagramConfig);
const configurationHash=createHash('sha256').update(JSON.stringify(diagramConfig)+prepareDiagramSource.toString()).digest('hex');
const results=[];let seq=0;
const previous=process.argv.includes('--changed')&&existsSync('artifacts/diagram-validation.json')?JSON.parse(readFileSync('artifacts/diagram-validation.json','utf8')).results:[];
try{
 const directories=process.argv.includes('--guides')?['content/guides']:['content/lessons','content/guides'];
 for(const file of directories.flatMap(directory=>existsSync(directory)?readdirSync(directory).filter(f=>f.endsWith('.json')).map(f=>`${directory}/${f}`):[]).sort()){
  const l=JSON.parse(readFileSync(file,'utf8'));
  for(const d of l.diagrams||[]){
   const sourceHash=createHash('sha256').update(d.source).digest('hex');
   const prior=previous.find(r=>r.lessonId===l.id&&r.diagramId===d.id&&r.sourceHash===sourceHash&&r.configurationHash===configurationHash&&r.ok);
   if(prior&&existsSync(resolve(out,`${l.id}-${d.id}.svg`))){results.push(prior);continue;}
   try{
    const svg=await page.evaluate(async({source,id})=>{const result=await globalThis.mermaid.render(id,source);document.getElementById('diagram').innerHTML=result.svg;return result.svg;},{source:prepareDiagramSource(d.source),id:`qa-${++seq}`});
    if(!svg.includes('<svg'))throw Error('Renderer returned no SVG');
    writeFileSync(resolve(out,`${l.id}-${d.id}.svg`),svg);
    await page.locator('#diagram').screenshot({path:resolve(out,`${l.id}-${d.id}.png`)});
    results.push({lessonId:l.id,diagramId:d.id,sourceHash,configurationHash,ok:true,svg:`artifacts/diagrams/${l.id}-${d.id}.svg`});
   }catch(e){results.push({lessonId:l.id,diagramId:d.id,sourceHash,ok:false,error:String(e)});}
  }
 }
}finally{await browser.close();}
const report={generatedAt:new Date().toISOString(),renderer:JSON.parse(readFileSync('node_modules/mermaid/package.json','utf8')).version,total:results.length,failed:results.filter(r=>!r.ok).length,results};
writeFileSync('artifacts/diagram-validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,failed:report.failed,errors:results.filter(r=>!r.ok)},null,2));if(report.failed)process.exitCode=1;
