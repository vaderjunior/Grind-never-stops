"""Record the existing reference project suite; fixtures never use learner data."""
from datetime import datetime, timezone
from pathlib import Path
import json
import os
import sys
import unittest

root = Path(__file__).resolve().parents[1]
os.environ['ACADEMY_LAB_IMPLEMENTATION'] = 'reference'
suite = unittest.defaultTestLoader.discover(str(root / 'projects/tests'))
result = unittest.TextTestRunner(verbosity=1).run(suite)
report = {
    'checkedAt': datetime.now(timezone.utc).isoformat(),
    'python': sys.version.split()[0],
    'implementation': 'reference',
    'passed': result.wasSuccessful(),
    'testsRun': result.testsRun,
    'failures': len(result.failures),
    'errors': len(result.errors),
    'skipped': len(result.skipped),
    'scope': 'Prepared local reference projects and transports using isolated fixtures; no learner records or live cloud infrastructure.',
}
(root / 'artifacts/project-validation.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
sys.exit(0 if result.wasSuccessful() else 1)
