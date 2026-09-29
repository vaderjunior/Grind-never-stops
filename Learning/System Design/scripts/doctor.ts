import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=resolve(process.env.ACADEMY_DATA_DIR||resolve(root,'data'));
const base=process.env.ACADEMY_URL||`http://127.0.0.1:${process.env.PORT||4310}`;
const checks:{name:string;ok:boolean;detail:string}[]=[];
checks.push({name:'Node runtime',ok:Number(process.versions.node.split('.')[0])>=24,detail:process.version});
checks.push({name:'Built application',ok:existsSync(resolve(root,'dist/index.html')),detail:resolve(root,'dist')});
checks.push({name:'Curriculum manifest',ok:existsSync(resolve(root,'content/manifest.json')),detail:resolve(root,'content/manifest.json')});
checks.push({name:'Learner data directory',ok:existsSync(dataDir),detail:dataDir});
checks.push({name:'Local MCP credential',ok:existsSync(resolve(dataDir,'.mcp-token')),detail:'Presence checked; secret is never printed.'});
try{const response=await fetch(`${base}/api/health`,{signal:AbortSignal.timeout(3000)});const health=await response.json();checks.push({name:'Backend',ok:response.ok&&health.ok,detail:base});}catch(e){checks.push({name:'Backend',ok:false,detail:`Unavailable at ${base}. Run npm start in a separate terminal.`});}
const client=new Client({name:'academy-doctor',version:'1.0.0'});
const transport=new StdioClientTransport({command:process.execPath,args:[resolve(root,'node_modules/tsx/dist/cli.mjs'),resolve(root,'mcp/index.ts')],cwd:root,env:{...Object.fromEntries(Object.entries(process.env).filter((entry):entry is [string,string]=>entry[1]!==undefined)),ACADEMY_DATA_DIR:dataDir,ACADEMY_URL:base},stderr:'pipe'});
let stderr='';transport.stderr?.on('data',chunk=>{stderr+=String(chunk);});
try{
 await client.connect(transport);const listing=await client.listTools();checks.push({name:'MCP stdio discovery',ok:listing.tools.some(t=>t.name==='get_lesson'),detail:`${listing.tools.length} tools discovered through a real subprocess.`});
 const result=await client.callTool({name:'get_lesson',arguments:{lessonId:'001',sectionId:'start'}});
 checks.push({name:'MCP bounded retrieval',ok:!result.isError,detail:result.isError?JSON.stringify(result.content):'L001/start retrieved without writing learner state.'});
}catch(e){checks.push({name:'MCP stdio',ok:false,detail:e instanceof Error?e.message:String(e)});}finally{await client.close();}
for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'} ${c.name}: ${c.detail}`);
if(checks.some(c=>!c.ok))process.exitCode=1;
