from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from google.genai.errors import ClientError

from app.config import settings
from app.services import learning_ai_service as ai_service


class _FakeModels:
    def __init__(self, *, text="Study summary", error=None):
        self.text = text
        self.error = error
        self.generate_args = None

    def generate_content(self, **kwargs):
        self.generate_args = kwargs
        if self.error:
            raise self.error
        return SimpleNamespace(text=self.text)


def _fake_client(models):
    return SimpleNamespace(models=models)


def test_summary_uses_bounded_nonstored_gemini_request(monkeypatch):
    fake = _FakeModels()
    monkeypatch.setattr(ai_service, "_client", lambda: _fake_client(fake))

    assert ai_service.summarize_material("Course notes text") == "Study summary"
    config = fake.generate_args["config"]
    assert config.store is False
    assert config.max_output_tokens == settings.GEMINI_SUMMARY_MAX_OUTPUT_TOKENS


def test_grounded_answer_rejects_invalid_citations(monkeypatch):
    content = "A binary search tree places smaller values in the left subtree."
    parsed = ai_service.GroundedAnswerOutput(
        answer="Smaller values go left.",
        citations=[
            ai_service.GroundedCitationOutput(
                passage_id="P1",
                quote="smaller values in the left subtree",
            ),
            ai_service.GroundedCitationOutput(passage_id="P99", quote="fabricated source"),
        ],
        abstained=False,
    )
    fake = _FakeModels(text=parsed.model_dump_json())
    monkeypatch.setattr(ai_service, "_client", lambda: _fake_client(fake))

    answer, citations, abstained = ai_service.answer_from_material(content, "Where do smaller values go?")
    assert "couldn't find" in answer.lower()
    assert citations == []
    assert abstained is True
    config = fake.generate_args["config"]
    assert config.store is False
    assert config.max_output_tokens == settings.GEMINI_ANSWER_MAX_OUTPUT_TOKENS
    assert config.response_mime_type == "application/json"


def test_expired_gemini_key_returns_admin_actionable_error(monkeypatch):
    unauthorized = ClientError(401, {"error": {"message": "expired key", "status": "UNAUTHENTICATED"}})
    fake = _FakeModels(error=unauthorized)

    monkeypatch.setattr(ai_service, "_client", lambda: _fake_client(fake))
    with pytest.raises(HTTPException) as error:
        ai_service.summarize_material("A short course note.")
    assert error.value.status_code == 503
    assert "invalid or lack API access" in error.value.detail
