import { randomUUID, createHash, randomBytes } from 'node:crypto';
import { backup, DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { actions, type ActionName, readActions, guideId } from '../shared/schemas.js';
import { Content } from './content.js';
import { Store, tables, type Table } from './database.js';
import type { Interview, InterviewSession, Lesson, Guide, Question } from './types.js';

export class CourseError extends Error { constructor(public status:number,message:string,public code='COURSE_ERROR'){super(message);} }
const fail=(status:number,message:string,code?:string):never=>{throw new CourseError(status,message,code);};
const canonical=(v:any):string=>JSON.stringify(v, (_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const iso=(ms:number)=>new Date(ms).toISOString();
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const date=z.string().datetime();
const exportSchema=z.object({format:z.literal('system-design-academy'),version:z.literal(1),exportedAt:date,contentVersion:z.string(),records:z.object(Object.fromEntries(tables.map(t=>[t,t.startsWith('guide_')?z.array(z.record(z.string(),z.unknown())).max(100000).default([]):z.array(z.record(z.string(),z.unknown())).max(100000)])) as unknown as Record<Table,z.ZodType<any[]>>).strict()}).strict();

export class Engine {
  content:Content; store:Store;
  restoring=false;
  constructor(public root:string,public dataDir:string,public now:()=>number=Date.now) { this.content=new Content(root); this.store=new Store(join(dataDir,'academy.sqlite')); }
  close(){this.store.close();}
  activeSessions(){return this.store.all<InterviewSession>('sessions').filter(s=>s.status==='active'||s.status==='paused');}
  protectedLesson(id:string){const meta=this.content.meta(id);return this.activeSessions().some(s=>{const definition=this.definition(s);return s.lessonId===id||definition.protectedLessonIds?.includes(id)||definition.debriefLessonId===id||(meta?.type==='debrief'&&meta.prerequisites.includes(s.lessonId));});}
  requireLesson(id:string):Lesson {const lesson=this.content.lessons.get(id);if(!lesson) fail(409,'This session has catalog metadata but no published teaching material yet.','CONTENT_UNAVAILABLE');return lesson!;}
  requireGuide(id:string):Guide {const guide=this.content.guides.get(id);if(!guide)fail(404,'This guide is still in preparation.','CONTENT_UNAVAILABLE');return guide!;}
  learningPath(){if(!this.content.learningPath)fail(404,'The guided learning path is not published.','CONTENT_UNAVAILABLE');const path=clone(this.content.learningPath);for(const week of path.weeks||[]){for(const day of week.days||[])day.guideAvailable=!!day.guideId&&this.content.guides.has(day.guideId);for(const guide of week.guides||[])guide.guideAvailable=this.content.guides.has(guide.id);}return {...path,contentCounts:{planned:(path.weeks||[]).reduce((n:number,w:any)=>n+(w.guides?.length||0),0),published:this.content.guides.size}};}
  guide(id:string){const result=clone(this.requireGuide(id));const revealed=!!this.store.get('settings',`guide-revealed:${id}`)?.value;if(!revealed){for(const question of result.questions){delete question.answer;delete question.explanation;}if(result.exercise)delete result.exercise.solution;result.flashcards=[];}return {...result,solutionsRevealed:revealed,url:`/#guide/${id}`,uri:`course://guides/${id}`};}
  gradeQuestions(questions:Question[],answers:Record<string,string|number>){
    if(Object.keys(answers).some(id=>!questions.some(q=>q.id===id)))fail(400,'Unknown question ID.');
    const results=questions.filter(q=>Object.hasOwn(answers,q.id)).map(q=>{const submitted=answers[q.id];let correct:boolean|null=null;if(q.type==='choice')correct=String(submitted)===String(q.answer);if(q.type==='numeric'){if(typeof submitted!=='number')fail(400,`Question ${q.id} expects a numeric value${q.unit?` in ${q.unit}`:''}.`);correct=Math.abs(Number(submitted)-Number(q.answer))<=(q.tolerance||0);}return {questionId:q.id,type:q.type,submitted,correct,answer:q.answer,explanation:q.explanation,assessment:q.type==='open'?'ungraded; compare against the rubric for self-assessment':'deterministic'};});
    if(!results.length)fail(400,'Submit at least one response.');const objective=results.filter(r=>r.correct!==null);const correct=objective.filter(r=>r.correct).length;return {results,score:objective.length?Math.round(correct/objective.length*100):null,correct,total:objective.length};
  }
  requireMeta(id:string){const meta=this.content.meta(id);if(!meta) fail(404,'Unknown lesson.');return meta!;}
  requireSession(id:string):InterviewSession {const s=this.store.get<InterviewSession>('sessions',id);if(!s) fail(404,'Unknown interview session.');return s!;}
  definition(s:InterviewSession):Interview {const i=s.definitionSnapshot||this.store.get<InterviewSession>('sessions',s.id)?.definitionSnapshot||this.content.interviews.get(s.interviewId);if(!i) fail(409,'The interview definition is unavailable in this course version.');return i!;}
  safeSession(session:InterviewSession){const s=clone(session);const def=this.definition(s);delete s.definitionSnapshot;const elapsedMs=s.elapsedMs+(s.status==='active'&&s.startedAt?Math.max(0,this.now()-Date.parse(s.startedAt)):0);if(s.status==='active'||s.status==='paused'||this.activeSessions().some(a=>a.interviewId===s.interviewId&&a.id!==s.id)) delete s.feedback;return {...s,elapsedMs,remainingMs:Math.max(0,def.minutes*60000-elapsedMs),definition:{id:def.id,lessonId:def.lessonId,title:def.title,brief:def.brief,minutes:def.minutes,rubric:def.rubric,modeType:def.modeType,clarificationQuestions:def.clarifications?.map(c=>c.question)||[]},guidance:'Ask one question at a time. Use the rubric, ask the candidate to justify decisions, and record actual turns explicitly. Do not inspect solution files or invent evidence. Timers are advisory; elapsed time continues until pause or submission.'};}
  lesson(id:string,sectionId?:string,solutions=false){
    const meta=this.requireMeta(id);const lesson=this.content.lessons.get(id);
    if(!lesson)return {...meta,status:'metadata-only',sections:[],questions:[],diagrams:[],flashcards:[],objectives:[],retrieval:[],url:`/#lesson/${id}`,uri:`course://lessons/${id}`};
    const result=clone(lesson);const protectedNow=this.protectedLesson(id);const revealed=!protectedNow&&(solutions||this.store.get('settings',`revealed:${id}`)?.value);
    if(solutions&&protectedNow) fail(403,'Solutions are withheld during an active or paused related interview.','ANSWER_PROTECTED');
    if(!revealed){for(const q of result.questions||[]){delete q.answer;delete q.explanation;}if(result.exercise)delete result.exercise.solution;result.flashcards=[];}
    if(protectedNow){result.sections=[];result.diagrams=[];result.retrieval=[];delete result.mentalModel;}
    if(sectionId){result.sections=result.sections.filter(s=>s.id===sectionId);if(!result.sections.length) fail(404,'Unknown or unavailable lesson section.');result.questions=[];result.diagrams=[];delete result.exercise;}
    return {...result,solutionsRevealed:!!revealed,assessmentActive:protectedNow,url:`/#lesson/${id}`,uri:`course://lessons/${id}`};
  }
  state(){
    const progress=this.store.all('progress');const completed=new Set(progress.filter(p=>p.completedAt||p.demonstratedAt).map(p=>p.lessonId));
    const route=this.content.manifest.routes?.recommended||this.content.manifest.lessons.map(l=>l.id);
    const ids=route.flatMap(id=>id.startsWith('M')?this.content.manifest.lessons.filter(l=>l.moduleId===id).map(l=>l.id):[id]);
    const candidates=ids.map(id=>this.content.meta(id)).filter(l=>l&&!completed.has(l.id)&&this.content.lessons.has(l.id));
    const demonstrated=new Set(progress.filter(p=>p.demonstratedAt).map(p=>p.lessonId));
    const next=candidates.find(l=>l!.prerequisites.every(p=>demonstrated.has(p)))||candidates[0];
    const suggestion=next?{lessonId:next.id,missingPrerequisites:next.prerequisites.filter(p=>!demonstrated.has(p))}:null;
    const attempts=this.store.all('attempts').map(a=>this.protectedLesson(a.lessonId)?{...a,results:[],answers:{}}:a);
    return {progress,guideProgress:this.store.all('guide_progress'),guideAttempts:this.store.all('guide_attempts'),notes:this.store.all('notes'),drafts:this.store.all('drafts'),attempts,wrongAnswers:this.wrongAnswers(0,100).items,dueReviews:this.due(30),sessions:this.store.all<InterviewSession>('sessions').map(s=>this.safeSession(s)),suggestion,weakSkills:attempts.filter(a=>typeof a.score==='number'&&a.score<75).slice(-12).map(a=>({lessonId:a.lessonId,score:a.score})),contentVersion:this.content.manifest.version};
  }
  search(query:string,offset:number,limit:number){
    const terms=query.toLocaleLowerCase().split(/\s+/).filter(Boolean);const matches:any[]=[];
    for(const [id,g]of this.content.guides){for(const section of g.sections){
      const stories=(g.walkthroughs||[]).filter(story=>story.sectionId===section.id);
      const teaching=[section.markdown,...stories.flatMap(story=>[story.title,story.intro,...story.steps.flatMap(step=>[step.title,step.explanation,...step.state.map(item=>`${item.label}: ${item.value}`)]),story.takeaway])].join('\n\n');
      const full=`${g.title} ${section.title} ${teaching}`;if(!terms.every(t=>full.toLocaleLowerCase().includes(t)))continue;
      const position=Math.max(0,teaching.toLocaleLowerCase().indexOf(terms[0]));matches.push({guideId:id,sectionId:section.id,title:`${g.title} · ${section.title}`,snippet:teaching.slice(Math.max(0,position-70),position+220).replace(/[#*`]/g,''),url:`/#guide/${id}?section=${section.id}`,uri:`course://guides/${id}#${section.id}`});
    }}
    for(const [id,l] of this.content.lessons){if(this.protectedLesson(id))continue;for(const section of l.sections||[]){const full=`${l.title} ${section.title} ${section.markdown}`;if(!terms.every(t=>full.toLocaleLowerCase().includes(t)))continue;const position=Math.max(0,section.markdown.toLocaleLowerCase().indexOf(terms[0]));matches.push({lessonId:id,sectionId:section.id,title:`${l.title} · ${section.title}`,snippet:section.markdown.slice(Math.max(0,position-70),position+220).replace(/[#*`]/g,''),url:`/#lesson/${id}?section=${section.id}`,uri:`course://lessons/${id}#${section.id}`});}}
    return {results:matches.slice(offset,offset+limit),total:matches.length,offset,hasMore:offset+limit<matches.length};
  }
  due(limit:number){
    return this.store.all('reviews').filter(r=>Date.parse(r.dueAt)<=this.now()&&(!r.lessonId||!this.protectedLesson(r.lessonId))).sort((a,b)=>a.dueAt.localeCompare(b.dueAt)).flatMap(r=>{const card=(r.guideId?this.content.guides.get(r.guideId):this.content.lessons.get(r.lessonId))?.flashcards?.[r.index];return card?[{...r,...card}]:[];}).slice(0,limit);
  }
  wrongAnswers(offset:number,limit:number){const items=this.store.all('attempts').filter(a=>!this.protectedLesson(a.lessonId)).sort((a,b)=>b.at.localeCompare(a.at)).flatMap(a=>a.results.filter((r:any)=>r.correct===false).map((r:any)=>({attemptId:a.id,lessonId:a.lessonId,contentVersion:a.contentVersion,at:a.at,...r,prompt:this.content.lessons.get(a.lessonId)?.questions.find(q=>q.id===r.questionId)?.prompt||'Question belongs to an older content version.'})));return {items:items.slice(offset,offset+limit),total:items.length,offset};}
  seedReviews(id:string){const lesson=this.content.lessons.get(id);for(const [index] of (lesson?.flashcards||[]).entries()){const cardId=`${id}:${index}`;if(!this.store.get('reviews',cardId))this.store.put('reviews',cardId,{id:cardId,cardId,lessonId:id,index,intervalDays:0,ease:2.5,repetitions:0,dueAt:iso(this.now()),history:[]});}}
  seedGuideReviews(id:string){const guide=this.requireGuide(id);for(const [index]of guide.flashcards.entries()){const cardId=`guide:${id}:${index}`;if(!this.store.get('reviews',cardId))this.store.put('reviews',cardId,{id:cardId,cardId,guideId:id,index,intervalDays:0,ease:2.5,repetitions:0,dueAt:iso(this.now()),history:[]});}}
  execute(name:string,input:unknown):any {
    if(!(name in actions)) fail(404,'Unknown action.');
    const action=name as ActionName;const payload=(actions[action] as z.ZodType).parse(input) as any;
    if(this.restoring&&!readActions.has(action))fail(409,'A database restore is in progress. Retry after it completes.','RESTORE_IN_PROGRESS');
    if(['create_backup','restore_backup'].includes(action))return this.asyncAction(action,payload);
    if(readActions.has(action))return this.perform(action,payload);
    return this.store.transaction(()=>{
      const fingerprint=createHash('sha256').update(canonical({action,payload})).digest('hex');
      if(payload.idempotencyKey){const prior=this.store.db.prepare('SELECT fingerprint,response FROM idempotency WHERE id=?').get(payload.idempotencyKey);if(prior){if(prior.fingerprint!==fingerprint)fail(409,'Idempotency key was already used for a different request.','IDEMPOTENCY_CONFLICT');if(action==='submit_quiz_attempt'&&this.protectedLesson(payload.lessonId))fail(403,'Previous quiz explanations are withheld during the related interview.','ANSWER_PROTECTED');const cached=JSON.parse(String(prior.response));return cached.interviewId&&cached.id?this.safeSession(cached):cached;}}
      const result=this.perform(action,payload);
      if(payload.idempotencyKey)this.store.db.prepare('INSERT INTO idempotency(id,fingerprint,response) VALUES(?,?,?)').run(payload.idempotencyKey,fingerprint,JSON.stringify(result));
      return result;
    });
  }
  perform(action:ActionName,p:any):any {
    const at=iso(this.now());
    switch(action){
      case 'get_learning_path':return this.learningPath();
      case 'get_guide':return this.guide(p.guideId);
      case 'open_guide':case 'save_guide_progress':{
        this.requireGuide(p.guideId);const previous=this.store.get('guide_progress',p.guideId);
        if(action==='open_guide'&&previous)return previous;
        if(action==='save_guide_progress'&&(previous?.revision||0)!==p.revision)fail(409,'Guide progress changed in another tab. Reload before saving.','REVISION_CONFLICT');
        const record=previous||{id:p.guideId,guideId:p.guideId,revision:0,openedAt:at,completedAt:null,bookmarked:false,position:''};
        if(p.completed!==undefined){record.completedAt=p.completed?at:null;if(p.completed)this.seedGuideReviews(p.guideId);}if(p.bookmarked!==undefined)record.bookmarked=p.bookmarked;if(p.position!==undefined)record.position=p.position;
        record.revision++;record.updatedAt=at;this.store.put('guide_progress',p.guideId,record);return record;
      }
      case 'reveal_guide':{this.requireGuide(p.guideId);this.store.put('settings',`guide-revealed:${p.guideId}`,{id:`guide-revealed:${p.guideId}`,value:true});this.seedGuideReviews(p.guideId);return this.guide(p.guideId);}
      case 'submit_guide_quiz':{
        const guide=this.requireGuide(p.guideId);const grade=this.gradeQuestions(guide.questions,p.answers);const record={id:randomUUID(),guideId:p.guideId,contentVersion:guide.version,at,answers:p.answers,...grade};this.store.put('guide_attempts',record.id,record);
        const progress=this.store.get('guide_progress',p.guideId)||{id:p.guideId,guideId:p.guideId,revision:0,openedAt:at,completedAt:null,bookmarked:false,position:''};progress.attemptedAt=at;progress.updatedAt=at;progress.revision++;this.store.put('guide_progress',p.guideId,progress);this.seedGuideReviews(p.guideId);return record;
      }
      case 'get_study_state': return this.state();
      case 'get_lesson': return this.lesson(p.lessonId,p.sectionId);
      case 'search_course': return this.search(p.query,p.offset,p.limit);
      case 'open_lesson': case 'set_progress': {
        this.requireMeta(p.lessonId);const record=this.store.get('progress',p.lessonId)||{id:p.lessonId,lessonId:p.lessonId,openedAt:null,completedAt:null,demonstratedAt:null,bookmarked:false};
        if(action==='open_lesson')record.openedAt??=at;
        if(p.completed!==undefined){this.requireLesson(p.lessonId);record.completedAt=p.completed?at:null;if(p.completed)this.seedReviews(p.lessonId);}
        if(p.bookmarked!==undefined)record.bookmarked=p.bookmarked;record.updatedAt=at;this.store.put('progress',p.lessonId,record);return record;
      }
      case 'save_note': case 'save_draft': {
        if(p.targetId.startsWith('guide:'))this.requireGuide(p.targetId.slice(6));
        const table=action==='save_note'?'notes':'drafts';const prior=this.store.get(table,p.targetId);if((prior?.revision||0)!==p.revision)fail(409,'This draft changed in another tab. Reload before saving.','REVISION_CONFLICT');
        const record={id:p.targetId,targetId:p.targetId,text:p.text,revision:p.revision+1,updatedAt:at};this.store.put(table,p.targetId,record);return record;
      }
      case 'reveal_lesson': {
        this.requireLesson(p.lessonId);if(this.protectedLesson(p.lessonId))fail(403,'Finish the related interview before revealing solutions.','ANSWER_PROTECTED');this.store.put('settings',`revealed:${p.lessonId}`,{id:`revealed:${p.lessonId}`,value:true});this.seedReviews(p.lessonId);return this.lesson(p.lessonId);
      }
      case 'submit_quiz_attempt': {
        const lesson=this.requireLesson(p.lessonId);if(this.protectedLesson(p.lessonId))fail(403,'Quiz solutions are withheld during the related interview.','ANSWER_PROTECTED');
        if(Object.keys(p.answers).some(id=>!lesson.questions.some(q=>q.id===id)))fail(400,'Unknown question ID.');
        const results=lesson.questions.filter(q=>Object.hasOwn(p.answers,q.id)).map(q=>{
          const submitted=p.answers[q.id];let correct:boolean|null=null;
          if(q.type==='choice')correct=String(submitted)===String(q.answer);
          if(q.type==='numeric'){if(typeof submitted!=='number')fail(400,`Question ${q.id} expects a numeric value${q.unit?` in ${q.unit}`:''}.`);correct=Math.abs(submitted-Number(q.answer))<=(q.tolerance||0);}
          return {questionId:q.id,type:q.type,submitted,correct,answer:q.answer,explanation:q.explanation,assessment:q.type==='open'?'ungraded; compare against the rubric for self-assessment':'deterministic'};
        });
        if(!results.length)fail(400,'Submit at least one response.');const objective=results.filter(r=>r.correct!==null);const allObjective=lesson.questions.filter(q=>q.type!=='open');const correct=objective.filter(r=>r.correct).length;
        const record={id:randomUUID(),lessonId:p.lessonId,contentVersion:lesson.version,at,answers:p.answers,results,score:objective.length?Math.round(correct/objective.length*100):null,correct,total:objective.length,hintsUsed:0};this.store.put('attempts',record.id,record);
        const progress=this.store.get('progress',p.lessonId)||{id:p.lessonId,lessonId:p.lessonId,openedAt:at,completedAt:null,demonstratedAt:null,bookmarked:false};progress.attemptedAt=at;
        if(allObjective.length>=3&&objective.length===allObjective.length&&correct/objective.length>=.8){progress.demonstratedAt=at;progress.proficiencyScope='objective quiz only; not open-ended design readiness';}this.store.put('progress',p.lessonId,progress);this.seedReviews(p.lessonId);return record;
      }
      case 'get_due_reviews': return {cards:this.due(p.limit)};
      case 'get_wrong_answers': return this.wrongAnswers(p.offset,p.limit);
      case 'record_review': {
        const card=this.store.get('reviews',p.cardId);if(!card)fail(404,'Unknown review card. Complete, attempt or reveal its guide or lesson first.');if(card.lessonId&&this.protectedLesson(card.lessonId))fail(403,'Review is withheld during the related interview.');
        // A deterministic SM-2-inspired scheduler: again resets; hard grows 1.2x; good uses ease; easy grows 1.3*ease.
        let interval=card.intervalDays;let ease=card.ease;let reps=card.repetitions;
        if(p.rating===0){interval=0;ease=Math.max(1.3,ease-.2);reps=0;}
        else if(p.rating===1){interval=Math.max(1,Math.ceil(interval*1.2));ease=Math.max(1.3,ease-.15);reps++;}
        else {interval=reps===0?(p.rating===3?4:1):reps===1?(p.rating===3?8:6):Math.ceil(interval*ease*(p.rating===3?1.3:1));if(p.rating===3)ease=Math.min(3,ease+.15);reps++;}
        const next={...card,intervalDays:interval,ease,repetitions:reps,dueAt:iso(this.now()+(p.rating===0?600000:interval*86400000)),history:[...card.history,{at,rating:p.rating,intervalDays:interval}]};this.store.put('reviews',p.cardId,next);return next;
      }
      case 'list_interviews': {
        const all=[...this.content.interviews.values()];return {interviews:all.slice(p.offset,p.offset+p.limit).map(i=>({id:i.id,lessonId:i.lessonId,title:i.title,aliases:i.aliases,modeType:i.modeType,minutes:i.minutes,available:true})),total:all.length,offset:p.offset};
      }
      case 'start_interview': {
        const def=this.content.interview(p.interviewId);if(!def)fail(404,'Interview definition is not published.');const existing=this.activeSessions().find(s=>s.interviewId===def!.id);if(existing)fail(409,`Resume existing session ${existing.id} before starting another attempt.`, 'SESSION_ACTIVE');
        const s:InterviewSession={id:randomUUID(),interviewId:def!.id,lessonId:def!.lessonId,mode:p.mode,status:'active',revision:1,createdAt:at,updatedAt:at,startedAt:at,elapsedMs:0,turns:[],hints:[],definitionVersion:String(def!.version||this.content.manifest.version),definitionSnapshot:clone(def!)};this.store.put('sessions',s.id,s);return this.safeSession(s);
      }
      case 'get_interview_session':return this.safeSession(this.requireSession(p.sessionId));
      case 'get_interview_clarification': {const s=this.requireSession(p.sessionId);const c=this.definition(s).clarifications[p.index];if(!c)fail(404,'Unknown clarification index.');return c;}
      case 'pause_interview':case 'resume_interview':case 'finish_interview':case 'record_interview_turn':case 'request_interview_hint':case 'save_interview_feedback': {
        const s=this.requireSession(p.sessionId);if(s.revision!==p.revision)fail(409,`Session revision changed; expected ${s.revision}. Reload and retry with a new idempotency key.`,'REVISION_CONFLICT');const def=this.definition(s);
        if(action==='save_interview_feedback'){
          if(s.status!=='feedback_pending'&&s.status!=='reviewed')fail(409,'Finish the answering phase before saving feedback.');
          const ids=p.components.map((c:any)=>c.dimensionId);if(new Set(ids).size!==ids.length||ids.length!==def.rubric.length||def.rubric.some(r=>!ids.includes(r.id)))fail(400,'Feedback must contain each rubric dimension exactly once.');
          for(const c of p.components){if(c.score>0&&!c.evidence.length)fail(400,'Positive scores require concrete candidate evidence.');for(const e of c.evidence){const turn=s.turns.find(t=>t.id===e.turnId);if(!turn||turn.role!=='candidate'||!turn.text.includes(e.quote))fail(400,'Evidence must quote an actual candidate turn exactly.');}}
          for(const item of p.remediation)this.requireMeta(item.lessonId);const totalWeight=def.rubric.reduce((n,r)=>n+r.weight,0);if(Math.abs(totalWeight-100)>.001)fail(500,'Interview rubric weights must total 100.');
          const total=def.rubric.reduce((n,r)=>n+p.components.find((c:any)=>c.dimensionId===r.id).score*r.weight/4,0);
          s.feedback={source:p.source,components:p.components,total:Math.round(total*100)/100,missedOpportunities:p.missedOpportunities,alternatives:p.alternatives,remediation:p.remediation,retryExercise:p.retryExercise,uncertainty:p.uncertainty,at,notice:'Educational AI/self feedback, not an authoritative hiring verdict. This score does not guarantee interview success.'};s.status='reviewed';
        }else{
          if(action==='resume_interview'){if(s.status!=='paused')fail(409,'Only paused sessions can resume.');s.status='active';s.startedAt=at;}
          else {if(s.status!=='active'&&!(action==='finish_interview'&&s.status==='paused'))fail(409,'This action requires an active interview.');
            if(action==='pause_interview'||action==='finish_interview'){if(s.status==='active'&&s.startedAt)s.elapsedMs+=Math.max(0,this.now()-Date.parse(s.startedAt));s.startedAt=null;s.status=action==='pause_interview'?'paused':'feedback_pending';if(action==='finish_interview')s.submittedAt=at;}
            if(action==='record_interview_turn')s.turns.push({id:randomUUID(),role:p.role,kind:p.kind,text:p.text,at});
            if(action==='request_interview_hint'){const hint=def.hints[s.hints.length];if(!hint)fail(409,'All prepared hints have been used.');s.hints.push({index:s.hints.length,text:hint,at});}
          }
        }
        s.revision++;s.updatedAt=at;this.store.put('sessions',s.id,s);return this.safeSession(s);
      }
      case 'get_interview_debrief': {
        const s=this.requireSession(p.sessionId);if(s.status==='active'||s.status==='paused'||this.activeSessions().some(a=>a.interviewId===s.interviewId))fail(403,'Finish the answering phase before opening the debrief.','ANSWER_PROTECTED');const def=this.definition(s);return {sessionId:s.id,referenceSolution:def.referenceSolution,debrief:def.debrief,remediation:def.remediation,rubric:def.rubric,changes:def.changes};
      }
      case 'export_data': if(this.activeSessions().length)fail(403,'Pause does not reveal solutions. Finish active interviews before exporting learner records.','ANSWER_PROTECTED');return this.exportRecords();
      case 'import_data': {if(this.activeSessions().length)fail(409,'Finish active interviews before importing records.');return this.importRecords(p.data,false);}
      case 'list_backups':return {backups:this.backups()};
      case 'get_workbook': return {title:'System Design Academy workbook',generatedAt:at,solutions:p.solutions,lessons:p.lessonIds.map((id:string)=>{const lesson=this.lesson(id,undefined,p.solutions);if(!p.solutions){for(const question of lesson.questions||[]){delete question.answer;delete question.explanation;}if('exercise'in lesson&&lesson.exercise)delete lesson.exercise.solution;lesson.flashcards=[];}return lesson;})};
      case 'get_project': case 'reveal_project': case 'get_project_reference': {
        const spec=this.content.projects.get(p.projectId);if(!spec)fail(404,'Project materials are not published.');
        const filenames:Record<string,string>={P1:'shortener',P2:'limiter',P3:'jobs',P4:'chat',P5:'events',P6:'gateway'};
        const protectedNow=spec.milestones.some((m:any)=>this.protectedLesson(m.lessonId));
        if(action!=='get_project'&&protectedNow)fail(403,'Project references are withheld during a related active assessment.','ANSWER_PROTECTED');
        if(action==='reveal_project')this.store.put('settings',`project-revealed:${p.projectId}`,{id:`project-revealed:${p.projectId}`,value:true});
        if(action==='get_project_reference'&&!this.store.get('settings',`project-revealed:${p.projectId}`)?.value)fail(403,'Explicitly reveal this project reference first.','ANSWER_PROTECTED');
        const source=action==='get_project'?'learner':'reference';return {...spec,referenceRevealed:!protectedNow&&!!this.store.get('settings',`project-revealed:${p.projectId}`)?.value,code:readFileSync(join(this.root,'projects',source,`${filenames[p.projectId]}.py`),'utf8'),codeType:source,language:'python'};
      }
      default:fail(404,'Unknown action.');
    }
  }
  exportRecords(){return {format:'system-design-academy',version:1,exportedAt:iso(this.now()),contentVersion:this.content.manifest.version,records:Object.fromEntries(tables.map(t=>[t,this.store.all(t)]))};}
  validateRecords(data:unknown){
    const parsed=exportSchema.parse(data);const recordSchemas:Record<Table,z.ZodType>={
      guide_progress:z.object({id:guideId,guideId,revision:z.number().int().min(1),openedAt:date,completedAt:date.nullable(),bookmarked:z.boolean(),position:z.string().max(100),updatedAt:date,attemptedAt:date.optional()}).strict(),
      guide_attempts:z.object({id:z.string().uuid(),guideId,contentVersion:z.string(),at:date,answers:z.record(z.string(),z.union([z.string(),z.number()])),results:z.array(z.record(z.string(),z.unknown())),score:z.number().min(0).max(100).nullable(),correct:z.number().int().nonnegative(),total:z.number().int().nonnegative()}).strict(),
      progress:z.object({id:z.string().regex(/^\d{3}$/),lessonId:z.string().regex(/^\d{3}$/),bookmarked:z.boolean(),openedAt:date.nullable(),completedAt:date.nullable(),demonstratedAt:date.nullable()}).passthrough(),
      notes:z.object({id:z.string().max(100),targetId:z.string().max(100),text:z.string().max(60000),revision:z.number().int().nonnegative(),updatedAt:date}).strict(),
      drafts:z.object({id:z.string().max(100),targetId:z.string().max(100),text:z.string().max(60000),revision:z.number().int().nonnegative(),updatedAt:date}).strict(),
      attempts:z.object({id:z.string().uuid(),lessonId:z.string().regex(/^\d{3}$/),contentVersion:z.string(),at:date,answers:z.record(z.string(),z.union([z.string(),z.number()])),results:z.array(z.record(z.string(),z.unknown())),score:z.number().min(0).max(100).nullable(),correct:z.number().int().nonnegative(),total:z.number().int().nonnegative(),hintsUsed:z.number().int().nonnegative()}).strict(),
      reviews:z.object({id:z.string().regex(/^(\d{3}:\d{1,3}|guide:[a-z0-9][a-z0-9-]{0,63}:\d{1,3})$/),cardId:z.string(),lessonId:z.string().regex(/^\d{3}$/).optional(),guideId:guideId.optional(),index:z.number().int().nonnegative(),intervalDays:z.number().nonnegative(),ease:z.number().min(1.3).max(3),repetitions:z.number().int().nonnegative(),dueAt:date,history:z.array(z.object({at:date,rating:z.number().int().min(0).max(3),intervalDays:z.number().nonnegative()}).strict())}).strict(),
      sessions:z.object({id:z.string().uuid(),interviewId:z.string().regex(/^interview_[a-zA-Z0-9_-]+$/),lessonId:z.string().regex(/^\d{3}$/),mode:z.enum(['coaching','exam']),status:z.enum(['active','paused','feedback_pending','reviewed']),revision:z.number().int().min(1),createdAt:date,updatedAt:date,startedAt:date.nullable(),elapsedMs:z.number().nonnegative(),turns:z.array(z.object({id:z.string().uuid(),role:z.enum(['candidate','interviewer']),kind:z.enum(['question','answer','artifact']),text:z.string().max(60000),at:date}).strict()),hints:z.array(z.object({index:z.number().int().nonnegative(),text:z.string().max(6000),at:date}).strict()),feedback:z.unknown().optional(),submittedAt:date.optional(),definitionVersion:z.string().optional(),definitionSnapshot:z.object({id:z.string(),lessonId:z.string(),title:z.string(),minutes:z.number().positive(),brief:z.string(),rubric:z.array(z.object({id:z.string(),label:z.string(),weight:z.number().nonnegative()})),hints:z.array(z.string()),clarifications:z.array(z.object({question:z.string(),answer:z.string()}))}).passthrough().optional()}).strict(),
      settings:z.object({id:z.string().regex(/^(revealed:\d{3}|project-revealed:P[1-6]|guide-revealed:[a-z0-9][a-z0-9-]{0,63})$/),value:z.boolean()}).strict(),
    };
    for(const table of tables){
      const seen=new Set<string>();
      for(const raw of parsed.records[table]){
        const r=recordSchemas[table].parse(raw) as any;
        if(seen.has(r.id))fail(400,'Duplicate record IDs in import.');seen.add(r.id);
        if('targetId'in r&&r.id!==r.targetId)fail(400,'Mismatched target ID.');
        if(table==='progress'&&r.id!==r.lessonId)fail(400,'Mismatched lesson ID.');
        if(table==='guide_progress'&&r.id!==r.guideId)fail(400,'Mismatched guide ID.');
        if(table==='reviews'&&((!!r.lessonId===!!r.guideId)||r.id!==r.cardId||r.id!==(r.guideId?`guide:${r.guideId}:${r.index}`:`${r.lessonId}:${r.index}`)))fail(400,'Mismatched review ID.');
        if(table==='sessions'){
          const definition=r.definitionSnapshot||this.content.interviews.get(r.interviewId);
          if(!definition)fail(400,`Unknown interview definition ${r.interviewId}; install the matching course before importing.`);
          if(definition.id!==r.interviewId||definition.lessonId!==r.lessonId)fail(400,'Session does not match its versioned interview definition.');
          if((r.status==='active')!==!!r.startedAt)fail(400,'Invalid timer state.');
          if(Math.abs(definition.rubric.reduce((n:number,d:any)=>n+d.weight,0)-100)>.001)fail(400,'Imported rubric weights must total 100.');
          if(r.feedback){
            if(r.status!=='reviewed')fail(400,'Only reviewed sessions may contain feedback.');
            const {total,at:feedbackAt,notice,...feedbackInput}=r.feedback;
            date.parse(feedbackAt);z.string().parse(notice);
            const feedback=actions.save_interview_feedback.parse({...feedbackInput,sessionId:r.id,revision:r.revision,idempotencyKey:'import-validation'});
            const ids=feedback.components.map(c=>c.dimensionId);
            if(new Set(ids).size!==ids.length||ids.length!==definition.rubric.length||definition.rubric.some((d:any)=>!ids.includes(d.id)))fail(400,'Imported feedback must contain every rubric dimension once.');
            for(const component of feedback.components){
              if(component.score>0&&!component.evidence.length)fail(400,'Imported positive scores require evidence.');
              for(const evidence of component.evidence){const turn=r.turns.find((t:any)=>t.id===evidence.turnId);if(!turn||turn.role!=='candidate'||!turn.text.includes(evidence.quote))fail(400,'Imported feedback evidence does not match a candidate turn.');}
            }
            const expected=definition.rubric.reduce((sum:number,d:any)=>sum+feedback.components.find(c=>c.dimensionId===d.id)!.score*d.weight/4,0);
            if(typeof total!=='number'||Math.abs(total-Math.round(expected*100)/100)>.001)fail(400,'Imported feedback total does not match its weighted components.');
          }else if(r.status==='reviewed')fail(400,'Reviewed session is missing its feedback.');
        }
      }
    }
    return parsed;
  }
  importRecords(data:unknown,replace:boolean){const parsed=this.validateRecords(data);let imported=0;let skipped=0;for(const table of tables){if(replace)this.store.db.exec(`DELETE FROM ${table}`);for(const r of parsed.records[table]){if(!replace&&this.store.get(table,String(r.id))){skipped++;continue;}this.store.put(table,String(r.id),r);imported++;}}if(replace)this.store.db.exec('DELETE FROM idempotency');return {imported,skipped,mode:replace?'restore':'merge-existing-records-preserved',contentVersion:parsed.contentVersion,warnings:parsed.contentVersion!==this.content.manifest.version?['Content versions differ; historical attempt versions are retained.']:[]};}
  backups(){const dir=join(this.dataDir,'backups');mkdirSync(dir,{recursive:true});return readdirSync(dir).filter(n=>/^backup-[\dT-]+-[a-f0-9]{8}\.sqlite$/.test(n)).map(backupId=>({backupId,bytes:statSync(join(dir,backupId)).size})).sort((a,b)=>b.backupId.localeCompare(a.backupId));}
  async asyncAction(action:ActionName,p:any):Promise<any>{
    if(action==='create_backup'){const dir=join(this.dataDir,'backups');mkdirSync(dir,{recursive:true});const backupId=`backup-${iso(this.now()).replace(/[:.Z]/g,'-')}-${randomBytes(4).toString('hex')}.sqlite`;await backup(this.store.db,join(dir,backupId));return {backupId};}
    if(action==='restore_backup'){
      if(this.restoring)fail(409,'A database restore is already in progress.','RESTORE_IN_PROGRESS');
      this.restoring=true;
      try {
      if(this.activeSessions().length)fail(409,'Finish active interviews before restoring a backup.');if(!this.backups().some(b=>b.backupId===p.backupId))fail(404,'Unknown backup.');
      const source=new DatabaseSync(join(this.dataDir,'backups',p.backupId),{readOnly:true});let data:any;
      try {const integrity=source.prepare('PRAGMA integrity_check').get();if(integrity?.integrity_check!=='ok')fail(400,'Backup integrity check failed.');const version=Number(source.prepare('PRAGMA user_version').get()?.user_version);if(version<1||version>3)fail(400,'Unsupported backup schema.');data={...this.exportRecords(),records:Object.fromEntries(tables.map(t=>[t,version<3&&t.startsWith('guide_')?[]:source.prepare(`SELECT data FROM ${t}`).all().map(r=>JSON.parse(String(r.data)))]))};this.validateRecords(data);}finally{source.close();}
      const safetyBackup=await this.asyncAction('create_backup',{});const result=this.store.transaction(()=>this.importRecords(data,true));return {...result,safetyBackup};
      } finally {this.restoring=false;}
    }
  }
}
