# AI course-material API contract (first backend slice)

Base URL locally: http://localhost:8000. The frontend should call the /api-prefixed routes below and send the existing JWT as Authorization: Bearer <access_token>. These endpoints are implemented in FastAPI; they are not yet wired into React.

## Create a material (teacher)

POST /api/materials

Request body:

    {
      "class_id": 12,
      "subject_id": 4,
      "title": "Week 3: Data Structures",
      "content_type": "text/markdown",
      "content": "# Trees\nA tree is a hierarchical data structure..."
    }

Allowed content types: text/plain and text/markdown. Content is limited to 100,000 characters. The teacher must have an exact class/subject assignment.

201 response:

    {
      "id": "material-uuid",
      "title": "Week 3: Data Structures",
      "class_id": 12,
      "subject_id": 4,
      "teacher_id": "TCH101",
      "content_type": "text/markdown",
      "version": 1,
      "created_at": "2026-10-25T12:00:00Z",
      "updated_at": "2026-10-25T12:00:00Z"
    }

## List and read materials

- GET /api/materials returns materials the current user can access.
- GET /api/materials/{material_id} returns that material including its source content.
- PUT /api/materials/{material_id} updates title, content_type, and content. Only the creating teacher may edit it. An edit increments version and invalidates the cached summary.

Students see materials for their current class. Teachers see materials for class/subject assignments. Admins can see all materials in this single-college deployment. An inaccessible or unknown material returns 404.

## Generate a summary

POST /api/ai/materials/{material_id}/summary

The body is empty. Response:

    {
      "material_id": "material-uuid",
      "material_version": 1,
      "summary": "..."
    }

The summary is cached for the current material version. Editing the material clears the cache.

## Ask a question

POST /api/ai/materials/{material_id}/questions

Request body:

    {
      "question": "How does a binary search tree differ from a regular binary tree?"
    }

Response:

    {
      "material_id": "material-uuid",
      "material_version": 1,
      "answer": "...",
      "citations": [
        {
          "passage_id": "P2",
          "quote": "An exact supporting excerpt from the notes."
        }
      ],
      "abstained": false
    }

Citations refer to passage IDs generated for this response. When no relevant passage is found, the API returns an abstention without calling the model.

## Setup and expected errors

1. Install backend dependencies from backend/requirements.txt.
2. Put OPENAI_API_KEY in backend/.env; keep it private and out of VITE_* frontend settings.
3. Optionally set OPENAI_MODEL; current default is gpt-6-astra.
4. Apply the database migration with Alembic before calling these endpoints.

Missing or invalid login: 401. Role/assignment restriction on create: 403. Unknown or inaccessible material: 404. Invalid payload: 422. Missing AI key: 503. OpenAI API failure: 502.

This is scoped to one college. The current database does not yet carry institution membership or tenant-scoped classes/subjects; add that before using one shared database for multiple colleges.
