import fs from 'node:fs';
import path from 'node:path';
export const content=path.resolve(import.meta.dirname,'../content');
export const sec=(id,title,markdown)=>({id,title,markdown:markdown.trim()});
export const diag=(id,title,source,caption,steps)=>({id,title,source,caption,steps});
export const choice=(id,prompt,options,answer,explanation)=>({id,type:'choice',prompt,options,answer,explanation});
export const num=(id,prompt,answer,unit,tolerance,explanation)=>({id,type:'numeric',prompt,answer,unit,tolerance,explanation});
export const open=(id,prompt,answer,explanation)=>({id,type:'open',prompt,answer,explanation});
export const cards=pairs=>pairs.map(([front,back])=>({front,back}));
export function save(id,body){fs.writeFileSync(path.join(content,'lessons',`${id}.json`),JSON.stringify({id,version:1,status:'drafted',authoredBy:'original',...body,sources:body.sources.map(s=>({...s,checked:'2026-09-29'}))},null,2)+'\n');}
