"""Vertex AI RAG Engine sidecar for SevaPath.

The web application talks to this package over HTTP only when
SEVAPATH_RETRIEVAL_ADAPTER=vertex. Nothing here is required for the local
deterministic retrieval path.
"""

__all__ = ["config", "corpus", "agent", "service"]
