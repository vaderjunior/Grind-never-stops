import fs from 'node:fs';
import crypto from 'node:crypto';

// Editorial corrections follow a manual reading of the complete 18-guide set.
// Re-running is safe, but published guide JSON remains the reviewed artifact.
const ids = ['design-file-storage','file-sync-and-conflicts','design-video-platform','design-search-and-autocomplete','design-bookings','design-payments','coordination-and-leases','change-data-safely','ai-system-design','rag-and-inference','full-mock-interview','capstone-and-readiness-plan','dns-and-addresses','gateways-and-proxies','containers-and-deployment','job-lifecycle-and-backpressure','kubernetes-networking','kubernetes-operations'];
const prior = fs.existsSync('artifacts/guide-review-interface.json') ? JSON.parse(fs.readFileSync('artifacts/guide-review-interface.json', 'utf8')) : undefined;
const texts = new Map(ids.map(id => [id, JSON.parse(fs.readFileSync(`content/guides/${id}.json`, 'utf8'))]));
const findings = new Map(ids.map(id => [id, [...(prior?.guides?.find(g=>g.id===id)?.findings ?? [])]]));
const replacements = [];
function replace(id, before, after, finding, area = 'sections') {
  const g = texts.get(id);
  let serialized = JSON.stringify(g[area]);
  if (!serialized.includes(JSON.stringify(before).slice(1,-1))) {
    if (serialized.includes(JSON.stringify(after).slice(1,-1))) return;
    throw new Error(`Review target missing in ${id}: ${before.slice(0,80)}`);
  }
  serialized = serialized.replaceAll(JSON.stringify(before).slice(1,-1), JSON.stringify(after).slice(1,-1));
  g[area] = JSON.parse(serialized);
  findings.get(id).push(finding);
  replacements.push([before, after]);
}

replace('file-sync-and-conflicts',
  'The device fetches authorized new bytes and records deletion locally.',
  'The device fetches authorized new bytes and records deletion locally. Before applying a remote update or deletion, it checks for an unsaved local edit. Preserve that edit and its base version as a pending or conflict copy; catching up must not overwrite the very offline work synchronization is meant to protect.',
  'Made the download/catch-up path preserve unsynced local work before applying remote updates or deletions; conflict safety now covers both uploads and downloads.');
replace('design-video-platform',
  'The worker writes these outputs under a processing-version namespace so an old attempt cannot mix its files with a newer configuration.',
  'Each execution attempt writes to its own output namespace beneath the source/configuration version. Even duplicate workers for the same job cannot overwrite one another’s segments. Once published, those output objects are immutable: a late attempt must not change bytes behind an already validated playlist.',
  'Closed a same-job concurrent-worker race: attempt-specific immutable output objects prevent a late worker from altering segments behind a published playlist.');
replace('design-video-platform',
  'Retry the same source/configuration job, complete or regenerate its output set, and conditionally publish one coherent playlist.',
  'Retry the same source/configuration job using isolated attempt output, complete or regenerate that output set, and conditionally publish one coherent playlist pointing to immutable objects.',
  'Aligned the worked retry solution with immutable, attempt-isolated publication.', 'exercise');
replace('change-data-safely',
  'a small CRUD application',
  'a small application that mainly creates, reads, updates, and deletes records (often shortened to CRUD)',
  'Expanded CRUD at its first use so the authority comparison does not depend on unexplained vocabulary.');
replace('dns-and-addresses',
  'An IP address helps network equipment forward packets toward the destination.',
  'A packet is a small unit of data sent across a network. Routers are devices that forward those units toward their destination. An IP address supplies the network address information they use.',
  'Defined packets and routers before relying on the network-routing mental model in week 1.');
replace('dns-and-addresses',
  'top-level-domain servers',
  'top-level-domain (TLD) servers',
  'Expanded the TLD abbreviation used in the lookup diagram.');
