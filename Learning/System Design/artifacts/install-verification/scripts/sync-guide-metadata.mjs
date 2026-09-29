import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const path=JSON.parse(readFileSync('content/learning-path.json','utf8'));
for(const week of path.weeks)for(const meta of week.guides){const file=`content/guides/${meta.id}.json`;if(!existsSync(file))continue;const g=JSON.parse(readFileSync(file,'utf8'));if(g.week!==week.number||g.title!==meta.title){g.week=week.number;g.title=meta.title;writeFileSync(file,JSON.stringify(g,null,2)+'\n');}}
