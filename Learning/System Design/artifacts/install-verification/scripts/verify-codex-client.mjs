import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve('.');const out=resolve('artifacts/client');mkdirSync(out,{recursive:true});
const literal=value=>`'${value.replaceAll("'","''")}'`;
const config=`mcp_servers.system_design_academy={command=${literal(process.execPath)},args=[${literal(resolve('node_modules/tsx/dist/cli.mjs'))},${literal(resolve('mcp/index.ts'))}],cwd=${literal(root)},startup_timeout_sec=20,tool_timeout_sec=40}`;
// A one-shot read-only client smoke test. No personal Codex configuration is modified.
const prompt='This is an explicitly authorized read-only MCP connection smoke test, not course implementation. Use only the system_design_academy MCP get_lesson tool, with lessonId 001 and sectionId start. Do not run shell commands, inspect files, write notes, alter progress, reveal solutions, or start interviews. Retrieve that single section, then report its exact lesson ID, section ID, title, and one sentence on its subject. If the MCP tool is unavailable, report the failure honestly. Stop after that report.';
const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--color','never','--json','-C',root,'-c',config,'-o',resolve(out,'codex-final.txt'),prompt];
const child=spawn('codex',args,{stdio:['ignore','pipe','pipe'],windowsHide:true});let stdout='',stderr='';
child.stdout.on('data',chunk=>{stdout+=chunk;});child.stderr.on('data',chunk=>{stderr+=chunk;});
const timeout=setTimeout(()=>child.kill(),180000);
child.on('error',error=>{stderr+=String(error);});
child.on('close',(code,signal)=>{clearTimeout(timeout);writeFileSync(resolve(out,'codex-events.jsonl'),stdout);writeFileSync(resolve(out,'codex-stderr.txt'),stderr);const events=stdout.split('\n').filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});const calls=events.filter(event=>JSON.stringify(event).includes('get_lesson'));const report={client:'Codex CLI',exitCode:code,signal,observedGetLessonEvents:calls.length,passed:code===0&&calls.some(event=>JSON.stringify(event).includes('completed')),configuration:'ephemeral command-line overrides; user config ignored, authentication unchanged',limitations:['One bounded read-only retrieval; no model-led learner interview was conducted.']};writeFileSync(resolve(out,'codex-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)console.log(stderr.slice(-3000));process.exitCode=report.passed?0:1;});
