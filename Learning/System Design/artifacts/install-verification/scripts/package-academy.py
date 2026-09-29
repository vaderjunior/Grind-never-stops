"""Bundle editable source and built assets, excluding personal data and reference clones."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib, json

root = Path(__file__).resolve().parents[1]
out = root / 'artifacts' / 'system-design-academy-source.zip'
directories = ['content', 'docs', 'labs', 'mcp', 'projects', 'public', 'scripts', 'server', 'shared', 'src', 'tests', 'dist']
top_files = ['README.md', 'AGENTS.md', 'BUILD_STATUS.md', 'QA_REPORT.md', '.gitignore', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'System_Design_Course_Blueprint.md', 'System_Design_Course_Blueprint.html']
files = [root / name for name in top_files]
for name in directories:
    files += [p for p in (root / name).rglob('*') if p.is_file()]
# Include only explicitly named non-personal QA evidence, never test databases or logs.
evidence = ['guide-validation.json','guide-review-root.json','guide-review-engine.json','guide-review-interface.json','guide-review-curriculum.json','diagram-validation.json','guide-sql-validation.json','guide-glossary-build.json','content-validation.json','bytebytego-inventory.json','awesome-reference-review.json','clean-install-report.json','python-validation.json','curriculum-worker-qa.json','client/codex-report.json','learning-browser/redis-questions.pdf','browser/module01-questions.pdf']
files += [root / 'artifacts' / name for name in evidence]
files += [root / 'artifacts' / name for name in ['illustrated-guide-validation.json','illustrated-change-audit.json','illustrated-example-validation.json','project-validation.json','refinement-foundations.json','refinement-systems.json','refinement-advanced.json']]
files += [root / 'artifacts' / sub / 'report.json' for sub in ['browser','learning-browser','illustrated-browser']]
files += [root / 'artifacts/diagram-readability' / name for name in ['report.json','controls-report.json','print-report.json']]
entries=[]
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=6) as bundle:
    for p in sorted(set(files)):
        if not p.exists() or '__pycache__' in p.parts or p.suffix.lower() in {'.pyc','.sqlite','.db','.log'} or p.name.startswith('.env'):
            continue
        rel=p.relative_to(root).as_posix()
        assert not rel.startswith(('data/','node_modules/','reference-repos/','.git/'))
        bundle.write(p,rel);entries.append(rel)
with ZipFile(out) as bundle:
    assert bundle.testzip() is None
    assert 'README.md' in bundle.namelist() and 'content/guides/redis-from-scratch.json' in bundle.namelist()
report={'path':str(out),'files':len(entries),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'excludes':['learner records','credentials','node_modules','reference-repos','test databases'],'integrity':'passed'}
(root/'artifacts/package-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