replace('dns-and-addresses',
  'A traditional HTTP-over-TCP explanation includes TCP followed by TLS. Modern HTTP/3 uses QUIC over UDP with integrated TLS security.',
  'A traditional explanation first establishes TCP, which provides an ordered byte stream, then TLS, which establishes encryption and checks the server identity. Modern HTTP/3 uses QUIC, a transport built over UDP datagrams, with integrated TLS security. The next week explains these protocols; here they are two ways to build the protected connection.',
  'Added short plain-language protocol roles and a next-week pointer instead of requiring TCP/TLS/QUIC knowledge before the protocol lesson.');
replace('gateways-and-proxies',
  'Retrying a read is different from blindly replaying a non-idempotent create operation.',
  'An idempotent operation has the same intended effect when repeated; setting a note’s title to the same value is a simple example. Creating a new note on every call is not idempotent unless the application adds duplicate protection. Retrying a read is different from blindly replaying such a create operation.',
  'Defined idempotent behavior with an ordinary notes example before the dedicated retries week.');
replace('kubernetes-networking',
  'The networking data plane uses this information according to its implementation.',
  'The data plane is the running networking machinery that carries application traffic; the control plane manages its configuration and desired state. The networking data plane uses endpoint information according to its implementation.',
  'Defined data plane versus control plane in ordinary language before comparing networking implementations.');
replace('kubernetes-networking',
  'notes-api in namespace learning can be addressed',
  'notes-api in a namespace named learning (an organizing scope for Kubernetes objects) can be addressed',
  'Explained namespace at its first use, before later security limitations.');
replace('kubernetes-networking',
  'others use different data-plane mechanisms such as eBPF-based implementations.',
  'others use mechanisms such as eBPF, which supports networking programs running inside the operating-system kernel.',
  'Gave the unfamiliar eBPF example a bounded description rather than leaving it as a product-like acronym.');
replace('kubernetes-networking',
  'Creating policy objects in an unsupported environment does not prove traffic is blocked.',
  'Creating policy objects in an unsupported environment does not prove traffic is blocked. Within the standard NetworkPolicy model, Pods start unrestricted in each direction unless a policy selects them for that direction. Selected policies add allowed traffic; their allowed sets combine rather than a later rule overriding an earlier one. A Pod-to-Pod connection must satisfy both the source’s egress rules (outgoing) and the destination’s ingress rules (incoming), where those directions are isolated. Other cluster controls can impose additional restrictions.',
  'Added default isolation, additive allow rules, and ingress/egress composition to prevent an incorrect firewall-rule-order mental model. Verified against current official Kubernetes NetworkPolicy documentation.');
replace('kubernetes-operations',
  'When configured, it can protect startup from premature liveness/readiness checks until it succeeds.',
  'When configured, it delays liveness/readiness checks until it succeeds. This waiting budget is finite: repeated startup failures reaching the configured threshold cause that container to be killed and handled according to its restart policy.',
  'Specified the finite startup budget and startup-failure action, which the original success-only description omitted. Verified against official Kubernetes probe documentation.');
replace('kubernetes-operations',
  'S[Startup check] -->|Startup succeeds| R[Begin normal readiness and liveness checks]',
  'S[Startup check] -->|Startup succeeds| R[Begin normal readiness and liveness checks]\nS -->|Failure threshold reached| K[Kill container and apply restart policy]',
  'Added the startup-failure branch to the probe diagram so its visual matches the explained lifecycle.', 'diagrams');

