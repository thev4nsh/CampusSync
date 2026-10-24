# CampusSync repository audit and AI-first slice

## Repository snapshot

- Git checkout: main, clean at audit time, HEAD a637110 (merge commit), two commits ahead of origin/main. This existing committed state is the safe checkpoint; no new commit or branch was created.
- Frontend: React 18 and Vite 6 in frontend/; role portals call a shared REST client.
- Backend: FastAPI, SQLAlchemy, Pydantic, Alembic, and PostgreSQL in backend/; existing in-memory SQLite tests cover authentication, role checks, classes, faculty subjects, and attendance.
- Existing domain foundation: users, students, teachers, classes, subjects, teacher-to-subject/class assignments, attendance, and admin-managed settings. Login derives role from a server-issued JWT.
- Existing AI capability: none found. The README lists an AI campus assistant as future work.
- Multi-college foundation: absent. Current user, class, and subject identifiers and uniqueness constraints are global; no institution entity or institution foreign keys exist.
- Guidance: no existing AGENTS.md or docs folder was found. Root/backend README files describe the project, but some claims should be verified against code before being treated as implemented (for example, the docs call several security features production-ready while settings include a default JWT secret and permissive origin regex).

## Audit implications

1. Build on the existing backend identity and course-assignment model; do not put an AI provider key or provider call in the browser.
2. Course-level authorization needs tightening before material or AI endpoints are added. For example, GET /api/teachers/classes/{class_id}/students currently falls back to the first class for an unknown class ID and does not verify the teacher's assignment to the selected class. The AI slice must not reuse that pattern.
3. Design institution ownership into the new material and AI data from its first migration. A single-college deployment can have one seeded institution, while tenant IDs remain mandatory in records and queries.
4. Resolve institution context from the authenticated account/server-side membership, never from an untrusted request field. A later multi-college rollout will also need scoped uniqueness constraints and institution-aware admin roles across the existing schema.

## Recommended first vertical slice: course notes summary and grounded Q&A

**User outcome:** a teacher makes one text-based lecture note available in an assigned course; enrolled students can read an AI summary and ask questions answered from that note with source references.

### Slice boundaries

- Start with pasted text or .txt/.md course notes to keep ingestion inspectable. Add PDFs and YouTube transcripts only after the text path works.
- A teacher can create and update materials only for a course/class they are assigned to. Students can list, summarize, and ask questions only for courses in which their student profile is enrolled.
- Store institution, course/class, uploader, source text, and version on each material. Store generated summaries and questions/answers with the material version and provider/model metadata needed for traceability.
- Put provider access behind a backend service interface and backend-only configuration. Do not choose or add a vendor SDK until provider, budget, and privacy constraints are confirmed.
- For the first bounded corpus, retrieve relevant passages from the selected material, send only those authorized passages to the model, require citations to passage IDs, and return an explicit “not found in these notes” response when evidence is insufficient.
- Keep AI output advisory and separate from grades, attendance, disciplinary actions, and other official records. Do not feed those records into prompts.

### Likely implementation sequence

1. **Authorization foundation:** add a single institution record and institution ownership on the academic/material entities touched by the slice; add a request-scoped institution resolver. First fix and cover teacher course-assignment checks for material access; student access must derive from the server-side enrollment/class relation.
2. **Material persistence:** add SQLAlchemy models and a new Alembic migration for course materials and content versions. Add role-scoped create/list/read/update endpoints and schemas. Start with plain text/Markdown and a conservative size limit.
3. **AI service:** define a provider-neutral summarization and answer interface, configure secrets on the backend, chunk material into stable source passages, retrieve passages for a question, and enforce grounded answers with citations and abstention.
4. **Frontend path:** add a teacher course-material form and a student course-material view with summary, question input, cited answer, loading/error/empty states.
5. **Verification:** add backend checks for authorized teacher/student access, cross-course denial, institution scoping, source citations, and unsupported questions; then manually exercise the complete teacher-to-student flow.

## Architecture sketch

React teacher/student views → authenticated REST → FastAPI material and AI routes → identity/institution/course authorization → material and version persistence (SQLAlchemy + Alembic) → AI service interface → bounded passage retrieval → configured model provider (backend only).

Every query and generated artifact is scoped by institution and course before retrieval or model invocation. The model receives only selected course passages; the API returns citations that map back to the stored material version.

## Decisions needed before provider-backed implementation

- Which model provider should be used, and what data-processing or retention terms are acceptable for college materials?
- Should students access material only through their current class enrollment, or do courses need explicit enrollment records before this slice?
- What file formats and maximum note size should the first version accept? The proposed default is pasted text and .txt/.md only.

## Immediate next coding step

Start with the authorization foundation and its regression coverage, then add the material/version schema and migration. Do not begin by wiring an LLM call into a dashboard: without institution-aware ownership and course-level access checks, summaries and answers could expose one class's notes to another.

## Implemented first backend slice

The initial OpenAI-backed backend slice is now present in the repository:

- POST /api/materials creates text or Markdown course notes for an exact teacher class/subject assignment.
- GET /api/materials returns assigned materials for teachers, the authenticated student's current class for students, or all materials to an admin.
- GET /api/materials/{material_id} returns the note only after checking the caller's role and course relationship.
- PUT /api/materials/{material_id} lets the original teacher update a note; the version increments and cached summary is cleared.
- POST /api/ai/materials/{material_id}/summary generates and caches a summary for that note version.
- POST /api/ai/materials/{material_id}/questions retrieves matching passages from that note and returns a grounded answer with validated passage citations, or abstains.

All routes require the existing bearer-token authentication. The OpenAI key is read only by the backend from OPENAI_API_KEY; the configured model is OPENAI_MODEL (currently defaulted to gpt-6-astra). Apply the new 0002_course_materials Alembic migration before using the endpoints. No UI integration or face-recognition changes are included.

**Scope note:** this first release remains a single-college deployment. The new material records are tied to the existing global class/subject tables; institution membership and tenant-scoped academic tables still need a separate migration before a shared multi-college database is safe. Do not deploy the AI endpoints as a multi-tenant service until that work is done. Also review what note content may be sent to the OpenAI API before production use.
