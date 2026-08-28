"""Environment configuration for the Vertex retrieval sidecar.

Every value comes from an environment variable. Nothing is defaulted to a real
project, and no credential is ever read into a log line.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
INGEST_DIR = REPO_ROOT / "rag-corpus" / "ingest"

#: Only files matching this glob inside INGEST_DIR may be uploaded.
UPLOADABLE_GLOB = "*.md"

#: Default display name for the corpus, so repeated runs reuse one corpus
#: instead of creating a new one each time.
DEFAULT_CORPUS_DISPLAY_NAME = "sevapath-family-pension-briefs"


class ConfigurationError(RuntimeError):
    """Raised when required configuration is absent, with the fix in the text."""


@dataclass(frozen=True)
class VertexConfig:
    project: str
    location: str
    corpus_display_name: str
    #: Full resource name of an existing corpus, when one is already known.
    corpus_resource: str | None
    similarity_top_k: int
    vector_distance_threshold: float
    chunk_size: int = 512
    chunk_overlap: int = 100

    @property
    def has_corpus_resource(self) -> bool:
        return bool(self.corpus_resource)


def load_config() -> VertexConfig:
    """Reads configuration from the environment.

    Raises ConfigurationError naming the exact missing variable, so the operator
    is never left guessing which export is absent.
    """
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    if not project:
        raise ConfigurationError(
            "GOOGLE_CLOUD_PROJECT is not set. "
            "Set it to your Google Cloud project id before using the Vertex adapter."
        )

    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "").strip()
    if not location:
        raise ConfigurationError(
            "GOOGLE_CLOUD_LOCATION is not set. "
            "Set it to a Vertex AI RAG Engine region, for example us-central1."
        )

    top_k = int(os.environ.get("SEVAPATH_RAG_TOP_K", "5"))
    threshold = float(os.environ.get("SEVAPATH_RAG_DISTANCE_THRESHOLD", "0.5"))
    chunk_size = int(os.environ.get("SEVAPATH_RAG_CHUNK_SIZE", "512"))
    chunk_overlap = int(os.environ.get("SEVAPATH_RAG_CHUNK_OVERLAP", "100"))
    if not 1 <= top_k <= 20:
        raise ConfigurationError("SEVAPATH_RAG_TOP_K must be between 1 and 20.")
    if not 0 <= threshold <= 1:
        raise ConfigurationError("SEVAPATH_RAG_DISTANCE_THRESHOLD must be between 0 and 1.")
    if not 128 <= chunk_size <= 2048 or not 0 <= chunk_overlap < chunk_size:
        raise ConfigurationError(
            "RAG chunk size must be 128-2048 and overlap must be smaller than the chunk size."
        )
    corpus_resource = os.environ.get("SEVAPATH_RAG_CORPUS_RESOURCE", "").strip() or None
    if corpus_resource:
        expected = rf"^projects/{re.escape(project)}/locations/{re.escape(location)}/ragCorpora/[^/]+$"
        if not re.match(expected, corpus_resource):
            raise ConfigurationError(
                "SEVAPATH_RAG_CORPUS_RESOURCE must be a complete corpus name for the configured project and location."
            )

    return VertexConfig(
        project=project,
        location=location,
        corpus_display_name=os.environ.get(
            "SEVAPATH_RAG_CORPUS_NAME", DEFAULT_CORPUS_DISPLAY_NAME
        ).strip()
        or DEFAULT_CORPUS_DISPLAY_NAME,
        corpus_resource=corpus_resource,
        similarity_top_k=top_k,
        vector_distance_threshold=threshold,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )


def uploadable_files() -> list[Path]:
    """The only files SevaPath will ever upload to Vertex.

    Raw government documents live in rag-corpus/raw_sources_auto/ and are
    deliberately unreachable from here: this function reads one directory and
    resolves every result back into it, so a symlink or a crafted name cannot
    widen the set.
    """
    if not INGEST_DIR.is_dir():
        raise ConfigurationError(f"Ingest directory is missing: {INGEST_DIR}")

    files: list[Path] = []
    for path in sorted(INGEST_DIR.glob(UPLOADABLE_GLOB)):
        resolved = path.resolve()
        if resolved.parent != INGEST_DIR.resolve():
            raise ConfigurationError(
                f"Refusing to upload a file from outside the ingest directory: {path}"
            )
        if not resolved.is_file():
            continue
        files.append(resolved)

    if not files:
        raise ConfigurationError(f"No briefs found in {INGEST_DIR}")
    return files
