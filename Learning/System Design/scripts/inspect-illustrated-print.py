from pathlib import Path
from pypdf import PdfReader
p=Path('artifacts/learning-browser/redis-questions.pdf')
r=PdfReader(p)
print('Pages:',len(r.pages))
for i,page in enumerate(r.pages):
 t=page.extract_text() or ''
 print(i+1,len(t), 'WALKTHROUGH' if 'WORK THROUGH' in t else '', t[:70].replace('\n',' '))
