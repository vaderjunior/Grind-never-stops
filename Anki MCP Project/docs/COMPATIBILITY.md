# Compatibility observations

Observed on 2026-09-29 in the project's Windows PowerShell environment.
These are local observations, not selected dependency versions or compatibility proof.

| Component | Command | Observed result |
|---|---|---|
| Node.js | `node --version` | `v24.13.0` |
| npm | `npm --version` | `11.6.2` |
| Git | `git --version` | `git version 2.51.2.windows.1` |
| Python | `python --version` | Command not recognized |
| Docker | `docker version` | Command not recognized |
| Docker Compose | `docker compose version` | `docker` command not recognized |

An unavailable command does not prove the software is absent from the computer.
Check the intended installation and shell PATH before choosing an installation.

TypeScript, MCP packages and other application dependencies have not been selected,
installed or tested for this project. Verify current official documentation and
record exact versions when introducing them. The build guide's version claims
have not been independently verified in this session.
