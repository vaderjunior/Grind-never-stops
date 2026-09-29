import {readFileSync,writeFileSync} from 'node:fs';
let p='src/App.tsx',s=readFileSync(p,'utf8');s=s.replace("entry.guideId?'Read the beginner explanation':", "entry.guideId?`Read: ${entry.guideTitle||'beginner explanation'}`:");writeFileSync(p,s);
p='scripts/qa-learning.ts';s=readFileSync(p,'utf8');s=s.replace("await page.screenshot({path:resolve(out,'redis-print.png'),fullPage:true});", "await page.screenshot({path:resolve(out,'redis-print.png'),fullPage:true});await page.pdf({path:resolve(out,'redis-questions.pdf'),format:'A4',printBackground:true});");writeFileSync(p,s);
