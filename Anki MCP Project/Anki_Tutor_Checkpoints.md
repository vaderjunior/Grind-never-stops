# Anki Tutor — Roadmap Checkpoints

**Companion to revision 2.0 of [the full build guide](Anki_Tutor_Roadmap_Aligned_Build_Guide.md).**

Use this file to see what comes next. Use the full guide for architecture, safety rules, exact acceptance criteria and coding-model instructions. All boxes begin unchecked: writing a plan does not pass a test.

```text
COURSE STAGE                              BUILD PART
Docker + TS/MCP basics              →      Part 0 + Part 1
Kubernetes + async/MCP/OAuth         →      Part 2
Helm + authorization/client setup   →      Part 3
                                         STOP AND REVIEW
Later product work                 →      Parts 4–7
```

The same application progresses through all parts. Synthetic data is normal in the first learning block. A Kubernetes deployment is not proof of a safe, working Anki product.

## Part 0 — Safe setup

- [ ] Confirm the repository location, development OS/shell and existing work.
- [ ] Select the intended phone Anki app and daily MCP-client interface.
- [ ] Resolve and record supported exact dependency/tool versions.
- [ ] Follow the selected SDK major's documentation; do not mix imports.
- [ ] Create progress, compatibility, decisions and gate documents.
- [ ] Ignore secrets, real notes/collections, transcripts and backups before committing.
- [ ] Confirm only synthetic data is present.
- [ ] Record the local/approved sandbox boundary and spending/public-exposure approvals.

**Explain:** Which of the three stores is authoritative, which is disposable, and where will conversation history live?

## Part 1 — After Docker + TypeScript/MCP foundations

**Courses:** C1 Docker, selected C2 systems, C3 TypeScript, C4 MCP Unit 1.

### P1.1 — One synthetic learning tool
- [ ] Implement `get_learning_profile` using small bundled German fixtures.
- [ ] Validate inputs at runtime; reject invalid or excessive limits.
- [ ] Distinguish unknown learning evidence from false/zero values.
- [ ] Return bounded, explicitly synthetic structured output.
- [ ] Write a validation/domain test myself.

### P1.2 — Actual MCP
- [ ] Register the tool using the official, version-matched SDK.
- [ ] Reuse one application implementation through stdio and HTTP adapters.
- [ ] Run real protocol initialization, discovery and tool-call tests.
- [ ] Verify stderr logging does not corrupt stdio protocol output.

### P1.3 — HTTP and process behaviour
- [ ] Implement minimal liveness/readiness endpoints.
- [ ] Require an explicit safe application profile.
- [ ] Keep fixture-local mode incapable of loading personal data or DB credentials.
- [ ] Explain host/container loopback and port mapping.
- [ ] Test invalid configuration, bounded input and graceful shutdown.

### P1.4–P1.5 — Container and Compose
- [ ] Write, then explain, the Dockerfile.
- [ ] Build from a pinned base with a lockfile install.
- [ ] Use a non-root runtime and include all required runtime assets.
- [ ] Prove the image works without mounting local source.
- [ ] Run the MCP smoke client against the container, not only `/health/live`.
- [ ] Run the same fixture service through the small Compose configuration.
- [ ] Practise a disposable synthetic volume without inventing temporary tutor storage.

### P1.6 — CI and diagnosis
- [ ] CI actually typechecks, lints, tests and builds.
- [ ] A deliberately broken assertion makes CI fail.
- [ ] Diagnose a missing fixture, wrong port or malformed input.
- [ ] Save sanitized test evidence and one short failure/repair note.

**Exit:** A tested, containerized synthetic MCP service. No real Anki or public authentication claim.

**Explain without notes:** image/container, build/runtime dependencies, lockfile/cache, stdio/HTTP, TypeScript/runtime schemas, and a request reaching the tool handler.

**Next:** stop until the Kubernetes prerequisites are ready. An approved small client-compatibility spike is optional; it does not authorize private data.

## Part 2 — After Kubernetes foundations

