import {guide,sec,diag,choice,open,cards,terms,source} from './guide-worker-utils.mjs';
const visual=(sectionId,...args)=>({...diag(...args),sectionId});
guide('blobs-files-and-objects',{
summary:'Follow one photo from upload to deletion while distinguishing raw blocks, named files, stored objects, and the database records describing them.',
objectives:['Explain block, file, and object interfaces without confusing them with physical media.','Separate content bytes from searchable metadata.','Trace upload, publication, and cleanup across two stores.','Apply the same reasoning to AI model artifacts and datasets.'],
terms:terms([['Byte','A small unit of digital data; files are represented as sequences of bytes.'],['Blob','Binary large object: a piece of binary content such as an image or model file.'],['Metadata','Information describing content, such as owner, size, type, or storage key.'],['Block storage','A storage interface exposing addressable blocks, commonly used beneath a filesystem or database.'],['File storage','Storage accessed through files and directories with filesystem operations.'],['Object storage','Storage accessed through named objects and service operations, often over a network API.'],['Checksum','A value computed from content to help detect whether those bytes changed or were corrupted.']]),
retrieval:['Why does a note-list screen need a photo reference without always downloading the full photo?','What happens when a database transaction tries to include an unrelated external service?'],
sections:[sec('photo','One photo has content and facts about content',`
Maya adds a garden photo to note 41. The photo’s bytes encode the image itself. Its metadata says who owns it, which note uses it, its size, and where to retrieve it. A database can search the metadata without loading the full image into every query result.

Suppose one image is 4 MB and its searchable record is 1 kB, using decimal units. A list of fifty records is about 50 kB. Fifty full images total about 200 MB. The difference comes from what the screen asks for, not from a magical product. Fetch small list information first, then load the needed preview or full content.

Blob is a name for binary content, not a separate physical storage technology. A database may store blobs, a filesystem may store image files, and an object service may hold them. The next question is how the application accesses and manages those bytes.
`),sec('blocks','Blocks are addressed pieces of storage',`
Block storage presents a volume: a sequence of addressable storage blocks. A filesystem or database can place its structures on that volume and read or write locations. A familiar analogy is blank numbered pages: a higher layer decides where a chapter begins and how to find its contents.

The analogy has limits. Actual storage has failure, durability, sharing, and performance behavior; a numbered address is not a guarantee that a write survives power loss. Applications normally use a filesystem or database above the block interface rather than inventing their own file directory from raw blocks.

A cloud block volume is not necessarily a physical disk plugged into the same machine. It may be a network service. Likewise, SSD and hard drive describe media, while block, file, and object describe interfaces. Keep those two classifications separate when reading an architecture diagram.
`),sec('files','Files add names, directories, and familiar operations',`
A filesystem lets a program open a path such as photos/garden.jpg, read bytes, write content, and manage directories. A local filesystem may sit on a block volume. A network file service exposes filesystem access to other machines. Its exact locking, rename, permission, and sharing semantics depend on the service and protocol.

File access is convenient for software expecting ordinary paths. An image tool can read a file; a database can manage its files on appropriate storage. But sharing a directory between several servers does not automatically make every concurrent application update safe. The program still needs the filesystem’s documented behavior and its own coordination rules.

For a local Pocket Notes prototype, controlled image files plus database references can be perfectly reasonable. Generate safe internal filenames instead of using arbitrary user-provided paths. A user’s filename is display metadata; it should not let them choose another user’s file or escape the permitted directory.
`),sec('objects','Objects use keys and service requests',`
An object store organizes content under keys, commonly inside a container called a bucket. The application can ask to put an object at a key, get its bytes, or delete it. A key such as photos/81/original resembles a path, but slashes can be part of a flat key namespace rather than real directory objects.

Do not assume it supports every filesystem operation. An ordinary object upload commonly creates or replaces an object representation; arbitrary in-place byte edits, atomic directory renames, and append behavior depend on the specific product and API. Software expecting a mounted filesystem may require adaptation.

Object storage is useful for content retrieved by identity, such as images, backups, datasets, and model artifacts. It does not automatically answer “find all photos belonging to notebooks shared with Arun.” Store that searchable relationship in an appropriate database or index, then use the resulting object keys to retrieve permitted content.
`),sec('compare','Compare access interfaces, not quality labels',`
| Interface | Application-facing idea | Typical investigation |
| --- | --- | --- |
| Block | Read or write locations in a volume | Storage underneath a filesystem or database |
| File | Open and manipulate named paths | Existing tools that need filesystem operations |
| Object | Put/get/delete named content through a service API | Large content with metadata and lifecycle rules |

These layers can coexist. A file server can use block volumes internally. An object service uses some physical storage underneath. The app’s choice concerns the contract it needs, not which label sits closest to a disk.

Ask about maximum object or file sizes, supported updates, concurrent writers, expected access frequency, recovery needs, and cost at the intended workload. Performance claims require measurement. “Objects are always slow” and “files cannot scale” are too broad to guide a real choice.
`),sec('upload','Walk through an upload before displaying it',`
Use explicit states for our photo: uploading, ready, and failed. First, the server checks Maya’s permission and creates an attachment record with a generated storage key and uploading state. Second, upload the content. Third, verify the completed object’s expected size and content properties, then mark the attachment ready. Only ready attachments appear as completed photos.

This sequence crosses a database and a content store. They do not share our ordinary database transaction. If bytes arrive but the final database update fails, an object may exist while the record still says uploading. If a record exists but upload fails, it must not pretend that the photo is ready.

A recovery process can inspect old unfinished records, verify whether content exists, complete valid pending work, or remove abandoned content according to a retention policy. Give the upload an identity so a retry continues or recognizes the intended attempt instead of accidentally producing unlimited unrelated copies.
`),sec('delivery','Retrieve only the content the caller may use',`
For a private photo, the application first checks notebook membership. It can then stream the permitted bytes itself or issue a narrowly scoped, expiring access link if the object service supports it. Such a link acts like a temporary capability: whoever holds it may be able to use it until its conditions expire. Do not place it in public logs or assume obscurity alone protects the original object.

Thumbnails are smaller derived versions of a source image. Give each representation a clear identity and record which original revision produced it. Replacing a photo’s bytes while reusing one forever-cached name can show an old image. A new versioned key makes the changed content explicit, although later cache lessons will explain the remaining policies.

Validate content using more than the filename extension. Limit size, check supported formats, and process untrusted files with appropriate isolation. Storage type does not make uploaded content trustworthy.
`),sec('delete','Deletion, backup, and lifecycle are separate promises',`
When Maya deletes an attachment, remove it from the visible application according to the product rule and arrange deletion of its stored representations. If deletion crosses stores, track pending cleanup and retry it. A metadata row disappearing does not prove that the original bytes, thumbnails, old versions, and backups all disappeared at the same instant.

A lifecycle policy automatically transitions or removes eligible stored content under defined age or state rules. It can control abandoned uploads or old versions, but it must not delete bytes still referenced by live records. Check the actual object/version behavior before making a privacy or retention promise.

Copies for availability are also different from recoverable historical backups. An accidental deletion may affect the live copies. Versioning and backups can help recovery when configured, retained, and tested, but preserving old versions also changes deletion and cost expectations. Make those requirements visible rather than treating “stored in the cloud” as a complete recovery plan.
`),sec('ai','Worked example: publishing an AI model artifact',`
An AI team trains model version 12. Its parameter files total 6 GB; a registry record describing owner, version, checksum, and storage keys is only a few kilobytes. The registry’s list page should retrieve those records, not download every model file. A deployment fetches the actual versioned artifact when it needs to run that model.

Step one: create an unpublished artifact record and upload all required files under a new version identity. Step two: verify expected files, sizes, and checksums. Step three: mark version 12 ready with its manifest—a list of the files belonging to that version. Step four: let deployments reference the ready version. Do not silently replace its bytes later while keeping the same version label.

If publication fails midway, no deployment should interpret a half-uploaded directory as a complete model. Retry or clean up the unfinished version. Training software that needs filesystem paths can stage the verified files locally or use a suitable file interface; an object key alone is not an ordinary local path. The same small-photo reasoning now protects a much larger artifact.
`),sec('checkpoint','Use a lifecycle story to check your choice',`
For any blob, tell the whole story: who creates it, where the bytes live, which record describes them, when it becomes visible, who may retrieve it, and how it is eventually removed or recovered. Draw failures between each pair of steps. These questions are more useful than saying “put images in object storage” without the connecting behavior.

Common mistakes are exposing a storage bucket because the database knows the owner, assuming a slash-containing key behaves like a directory, and marking an upload complete before verifying the content. Another is claiming a database rollback deletes a separately uploaded object. You can now identify each missing promise without needing cloud deployment experience.
`)],
diagrams:[visual('compare','interfaces','Interfaces sit above physical storage',`flowchart TB
A[Application needs bytes] --> F[File paths and operations]
A --> O[Object keys and service API]
F --> FS[Filesystem or file service]
FS --> B[Block interface where applicable]
B --> P[Underlying storage hardware and service]
O --> OS[Object service implementation]
OS --> P`,'Conceptual layering only. The diagram does not assert that every service has the same internal architecture.',['Choose the interface the application expects.','Distinguish a path from an object key.','Recognize that files may sit above block storage.','Evaluate the documented durability and update contract of the actual service.']),visual('upload','lifecycle','Keep incomplete content out of the ready view',`flowchart LR
A[Authorize and create uploading record] --> B[Upload bytes to generated key]
B --> C[Verify expected content]
C --> D[Mark metadata ready]
D --> E[Display completed attachment]
B -.->|Interrupted or uncertain| R[Inspect pending upload]
C -.->|Verification fails| R
R -->|Verified complete content| D
R -->|Retry same pending upload| B
R -->|Abandoned attempt| F[Mark failed and arrange cleanup]`,'The database and content store have separate commits. Recovery inspects a stable upload identity rather than assuming either side rolled back.',['Record the pending upload.','Store and verify its bytes.','Make readiness explicit in metadata.','Recover unfinished attempts without exposing them as completed content.'])],
exercise:{minutes:12,prompt:'A 6 GB model upload finishes, but the registry update to ready fails. The deployment loader reads only ready versions. Explain what it sees, how a recovery process can finish or clean up the upload, and why the checksum does not replace permission checks.',rubric:['Keeps the incomplete publication out of ready results.','Uses stable version identity and content verification in recovery.','Separates integrity from access control.'],solution:'The loader does not use the unfinished version even though bytes exist. Recovery inspects that version’s expected manifest, verifies stored content, and can mark it ready if all conditions hold; otherwise it retries or removes abandoned content according to policy. A checksum helps detect unexpected content changes. It does not establish that a caller is authorized to obtain the model.'},
questions:[choice('q1','What does an object key containing slashes necessarily imply?',['Real filesystem directories exist','Only that the key includes those characters','All objects share one transaction'],'Only that the key includes those characters','Directory-like display is not a guarantee of filesystem semantics.'),choice('q2','Which is metadata?',['The owner identifier and storage key','Only the raw image pixels','The complete 6 GB model file'],'The owner identifier and storage key','Those facts describe and locate content.'),choice('q3','A separate database rollback automatically deletes an uploaded object:',['True','False'],'False','The stores need an explicit recovery or cleanup workflow.'),open('q4','Why might a versioned artifact key help deployment correctness?','It binds a deployment to identified content and avoids silently changing bytes behind an unchanged version label.','Verification and access controls remain necessary.'),open('q5','What must a deletion promise consider beyond one visible metadata row?','Original bytes, derived previews, object versions, pending cleanup, caches, backups, and applicable retention rules.','The application should state which visibility and retention boundaries its promise covers.')],
flashcards:cards([['Block versus media?','Block is an access interface; SSD or disk is a storage medium.'],['File interface?','Named paths with documented filesystem operations.'],['Object interface?','Named content accessed through service operations.'],['Ready means?','The required content has been verified and publication metadata accepted.'],['Checksum versus authorization?','Integrity evidence versus permission to access content.']]),mentalModel:'Separate the bytes from the facts describing them, then account for every state between creation and deletion.',
sources:[source('Amazon EBS: block storage overview','https://docs.aws.amazon.com/ebs/latest/userguide/what-is-ebs.html'),source('Amazon EFS: file storage overview','https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html'),source('Amazon S3: object storage concepts','https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html'),source('Amazon S3: object lifecycle','https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html'),source('Amazon S3: object integrity','https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html')]
});
