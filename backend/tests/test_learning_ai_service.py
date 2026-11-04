from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException
from openai import AuthenticationError

from app.config import settings
from app.services import learning_ai_service as ai_service


class _FakeResponses:
    def __init__(self, *, output_text="Study summary", parsed=None):
        self.output_text = output_text
        self.parsed = parsed
        self.create_args = None
        self.parse_args = None

    def create(self, **kwargs):
        self.create_args = kwargs
        return SimpleNamespace(output_text=self.output_text)

    def parse(self, **kwargs):
        self.parse_args = kwargs
        return SimpleNamespace(output_parsed=self.parsed)


def test_summary_uses_bounded_nonstored_responses(monkeypatch):
    fake = _FakeResponses()
    monkeypatch.setattr(ai_service, "_client", lambda: SimpleNamespace(responses=fake))

    assert ai_service.summarize_material("Course notes text") == "Study summary"
    assert fake.create_args["store"] is False
    assert fake.create_args["max_output_tokens"] == settings.OPENAI_SUMMARY_MAX_OUTPUT_TOKENS


def test_grounded_answer_rejects_invalid_citations(monkeypatch):
    content = "A binary search tree places smaller values in the left subtree."
    fake = _FakeResponses(parsed=ai_service.GroundedAnswerOutput(
        answer="Smaller values go left.",
        citations=[
            ai_service.GroundedCitationOutput(
                passage_id="P1",
                quote="smaller values in the left subtree",
            ),
            ai_service.GroundedCitationOutput(passage_id="P99", quote="fabricated source"),
        ],
        abstained=False,
    ))
    monkeypatch.setattr(ai_service, "_client", lambda: SimpleNamespace(responses=fake))

    answer, citations, abstained = ai_service.answer_from_material(content, "Where do smaller values go?")
    assert "couldn't find" in answer.lower()
    assert citations == []
    assert abstained is True
    assert fake.parse_args["store"] is False
    assert fake.parse_args["max_output_tokens"] == settings.OPENAI_ANSWER_MAX_OUTPUT_TOKENS


def test_expired_provider_key_returns_admin_actionable_error(monkeypatch):
    class UnauthorizedResponses:
        def create(self, **_kwargs):
            request = httpx.Request("POST", "https://api.openai.com/v1/responses")
            response = httpx.Response(401, request=request)
            raise AuthenticationError("expired key", response=response, body={})

    monkeypatch.setattr(
        ai_service,
        "_client",
        lambda: SimpleNamespace(responses=UnauthorizedResponses()),
    )
    with pytest.raises(HTTPException) as error:
        ai_service.summarize_material("A short course note.")
    assert error.value.status_code == 503
    assert "invalid or expired" in error.value.detail
