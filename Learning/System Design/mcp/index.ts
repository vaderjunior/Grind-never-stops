import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { actions, actionDescriptions, readActions, type ActionName } from '../shared/schemas.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=resolve(process.env.ACADEMY_DATA_DIR||resolve(root,'data'));
const base=new URL(process.env.ACADEMY_URL||`http://127.0.0.1:${process.env.PORT||4310}`);
if(base.protocol!=='http:'||!['127.0.0.1','localhost'].includes(base.hostname)||base.username||base.password||base.pathname!=='/')throw new Error('ACADEMY_URL must be a loopback HTTP origin, for example http://127.0.0.1:4310.');

async function invoke(name:ActionName,payload:unknown,signal?:AbortSignal){
  let token:string;try{token=readFileSync(resolve(dataDir,'.mcp-token'),'utf8').trim();}catch{throw new Error(`Academy backend is not initialized. Start npm start in ${root} first. ACADEMY_DATA_DIR must match the backend.`);}
  let response:Response;
  try{response=await fetch(new URL(`/api/actions/${name}`,base),{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});}catch(error){if(signal?.aborted)throw new Error('Course operation was cancelled. For writes, check saved state before retrying with the same idempotency key.');throw new Error(`Academy backend is unavailable at ${base.origin}. Start npm start first. The MCP adapter does not start a second backend.`);}
  const result=await response.json() as any;if(!response.ok)throw new Error(`${result.code||response.status}: ${result.error}${result.details?` ${JSON.stringify(result.details)}`:''}`);return result;
}
const server=new McpServer({name:'system-design-academy',version:'0.1.0'},{instructions:'Use bounded retrieval, cite course://lessons/NNN#section IDs, and distinguish additions beyond course coverage. Persist actual candidate and interviewer turns explicitly. Do not inspect reference solution files during active interviews. AI feedback is educational judgment, not a hiring verdict. Use new idempotency keys for new writes and reuse the original key only when retrying the identical request.'});
for(const [name,schema] of Object.entries(actions)){
  const action=name as ActionName;
  server.registerTool(name,{description:actionDescriptions[action],inputSchema:schema,annotations:{readOnlyHint:readActions.has(action),destructiveHint:action==='restore_backup',idempotentHint:readActions.has(action)||'idempotencyKey'in schema.shape,openWorldHint:false}},async(payload:unknown,extra:{signal:AbortSignal})=>{
    try{const result=await invoke(action,payload,extra.signal);return {content:[{type:'text' as const,text:JSON.stringify(result)}]};}
    catch(error){return {isError:true,content:[{type:'text' as const,text:error instanceof Error?error.message:'Course operation failed.'}]};}
  });
}
server.registerResource('study-state','course://study-state',{description:'Saved learner state and next-step suggestion.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await invoke('get_study_state',{}))}]}));
server.registerResource('lesson',new ResourceTemplate('course://lessons/{lessonId}',{list:undefined}),{description:'One published lesson with server-enforced reveal rules.',mimeType:'application/json'},async(uri,{lessonId})=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await invoke('get_lesson',{lessonId}))}]}));
server.registerResource('learning-path','course://learning-path',{description:'Six-month guided learning path and publication availability.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await invoke('get_learning_path',{}))}]}));
server.registerResource('guide',new ResourceTemplate('course://guides/{guideId}',{list:undefined}),{description:'One beginner-path guide with explicit solution reveal.',mimeType:'application/json'},async(uri,{guideId})=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await invoke('get_guide',{guideId}))}]}));
const promptTexts={
  tutor:'For a beginner, start with get_learning_path and get_guide for the appropriate published guide. Cite course://guides/slug. For deeper legacy material use search_course and get_lesson for needed sections. Ask what the learner predicts before explaining the mechanism. Identify assumptions, uncertainty, and additions beyond the course. Never mark completion without learner instruction or claim unavailable content was retrieved.',
  quiz:'Retrieve the selected guide or lesson without revealing answers. Ask one question at a time. Persist actual responses with submit_guide_quiz or submit_quiz_attempt using a unique idempotency key. Objective scoring belongs to the engine. Label open-ended judgment as AI feedback, and cite the rubric. Quiz scores do not establish interview readiness.',
  interviewer:'Start the requested stable interview ID with start_interview or resume the supplied session ID using get_interview_session. Present only its brief, ask one question at a time, and invite clarifying questions. Record actual candidate and interviewer turns with explicit attribution, current revision, and unique idempotency keys. In exam mode withhold coaching unless requested. Use request_interview_hint for hints so they are recorded. Support pause_interview and resume_interview. Never inspect solution files or reveal reference reasoning during an active attempt. Finish with finish_interview, then save_interview_feedback using every weighted dimension and exact quotes from candidate turn IDs; never invent transcript evidence or a score. Explain uncertainty and educational limitations.',
  debrief:'Use get_interview_session followed by get_interview_debrief after answering has ended. Compare actual decisions with defensible reference alternatives. Ground feedback in exact candidate quotes, distinguish self/AI judgment from deterministic scoring, and propose a focused retry with targeted lesson IDs. Never claim interview success is guaranteed.',
};
for(const [name,instruction]of Object.entries(promptTexts))server.registerPrompt(`academy_${name}`,{description:`Reusable ${name} instructions`,argsSchema:{reference:z.string().max(100).optional()}},({reference})=>({messages:[{role:'user',content:{type:'text',text:`${instruction}${reference?`\nRequested reference: ${reference}`:''}`}}]}));
await server.connect(new StdioServerTransport());
let closing=false;async function close(){if(closing)return;closing=true;await server.close();}
process.stdin.on('end',()=>{void close();});process.on('SIGINT',()=>{void close();});process.on('SIGTERM',()=>{void close();});
