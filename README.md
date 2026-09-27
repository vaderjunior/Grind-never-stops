Yes—**the courses should sit inside the roadmap, beside the infrastructure topic you’re learning at the same time.**

Below is **only the first block, ending at Kubernetes + Helm**. Continue your existing Docker course; do not restart it. The week numbers are flexible estimates from where you are now, **including practice and the parallel track**.

## Your two-track roadmap

```text
              AI PLATFORM & BACKEND INFRASTRUCTURE
                       ~1–2 hours/day

       MAIN TRACK                         PARALLEL TRACK
       About 70% of your time              About 30% of your time
       Courses + infrastructure labs       TypeScript + MCP + OAuth

────────────────────────────────────────────────────────────────────────

1. FINISH DOCKER + SYSTEMS BASICS          TYPESCRIPT + MCP FOUNDATIONS
   Approximately weeks 1–2                 Start these NOW
   ← YOU ARE HERE
                                          TypeScript: course [3]
   KodeKloud Docker Beginner [1]           ├─ types and interfaces
   ├─ Dockerfile and image builds         ├─ functions and objects
   ├─ layers and build cache              ├─ unions and optional values
   ├─ ports and environment variables     └─ read one SAP tool handler
   ├─ volumes and networking
   └─ logs and troubleshooting            Hugging Face MCP: Unit 1 [4]
                                          ├─ host / client / server
   Selected systems lessons [2]           ├─ tools / resources / prompts
   ├─ Linux commands and processes        ├─ schemas and tool discovery
   ├─ IP addresses, ports and DNS         └─ stdio versus remote HTTP
   └─ HTTP / HTTPS / TLS
                                          CONNECT TO YOUR WORK:
   BUILD:                                 Trace one tool call from
   Containerize a tiny service.            the MCP client to its handler.
   Run it with ports and env vars.         Identify what runs locally
   Break something and diagnose it.        and what will run in Kyma.

                 ↓                                     ↓

2. KUBERNETES FOUNDATIONS                  BUILD A SMALL MCP SERVICE
   Approximately weeks 3–5                + UNDERSTAND ITS AUTH FLOW

   KodeKloud Kubernetes Beginner [5]       Continue TypeScript [3]
   ├─ Pods, Deployments, ReplicaSets       ├─ modules and imports
   ├─ Services and service discovery      ├─ promises and async/await
   ├─ namespaces and YAML                 ├─ error handling
   └─ kubectl: get / describe / logs      └─ npm scripts and builds

   Focused Kubernetes practice [8]         MCP practical work [4] + [6]
   ├─ ConfigMaps and Secrets              ├─ selected Unit 2 examples
   ├─ readiness and liveness probes       ├─ one read-only TypeScript tool
   ├─ CPU/memory requests and limits      ├─ input validation and errors
   └─ service-account/access basics       └─ connect a client over HTTP

   BUILD:                                 OAuth overview [7]
   Deploy your service using               ├─ client / resource server / IdP
   ordinary Kubernetes YAML first.        ├─ discovery and .well-known
   Reach it through a Service.            └─ access token → permission check
   Diagnose a wrong port or bad image.
                                          WEEKLY DESIGN PRACTICE:
                                          “Where could a request fail
                                          between client and container?”

                 ↓                                     ↓

3. HELM + YOUR KYMA DEPLOYMENT             MCP AUTH + CLIENT INTEGRATION
   Approximately weeks 6–7

   KodeKloud Helm for Beginners [9]        Follow the auth walkthrough [7]
   ├─ Chart.yaml and chart structure      ├─ protected-resource metadata
   ├─ values.yaml and overrides           ├─ authorization-server metadata
   ├─ templates and helper templates      ├─ registration: DCR/pre-registered
   ├─ conditionals and loops              │  or other supported mechanism
   └─ releases, upgrades and rollback     ├─ token validation
                                          └─ per-tool authorization
   PRACTISE:
   helm lint                              APPLY TO YOUR PROJECT:
   helm template                          Trace its actual auth flow.
   helm install / upgrade / rollback      Test missing/expired tokens
                                          and insufficient permissions.
   BUILD:
   Package the same service as a chart.   Check client/plugin packaging:
   Change configuration through values.  what ships locally, what runs
   Inspect the rendered Kubernetes YAML. remotely, and where config lives.
   Deploy in a local/approved sandbox.
                                          WEEKLY DESIGN PRACTICE:
                                          “How do I deploy a new version
                                          without exposing an unready app?”

                 └──────────────────┬──────────────────┘
                                    ↓

                         END-OF-BLOCK CHECKPOINT

              Explain and demonstrate the same service through:

                 TypeScript → MCP → Docker → Kubernetes → Helm

              Trace its network and authorization paths separately.
              Diagnose a deployment failure and a permission failure.

              STOP HERE. Populate the next block after this.
```

## How to follow the two columns

**The right column is a rotation, not three additional courses every evening.**

