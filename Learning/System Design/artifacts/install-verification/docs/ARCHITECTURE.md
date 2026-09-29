# Architecture and boundaries

The browser calls one HTTP process on 127.0.0.1:4310. That process owns the course engine and SQLite learner database. The stdio adapter uses the official MCP TypeScript SDK and calls the same action API with a local bearer token. It does not own a second database or contain a model.

`content/manifest.json` contains source catalog metadata and explicitly labeled prerequisite interpretations. Editable authored lessons live in `content/lessons/`; private interviewer definitions live in `content/interviews/`. The server sends only permitted projections. The frontend never imports the full content tree into its bundle. JSON/Markdown is data, never executable MDX or learner-supplied code.

SQLite uses WAL, transactional mutations, busy timeout, and versioned migrations. Notes/drafts use optimistic revisions. Retryable interview/quiz/review writes use idempotency keys with a request fingerprint. An identical retry returns the earlier outcome; conflicting reuse is rejected. Timestamps and content versions are retained. Application upgrades must preserve data/.

The HTTP server checks Host and Origin, requires JSON plus an unpredictable CSRF token for browser actions, and validates typed request limits. The MCP bearer token stays in ignored data/.mcp-token. Only content IDs and application backup IDs are accepted; there is no general file reader or command runner. Runtime assets and diagrams are local; the app has no telemetry or live model dependency.

Assessment reveal guards are educational spoiler protections. A learner with filesystem access can read course sources. During an active assessment, the AI must use course tools and must not open reference files. The model supplies questions and qualitative feedback; the backend stores actual turns, checks supporting excerpts and rubric bounds, and computes weighted totals. Self-assessment is labeled separately.

Native Node 24 avoids a compiler toolchain for a third-party SQLite native addon. The built-in SQLite API is still marked experimental in the installed Node runtime; test upgrades and preserve backups. No cloud services, Kubernetes, Redis, or external database is required by the reader.
