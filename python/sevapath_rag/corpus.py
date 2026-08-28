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
from hashlib import sha256
from pathlib import Path
from typing import Any

from .config import VertexConfig, uploadable_files


@dataclass(frozen=True)
class RetrievedContext:
    text: str
    source_display_name: str
    source_uri: str
    score: float | None


@dataclass(frozen=True)
class CorpusSyncResult:
    uploaded: tuple[str, ...]
    skipped: tuple[str, ...]
    deleted: tuple[str, ...]
    indexed: tuple[str, ...]


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


def upload_briefs(
    config: VertexConfig, corpus_name: str, client: Any | None = None
) -> CorpusSyncResult:
    """Synchronize briefs by content hash, sequentially and idempotently.

    Only rag-corpus/ingest/*.md is eligible. `uploadable_files` enforces that,
    and this function does not accept a caller-supplied path. The hash in each
    managed display name lets repeated runs skip unchanged content. Changed
    content is uploaded before its old version is deleted.
    """
    from agentplatform._genai.types.common import (
        RagFileChunkingConfig,
        UploadRagFileConfig,
    )

    client = client or _client(config)
    desired = {path: _display_name(path) for path in uploadable_files()}
    listed = client.rag.list_files(name=corpus_name)
    existing = list(listed.rag_files or [])
    by_display = {item.display_name: item for item in existing if item.display_name}
    uploaded: list[str] = []
    skipped: list[str] = []
    deleted: list[str] = []

    for path, display_name in desired.items():
        if display_name in by_display:
            skipped.append(display_name)
            continue
        rag_file = client.rag.upload_file(
            corpus_name=corpus_name,
            path=str(path),
            display_name=display_name,
            upload_rag_file_config=UploadRagFileConfig(
                rag_file_chunking_config=RagFileChunkingConfig(
                    chunk_size=config.chunk_size,
                    chunk_overlap=config.chunk_overlap,
                )
            ),
        )
        uploaded.append(rag_file.name)

    desired_names = set(desired.values())
    managed_bases = {path.name for path in desired}
    for item in existing:
        display_name = item.display_name or ""
        base = display_name.split("--sha256-", 1)[0]
        if "--sha256-" not in display_name:
            continue
        if display_name not in desired_names and (base in managed_bases or base.endswith(".md")):
            client.rag.delete_file(name=item.name)
            deleted.append(item.name)

    indexed = verify_indexed_files(config, corpus_name, client)
    return CorpusSyncResult(
        uploaded=tuple(uploaded),
        skipped=tuple(skipped),
        deleted=tuple(deleted),
        indexed=tuple(indexed),
    )


def verify_indexed_files(
    config: VertexConfig, corpus_name: str, client: Any | None = None
) -> list[str]:
    """List and verify the exact hash-versioned brief set in the corpus."""
    client = client or _client(config)
    listed = client.rag.list_files(name=corpus_name)
    files = list(listed.rag_files or [])
    expected = {_display_name(path) for path in uploadable_files()}
    actual = {item.display_name for item in files if item.display_name in expected}
    missing = expected - actual
    if missing:
        raise RuntimeError(f"Vertex corpus is missing {len(missing)} expected indexed briefs")
    for item in files:
        if item.display_name not in expected or not item.file_status:
            continue
        state = str(item.file_status.state or "").upper()
        if "FAILED" in state:
            raise RuntimeError(f"Vertex indexing failed for {item.display_name}")
    return sorted(actual)


def _display_name(path: Path) -> str:
    digest = sha256(path.read_bytes()).hexdigest()[:16]
    return f"{path.name}--sha256-{digest}"


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
