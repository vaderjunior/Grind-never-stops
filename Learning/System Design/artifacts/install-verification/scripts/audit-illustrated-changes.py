"""Compare this refinement with the preserved source bundle; never open learner data."""
from pathlib import Path
from zipfile import ZipFile
import hashlib, json, re
root=Path(__file__).resolve().parents[1]
path=json.loads((root/'content/learning-path.json').read_text(encoding='utf-8'))
protected=('questions','flashcards','exercise')
records=[]
with ZipFile(root/'artifacts/academy-before-illustrated-refinement.zip') as baseline:
    names=set(baseline.namelist())
    for meta in [g for week in path['weeks'] for g in week['guides']]:
        rel=f"content/guides/{meta['id']}.json"
        raw=(root/rel).read_bytes(); current=json.loads(raw)
        old=json.loads(baseline.read(rel)) if rel in names else None
        text='\n\n'.join(s['markdown'] for s in current['sections'])
        records.append({'id':current['id'],'newChapter':old is None,
          'teachingChanged':old is None or old['sections']!=current['sections'],
          'assessmentPreserved':old is None or all(old.get(k)==current.get(k) for k in protected),
          'beforeDiagrams':len(old.get('diagrams',[])) if old else 0,'diagrams':len(current.get('diagrams',[])),
          'walkthroughs':len(current.get('walkthroughs',[])),
          'sha256':hashlib.sha256(raw).hexdigest()})
report={'chapters':len(records),'existingChaptersRefined':sum(not r['newChapter'] and r['teachingChanged'] for r in records),
  'newChapters':sum(r['newChapter'] for r in records),'assessmentChanges':[r['id'] for r in records if not r['assessmentPreserved']],
  'previousGuideDiagrams':sum(r['beforeDiagrams'] for r in records),'guideDiagrams':sum(r['diagrams'] for r in records),
  'walkthroughs':sum(r['walkthroughs'] for r in records),'records':records,
  'scope':'Exact content comparison with the previous delivered bundle; no learner database was accessed.'}
(root/'artifacts/illustrated-change-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='records'},indent=2))
assert report['existingChaptersRefined']==72 and report['newChapters']==4
assert report['assessmentChanges']==[], 'Existing learner-facing assessment contracts changed; review required.'