**Courses:** C5 Kubernetes, focused C8 tasks; continue C3, selected C4/C6; OAuth overview C7.

### P2.1–P2.2 — Plain manifests
- [ ] Confirm a dedicated sandbox context before any cluster write.
- [ ] Make the same image available to that cluster.
- [ ] Create Namespace, ServiceAccount, ConfigMap, Deployment and Service.
- [ ] Keep service-account permissions minimal; no unnecessary API token mount.
- [ ] Inspect selectors, named ports and container arguments myself.
- [ ] Keep the fixture deployment off public ingress.

### P2.3–P2.4 — Health and traffic
- [ ] Configure and explain readiness, liveness and startup behaviour.
- [ ] Set initial resource requests/limits and label them unmeasured defaults.
- [ ] Test localhost port-forward access.
- [ ] Independently prove an in-cluster client reaches the Service DNS name.
- [ ] Use actual MCP calls, not only a successful TCP connection.
- [ ] Inspect logs, events, readiness and EndpointSlices.
- [ ] Diagnose a wrong image, selector/port, probe and configuration value.

### P2.5–P2.6 — Boundaries and small feasibility spikes
- [ ] Explain Kubernetes RBAC versus OAuth permissions versus network controls.
- [ ] Avoid treating Secret base64 encoding as encryption.
- [ ] Record whether the cluster's CNI actually enforces NetworkPolicy.
- [ ] Draw the client → protected resource → authorization server flow.
- [ ] Run or schedule the bounded synthetic auth/client/Anki feasibility spikes.
- [ ] If a product spike fails, record the blocked product claim rather than bypass it.

**Exit:** The same service works under ordinary Kubernetes manifests and you can diagnose failures.

**Explain without notes:** Deployment owns ReplicaSets; ReplicaSets maintain Pods; Services select endpoints. Distinguish that control relationship from the request path.

**Next:** Helm, not a full CKA curriculum.

## Part 3 — After Helm + MCP authorization/client integration

**Courses:** C9 Helm, C7 authorization and version-matched client/SDK documentation.

### P3.1–P3.3 — Your chart
- [ ] Build a tutor-only chart from the known-good manifests.
- [ ] Add values validation and safe profile combinations.
- [ ] Use existing Secret references; no plaintext passwords in values or rendered evidence.
- [ ] Render and inspect the resources before deployment.
- [ ] Use a new Helm-owned lab namespace, not silent adoption of Part 2 resources.
- [ ] Run `helm lint`, deploy, then repeat real Service/MCP checks.
- [ ] Override one setting and explain the rendered change.
- [ ] Upgrade between known synthetic images.
- [ ] Introduce a controlled failed rollout, inspect history, select a known-good revision and roll back.
- [ ] Verify the application after rollback, not only Helm status.

### P3.4–P3.5 — Authorization
- [ ] Keep the identity provider separate from the MCP resource server.
- [ ] Use a maintained provider and validation library, not homemade OAuth/cryptography.
- [ ] Implement required protected-resource and authorization-server discovery.
- [ ] Record the registration method actually supported by the chosen pairing.
- [ ] Validate issuer, signature/algorithm, intended resource/audience, expiry, owner and scopes.
- [ ] Never use an ID token as the API access token.
- [ ] Handle key refresh and failure without turning authentication off.
- [ ] Test missing/expired/wrong-owner/wrong-audience/insufficient-scope requests.

### P3.6–P3.7 — Real client and deployment proof
- [ ] Obtain approval for a reachable HTTPS synthetic test deployment.
- [ ] Keep private ingest, DB, metrics and admin surfaces private.
- [ ] Complete the real provider/client flow and an actual tool call.
- [ ] Test the required phone interface separately from desktop.
- [ ] Record expiry/reconnection and actual revocation limitations.
- [ ] Identify whether the remote proof used Compose or Kubernetes; do not imply both.
- [ ] Prove the Helm endpoint separately if claiming remote Kubernetes interoperability.
- [ ] Ship portable tutor instructions; keep any client-specific plugin optional.
- [ ] Update all gate results and explicit limitations.

