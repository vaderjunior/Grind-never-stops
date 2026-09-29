import {save,sec,diag,choice,num,open,cards} from './lesson-authoring.mjs';
import {refs} from './author-module03.mjs';

save('023',{
objectives:['Describe resources, operations, and representations as an API contract.','Separate shape validation, business rules, and authorization.','Choose useful error categories without leaking internal details.','Bound request and response sizes before they become resource problems.'],retrieval:['From L014, distinguish safe and idempotent method semantics.','From L002, express an invariant for a reservation without naming a database.'],
sections:[sec('contract','An API is a promise to another program',`
Core: retrieval 5, explanation 18, worked contract 8, exercise 10, questions 10, review 4 minutes. Design an equipment-loan API for the register introduced in L001. A resource is a thing the contract identifies, such as an item, loan, or borrower. A representation is the fields sent about it. Keeping the distinction clear lets you evolve storage without exposing table internals as the public interface.

Start with operations: list available items, request a loan, inspect its status, and return an item. Possible contracts are GET /items, POST /loans, GET /loans/{id}, and POST /loans/{id}/return. Resource-oriented naming improves consistency but is not a ban on explicit actions. A return is a meaningful state transition; pretending it is an arbitrary row update can obscure the permitted behavior.

For each operation record method, path, authenticated actor, request shape, response shape, status outcomes, limits, and side effects. Say whether a success response means accepted intent or completed durable change. A 202 response with a status resource can describe deferred work; it must not imply that the loan already exists if the authority has not accepted it.
`),sec('validation','Three checks answer different questions',`
Shape validation checks whether the input is parseable and in the supported schema: item_id is an integer, duration_days is within 1–14, no oversized content, and required fields exist. Business validation asks whether this item is loanable and whether the requested duration obeys policy. Authorization asks whether this actor may borrow this item or act for that user. Passing one does not imply passing the others.

Do not trust owner_id supplied by a browser merely because it is a valid integer. Derive the ordinary borrower from authenticated identity, or require a separately authorized administrative operation to act for someone else. Likewise, a valid item_id does not prove that the item belongs to the actor's tenant. Authorization must remain attached to the state being returned or changed.

Limits belong in the contract: maximum page size, maximum body bytes, supported content types, field lengths, and bounded batches. Apply byte limits before fully parsing a huge request. A schema validator that runs only after allocating a gigabyte has protected field types but not process memory. Allowlist writable fields rather than copying every submitted property into a persistent object.
`),sec('worked','A concrete create and error response',`
Assume the caller is already authenticated. A create request contains only the requested item and duration:

~~~json
{"item_id": 42, "duration_days": 7}
~~~

An accepted durable loan could return 201 with a Location header naming /loans/81 and a representation containing loan_id, item_id, borrower_id, and state. If the item was claimed concurrently, return an explicit conflict outcome rather than a generic “try again” success. The exact atomic mechanism is M04 work; the API already needs to communicate its result.

RFC 9457 offers a machine-readable problem-details format. An original example is:

~~~json
{
  "type": "https://academy.example/problems/item-unavailable",
  "title": "Item cannot be borrowed",
  "status": 409,
  "detail": "Choose another item or check availability later.",
  "instance": "/request-errors/rq-721"
}
~~~

The example domain is illustrative, not a live endpoint. Clients should use the stable problem type and status contract, not parse English prose to control behavior. The instance identifier can link a support report to internal diagnostics. Keep SQL text, stack traces, credentials, and another borrower's personal data out of the client response. Internal logs also require deliberate redaction.

Return errors at the appropriate boundary: malformed input is not a server outage; lack of permission is not a successful empty update; an unexpected internal failure is not a validation error. Some APIs deliberately use 404 to avoid revealing whether a private object exists. Document the policy consistently rather than relying on status selection alone for security.
`),sec('evolution','Clients rely on the behaviors you expose',`
An API can break clients without renaming a field. Changing integer units from seconds to milliseconds, making a nullable value always absent, reordering results without a contract, or adding an unrecognized enum state can be breaking changes. Specify units and absent/null semantics. Clients should handle unknown fields where the contract permits evolution; servers still need input validation for writable data.

Failure scenario: a browser retries loan creation after a timeout and creates two loans for two different items in a buggy implementation. A well-shaped API alone does not establish retry safety. L027 develops uncertainty and retry boundaries; L093 later implements persistent idempotency. For now record whether an operation is safe to retry and what identifier permits outcome inspection.

Common misconceptions: a JSON schema proves authorization; REST means every action is a CRUD update; HTTP 200 means the business succeeded; changing only an optional field is always compatible; validation can wait until after expensive work. Test contracts using both valid and deliberately invalid requests, including unauthorized but correctly shaped ones.

Optional depth: write an OpenAPI description for these operations and compare it with observed behavior. Documentation generated from a schema is useful, but still needs tests of semantics and side effects.
`)],diagrams:[diag('checks','A valid shape is only the first boundary',`flowchart LR
R[Untrusted request] --> L[Size and format limits]
L --> V[Shape validation]
V --> I[Established identity]
I --> P[Object-level permission]
P --> B[Business transition at authority]
B --> O[Documented outcome]
V -->|Invalid fields| E[Bounded safe error]
P -->|Not permitted| E
B -->|Conflict| E`, 'The ordering is a teaching contract, not a claim that authentication must always occur after parsing. Real systems may authenticate earlier; all boundaries remain necessary.', ['Bound the input before expensive processing.','Validate the supported representation.','Check the actor against the specific object.','Return the authoritative outcome with a stable error contract.'])],exercise:{prompt:'Specify POST /reservations for a study room. Include inputs, actor derivation, one accepted response, three error outcomes, a size bound, and one unauthorized request that passes shape validation. Keep the exercise to a contract, not a full server.',minutes:10,rubric:['Separates actor identity from submitted fields.','Defines accepted versus pending semantics.','Distinguishes malformed, forbidden, and conflicting outcomes.','Includes explicit bounds and an object-level authorization test.'],solution:'Inputs room_id, start, end with defined timestamp format and start < end; derive requester from the authenticated session. Bound body to an agreed small limit such as 8 KiB and reject unsupported writable properties. Return 201 and reservation ID only after authoritative acceptance. Use documented invalid-input, forbidden-or-concealed, and time-conflict errors. A user submitting a syntactically valid room_id for another restricted department passes shape validation but must fail its permission check. If processing is deferred, return a separate pending operation contract rather than 201 confirmed.'},questions:[choice('q1','Which check answers “may this actor read this particular object”?',['JSON parsing','Authorization','Compression'],'Authorization','Shape and encoding do not establish rights over an object.'),choice('q2','Why bound body bytes before full parsing?',['To avoid allocating unbounded resources before validation','To make every business operation idempotent','To replace authentication'],'To avoid allocating unbounded resources before validation','A correct field validator can still be reached only after excessive allocation.'),open('q3','Why should clients not parse English error messages for control flow?','Wording and localization can change; stable machine-readable types or codes define the behavior contract.','Human detail supplements rather than replaces machine semantics.'),open('q4','Give a change that breaks a contract without deleting a field.','Changing time units, enum possibilities unsupported by clients, null semantics, ordering guarantees, or what success acknowledges can break behavior.','Explain the client assumption affected by the example.'),open('q5','Should owner_id always be writable when it appears in responses?','No. Output fields and allowed input fields are different; owner identity usually derives from authenticated context or an explicitly authorized transfer operation.','Copying an entire input object creates an authorization and integrity risk.')],flashcards:cards([['Resource versus representation?','Identified thing versus the fields exchanged about it.'],['Shape validation establishes?','Supported syntax, types, bounds, and fields, not permission.'],['Business validation establishes?','Whether the requested transition obeys domain rules.'],['Stable error identity?','Machine-readable type or code independent of prose.'],['Why separate input and output schemas?','A field visible to a reader may not be writable by that reader.'],['A success response must specify?','Which authoritative outcome or accepted intent it acknowledges.']]),mentalModel:'An API contract joins identity, bounded input, permitted state transition, and an unambiguous observable outcome.',sources:[refs.http,refs.problem]});

