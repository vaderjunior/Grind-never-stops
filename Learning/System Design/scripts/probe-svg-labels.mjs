import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage({viewport:{width:900,height:1100}});
 await page.setContent('<main id="diagram"></main>');
 await page.addScriptTag({path:resolve('node_modules/mermaid/dist/mermaid.min.js')});
 await page.addStyleTag({path:resolve('src/styles.css')});
 const guide=JSON.parse(readFileSync('content/guides/what-is-system-design.json','utf8'));
 const config=JSON.parse(readFileSync('shared/diagram-config.json','utf8'));
 const svg=await page.evaluate(async({source,config})=>{mermaid.initialize(config);const {svg}=await mermaid.render('test-native-labels',source);document.querySelector('main').innerHTML=svg;return svg;},{source:guide.diagrams[1].source,config});
 writeFileSync('artifacts/diagram-readability/native-labels.svg',svg);
 await page.locator('main').screenshot({path:'artifacts/diagram-readability/native-labels.png'});
 console.log(JSON.stringify(await page.locator('main').evaluate(root=>({foreignObjects:root.querySelectorAll('foreignObject').length,labels:Array.from(root.querySelectorAll('text')).map(n=>({text:n.textContent,bounds:n.getBBox()}))})),null,2));
}finally{await browser.close();}
