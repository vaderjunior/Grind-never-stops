# Input audit

Checked 29 September 2026. The complete catalog is available; no titles, priorities, timings, project tags, or module prerequisites had to be invented.

Inputs inspected:

- User implementation commission: `C:/Users/ajayt/.codex/attachments/3d9d7479-d40a-47e1-bc48-5858a913cc61/Pasted text.txt`, all 19 sections.
- User curriculum: `C:/Users/ajayt/.codex/attachments/4852c968-294a-4b4f-b29b-df4c7b2bef88/Pasted text.txt`. Its lines match the workspace Markdown; newline encoding differs.
- `System_Design_Course_Blueprint.md`: complete catalog and surrounding pedagogy, project, assessment, timing, dependency, source, and pacing specifications read.
- `System_Design_Course_Blueprint.html`: read and parsed in full. The independent HTML table check compares all 300 lesson IDs, titles, and durations with the Markdown catalog. No JSON attachment was present, despite the blueprint mentioning downloadable JSON. The new manifest is a derived artifact, not a recovered attachment.

The source itself explicitly says it is a blueprint, not a completed textbook. Published catalog coverage must never be reported as authored course coverage.

## Reproducible metadata checks

Run `node scripts/import-curriculum.mjs --check`. It validates 30 modules, 300 consecutive stable lesson IDs, 63 tagged assessments, six projects, 24 mapped milestones, and 43 paired case studies. Total scheduled time is 16,955 minutes (282 h 35 min); through L190 it is 10,730 minutes (178 h 50 min). References, prerequisite cycles, route ordering, priority values, 45–60-minute bounds, and project mappings are checked. The source SHA-256 is saved in the manifest.

The 63 interview IDs are allocated by the source assessment order, from `interview_001` at L005 to `interview_063` at L300. A definition file is required before a session can be started; a mapped ID alone does not mean an assessment has been authored.

## Operational interpretations, distinct from source metadata

The source gives module-level entry skills rather than exact lesson-level cross-module edges. The manifest represents each prerequisite module by its final checkpoint, plus all earlier non-red lessons in the current module. These are explicit authored operational edges; original module prerequisites and prose remain available. Demonstrated prior knowledge can satisfy a checkpoint through the app's evidence workflow, not page visits.

Red extensions never silently gate subsequent core lessons. L227 and L247 explicitly require L079. L297 and L298 carry alternative branch prerequisites (L250 or L290); they are excluded from the general-interview route, and neither gates L299 or L300. L298 still requires its paired L297 attempt. This resolves the otherwise contradictory combination of ordered module lessons and the source's explicit permission to take M30 before either specialist branch.

The recommended route preserves M01–M19 → M26–M29 → M20–M25 → M30. Numerical order contains all 300 sessions. The operational general route is M01–M19 and M30, omitting red extensions and L297–298. It includes important non-red foundation lessons: general does not mean only green rows.

## Authorship and review

Lesson bodies, diagrams, questions, solutions, scenarios, and flashcards are original authored teaching, stored separately from the source-derived manifest. Source titles remain unchanged. Assessment briefs live in interview definitions; answer keys and debriefs must pass backend reveal controls. No unavailable lesson is counted as drafted. Schema checks alone establish structure, not educational review. Review and execution evidence belongs in the content-status and QA records.

M01 references were opened on 29 September 2026: Google SRE chapters Service Level Objectives, Monitoring Distributed Systems, Handling Overload, and Simplicity; Amazon's SDE II Interview Prep; C4's Diagrams page. They support limited definitions and further reading; the notebook method, numerical workloads, examples, diagrams, exercises, answers, and assessment scenarios are original. A candidate MIT Little's Law PDF URL redirected to a faculty biography; it was not cited as if the paper had been read.
