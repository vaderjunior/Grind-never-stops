import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Interview, Lesson, LessonMeta, Module, Guide } from './types.js';
export class Content {
  manifest: {version:string;modules:Module[];lessons:LessonMeta[];projects:unknown[];routes:Record<string,string[]>;[key:string]:unknown};
  lessons = new Map<string, Lesson>();
  interviews = new Map<string, Interview>();
  projects = new Map<string, any>();
  glossary:unknown=[];
  guides = new Map<string,Guide>();
  learningPath:any=null;
  constructor(public root:string) {
    this.manifest = JSON.parse(readFileSync(join(root,'content','manifest.json'),'utf8'));
    this.manifest.version=String(this.manifest.version);
    for (const meta of this.manifest.lessons) {
      const path = join(root,'content','lessons',`${meta.id}.json`);
      if (existsSync(path)) {const lesson={...meta,...JSON.parse(readFileSync(path,'utf8'))};lesson.version=String(lesson.version);this.lessons.set(meta.id, lesson);}
    }
    const dir = join(root,'content','interviews');
    if (existsSync(dir)) for (const file of readdirSync(dir).filter(x=>/^interview_[a-zA-Z0-9_-]+\.json$/.test(x))) {
      const definition=JSON.parse(readFileSync(join(dir,file),'utf8')) as Interview;
      this.interviews.set(definition.id,definition);
    }
    for(const projectId of ['P1','P2','P3','P4','P5','P6']) {const path=join(root,'content','projects',`${projectId}.json`);if(existsSync(path))this.projects.set(projectId,JSON.parse(readFileSync(path,'utf8')));}
    const glossary=join(root,'content','glossary.json');if(existsSync(glossary))this.glossary=JSON.parse(readFileSync(glossary,'utf8'));
    const path=join(root,'content','learning-path.json');if(existsSync(path))this.learningPath=JSON.parse(readFileSync(path,'utf8'));
    const guides=join(root,'content','guides');
    if(existsSync(guides))for(const file of readdirSync(guides).filter(name=>/^[a-z0-9][a-z0-9-]{0,63}\.json$/.test(name))){
      const guide=JSON.parse(readFileSync(join(guides,file),'utf8'));
      if(guide.id!==file.slice(0,-5)||!Array.isArray(guide.sections)||!guide.sections.length||!Array.isArray(guide.questions))throw new Error(`Invalid published guide ${file}`);
      guide.version=String(guide.version);this.guides.set(guide.id,guide);
    }
  }
  meta(id:string) { return this.manifest.lessons.find(l=>l.id===id); }
  interview(id:string) { return this.interviews.get(id) || [...this.interviews.values()].find(i=>i.aliases?.includes(id)); }
}
