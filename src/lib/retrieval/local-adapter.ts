import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  insufficientEvidenceAnswer,
  type Citation,
  type RetrievalAdapter,
  type RetrievalResponse,
  type RetrievedPassage
} from "./types";
import { classifyRefusal } from "./safety";

/**
 * File-backed retrieval over the compiled corpus index.
 *
 * Scoring is BM25 over the brief text, plus fixed bonuses for matches in a
 * chunk's heading, its brief title, and its declared keywords. Nothing here is
 * stochastic: the same query against the same index always returns the same
 * passages in the same order, which is what makes the retrieval evaluation
 * suite meaningful.
 */

interface IndexChunk {
  id: string;
  briefId: string;
  briefTitle: string;
  file: string;
  heading: string;
  topic: string;
  route: string;
  status: string;
  keywords: string[];
  text: string;
  productPolicy: boolean;
  citations: Citation[];
}

interface CorpusIndex {
  schemaVersion: number;
  briefCount: number;
  chunkCount: number;
  chunks: IndexChunk[];
}

interface ScoredChunk {
  chunk: IndexChunk;
  score: number;
  /** How many distinct query terms this chunk actually contains. */
  matchedTerms: number;
  /** Whether a matched term is one the brief declares itself to be about. */
  matchedKeyword: boolean;
}

/** BM25 parameters. Standard values; the corpus is too small to warrant tuning. */
const BM25_K1 = 1.5;
const BM25_B = 0.75;

/**
 * Minimum score for a passage to count as evidence. Below this, SevaPath says
 * it could not verify the answer rather than serving a weak match. Chosen so
 * that a single incidental word overlap ("pension") cannot carry an answer.
 */
const SCORE_FLOOR = 2.2;

/**
 * A chunk must contain at least this many distinct query terms, unless one of
 * the matched terms is a keyword the brief declares itself to be about. This
 * rejects single incidental word overlaps that BM25 alone rates highly because
 * the colliding word happens to be rare in the corpus.
 */
const MINIMUM_MATCHED_TERMS = 2;

/** Words too common in this corpus to signal relevance on their own. */
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does", "for",
  "from", "has", "have", "how", "i", "if", "in", "is", "it", "me", "my", "of",
  "on", "or", "the", "to", "was", "what", "when", "where", "which", "who",
  "why", "will", "with", "you", "your", "that", "this", "there", "their",
  "should", "would", "could", "about", "after", "before", "into", "than",
  "then", "them", "they", "he", "she", "her", "his", "we", "us", "our",
  "का", "की", "के", "को", "से", "और", "है", "हैं", "मैं", "मुझे", "क्या",
  "तो", "पर", "एक", "या", "लिए", "आहे", "आहेत", "मी", "मला", "काय", "चा",
  "ची", "चे", "ला", "मध्ये", "आणि", "साठी", "वर", "एक"
]);

/**
 * Query terms are expanded so a citizen's wording reaches the corpus vocabulary.
 * Every expansion is a synonym, never a change of meaning — `pda` means the
 * same thing as `pension disbursing authority`.
 */
const SYNONYMS: Record<string, string[]> = {
  pda: ["pension", "disbursing", "authority"],
  hoo: ["head", "office"],
  ppo: ["pension", "payment", "order"],
  bank: ["bank", "disbursing"],
  widow: ["spouse", "widow", "widower"],
  wife: ["spouse", "widow"],
  husband: ["spouse", "widower"],
  died: ["death", "died", "deceased"],
  die: ["death", "deceased"],
  dead: ["death", "deceased"],
  passed: ["death", "deceased"],
  papers: ["documents"],
  paperwork: ["documents"],
  docs: ["documents"],
  outdated: ["archived", "superseded"],
  old: ["archived", "superseded"],
  obsolete: ["archived", "superseded"],
  current: ["current"],
  latest: ["current"],
  form12: ["form", "12"],
  form10: ["form", "10"],
  form14: ["form", "14"],
  format9: ["format", "9"],
  rule79: ["rule", "79"]
};

let cachedIndex: CorpusIndex | null = null;
let cachedStats: CorpusStats | null = null;

/** Clears the module-level cache. Tests use this between fixtures. */
export function resetLocalCorpusCache(): void {
  cachedIndex = null;
  cachedStats = null;
}

