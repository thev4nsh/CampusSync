from app import models
from app.routers import learning as learning_router


def test_enrolled_student_can_summarize_and_ask_about_course_notes(
    client, db, seed_data, student_token, monkeypatch
):
    material = models.CourseMaterial(
        id="material-current-class",
        title="Binary Search Trees",
        content="A binary search tree stores keys so that smaller values are in the left subtree and larger values are in the right subtree.",
        class_id=seed_data["class"].id,
        subject_id=seed_data["subject"].id,
        teacher_id=seed_data["teacher"].id,
        version=1,
    )
    db.add(material)
    db.commit()
    monkeypatch.setattr(learning_router, "summarize_material", lambda content: "BST summary")
    monkeypatch.setattr(
        learning_router,
        "answer_from_material",
        lambda content, question: (
            "Smaller values go into the left subtree.",
            [{"passage_id": "P1", "quote": "smaller values are in the left subtree"}],
            False,
        ),
    )
    headers = {"Authorization": f"Bearer {student_token}"}

    status_response = client.get("/api/ai/status", headers=headers)
    assert status_response.status_code == 200, status_response.text
    assert isinstance(status_response.json()["configured"], bool)
    assert status_response.json()["daily_request_limit"] > 0

    summary = client.post(f"/api/ai/materials/{material.id}/summary", headers=headers)
    assert summary.status_code == 200, summary.text
    assert summary.json()["summary"] == "BST summary"

    answer = client.post(
        f"/api/ai/materials/{material.id}/questions",
        json={"question": "Where do smaller values go?"},
        headers=headers,
    )
    assert answer.status_code == 200, answer.text
    assert answer.json()["abstained"] is False
    assert answer.json()["citations"][0]["passage_id"] == "P1"
    final_status = client.get("/api/ai/status", headers=headers)
    assert final_status.json()["requests_used_today"] == 2


def test_student_cannot_use_ai_on_another_class_material(
    client, db, seed_data, student_token, monkeypatch
):
    other_class = models.Class(
        name="CSE-3B",
        year="3rd Year",
        section="B",
        department="Computer Science",
    )
    other_subject = models.Subject(
        code="CS302",
        name="Algorithms",
        department="Computer Science",
    )
    db.add_all([other_class, other_subject])
    db.flush()
    material = models.CourseMaterial(
        id="material-other-class",
        title="Other class notes",
        content="These notes belong to another class and must not reach an AI request.",
        class_id=other_class.id,
        subject_id=other_subject.id,
        teacher_id=seed_data["teacher"].id,
        version=1,
    )
    db.add(material)
    db.commit()
    monkeypatch.setattr(learning_router, "summarize_material", lambda _content: "must not run")

    response = client.post(
        f"/api/ai/materials/{material.id}/summary",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code == 404


def test_youtube_caption_upload_feeds_student_ai_summary(
    client, seed_data, teacher_token, student_token, monkeypatch
):
    captions = b"""WEBVTT

00:00:01.000 --> 00:00:05.000
A binary search tree places smaller keys in the left subtree.

00:00:05.000 --> 00:00:09.000
Larger keys are placed in the right subtree.
"""
    created = client.post(
        "/api/materials/upload",
        data={
            "title": "Binary search tree lecture",
            "class_id": "1",
            "subject_id": "1",
            "content": "",
            "source_url": "https://youtu.be/UF8uR6Z6KLc",
        },
        files=[("files", ("lecture.vtt", captions, "text/vtt"))],
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert created.status_code == 201, created.text
    assert created.json()["source_url"] == "https://www.youtube.com/watch?v=UF8uR6Z6KLc"
    material_id = created.json()["id"]

    detail = client.get(
        f"/api/materials/{material_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert detail.status_code == 200, detail.text
    assert "smaller keys in the left subtree" in detail.json()["content"]

    captured = {}
    def summarize(transcript):
        captured["transcript"] = transcript
        return "The video explains how BST keys are divided between left and right subtrees."
    monkeypatch.setattr(learning_router, "summarize_material", summarize)
    summary = client.post(
        f"/api/ai/materials/{material_id}/summary",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert summary.status_code == 200, summary.text
    assert "larger keys are placed in the right subtree" in captured["transcript"].casefold()
    assert summary.json()["summary"].startswith("The video explains")
