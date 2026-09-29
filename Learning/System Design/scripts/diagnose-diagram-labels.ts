import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import {startServer} from '../server/index.js';
const out=resolve('artifacts/diagram-readability');mkdirSync(out,{recursive:true});
const app=await startServer({root:resolve('.'),dataDir:mkdtempSync(resolve(out,'data-')),port:0,quiet:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto(`http://127.0.0.1:${app.port}/#guide/what-is-system-design`);
 const card=page.locator('.diagram-card').filter({hasText:'Choose a part because of a user need'});
 await card.locator('svg .node').first().waitFor();
 await card.screenshot({path:resolve(out,'before.png')});
 const labels=await card.locator('foreignObject').evaluateAll(nodes=>nodes.map(node=>{
  const p=node.querySelector('p')!,div=node.querySelector('div')!;
  const style=getComputedStyle(p),r=document.createRange();r.selectNodeContents(p);
  return {text:p.textContent,foreignWidth:node.getAttribute('width'),foreignHeight:node.getAttribute('height'),paragraphWidth:p.clientWidth,paragraphScrollWidth:p.scrollWidth,paragraphHeight:p.clientHeight,paragraphScrollHeight:p.scrollHeight,font:style.font,lineHeight:style.lineHeight,whiteSpace:style.whiteSpace,divWhiteSpace:getComputedStyle(div).whiteSpace,wordsBounds:r.getBoundingClientRect().toJSON(),labelBounds:node.getBoundingClientRect().toJSON()};
 }));
 writeFileSync(resolve(out,'before.json'),JSON.stringify(labels,null,2));console.log(JSON.stringify(labels,null,2));
}finally{await browser.close();await app.close();}