async function loadIndex(): Promise<CorpusIndex> {
  if (cachedIndex) return cachedIndex;

  // The default path is written out statically so the bundler can trace exactly
  // one file into the server output. SEVAPATH_CORPUS_INDEX is an escape hatch
  // for tests and operators; it is opted out of tracing because its target is
  // by definition not known at build time.
  const override = process.env.SEVAPATH_CORPUS_INDEX?.trim();
  const raw = override
    ? await readFile(/*turbopackIgnore: true*/ override, "utf8")
    : await readFile(
        path.join(process.cwd(), "rag-corpus", "index", "local_index.json"),
        "utf8"
      );

  const parsed = JSON.parse(raw) as CorpusIndex;
  if (!Array.isArray(parsed.chunks) || parsed.chunks.length === 0) {
    throw new Error("Corpus index contains no chunks");
  }
  cachedIndex = parsed;
  cachedStats = null;
  return parsed;
}

function statsFor(index: CorpusIndex) {
  if (cachedStats) return cachedStats;
  const documentFrequency = new Map<string, number>();
  // Every word the corpus knows: body text plus the headings, brief titles and
  // declared keywords. Used by the coverage gate below to tell "the corpus does
  // not discuss this" from "the corpus discusses this but I scored it low".
  const vocabulary = new Set<string>();
  let totalLength = 0;

  for (const chunk of index.chunks) {
    const tokens = tokenize(chunk.text);
    totalLength += tokens.length;
    for (const term of new Set(tokens)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
      vocabulary.add(term);
    }
    for (const term of tokenize(chunk.heading)) vocabulary.add(term);
    for (const term of tokenize(chunk.briefTitle)) vocabulary.add(term);
    for (const keyword of chunk.keywords) {
      for (const term of tokenize(keyword)) vocabulary.add(term);
    }
  }

  cachedStats = {
    averageLength: totalLength / index.chunks.length,
    documentFrequency,
    vocabulary
  };
  return cachedStats;
}

interface CorpusStats {
  averageLength: number;
  documentFrequency: Map<string, number>;
  vocabulary: Set<string>;
}

/**
 * Decides whether the corpus covers the *subject* of a question at all.
 *
 * BM25 alone cannot make this call. "How many days does the Central Pension
 * Accounting Office take to issue a duplicate PPO?" shares most of its words
 * with the Rule 80 passage and outscores several questions the corpus really
 * does answer — but "duplicate" appears nowhere, and that is the word the
 * question turns on.
 *
 * Two independent signals have to agree before a question is turned away, so a
 * long legitimate question is not rejected for one or two incidental words:
 *   - at least two content words are absent from the corpus vocabulary, and
 *   - fewer than 75% of its content words are known at all.
 *
 * This is a limitation of lexical retrieval over a small corpus, and it is the
 * one place SevaPath prefers saying "I could not verify this" over answering.
 */
function coversQuerySubject(
  queryTerms: string[],
  stats: CorpusStats,
  originalQuery: string
): boolean {
  if (queryTerms.length === 0) return false;

  const known = queryTerms.filter((term) => stats.vocabulary.has(term));
  const absentCount = queryTerms.length - known.length;
  const coverage = known.length / queryTerms.length;

  // Inflected Hindi and Marathi questions naturally contain more surface
  // forms than this small curated corpus. Two independent known terms plus
  // 40% coverage is still conservative: an unrelated question such as the
  // railway-appointment eval has only one known generic word and is refused.
  if (/[\u0900-\u097f]/u.test(originalQuery)) {
    return known.length >= 2 && coverage >= 0.4;
  }

  return absentCount < 2 || coverage >= 0.75;
}

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    // Devanagari vowel signs are Unicode marks, not letters. Keeping marks is
    // required for Hindi/Marathi words to remain intact instead of becoming
    // misleading one-syllable lexical matches.
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

function expandQuery(query: string): string[] {
  const base = tokenize(query);
  const expanded: string[] = [];
  for (const token of base) {
    expanded.push(token);
    const synonyms = SYNONYMS[token];
    if (synonyms) expanded.push(...synonyms);
  }
  // `form 12` arrives as two tokens; also try the joined form so the synonym
  // table can catch `form12` written either way.
  for (let position = 0; position < base.length - 1; position += 1) {
    const joined = `${base[position]}${base[position + 1]}`;
    if (SYNONYMS[joined]) expanded.push(joined, ...SYNONYMS[joined]);
  }
  return [...new Set(expanded)];
}

/**
 * Which official route a question is asking about, judged only on whether the
 * citizen says they *are* or *are not* named in the Pension Payment Order.
 *
 * That single distinction is the whole difference between the two routes:
 * Rule 79(2)(a)(ii) sends a claimant named in the PPO to the Pension Disbursing
 * Authority on Form 12, and Rule 79(2)(b)(i) sends a claimant not named there to
 * the Head of Office on Form 10. Bag-of-words scoring cannot see that negation,
 * and the Form 10 brief explains *both* branches in one dense passage — so
 * without this signal the corpus returns the two routes interchangeably and
 * answers the product's central question backwards in both directions.
 *
 * This re-ranks evidence only. It never decides which route applies to a
 * person; that stays deterministic in `domain/validation/routing.ts`.
 */
