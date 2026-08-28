"""The sidecar must never serve a passage without a resolvable citation."""

from __future__ import annotations

from typing import Any

import pytest

from sevapath_rag import service
from sevapath_rag.config import VertexConfig

CONFIG = VertexConfig(
    project="demo-project",
    location="us-central1",
    corpus_display_name="sevapath-family-pension-briefs",
    corpus_resource=None,
    similarity_top_k=5,
    vector_distance_threshold=0.5,
)

CITED_CHUNK = (
    "The Pension Disbursing Authority shall commence disbursement of family pension "
    "within one month of receipt of a claim in Form 12. "
    "[RULE79: Rule 79(2)(a)(ii), printed page 177, PDF page 56]"
)

UNCITED_CHUNK = (
    "Some plausible sounding sentence about family pension that carries no citation "
    "marker at all and therefore must never be served to a citizen."
)


@pytest.fixture(autouse=True)
def _stub_cloud(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service, "load_config", lambda: CONFIG)
    monkeypatch.setattr(service, "ensure_corpus", lambda config: "corpora/demo")


def _stub_retrieve(monkeypatch: pytest.MonkeyPatch, contexts: list[str]) -> None:
    def fake(config: Any, corpus_name: str, query: str) -> list[str]:
        return contexts

    monkeypatch.setattr(service, "execute_retrieval_tool", fake)


def test_cited_context_is_answered(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_retrieve(
        monkeypatch,
        [CITED_CHUNK],
    )

    result = service.search("Which form goes to the Pension Disbursing Authority?", 3)

    assert result["outcome"] == "answered"
    assert len(result["passages"]) == 1
    assert result["citations"][0]["sourceId"] == "CCS2021-NOTIFICATION"
    assert result["citations"][0]["reference"].startswith("Rule 79(2)(a)(ii)")
    assert "[RULE79:" not in result["answer"]


def test_uncited_context_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_retrieve(
        monkeypatch,
        [UNCITED_CHUNK],
    )

    result = service.search("Which form?", 3)

    assert result["outcome"] == "insufficient_evidence"
    assert result["answer"] == service.INSUFFICIENT_EVIDENCE_ANSWER
    assert result["passages"] == []


def test_no_contexts_gives_the_exact_refusal(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_retrieve(monkeypatch, [])

    result = service.search("What is the capital of France?", 3)

    assert result["answer"] == "I could not verify this from the current official corpus."


def test_health_reports_missing_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    def raise_config_error() -> VertexConfig:
        from sevapath_rag.config import ConfigurationError

        raise ConfigurationError("GOOGLE_CLOUD_PROJECT is not set.")

    monkeypatch.setattr(service, "load_config", raise_config_error)

    result = service.health()

    assert result["available"] is False
    assert "GOOGLE_CLOUD_PROJECT" in result["detail"]
