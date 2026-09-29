import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export const tables = ['progress','notes','drafts','attempts','reviews','sessions','settings','guide_progress','guide_attempts'] as const;
export type Table = typeof tables[number];
export class Store {
  db:DatabaseSync;
  constructor(public path:string) {
    mkdirSync(dirname(path),{recursive:true});
    this.db=new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const version=Number(this.db.prepare('PRAGMA user_version').get()?.user_version);
    if(version>3) throw new Error('Learner database is newer than this application. Upgrade the application; data was not changed.');
    this.transaction(()=>{
      if(version<1) {
        for(const table of tables) this.db.exec(`CREATE TABLE ${table} (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)));`);
        this.db.exec('PRAGMA user_version=1;');
      }
      if(version<2) { this.db.exec('CREATE TABLE idempotency (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, response TEXT NOT NULL CHECK(json_valid(response))); PRAGMA user_version=2;'); }
      if(version<3) {for(const table of ['guide_progress','guide_attempts'])this.db.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)));`);this.db.exec('PRAGMA user_version=3;');}
    });
  }
  transaction<T>(fn:()=>T):T { this.db.exec('BEGIN IMMEDIATE'); try {const result=fn(); this.db.exec('COMMIT'); return result;} catch(e) {this.db.exec('ROLLBACK'); throw e;} }
  get<T=any>(table:Table,id:string):T|undefined { const row=this.db.prepare(`SELECT data FROM ${table} WHERE id=?`).get(id); return row ? JSON.parse(String(row.data)) : undefined; }
  all<T=any>(table:Table):T[] {return this.db.prepare(`SELECT data FROM ${table} ORDER BY id`).all().map(row=>JSON.parse(String(row.data)));}
  put(table:Table,id:string,data:unknown) {this.db.prepare(`INSERT INTO ${table}(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data`).run(id,JSON.stringify(data));}
  close(){this.db.close();}
}
