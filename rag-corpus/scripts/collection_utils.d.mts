/**
 * Type declarations for collection_utils.mjs — the shared ESM helpers used
 * by both the Node.js collection scripts and the Vitest test suite.
 *
 * The module is intentionally pure ESM (.mjs) so it can be imported directly
 * by Node scripts without a build step. TypeScript tests import it via Vitest's
 * ESM support; these declarations make the import type-safe.
 */

export declare function sha256(bytes: Buffer): string;
export declare function safeName(value: string): string;
export declare function normalizeText(text: string): string;
export declare function stripHtml(html: string): string;
export declare function extractTitle(html: string): string;
export declare function parseWildcardRobots(content: string): string[];
export declare function validatePdf(bytes: Buffer, contentType: string): void;
export declare function assertSourceProvenance(source: unknown): void;

export declare function extractPdfPages(bytes: Buffer): Promise<{
  pageCount: number;
  nonEmptyPages: number;
  textCharacters: number;
  likelyScanned: boolean;
  text: string;
}>;
