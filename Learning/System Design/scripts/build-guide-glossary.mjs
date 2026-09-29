import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const path=JSON.parse(fs.readFileSync('content/learning-path.json','utf8'));
const planned=path.weeks.flatMap(week=>week.guides);
assert.equal(planned.length,76,'Expected the complete 76-guide learning path.');
const guides=planned.map(meta=>{
 const file=`content/guides/${meta.id}.json`;
 assert(fs.existsSync(file),`Missing guide: ${meta.id}`);
 const guide=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(guide.id,meta.id);
 assert(Array.isArray(guide.terms),`Missing terms: ${meta.id}`);
 return {...guide,title:meta.title};
});
const output='content/glossary.json';
const legacyFile='content/reference-glossary.json';
// Preserve the original reference glossary once. Rebuilding never replaces it
// with an already merged glossary and never mutates its entries.
if(!fs.existsSync(legacyFile))fs.copyFileSync(output,legacyFile);
const legacyRaw=fs.readFileSync(legacyFile,'utf8');
const legacy=JSON.parse(legacyRaw);
assert(Array.isArray(legacy),'Expected an array in the saved reference glossary.');
const key=term=>term.trim().normalize('NFC').toLocaleLowerCase('en-US');
const entries=[],seen=new Map(),duplicates=[];
for(const guide of guides){
 for(const [index,item]of guide.terms.entries()){
  assert(typeof item.term==='string'&&item.term.trim(),`Empty term in ${guide.id}`);
  assert(typeof item.definition==='string'&&item.definition.trim(),`Empty definition for ${item.term}`);
  const normalized=key(item.term);
  if(seen.has(normalized)){
   const first=seen.get(normalized);
   duplicates.push({term:item.term,preferredGuideId:first.guideId,otherGuideId:guide.id,preferredDefinition:first.definition,otherDefinition:item.definition});
   continue;
  }
  const entry={id:`guide-${guide.id}-${index+1}`,term:item.term.trim(),definition:item.definition.trim(),guideId:guide.id,guideTitle:guide.title};
  entries.push(entry);seen.set(normalized,entry);
 }
}
const guideTerms=entries.length;
for(const entry of legacy){
 assert(typeof entry.term==='string'&&typeof entry.definition==='string');
 const normalized=key(entry.term);
 if(!seen.has(normalized)){entries.push(entry);seen.set(normalized,entry);}
}
assert.equal(new Set(entries.map(e=>key(e.term))).size,entries.length);
assert.equal(new Set(entries.map(e=>e.id)).size,entries.length,'Glossary ids must be unique.');
fs.writeFileSync(output,JSON.stringify(entries,null,2)+'\n');
const report={generatedAt:new Date().toISOString(),guides:guides.length,guideTerms,legacyTerms:legacy.length,legacyUniqueRetained:entries.length-guideTerms,total:entries.length,legacySha256:createHash('sha256').update(legacyRaw).digest('hex'),rule:'Case-insensitive exact term match; earliest guide in path order wins. Distinct variants remain distinct. Unique legacy entries remain unchanged.',duplicateGuideTerms:duplicates};
fs.writeFileSync('artifacts/guide-glossary-build.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({guides:report.guides,guideTerms,total:report.total,legacyUniqueRetained:report.legacyUniqueRetained,duplicates:duplicates.length},null,2));
