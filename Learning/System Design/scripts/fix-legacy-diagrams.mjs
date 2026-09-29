import {readFileSync,writeFileSync} from 'node:fs';
for(const id of ['041','049','086','089']){const file=`content/lessons/${id}.json`,g=JSON.parse(readFileSync(file,'utf8'));for(const d of g.diagrams||[])if(d.source.startsWith('sequenceDiagram'))d.source=d.source.replaceAll(';',',');writeFileSync(file,JSON.stringify(g,null,2)+'\n');}
console.log('Replaced sequence-message semicolons in four reference-library diagrams.');
