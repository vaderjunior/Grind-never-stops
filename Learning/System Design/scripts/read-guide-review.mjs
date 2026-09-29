import {readFileSync} from 'node:fs';
for(const id of process.argv.slice(2)){
 const g=JSON.parse(readFileSync(`content/guides/${id}.json`,'utf8'));
 console.log(`\n${g.id}: ${g.title}\nTerms: ${g.terms.map(t=>`${t.term}: ${t.definition}`).join(' | ')}`);
 for(const s of g.sections)console.log(`\n${s.title}\n${s.markdown}`);
 console.log(`\nExercise: ${g.exercise.prompt}\nSolution: ${g.exercise.solution}`);
 for(const q of g.questions)console.log(`Q: ${q.prompt}\nA: ${q.answer}\n${q.explanation}`);
 console.log(`\nDiagrams:\n${g.diagrams.map(d=>d.source+'\n'+d.caption).join('\n')}`);
}
