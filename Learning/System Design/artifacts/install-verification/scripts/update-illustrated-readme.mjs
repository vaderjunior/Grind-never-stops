import fs from 'node:fs';
for(const file of ['README.md','AGENTS.md','docs/AUTHORING.md']){
 let s=fs.readFileSync(file,'utf8').replaceAll('72 authored chapters','76 authored chapters').replaceAll('72-chapter','76-chapter').replaceAll('with32 foundations','with36 foundations').replaceAll('32 foundation chapters','36 foundation chapters');
 if(file==='README.md'){
  s=s.replace('Expanded foundation and platform chapters generally contain about 1,300–1,800 words of teaching; shorter introductory and design chapters have their own focused scope.', 'The illustrative teaching pass revisited every original chapter and added four foundation workshops: reading diagrams, HTTP responses/errors, pagination, and units. Every chapter now has an interactive worked walkthrough, at least two original diagrams, and concrete example or comparison tables.');
  s=s.replace('Use **Print chapter** for the current guided lesson, then your browser\'s Save as PDF.', 'In a worked walkthrough, use **Next step** to see what changes, or choose a numbered step with the mouse or keyboard. Use **Print chapter** for the current guided lesson, then your browser\'s Save as PDF; printing includes every walkthrough step.');
  s=s.replace('npm run test:browser:learn\n','npm run test:browser:learn\nnpm run test:browser:illustrated\n');
  s=s.replace('Canonical teaching and diagrams are editable', 'See `docs/ILLUSTRATED_TEACHING.md` for the teaching approach. Canonical teaching and diagrams are editable');
 }
 if(file==='AGENTS.md')s=s.replace('Content clarity is the main deliverable;', 'Every guide now has original diagrams, concrete tables, and an authored step-through walkthrough. Preserve these illustrative teaching structures and existing assessment/card identities. Content clarity is the main deliverable;');
 if(file==='docs/AUTHORING.md')s=s.replace('Guide structural checks are `npm run validate:guides`;', 'Guide structural checks are `npm run validate:guides` and `npm run validate:illustrated`; the walkthrough schema and visual teaching rules are in [ILLUSTRATED_TEACHING.md](ILLUSTRATED_TEACHING.md);');
 fs.writeFileSync(file,s);
}
