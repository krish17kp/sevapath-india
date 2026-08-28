"""Citation markers must resolve to the exact recorded official reference."""

from __future__ import annotations

from sevapath_rag import citations


def test_resolves_a_marker_against_the_named_brief() -> None:
    chunk = (
        "The Pension Disbursing Authority commences disbursement within one month. "
        "[RULE79: Rule 79(2)(a)(ii), printed page 177, PDF page 56]"
    )

    text, resolved = citations.resolve(chunk, "01-form12-pda-route.md")

    assert "[RULE79:" not in text
    assert text.endswith("within one month.")
    assert len(resolved) == 1
    citation = resolved[0]
    assert citation.sourceId == "CCS2021-NOTIFICATION"
    assert citation.issuer == "Department of Pension and Pensioners' Welfare"
    assert citation.url.startswith("https://pensionersportal.gov.in/")
    assert citation.accessed == "2026-08-28"
    assert citation.reference == "Rule 79(2)(a)(ii), printed page 177, PDF page 56"


def test_unknown_key_is_dropped_rather_than_guessed() -> None:
    text, resolved = citations.resolve(
        "A claim with a bogus marker. [NOSUCHKEY: invented reference]",
        "01-form12-pda-route.md",
    )

    assert resolved == []
    assert "NOSUCHKEY" not in text


def test_unknown_brief_yields_no_citations() -> None:
    _, resolved = citations.resolve(
        "Text. [RULE79: Rule 79(2)(a)(ii)]", "not-a-real-brief.md"
    )

    assert resolved == []


def test_duplicate_markers_are_collapsed() -> None:
    chunk = (
        "First. [RULE79: Rule 79(2)(a)(ii), printed page 177, PDF page 56] "
        "Second. [RULE79: Rule 79(2)(a)(ii), printed page 177, PDF page 56]"
    )

    _, resolved = citations.resolve(chunk, "01-form12-pda-route.md")

    assert len(resolved) == 1


def test_display_name_with_a_path_prefix_still_resolves() -> None:
    _, resolved = citations.resolve(
        "Text. [RULE79: Rule 79(2)(a)(ii)]", "gs://bucket/ingest/01-form12-pda-route.md"
    )

    assert len(resolved) == 1


def test_adk_text_only_result_preserves_recorded_citation() -> None:
    text, resolved, filename = citations.resolve_any(
        "Form 12 goes to the PDA. "
        "[RULE79: Rule 79(2)(a)(ii), printed page 177, PDF page 56]"
    )

    assert text == "Form 12 goes to the PDA."
    assert resolved[0].sourceId == "CCS2021-NOTIFICATION"
    assert resolved[0].url.startswith("https://pensionersportal.gov.in/")
    assert filename.endswith(".md")


def test_every_brief_frontmatter_parses() -> None:
    tables = citations._source_tables()

    assert len(tables) >= 10
    for filename, sources in tables.items():
        assert sources, f"{filename} declares no sources"
        for key, source in sources.items():
            assert source["url"].startswith("https://"), f"{filename}:{key}"
            assert source["accessed"], f"{filename}:{key}"
