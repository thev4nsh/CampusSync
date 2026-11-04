from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from google.genai import errors

from app.config import settings
from app.services import learning_ai_service as ai_service


def test_gemini_client_is_reused_between_requests(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-gemini-key")
    ai_service._client.cache_clear()
    try:
        first = ai_service._client()
        assert ai_service._client() is first
    finally:
        ai_service._client.cache_clear()
        first.close()


def test_gemini_503_retries_with_configured_fallback(monkeypatch):
    models_seen = []

    class BusyPrimaryModel:
        def generate_content(self, **kwargs):
            models_seen.append(kwargs["model"])
            if kwargs["model"] == "primary-model":
                raise errors.APIError(503, {"error": {"message": "busy"}})
            return SimpleNamespace(text="fallback response")

    monkeypatch.setattr(settings, "GEMINI_FALLBACK_MODEL", "fallback-model")
    monkeypatch.setattr(ai_service, "_client", lambda: SimpleNamespace(models=BusyPrimaryModel()))

    response = ai_service._generate_content(
        "answer the question", model="primary-model", contents="note context"
    )

    assert response.text == "fallback response"
    assert models_seen == ["primary-model", "fallback-model"]


class _FakeModels:
    def __init__(self, *, output_text="Study summary"):
        self.output_text = output_text
        self.args = None

    def generate_content(self, **kwargs):
        self.args = kwargs
        return SimpleNamespace(text=self.output_text)


def test_summary_uses_bounded_nonstored_responses(monkeypatch):
    fake = _FakeModels()
    monkeypatch.setattr(ai_service, "_client", lambda: SimpleNamespace(models=fake))

    assert ai_service.summarize_material("Course notes text") == "Study summary"
    assert fake.args["model"] == settings.GEMINI_MODEL
    assert fake.args["config"].max_output_tokens == settings.AI_SUMMARY_MAX_OUTPUT_TOKENS


def test_grounded_answer_rejects_invalid_citations(monkeypatch):
    content = "A binary search tree places smaller values in the left subtree."
    fake = _FakeModels(output_text=ai_service.GroundedAnswerOutput(
        answer="Smaller values go left.",
        citations=[
            ai_service.GroundedCitationOutput(
                passage_id="P1",
                quote="smaller values in the left subtree",
            ),
            ai_service.GroundedCitationOutput(passage_id="P99", quote="fabricated source"),
        ],
        abstained=False,
    ).model_dump_json())
    monkeypatch.setattr(ai_service, "_client", lambda: SimpleNamespace(models=fake))

    answer, citations, abstained = ai_service.answer_from_material(content, "Where do smaller values go?")
    assert "couldn't find" in answer.lower()
    assert citations == []
    assert abstained is True
    assert fake.args["config"].max_output_tokens == settings.AI_ANSWER_MAX_OUTPUT_TOKENS
    assert fake.args["config"].response_mime_type == "application/json"


def test_generic_question_sends_notes_as_context(monkeypatch):
    notes = (
        "Local search explores one current state at a time.\n\n"
        "A search frontier contains states discovered but not yet expanded."
    )
    output = ai_service.GroundedAnswerOutput(
        answer="The notes describe local search and how its frontier is used.",
        citations=[ai_service.GroundedCitationOutput(
            passage_id="P1",
            quote="A search frontier contains states discovered but not yet expanded.",
        )],
        abstained=False,
    )
    fake = _FakeModels(output_text=output.model_dump_json())
    monkeypatch.setattr(ai_service, "_client", lambda: SimpleNamespace(models=fake))

    answer, citations, abstained = ai_service.answer_from_material(
        notes,
        "Can you explain these notes?",
        "The notes cover local search and the search frontier.",
    )

    assert not abstained
    assert "local search" in answer.lower()
    assert citations[0]["quote"] in fake.args["contents"]
    assert "The notes cover local search" in fake.args["contents"]


def test_invalid_gemini_key_returns_admin_actionable_error(monkeypatch):
    class UnauthorizedModels:
        def generate_content(self, **_kwargs):
            raise errors.APIError(401, {"error": {"message": "invalid key"}})

    monkeypatch.setattr(
        ai_service,
        "_client",
        lambda: SimpleNamespace(models=UnauthorizedModels()),
    )
    with pytest.raises(HTTPException) as error:
        ai_service.summarize_material("A short course note.")
    assert error.value.status_code == 503
    assert "invalid" in error.value.detail