| Your available time | Main track, including its lab | One parallel topic |
|---|---:|---:|
| **1 hour** | 45 minutes | 15 minutes |
| **90 minutes** | 60 minutes | 30 minutes |
| **2 hours** | 85 minutes | 35 minutes |

For example, use **Monday/Wednesday/Friday for TypeScript**, and **Tuesday/Thursday for MCP**, shifting some MCP sessions toward OAuth as you progress. Use a weekend session to connect the pieces and explain one design question aloud.

**Use the same small practice service throughout.** Start with a simple HTTP endpoint if necessary, add an MCP tool, then carry that service through Docker, Kubernetes and Helm. Do not build a separate project for every course.

## Courses and references

The numbers below match the diagram. **“Selected lessons” and “reference” do not mean another course to complete in full.**

| Ref. | Exact resource | What to do |
|---|---|---|
| **[1]** | [KodeKloud — Docker Training Course for the Absolute Beginner](https://kodekloud.com/courses/docker-training-course-for-the-absolute-beginner) | **Continue the Udemy course you already own.** Prioritize builds, run commands, environment variables, storage, networking and its exercises. The official syllabus includes these areas. :chatgpt-content-reference{index="0"} |
| **[2]** | [KodeKloud — DevOps Pre-Requisite Course](https://kodekloud.com/courses/devops-pre-requisite-course) | **Selected lessons only:** Linux Basics, Networking Basics, DNS, IPs and Ports, and SSL & TLS Basics. Use the NodeJS/NPM lessons if those concepts are unclear. Skip the unrelated Java/database sections. :chatgpt-content-reference{index="1"} |
| **[3]** | [Matt Pocock — Beginner’s TypeScript](https://www.totaltypescript.com/tutorials/beginners-typescript) | Your main TypeScript introduction: **18 exercise-based lessons**. It assumes working JavaScript knowledge. For gaps in modules, promises or error handling, use the relevant sections of the [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide), rather than starting a whole frontend course. :chatgpt-content-reference{index="2"} |
| **[4]** | **Hugging Face MCP Course:** [Unit 1 — Fundamentals](https://huggingface.co/learn/mcp-course/unit1/introduction) → [Unit 2 — End-to-End Application](https://huggingface.co/learn/mcp-course/unit2/introduction) | **Complete Unit 1.** In Unit 2, focus on creating the server and connecting clients. Its project uses Gradio/Hugging Face, so treat that as an example—not a requirement to adopt that stack at SAP. Skip the additional deployment/bonus work for now. :chatgpt-content-reference{index="3"} |
| **[5]** | [KodeKloud — Kubernetes for the Absolute Beginners](https://kodekloud.com/courses/kubernetes-for-the-absolute-beginners-hands-on-tutorial) | **Use your existing Udemy purchase.** Follow the Pods, YAML, ReplicaSets, Deployments, Services and application-deployment lessons and labs. :chatgpt-content-reference{index="4"} |
| **[6]** | [Official MCP — Build an MCP Server](https://modelcontextprotocol.io/docs/develop/build-server) and [TypeScript SDK documentation](https://ts.sdk.modelcontextprotocol.io/) | Choose the **TypeScript** walkthrough, then the SDK’s server/transport examples for **stdio and Streamable HTTP**. Build one read-only tool; you do not need to implement the protocol yourself. Match the documentation to your project’s SDK version. :chatgpt-content-reference{index="5"} |
| **[7]** | [Official MCP — Understanding Authorization](https://modelcontextprotocol.io/docs/tutorials/security/authorization) | Start with **“The Authorization Flow: Step by Step.”** Then study the TypeScript implementation alongside your SAP code. The tutorial covers discovery, registration, obtaining tokens and authenticated requests. Treat its local identity-provider setup as a lab, not a production configuration. :chatgpt-content-reference{index="6"} |
| **[8]** | [Kubernetes — Configure Pods and Containers](https://kubernetes.io/docs/tasks/configure-pod-container/) | **Focused reference exercises:** ConfigMaps, CPU/memory resources, volumes, service accounts and health probes. Use these to supplement the beginner course—not as a documentation-reading marathon. :chatgpt-content-reference{index="7"} |
| **[9]** | [KodeKloud — Helm for Beginners](https://kodekloud.com/courses/helm-for-beginners) and [Official Helm — Chart Template Guide](https://helm.sh/docs/chart_template_guide/getting_started/) | Use the course as your structured teacher and the guide while writing your chart. Focus on chart structure, values, templates and release lifecycle. Basic Kubernetes and YAML are the course’s stated prerequisites. :chatgpt-content-reference{index="8"} |

**For your current work, you can read the OAuth flow in [7] immediately when needed; the roadmap is not a reason to postpone understanding a task you already have.** Likewise, do not change your team’s registration mechanism or SDK merely to match a tutorial.

Your starting combination is therefore:

> **Finish Docker [1] + alternate TypeScript [3] and Hugging Face MCP Unit 1 [4]. Use systems lessons [2] only to fill gaps.**