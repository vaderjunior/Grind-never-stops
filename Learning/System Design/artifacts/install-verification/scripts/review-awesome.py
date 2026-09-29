"""Read-only reference inventory and bounded HEAD link triage. Never imports linked code."""
import ast
import concurrent.futures
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from types import SimpleNamespace
import urllib.error
import urllib.request

root=Path(__file__).resolve().parents[1]
repo=root/'reference-repos'/'awesome-system-design-resources'
text=(repo/'README.md').read_text(encoding='utf-8')
entries=[]
category='Introduction'
for line in text.splitlines():
    if line.startswith('## '): category=line.removeprefix('## ').strip()
    if line.startswith('### '): category='Interview problems / '+line.removeprefix('### ').strip()
    for label,url in re.findall(r'\[([^\]]+)\]\((https?://[^)]+)\)',line):
        entries.append({'category':category,'label':label,'url':url})

def check(entry):
    request=urllib.request.Request(entry['url'],method='HEAD',headers={'User-Agent':'AcademyReferenceReview/1.0 (bounded link availability check)'})
    try:
        with urllib.request.urlopen(request,timeout=8) as response:
            return {**entry,'status':response.status,'finalUrl':response.url,'contentType':response.headers.get('Content-Type',''),'classification':'reachable; content access not established'}
    except urllib.error.HTTPError as error:
        return {**entry,'status':error.code,'finalUrl':error.url,'classification':'not-found' if error.code in (404,410) else 'blocked-or-http-error; not evidence of missing content'}
    except Exception as error:
        return {**entry,'status':None,'error':str(error)[:250],'classification':'unverified network/timeout'}

results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for result in pool.map(check,entries): results.append(result)

files=list((repo/'implementations').rglob('*'))
python_files=[p for p in files if p.suffix=='.py']
parsed=[]
for path in python_files:
    ast.parse(path.read_text(encoding='utf-8'),filename=str(path))
    parsed.append(str(path.relative_to(repo)))

def reviewed_class(relative,name,clock=None):
    # All eleven source files were read before this run. Execute only their class/import
    # declarations; exclude top-level demos, prints and 30/60-second sleeps.
    path=repo/'implementations'/'python'/relative
    tree=ast.parse(path.read_text(encoding='utf-8'))
    tree.body=[node for node in tree.body if isinstance(node,(ast.Import,ast.ImportFrom,ast.ClassDef))]
    namespace={}
    exec(compile(tree,str(path),'exec'),namespace)
    if clock is not None:namespace['time']=SimpleNamespace(time=lambda:clock[0])
    return namespace[name]

clock=[0.]
Counter=reviewed_class(Path('rate_limiting/sliding_window_counter.py'),'SlidingWindowCounter',clock)
counter=Counter(60,5)
for _ in range(5):counter.allow_request()
clock[0]=180.
after_idle=counter.allow_request()
Bucket=reviewed_class(Path('rate_limiting/token_bucket.py'),'TokenBucket',clock)
bucket=Bucket(10,1)
negative_allowed=bucket.allow_request(-3)
Ring=reviewed_class(Path('consistent_hashing/consistent-hashing.py'),'ConsistentHashing')
ring=Ring(['a','b']);ring.add_server('a');ring.remove_server('a')
orphan_count=len(ring.sorted_keys)-len(ring.ring)
key_error=False
for i in range(1000):
    try:ring.get_server(str(i))
    except KeyError:key_error=True;break

report={'checkedAt':datetime.now(timezone.utc).isoformat(),'repository':'https://github.com/ashishps1/awesome-system-design-resources','commit':'25724090f7dd7746129b7194b55504f9d06f86ed','linkEntries':len(entries),'uniqueUrls':len({r['url'] for r in entries}),'links':results,'pythonParsed':parsed,'javaFilesRead':len([p for p in files if p.suffix=='.java']),'dynamicChecks':{'slidingCounterAfterThreeIdleWindows':{'expected':True,'actual':after_idle},'negativeTokenRequest':{'expected':'reject invalid cost','actualAllowed':negative_allowed,'tokensAfter':bucket.tokens},'duplicateHashNodeAddThenRemove':{'expectedOrphanPositions':0,'actualOrphanPositions':orphan_count,'keyErrorObserved':key_error}},'limits':['HEAD reachability does not establish free access, correct topic or complete page quality.','No Java compilation/execution performed.','No linked video was watched; video quality remains unverified.','Reference clone was not modified.']}
(root/'artifacts').mkdir(exist_ok=True)
(root/'artifacts'/'awesome-reference-review.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({k:report[k] for k in ('linkEntries','uniqueUrls','javaFilesRead','dynamicChecks')},indent=2))
print('HTTP outcomes:',{str(code):sum(r['status']==code for r in results) for code in sorted({r['status'] for r in results},key=str)})
