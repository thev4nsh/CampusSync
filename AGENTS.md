# Repository guidance

- Keep backend changes in backend/ and frontend changes in frontend/; the backend is the authority for authentication, authorization, and persisted data.
- Follow existing FastAPI, SQLAlchemy, Alembic, Pydantic, and React/Vite patterns. Database schema changes require a new Alembic migration; do not rewrite an applied migration.
- Scope every course-material and AI operation through the authenticated user, their institution, and their course membership or teaching assignment. Never trust a client-supplied role, institution, teacher, or student identifier for authorization.
- Do not send secrets, biometric data, grades, disciplinary records, or unrelated student records to an AI provider. Keep provider credentials on the backend.
- Treat uploaded course material as untrusted input. Keep AI answers grounded in authorized sources, cite those sources, and allow the system to abstain when the source does not support an answer.
- Preserve existing data and migrations. Before implementation, inspect git status; do not overwrite user changes or reset the branch.
- Run focused checks for changed behavior when asked to verify. Do not claim a command or check passed unless it was actually run.
