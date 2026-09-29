import {chromium,expect} from '@playwright/test';
import {mkdirSync,mkdtempSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {startServer} from '../server/index.js';

const output=resolve('artifacts/diagram-readability');mkdirSync(output,{recursive:true});
const app=await startServer({root:resolve('.'),dataDir:mkdtempSync(resolve(output,'data-')),port:0,quiet:true,dev:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors:string[]=[],results:any[]=[];
page.on('pageerror',error=>errors.push(error.message));
const fixtures=['content/guides','content/lessons'].flatMap(dir=>readdirSync(dir).filter(f=>f.endsWith('.json')).flatMap(file=>{const lesson=JSON.parse(readFileSync(`${dir}/${file}`,'utf8'));return (lesson.diagrams||[]).map((diagram:any)=>({lessonId:lesson.id,diagram,sourceHash:createHash('sha256').update(diagram.source).digest('hex')}));}));
const selection=process.argv.slice(2),selected=selection.length?fixtures.filter(f=>selection.includes(f.lessonId)):fixtures;
async function inspect(){return page.locator('.diagram-card').evaluate(card=>{
 const svg=card.querySelector('.diagram-svg>svg') as SVGSVGElement;
 const outer=svg.getBoundingClientRect(),problems:any[]=[];
 const labels=Array.from(svg.querySelectorAll('text')).filter(text=>text.textContent?.trim());
 let smallestFont=Infinity;
 for(const label of labels){
  const box=label.getBoundingClientRect(),style=getComputedStyle(label),matrix=label.getScreenCTM();
  const font=parseFloat(style.fontSize)*(matrix?Math.hypot(matrix.a,matrix.b):1);smallestFont=Math.min(smallestFont,font);
  const text=label.textContent;
  if(box.left<outer.left-2||box.right>outer.right+2||box.top<outer.top-2||box.bottom>outer.bottom+2)problems.push({kind:'outside-svg',text});
  if(font<12)problems.push({kind:'small-label',font,text});
  let element:Element|null=label,opacity=1;while(element&&element!==svg){opacity*=Number(getComputedStyle(element).opacity);element=element.parentElement;}
  if(opacity<.6||style.visibility==='hidden'||style.display==='none'||style.fill==='none'||style.fill==='transparent')problems.push({kind:'invisible-label',text,opacity});
  const node=label.closest('.node'),shape=node?.querySelector(':scope > .label-container');
  if(shape){const bounds=shape.getBoundingClientRect();if(box.left<bounds.left-2||box.right>bounds.right+2||box.top<bounds.top-2||box.bottom>bounds.bottom+2)problems.push({kind:'outside-node',text});}
 }
 if(svg.querySelector('foreignObject'))problems.push({kind:'html-label'});
 if(document.documentElement.scrollWidth>innerWidth+2)problems.push({kind:'page-overflow'});
 const canvas=card.querySelector('.diagram-canvas') as HTMLElement;
 return {labels:labels.length,smallestFont:Math.round(smallestFont*100)/100,problems,panNeeded:canvas.scrollWidth>canvas.clientWidth+2||canvas.scrollHeight>canvas.clientHeight+2};
});}
try{
 await page.goto(`http://127.0.0.1:${app.port}/scripts/diagram-gallery.html`);
 await page.waitForFunction(()=>typeof (window as any).showDiagram==='function');
 for(const fixture of selected){
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(diagram=>{document.documentElement.dataset.theme='light';(window as any).showDiagram(diagram);},fixture.diagram);
  const card=page.locator('.diagram-card');await expect(card).toHaveAttribute('aria-label',fixture.diagram.title);await expect(card).toHaveAttribute('data-rendered','true');
  const desktop=await inspect();
  await card.screenshot({path:resolve(output,`${fixture.lessonId}-${fixture.diagram.id}-desktop.png`)});
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');const dark=await inspect();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.locator('.diagram-canvas').evaluate(el=>el.clientWidth)).toBeLessThan(390);
  const mobileDark=await inspect();
  await page.evaluate(()=>document.documentElement.dataset.theme='light');const mobile=await inspect();
  await card.locator('.diagram-text summary').click();
  await expect(card.locator('.diagram-text')).toHaveAttribute('open','');
  const textVersionLabels=await card.locator('.diagram-text ul li').count();
  expect(textVersionLabels).toBeGreaterThan(0);
  if(['what-is-system-design','measure-before-scaling','transactions-and-correctness','design-notifications','partitions-and-quorums','072'].includes(fixture.lessonId))await card.screenshot({path:resolve(output,`${fixture.lessonId}-${fixture.diagram.id}-mobile.png`)});
  // Actual active-edge/node mappings must not dim their unselected labels away.
  const mapped=(fixture.diagram.steps||[]).some((step:any)=>step.activeEdges||step.activeNodes);
  let narrated:any=null;
  if(mapped){await card.locator('.diagram-text summary').click();await card.getByRole('button',{name:'Next step',exact:true}).click();narrated=await inspect();}
  results.push({lessonId:fixture.lessonId,diagramId:fixture.diagram.id,sourceHash:fixture.sourceHash,desktop,dark,mobile,mobileDark,textVersionLabels,narrated});
  if(results.length%30===0)console.log(`Checked ${results.length}/${selected.length} diagrams.`);
 }
 const failed=results.filter(result=>['desktop','dark','mobile','mobileDark','narrated'].some(key=>result[key]?.problems.length));
 const report={checkedAt:new Date().toISOString(),total:results.length,failed:failed.length,errors,passed:failed.length===0&&errors.length===0,scenarios:['desktop light','desktop dark','390px light','390px dark','text alternative','authored highlighting when present'],results};
 writeFileSync(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({total:results.length,failed:failed.map(r=>({lessonId:r.lessonId,diagramId:r.diagramId,desktop:r.desktop.problems,mobile:r.mobile.problems,narrated:r.narrated?.problems})),errors},null,2));
 if(!report.passed)process.exitCode=1;
}finally{await browser.close();await app.close();}
