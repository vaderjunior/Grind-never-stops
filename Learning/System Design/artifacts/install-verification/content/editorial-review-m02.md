# M02 independent editorial review

Reviewer: curriculum worker, 29 September 2026. Reviewed L011–014 and L016–019 teaching sections, diagram sources, exercises, solutions, and questions; reviewed interview_003 and interview_004 candidate brief, clarifications, reference reasoning, changes, and remediation. This is a substantive text review, not a claim of browser visual inspection or a repeat of the author's source-verification pass.

Findings checked:

- L011 separates naming, destination, authority, and port; cold/warm timing totals are consistent (155 ms and 55 ms). Migration reasoning correctly distinguishes previously cached TTLs from persistent connections.
- L012 separates TCP byte ordering, flow control, congestion control, and application effect acknowledgment. Bandwidth-delay arithmetic is correct: 100 Mbit/s × 0.040 s = 4 Mbit = 500,000 bytes.
- L013 preserves the distinction between encrypted hops, trusted identity context, and object authorization; re-encryption does not hide plaintext from the terminating proxy. The exercise exposes header forgery independently of internal-channel protection.
- L014 distinguishes safe, idempotent, and cacheable semantics. Conditional updates explicitly require an atomic check and write, and zero-row disclosure policy remains scoped. POST idempotency is not attributed to HTTP itself.
- L016 identifies the layer at which head-of-line blocking occurs and qualifies HTTP/3 stream independence with shared congestion and metadata constraints. Ten 100 ms slots imply an idealized 100 operations/s, without a production claim.
- L017 correctly distinguishes connection assignment from request load, local state from durable recovery, and sampled health from complete availability. One source diagram correction requested: new connection N should enter L4 before assignment to instance C, rather than pointing directly to C.
- L018 explains generated contract limits, field-number compatibility, deadline uncertainty, and browser integration caveats without universal performance claims.
- L019 separates live transport from durable replay, includes snapshot/stream gap reasoning, and correctly calculates 4,000 requests/s, 25.6 Mbit/s, and 312.5 MiB illustrative connection buffers. Ordering scope is explicit.
- Both assessments stay within taught networking and contract concepts; detailed storage/replication design is not required. Reference alternatives allow justified transport choices. Candidate prompts do not disclose full solutions.

One cross-module consistency issue reported: these interview definitions originally use minutes=60 while M01/M03 definitions use 45 answering minutes plus 15 feedback. The catalog's 60-minute session must remain unchanged; the interview engine should use an explicit answering-versus-feedback convention. This is product timing metadata, not a lesson-content failure.

No repeated generic teaching paragraphs or placeholder answer keys were found. The deliberate timing scaffolding repeats by design. All review findings were sent to the root worker for integration and evidence tracking; this document alone does not promote publishing status to validated.
