import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { Engine, CourseError } from './engine.js';

export async function startServer(options:{root?:string;dataDir?:string;port?:number;dev?:boolean;quiet?:boolean}={}) {
  const root=options.root||resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const dataDir=resolve(options.dataDir||process.env.ACADEMY_DATA_DIR||resolve(root,'data'));
  const port=options.port??Number(process.env.PORT||4310);
  if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT must be a valid local port.');
  mkdirSync(dataDir,{recursive:true});
  const tokenPath=resolve(dataDir,'.mcp-token');
  if(!existsSync(tokenPath))writeFileSync(tokenPath,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
  const mcpToken=readFileSync(tokenPath,'utf8').trim();
  if(!/^[a-f0-9]{64}$/.test(mcpToken))throw new Error('Invalid MCP token file. Preserve learner data and repair only the token file.');
  const csrfToken=randomBytes(32).toString('hex');const engine=new Engine(root,dataDir);
  let actualPort=port;
  const vite=options.dev?await (await import('vite')).createServer({root,server:{middlewareMode:true,host:'127.0.0.1'},appType:'spa'}):null;
  const equal=(a:string|undefined,b:string)=>{if(!a)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
  const respond=(res:ServerResponse,status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const server=createServer(async(req:IncomingMessage,res:ServerResponse)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self'${options.dev?" 'unsafe-inline'":''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'${options.dev?' ws://127.0.0.1:* ws://localhost:*':''}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`);
    try{
      const allowedHosts=new Set([`127.0.0.1:${actualPort}`,`localhost:${actualPort}`]);
      if(!allowedHosts.has(req.headers.host||''))throw new CourseError(403,'Invalid Host header. Use the local 127.0.0.1 or localhost address.','HOST_REJECTED');
      const origin=req.headers.origin;
      if(origin&&!new Set([`http://127.0.0.1:${actualPort}`,`http://localhost:${actualPort}`]).has(origin))throw new CourseError(403,'Cross-origin requests are not allowed.','ORIGIN_REJECTED');
      const url=new URL(req.url||'/',`http://127.0.0.1:${actualPort}`);
      if(url.pathname.startsWith('/api/')){
        if(req.method==='GET'){
          if(url.pathname==='/api/health')return respond(res,200,{ok:true,version:'0.1.0',schemaVersion:3,contentVersion:engine.content.manifest.version});
          if(url.pathname==='/api/learning-path')return respond(res,200,engine.execute('get_learning_path',{}));
          const guideMatch=url.pathname.match(/^\/api\/guides\/([a-z0-9][a-z0-9-]{0,63})$/);if(guideMatch)return respond(res,200,engine.execute('get_guide',{guideId:guideMatch[1]}));
          if(url.pathname==='/api/catalog')return respond(res,200,{...engine.content.manifest,lessons:engine.content.manifest.lessons.map(l=>({...l,status:engine.content.lessons.get(l.id)?.status||'metadata-only'})),projects:engine.content.manifest.projects.map((p:any)=>engine.content.projects.get(p.id)||p),glossary:engine.content.glossary,contentCounts:{catalog:engine.content.manifest.lessons.length,published:engine.content.lessons.size,interviews:engine.content.interviews.size}});
          if(url.pathname==='/api/glossary')return respond(res,200,engine.content.glossary);
          const projectMatch=url.pathname.match(/^\/api\/projects\/(P[1-6])$/);if(projectMatch)return respond(res,200,engine.execute('get_project',{projectId:projectMatch[1]}));
          if(url.pathname==='/api/state')return respond(res,200,{...engine.state(),csrfToken});
          if(url.pathname==='/api/interviews')return respond(res,200,engine.execute('list_interviews',{}));
          if(url.pathname==='/api/search')return respond(res,200,engine.execute('search_course',{query:url.searchParams.get('q')||'',offset:Number(url.searchParams.get('offset')||0),limit:Number(url.searchParams.get('limit')||12)}));
          const match=url.pathname.match(/^\/api\/lessons\/(\d{3})$/);if(match)return respond(res,200,engine.execute('get_lesson',{lessonId:match[1]}));
        }
        const match=url.pathname.match(/^\/api\/actions\/([a-z_]+)$/);
        if(req.method==='POST'&&match){
          const auth=req.headers.authorization;const trustedMcp=equal(typeof auth==='string'&&auth.startsWith('Bearer ')?auth.slice(7):undefined,mcpToken);
          if(!trustedMcp&&!equal(typeof req.headers['x-academy-csrf']==='string'?req.headers['x-academy-csrf']:undefined,csrfToken))throw new CourseError(403,'Missing or expired local request token. Refresh the page.','CSRF_REJECTED');
          if(!req.headers['content-type']?.startsWith('application/json'))throw new CourseError(415,'Use application/json.');
          const chunks:Buffer[]=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>12*1024*1024)throw new CourseError(413,'Request exceeds the 12 MB limit.');chunks.push(Buffer.from(chunk));}
          let payload:unknown;try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new CourseError(400,'Malformed JSON request.');}
          const result=await engine.execute(match[1],payload);return respond(res,200,result);
        }
        return respond(res,404,{error:'Unknown API endpoint.',code:'NOT_FOUND'});
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return respond(res,405,{error:'Method not allowed.'});
      if(vite){vite.middlewares(req,res,()=>respond(res,404,{error:'Not found.'}));return;}
      const dist=resolve(root,'dist');let pathname:string;try{pathname=decodeURIComponent(url.pathname);}catch{throw new CourseError(400,'Invalid URL encoding.');}
      let path=resolve(dist,'.'+pathname);if(path!==dist&&!path.startsWith(dist+sep))throw new CourseError(403,'Invalid asset path.');
      if(!extname(path))path=resolve(dist,'index.html');
      if(!existsSync(path))return respond(res,404,{error:'Application assets are unavailable. Run npm run build, then npm start.'});
      const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
      res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':path.includes(`${sep}assets${sep}`)?'public, max-age=31536000, immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:await readFile(path));
    }catch(error){if(res.headersSent){res.end();return;}if(error instanceof z.ZodError)return respond(res,400,{error:'Invalid request fields.',code:'VALIDATION_ERROR',details:error.issues.map(i=>({path:i.path,message:i.message}))});if(error instanceof CourseError)return respond(res,error.status,{error:error.message,code:error.code});console.error('[academy] Request failed:',error instanceof Error?error.message:'unknown error');respond(res,500,{error:'The operation could not be completed. Learner data has not been reset.',code:'INTERNAL_ERROR'});}
  });
  await new Promise<void>((ok,bad)=>{server.once('error',bad);server.listen(port,'127.0.0.1',()=>{server.off('error',bad);ok();});});
  const address=server.address();actualPort=typeof address==='object'&&address?address.port:port;
  if(!options.quiet)console.error(`System Design Academy: http://127.0.0.1:${actualPort}\nLearner data: ${dataDir}\nPress Ctrl+C to stop.`);
  const close=async()=>{await vite?.close();await new Promise<void>((ok,bad)=>server.close(e=>e?bad(e):ok()));engine.close();};
  return {server,engine,port:actualPort,csrfToken,close};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  startServer({dev:process.argv.includes('--dev')}).then(app=>{
    let stopping=false;const stop=()=>{if(stopping)return;stopping=true;app.close().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});};process.on('SIGINT',stop);process.on('SIGTERM',stop);
  }).catch(error=>{console.error(error?.code==='EADDRINUSE'?'Academy port is already in use. Reuse the running application or set PORT to a different local port.':error);process.exitCode=1;});
}
