# Connect an AI client

The academy reader works offline without an API key. The MCP adapter contains no model. Your chosen AI client may require its own account and connection; text returned by tools and conversation content can be sent to that provider. The database, notes, source course, and backups stay on this computer unless you export or share them. Review the client's data policy before sending sensitive notes.

## Verified protocol path

The integration suite starts an official MCP SDK Client and a separate StdioClientTransport subprocess on Windows. It verifies discovery, bounded retrieval, a saved study action, interview pause/resume, reveal refusal, feedback persistence, prompts, and resources. This verifies real MCP stdio communication.

An actual signed-in Codex CLI connection was also tested on29September2026 with the user's explicit permission to send the introductory section. Codex launched the adapter, called `get_lesson` with `lessonId="001", sectionId="start"`, received the section, and correctly reported its IDs and title. Evidence: `artifacts/client/codex-report.json`, `codex-events.jsonl`, and `codex-final.txt`. This was a one-shot read-only test using ephemeral command-line configuration; it did not alter personal client settings or learner records. A full model-led learner interview was not performed.

Observed local CLI: codex-cli 0.158.0-alpha.2.1. Official documentation checked 29 September 2026: [MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) supports stdio command, args, env, and cwd. [Windows support](https://learn.chatgpt.com/docs/windows/windows-sandbox) documents native operation; WSL is an alternative. The CLI's `codex mcp --help` was executed locally. No personal client configuration was changed by this build.

## Windows configuration

First run `npm start` in the project and leave it running. Add this entry to your chosen local Codex configuration yourself. Literal TOML strings preserve Windows backslashes and spaces:

```toml
[mcp_servers.system_design_academy]
command = 'C:\Program Files\nodejs\node.exe'
args = ['D:\AIOps Infra Path\Learning\System Design\node_modules\tsx\dist\cli.mjs', 'D:\AIOps Infra Path\Learning\System Design\mcp\index.ts']
cwd = 'D:\AIOps Infra Path\Learning\System Design'
startup_timeout_sec = 20
tool_timeout_sec = 40
```

An equivalent PowerShell CLI command is:

```powershell
codex mcp add system_design_academy -- 'C:\Program Files\nodejs\node.exe' 'D:\AIOps Infra Path\Learning\System Design\node_modules\tsx\dist\cli.mjs' 'D:\AIOps Infra Path\Learning\System Design\mcp\index.ts'
codex mcp list
```

The adapter resolves the project from its own file, so the absolute command does not depend on the client's initial working directory. If you move the folder or use a different Node installation, regenerate these paths. The backend and adapter must share ACADEMY_DATA_DIR if customized. ACADEMY_URL defaults to http://127.0.0.1:4310. Remote URLs are rejected.

The client starts the stdio adapter. Do not run it as another persistent web server. Operational errors go to stderr; stdout carries protocol messages. Closing the client closes stdin and the adapter. Stop the study app with Ctrl+C. The adapter returns a clear backend-unavailable error if the web process is stopped.

## First study-to-interview session

1. Read L001, save a note, attempt the questions, and compare the exercise solution. Completion is self-reported; objective evidence is recorded separately.
2. Study L002–L004, then choose interview_001 (L005) in Interview practice. Select coaching or exam mode and copy the AI interviewer instruction.
3. Paste it into the connected local AI client. If the website already started a session, give its unique session ID and ask the client to resume it. Otherwise say “Start interview_001.”
4. The client uses tools to record actual questions and answers. Tell it when to pause; the saved timer and revision survive restarts.
5. Submit the answering phase. The client saves rubric feedback using actual quoted candidate turns. Refresh the website to see the feedback and targeted retry. Without a model, use the explicit self-assessment form.

Use `npm run doctor` with the backend running. It checks runtime/assets, data/token presence, backend health, and official SDK subprocess discovery/retrieval without printing the token.

## Hosted browser clients and limits

Hosted ChatGPT web does not read this computer's local Codex configuration. A loopback address in another environment points to that environment, not this machine. No tunnel, public port, remote transport, or cloud hosting is configured. Local MCP does not imply local model inference. Account availability and organization policy depend on the selected client; no paid account is required for ordinary offline course features.

The official SDK version and negotiated supported protocol are pinned in package-lock.json. A successful SDK test does not establish that every desktop/client/OS combination was tested. Record actual live-client verification in QA_REPORT.md, not by inference from these instructions.
