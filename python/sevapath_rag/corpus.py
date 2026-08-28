"""Create or reuse the SevaPath corpus, upload the briefs, and retrieve.

Written against the API surface of google-cloud-aiplatform 1.165.1, in which
`vertexai.rag` is deprecated in favour of the `agentplatform` client:

    client = agentplatform.Client(project=..., location=...)
    client.rag.create_corpus(rag_corpus=RagCorpus(display_name=...))
    client.rag.upload_file(corpus_name=..., path=..., display_name=...)
    client.rag.retrieve_contexts(vertex_rag_store=..., query=RagQuery(text=...))

Signatures were read from the installed package rather than from memory. If you
upgrade the SDK, re-check them before trusting this module.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import VertexConfig, uploadable_files


@dataclass(frozen=True)
class RetrievedContext:
    text: str
    source_display_name: str
    source_uri: str
    score: float | None


def _client(config: VertexConfig) -> Any:
    """Builds the Agent Platform client.

    Imported lazily so that importing this module — which the test suite does
    without credentials — never requires the heavy SDK or a live project.
    """
    import agentplatform

    return agentplatform.Client(project=config.project, location=config.location)


def ensure_corpus(config: VertexConfig, client: Any | None = None) -> str:
    """Returns the resource name of the SevaPath corpus, creating it if needed.

    Reuse is by display name, so running this twice does not litter the project
    with duplicate corpora.
    """
    from agentplatform._genai.types.common import RagCorpus

    client = client or _client(config)

    if config.has_corpus_resource:
        existing = client.rag.get_corpus(name=config.corpus_resource)
        return existing.name

    listed = client.rag.list_corpora()
    for candidate in listed.rag_corpora or []:
        if candidate.display_name == config.corpus_display_name:
            return candidate.name

    created = client.rag.create_corpus(
        rag_corpus=RagCorpus(
            display_name=config.corpus_display_name,
            description=(
                "SevaPath family-pension briefs. Original summaries with links to "
                "official sources. Contains no copied government documents."
            ),
        )
    )
    return created.name


def upload_briefs(config: VertexConfig, corpus_name: str, client: Any | None = None) -> list[str]:
    """Uploads every validated ingest brief. Returns the uploaded file names.

    Only rag-corpus/ingest/*.md is eligible. `uploadable_files` enforces that,
    and this function does not accept a caller-supplied path.
    """
    client = client or _client(config)
    uploaded: list[str] = []
    for path in uploadable_files():
        rag_file = client.rag.upload_file(
            corpus_name=corpus_name,
            path=str(path),
            display_name=path.name,
        )
        uploaded.append(rag_file.name)
    return uploaded


def retrieve(
    config: VertexConfig,
    corpus_name: str,
    query: str,
    client: Any | None = None,
) -> list[RetrievedContext]:
    """Runs a retrieval query against the corpus and returns the contexts."""
    from agentplatform._genai.types.common import RagQuery
    from google.genai.types import VertexRagStore, VertexRagStoreRagResource

    client = client or _client(config)

    response = client.rag.retrieve_contexts(
        vertex_rag_store=VertexRagStore(
            rag_resources=[VertexRagStoreRagResource(rag_corpus=corpus_name)],
        ),
        query=RagQuery(
            text=query,
            similarity_top_k=config.similarity_top_k,
        ),
    )

    contexts = getattr(response.contexts, "contexts", None) or []
    return [
        RetrievedContext(
            text=context.text or "",
            source_display_name=context.source_display_name or "",
            source_uri=context.source_uri or "",
            score=context.score,
        )
        for context in contexts
    ]


def brief_paths() -> list[Path]:
    """Exposed for the CLI so it can report exactly what will be uploaded."""
    return uploadable_files()