const spacing = [
  ['about8','about 8'],['the4-second','the 4-second'],['takes8','takes 8'],['are100,000','are 100,000'],
  ['exactly12:05','exactly 12:05'],['sends5,000','sends 5,000'],['seat5,000','seat 5,000'],
  ['token8','token 8'],['token7','token 7'],['apply150','apply 150'],['takes45','takes 45'],
  ['limit500','limit 500'],['limit900','limit 900'],['minute25','minute 25'],['Identify8443','Identify 8443'],
  ['port8443','port 8443'],['HTTP404','HTTP 404'],['layer4','layer 4'],['layer7','layer 7'],
  ['status202','status 202'],['finish1','finish 1'],['invented87%','invented 87%'],['Compute180','Compute 180'],
  ['so60','so 60'],['adds180','adds 180'],['model,8','model, 8'],['exceed5','exceed 5'],
  ['port80','port 80'],['on8080','on 8080'],['week1','week 1'],['on9090','on 9090'],
  ['says8080','says 8080'],['targetPort8080','targetPort 8080'],['CPU,500m','CPU, 500m'],
  ['memory,256','memory, 256'],['means256','means 256'],['average80%','average 80%'],['suggests3','suggests 3'],
  ['a60%','a 60%'],['Compute3','Compute 3'],['gives4','gives 4'],
];
function walk(v) {
  if (typeof v === 'string') return spacing.reduce((s,[a,b])=>s.replaceAll(a,b),v);
  if (Array.isArray(v)) return v.map(walk);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k,val])=>[k,['id','url','source'].includes(k) ? val : walk(val)]));
  return v;
}
for (const [id,g] of texts) {
  const spaced=walk(g);
  if (JSON.stringify(spaced)!==JSON.stringify(g)) findings.get(id).push('Repaired missing spaces around numbers, port values, protocol labels, and worked calculations without changing their values or answer keys.');
  texts.set(id,spaced);
  fs.writeFileSync(`content/guides/${id}.json`,JSON.stringify(spaced,null,2)+'\n');
}
const sourceUpdated=[];
for (const filename of fs.readdirSync('scripts').filter(n=>/^author-guide/.test(n)&&n.endsWith('.mjs'))) {
  const path=`scripts/${filename}`;
  let source=fs.readFileSync(path,'utf8');
  // Only this author's source generators contain one of these exact guide IDs.
  if (!ids.some(id=>source.includes(`id:'${id}'`))) continue;
  const original=source;
  for (const [a,b] of [...replacements,...spacing]) {
    source=source.replaceAll(a,b.replaceAll('`','\\`'));
    if(a.includes('\n')) source=source.replaceAll(a.replaceAll('\n','\\n'),b.replaceAll('\n','\\n'));
  }
  if (source!==original) {fs.writeFileSync(path,source); sourceUpdated.push(path);}
}
const sourceChecks=[
  {url:'https://kubernetes.io/docs/concepts/services-networking/network-policies/',checked:'2026-09-29',claims:['Default direction-specific Pod isolation','Additive allowed-traffic sets','Both egress and ingress must permit a Pod-to-Pod connection']},
  {url:'https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/',checked:'2026-09-29',claims:['Startup probe failure threshold kills the container subject to its restart policy','Startup success gates normal liveness and readiness checks']},
];
const report={
  schemaVersion:1,
  reviewedAt:new Date().toISOString(),
  reviewer:'engine agent, independent cross-review of interface-authored guides',
  method:'Manually read all 18 guides: objectives, terms, retrieval prompts, every prose section, diagram source/caption/steps, exercise/rubric/solution, all question options/answers/explanations, flashcards, and source metadata. Checked worked arithmetic, authority boundaries, failure traces, and prerequisite vocabulary. Made focused editorial corrections and checked new Kubernetes claims against official primary documentation.',
  scope:ids,
  limitations:['Editorial review is not a claim of production implementation or performance benchmarking.','Did not re-open every previously cited source or watch linked videos; the two newly extended Kubernetes claims were checked directly.','Diagram semantics were reviewed here; rendering of all diagrams is owned by the parent final QA pass.','Existing authoring sources were synchronized for matching literal corrections, but the published JSON SHA256 values below identify the exact reviewed artifacts.'],
  sourceChecks,
  sourceGeneratorsUpdated:[...new Set([...(prior?.sourceGeneratorsUpdated??[]),...sourceUpdated])],
  guides:ids.map(id=>({id,path:`content/guides/${id}.json`,sha256:crypto.createHash('sha256').update(fs.readFileSync(`content/guides/${id}.json`)).digest('hex'),status:'reviewed',findings:findings.get(id),outcome:findings.get(id).length?'Corrected during review; no unresolved blocking finding.':'No substantive correction identified during this review.'})),
};
fs.writeFileSync('artifacts/guide-review-interface.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({reviewed:ids.length,changed:report.guides.filter(g=>g.findings.length).length,findings:report.guides.reduce((n,g)=>n+g.findings.length,0),sourceUpdated},null,2));
