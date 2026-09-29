import fs from 'node:fs';
import {guide,sec,diag,source} from './guide-worker-utils.mjs';
const v=JSON.parse(fs.readFileSync('content/guides/choose-a-database.json','utf8'));
const get=id=>v.sections.find(s=>s.id===id);
const shapes=get('shapes');
const shapeParts=shapes?.markdown.split('\n\n');
const originalShapes=shapeParts?[
 sec('relational','Related records and grouped changes',shapeParts[0]),
 sec('document','A bounded nested record can be convenient',shapeParts[1]),
 sec('keyvalue','Known-key retrieval is a particular access pattern',shapeParts[2]),
 sec('overlap','Categories overlap; guarantees belong to implementations',shapeParts[3])
]:['relational','document','keyvalue','overlap'].map(get);
const constraints=sec('constraints','Write a workload card before comparing products',`
Our decision needs more than record shape. Write down the frequent questions, their filters and order, and the approximate number and size of results. Then list changes: creates, edits, deletes, and multi-record actions that must agree. A read-heavy page returning twenty small records differs from a batch job writing millions of events.

State the important failures too. How much accepted data may be lost after a crash? How quickly must the service recover? May a reader briefly see an earlier value? Who operates backups and tests restoration? These questions distinguish requirements from preferences. “Reliable” is too vague until we describe the behavior people depend on.

For Pocket Notes, the first workload card might say: list one owner’s newest twenty notes, open one permitted note, and move a note with its activity record in one database transaction. Photo content is larger and fetched separately. These are illustrative initial requirements; we would measure actual rates and sizes before sizing equipment.

Finally, include operating knowledge. A database the team can maintain, upgrade, observe, and restore can be a better starting choice than an unfamiliar product whose theoretical feature list looks ideal. This is a design constraint, not an argument against learning new tools.
`);
const ai=sec('ai','Worked choice: an AI deployment registry',`
Now transfer the method to an AI platform. A deployment runs a particular model version for a team. Operators ask: find deployment 301; list team 8’s deployments; filter failed deployments by region; and show the model version and owning team together. These are related-record lookups and filters, so a relational database is a natural candidate to evaluate.

Create a small thought experiment. Teams have team_id and name. Deployments have deployment_id, team_id, model_version_id, region, and status. Model versions have an identity and an artifact reference. A query can join those facts to answer which team owns a failed deployment. Index candidates follow the common filters; adding an index to every displayed field without a query is not the plan.

Different model types have different configuration details. A GPU deployment has accelerator settings; a CPU deployment does not. A validated JSON settings field in the same relational database might handle that variation. Nested fields alone do not require deploying a separate document store. Check how frequently those fields are filtered, changed, and validated.

The parameter files may be gigabytes, while registry records are small. Keep an artifact key and immutable version identity in the registry and retrieve verified content through a suitable file or object path. If later requirements center on extremely large event histories or multi-step dataset lineage, investigate those specific access patterns separately. This is a reason to evaluate an additional organization, not proof that every AI platform needs every database family.
`);
const verification=sec('verify','Evaluate a candidate with a small representative experiment',`
Suppose a colleague claims a different store will make owner-list queries ten times faster. Ask which data distribution, result size, index, machine, and update rate produced that claim. A benchmark fetching one repeated key does not evaluate joins, permissions, or a mixed production workload.

For a practical evaluation, load a representative sample including ordinary and unusually large owners. Run the important queries, compare returned results, and inspect their query plans where supported. Measure writes as well as reads. Test a backup restoration and the failure behavior your requirements depend on. These are proposed evaluation steps, not results already obtained in this chapter.

Migration also costs work: translating records, keeping old and new versions compatible, copying ongoing changes, verifying the new dataset, cutting over, and retaining a recovery path. A new store should solve a specific requirement strongly enough to justify those costs. Sometimes the right next action is a better query or a thumbnail, not a migration.
`);
v.sections=[get('questions'),...originalShapes,constraints,get('photos'),ai,verification,get('decision')];
v.diagrams=v.diagrams.filter(d=>d.id!=='registry');
v.diagrams.push({...diag('registry','The registry stores relationships while artifacts store large content',`flowchart LR
Q[Find team 8 failed deployments] --> D[(Deployments with team and model references)]
D --> T[(Teams)]
D --> M[(Model versions and artifact keys)]
M -.->|Retrieve only when required| A[(Versioned model artifact bytes)]`,'This teaching example separates searchable registry facts from large model content without requiring a database product for each box.',['Start with the operator’s filter question.','Find deployment rows through an appropriate access path.','Match team and model identities for the required details.','Fetch the large artifact only when an operation needs its bytes.']),sectionId:'ai'});
if(!v.sources.some(s=>s.url.includes('using-explain')))v.sources.push(source('PostgreSQL: examining query plans','https://www.postgresql.org/docs/18/using-explain.html'));
guide(v.id,v);
