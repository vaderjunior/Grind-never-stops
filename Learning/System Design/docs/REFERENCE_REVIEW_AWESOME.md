# Review: awesome-system-design-resources

Reviewed 2026-09-29. Repository: [ashishps1/awesome-system-design-resources](https://github.com/ashishps1/awesome-system-design-resources), commit `25724090f7dd7746129b7194b55504f9d06f86ed`. This is an independent review and learning-path map; the reference checkout remains unchanged.

## What this repository can contribute

The strongest use is a topic index and a source of optional second explanations. It contains a README, two PNG diagrams, eleven Python examples, eleven Java examples, and a GPLv3 license. The README has 142 external-link entries and 141 unique URLs. It does not supply a six-month sequence, durable learner exercises, a graded progression, or tests for its algorithm examples. A beginner therefore needs an original guided lesson before following the relevant link.

Start with client–server, a request journey, HTTP/APIs, one database, indexes, and transactions. Then introduce measurement, scaling, caching, queues, copying data, and dividing data. Put consistency, recovery, locks, and papers after those foundations. The README places consistent hashing and CAP among core concepts; neither should be a beginner's first explanatory model. Treat product-design difficulty labels as informal. Distributed key-value stores and UPI are not inherently easy; parking-garage and vending-machine exercises often concern object design rather than distributed architecture.

The interview-template image gives a useful seven-part checklist: requirements, estimates, broad design, database, API, deep dives, and important issues. Our lessons should teach why and when to use each step with a small worked example. Redraw original explanatory diagrams and progressively add components; do not make the image itself the curriculum.

## Access, licensing, and limits

The checkout's LICENSE is GNU GPL version 3. Preserve the license and attribution if redistributing its code or diagrams, and review applicable distribution obligations before incorporating adapted implementation code. This review copies no implementation code or diagram into the academy. Linked articles, paid courses, newsletters, books, videos, and papers keep their own rights and access terms; the repository license does not relicense third-party material. Our course uses original prose and links. The “free resources” description is not a guarantee that every destination or feature is free, complete, or accessible without an account. No paid material was accessed or copied.

We read the entire README, license, and all 22 implementation sources. All eleven Python files parsed successfully. Three targeted Python reproductions ran after stripping top-level demo code; Java was reviewed statically, not compiled or executed. No linked video was watched. We inspected selected article content, not every article or all linked course chapters.

## Link verification and corrections

The bounded checker used at most eight workers, one HEAD request per README link entry, an eight-second timeout, and TLS validation. Results: {"200":131,"403":6,"404":1,"405":2,"null":2}. These count entries, including one duplicate URL. Detailed timestamps, final URLs, errors, and dynamic-code evidence are in [the machine-readable audit](../artifacts/awesome-reference-review.json); [the rerunnable checker](../scripts/review-awesome.py) records the same limits. A successful HEAD proves a responding endpoint, not correct content, free access, educational quality, or a video review.

- **Autocomplete is mislabeled.** “Design Autocomplete for Search Engines” points to [Design Instagram](https://algomaster.io/learn/system-design-interviews/design-instagram). The destination title was checked. Exclude that link from autocomplete assignments.
- **Distributed tracing needs a refreshed URL.** The README's Dynatrace news/blog URL returned HEAD 404. A web lookup resolves useful content at [Dynatrace's distributed-tracing knowledge base](https://www.dynatrace.com/knowledge-base/distributed-tracing/). This is a method-dependent redirect discrepancy, not proof the article disappeared.
- **Canva rejects HEAD.** HEAD returned 405, but [its media-migration article](https://www.canva.dev/blog/engineering/from-zero-to-50-million-uploads-per-day-scaling-media-at-canva/) loaded through a content GET. Keep it as optional advanced reading.
- Six Medium/Netflix-hosted destinations returned 403. Mark them unverified, not broken: API design, consensus, circuit breaker, microservices, Netflix in-video search, Airbnb double payments.
- The Amazon book link returned 405. It is a purchase destination, not a free book or missing resource.
- The bit.ly newsletter and UMass LSM paper failed certificate validation in this Python environment. Do not disable TLS verification to force a passing result. They remain unverified by this check.
- [Stripe's API article](https://stripe.com/blog/payment-api-design) redirects to stripe.dev. The title and metadata loaded; extraction did not expose the full article, so no full-text-review claim is made.

Selected content was inspected for client–server architecture, DNS, the interview framework, Slack messaging, Discord storage, Canva migration, AWS latency/throughput, the Dynatrace replacement, and the Instagram mismatch. The resource JSON separately explains whether verification means HTTP reachability or inspected content. Readable HTML is not an endorsement of every claim.

## Code review: useful sketches, unsuitable as untested reference answers

The Python and Java trees each cover five rate-limit algorithms (fixed window, sliding log, sliding counter, token bucket, leaky bucket), five load-balancing choices (round robin, weighted round robin, least connections, least response time, IP hash), and consistent hashing. They are small in-process demonstrations. No automated test suite was found.

| Finding | Evidence and teaching implication |
| --- | --- |
| Python sliding-window counter retains stale preceding-window traffic | Fill five requests, advance a fake clock by three complete windows, then request again: it rejects when a fresh window should allow. Reset the previous count when two or more windows were skipped. |
| Python token bucket accepts negative cost | Requesting minus three tokens on a full ten-token bucket succeeds and leaves thirteen tokens. Validate positive cost and capacity before arithmetic. |
| Python consistent hashing permits duplicate node addition | Add an existing node then remove it: three orphan sorted positions remain and lookups can raise KeyError. Make membership operations idempotent or reject duplicate nodes. |
| Python leaky bucket loses fractional elapsed leakage | Updating the timestamp after an integer leak discards the remaining fraction. Preserve elapsed credit or use continuous arithmetic. Static source finding. |
| Java leaky bucket can postpone leakage indefinitely | It resets the last-leak timestamp even when the integer number leaked is zero; frequent requests can repeatedly erase fractional elapsed time. Static source finding. |
| Java least-connections never increments on selection | Selection leaves counts unchanged, so ties repeatedly select the same server unless callers add accounting elsewhere. Static source finding. |
| Java hash and round-robin indexes have integer edge cases | Math.abs(Integer.MIN_VALUE) stays negative, and a signed counter may overflow. Prefer bounded/floor-mod indexing with explicit empty-server handling. Static source finding. |
| Clock, concurrency, and topology assumptions are hidden | Python examples use wall-clock time without injected clocks/atomic shared state; examples omit durable counters, health probes, eviction policies, and network failure behavior. A local algorithm does not create a distributed guarantee. |
| Importing demos has side effects | Several top-level demos print and sleep for long windows. Our audit executes only previously reviewed declarations with fake time. The filename round_robin.py.py is also a minor naming defect. |

The MD5 placement hash is an illustrative distribution choice, not an authentication or collision-resistance recommendation. Weighted routing and minimum response-time selection also need explicit feedback freshness and health behavior before use. Teach one invariant and one boundary test per algorithm; use the academy's independently authored tested labs for practice.

## Curated progression

The app-facing [resources-awesome.json](../content/resources-awesome.json) contains 31 selected entries with week mappings, access caveats, check timestamps, and precise status. Most are optional rather than required. Do not assign every link in a category to a beginner in one week.

- Weeks 1–4: client–server, DNS, HTTP, APIs, indexes, transactions. Give the learner a notes-app request to trace before opening external material.
- Weeks 5–8: latency/throughput, load balancing, caching, CDN, queues, then a URL shortener. Require a before/after drawing and a small estimate.
- Weeks 9–12: replication, sharding, consistency, idempotency, rate limits. Require an explicit failed-request or duplicated-message example.
- Weeks 13–15: observations, recovery targets, and interview communication. Prefer one failure story over a list of tools.
- Weeks 16–18: notifications, limiter, chat, feeds. Read Slack/Discord only after attempting a complete local design.
- Weeks 19–24: media/storage, payments, coordination, and selected original papers. Canva is useful for seeing gradual migration rather than instantly adopting a new database. DDIA and original papers are optional depth, not first-week prerequisites.

## Full README topic-to-path map

### Introduction

Weeks 1–2, optional orientation. 2 link entries.

- [AlgoMaster Newsletter](https://bit.ly/amghsd)
- [System Design was HARD until I Learned these 30 Concepts](https://blog.algomaster.io/p/30-system-design-concepts)

### ⚙️ Core Concepts

Weeks 5, 9–10, 13–14. 9 link entries.

- [Scalability](https://algomaster.io/learn/system-design/scalability)
- [Availability](https://algomaster.io/learn/system-design/availability)
- [Reliability](https://algomaster.io/learn/system-design/reliability)
- [SPOF](https://algomaster.io/learn/system-design/single-point-of-failure-spof)
- [Latency vs Throughput vs Bandwidth](https://algomaster.io/learn/system-design/latency-vs-throughput)
- [Consistent Hashing](https://algomaster.io/learn/system-design/consistent-hashing)
- [CAP Theorem](https://algomaster.io/learn/system-design/cap-theorem)
- [Failover](https://www.druva.com/glossary/what-is-a-failover-definition-and-related-faqs)
- [Fault Tolerance](https://www.cockroachlabs.com/blog/what-is-fault-tolerance/)

### 🌐 Networking Fundamentals

Weeks 1–2, 6–7. 8 link entries.

- [OSI Model](https://algomaster.io/learn/system-design/osi)
- [IP Addresses](https://algomaster.io/learn/system-design/ip-address)
- [Domain Name System (DNS)](https://blog.algomaster.io/p/how-dns-actually-works)
- [Proxy vs Reverse Proxy](https://blog.algomaster.io/p/proxy-vs-reverse-proxy-explained)
- [HTTP/HTTPS](https://algomaster.io/learn/system-design/http-https)
- [TCP vs UDP](https://algomaster.io/learn/system-design/tcp-vs-udp)
- [Load Balancing](https://blog.algomaster.io/p/load-balancing-algorithms-explained-with-code)
- [Checksums](https://algomaster.io/learn/system-design/checksums)

### 🔌 API Fundamentals

Weeks 2, 4, 11–12, 16–17. 8 link entries.

- [APIs](https://algomaster.io/learn/system-design/what-is-an-api)
- [API Gateway](https://blog.algomaster.io/p/what-is-an-api-gateway)
- [REST vs GraphQL](https://blog.algomaster.io/p/rest-vs-graphql)
- [WebSockets](https://blog.algomaster.io/p/websockets)
- [Webhooks](https://algomaster.io/learn/system-design/webhooks)
- [Idempotency](https://algomaster.io/learn/system-design/idempotency)
- [Rate limiting](https://blog.algomaster.io/p/rate-limiting-algorithms-explained-with-code)
- [API Design](https://abdulrwahab.medium.com/api-architecture-best-practices-for-designing-rest-apis-bf907025f5f)

### 🗄️ Database Fundamentals

Weeks 3–4, 9–10; Bloom filters after week 20. 9 link entries.

- [ACID Transactions](https://algomaster.io/learn/system-design/acid-transactions)
- [SQL vs NoSQL](https://algomaster.io/learn/system-design/sql-vs-nosql)
- [Database Indexes](https://algomaster.io/learn/system-design/indexing)
- [Database Sharding](https://algomaster.io/learn/system-design/sharding)
- [Data Replication](https://redis.com/blog/what-is-data-replication/)
- [Database Scaling](https://blog.algomaster.io/p/system-design-how-to-scale-a-database)
- [Databases Types](https://blog.algomaster.io/p/15-types-of-databases)
- [Bloom Filters](https://algomaster.io/learn/system-design/bloom-filters)
- [Database Architectures](https://www.mongodb.com/developer/products/mongodb/active-active-application-architectures/)

### ⚡ Caching Fundamentals

Weeks 6–7, 18. 5 link entries.

- [Caching 101](https://algomaster.io/learn/system-design/what-is-caching)
- [Caching Strategies](https://algomaster.io/learn/system-design/caching-strategies)
- [Cache Eviction Policies](https://blog.algomaster.io/p/7-cache-eviction-strategies)
- [Distributed Caching](https://blog.algomaster.io/p/distributed-caching)
- [Content Delivery Network (CDN)](https://algomaster.io/learn/system-design/content-delivery-network-cdn)

### 🔄 Asynchronous Communication

Weeks 7, 11, 16. 3 link entries.

- [Pub/Sub](https://algomaster.io/learn/system-design/pub-sub)
- [Message Queues](https://algomaster.io/learn/system-design/message-queues)
- [Change Data Capture (CDC)](https://algomaster.io/learn/system-design/change-data-capture-cdc)

### 🧩 Distributed System and Microservices

Weeks 10, 13–14, 22. 8 link entries.

- [HeartBeats](https://blog.algomaster.io/p/heartbeats-in-distributed-systems)
- [Service Discovery](https://blog.algomaster.io/p/service-discovery-in-distributed-systems)
- [Consensus Algorithms](https://medium.com/@sourabhatta1819/consensus-in-distributed-system-ac79f8ba2b8c)
- [Distributed Locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Gossip Protocol](http://highscalability.com/blog/2023/7/16/gossip-protocol-explained.html)
- [Circuit Breaker](https://medium.com/geekculture/design-patterns-for-microservices-circuit-breaker-pattern-276249ffab33)
- [Disaster Recovery](https://cloud.google.com/learn/what-is-disaster-recovery)
- [Distributed Tracing](https://www.dynatrace.com/news/blog/what-is-distributed-tracing/)

### 🖇️ Architectural Patterns

Client–server week 1; other styles after week 11. 5 link entries.

- [Client-Server Architecture](https://algomaster.io/learn/system-design/client-server-architecture)
- [Microservices Architecture](https://medium.com/hashmapinc/the-what-why-and-how-of-a-microservices-architecture-4179579423a9)
- [Serverless Architecture](https://blog.algomaster.io/p/2edeb23b-cfa5-4b24-845e-3f6f7a39d162)
- [Event-Driven Architecture](https://www.confluent.io/learn/event-driven-architecture/)
- [Peer-to-Peer (P2P) Architecture](https://www.spiceworks.com/tech/networking/articles/what-is-peer-to-peer/)

### ⚖️ System Design Tradeoffs

Weeks 5–12, revisit in weeks 15–24. 12 link entries.

- [Top 15 Tradeoffs](https://blog.algomaster.io/p/system-design-top-15-trade-offs)
- [Vertical vs Horizontal Scaling](https://algomaster.io/learn/system-design/vertical-vs-horizontal-scaling)
- [Concurrency vs Parallelism](https://blog.algomaster.io/p/concurrency-vs-parallelism)
- [Long Polling vs WebSockets](https://blog.algomaster.io/p/long-polling-vs-websockets)
- [Batch vs Stream Processing](https://blog.algomaster.io/p/batch-processing-vs-stream-processing)
- [Stateful vs Stateless Design](https://blog.algomaster.io/p/stateful-vs-stateless-architecture)
- [Strong vs Eventual Consistency](https://blog.algomaster.io/p/strong-vs-eventual-consistency)
- [Read-Through vs Write-Through Cache](https://blog.algomaster.io/p/59cae60d-9717-4e20-a59e-759e370db4e5)
- [Push vs Pull Architecture](https://blog.algomaster.io/p/af5fe2fe-9a4f-4708-af43-184945a243af)
- [REST vs RPC](https://blog.algomaster.io/p/106604fb-b746-41de-88fb-60e932b2ff68)
- [Synchronous vs. asynchronous communications](https://blog.algomaster.io/p/aec1cebf-6060-45a7-8e00-47364ca70761)
- [Latency vs Throughput](https://aws.amazon.com/compare/the-difference-between-throughput-and-latency/)

### ✅ How to Answer a System Design Interview Problem

Week 15: interview communication. 1 link entries.

- [How to Answer a System Design Interview Problem](https://algomaster.io/learn/system-design-interviews/answering-framework)

### Interview problems / Easy

URL shortener week 8; selected designs weeks 12–24. 10 link entries.

- [Design URL Shortener like TinyURL](https://algomaster.io/learn/system-design-interviews/design-url-shortener)
- [Design Autocomplete for Search Engines](https://algomaster.io/learn/system-design-interviews/design-instagram)
- [Design Load Balancer](https://algomaster.io/learn/system-design-interviews/design-load-balancer)
- [Design Content Delivery Network (CDN)](https://www.youtube.com/watch?v=8zX0rue2Hic)
- [Design Parking Garage](https://www.youtube.com/watch?v=NtMvNh0WFVM)
- [Design Vending Machine](https://www.youtube.com/watch?v=D0kDMUgo27c)
- [Design Distributed Key-Value Store](https://www.youtube.com/watch?v=rnZmdmlR-2M)
- [Design Distributed Cache](https://www.youtube.com/watch?v=iuqZvajTOyA)
- [Design Authentication System](https://www.youtube.com/watch?v=uj_4vxm9u90)
- [Design Unified Payments Interface (UPI)](https://www.youtube.com/watch?v=QpLy0_c_RXk)

### Interview problems / Medium

Weeks 16–21, after constituent concepts. 23 link entries.

- [Design WhatsApp](https://algomaster.io/learn/system-design-interviews/design-whatsapp)
- [Design Spotify](https://algomaster.io/learn/system-design-interviews/design-spotify)
- [Design Instagram](https://algomaster.io/learn/system-design-interviews/design-instagram)
- [Design Notification Service](https://algomaster.io/learn/system-design-interviews/design-notification-service)
- [Design Distributed Job Scheduler](https://blog.algomaster.io/p/design-a-distributed-job-scheduler)
- [Design Tinder](https://www.youtube.com/watch?v=tndzLznxq40)
- [Design Facebook](https://www.youtube.com/watch?v=9-hjBGxuiEs)
- [Design Twitter](https://www.youtube.com/watch?v=wYk0xPP_P_8)
- [Design Reddit](https://www.youtube.com/watch?v=KYExYE_9nIY)
- [Design Netflix](https://www.youtube.com/watch?v=psQzyFfsUGU)
- [Design Youtube](https://www.youtube.com/watch?v=jPKTo1iGQiE)
- [Design Google Search](https://www.youtube.com/watch?v=CeGtqouT8eA)
- [Design E-commerce Store like Amazon](https://www.youtube.com/watch?v=EpASu_1dUdE)
- [Design TikTok](https://www.youtube.com/watch?v=Z-0g_aJL5Fw)
- [Design Shopify](https://www.youtube.com/watch?v=lEL4F_0J3l8)
- [Design Airbnb](https://www.youtube.com/watch?v=YyOXt2MEkv4)
- [Design Rate Limiter](https://www.youtube.com/watch?v=mhUQe4BKZXs)
- [Design Distributed Message Queue like Kafka](https://www.youtube.com/watch?v=iJLL-KPqBpM)
- [Design Flight Booking System](https://www.youtube.com/watch?v=qsGcfVGvFSs)
- [Design Online Code Editor](https://www.youtube.com/watch?v=07jkn4jUtso)
- [Design an Analytics Platform (Metrics & Logging)](https://www.youtube.com/watch?v=kIcq1_pBQSY)
- [Design Payment System](https://www.youtube.com/watch?v=olfaBgJrUBI)
- [Design a Digital Wallet](https://www.youtube.com/watch?v=4ijjIUeq6hE)

### Interview problems / Hard

Weeks 19–24 or optional advanced study. 12 link entries.

- [Design Location Based Service like Yelp](https://www.youtube.com/watch?v=M4lR_Va97cQ)
- [Design Uber](https://www.youtube.com/watch?v=umWABit-wbk)
- [Design Food Delivery App like Doordash](https://www.youtube.com/watch?v=iRhSAR3ldTw)
- [Design Google Docs](https://www.youtube.com/watch?v=2auwirNBvGg)
- [Design Google Maps](https://www.youtube.com/watch?v=jk3yvVfNvds)
- [Design Zoom](https://www.youtube.com/watch?v=G32ThJakeHk)
- [Design File Sharing System like Dropbox](https://www.youtube.com/watch?v=U0xTu6E2CT8)
- [Design Ticket Booking System like BookMyShow](https://www.youtube.com/watch?v=lBAwJgoO3Ek)
- [Design Distributed Web Crawler](https://www.youtube.com/watch?v=BKZxZwUgL3Y)
- [Design Code Deployment System](https://www.youtube.com/watch?v=q0KGYwNbf-0)
- [Design Distributed Cloud Storage like S3](https://www.youtube.com/watch?v=UmWtcgC96X8)
- [Design Distributed Locking Service](https://www.youtube.com/watch?v=v7x75aN9liM)

### 📇 Courses

Optional parallel reference; access must be checked. 2 link entries.

- [System Design Fundamentals](https://algomaster.io/learn/system-design/course-introduction)
- [System Design Interviews](https://algomaster.io/learn/system-design-interviews/introduction)

### 📩 Newsletters

Optional continuing reading. 1 link entries.

- [AlgoMaster Newsletter](https://blog.algomaster.io/)

### 📚 Books

Optional deeper study after week 9. 1 link entries.

- [Designing Data-Intensive Applications](https://www.amazon.in/dp/9352135245)

### 📺 YouTube Channels

Optional visual second explanation; choose a specific topic. 7 link entries.

- [Tech Dummies Narendra L](https://www.youtube.com/@TechDummiesNarendraL)
- [Gaurav Sen](https://www.youtube.com/@gkcs)
- [codeKarle](https://www.youtube.com/@codeKarle)
- [ByteByteGo](https://www.youtube.com/@ByteByteGo)
- [System Design Interview](https://www.youtube.com/@SystemDesignInterview)
- [sudoCODE](https://www.youtube.com/@sudocode)
- [Success in Tech](https://www.youtube.com/@SuccessinTech/videos)

### 📜 Must-Read Engineering Articles

Weeks 14, 17, 19–21; case studies after fundamentals. 6 link entries.

- [How Discord stores trillions of messages](https://discord.com/blog/how-discord-stores-trillions-of-messages)
- [Building In-Video Search at Netflix](https://netflixtechblog.com/building-in-video-search-936766f0017c)
- [How Canva scaled Media uploads from Zero to 50 Million per Day](https://www.canva.dev/blog/engineering/from-zero-to-50-million-uploads-per-day-scaling-media-at-canva/)
- [How Airbnb avoids double payments in a Distributed Payments System](https://medium.com/airbnb-engineering/avoiding-double-payments-in-a-distributed-payments-system-2981f6b070bb)
- [Stripe’s payments APIs - The first 10 years](https://stripe.com/blog/payment-api-design)
- [Real time messaging at Slack](https://slack.engineering/real-time-messaging/)

### 🗞️ Must-Read Distributed Systems Papers

Optional depth after weeks 10, 11, 19, 22. 10 link entries.

- [Paxos: The Part-Time Parliament](https://lamport.azurewebsites.net/pubs/lamport-paxos.pdf)
- [MapReduce: Simplified Data Processing on Large Clusters](https://research.google.com/archive/mapreduce-osdi04.pdf)
- [The Google File System](https://static.googleusercontent.com/media/research.google.com/en//archive/gfs-sosp2003.pdf)
- [Dynamo: Amazon’s Highly Available Key-value Store](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
- [Kafka: a Distributed Messaging System for Log Processing](https://notes.stephenholiday.com/Kafka.pdf)
- [Spanner: Google’s Globally-Distributed Database](https://static.googleusercontent.com/media/research.google.com/en//archive/spanner-osdi2012.pdf)
- [Bigtable: A Distributed Storage System for Structured Data](https://static.googleusercontent.com/media/research.google.com/en//archive/bigtable-osdi06.pdf)
- [ZooKeeper: Wait-free coordination for Internet-scale systems](https://www.usenix.org/legacy/event/usenix10/tech/full_papers/Hunt.pdf)
- [The Log-Structured Merge-Tree (LSM-Tree)](https://www.cs.umb.edu/~poneil/lsmtree.pdf)
- [The Chubby lock service for loosely-coupled distributed systems](https://static.googleusercontent.com/media/research.google.com/en//archive/chubby-osdi06.pdf)
