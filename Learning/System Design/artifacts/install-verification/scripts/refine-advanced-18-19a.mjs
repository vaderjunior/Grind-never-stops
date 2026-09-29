import {refine,diagram as D,walk as W,step as S} from './refine-advanced-utils.mjs';

refine('design-news-feed',{
sections:{model:`The post and the reader’s prepared list have different responsibilities.

| Stored record | Concrete example | Owns which fact? |
| --- | --- | --- |
| Post | p_91 by user_4, body, visibility, deletion state | Current content and availability |
| Follow | reader_8 follows user_4 | The relationship used by feed policy |
| FeedEntry | reader_8 → p_91 at an order key | A candidate shortcut for this reader |

A feed entry is not permanent permission to show a post. The source post and current relationship/policy decide eligibility.

~~~text
POST /posts + stable operation identity → one accepted source post
GET /feed?cursor=...&limit=20 → a bounded eligible page
~~~

Derive the author from authentication and authorize follow operations. Index recent posts by author and follow relationships by reader because those are the reads the design needs.

**Pause and predict:** if the body of p_91 changes, should every prepared feed entry become another owner of the text? Storing post IDs keeps that responsibility with the source.`,pull:`Begin by assembling a feed when a reader asks for it:

~~~text
followed authors → bounded recent posts → current eligibility → ordered page
~~~

For a small community, an indexed relational query or bounded service operation may satisfy the latency goal. Avoid assuming that one simple query is inherently too small-scale.

| Pay for assembly… | Work when posting | Work when reading |
| --- | --- | --- |
| On read | Mostly one source-post write | Retrieve and merge authors’ candidates |
| On write | Source write plus recipient index work | Read prepared candidate IDs, then hydrate and authorize |

A reader following ten quiet people and a reader following two thousand busy accounts have different read costs. Bound candidate counts and history ranges; do not fetch every historical post.

Measure first-page latency and database work. A prepared index is justified when its reduced read work is worth extra recipient writes, delayed fan-out, storage, and rebuild responsibility.`},
addedDiagram:D('feed-page-cursor','read','A cursor follows a stable boundary, not a shifting row number','flowchart TB\nP[Page one ends at time 10:00 and post p_70] --> C[Cursor stores the defined ordering boundary]\nN[New post arrives above page one] --> T[Top of feed changes]\nC --> Q[Next query asks for keys below the boundary]\nQ --> A[Authorize and return eligible older candidates]\nT -.-> Q','Creation time needs a unique tie-breaker. A stable full browsing snapshot is an additional contract; the boundary alone does not freeze permissions or content.',['Order using a defined key with a unique tie-breaker.','Return the last ordering boundary with the page.','Use that boundary when new items appear at the top.','Recheck current eligibility on every returned page.']),
walkthrough:W('candidate-is-not-permission','Turn candidate IDs into a permitted page','read','The prepared index is only a starting list. Follow a normal read that contains one stale candidate.',[
 S('Read the shortcut','The feed index has three candidate identities for reader_8.',{'Reader':'reader_8','Candidate IDs':'p_91, p_88, p_83','Returned content':'none yet'}),
 S('Load current source facts','Hydration retrieves the current records. One candidate is now deleted.',{'p_91':'visible and allowed','p_88':'deleted','p_83':'visible and allowed'}),
 S('Apply policy and order','The page keeps eligible candidates in the defined order. It does not display the deleted body merely because its ID remains in the index.',{'Eligible IDs':'p_91, p_83','Suppressed':'p_88','Index cleanup':'may happen later'}),
 S('Return a bounded result','If the page is short, any extra candidate fetch must remain bounded. Return a valid continuation under the chosen cursor contract.',{'Items returned':'2 in this trace','Extra fetching':'bounded by policy','Cursor':'defined candidate/order boundary'})
 ],'A prepared list saves search work. It does not become a second authority for current content or access.'),
changes:['Added source-record and push/pull responsibility tables.','Added an ordered-cursor diagram with explicit continuity limits.','Added candidate hydration walkthrough using concrete IDs and a stale entry.']});