save('024',{
objectives:['Demonstrate duplicate or skipped records with offset pagination.','Define a deterministic order with a tie-breaker.','Build a cursor predicate matching that order.','State what cursor pagination does not guarantee during updates.'],retrieval:['From L023: why do ordering and units belong to an API contract?','From L002: distinguish a useful approximate view from an invariant.'],
sections:[sec('offset','A page number refers to a position that can move',`
Core: retrieval 5, mechanism 18, worked SQL 8, exercise 10, questions 10, review 4 minutes. Consider an activity list ordered newest first: E, D, C, B, A. Page size is two. Offset page one returns E,D. Before page two, a new F is inserted at the front. OFFSET 2 now skips F,E and returns D,C: D appears again. If a preceding row were deleted instead, an unseen row could be skipped.

Offset pagination is simple, supports approximate random page navigation, and can be fine for small stable datasets. Its semantics under mutation are the problem here, not the existence of an offset keyword. Large offsets may also require the database to examine or skip many preceding rows; actual performance depends on the query plan and indexes discussed in M04.

A stable ordering needs a total order. created_at alone can tie: two records share the same timestamp. Add a unique immutable tie-breaker such as id and specify both directions. Without that, even an unchanged dataset may produce inconsistent page boundaries depending on execution plans.
`),sec('cursor','Continue after a position in the order',`
With descending (created_at, id), a cursor holds the last row's pair. The next page asks for rows whose pair is smaller, ordered by the same pair descending. For a timestamp tie, the ID decides position. A row newly inserted before the cursor no longer shifts the continuation point. The cursor describes where to continue, not how many earlier rows exist.

In SQL, for non-null fields and a fixed tenant/filter scope:

~~~sql
SELECT id, created_at, title
FROM entries
WHERE tenant_id = :tenant_id
  AND (created_at < :last_time
       OR (created_at = :last_time AND id < :last_id))
ORDER BY created_at DESC, id DESC
LIMIT :page_size_plus_one;
~~~

Request one extra row to learn whether another page exists, then return at most page_size rows and a cursor based on the last returned row. Do not base the cursor on the extra unreturned row or it will be skipped. A useful future index begins with the scoped filter and ordering fields, but index design must follow actual access patterns.

Encode cursor fields as an opaque token so clients do not depend on representation details. Opaque does not mean secret or authorized. A base64 token can be decoded or modified. Bind the cursor to the query filters and ordering version, validate it, and repeat authorization on every page. Signing or storing cursor state may prevent tampering but never substitutes for access checks.
`),sec('trace','What changes are still visible?',`
Start with immutable IDs [5,4,3,2,1], ordered descending, and page size two. Page one returns [5,4] and cursor 4. Insert 6. The next page predicate id < 4 returns [3,2]; the new 6 will appear when the user refreshes from the beginning. That is a valid “continue older items” contract, not a snapshot of all current records.

Now imagine ordering by a mutable score. Item 2 receives votes and moves ahead of the cursor after page one. The continuation may miss it because its new position is outside the remaining range. A cursor removes shifting-offset problems but does not freeze mutable ranking. If the product requires an exact snapshot, it needs a snapshot/version boundary or materialized result set with a lifecycle, and the costs of retaining that view.

An executable Python model of the immutable-ID case:

~~~python
def page(ids: list[int], after: int | None, size: int) -> list[int]:
    ordered = sorted(ids, reverse=True)
    eligible = [item for item in ordered if after is None or item < after]
    return eligible[:size]

first = page([5, 4, 3, 2, 1], None, 2)
second = page([6, 5, 4, 3, 2, 1], first[-1], 2)
assert first == [5, 4] and second == [3, 2]
print(first, second)
~~~

This deterministic standard-library example tests continuation semantics only; it does not benchmark a database or implement secure tokens.
`),sec('evolution','Treat the continuation token as versioned state',`
If a client changes filters between pages, an old cursor can point into a different result set. Reject incompatible tokens rather than silently mixing results. Include or associate a cursor version, relevant scope, and optional expiration. Expiration is an API behavior: tell clients when to restart, especially if snapshots have been discarded.

Avoid requiring a costly exact total count merely to paginate. Whether “about 10,000 results,” a has-more flag, or a precise count is appropriate depends on the user task. An exact count under ongoing writes also needs a clear consistency boundary. The interface should not promise a fixed total while the query produces a moving view.

Failure scenarios include tied timestamps without a tie-breaker, reversed comparison operators, filters applied after pagination, tokens reused across tenants, deleted cursor-anchor rows, and mutable order keys. A value-based cursor need not look up the anchor row, so its deletion can be tolerated if the stored ordering values remain valid.

Common misconception: cursor pagination guarantees no omissions under every possible mutation. It guarantees only what the order and snapshot contract establish. Optional depth: extend the harness with tied timestamps and a composite predicate, then state its null-handling policy.
`)],diagrams:[diag('pagination','Insertions shift offsets but not an immutable cursor',`flowchart TD
P[Initial order 5 4 3 2 1] -->|Page 1 returns 5 and 4| C[Cursor stores last ID 4]
P -->|Insert newest ID 6| N[New order 6 5 4 3 2 1]
N -->|Offset 2| O[Returns 4 and 3: duplicate 4]
C -->|Predicate ID less than 4| K[Returns 3 and 2]
N --> K`, 'The demonstration assumes unique immutable IDs ordered descending. Mutable ranking requires a different guarantee or a snapshot.', ['Read the first two rows.','Insert a new row before the old page.','Observe how a positional offset shifts.','Continue from the saved ordered value instead.'])],exercise:{prompt:'Rows ordered by (created_at DESC, id DESC) are (10,9), (10,7), (9,8), (8,4). Page size is two. Write the cursor after page one and the exact predicate for page two. Then explain what happens if a new row (11,10) arrives and what changes if created_at may be edited.',minutes:10,rubric:['Keeps both ordering fields in cursor.','Uses strict comparison with a tie clause.','Does not skip the first unreturned row.','States limits under mutable ordering.'],solution:'Page one returns (10,9),(10,7), so cursor=(10,7). Predicate: created_at < 10 OR (created_at = 10 AND id < 7), with the same descending order. It returns (9,8),(8,4). New (11,10) is before the continuation and appears on a new traversal. If timestamps are edited, rows may move across the boundary and be skipped or repeated; a snapshot contract or immutable ordering key is needed for stronger behavior.'},questions:[choice('q1','Why add unique id after created_at?',['To create a deterministic tie-breaker','To encrypt the cursor','To guarantee every row is immutable'],'To create a deterministic tie-breaker','Timestamps can tie; a total order needs a unique final discriminator.'),choice('q2','Should the next cursor refer to the extra unreturned row?',['Yes','No, use the last returned row','Only if the page is full'],'No, use the last returned row','Using the extra row as the boundary can skip it.'),open('q3','Does base64 make a cursor authorized or secret?','No. It is an encoding. Validate scope and repeat authorization; use integrity protection if the token design requires it.','Cursor possession alone does not establish rights.'),open('q4','When might offset pagination be reasonable?','A small or stable dataset needing simple page navigation, where its mutation and performance limits are acceptable and documented.','A valid answer compares requirements instead of treating one mechanism as universally wrong.'),open('q5','Why does a cursor not freeze a leaderboard?','Scores can change and move items across its boundary; the continuation describes an order position without preserving the prior result set.','Exact traversal needs a defined snapshot or versioned view.')],flashcards:cards([['Offset mutation problem?','Insertions or deletions before the next offset shift positions, causing duplicates or skips.'],['Total order needs?','All ordering fields plus a unique deterministic tie-breaker.'],['Cursor points to?','The last returned position in the specified order.'],['Why request size plus one?','To detect whether more results exist without returning the extra row.'],['Opaque cursor is not?','A substitute for authorization, validation, or integrity protection.'],['Cursor versus snapshot?','Continuation position versus a preserved result population.']]),mentalModel:'A cursor follows an ordered value; its guarantee is only as stable as the ordering and result-set contract.',sources:[refs.page]});
