"""HTTP sidecar the web application calls when the Vertex adapter is selected.

Deliberately small: the web application owns the citizen journey, the refusal
boundaries, and every deterministic check. This process does one thing — turn a
question into corpus passages with resolved citations.

Run it with:

    python -m sevapath_rag.service

It binds to 127.0.0.1 by default. It is not an internet-facing service and has
no authentication, so do not bind it to a public interface.
"""

from __future__ import annotations

import json
import logging
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .agent import INSUFFICIENT_EVIDENCE_ANSWER, execute_retrieval_tool
from .citations import resolve_any
from .config import ConfigurationError, load_config
from .corpus import ensure_corpus

logger = logging.getLogger("sevapath.rag.service")

MAX_BODY_BYTES = 8192
MAX_QUERY_CHARS = 500

def search(query: str, limit: int) -> dict[str, Any]:
    """Answers one question from the Vertex corpus.

    Returns the same JSON shape the TypeScript adapter expects. Refusal
    boundaries are *not* applied here — the web application applies them before
    it ever calls this service — but the citation requirement is enforced here
    as well, so a passage without a resolvable citation is never served.
    """
    config = load_config()
    corpus_name = ensure_corpus(config)
    contexts = execute_retrieval_tool(config, corpus_name, query)

    passages: list[dict[str, Any]] = []
    for position, context in enumerate(contexts):
        text, citations, source_display_name = resolve_any(context)
        if not citations or len(text) < 40:
            continue
        passages.append(
            {
                "id": f"{source_display_name}#{position}",
                "briefId": source_display_name.removesuffix(".md"),
                "briefTitle": source_display_name,
                "heading": "",
                "text": text,
                "score": 1.0,
                "citations": [citation.to_dict() for citation in citations],
            }
        )
        if len(passages) >= limit:
            break

    if not passages:
        return {
            "outcome": "insufficient_evidence",
            "answer": INSUFFICIENT_EVIDENCE_ANSWER,
            "passages": [],
            "citations": [],
        }

    seen: set[tuple[str, str]] = set()
    flattened: list[dict[str, str]] = []
    for passage in passages:
        for citation in passage["citations"]:
            fingerprint = (citation["sourceId"], citation["reference"])
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            flattened.append(citation)

    return {
        "outcome": "answered",
        "answer": "\n\n".join(passage["text"] for passage in passages),
        "passages": passages,
        "citations": flattened,
        "retrievalEngine": "google-adk-vertex-ai-rag-retrieval",
    }


def health() -> dict[str, Any]:
    """Confirms configuration and that the corpus is reachable."""
    try:
        config = load_config()
    except ConfigurationError as error:
        return {"available": False, "detail": str(error)}

    try:
        corpus_name = ensure_corpus(config)
    except Exception as error:  # noqa: BLE001 - reported to the caller, not raised
        return {"available": False, "detail": f"{type(error).__name__}: {error}"}

    return {
        "available": True,
        "detail": f"Vertex RAG corpus reachable in {config.location}.",
        "corpus": corpus_name,
        "retrievalEngine": "google-adk-vertex-ai-rag-retrieval",
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "SevaPathRagSidecar/1.0"

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path.rstrip("/") == "/health":
            self._respond(200, health())
        else:
            self._respond(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path.rstrip("/") != "/search":
            self._respond(404, {"error": "not found"})
            return

        length = int(self.headers.get("content-length") or 0)
        if length <= 0 or length > MAX_BODY_BYTES:
            self._respond(400, {"error": "invalid content-length"})
            return

        try:
            payload = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            self._respond(400, {"error": "body is not valid JSON"})
            return

        query = str(payload.get("query", "")).strip()[:MAX_QUERY_CHARS]
        if not query:
            self._respond(400, {"error": "query is required"})
            return
        limit = max(1, min(int(payload.get("limit", 3)), 8))

        try:
            self._respond(200, search(query, limit))
        except ConfigurationError as error:
            self._respond(503, {"error": str(error)})
        except Exception as error:  # noqa: BLE001 - surfaced as 503, never as a stack trace
            logger.exception("Vertex retrieval failed")
            self._respond(503, {"error": f"{type(error).__name__}: {error}"})

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        # Log the method and path only. Never log the question body.
        logger.info("%s %s", self.command, self.path)

    def _respond(self, status: int, body: dict[str, Any]) -> None:
        encoded = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    host = os.environ.get("SEVAPATH_RAG_HOST", "127.0.0.1")
    port = int(os.environ.get("SEVAPATH_RAG_PORT", "8081"))
    server = ThreadingHTTPServer((host, port), Handler)
    logger.info("SevaPath Vertex retrieval sidecar listening on http://%s:%d", host, port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