refine('feed-fanout-and-ranking',{
sections:{ranking:`A ranker can only order the candidates it receives. If retrieval misses a useful post, a perfect scoring formula cannot recover it.

| Stage | Example input | Job |
| --- | --- | --- |
| Retrieve | Prepared IDs plus followed-author timelines | Gather a bounded candidate set |
| Deduplicate | p_12 appears through both paths | Keep one logical post |
| Filter | Current deletion, follow, block, and visibility facts | Remove ineligible content |
| Score | Eligible post plus age and interaction features | Apply a stated ordering rule |
| Select | Ordered survivors | Return a bounded page |

For a first rule, favor recent posts and recent direct interaction while limiting repetition from one author. These are teaching inputs, not a claim about another platform’s production algorithm.

Name the product objective: useful discussion, user control, or another outcome. Clicks alone are not identical to learning value.

A learned model adds feature and model operations. It still needs a latency budget and a fallback. Authorization is not a feature the model may choose to ignore.`,stability:`Scores change as posts age and interactions arrive. A last-score cursor can therefore point into a different order on the next request.

| Continuity choice | Reader experience | Cost or limit |
| --- | --- | --- |
| Short-lived ordered ID list | Continue through one prepared session | Store and expire session state |
| Deliberately changing feed | New ordering can appear immediately | Explain weaker continuity; deduplicate and refresh |

A session can store IDs such as p_12, p_7, p_9. Later pages follow this list, but still check current eligibility. A stable presentation is not a permission snapshot.

After the session expires, ask the client to refresh rather than interpreting an obsolete score cursor as a compatible chronological cursor.

**Pause and predict:** p_7 is deleted between pages. Which promise should win: preserving the original list exactly, or respecting the current deletion? The list can retain the ID for continuity while the response suppresses its content.`},
addedDiagram:D('feed-policy-transition','transition','Overlap deliberately while a new retrieval path becomes complete','flowchart LR\nO[Old push policy covers earlier posts] --> M[Merge by stable post identity]\nN[New pull policy covers transition range] --> M\nM --> D[Deduplicate overlapping candidates]\nD --> P[Apply current eligibility]\nP --> V[Verify coverage before retiring old path]','This is a coverage plan, not an automatic migration guarantee. Persist a policy version or boundary and verify the required range before cleanup.',['Identify the posts each path promises to cover.','Allow bounded overlap while the new path catches up.','Deduplicate the same post identity before display.','Retire the old path only after coverage is verified.']),
walkthrough:W('rank-small-candidates','See what each feed stage changes','ranking','An illustrative rule scores three eligible posts. Scores are made-up teaching values; the lesson is the separation of stages.',[
 S('Merge the sources','The prepared list and a pulled author timeline overlap on p_12.',{'Prepared IDs':'p_12, p_7','Pulled IDs':'p_12, p_9','Raw candidates':'4 entries'}),
 S('Deduplicate and authorize','Remove the repeated identity and verify the three current records. Assume all three are allowed in this trace.',{'Unique candidates':'p_12, p_7, p_9','Eligibility':'all allowed now','Logical posts':'3'}),
 S('Apply one explainable score','The chosen age-and-interaction rule assigns scores to the surviving candidates.',{'p_12 score':'8','p_7 score':'6','p_9 score':'9','Highest first':'p_9, p_12, p_7'}),
 S('Keep presentation and access separate','A short-lived session stores the ordered IDs. Later pages still enforce current policy.',{'Session order':'p_9, p_12, p_7','Stored meaning':'presentation order','Access checks':'repeated when serving'})
 ],'Retrieval sets the opportunity, policy sets eligibility, and ranking sets order. A ranking fallback cannot skip the policy stage.'),
changes:['Replaced dense ranking and pagination text with stage and continuity tables.','Added a safe fan-out policy transition diagram.','Added concrete candidate merge, score, and session-state walkthrough.']});

refine('design-file-storage',{
sections:{why:`A community club shares event photos. Members upload, rename, organize, and download permitted files. Start with files up to 200 MB and exclude live collaborative editing.

Think of a cloakroom: the coat is large, while its claim ticket is small. File bytes are the coat; searchable metadata is the ticket. The analogy explains roles, but actual software must also handle concurrency, interrupted messages, and access changes.

| Fact | Example | Stored responsibility |
| --- | --- | --- |
| Stable file identity | file_57 | Metadata database |
| Display name | summer.jpg | Metadata database; can be renamed |
| Current version | version_3 | Metadata points to exact accepted content |
| Object key | files/57/versions/3 | Object storage holds those immutable bytes |
| Permission | club editors may download | Current application policy |

Renaming summer.jpg to picnic.jpg does not require copying 200 MB. The file identity and byte version can stay unchanged.

**Common mistake:** treating the visible filename as the only identity. Names can change or repeat; internal identity should remain unambiguous.`,size:`Estimate the two storage paths separately. These are supplied decimal-unit assumptions, not product measurements.

| Daily input | Calculation | Result |
| --- | --- | --- |
| Original bytes | 10,000 uploads × 8 MB | 80 GB/day |
| Thirty days of originals | 80 GB × 30 | 2.4 TB |
| Searchable metadata | 10,000 files × 1 kB | About 10 MB/day |

Versions, backups, previews, redundancy, and overhead are additional assumptions. Do not hide them inside the 2.4 TB number.

This difference explains separate storage roles. It does not prove that the small metadata service needs several databases.

**Interview phrase:** “I would scale the byte-transfer path and metadata path from their separate workload measurements.” Then trace an interrupted upload and a private download so the drawing explains correctness as well as capacity.`},
walkthrough:W('rename-and-download','Change a name without changing the file bytes','why','Follow an already-ready club photo. This example concerns metadata identity and private access rather than the protected multipart-recovery exercise.',[
 S('Start with a ready version','The database points to a verified immutable object, and the club can list the file.',{'File':'file_57','Display name':'summer.jpg','Current version':'version_3','State':'ready'}),
 S('Accept a rename','An authorized editor changes the display name. The accepted byte version and internal identity stay the same.',{'File':'file_57','Display name':'picnic.jpg','Current version':'version_3','Bytes rewritten':'none for this rename'}),
 S('Check a download request','A member asks for file_57. The application checks current permission before granting access to version_3.',{'Requested file':'file_57','Permission':'checked now','Target object':'files/57/versions/3'}),
 S('Grant bounded content access','If the chosen design uses a signed link, its scope and expiry constrain the grant. Revocation requirements must account for its remaining lifetime.',{'Granted version':'version_3','Link scope':'this content operation','Grant lifetime':'chosen product bound'})
 ],'A name describes a file, identity finds it, a version identifies its bytes, and permission decides who may obtain them.'),
changes:['Added a concrete metadata-versus-bytes record table and transparent storage arithmetic table.','Retained the two reviewed upload diagrams and their recovery boundaries.','Added a rename-to-authorized-download walkthrough without revealing the multipart exercise solution.']});
