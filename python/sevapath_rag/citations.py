"""Resolve citation markers in a retrieved chunk back to full citations.

Vertex returns chunk text taken from the uploaded brief, which still carries the
`[KEY: locator]` markers the briefs are written with. Those markers are resolved
against the *local* brief frontmatter rather than against anything the model
produced, so a citation shown to a citizen is always the exact issuer, title,
URL, access date and reference recorded at corpus build time.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path

import yaml

from .config import INGEST_DIR

#: [KEY: locator], tolerating one level of nested brackets in the locator.
CITATION_PATTERN = re.compile(r"\[([A-Z][A-Z0-9]*):\s*((?:[^\[\]]|\[[^\[\]]*\])*)\]")

FRONTMATTER_PATTERN = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n(.*)\Z", re.DOTALL)


@dataclass(frozen=True)
class Citation:
    sourceId: str  # noqa: N815 - matches the TypeScript field name over the wire
    issuer: str
    title: str
    url: str
    accessed: str
    reference: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@lru_cache(maxsize=1)
def _source_tables() -> dict[str, dict[str, dict[str, str]]]:
    """Maps brief filename -> citation key -> source record."""
    tables: dict[str, dict[str, dict[str, str]]] = {}
    for path in sorted(INGEST_DIR.glob("*.md")):
        match = FRONTMATTER_PATTERN.match(path.read_text(encoding="utf-8"))
        if not match:
            continue
        frontmatter = yaml.safe_load(match.group(1)) or {}
        tables[path.name] = frontmatter.get("sources") or {}
    return tables


def clear_cache() -> None:
    """Drops the parsed frontmatter cache. Used by the tests."""
    _source_tables.cache_clear()


def resolve(chunk_text: str, source_display_name: str) -> tuple[str, list[Citation]]:
    """Strips citation markers from `chunk_text` and returns the citations.

    A marker whose key is not defined in the named brief is dropped rather than
    guessed at, so an unresolvable citation can never reach a citizen.
    """
    sources = _source_tables().get(_normalise(source_display_name), {})

    citations: list[Citation] = []
    seen: set[tuple[str, str]] = set()
    for key, locator in CITATION_PATTERN.findall(chunk_text):
        source = sources.get(key)
        if not source:
            continue
        fingerprint = (str(source.get("sourceId", "")), locator.strip())
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        citations.append(
            Citation(
                sourceId=str(source.get("sourceId", "")),
                issuer=str(source.get("issuer", "")),
                title=str(source.get("title", "")),
                url=str(source.get("url", "")),
                accessed=str(source.get("accessed", "")),
                reference=locator.strip(),
            )
        )

    cleaned = CITATION_PATTERN.sub("", chunk_text)
    cleaned = re.sub(r"<!--.*?-->", "", cleaned, flags=re.DOTALL)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned, citations


def _normalise(source_display_name: str) -> str:
    """Vertex may report a display name with or without a path prefix."""
    return Path(source_display_name).name
