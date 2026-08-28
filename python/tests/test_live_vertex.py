"""Conditional live proof for the exact ADK retrieval path.

Set SEVAPATH_RUN_LIVE_VERTEX_TESTS=1 only after secure ADC authentication and
the documented project/corpus variables are configured. Normal CI never makes
a billable cloud call.
"""

from __future__ import annotations

import os

import pytest

from sevapath_rag.agent import execute_retrieval_tool
from sevapath_rag.config import load_config, uploadable_files
from sevapath_rag.corpus import ensure_corpus, verify_indexed_files


pytestmark = pytest.mark.skipif(
    os.environ.get("SEVAPATH_RUN_LIVE_VERTEX_TESTS") != "1",
    reason="live Vertex tests require explicit opt-in and secure cloud configuration",
)


def test_live_corpus_is_indexed_and_exact_adk_tool_retrieves_cited_text() -> None:
    config = load_config()
    corpus_name = ensure_corpus(config)
    indexed = verify_indexed_files(config, corpus_name)
    passages = execute_retrieval_tool(
        config,
        corpus_name,
        "Which form does a spouse named in the PPO submit to the PDA?",
    )

    assert len(indexed) == len(uploadable_files())
    assert passages
    assert any("[RULE79:" in passage or "[FORM12:" in passage for passage in passages)
