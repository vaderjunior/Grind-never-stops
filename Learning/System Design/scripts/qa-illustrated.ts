import {chromium,expect} from '@playwright/test';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {startServer} from '../server/index.js';
const output=resolve('artifacts/illustrated-browser');mkdirSync(output,{recursive:true});
const app=await startServer({root:resolve('.'),dataDir:mkdtempSync(resolve(output,'test-data-')),port:0,quiet:true});
const origin=`http://127.0.0.1:${app.port}`;
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...(existsSync(edge)?{executablePath:edge}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors:string[]=[],external:string[]=[],checks:string[]=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin&&!['data:','blob:'].includes(u.protocol)){external.push(u.href);return route.abort();}return route.continue();});
const ids=process.argv.length>2?process.argv.slice(2):['read-system-diagrams','http-requests-and-errors','pagination-from-scratch','numbers-bytes-and-units','choose-a-database','redis-from-scratch','partitions-and-quorums','model-serving-and-gpus'];
try{
 for(const id of ids){
  const guide=JSON.parse(readFileSync(resolve('content/guides',`${id}.json`),'utf8'));
  await page.goto(`${origin}/#guide/${id}`);
  await expect(page.getByRole('heading',{level:1,name:guide.title,exact:true})).toBeVisible();
  await expect(page.locator('.diagram-svg svg')).toHaveCount(guide.diagrams.length);
  expect(await page.locator('.guide-teaching table').count()).toBeGreaterThan(0);
  const story=page.locator('.visual-story').first(),steps=guide.walkthroughs[0].steps;
  await expect(story).toBeVisible();await expect(story.locator('.story-panel:visible')).toHaveCount(1);
  for(let i=0;i<steps.length;i++){
   await expect(story.locator('.story-panel:visible h4')).toHaveText(steps[i].title);
   for(const state of steps[i].state)await expect(story.locator('.story-panel:visible')).toContainText(state.value);
   if(i<steps.length-1)await story.getByRole('button',{name:'Next step',exact:true}).click();
  }
  await story.getByRole('button',{name:'Start again',exact:true}).click();await expect(story.locator('.story-position:visible')).toContainText('Step 1');
  const last=story.locator('.story-step-picker button').last();await last.focus();await page.keyboard.press('Space');await expect(last).toHaveAttribute('aria-pressed','true');
  await expect(story.locator('.story-position:visible')).toContainText(`Step ${steps.length}`);
  await expect(page.locator('.guide-example-answer')).toHaveCount(0);
  await story.screenshot({path:resolve(output,`${id}-walkthrough.png`)});
  await page.setViewportSize({width:390,height:844});await story.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
  await story.screenshot({path:resolve(output,`${id}-mobile.png`)});
  await page.setViewportSize({width:1440,height:1000});
  checks.push(`${id}: all diagrams, table, exact authored step states, restart, keyboard selection, hidden solutions, and mobile width passed.`);
 }
 await page.getByRole('button',{name:'Switch to dark theme',exact:true}).click();await page.locator('.visual-story').first().screenshot({path:resolve(output,'walkthrough-dark.png')});
 expect(errors).toEqual([]);expect(external).toEqual([]);
 writeFileSync(resolve(output,'report.json'),JSON.stringify({passed:true,checks,errors,externalRequests:external,scope:`${ids.length} representative chapters; all remaining diagram sources and walkthrough schemas have separate content validation.`},null,2));console.log(JSON.stringify({passed:true,checks,errors,external},null,2));
}catch(error){await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();await app.close();}
