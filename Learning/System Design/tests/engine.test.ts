import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { request } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Engine, CourseError } from '../server/engine.js';
import { Store, tables } from '../server/database.js';
import { startServer } from '../server/index.js';

function fixture(){
  const root=mkdtempSync(join(tmpdir(),'academy-test-'));mkdirSync(join(root,'content','lessons'),{recursive:true});mkdirSync(join(root,'content','interviews'),{recursive:true});
  const meta={id:'001',moduleId:'M01',title:'Bounded queues',priority:'essential',depth:'B',minutes:45,type:'teaching',prerequisites:[]};
  writeFileSync(join(root,'content','manifest.json'),JSON.stringify({version:1,modules:[{id:'M01',title:'Foundations',prerequisites:[],exitSkill:'Reason about capacity'}],lessons:[meta,{...meta,id:'002',title:'Unpublished',prerequisites:['001']}],projects:[],routes:{recommended:['M01'],numerical:['M01'],general:['M01']}}));
  writeFileSync(join(root,'content','lessons','001.json'),JSON.stringify({id:'001',version:'1.0.0',status:'validated',objectives:['Bound the waiting room'],retrieval:[],sections:[{id:'queue',title:'Queue buildup',markdown:'At 120 requests/s and service capacity 100 requests/s, queue backlog grows by 20 requests each second.'}],diagrams:[],exercise:{prompt:'Bound the queue',minutes:5,rubric:['State assumptions'],solution:'secret exercise solution'},questions:[{id:'choice',type:'choice',prompt:'When arrival exceeds capacity?',options:['queue grows','queue shrinks'],answer:'queue grows',explanation:'secret explanation: excess arrival accumulates'}, {id:'numeric',type:'numeric',prompt:'Backlog growth requests/s?',answer:20,tolerance:1,unit:'requests/s',explanation:'120 - 100 = 20'}, {id:'choice2',type:'choice',prompt:'What limits waiting memory?',options:['bounded queue','infinite queue'],answer:'bounded queue',explanation:'Bounded queue limits admitted waiting work'}, {id:'open',type:'open',prompt:'Defend admission control',answer:'reference reasoning',explanation:'An explanation requires explicit assumptions'}],flashcards:[{front:'When does a queue grow?',back:'secret review answer: arrival exceeds service capacity'}],mentalModel:'Waiting work accumulates when arrivals exceed service.'}));
  writeFileSync(join(root,'content','interviews','interview_001.json'),JSON.stringify({id:'interview_001',lessonId:'001',title:'Queue debugging',aliases:['queues'],modeType:'B',minutes:45,brief:'A service queues indefinitely at peak load. Diagnose it.',clarifications:[{question:'What is service capacity?',answer:'100 requests/s.'}],hints:['Compare arrival and departure rates.'],changes:['A worker fails.'],rubric:[{id:'requirements',label:'Requirements',weight:40},{id:'reliability',label:'Reliability',weight:60}],referenceSolution:'secret interview reference',debrief:'Compare excess arrival and backlog slope.',remediation:['001']}));
  mkdirSync(join(root,'content','guides'));const lesson=JSON.parse(readFileSync(join(root,'content','lessons','001.json'),'utf8'));
  writeFileSync(join(root,'content','guides','queue-basics.json'),JSON.stringify({...lesson,id:'queue-basics',week:1,level:'beginner',summary:'Start with waiting work',terms:[{term:'queue',definition:'Waiting work'}],sections:[{id:'queue',title:'Queue fundamentals',markdown:'Waiting work needs a bounded admission policy.'}]}));
  writeFileSync(join(root,'content','learning-path.json'),JSON.stringify({version:1,title:'Guided path',weeks:[{number:1,guides:[{id:'queue-basics'},{id:'unwritten-guide'}],days:[{day:1,guideId:'queue-basics'},{day:2,guideId:'unwritten-guide'}]}]}));
  return {root,dataDir:join(root,'data'),cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
const key=(suffix:string)=>`test-key-${suffix}`;
test('worked walkthroughs are searchable while exercise and quiz answers stay withheld',()=>{
  const f=fixture();const file=join(f.root,'content','guides','queue-basics.json');
  const guide=JSON.parse(readFileSync(file,'utf8'));
  guide.walkthroughs=[{id:'worked-state',title:'A small queue',sectionId:'queue',intro:'Trace a waiting job.',steps:[{title:'Arrive',explanation:'Marigold is a public worked example.',state:[{label:'Waiting',value:'job-17'},{label:'Worker',value:'busy'}]}],takeaway:'Waiting is separate from completion.'}];
  writeFileSync(file,JSON.stringify(guide));const engine=new Engine(f.root,f.dataDir);
  try{
    const candidate=engine.guide('queue-basics');assert.equal(candidate.walkthroughs?.[0].steps[0].state[0].value,'job-17');
    assert.equal(candidate.exercise?.solution,undefined);assert.equal(candidate.questions[0].answer,undefined);
    const found=engine.search('Marigold',0,20);assert.equal(found.total,1);assert.equal(found.results[0].sectionId,'queue');assert.match(found.results[0].snippet,/Marigold/);
    assert.equal(engine.search('secret exercise solution',0,20).total,0);assert.equal(engine.search('secret explanation',0,20).total,0);
  }finally{engine.close();f.cleanup();}
});
function feedback(s:any,score=3){return {sessionId:s.id,revision:s.revision,idempotencyKey:key(`feedback-${s.revision}`),source:'ai',components:['requirements','reliability'].map(dimensionId=>({dimensionId,score,evidence:[{turnId:s.turns[0].id,quote:'Bound the queue'}],reasoning:'Candidate specified an explicit admission limit.'})),missedOpportunities:['State the timeout budget.'],alternatives:['Reject excess arrivals at admission.'],remediation:[{lessonId:'001',reason:'Revisit waiting work'}],retryExercise:'Repeat with half the worker capacity.',uncertainty:'Short transcript provides limited evidence.'};}

test('durable notes, attempts, objective-only proficiency, idempotency and revision conflicts',()=>{
  const f=fixture();let engine=new Engine(f.root,f.dataDir);
  try{
    const hidden=engine.execute('get_lesson',{lessonId:'001'});assert.equal(hidden.questions[0].answer,undefined);assert.equal(hidden.exercise.solution,undefined);
    assert.equal(engine.execute('get_lesson',{lessonId:'002'}).status,'metadata-only');
    engine.execute('open_lesson',{lessonId:'001'});assert.equal(engine.state().progress[0].demonstratedAt,null);
    const note=engine.execute('save_note',{targetId:'001',text:'Capacity and arrival must use matching units.',revision:0});assert.equal(note.revision,1);
    assert.throws(()=>engine.execute('save_note',{targetId:'001',text:'stale',revision:0}),(e:any)=>e.code==='REVISION_CONFLICT');
    engine.execute('save_draft',{targetId:'001',text:'First design sketch',revision:0});
    const payload={lessonId:'001',answers:{choice:'queue grows',numeric:20,choice2:'bounded queue',open:'Bound the waiting room.'},idempotencyKey:key('quiz')};
    const a=engine.execute('submit_quiz_attempt',payload);assert.equal(a.score,100);assert.equal(a.results[3].correct,null);assert.match(a.results[3].assessment,/ungraded/);
    assert.equal(engine.execute('submit_quiz_attempt',payload).id,a.id);assert.equal(engine.store.all('attempts').length,1);
    assert.throws(()=>engine.execute('submit_quiz_attempt',{...payload,answers:{numeric:999}}),(e:any)=>e.code==='IDEMPOTENCY_CONFLICT');
    assert.equal(engine.state().progress[0].proficiencyScope,'objective quiz only; not open-ended design readiness');
    engine.close();engine=new Engine(f.root,f.dataDir);assert.equal(engine.state().notes[0].text,note.text);assert.equal(engine.state().drafts[0].text,'First design sketch');assert.equal(engine.state().attempts.length,1);
    const exported=engine.execute('export_data',{});assert.equal(exported.version,1);assert.equal(engine.execute('import_data',{data:exported}).skipped,5);
    const before=engine.state().notes[0].text;const invalid=structuredClone(exported);invalid.records.notes[0].revision=-1;assert.throws(()=>engine.execute('import_data',{data:invalid}));assert.equal(engine.state().notes[0].text,before);
  }finally{engine.close();f.cleanup();}
});

test('timers, restart, hints, weighted feedback evidence and all answer reveal boundaries',()=>{
  const f=fixture();let now=Date.parse('2026-09-29T10:00:00Z');let engine=new Engine(f.root,f.dataDir,()=>now);
  try{
    engine.execute('reveal_lesson',{lessonId:'001'});const quiz={lessonId:'001',answers:{numeric:20},idempotencyKey:key('prior-quiz')};engine.execute('submit_quiz_attempt',quiz);
    assert.equal(engine.execute('get_workbook',{lessonIds:['001'],solutions:false}).lessons[0].questions[0].answer,undefined);
    let s=engine.execute('start_interview',{interviewId:'queues',mode:'exam',idempotencyKey:key('start')});assert.equal(s.status,'active');assert.equal(s.referenceSolution,undefined);
    assert.throws(()=>engine.execute('get_interview_debrief',{sessionId:s.id}),(e:any)=>e.code==='ANSWER_PROTECTED');
    assert.throws(()=>engine.execute('reveal_lesson',{lessonId:'001'}));assert.throws(()=>engine.execute('get_workbook',{lessonIds:['001'],solutions:true}));assert.throws(()=>engine.execute('submit_quiz_attempt',quiz));assert.throws(()=>engine.execute('export_data',{}));
    assert.equal(engine.execute('get_lesson',{lessonId:'001'}).sections.length,0);assert.equal(engine.execute('search_course',{query:'backlog'}).total,0);assert.equal(engine.execute('get_due_reviews',{}).cards.length,0);assert.equal(engine.state().attempts[0].results.length,0);
    now+=12500;s=engine.execute('pause_interview',{sessionId:s.id,revision:s.revision,idempotencyKey:key('pause')});assert.equal(s.elapsedMs,12500);
    engine.close();engine=new Engine(f.root,f.dataDir,()=>now);now+=50000;s=engine.execute('get_interview_session',{sessionId:s.id});assert.equal(s.elapsedMs,12500);
    s=engine.execute('resume_interview',{sessionId:s.id,revision:s.revision,idempotencyKey:key('resume')});
    const stale=s.revision;s=engine.execute('record_interview_turn',{sessionId:s.id,revision:s.revision,role:'candidate',kind:'answer',text:'Bound the queue to 500 requests and reject overload explicitly.',idempotencyKey:key('turn')});
    assert.throws(()=>engine.execute('pause_interview',{sessionId:s.id,revision:stale,idempotencyKey:key('stale')}),(e:any)=>e.code==='REVISION_CONFLICT');
    s=engine.execute('request_interview_hint',{sessionId:s.id,revision:s.revision,idempotencyKey:key('hint')});assert.equal(s.hints.length,1);
    now+=7500;s=engine.execute('finish_interview',{sessionId:s.id,revision:s.revision,idempotencyKey:key('finish')});assert.equal(s.status,'feedback_pending');assert.equal(s.elapsedMs,20000);assert.equal(s.feedback,undefined);
    const bad=feedback(s);bad.components[0].evidence[0].quote='never said';assert.throws(()=>engine.execute('save_interview_feedback',bad));
    s=engine.execute('save_interview_feedback',feedback(s));assert.equal(s.feedback.total,75);assert.equal(s.status,'reviewed');assert.equal(engine.execute('get_interview_debrief',{sessionId:s.id}).referenceSolution,'secret interview reference');
    const priorFeedbackRequest=feedback({...s,revision:s.revision-1});engine.execute('start_interview',{interviewId:'interview_001',idempotencyKey:key('start-second')});assert.equal(engine.execute('save_interview_feedback',priorFeedbackRequest).feedback,undefined);
  }finally{engine.close();f.cleanup();}
});

test('spaced repetition is deterministic, retry safe, and retains wrong answer history',()=>{
  const f=fixture();let now=Date.parse('2026-09-29T10:00:00Z');const engine=new Engine(f.root,f.dataDir,()=>now);
  try{
    engine.execute('submit_quiz_attempt',{lessonId:'001',answers:{numeric:999},idempotencyKey:key('wrong')});assert.equal(engine.state().weakSkills[0].score,0);assert.equal(engine.state().attempts[0].results[0].correct,false);
    let r=engine.execute('record_review',{cardId:'001:0',rating:2,idempotencyKey:key('review-one')});assert.equal(r.intervalDays,1);assert.equal(engine.execute('get_due_reviews',{}).cards.length,0);
    assert.equal(engine.execute('record_review',{cardId:'001:0',rating:2,idempotencyKey:key('review-one')}).history.length,1);
    now+=86400000;r=engine.execute('record_review',{cardId:'001:0',rating:2,idempotencyKey:key('review-two')});assert.equal(r.intervalDays,6);
    now+=6*86400000;r=engine.execute('record_review',{cardId:'001:0',rating:0,idempotencyKey:key('review-again')});assert.equal(r.intervalDays,0);assert.equal(r.repetitions,0);assert.equal(Date.parse(r.dueAt)-now,600000);
  }finally{engine.close();f.cleanup();}
});

test('SQLite v1 migration, rollback on database errors, consistent backup and safe restore',async()=>{
  const f=fixture();mkdirSync(f.dataDir,{recursive:true});const legacy=new DatabaseSync(join(f.dataDir,'academy.sqlite'));
  for(const table of tables.filter(t=>!t.startsWith('guide_')))legacy.exec(`CREATE TABLE ${table}(id TEXT PRIMARY KEY,data TEXT NOT NULL CHECK(json_valid(data)));`);legacy.exec('PRAGMA user_version=1');legacy.prepare('INSERT INTO notes VALUES(?,?)').run('001',JSON.stringify({id:'001',targetId:'001',text:'Legacy note',revision:1,updatedAt:'2026-09-29T10:00:00.000Z'}));legacy.close();
  const engine=new Engine(f.root,f.dataDir);
  try{
    assert.equal(engine.store.db.prepare('PRAGMA user_version').get()?.user_version,3);assert.equal(engine.state().notes[0].text,'Legacy note');assert.deepEqual(engine.state().guideProgress,[]);
    const b=await engine.execute('create_backup',{});assert.match(b.backupId,/\.sqlite$/);engine.execute('save_note',{targetId:'001',text:'Later note',revision:1});
    const restoring=engine.execute('restore_backup',{backupId:b.backupId});assert.throws(()=>engine.execute('save_note',{targetId:'001',text:'Competing write',revision:2}),(e:any)=>e.code==='RESTORE_IN_PROGRESS');const restored=await restoring;assert.ok(restored.safetyBackup.backupId);assert.equal(engine.state().notes[0].text,'Legacy note');
    engine.store.db.exec("CREATE TRIGGER reject_attempt BEFORE INSERT ON attempts BEGIN SELECT RAISE(ABORT, 'injected disk write failure'); END;");
    assert.throws(()=>engine.execute('submit_quiz_attempt',{lessonId:'001',answers:{numeric:20},idempotencyKey:key('disk-error')}));assert.equal(engine.store.all('attempts').length,0);assert.equal(engine.store.all('progress').length,0);
    assert.throws(()=>engine.execute('restore_backup',{backupId:'../../bad.sqlite'}));
  }finally{engine.close();f.cleanup();}
});

test('loopback HTTP rejects host/origin/CSRF abuse and persists authorized requests',async()=>{
  const f=fixture();const app=await startServer({root:f.root,dataDir:f.dataDir,port:0,quiet:true});const base=`http://127.0.0.1:${app.port}`;
  try{
    assert.equal((await fetch(`${base}/api/health`)).status,200);
    const path=await(await fetch(`${base}/api/learning-path`)).json() as any;assert.equal(path.weeks[0].days[0].guideAvailable,true);assert.equal(path.weeks[0].days[1].guideAvailable,false);
    const guide=await(await fetch(`${base}/api/guides/queue-basics`)).json() as any;assert.equal(guide.questions[0].answer,undefined);assert.equal((await fetch(`${base}/api/guides/unwritten-guide`)).status,404);
    assert.equal((await fetch(`${base}/api/state`,{headers:{Origin:'https://evil.example'}})).status,403);
    const badHostStatus=await new Promise<number|undefined>((ok,bad)=>{const r=request(`${base}/api/state`,{headers:{Host:'evil.example'}},res=>{res.resume();ok(res.statusCode);});r.on('error',bad);r.end();});assert.equal(badHostStatus,403);
    const state=await(await fetch(`${base}/api/state`)).json() as any;
    const url=`${base}/api/actions/save_note`;const body=JSON.stringify({targetId:'001',text:'Actual HTTP note',revision:0});
    assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body})).status,403);
    assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Academy-CSRF':state.csrfToken},body})).status,200);
    assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Academy-CSRF':state.csrfToken},body})).status,409);
    assert.equal(app.engine.state().notes[0].text,'Actual HTTP note');
  }finally{await app.close();f.cleanup();}
});

