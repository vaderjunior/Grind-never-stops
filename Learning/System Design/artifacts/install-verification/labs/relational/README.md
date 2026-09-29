# Relational correctness fixture

Run from the repository root using Python 3.11+ (standard library only):

```powershell
python -m unittest discover -s labs/relational -v
```

Seven tests exercise composite foreign keys, scoped uniqueness, a unique active-loan partial index, rollback across related writes, a conditional stock update, an optimistic version condition, and a composite cursor plus SQLite index-plan observation. They use a disposable in-memory database with foreign keys explicitly enabled. No learner database is touched.

This is **SQLite evidence** for these portable patterns. It does not test PostgreSQL row locks, MVCC snapshots, serializable retries, index-only visibility, or PostgreSQL EXPLAIN operators. PostgreSQL 18 lesson SQL is a documented pattern unless a separate executed test says otherwise. Do not report SQLite results as proof of another engine's guarantees.

The stock test executes sequential conditional updates to establish the predicate behavior; it is not a concurrent PostgreSQL overselling test. The runtime harness separately tests local process locking. A real database concurrency experiment must use coordinated independent sessions and record their read/write/commit history.
