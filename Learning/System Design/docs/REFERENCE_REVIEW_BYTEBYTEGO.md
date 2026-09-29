# ByteByteGo reference review and beginner-course corrections

Reviewed 2026-09-29. Repository: [ByteByteGoHq/system-design-101](https://github.com/ByteByteGoHq/system-design-101), commit `b28380a4710c5ec9638ec037d4168e288f334cba`. Local root: [system-design-101](<D:/AIOps Infra Path/Learning/System Design/reference-repos/system-design-101>). This review reads the reference repository without changing it or executing its code.

The repository is a useful visual reference library. It is not an ordered, six-month beginner course. Adopt its concrete questions, small visual explanations, and named examples; supply an original prerequisite sequence, accessible explanations, exercises, feedback, and gradual design practice in the academy.

## What was examined

The full README, license, contribution instructions, README-generation script, all 15 category records, and all 400 guide records were scanned for structure, metadata, text length, and link targets. A representative set of 26 guide bodies was read critically, covering browser/DNS/HTTP, cookies, proxies, load balancing, SQL/ACID/database types, scaling, caching/CDN, queues, delivery semantics, hashing/sharding, payments, failure detection, Redis, collaborative editing, and interviews. This is not a claim that all 400 articles were technically fact-checked.

[The full topic map](REFERENCE_TOPICS_BYTEBYTEGO.md) lists every guide under its source category, with its exact local Markdown path, source URL, approximate body-word count, and an original recommended learning-stage placement. [The machine inventory](<D:/AIOps Infra Path/Learning/System Design/artifacts/bytebytego-inventory.json>) preserves the commit, hashes, categories, asset targets, and structural findings. Regenerate only the inventory with [audit-bytebytego.mjs](<D:/AIOps Infra Path/Learning/System Design/scripts/audit-bytebytego.mjs>); it writes academy reports and does not edit the reference clone.

| Inventory item | Observed result |
|---|---:|
| Tracked repository files | 424 |
| Category Markdown records | 15 |
| Unique guide Markdown records | 400 |
| README guide entries | 404; four guides belong to two categories |
| Guide files absent from README | 0 |
| README guide slugs without a local guide | 0 |
| Unknown category references | 0 |
| Median guide body length, excluding image markup | 183 words |
| Guides with fewer than 50 body words | 24 |
| Local raster/vector image files | 1: `.github/banner.jpg` |

These text lengths characterize short visual explainers. They must not be interpreted as 400 complete lessons, assessments, or practice sessions.

## Order and coverage

[README.md](<D:/AIOps Infra Path/Learning/System Design/reference-repos/system-design-101/README.md>) starts with API/web development, including polling, gRPC, routing, and HTTP version comparisons. Computer fundamentals is the final category. [scripts/readme.ts](<D:/AIOps Infra Path/Learning/System Design/reference-repos/system-design-101/scripts/readme.ts>) sorts categories by a numeric display key and articles by publication date. That is a publishing index, not a dependency graph.

| Source category in README order | Guides | Course use |
|---|---:|---|
| API and Web Development | 50 | Select browser/API basics first; defer protocol comparisons. |
| Real World Case Studies | 32 | Optional later examples after learners can explain a small baseline. |
| AI and Machine Learning | 8 | Late specialization, not foundational vocabulary. |
| Database and Storage | 47 | Tables and queries before transactions, indexes, replication, and sharding. |
| Technical Interviews | 5 | Browser journey early; timed interview process late. |
| Caching & Performance | 29 | After a measured repeated-read problem. |
| Payment and Fintech | 20 | Later correctness case studies with domain terms defined. |
| Software Architecture | 24 | After building one app; avoid a pattern-name memorization path. |
| DevTools & Productivity | 20 | Optional support material. |
| Software Development | 28 | Optional coding bridge and implementation context. |
| Cloud & Distributed Systems | 49 | Later growth/failure concepts; vendor catalogs stay optional. |
| How it Works? | 18 | Select according to the current app problem. |
| DevOps and CI/CD | 27 | Once the learner understands an app that changes and can fail. |
| Security | 35 | Identity/permission early, deeper mechanisms later. |
| Computer Fundamentals | 12 | Move selected prerequisites to the beginning. |

## Teaching strengths worth using

The browser/DNS guides follow a familiar action through named steps. The proxy comparison assigns each intermediary a clear position. The hashing guide introduces the disruption caused by changing the server count before describing an alternative. The sharding guide connects distribution choices to joins and migration costs. These are useful instructional patterns: start with a concrete problem, show a small mechanism, walk its arrows, then ask what changes.

Short, question-shaped titles give a learner a reason to open a page. One dominant diagram can reduce the burden of retaining a long verbal description. Everyday analogies such as a preference card can make an unfamiliar idea approachable. In the academy, each analogy also needs an explicit limit, and every diagram needs a complete text walkthrough so understanding does not depend on seeing small labels in a remote image.

The repository itself does not supply a consistent prerequisite list, worked learner exercise, explained answer, spaced recall schedule, or a cumulative evolving application. Add those with original writing. Do not turn the 400-title index into the main course navigation.

## Corrections needed before recommending an article as instruction

These are targeted concerns from the representative read, not a rejection of the entire library. A working URL means the resource is accessible; it does not certify every technical sentence.

| Local guide | Concern and required teaching boundary |
|---|---|
| `top-9-http-request-methods.md` | Idempotency concerns intended effect, not identical response bodies. A repeated GET can return changed data. POST does not inherently mean every repeated request must create a duplicate. Use [RFC9110](https://httpwg.org/specs/rfc9110.html#idempotent.methods) for the definition. |
| `what-is-a-cookie.md` | The analogy jumps to identifying a user without a database lookup. Cookies may carry an opaque session identifier; cookie possession alone is not arbitrary trusted identity. Explain the server’s verification and session lookup using [MDN’s cookie guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies). |
| `how-does-https-work.md` | The described encrypted-session-key exchange is not a universal modern TLS handshake. A new lesson must identify its TLS version and transport assumptions instead of teaching this as all HTTPS. |
| `how-to-scale-a-website-to-support-millions-of-users.md` | Adding CPU/RAM is called vertical partitioning in the text. Teach vertical scaling separately from splitting columns or data. More users do not automatically require a fixed march toward microservices. Read replicas are primarily a read-offload mechanism, not a universal write-throughput multiplier. |
| `what-does-acid-mean.md` | All-or-nothing does not require physically simultaneous writes. Durability needs an explicit storage/failure boundary; replication count alone does not establish it. Pair with [PostgreSQL’s transaction tutorial](https://www.postgresql.org/docs/current/tutorial-transactions.html). |
| `cap-theorem-one-of-the-most-misunderstood-terms.md` | Its later caution is useful, but the initial two-of-three shorthand needs a precise follow-up: linearizable operation histories, valid service responses, and a communication-partition assumption. Use our own example, not a memorized triangle. |
| `top-5-caching-strategies.md` and `how-can-cache-systems-go-wrong.md` | Strategy names do not prove freshness. Never-expire guidance for hot values needs a separate invalidation policy and product-specific staleness contract. Avoid turning an illustrative workload percentage into a universal rule. |
| `delivery-semantics.md` and `how-to-avoid-double-payment.md` | Separate message receipt, processing, and external effect. Retry requires eventual progress assumptions; a unique identifier alone does not atomically record the effect and its deduplication decision. Teach a concrete crash boundary. |
| `how-does-redis-persist-data.md` | Persistence latency and loss behavior depend on configuration. Do not repeat the unqualified claim that persistence cannot block a write; check the selected Redis persistence mode in primary documentation when teaching it. |
| `how-to-design-google-docs.md` | Treat the sketch as a design exercise. Its attribution to Wikipedia does not establish current Google Docs internals, and naming OT/CRDT is not enough to teach conflict resolution. |

## Assets, links, and attribution

The clone is not an offline diagram archive. There are 399 distinct remote guide-image targets on `assets.bytebytego.com`, plus a shared legacy category image URL. Only the banner is a local image. The REST guide repeats its image in the Markdown; the programming-language history guide has no inline body image. Some guide bodies rely almost entirely on the image.

Every category’s `image` metadata points to `https://github.com/ByteByteGoHq/system-design-101/raw/main/images/oAuth2.jpg`. The corresponding `images/oAuth2.jpg` is absent from this commit. The external fetch could not be confirmed, so this is recorded as a stale/missing-local target rather than a verified HTTP404. The `/icons/...` category metadata also describes website assets, not files present in the clone.

Structural checks found no missing relative Markdown/image targets among parsed guide bodies. The entire external web was not crawled: the selected article pages in [resources-bytebytego.json](<D:/AIOps Infra Path/Learning/System Design/content/resources-bytebytego.json>) were opened and returned their expected titles and public guide text on 2026-09-29. Remote asset availability and third-party article links remain separate checks. Browser screenshot inspection was unavailable in this tool session, so no claim is made that all remote diagrams were visually checked. No remote images were downloaded to bypass this limitation.

[LICENSE.md](<D:/AIOps Infra Path/Learning/System Design/reference-repos/system-design-101/LICENSE.md>) declares CC BY-NC-ND4.0. Its [official license summary](https://creativecommons.org/licenses/by-nc-nd/4.0/) requires appropriate attribution and a license link, excludes commercial use under that license, and does not permit distributing adapted material. Retain the clone and its license unchanged. Link to the guide with ByteByteGo credit. Write original academy explanations and original diagrams; do not recolor, crop, trace, or rewrite licensed artwork into supposedly original assets for redistribution. A separate site footer or a linked third-party article is not a blanket relicensing of that material. Linked paid content remains a reference destination, not content to ingest.

[CONTRIBUTING.md](<D:/AIOps Infra Path/Learning/System Design/reference-repos/system-design-101/CONTRIBUTING.md>) requests one topic per PR, separate issues for diagram corrections, and no AI-generated upstream submissions. No contribution or upstream edit was made. Those contribution rules do not prevent independent original material in this local academy.

## Five concrete fixes for the old first ten lessons

1. **Teach a small vocabulary before reasoning with it.** L001 promises no prior system-design vocabulary but assumes Python/SQL and immediately uses authority, persistence, protected claims, invariants, and failure domains. Begin with one person saving a note: browser, server, message, saved data. Define each at first use. Introduce a rule such as “only the owner reads this note” before naming it an invariant. Move concurrent-claim and ambiguous-response puzzles until the normal path is understood.
2. **Keep one evolving app and one new mechanism per guide.** L001 uses borrowing,002 rooms,003 photos,004 reading lists,005 announcements,006 field observations,008 image conversion,009 faculty links,010 experiments. Use the same photo-notes app through weeks1–7. Keep its user, note ID, and database names stable. Change one problem at a time: find a note, keep two edits correct, measure slow reads, add a cache, create a thumbnail. Preserve different applications as later transfer exercises.
3. **Delay dense mathematics and operations vocabulary.** L003 combines four service dimensions, percentiles, histogram aggregation, SLI/SLO/SLA, and error budgets. L006 combines decimal/binary units, replicas, indexes, free-space conventions, backup strategies, bandwidth, and recovery time. Start with one request’s duration, counting requests in ten seconds, and counting ten saved notes. Teach one conversion with a worked table. Move tail distributions and error budgets to the reliability weeks; move physical capacity ledgers to an optional estimate exercise.
4. **Use low-pressure checks before formal interviews.** L005 is a45-minute assessment after four sessions with a12-dimension rubric; L010 requires workload, bytes, concurrency, privacy, recovery, and design adaptation. Replace the early mandatory experience with a two-minute explain-back, a partially completed diagram, three objective questions, and one small changed example. Keep the old assessments in the reference library. Begin full timed mocks after the learner has assembled and explained several systems, with criteria introduced beforehand.
5. **Make the next step and success condition obvious.** Show “Week3, Day1: store a note in a table” rather than a300-item inventory. A guide should begin with what the learner already knows and finish with one observable outcome: draw the save/read path, find the row by ID, or explain why a cache may be old. Give a tiny exercise with an explained answer, then a scheduled revisit. External guides are optional visual reinforcement, not missing core instruction or required paid material.

| Old lesson | Most consequential beginner jump | Proposed treatment |
|---|---|---|
| 001 | Normal request, concurrent updates, and partial failure at once | New week1 story and three-box walkthrough; preserve deeper challenge for later. |
| 002 | Half-open interval algebra, service objectives, outage negotiations | Start with plain actions and one rule; booking interval proof becomes a later design. |
| 003 | Percentiles and error-budget terminology before measurement intuition | Week5 simple observation; weeks13/15 distributions and objectives. |
| 004 | DAU, API amplification, tenant/region skew in one model | Count one user action and its requests first; extend later. |
| 005 | Full interview immediately | Guided checkpoint with hints and visible criteria. |
| 006 | Storage-copy ledger and restore throughput before storage basics | Week2 saved data; week3 tables; later optional detailed sizing. |
| 007 | Little’s law and transient queues before a worker is concrete | Week7 thumbnail waiting-line example first; named law optional later. |
| 008 | CPU-seconds, fleet failure reserve, and shared limits | Week5 one measured bottleneck, then one carefully justified extra server. |
| 009 | Timed interview framework while concepts remain unfamiliar | Week15 communication after repeated small designs. |
| 010 | Multi-axis45-minute design exam | Preserve as reference; new week8 shortener is guided and scaffolded. |

## Recommended six-month shape

The new [learning-path.json](<D:/AIOps Infra Path/Learning/System Design/content/learning-path.json>) uses24 weeks and two connected original guides per week. Month1 builds the small request/data model; month2 grows the app with measurements, balancing, caches, background work, and a guided shortener. Month3 introduces copies, partitions, repeated delivery, and access control through timelines. Month4 develops recovery, observation, and interview explanation. Month5 practices full product designs. Month6 adds difficult correctness/coordination cases and unfamiliar mocks.

Each week should contain two learning days, two small applied-practice days, and a recall/explanation checkpoint. The two remaining days are catch-up or rest. Keep the main “continue” action on the next concrete lesson. The full original catalog and the400-topic reference map remain searchable optional depth. This is an instructional proposal; completion does not guarantee a job offer or mastery of every possible interview question.