test('official MCP subprocess discovery, lesson retrieval, protected interview lifecycle and feedback',async()=>{
  const f=fixture();const app=await startServer({root:f.root,dataDir:f.dataDir,port:0,quiet:true});
  const transport=new StdioClientTransport({command:process.execPath,args:['--import','tsx',resolve('mcp','index.ts')],cwd:resolve('.'),env:{...Object.fromEntries(Object.entries(process.env).filter(([,v])=>v!==undefined)) as Record<string,string>,ACADEMY_URL:`http://127.0.0.1:${app.port}`,ACADEMY_DATA_DIR:f.dataDir},stderr:'pipe'});
  const client=new Client({name:'academy-integration-test',version:'1.0.0'});let stderr='';transport.stderr?.on('data',chunk=>{stderr+=String(chunk);});
  const call=async(name:string,args:any={})=>{const result=await client.callTool({name,arguments:args});const text=(result.content as any[]).filter(x=>x.type==='text').map(x=>x.text).join('\n');if(result.isError)throw new Error(text);return JSON.parse(text);};
  try{
    await client.connect(transport);const tools=await client.listTools();assert.ok(tools.tools.some(t=>t.name==='pause_interview'));assert.ok(tools.tools.length>=20);
    const lesson=await call('get_lesson',{lessonId:'001'});assert.equal(lesson.sections[0].id,'queue');assert.equal(lesson.questions[0].answer,undefined);
    const guided=await call('get_guide',{guideId:'queue-basics'});assert.equal(guided.questions[0].answer,undefined);assert.equal((await call('get_learning_path')).weeks[0].days[1].guideAvailable,false);
    const search=await call('search_course',{query:'admission policy'});assert.equal(search.results[0].guideId,'queue-basics');assert.match(search.results[0].url,/#guide\/queue-basics/);assert.equal((await call('search_course',{query:'secret exercise'})).total,0);
    const progress=await call('open_guide',{guideId:'queue-basics'});assert.equal(progress.completedAt,null);
    await call('save_guide_progress',{guideId:'queue-basics',revision:progress.revision,position:'queue'});assert.equal(app.engine.state().guideProgress[0].position,'queue');
    await call('reveal_guide',{guideId:'queue-basics'});const cards=await call('get_due_reviews');assert.equal(cards.cards[0].cardId,'guide:queue-basics:0');assert.equal(cards.cards[0].guideId,'queue-basics');assert.match(cards.cards[0].back,/arrival exceeds/);
    const scheduled=await call('record_review',{cardId:cards.cards[0].cardId,rating:2,idempotencyKey:key('guide-review-mcp')});assert.equal(scheduled.intervalDays,1);
    await call('save_note',{targetId:'001',text:'Saved by a real stdio MCP client',revision:0});assert.equal(app.engine.state().notes[0].text,'Saved by a real stdio MCP client');
    let s=app.engine.execute('start_interview',{interviewId:'interview_001',mode:'exam',idempotencyKey:key('web-start')});
    s=await call('get_interview_session',{sessionId:s.id});s=await call('pause_interview',{sessionId:s.id,revision:s.revision,idempotencyKey:key('mcp-pause')});assert.equal(s.status,'paused');
    s=await call('resume_interview',{sessionId:s.id,revision:s.revision,idempotencyKey:key('mcp-resume')});
    await assert.rejects(()=>call('get_interview_debrief',{sessionId:s.id}),/ANSWER_PROTECTED/);assert.equal((await call('search_course',{query:'backlog'})).total,0);
    s=await call('record_interview_turn',{sessionId:s.id,revision:s.revision,role:'candidate',kind:'answer',text:'Bound the queue and reject excess requests.',idempotencyKey:key('mcp-turn')});
    s=await call('finish_interview',{sessionId:s.id,revision:s.revision,idempotencyKey:key('mcp-finish')});s=await call('save_interview_feedback',feedback(s));assert.equal(s.feedback.total,75);assert.equal((app.engine.state().sessions[0].feedback as any).total,75);
    const prompts=await client.listPrompts();assert.equal(prompts.prompts.length,4);const resources=await client.readResource({uri:'course://lessons/001'});assert.ok(resources.contents.length);
    const invalid=await client.callTool({name:'record_review',arguments:{cardId:'../secrets',rating:99,idempotencyKey:key('bad')}});assert.equal(invalid.isError,true);
    assert.ok(!stderr.includes('SyntaxError'));
  }finally{await client.close();await app.close();f.cleanup();}
});

test('definition versions survive content edits; project references and linked debriefs enforce reveal rules',()=>{
  const f=fixture();mkdirSync(join(f.root,'content','projects'),{recursive:true});mkdirSync(join(f.root,'projects','learner'),{recursive:true});mkdirSync(join(f.root,'projects','reference'),{recursive:true});
  writeFileSync(join(f.root,'content','projects','P1.json'),JSON.stringify({id:'P1',title:'URL shortener',milestones:[{lessonId:'001',number:1}]}));
  writeFileSync(join(f.root,'projects','learner','shortener.py'),'# deliberate learner TODO');writeFileSync(join(f.root,'projects','reference','shortener.py'),'# protected project reference');
  const path=join(f.root,'content','interviews','interview_001.json');const original=JSON.parse(readFileSync(path,'utf8'));original.version=7;original.debriefLessonId='002';writeFileSync(path,JSON.stringify(original));
  let engine=new Engine(f.root,f.dataDir);
  try{
    assert.match(engine.execute('get_project',{projectId:'P1'}).code,/learner TODO/);
    assert.throws(()=>engine.execute('get_project_reference',{projectId:'P1'}));
    assert.match(engine.execute('reveal_project',{projectId:'P1'}).code,/protected project reference/);
    let s=engine.execute('start_interview',{interviewId:'interview_001',idempotencyKey:key('version-start')});assert.equal(s.definitionVersion,'7');assert.equal(s.definitionSnapshot,undefined);assert.ok(engine.protectedLesson('002'));
    assert.throws(()=>engine.execute('get_project_reference',{projectId:'P1'}),(e:any)=>e.code==='ANSWER_PROTECTED');
    original.version=8;original.brief='Edited current definition';writeFileSync(path,JSON.stringify(original));engine.close();engine=new Engine(f.root,f.dataDir);
    s=engine.execute('get_interview_session',{sessionId:s.id});assert.equal(s.definitionVersion,'7');assert.notEqual(s.definition.brief,'Edited current definition');
    s=engine.execute('record_interview_turn',{sessionId:s.id,revision:s.revision,role:'candidate',kind:'answer',text:'Bound the queue at admission.',idempotencyKey:key('version-turn')});
    s=engine.execute('finish_interview',{sessionId:s.id,revision:s.revision,idempotencyKey:key('version-finish')});s=engine.execute('save_interview_feedback',feedback(s));
    const exported=engine.execute('export_data',{});assert.equal(exported.contentVersion,'1');assert.ok(engine.execute('import_data',{data:exported}).skipped>0);
    exported.records.sessions[0].feedback.total=99;assert.throws(()=>engine.execute('import_data',{data:exported}),/total does not match/);
    assert.equal(engine.execute('get_project_reference',{projectId:'P1'}).codeType,'reference');
  }finally{engine.close();f.cleanup();}
});

test('guide progress stays separate, persists, checks conflicts and preserves historical exports/backups',async()=>{
  const f=fixture();let engine=new Engine(f.root,f.dataDir);
  try{
    assert.equal(engine.learningPath().contentCounts.published,1);assert.equal(engine.content.learningPath.weeks[0].days[0].guideAvailable,undefined);
    assert.throws(()=>engine.execute('get_guide',{guideId:'../manifest'}));assert.throws(()=>engine.execute('open_guide',{guideId:'unwritten-guide'}));
    let p=engine.execute('open_guide',{guideId:'queue-basics'});assert.equal(p.revision,1);assert.equal(p.completedAt,null);assert.equal(engine.execute('open_guide',{guideId:'queue-basics'}).revision,1);
    p=engine.execute('save_guide_progress',{guideId:p.id,revision:p.revision,position:'queue',bookmarked:true});
    assert.throws(()=>engine.execute('save_guide_progress',{guideId:p.id,revision:1,completed:true}),(e:any)=>e.code==='REVISION_CONFLICT');
    engine.execute('save_note',{targetId:'guide:queue-basics',text:'My own explanation',revision:0});engine.execute('save_draft',{targetId:'guide:queue-basics',text:'Draft answer',revision:0});
    const input={guideId:p.id,answers:{numeric:20,open:'My reasoning'},idempotencyKey:key('guide-quiz')};const attempt=engine.execute('submit_guide_quiz',input);assert.equal(attempt.score,100);assert.equal(attempt.results[1].correct,null);assert.equal(engine.execute('submit_guide_quiz',input).id,attempt.id);
    assert.equal(engine.guide(p.id).solutionsRevealed,false);assert.equal(engine.guide(p.id).exercise?.solution,undefined);assert.equal(engine.state().progress.length,0);assert.equal(engine.state().attempts.length,0);assert.equal(engine.state().guideAttempts.length,1);assert.equal(engine.state().guideProgress[0].completedAt,null);
    assert.equal(engine.execute('reveal_guide',{guideId:p.id}).exercise.solution,'secret exercise solution');
    const backup=await engine.execute('create_backup',{});engine.close();engine=new Engine(f.root,f.dataDir);
    assert.equal(engine.state().guideProgress[0].position,'queue');assert.equal(engine.state().guideAttempts[0].contentVersion,'1.0.0');assert.equal(engine.guide(p.id).solutionsRevealed,true);
    const exported=engine.exportRecords();assert.equal(engine.execute('import_data',{data:exported}).skipped,6);
    const old=structuredClone(exported) as any;delete old.records.guide_progress;delete old.records.guide_attempts;old.records.settings=[];assert.ok(engine.execute('import_data',{data:old}).skipped>=2);
    engine.execute('save_guide_progress',{guideId:p.id,revision:engine.state().guideProgress[0].revision,completed:true});await engine.execute('restore_backup',{backupId:backup.backupId});assert.equal(engine.state().guideProgress[0].completedAt,null);
    // An actual v2 backup lacks guide tables. Restoring it remains supported and creates a safety backup.
    const legacyName='backup-2026-09-29T10-00-00-000--abcdef12.sqlite';const legacy=new DatabaseSync(join(f.dataDir,'backups',legacyName));
    for(const table of tables.filter(t=>!t.startsWith('guide_')))legacy.exec(`CREATE TABLE ${table}(id TEXT PRIMARY KEY,data TEXT NOT NULL CHECK(json_valid(data)));`);
    legacy.exec('PRAGMA user_version=2');legacy.close();const restored=await engine.execute('restore_backup',{backupId:legacyName});assert.ok(restored.safetyBackup);assert.deepEqual(engine.state().guideAttempts,[]);
  }finally{engine.close();f.cleanup();}
});
