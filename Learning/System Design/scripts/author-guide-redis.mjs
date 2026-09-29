import {guide,sec,diag,choice,open,cards,terms,source} from './guide-worker-utils.mjs';
const visual=(sectionId,...args)=>({...diag(...args),sectionId});
guide('redis-from-scratch',{
summary:'Meet Redis as a running data-structure server, read its basic commands, and distinguish a disposable cache from data whose loss changes the product.',
objectives:['Trace a command from application to Redis and back.','Choose strings, hashes, lists, sets, and sorted sets from concrete operations.','Explain key expiration and memory eviction.','Distinguish cache correctness from persistence and atomic command behavior.'],
terms:terms([['Redis','A data-structure server that applications access using commands.'],['Client library','Application code that manages communication with another service and exposes convenient operations.'],['TTL','Time to live: an expiration duration associated with stored data.'],['Eviction','Removal of data under a memory-management policy.'],['Persistence','Saving data outside temporary process memory so it can be recovered under a configured policy.'],['Atomic command','A command whose operation is indivisible with respect to competing operations under the server’s execution rules.']]),
retrieval:['What is the difference between a cached copy and the saved record it represents?','Why should a cache key distinguish data that different users are allowed to see?'],
sections:[sec('server','Redis is a program your application talks to',`
Pocket Notes already keeps accepted notes in a database. Imagine its public home page repeatedly asks for the same small summary. We can keep a copy in Redis and avoid doing the same database work for every visit. First understand what Redis is: a server process that receives commands, manages data, and sends replies.

The notes application uses a Redis client library to connect and issue those commands. Redis is not a keyword added to a SQL query, and installing a library does not by itself start a Redis server. In a local setup both programs can run on one machine; in a larger service they may be separate network participants.

Think of a staffed desk holding labeled working cards. You ask the desk for a card or request a change. The analogy stops at guarantees: Redis has specific data types, concurrency, memory, and persistence behavior. A desk metaphor cannot prove that a saved value survives a crash.
`),sec('commands','Read a small command conversation',`
These commands illustrate the Redis command interface. They are examples to trace, not evidence that a Redis instance has been installed or tested on your machine.

~~~text
SET demo:note:41 "Garden"
GET demo:note:41
DEL demo:note:41
GET demo:note:41
~~~

The first command stores a string at a key. The first GET returns Garden. DEL removes the key. The final GET reports no value, commonly displayed as nil by a command-line client. No value is different from a successful lookup of an empty string; the application should distinguish them.

The colons are a naming convention, not automatic nested folders. A name such as demo:note:41 makes the scope understandable. In a shared application, include every identity needed to avoid mixing different accounts or representations. Keep command names separate from untrusted values through the client library’s argument interface.
`),sec('types','Choose the structure from the operation',`
A string holds a sequence of bytes; it can contain text, encoded JSON, or a supported integer representation. A hash stores named fields under one key. A list keeps values in sequence. A set keeps unique members without promising application-visible ordering. A sorted set associates unique members with numeric scores for ordered retrieval.

| Need | Candidate structure | Example operation |
| --- | --- | --- |
| One prepared public summary | String | GET the known key |
| A small group of deployment fields | Hash | HGET a named field |
| Ordered recent values | List | Read a bounded slice |
| Unique labels attached to a note | Set | Add or test membership |
| Ranked items with scores | Sorted set | Retrieve a score range |

Redis also has other structures, including streams, but the first five already illustrate the principle. Choose by required operations and measured size. Storing a huge JSON string and replacing it for every tiny change has different costs from changing one hash field.
`),sec('hash','Worked example: update a field and a counter',`
Consider these illustrative commands:

~~~text
HSET demo:deployment:301 status ready region eu
HGET demo:deployment:301 status
SET demo:views 0
INCR demo:views
~~~

HSET records two fields in one hash. HGET returns ready for the status field. INCR adds one to the integer value, so the counter becomes 1. Redis checks types: using an unsuitable command on a key with an incompatible type produces an error rather than treating every representation as interchangeable.

Why use INCR rather than GET, add in application code, then SET? Two callers can both read 0 and each write 1, losing one increment. A supported atomic increment avoids that split operation. But sending the same increment twice still increments twice. Atomic does not mean duplicate-safe: a retried view event needs its own product policy if duplicate counting matters.
`),sec('expiry','Expiration removes a key; it does not refresh it',`
SET demo:summary "Garden" EX 60 stores a string with a sixty-second expiration. TTL demo:summary asks about remaining lifetime in seconds. Under the documented key-level TTL behavior, -1 means the key exists without an expiration, and -2 means it does not exist. Do not treat either response as an ordinary negative countdown.

After the expiry time, the key is no longer usable as a live cached answer. The next cache miss may trigger a fresh database read. Redis does not know how to regenerate this summary simply because EX was supplied. That work belongs to the application.

Also, sixty seconds since cache insertion is not necessarily sixty seconds since the source changed. A slow fill could insert an already-old value. Replacing a key with plain SET normally discards its earlier TTL unless an appropriate option preserves it. Always review expiration when changing write commands; accidentally immortal cache entries are a common source of stale results.
`),sec('cache','Follow a miss, a fill, and a later hit',`
Use cache-aside for the public summary. First the application checks Redis. If the key exists and its representation is valid for this request, return it. If the key is absent, read the saved database records, compute the summary, store it with a chosen expiration, and return it. A later request can reuse that stored result.

The database remains the source of truth here: the place whose accepted state decides the real saved notes. Losing the cache should lose a shortcut, not the only copy of a note. Cache failure can fall back to the database within a bounded load policy; sending an unlimited burst to storage may overload it.

An edit changes the saved note first under its normal rules. Then the application can remove or refresh affected cached representations. There is still a race if an older in-flight read fills the cache afterward. Later freshness lessons examine versions and coordination; Redis’s presence alone does not solve that ordering problem.
`),sec('memory','A fast working copy still has limits',`
Redis commonly keeps its working dataset in memory, avoiding disk access for many ordinary operations. This is a reason to investigate it for low-latency work, not a guarantee that every command is cheap. Large values, large scans, network delay, and busy processing all affect response time.

Memory has a budget. An eviction policy may remove eligible keys when the configured limit is reached; a no-eviction policy can instead reject writes that need more memory. Eviction differs from expiry: expiry follows a key’s time condition, while eviction responds to capacity policy. Applications using Redis as a cache must expect misses from either cause.

Decide which keys are replaceable. Mixing disposable summaries and irreplaceable work records under an unsuitable eviction policy can lose important state. Bounded result sizes and explicit memory observations matter more than assuming that an in-memory product has infinite capacity.
`),sec('persistence','A cache and a primary store need different recovery promises',`
Redis supports persistence mechanisms such as snapshots, which periodically record dataset state, and an append-only file, which records changes for recovery. The exact policy determines which acknowledged changes might be absent after a failure and how long restoration takes. Turning on persistence is not a universal zero-loss promise.

If Redis only caches public summaries, rebuilding them may be acceptable. If it is the only store for user sessions or job state, a loss changes user or workflow behavior. A session loss might require signing in again; lost payment or job state may be far less acceptable. State the loss tolerance for the actual data.

Replicas and backups address different failure stories. Another live copy can help with some failures, while retained recoverable history may help after an accidental change. Configure, monitor, and test the required recovery path. Do not infer safe failover or complete backup coverage from the name Redis.
`),sec('correctness','Atomic operations do not cover an entire application',`
A single supported command can protect its own operation, but a sequence of separate application commands can have gaps. Redis transactions group queued commands for execution without another client’s commands interleaving. They do not provide SQL-style rollback of every successful command when a later command encounters a runtime error.

Nor does a Redis operation atomically commit an unrelated SQL update or external API call. If the database accepts a note but cache invalidation fails, the design needs a freshness or recovery policy. If a response disappears after INCR succeeds, retrying may increment again. Separate the question “could another operation interleave?” from “could this whole request run twice?”

For this chapter, keep the correctness rule small: cache entries are derived, scoped, and replaceable; important saved records remain in the database. Learn a more complex Redis role only when its guarantees are understood and needed.
`),sec('ai','Worked example: caching an AI deployment configuration',`
An AI gateway repeatedly reads deployment 301’s ready configuration: model version 12, allowed limits, and region. Suppose this complete configuration is revision 4. A cached copy can avoid repeated registry reads. Use a key that includes the account and configuration revision, such as config:team8:deployment301:cfg4. The model version and configuration revision are different identities: changing a limit or region creates a new configuration revision even if the model stays at version 12. Check the caller’s access; knowing the key is not authorization.

Step one: resolve the allowed deployment and current configuration version. Step two: check its cache key. Step three: on a miss, load the permitted registry data and cache that representation. Step four: when configuration changes, use the new version and retire old copies under policy. Versioned keys do not eliminate the need to learn which version is current.

Do not casually cache all model answers under prompt text alone. Answers may depend on user permissions, model version, retrieved private documents, settings, and time. Similar text does not establish safe interchangeability. Start with a clearly reusable configuration record; define all inputs and privacy boundaries before considering generated-answer caching.
`)],
diagrams:[visual('commands','client','The application sends commands to a separate server role',`flowchart LR
A[Notes application] --> L[Redis client library]
L -->|GET or SET command| R[Redis server]
R --> M[(Keyed data structures)]
M --> R
R -->|Value missing or error| L
L --> A`,'The client library and Redis server are different roles even when they run on the same laptop.',['Create a connection through the client library.','Send a command and separate arguments.','Let Redis apply its data-type rules.','Handle success, missing data, timeout, and error distinctly.']),visual('cache','cache-path','A missing cache entry leads back to saved data',`flowchart TB
Q[Allowed summary request] --> C{Redis value available?}
C -->|Yes| H[Return suitable cached summary]
C -->|No| D[(Read saved database state)]
D --> B[Build summary]
B --> F[Store cache entry with expiry]
F --> R[Return summary]`,'This example caches a derived public representation. An unavailable Redis server additionally needs a bounded fallback policy.',['Attempt the known scoped key.','Treat missing cache data as a miss.','Rebuild from saved records.','Store an expiring reusable result and return it.'])],
exercise:{minutes:12,prompt:'Trace SET demo:views 0, then two INCR commands, then GET. Explain the expected final value, why replacing each increment with a separate GET/SET can lose an update, and why retrying an uncertain INCR can overcount. Then decide whether this counter may be lost in your product.',rubric:['Predicts final value 2 under the stated successful sequence.','Explains the two-read/lost-update race.','Separates atomicity, duplicate effects, and loss tolerance.'],solution:'The counter ends at 2. Separate callers can both read 0 and write 1, whereas each atomic INCR updates the accepted value. If an increment succeeds but its response is lost, repeating it can count the same logical event twice. A decorative view count may tolerate approximation and rebuilding; billing or strict quotas require a stronger identity, persistence, and correctness design. The product requirement decides.'},
questions:[choice('q1','Redis client library and Redis server are the same thing:',['True','False'],'False','The library sends requests; a server process holds and operates on the data.'),choice('q2','What does a TTL automatically do for our summary?',['Recompute it from SQL','Expire the key according to its time condition','Prevent all stale reads'],'Expire the key according to its time condition','The application still decides how to refill the cache and handle races.'),choice('q3','Two successful INCR commands on an initial zero produce:',['0','1','2'],'2','Each command adds one; repeating the logical request can therefore duplicate its effect.'),open('q4','Why is Redis with persistence not automatically a zero-loss store?','The configured snapshot/log flush and recovery behavior determine loss windows; failure modes and failover assumptions must be tested.','State the actual durability contract rather than inferring it from a feature name.'),open('q5','What belongs in an AI cache-key decision besides prompt text?','The permitted user or account scope, relevant data/document versions, model and configuration versions, and other inputs that change the allowed answer.','Some results may be unsuitable to share or cache at all.')],
flashcards:cards([['Redis role?','A server accepting commands over keyed data structures.'],['Expiry versus eviction?','Time condition versus memory-capacity policy.'],['Atomic increment versus idempotency?','One indivisible increment can still repeat when a request is retried.'],['Source of truth in our cache example?','The saved database records; Redis holds replaceable derived copies.'],['Persistence question?','Which accepted changes survive which failures under the actual configuration?']]),mentalModel:'Know the key, the operation, and the role of the value. Then ask what expiration, repetition, and loss mean.',
sources:[source('Redis: data types','https://redis.io/docs/latest/develop/data-types/'),source('Redis: SET','https://redis.io/docs/latest/commands/set/'),source('Redis: GET','https://redis.io/docs/latest/commands/get/'),source('Redis: TTL','https://redis.io/docs/latest/commands/ttl/'),source('Redis: INCR','https://redis.io/docs/latest/commands/incr/'),source('Redis: HSET','https://redis.io/docs/latest/commands/hset/'),source('Redis: eviction','https://redis.io/docs/latest/develop/reference/eviction/'),source('Redis: persistence','https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/'),source('Redis: transactions','https://redis.io/docs/latest/develop/using-commands/transactions/')]
});
