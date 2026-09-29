import fs from 'node:fs';
const file='scripts/build-learning-path.mjs';let s=fs.readFileSync(file,'utf8');const marker="const resources=existsSync('content/curated-resources.json')";if(!s.includes(marker))throw Error('missing marker');
s=s.replace(marker,`// Added after an illustrative-teaching review; keep existing IDs and learner progress stable.
const newFoundations=[
 [1,'what-is-system-design','read-system-diagrams'],
 [2,'connection-and-protocol-basics','http-requests-and-errors'],
 [3,'find-data-with-indexes','pagination-from-scratch'],
 [5,null,'numbers-bytes-and-units']
];
for(const [number,after,id] of newFoundations){
 const week=records.find(w=>w.number===number),g=JSON.parse(readFileSync(\`content/guides/\${id}.json\`,'utf8'));
 const guideIndex=after?week.guides.findIndex(meta=>meta.id===after)+1:0;
 week.guides.splice(guideIndex,0,{id:g.id,title:g.title});
 const dayIndex=after?week.days.findIndex(day=>day.guideId===after)+1:0;
 week.days.splice(dayIndex,0,{day:0,title:g.title,kind:'learn',guideId:g.id,lessonIds:[],outcome:g.summary,minutes:g.minutes,resourceIds:[]},{day:0,title:'Trace the example, then try your own',kind:'practice',guideId:g.id,focus:'practice',lessonIds:[],outcome:'Explain what changes at each step. Try the small exercise before comparing with its worked solution.',minutes:15,resourceIds:[]});
 week.days.forEach((day,i)=>day.day=i+1);
}
`+marker);
s=s.replace('const path={version:2','const path={version:3').replace('contain 32 foundation chapters','contain 36 foundation chapters').replace('Foundation and platform weeks contain seven study steps, which you can spread across the week or combine into longer sessions every two days. Other weeks contain five steps.', 'Weeks contain five to nine study steps. Spread them across the week or combine them into longer sessions every two days. Some foundation weeks include an extra visual workshop.');fs.writeFileSync(file,s);
const validator='scripts/validate-guides.mjs';s=fs.readFileSync(validator,'utf8');s=s.replace("assert.equal(path.weeks.flatMap(w=>w.days).length,144);", "assert.equal(path.weeks.flatMap(w=>w.days).length,152);");s=s.replace('assert([2,4].includes(week.guides.length));assert.equal(week.days.length,week.guides.length===4?7:5);','assert([2,4,5].includes(week.guides.length));assert.equal(week.days.length,week.guides.length===5?9:week.guides.length===4?7:5);');s=s.replace('assert.equal(ids.size,72)','assert.equal(ids.size,76)').replace('planned:72,authored:72-missing.length','planned:76,authored:76-missing.length').replace('JSON.stringify({planned:72,','JSON.stringify({planned:76,');fs.writeFileSync(validator,s);
const glossary='scripts/build-guide-glossary.mjs';s=fs.readFileSync(glossary,'utf8').replace("assert.equal(planned.length,72,'Expected the complete 72-guide learning path.');","assert.equal(planned.length,76,'Expected the complete 76-guide learning path.');");fs.writeFileSync(glossary,s);
const clean='scripts/verify-clean-install.ts';s=fs.readFileSync(clean,'utf8').replace('size, 72','size, 76').replace('All 72 authored','All 76 authored');fs.writeFileSync(clean,s);
const qa='scripts/qa-learning.ts';s=fs.readFileSync(qa,'utf8').replaceAll('toHaveCount(1);checks.push(\'First chapter','toHaveCount(2);checks.push(\'First chapter').replaceAll("'#guide/computer-and-server-basics'", "'#guide/read-system-diagrams'").replaceAll('1 of 72','1 of 76').replaceAll("await expect(page.locator('.diagram-svg svg')).toHaveCount(1);await shot('guide-mobile')","await expect(page.locator('.diagram-svg svg')).toHaveCount(2);await shot('guide-mobile')");fs.writeFileSync(qa,s);
