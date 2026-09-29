import {readFileSync,writeFileSync} from 'node:fs';
const audit=JSON.parse(readFileSync('artifacts/awesome-reference-review.json','utf8'));
const groups=Object.groupBy(audit.links,x=>x.category);
const ranges={Introduction:'Weeks 1–2, optional orientation','⚙️ Core Concepts':'Weeks 5, 9–10, 13–14','🌐 Networking Fundamentals':'Weeks 1–2, 6–7','🔌 API Fundamentals':'Weeks 2, 4, 11–12, 16–17','🗄️ Database Fundamentals':'Weeks 3–4, 9–10; Bloom filters after week 20','⚡ Caching Fundamentals':'Weeks 6–7, 18','🔄 Asynchronous Communication':'Weeks 7, 11, 16','🧩 Distributed System and Microservices':'Weeks 10, 13–14, 22','🖇️ Architectural Patterns':'Client–server week 1; other styles after week 11','⚖️ System Design Tradeoffs':'Weeks 5–12, revisit in weeks 15–24','Interview problems / Easy':'URL shortener week 8; selected designs weeks 12–24','Interview problems / Medium':'Weeks 16–21, after constituent concepts','Interview problems / Hard':'Weeks 19–24 or optional advanced study','📇 Courses':'Optional parallel reference; access must be checked','📩 Newsletters':'Optional continuing reading','📚 Books':'Optional deeper study after week 9','📺 YouTube Channels':'Optional visual second explanation; choose a specific topic','📜 Must-Read Engineering Articles':'Weeks 14, 17, 19–21; case studies after fundamentals','🗞️ Must-Read Distributed Systems Papers':'Optional depth after weeks 10, 11, 19, 22'};
const selected=[
['Client-Server Architecture',[1],'First picture: client requests work from a service that owns shared state.'],['APIs',[2],'Connect a user action to a request and response.'],['HTTP/HTTPS',[2],'Give the request journey concrete protocol vocabulary.'],['Domain Name System (DNS)',[1,2],'Follow name lookup before the HTTP request.'],['ACID Transactions',[4],'Revisit all-or-nothing updates after learning tables.'],['Database Indexes',[3],'Connect query shape to the cost of finding data.'],['Latency vs Throughput',[5],'Use the AWS comparison to separate request delay from completed work per second.'],['Load Balancing',[6],'See selection algorithms after understanding replicated application servers.'],['Caching 101',[6],'Introduce repeated reads and freshness.'],['Content Delivery Network (CDN)',[7],'Extend caching to geographically distributed readers.'],['Message Queues',[7,11],'Learn deferred work before designing notifications.'],['Data Replication',[9],'Study copied data and lag after one-database correctness.'],['Database Sharding',[9],'Divide data only after explaining the access pattern.'],['CAP Theorem',[10],'Read after concrete network-partition examples, not as a slogan.'],['Idempotency',[4,11],'Reason about retries using a stable operation identity.'],['Rate limiting',[12,16],'Compare algorithm behavior; linked repository sketches need the corrections in this review.'],['Disaster Recovery',[14],'Tie recovery choices to acceptable downtime and data loss.'],['How to Answer a System Design Interview Problem',[15],'Use a discussion checklist after building foundational understanding.'],['Design URL Shortener like TinyURL',[8],'Compare a complete small design after making your own attempt.'],['Design Notification Service',[16],'Compare asynchronous delivery and preferences after queues.'],['Design WhatsApp',[17],'Compare durable history with live delivery after WebSockets and retries.'],['Real time messaging at Slack',[17],'Primary engineering case study: separate persistent connections and routing.'],['How Discord stores trillions of messages',[17,19],'Primary case study to revisit data layout and hot partitions.'],['How Canva scaled Media uploads from Zero to 50 Million per Day',[14,19],'Primary case study about workload-driven evolution and staged migration.'],['Stripe’s payments APIs - The first 10 years',[21],'Primary API-evolution case study; page metadata loads, article rendering may require a browser.'],['Distributed Locking',[22],'Read the author’s failure argument only after leases, pauses, and fencing.'],['MapReduce: Simplified Data Processing on Large Clusters',[20,22],'Optional original paper after partitioned data and background work.'],['Dynamo: Amazon’s Highly Available Key-value Store',[10,22],'Optional original paper after replication and consistency tradeoffs.'],['ByteByteGo',[1,6,15],'Optional visual channel. Endpoint reachable; individual videos were not watched or quality-rated.'],['Distributed Tracing',[13],'Original README URL returned HEAD 404; browser lookup found a working replacement.'],['Design Autocomplete for Search Engines',[20],'Incorrect README topic mapping: the destination is Design Instagram. Do not assign this as autocomplete.']
];
const resources=selected.map(([label,weeks,why],index)=>{
 const entry=audit.links.find(x=>x.label===label);if(!entry)throw new Error(label);
 const wrong=label==='Design Autocomplete for Search Engines';
 const replacement=label==='Distributed Tracing';
 const canva=label.startsWith('How Canva');
 const host=new URL(entry.url).hostname;
 return {id:`awesome-${String(index+1).padStart(2,'0')}`,title:label,url:replacement?'https://www.dynatrace.com/knowledge-base/distributed-tracing/':entry.url,provider:host.replace(/^www\./,''),kind:entry.category.includes('Papers')?'paper':host.includes('youtube')?'video-channel':entry.category.includes('Interview problems')?'worked-design':'article',access:host.includes('algomaster')?'Public page reachable; some course features/content may require an account or payment.':host.includes('youtube')?'Public channel; individual video access and content unreviewed.':'Public destination; no login or paid material copied.',checkedAt:audit.checkedAt,status:wrong?'broken':(entry.status===200||replacement||canva)?'verified':'unverified',why,weeks,verification:wrong?'HTTP 200 but destination title is Design Instagram.':replacement?'Web content inspected at replacement; original HEAD returned 404.':canva?'HEAD returned 405; web GET content inspected successfully.':`HTTP HEAD ${entry.status ?? 'unavailable'}; reachability only unless separately noted in review.`};
});
writeFileSync('content/resources-awesome.json',JSON.stringify(resources,null,2)+'\n');
const counts=Object.fromEntries([...new Set(audit.links.map(x=>x.status))].map(code=>[String(code),audit.links.filter(x=>x.status===code).length]));
const inventory=Object.entries(groups).map(([category,entries])=>`### ${category.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')}\n\n${ranges[category]||'Week 15: interview communication'}. ${entries.length} link entries.\n\n${entries.map(e=>`- [${e.label}](${e.url})`).join('\n')}`).join('\n\n');
const document=`# Review: awesome-system-design-resources

Reviewed 2026-09-29. Repository: [ashishps1/awesome-system-design-resources](https://github.com/ashishps1/awesome-system-design-resources), commit \`${audit.commit}\`. This is an independent review and learning-path map; the reference checkout remains unchanged.

## What this repository can contribute

The strongest use is a topic index and a source of optional second explanations. It contains a README, two PNG diagrams, eleven Python examples, eleven Java examples, and a GPLv3 license. The README has 142 external-link entries and 141 unique URLs. It does not supply a six-month sequence, durable learner exercises, a graded progression, or tests for its algorithm examples. A beginner therefore needs an original guided lesson before following the relevant link.

Start with client–server, a request journey, HTTP/APIs, one database, indexes, and transactions. Then introduce measurement, scaling, caching, queues, copying data, and dividing data. Put consistency, recovery, locks, and papers after those foundations. The README places consistent hashing and CAP among core concepts; neither should be a beginner's first explanatory model. Treat product-design difficulty labels as informal. Distributed key-value stores and UPI are not inherently easy; parking-garage and vending-machine exercises often concern object design rather than distributed architecture.

The interview-template image gives a useful seven-part checklist: requirements, estimates, broad design, database, API, deep dives, and important issues. Our lessons should teach why and when to use each step with a small worked example. Redraw original explanatory diagrams and progressively add components; do not make the image itself the curriculum.

## Access, licensing, and limits

The checkout's LICENSE is GNU GPL version 3. Preserve the license and attribution if redistributing its code or diagrams, and review applicable distribution obligations before incorporating adapted implementation code. This review copies no implementation code or diagram into the academy. Linked articles, paid courses, newsletters, books, videos, and papers keep their own rights and access terms; the repository license does not relicense third-party material. Our course uses original prose and links. The “free resources” description is not a guarantee that every destination or feature is free, complete, or accessible without an account. No paid material was accessed or copied.

We read the entire README, license, and all 22 implementation sources. All eleven Python files parsed successfully. Three targeted Python reproductions ran after stripping top-level demo code; Java was reviewed statically, not compiled or executed. No linked video was watched. We inspected selected article content, not every article or all linked course chapters.

## Link verification and corrections

The bounded checker used at most eight workers, one HEAD request per README link entry, an eight-second timeout, and TLS validation. Results: ${JSON.stringify(counts)}. These count entries, including one duplicate URL. Detailed timestamps, final URLs, errors, and dynamic-code evidence are in [the machine-readable audit](../artifacts/awesome-reference-review.json); [the rerunnable checker](../scripts/review-awesome.py) records the same limits. A successful HEAD proves a responding endpoint, not correct content, free access, educational quality, or a video review.

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

The app-facing [resources-awesome.json](../content/resources-awesome.json) contains ${resources.length} selected entries with week mappings, access caveats, check timestamps, and precise status. Most are optional rather than required. Do not assign every link in a category to a beginner in one week.

- Weeks 1–4: client–server, DNS, HTTP, APIs, indexes, transactions. Give the learner a notes-app request to trace before opening external material.
- Weeks 5–8: latency/throughput, load balancing, caching, CDN, queues, then a URL shortener. Require a before/after drawing and a small estimate.
- Weeks 9–12: replication, sharding, consistency, idempotency, rate limits. Require an explicit failed-request or duplicated-message example.
- Weeks 13–15: observations, recovery targets, and interview communication. Prefer one failure story over a list of tools.
- Weeks 16–18: notifications, limiter, chat, feeds. Read Slack/Discord only after attempting a complete local design.
- Weeks 19–24: media/storage, payments, coordination, and selected original papers. Canva is useful for seeing gradual migration rather than instantly adopting a new database. DDIA and original papers are optional depth, not first-week prerequisites.

## Full README topic-to-path map

${inventory}
`;
writeFileSync('docs/REFERENCE_REVIEW_AWESOME.md',document);
console.log(`Wrote review, full ${audit.linkEntries}-entry map, and ${resources.length} curated resources.`);
