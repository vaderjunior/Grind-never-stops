import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const checks=[],db=new DatabaseSync(':memory:');
try{
 db.exec('CREATE TABLE notes(id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL, title TEXT NOT NULL)');
 for(const id of [60,50,40,30,20,10])db.prepare('INSERT INTO notes VALUES(?,7,?)').run(id,`Note ${id}`);
 const guide=JSON.parse(fs.readFileSync('content/guides/pagination-from-scratch.json','utf8'));
 const sql=guide.sections.find(s=>s.id==='cursor').markdown.match(/```sql\n([\s\S]*?)\n```/)[1];
 assert.deepEqual(db.prepare(sql).all().map(r=>r.id),[40,30]);checks.push('Authored pagination SQL returns 40,30 before insertion.');
 db.exec("INSERT INTO notes VALUES(70,7,'New note')");
 assert.deepEqual(db.prepare(sql).all().map(r=>r.id),[40,30]);assert.deepEqual(db.prepare('SELECT id FROM notes WHERE owner_id=7 ORDER BY id DESC LIMIT 2 OFFSET 2').all().map(r=>r.id),[50,40]);checks.push('Inserted70 produces the documented offset duplicate while keyset remains 40,30.');
 db.exec('DELETE FROM notes');for(const id of [90,80,70,60,50])db.prepare('INSERT INTO notes VALUES(?,7,?)').run(id,`Note ${id}`);db.exec('DELETE FROM notes WHERE id=90');
 assert.deepEqual(db.prepare('SELECT id FROM notes ORDER BY id DESC LIMIT 2 OFFSET 2').all().map(r=>r.id),[60,50]);assert.deepEqual(db.prepare('SELECT id FROM notes WHERE id<80 ORDER BY id DESC LIMIT 2').all().map(r=>r.id),[70,60]);checks.push('Pagination exercise deletion produces offset60,50 and keyset70,60.');
 assert.equal(6000/(100/8),480);assert.equal(480/60,8);checks.push('6GB / 100Mbit/s ideal transfer is480seconds=8minutes.');
 assert.equal(50*2*8,800);checks.push('50uploads/s×2MB=800Mbit/s payload.');
 assert.equal(1000*500*86400*30/1e12,1.296);assert.equal(1000*500*86400*30*3/1e12,3.888);checks.push('30day telemetry payload and three copies are1.296TB and3.888TB.');
 assert.equal(400*25/1000,10);assert.equal(400*25/1000*8,80);checks.push('Units exercise gives10MB/s=80Mbit/s.');
}finally{db.close();}
const report={checkedAt:new Date().toISOString(),passed:true,checks,limitations:['SQLite executes the portable SQL example; this does not test a live PostgreSQL query planner.','Rate calculations validate stated assumptions, not real infrastructure capacity.']};fs.writeFileSync('artifacts/illustrated-example-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