**Core exit:** Chart + local authorization tests work.

**Full block exit:** The required secure remote-client proof also passes in the documented topology. Otherwise label it **partial**, not complete. Safe Anki synchronization and the full product may still be unfinished.

**Explain without notes:** metadata discovery, client registration, login, access-token validation, per-tool authorization, Kubernetes routing and Helm release management are different responsibilities.

# STOP THE COURSE ROADMAP HERE

Do not automatically start a new cloud, MLOps or GPU course. Review progress and workload first. The next sections describe remaining product work, not extra parallel courses.

## Later Part 4 — Persistent useful tutor

- [ ] Pure, deterministic practice selector with injected clock/seed and honest evidence semantics.
- [ ] PostgreSQL migrations and parameterized repositories.
- [ ] Immutable bounded session plans and stable source-qualified IDs.
- [ ] Start → record → restart → resume workflow using synthetic data.
- [ ] Transactional idempotency, including simultaneous duplicate requests.
- [ ] Record-versus-finish race handled at the database boundary.
- [ ] All six tools, truthful annotations, scopes and bounded output.
- [ ] Portable tutor prompt tested through actual tool calls.

## Later Part 5 — Safe Anki pipeline

- [ ] Synthetic official sync server and separately stored worker mirror.
- [ ] Custom-endpoint, safe download, headless sync and no-study-write proof.
- [ ] Worker full uploads refused and ambiguous recovery stopped.
- [ ] Configurable note mappings, exclusions and grammar rules tested.
- [ ] Review types/units and note/card directions taken from the pinned Anki implementation.
- [ ] Complete snapshots, cross-language validation, payload limits and exact retry identity.
- [ ] Private authenticated ingestion; no public exposure of the worker credential or listener.
- [ ] Transactional generation publication and consistent reader queries.
- [ ] Durable sequence/outbox, restore reconciliation and no old-generation overwrite.
- [ ] Freshness/error reporting, bounded retries and full G-SYNC evidence.

## Later Part 6 — Operations and tutor evaluation

- [ ] Complete reference Compose stack with isolated networks and persistent stores.
- [ ] Minimal structured logs without vocabulary, answers or credentials by default.
- [ ] Small metrics/dashboard showing errors, latency and sync/index freshness.
- [ ] Real protocol-aware load experiment with honestly recorded hardware and conditions.
- [ ] DB, sync, credentials, interrupted ingestion and disk failure drills.
- [ ] At least ten representative synthetic tutoring scenarios scored separately from software tests.
- [ ] Expanded CI for Python, contracts, disposable DB, containers and charts.
- [ ] No fake metrics, blanket health claims or unverified learning-efficacy claims.

## Later Part 7 — Real use and independent release

- [ ] Back up authoritative Anki/media, tutor DB, identity, config, secrets and version/state metadata.
- [ ] Restore in isolation, test login/history/sync and complete G-RESTORE.
- [ ] Only then approve and perform the documented real-collection cutover.
- [ ] Never guess upload/download direction or treat AnkiWeb as automatic dual-sync backup.
- [ ] Pilot for one to two weeks; measure freshness, resource use and actual usability.
- [ ] Test upgrades and document database/application rollback boundaries.
- [ ] Another owner installs on their own host/account without your infrastructure.
- [ ] Scan source/history/images for secrets and personal data; review dependency licenses.
- [ ] Publish only after explicit approval and evidence-backed release criteria.

## Gate ledger

| Gate | Status | Evidence / next action |
|---|---|---|
| G-CLIENT | NOT_STARTED | |
| G-AUTH | NOT_STARTED | |
| G-SYNC | NOT_STARTED | |
| G-RESTORE | NOT_STARTED | |
| G-INDEPENDENT | NOT_STARTED | |

## End every study session with this

```text
I changed:
I personally implemented/debugged:
I verified, with actual output:
I can now explain:
Still unverified or blocked:
The exact next slice is:
```

**Your next action now:** Part 0, then P1.1. The first task is not a whole cloud platform; it is one learning tool you understand.
