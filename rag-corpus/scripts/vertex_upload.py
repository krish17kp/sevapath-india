#!/usr/bin/env python3
"""Create or reuse the SevaPath Vertex AI RAG corpus and upload the briefs.

Uploads only rag-corpus/ingest/*.md. Raw government documents under
rag-corpus/raw_sources_auto/ are never uploaded and are not reachable from here.

Usage:
    python rag-corpus/scripts/vertex_upload.py --dry-run   # list what would upload
    python rag-corpus/scripts/vertex_upload.py             # create/reuse, upload, smoke test

Required environment:
    GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION
    plus application default credentials (gcloud auth application-default login)
"""

from __future__ import annotations

import argparse
import fcntl
import sys
from contextlib import contextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "python"))

from sevapath_rag.config import ConfigurationError, load_config, uploadable_files  # noqa: E402

SMOKE_TEST_QUERY = (
    "Which form does a spouse named in the Pension Payment Order submit to the "
    "Pension Disbursing Authority to start family pension?"
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List the files that would be uploaded and exit without contacting Google Cloud.",
    )
    parser.add_argument(
        "--skip-smoke-test",
        action="store_true",
        help="Upload without running the retrieval smoke test afterwards.",
    )
    args = parser.parse_args()

    try:
        files = uploadable_files()
    except ConfigurationError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print(f"Eligible briefs ({len(files)}):")
    for path in files:
        print(f"  - rag-corpus/ingest/{path.name}")

    if args.dry_run:
        print("\nDry run: nothing was uploaded and Google Cloud was not contacted.")
        return 0

    try:
        config = load_config()
    except ConfigurationError as error:
        print(f"\nERROR: {error}", file=sys.stderr)
        print(
            "\nThe local retrieval adapter needs none of this. To use it instead:\n"
            "  SEVAPATH_RETRIEVAL_ADAPTER=local npm run dev",
            file=sys.stderr,
        )
        return 2

    # Imported here so --dry-run works without the heavy SDK installed.
    from sevapath_rag.agent import execute_retrieval_tool
    from sevapath_rag.corpus import ensure_corpus, upload_briefs

    print(f"\nProject: {config.project}   Location: {config.location}")
    with mutation_lock():
        corpus_name = ensure_corpus(config)
        print(f"Corpus:  {corpus_name}")

        sync = upload_briefs(config, corpus_name)
    print(
        f"\nCorpus sync: {len(sync.uploaded)} uploaded, {len(sync.skipped)} unchanged, "
        f"{len(sync.deleted)} stale removed, {len(sync.indexed)} indexed."
    )

    if args.skip_smoke_test:
        return 0

    print(f"\nRetrieval smoke test:\n  Q: {SMOKE_TEST_QUERY}")
    contexts = execute_retrieval_tool(config, corpus_name, SMOKE_TEST_QUERY)
    if not contexts:
        print("  FAIL: retrieval returned no contexts.", file=sys.stderr)
        return 3
    for context in contexts[:3]:
        preview = context[:160].replace("\n", " ")
        print(f"  {preview}...")

    print(
        "\nDone. Point the web application at this corpus with:\n"
        f"  SEVAPATH_RAG_CORPUS_RESOURCE={corpus_name}\n"
        "  SEVAPATH_RETRIEVAL_ADAPTER=vertex"
    )
    return 0


@contextmanager
def mutation_lock():
    """Prevent concurrent mutation runs against a corpus from this checkout."""
    lock_path = Path(__file__).resolve().parents[1] / ".vertex-mutation.lock"
    with lock_path.open("w", encoding="utf-8") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise RuntimeError("Another Vertex corpus mutation is already running") from error
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


if __name__ == "__main__":
    raise SystemExit(main())
