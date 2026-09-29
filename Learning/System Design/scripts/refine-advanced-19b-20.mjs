import {refine,walk as W,step as S} from './refine-advanced-utils.mjs';

refine('file-sync-and-conflicts',{
sections:{tradeoff:`Detecting a competing edit does not decide what the people intended. Choose that product behavior separately.

| Conflict policy | Benefit | Cost or limit |
| --- | --- | --- |
| Preserve both versions | Avoids silent loss of either draft | Extra storage and a user decision |
| Last write wins under a defined order | Simple single-result rule | Deliberately discards another edit |
| Automatic text merge | Can combine disjoint changes | May still produce unintended meaning; does not fit every file type |

Our first design preserves both. A later human resolution should save against the new current base version, not bypass the version check.

Device clocks do not prove which intention deserves to win. Binary photos and spreadsheets also differ from plain text; do not apply one merge rule to every format without a product decision.

**Interview phrase:** “I can detect that this edit was based on older state. Preservation is my initial resolution policy.” Trace a normal edit, competing offline drafts, and a long-disconnected device.

Push notifications can make a device check sooner. The durable change stream and version checks still repair missed notifications.`,sync:`A device with thousands of files should ask **what changed after its saved position**, not download everything on each reconnect.

| Change-stream item | Device action before checkpointing |
| --- | --- |
| File 42 now has version 8 | Fetch permitted new content; first preserve any unsaved local edit and its base |
| File 51 was deleted | Apply the deletion marker; preserve conflicting local work before removing the working view |
| End of batch: cursor 106 | Save 106 only after the batch is durably accounted for |

This batch began after cursor 104. A cursor belongs to a documented stream and scope; it is not a universal time for the whole system.

~~~text
fetch batch → preserve local drafts → apply remote changes repeatably
            → durably record local outcome → checkpoint cursor
~~~

A repeated event should not create a second file. A crash-safe local transaction or carefully repeatable apply-then-checkpoint procedure handles the boundary.

**Common mistake:** advancing the cursor because the network response arrived. If the device crashes before local application, its next request could skip work it never saved.`},
walkthrough:W('preserve-before-catchup','Catch up without erasing an offline draft','sync','The laptop has one unsaved edit. A new remote version arrives in a synchronization batch; both pieces of work must remain accounted for.',[
 S('Notice the two kinds of state','The laptop has an accepted base and an unsaved working draft. They are not interchangeable.',{'File':'file_17','Local draft base':'version_4','Unsaved local work':'present','Saved cursor':'300'}),
 S('Receive a newer remote version','The batch says file_17 is now version_5. Do not copy those bytes over the only local draft.',{'Remote event':'file_17 → version_5','Batch end':'301','Local draft':'still preserved'}),
 S('Record a conflict safely','Keep the draft and its base as a pending/conflict copy, then apply the permitted remote version to the synchronized view.',{'Synced view':'version_5','Conflict copy':'local edit based on version_4','User decision':'still pending'}),
 S('Checkpoint accounted-for work','After the remote update and preserved local draft are durable, the device can acknowledge this batch. Sync completion does not mean the content conflict was resolved.',{'Saved cursor':'301','Remote batch':'applied','Draft':'durably preserved','Conflict resolution':'not yet chosen'})
 ],'A safe cursor can advance after preserving an unresolved conflict. It must never advance by silently deleting the local work.'),
changes:['Added a conflict-policy comparison and explicit apply/checkpoint table.','Preserved reviewed offline-draft protection in the rewritten sync explanation.','Added a dirty-local-file catch-up walkthrough; retained both reviewed diagrams.']});

