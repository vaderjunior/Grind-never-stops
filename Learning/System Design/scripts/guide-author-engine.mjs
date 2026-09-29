import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const path=JSON.parse(readFileSync('content/learning-path.json','utf8'));
export const choice=(id,prompt,options,answer,explanation)=>({id,type:'choice',prompt,options,answer,explanation});
export const number=(id,prompt,answer,unit,explanation,tolerance=0)=>({id,type:'numeric',prompt,answer,unit,tolerance,explanation});
export const open=(id,prompt,answer)=>({id,type:'open',prompt,answer,explanation:'Self-assess against this reasoning. A written response has no automatic design score.'});
export const section=(id,title,markdown)=>({id,title,markdown});
export const diagram=(id,sectionId,title,source,steps,caption='Original teaching diagram. Each arrow has a specific responsibility; deployment details are deliberately bounded.')=>({id,sectionId,title,source,steps,caption});
export function guide(id,data){
 const {wordRange=[700,1150],...body}=data;
 const week=path.weeks.find(w=>w.guides.some(g=>g.id===id));if(!week)throw new Error(id);
 const meta=week.guides.find(g=>g.id===id);
 const value={id,title:meta.title,version:1,status:'drafted',authoredBy:'original',week:week.number,level:week.number<5?'beginner':week.number<15?'intermediate':'interview',minutes:45,...body,terms:data.terms.map(([term,definition])=>({term,definition})),flashcards:data.flashcards.map(([front,back])=>({front,back})),sources:data.sources.map(([title,url])=>({title,url,checked:'2026-09-29'}))};
 const words=value.sections.map(s=>s.markdown).join(' ').split(/\s+/).length;
 if(words<wordRange[0]||words>wordRange[1])throw new Error(`${id}: body ${words} words outside authoring bounds`);
 if(value.questions.filter(q=>q.type!=='open').length!==3||value.questions.filter(q=>q.type==='open').length!==2||value.flashcards.length!==5)throw new Error(`${id}: assessment shape`);
 mkdirSync('content/guides',{recursive:true});writeFileSync(`content/guides/${id}.json`,JSON.stringify(value,null,2)+'\n');console.log(`${id}: ${words} words`);
}
