"""The ADK retrieval agent must keep VertexAiRagRetrieval isolated.

VertexAiRagRetrieval attaches the corpus to a Gemini request as a built-in tool,
which Gemini will not accept alongside other function declarations. If someone
adds a second tool to this agent, this test fails before the request does.
"""

from __future__ import annotations

import pytest

from sevapath_rag import agent
from sevapath_rag.config import VertexConfig

CORPUS = "projects/demo/locations/us-central1/ragCorpora/1234567890"

pytest.importorskip("google.adk.tools.retrieval")


@pytest.fixture
def config() -> VertexConfig:
    return VertexConfig(
        project="demo-project",
        location="us-central1",
        corpus_display_name="sevapath-family-pension-briefs",
        corpus_resource=None,
        similarity_top_k=5,
        vector_distance_threshold=0.5,
    )


def test_retrieval_tool_targets_the_given_corpus(config: VertexConfig) -> None:
    tool = agent.build_retrieval_tool(config, CORPUS)

    assert tool.name == agent.RETRIEVAL_TOOL_NAME
    assert tool.vertex_rag_store.similarity_top_k == 5
    assert tool.vertex_rag_store.rag_resources is not None
    assert tool.vertex_rag_store.rag_resources[0].rag_corpus == CORPUS


def test_agent_holds_exactly_one_tool(config: VertexConfig) -> None:
    built = agent.build_agent(config, CORPUS)

    assert len(built.tools) == 1, (
        "VertexAiRagRetrieval must be the only tool on this agent; "
        "Gemini rejects a built-in retrieval tool mixed with function tools."
    )
    assert built.tools[0].name == agent.RETRIEVAL_TOOL_NAME


def test_instruction_states_the_hard_boundaries() -> None:
    instruction = agent.AGENT_INSTRUCTION

    assert agent.INSUFFICIENT_EVIDENCE_ANSWER in instruction
    assert "Never state, calculate, or estimate a pension amount" in instruction
    assert "Never decide whether anyone is eligible" in instruction
    assert "Form 14 is archived" in instruction


def test_insufficient_evidence_wording_is_exact() -> None:
    assert (
        agent.INSUFFICIENT_EVIDENCE_ANSWER
        == "I could not verify this from the current official corpus."
    )
