import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve('artifacts/interface-guides');mkdirSync(out,{recursive:true});
const entries=JSON.parse(readFileSync(resolve(out,'content-check.json'),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1400,height:1000}});
const results=[];let sequence=0;
try{
 await page.setContent('<!doctype html><html><body><main id="diagram"></main></body></html>');
 await page.addScriptTag({path:resolve('node_modules/mermaid/dist/mermaid.min.js')});
 await page.evaluate(()=>globalThis.mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'base',themeVariables:{primaryColor:'#e5ecdf',primaryTextColor:'#153b35',primaryBorderColor:'#5b8070',lineColor:'#587367',fontFamily:'Arial'},flowchart:{htmlLabels:false}}));
 for(const entry of entries){const guide=JSON.parse(readFileSync(`content/guides/${entry.id}.json`,'utf8'));for(const diagram of guide.diagrams){try{const svg=await page.evaluate(async({source,id})=>{const rendered=await globalThis.mermaid.render(id,source);document.getElementById('diagram').innerHTML=rendered.svg;return rendered.svg;},{source:diagram.source,id:`interface-guide-${++sequence}`});writeFileSync(resolve(out,`${guide.id}-${diagram.id}.svg`),svg);await page.locator('#diagram').screenshot({path:resolve(out,`${guide.id}-${diagram.id}.png`)});results.push({guideId:guide.id,diagramId:diagram.id,ok:true});}catch(error){results.push({guideId:guide.id,diagramId:diagram.id,ok:false,error:String(error)});}}}
}finally{await browser.close();}
const report={total:results.length,failed:results.filter(result=>!result.ok).length,results};writeFileSync(resolve(out,'diagram-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({total:report.total,failed:report.failed,errors:results.filter(result=>!result.ok)},null,2));if(report.failed)process.exitCode=1;
