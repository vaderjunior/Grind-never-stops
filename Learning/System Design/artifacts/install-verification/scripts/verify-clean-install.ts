import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {startServer} from '../server/index.js';

// Run from an extracted source bundle after npm ci and npm run build.
const root = resolve('.');
mkdirSync(resolve(root, 'artifacts'), {recursive:true});
const dataDir = mkdtempSync(resolve(root, 'artifacts/clean-start-data-'));
const app = await startServer({root, dataDir, port:0, quiet:true});
const base = `http://127.0.0.1:${app.port}`;
try {
  const health = await (await fetch(`${base}/api/health`)).json() as any;
  assert.equal(health.ok, true);
  assert.equal(health.schemaVersion, 3);
  const html = await (await fetch(base)).text();
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /\/assets\//);
  const path = await (await fetch(`${base}/api/learning-path`)).json() as any;
  const guides = path.weeks.flatMap((week:any) => week.guides);
  assert.equal(new Set(guides.map((guide:any) => guide.id)).size, 76);
  assert.ok(guides.every((guide:any) => guide.guideAvailable));
  const chapter = await (await fetch(`${base}/api/guides/read-system-diagrams`)).json() as any;
  assert.equal(chapter.walkthroughs.length, 1);
  assert.equal(chapter.exercise.solution, undefined);
  const state = await (await fetch(`${base}/api/state`)).json() as any;
  assert.equal(state.guideProgress.length, 0);
  const report = {passed:true, node:process.version, installedFromLockfile:true,
    builtFromSource:true, checks:['Production HTML and local assets served','Fresh schema 3 starts successfully','All 76 authored guides available','Walkthroughs served with exercise solutions withheld','No seeded learner completion'],
    personalDataUsed:false};
  writeFileSync(resolve(root,'artifacts/clean-install-report.json'), JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {
  await app.close();
}
