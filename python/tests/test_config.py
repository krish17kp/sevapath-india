"""Configuration and upload-eligibility guards."""

from __future__ import annotations

import pytest

from sevapath_rag import config


def test_load_config_names_the_missing_variable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GOOGLE_CLOUD_PROJECT", raising=False)
    monkeypatch.setenv("GOOGLE_CLOUD_LOCATION", "us-central1")

    with pytest.raises(config.ConfigurationError, match="GOOGLE_CLOUD_PROJECT"):
        config.load_config()


def test_load_config_requires_a_location(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "demo-project")
    monkeypatch.delenv("GOOGLE_CLOUD_LOCATION", raising=False)

    with pytest.raises(config.ConfigurationError, match="GOOGLE_CLOUD_LOCATION"):
        config.load_config()


def test_load_config_reads_all_values(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "demo-project")
    monkeypatch.setenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    monkeypatch.setenv("SEVAPATH_RAG_CORPUS_NAME", "custom-corpus")

    loaded = config.load_config()

    assert loaded.project == "demo-project"
    assert loaded.location == "us-central1"
    assert loaded.corpus_display_name == "custom-corpus"
    assert loaded.corpus_resource is None
    assert loaded.chunk_size == 512
    assert loaded.chunk_overlap == 100


def test_rejects_a_partial_or_wrong_project_corpus_resource(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "demo-project")
    monkeypatch.setenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    monkeypatch.setenv("SEVAPATH_RAG_CORPUS_RESOURCE", "ragCorpora/123")

    with pytest.raises(config.ConfigurationError, match="complete corpus name"):
        config.load_config()


def test_uploadable_files_are_only_ingest_briefs() -> None:
    files = config.uploadable_files()

    assert files, "expected at least one brief"
    for path in files:
        assert path.suffix == ".md"
        assert path.parent == config.INGEST_DIR.resolve()


def test_raw_sources_are_never_uploadable() -> None:
    """The collected originals must be unreachable from the upload path."""
    raw_dir = config.REPO_ROOT / "rag-corpus" / "raw_sources_auto"
    uploadable = {path.resolve() for path in config.uploadable_files()}

    for path in uploadable:
        assert raw_dir.resolve() not in path.parents
        assert path.suffix not in {".pdf", ".html", ".txt"}
