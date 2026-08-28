"""Idempotent Vertex corpus synchronization without a cloud dependency."""

from __future__ import annotations

from types import SimpleNamespace

from sevapath_rag import corpus
from sevapath_rag.config import VertexConfig


CONFIG = VertexConfig(
    project="demo-project",
    location="us-central1",
    corpus_display_name="sevapath-family-pension-briefs",
    corpus_resource=None,
    similarity_top_k=5,
    vector_distance_threshold=0.5,
    chunk_size=512,
    chunk_overlap=100,
)


class FakeRagApi:
    def __init__(self) -> None:
        self.files: list[SimpleNamespace] = []
        self.upload_configs: list[object] = []

    def list_files(self, *, name: str) -> SimpleNamespace:
        assert name == "projects/demo/locations/us-central1/ragCorpora/1"
        return SimpleNamespace(rag_files=list(self.files))

    def upload_file(self, **kwargs: object) -> SimpleNamespace:
        display_name = str(kwargs["display_name"])
        item = SimpleNamespace(
            name=f"files/{len(self.files) + 1}",
            display_name=display_name,
            file_status=SimpleNamespace(state="ACTIVE"),
        )
        self.files.append(item)
        self.upload_configs.append(kwargs["upload_rag_file_config"])
        return item

    def delete_file(self, *, name: str) -> None:
        self.files = [item for item in self.files if item.name != name]


def test_sync_skips_unchanged_hash_and_replaces_changed_content(
    tmp_path, monkeypatch
) -> None:
    brief = tmp_path / "brief.md"
    brief.write_text("first grounded summary", encoding="utf-8")
    monkeypatch.setattr(corpus, "uploadable_files", lambda: [brief.resolve()])
    api = FakeRagApi()
    client = SimpleNamespace(rag=api)
    corpus_name = "projects/demo/locations/us-central1/ragCorpora/1"

    first = corpus.upload_briefs(CONFIG, corpus_name, client)
    second = corpus.upload_briefs(CONFIG, corpus_name, client)
    brief.write_text("changed grounded summary", encoding="utf-8")
    third = corpus.upload_briefs(CONFIG, corpus_name, client)

    assert len(first.uploaded) == 1 and len(first.indexed) == 1
    assert len(second.skipped) == 1 and second.uploaded == ()
    assert len(third.uploaded) == 1 and len(third.deleted) == 1
    assert len(api.files) == 1
    assert "--sha256-" in api.files[0].display_name
    chunking = api.upload_configs[0].rag_file_chunking_config
    assert chunking.chunk_size == 512
    assert chunking.chunk_overlap == 100


def test_verify_fails_when_an_expected_hash_version_is_missing(
    tmp_path, monkeypatch
) -> None:
    brief = tmp_path / "brief.md"
    brief.write_text("grounded summary", encoding="utf-8")
    monkeypatch.setattr(corpus, "uploadable_files", lambda: [brief.resolve()])
    client = SimpleNamespace(rag=FakeRagApi())

    try:
        corpus.verify_indexed_files(
            CONFIG, "projects/demo/locations/us-central1/ragCorpora/1", client
        )
    except RuntimeError as error:
        assert "missing 1 expected indexed briefs" in str(error)
    else:
        raise AssertionError("missing indexed file should fail verification")
