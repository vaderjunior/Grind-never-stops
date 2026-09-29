import fs from 'node:fs';
export {sec,diag,choice,open,cards} from './lesson-authoring.mjs';
const pathway=JSON.parse(fs.readFileSync('content/learning-path.json','utf8'));
export const terms=pairs=>pairs.map(([term,definition])=>({term,definition}));
export const source=(title,url)=>({title,url,checked:'2026-09-29'});
export function guide(id,body){
 const week=pathway.weeks.find(w=>w.guides.some(g=>g.id===id));
 if(!week)throw new Error('Unknown guide '+id);
 const title=week.guides.find(g=>g.id===id).title;
 const placement={'databases-and-sql':'rows','find-data-with-indexes':'lookup','transactions-and-correctness':'commit','choose-a-database':'photos','measure-before-scaling':'trace','cache-freshness-and-cdns':'nearby'};
 const value={id,title,version:1,week:week.number,level:'beginner',minutes:45,status:'drafted',authoredBy:'original',...body,diagrams:body.diagrams.map(d=>({...d,sectionId:d.sectionId??placement[id]??body.sections[1].id}))};
 fs.mkdirSync('content/guides',{recursive:true});
 fs.writeFileSync(`content/guides/${id}.json`,JSON.stringify(value,null,2)+'\n');
 console.log(id,body.sections.reduce((n,s)=>n+s.markdown.split(/\s+/).length,0),'body words');
}