type RouteAffinity = "form12_pda" | "form10_hoo";

const PPO = String.raw`(?:ppo|pension payment order)`;
const GAP = String.raw`[^.?!]{0,40}`;

/** Checked before the positive patterns, because every one of these also matches "named ... PPO". */
const NOT_NAMED_IN_PPO: RegExp[] = [
  new RegExp(String.raw`\b(?:not|never|isn'?t|aren'?t|wasn'?t)\b${GAP}\b(?:named?|listed|mentioned|included|shown)\b${GAP}\b${PPO}\b`),
  new RegExp(String.raw`\b(?:name|named)\b${GAP}\b(?:is not|isn'?t|not|missing|absent|does not appear|doesn'?t appear)\b${GAP}\b${PPO}\b`),
  new RegExp(String.raw`\b${PPO}\b${GAP}\b(?:does not|doesn'?t|do not|don'?t)\b${GAP}\b(?:name|include|list|mention|show)\b`),
  new RegExp(String.raw`\b${PPO}\b${GAP}\bno\b${GAP}\bname\b`)
];

const NAMED_IN_PPO: RegExp[] = [
  new RegExp(String.raw`\b(?:named?|listed|mentioned|included|shown)\b${GAP}\b${PPO}\b`),
  new RegExp(String.raw`\b${PPO}\b${GAP}\b(?:names? me|has my name|includes? my name|lists? my name)\b`)
];

export function routeAffinity(query: string): RouteAffinity | null {
  const normalised = query.toLowerCase().replace(/\s+/g, " ").trim();
  if (
    /(?:ppo|पीपीओ).{0,30}(?:नाम|नाव).{0,20}(?:नहीं|नाही|दर्ज नहीं|नोंदलेले नाही)/u.test(normalised) ||
    /(?:नाम|नाव).{0,20}(?:नहीं|नाही|दर्ज नहीं|नोंदलेले नाही).{0,30}(?:ppo|पीपीओ)/u.test(normalised)
  ) return "form10_hoo";
  if (
    /(?:ppo|पीपीओ).{0,30}(?:नाम|नाव).{0,20}(?:है|आहे|दर्ज|नोंदलेले)/u.test(normalised) ||
    /(?:नाम|नाव).{0,20}(?:है|आहे|दर्ज|नोंदलेले).{0,30}(?:ppo|पीपीओ)/u.test(normalised)
  ) return "form12_pda";
  if (NOT_NAMED_IN_PPO.some((pattern) => pattern.test(normalised))) return "form10_hoo";
  if (NAMED_IN_PPO.some((pattern) => pattern.test(normalised))) return "form12_pda";
  return null;
}

/**
 * Enough to settle the ~0.5-point gap that previously let the wrong route win,
 * and small enough that it cannot lift an otherwise irrelevant passage over the
 * evidence floor. Applied as a bonus only — never a penalty — so a passage that
 * usefully contrasts the two routes is still available as supporting evidence.
 */
const ROUTE_AFFINITY_BONUS = 3;

interface ChunkScore {
  score: number;
  matchedTerms: number;
  matchedKeyword: boolean;
}

function scoreChunk(
  chunk: IndexChunk,
  queryTerms: string[],
  stats: CorpusStats,
  totalChunks: number,
  affinity: RouteAffinity | null
): ChunkScore {
  const tokens = tokenize(chunk.text);
  const length = tokens.length;
  const frequency = new Map<string, number>();
  for (const token of tokens) frequency.set(token, (frequency.get(token) ?? 0) + 1);

  const headingTokens = new Set(tokenize(chunk.heading));
  const titleTokens = new Set(tokenize(chunk.briefTitle));
  const keywordTokens = new Set(chunk.keywords.flatMap((keyword) => tokenize(keyword)));

  let score = 0;
  let matchedTerms = 0;
  let matchedKeyword = false;
  for (const term of queryTerms) {
    const termFrequency = frequency.get(term) ?? 0;
    if (termFrequency > 0) {
      matchedTerms += 1;
      const documentFrequency = stats.documentFrequency.get(term) ?? 0;
      const idf = Math.log(
        1 + (totalChunks - documentFrequency + 0.5) / (documentFrequency + 0.5)
      );
      const numerator = termFrequency * (BM25_K1 + 1);
      const denominator =
        termFrequency + BM25_K1 * (1 - BM25_B + (BM25_B * length) / stats.averageLength);
      score += idf * (numerator / denominator);
    }
    if (headingTokens.has(term)) score += 0.9;
    if (titleTokens.has(term)) score += 0.7;
    if (keywordTokens.has(term)) {
      score += 1.1;
      matchedKeyword = true;
    }
  }
  if (affinity !== null && chunk.route === affinity) score += ROUTE_AFFINITY_BONUS;

  return { score, matchedTerms, matchedKeyword };
}

