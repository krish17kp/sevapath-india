"""The ADK agent that owns the Vertex AI RAG retrieval tool.

Why this agent has exactly one tool
-----------------------------------
`VertexAiRagRetrieval.process_llm_request` attaches the corpus to a Gemini
request as a *built-in* tool — `types.Tool(retrieval=types.Retrieval(...))` —
rather than as a function declaration. Gemini does not accept a built-in tool
alongside other function declarations on the same request, so an agent holding
`VertexAiRagRetrieval` must hold nothing else.

SevaPath does not need to mix them. Routing, required-field checks, and the name
mismatch check are deterministic TypeScript in the web application and never
were tool calls. This agent's whole job is to look things up in the corpus.
"""

from __future__ import annotations

import os
from typing import Any

from .config import VertexConfig

#: Kept in step with the refusal wording in src/lib/retrieval/types.ts.
INSUFFICIENT_EVIDENCE_ANSWER = "I could not verify this from the current official corpus."

RETRIEVAL_TOOL_NAME = "sevapath_family_pension_corpus"

RETRIEVAL_TOOL_DESCRIPTION = (
    "Look up the SevaPath family-pension corpus: the current Form 12 route to the "
    "Pension Disbursing Authority, the Form 10 route to the Head of Office, Format 9, "
    "Rule 79 of the Central Civil Services (Pension) Rules 2021, RBI directions on "
    "bank handling, and the archived status of Form 14. Returns passages with their "
    "official source links and rule or form references."
)

AGENT_INSTRUCTION = f"""
You answer questions about starting Central Civil family pension for a surviving
spouse, using only the SevaPath corpus reached through the
{RETRIEVAL_TOOL_NAME} tool.

Rules you follow without exception:

- Answer only from passages the tool returns. Never add facts from your own
  knowledge, however confident you are.
- Every factual statement you make must carry the official source URL and the
  exact rule, form, paragraph, or page from the passage it came from.
- If the returned passages do not support an answer, reply with exactly this
  sentence and nothing else: {INSUFFICIENT_EVIDENCE_ANSWER}
- Never state, calculate, or estimate a pension amount, rate, percentage, or
  arrears figure.
- Never decide whether anyone is eligible for family pension.
- Never decide that two differently written names belong to the same person,
  and never suggest changing a value on a record to make two records agree.
- Never claim that anything has been submitted to a government system.
- Where the FAQ and the 2021 Rules disagree, the 2021 Rules and the current
  forms list on the Pensioners' Portal govern. Form 14 is archived.
""".strip()


def build_retrieval_tool(config: VertexConfig, corpus_name: str) -> Any:
    """Builds the isolated Vertex AI RAG retrieval tool.

    `vertexai.rag` is deprecated in google-cloud-aiplatform 1.165.1 in favour of
    the `agentplatform` client, and corpus.py uses the new client throughout.
    This one call site still uses the deprecated module because ADK 2.8.0's
    VertexAiRagRetrieval accepts `vertexai.rag.RagResource` specifically and
    passes it back to `rag.retrieval_query`. Switch it when ADK accepts the
    agentplatform types.
    """
    from google.adk.tools.retrieval import VertexAiRagRetrieval
    from vertexai import rag

    return VertexAiRagRetrieval(
        name=RETRIEVAL_TOOL_NAME,
        description=RETRIEVAL_TOOL_DESCRIPTION,
        rag_resources=[rag.RagResource(rag_corpus=corpus_name)],
        similarity_top_k=config.similarity_top_k,
        vector_distance_threshold=config.vector_distance_threshold,
    )


def build_agent(config: VertexConfig, corpus_name: str) -> Any:
    """Builds the retrieval agent.

    The tool list has exactly one entry, for the reason given at the top of this
    module. Adding a second tool here will make Gemini reject the request.
    """
    from google.adk.agents import Agent

    return Agent(
        name="sevapath_corpus_agent",
        model=os.environ.get("SEVAPATH_ADK_MODEL", "gemini-2.5-flash"),
        description=(
            "Answers family-pension preparation questions from the SevaPath corpus, "
            "with an official citation on every statement."
        ),
        instruction=AGENT_INSTRUCTION,
        tools=[build_retrieval_tool(config, corpus_name)],
    )