refine('design-video-platform',{
sections:{watch:`Follow the viewer’s operations in order:

~~~text
permission check → permitted playlist → segment request → buffered playback
                                              ↑
                              choose the next suitable quality
~~~

On a CDN miss, the permitted source supplies the segment. The player keeps a buffer so a short network delay need not immediately stop playback.

Use a separate six-second segment encoded at 1 Mbps. It contains about 6 megabits, or 0.75 MB, before container overhead.

| Available transfer rate | Ideal transfer time | Implication for six seconds of media |
| --- | --- | --- |
| 3 Mbps | 2 seconds | Can replenish the buffer under these assumptions |
| 0.5 Mbps | 12 seconds | This quality consumes buffer faster than it replenishes it |

Lowering future quality can preserve playback. A player cannot retroactively make a slow segment arrive sooner; it chooses subsequent segments using observed throughput and buffer state.

Real network measurements vary. Players smooth observations rather than assuming one sample predicts the future. HLS describes playlist and segment delivery; these numbers are a simplified original example.

**Pause and predict:** does a fast metadata API help if every segment takes longer to transfer than its playback duration? Point to the byte path that is actually behind.`,explain:`Use two drawings: preparation and playback. Each has a different definition of success.

| Journey | Successful outcome | Useful observation |
| --- | --- | --- |
| Upload | Original verified and recoverable | Failed or abandoned uploads |
| Preparation | A coherent output version is published | Oldest processing job and conversion failures |
| Playback | A permitted viewer starts and keeps watching | Start delay and rebuffering |

At 10,000 concurrent viewers averaging 2 Mbps, delivery is roughly 20 Gbps before overhead. This estimate explains why one small application server should not carry every playback byte.

A healthy upload API does not establish smooth viewing. Likewise, a working CDN does not prove newly uploaded videos become playable.

**Interview phrase:** “I will explain the ready-to-play boundary first, then the viewer’s byte path.” Advanced codecs, live latency, and digital-rights systems are separate extensions after these three journeys are clear.`},
walkthrough:W('buffer-behavior','See the difference between downloading and playing','watch','A player already has four seconds buffered. The next segment contains six seconds of media. For this idealized trace, playback continues at one media-second per real second.',[
 S('Choose the next segment','The playlist offers allowed qualities. The player selects one using measured conditions and its current buffer.',{'Buffered media':'4 seconds','Next segment duration':'6 seconds','Selected quality':'suitable measured bitrate'}),
 S('Download while playback continues','Suppose the transfer takes two seconds. Those two seconds also consume two seconds of the existing buffer.',{'Transfer time':'2 seconds','Old buffer remaining':'2 seconds','New segment':'6 seconds complete'}),
 S('Add the completed media','The completed segment extends the playable buffer. Under this simplified model, two old seconds plus six new seconds gives eight.',{'Buffered media':'8 seconds','Playback':'continues','Segment state':'complete'}),
 S('React before the next decision','If the connection weakens, the player can choose a lower bitrate for a later segment. The buffer is temporary time to react, not extra network capacity.',{'Network signal':'slower than before','Next choice':'consider lower bitrate','Buffer purpose':'absorb temporary variation'})
 ],'Downloaded bytes become playable time. Compare how fast that time is added with how fast playback consumes it.'),
changes:['Replaced playback prose with an annotated flow and distinct-number segment arithmetic table.','Added a three-journey outcome/observation comparison.','Added an evolving playback-buffer walkthrough; preserved isolated immutable processing outputs and both reviewed diagrams.']});

refine('design-search-and-autocomplete',{
sections:{analogy:`A book’s index lists the pages discussing a word. A search index similarly maps terms to document identities so each query need not reopen every document.

Our team knowledge base has saved articles, text search, and title suggestions. Search may trail an ordinary edit by a few seconds; private content must not be disclosed to unauthorized people. Keep freshness and permission requirements separate.

| Document | Text |
| --- | --- |
| A | system design notes |
| B | design interview |
| C | system reliability |

Invert that information into a lookup:

| Term | Matching document identities |
| --- | --- |
| system | A, C |
| design | A, B |
| reliability | C |

For “system AND design,” intersect the two lists: A appears in both. The index locates a candidate; serving it still needs the applicable access checks.

**Pause and predict:** which lookup row changes when a new article containing “reliability” is added? Identify the mechanism before choosing a search product.`,suggest:`Autocomplete answers a narrower question: “Which allowed completions begin with what the user has typed?”

~~~text
s → y → s
        ├→ system design
        └→ system reliability
~~~

This is the idea behind a trie, a branching character structure. A specialized completion field or a small precomputed prefix table can serve the same product need. No single structure is required for every catalog.

Keep only a bounded useful set for each common prefix, ordered by an explicit signal within the allowed audience. Prefix identity, language, tenant, and permission scope can affect cache reuse.

Wait briefly for typing to settle before requesting suggestions. Tag each request and ignore replies for an older input. Cancellation can reduce wasted work, but it may arrive too late to prevent an old response.

**Common mistake:** making all previous query text a public suggestion source. Query logs can contain names, secrets, and sensitive interests. Apply collection, moderation, and audience policies before exposing suggestions.`},
walkthrough:W('latest-prefix-wins','A faster old response is still the wrong response','suggest','The user types two prefixes in quick succession. Request identities keep the display tied to the current input even if the network reorders replies.',[
 S('Request the first prefix','The client sends one suggestion request and records its identity.',{'Input':'s','Request ID':'41','Latest request':'41'}),
 S('The user keeps typing','The client issues a newer request. It may cancel the old one, but correctness must not depend on cancellation succeeding.',{'Input':'syst','Request ID':'42','Latest request':'42','Old request':'cancellation best effort'}),
 S('The newer reply arrives','The response belongs to request 42 and the current permitted scope, so the client may show it.',{'Reply':'42 / syst','Latest request':'42','Display':'allowed syst suggestions'}),
 S('The old reply arrives afterward','Request 41 is no longer current. Ignore it instead of replacing suggestions for the newer input.',{'Reply':'41 / s','Latest request':'42','Display':'unchanged','Action':'discard obsolete reply'})
 ],'Response order is not input order. The latest input identity decides which result may update the interface.'),
changes:['Added actual documents and inverted-index lookup tables.','Added a compact prefix-tree illustration and clarified request tagging versus cancellation.','Added an out-of-order autocomplete walkthrough, keeping both reviewed index/permission diagrams.']});