function collectCitations(passages: RetrievedPassage[]): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const passage of passages) {
    for (const citation of passage.citations) {
      const fingerprint = `${citation.sourceId}|${citation.reference}`;
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      citations.push(citation);
    }
  }
  return citations;
}

function composeAnswer(passages: RetrievedPassage[]): string {
  return passages
    .map((passage) => `**${passage.briefTitle} — ${passage.heading}**\n\n${passage.text}`)
    .join("\n\n");
}

export class LocalRetrievalAdapter implements RetrievalAdapter {
  readonly name = "local" as const;

  async health(): Promise<{ available: boolean; detail: string }> {
    try {
      const index = await loadIndex();
      return {
        available: true,
        detail: `Local corpus index loaded: ${index.briefCount} briefs, ${index.chunkCount} passages.`
      };
    } catch (error) {
      return {
        available: false,
        detail: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async search(query: string, options?: { limit?: number }): Promise<RetrievalResponse> {
    const refusal = classifyRefusal(query);
    if (refusal) {
      return {
        outcome: "out_of_scope",
        answer: refusal.answer,
        passages: [],
        citations: [],
        adapter: this.name,
        refusalCategory: refusal.category
      };
    }

    let index: CorpusIndex;
    try {
      index = await loadIndex();
    } catch (error) {
      return {
        outcome: "unavailable",
        answer:
          "The guidance corpus could not be loaded, so SevaPath cannot show source-linked guidance right now. The preparation checks below still work, and every official link is listed on the sources page.",
        passages: [],
        citations: [],
        adapter: this.name,
        unavailableReason: error instanceof Error ? error.message : String(error)
      };
    }

    const queryTerms = expandQuery(query);
    if (queryTerms.length === 0) {
      return this.insufficient(query);
    }

    const stats = statsFor(index);

    // Judged on the citizen's own words, before synonym expansion — expansion
    // would paper over exactly the gap this gate is looking for.
    if (!coversQuerySubject(tokenize(query), stats, query)) {
      return this.insufficient(query);
    }
    const affinity = routeAffinity(query);
    const scored: ScoredChunk[] = index.chunks
      // A product-policy section describes SevaPath, not the official sources,
      // so it is never served as retrieval evidence.
      .filter((chunk) => !chunk.productPolicy)
      .map((chunk) => ({
        chunk,
        ...scoreChunk(chunk, queryTerms, stats, index.chunks.length, affinity)
      }))
      .filter(
        (entry) =>
          entry.score >= SCORE_FLOOR &&
          // One incidental rare word is not evidence. "How do I renew my
          // passport?" overlaps the Form 12 checklist only on "passport", from
          // "passport size photographs", and must not be answered from it.
          (entry.matchedTerms >= MINIMUM_MATCHED_TERMS || entry.matchedKeyword)
      )
      // Ties break on chunk id so ordering is stable across runs.
      .sort((left, right) =>
        right.score - left.score || left.chunk.id.localeCompare(right.chunk.id)
      );

    if (scored.length === 0) {
      return this.insufficient(query);
    }

    const limit = Math.max(1, Math.min(options?.limit ?? 3, 8));
    const passages: RetrievedPassage[] = scored.slice(0, limit).map((entry) => ({
      id: entry.chunk.id,
      briefId: entry.chunk.briefId,
      briefTitle: entry.chunk.briefTitle,
      heading: entry.chunk.heading,
      text: entry.chunk.text,
      score: Number(entry.score.toFixed(4)),
      citations: entry.chunk.citations
    }));

    const citations = collectCitations(passages);
    // An answer with no official citation is not an answer SevaPath will give.
    if (citations.length === 0) {
      return this.insufficient(query);
    }

    return {
      outcome: "answered",
      answer: composeAnswer(passages),
      passages,
      citations,
      adapter: this.name
    };
  }

  private insufficient(query: string): RetrievalResponse {
    return {
      outcome: "insufficient_evidence",
      answer: insufficientEvidenceAnswer(query),
      passages: [],
      citations: [],
      adapter: this.name
    };
  }
}
