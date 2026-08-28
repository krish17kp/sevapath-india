/**
 * Question-level boundaries, applied before retrieval runs.
 *
 * These are refusals of scope, not admissions of ignorance. A question about a
 * pension amount is refused even if the corpus happened to contain a number,
 * because quoting one would be doing the Pension Disbursing Authority's job.
 * Questions SevaPath is willing to answer but cannot support from the corpus
 * get `INSUFFICIENT_EVIDENCE_ANSWER` instead, from the retrieval layer.
 */

export type RefusalCategory =
  | "pension_amount"
  | "eligibility_decision"
  | "identity_resolution"
  | "submission_on_behalf"
  | "personal_data";

export interface RefusalRule {
  category: RefusalCategory;
  /** Any of these must appear in the normalised question. */
  triggers: RegExp[];
  /** Phrases that cancel the trigger, e.g. asking *where* a form is, not *what* it pays. */
  exemptions?: RegExp[];
  answer: string;
}

/**
 * Ordered most-specific first. The first matching rule wins, so a question that
 * mixes an amount with an eligibility word is refused as an amount question.
 */
const RULES: RefusalRule[] = [
  {
    category: "pension_amount",
    triggers: [
      /\bhow much\b/,
      /\bwhat (?:amount|rate|percentage|sum)\b/,
      /\b(?:calculate|compute|estimate|work out|tell me)\b[^?]{0,40}\b(?:amount|pension|arrears|gratuity)\b/,
      /\b(?:pension|family pension|arrears|gratuity)\b[^?]{0,25}\b(?:amount|per month|monthly|payable amount)\b/,
      /\bwhat will (?:i|she|he|they) (?:get|receive)\b/,
      /\bhow many rupees\b/,
      /\b(?:rupees|rs\.?|₹)\b/
    ],
    answer:
      "SevaPath does not calculate or quote any pension amount. The amount payable to a spouse named in the Pension Payment Order is the amount indicated in that Pension Payment Order, and the Pension Disbursing Authority pays it as authorised there. Read the Pension Payment Order and ask the Pension Disbursing Authority for the figure."
  },
  {
    category: "eligibility_decision",
    triggers: [
      /\bam i (?:eligible|entitled|qualified)\b/,
      /\b(?:is|are) (?:she|he|they|we|my \w+) (?:eligible|entitled)\b/,
      /\bdo i qualify\b/,
      /\b(?:decide|determine|confirm)\b[^?]{0,30}\beligib/,
      /\bwill (?:i|she|he|they) get (?:the )?family pension\b/,
      /\beligible for family pension\b/
    ],
    exemptions: [/\bwho is eligible\b/, /\bwhat (?:are the )?(?:rules?|conditions?)\b/],
    answer:
      "SevaPath does not decide eligibility. Eligibility for family pension under the Central Civil Services (Pension) Rules, 2021 is determined by the department — the Head of Office or the Pension Disbursing Authority — not by this prototype. SevaPath can only show you what the current route and the current forms are."
  },
  {
    category: "identity_resolution",
    triggers: [
      /\b(?:are|is) (?:these|those|the) (?:two )?names? the same (?:person|name)\b/,
      /\bsame person\b/,
      /\b(?:fix|correct|merge|match|change|update)\b[^?]{0,30}\bname\b[^?]{0,30}\b(?:for me|automatically|mismatch)\b/,
      /\bwhich name (?:is|should i use|is correct)\b/,
      /\bconfirm (?:my|her|his|the) identity\b/,
      /\bverify (?:my|her|his|the) identity\b/
    ],
    answer:
      "SevaPath does not decide whether two differently written names belong to the same person, and does not change either value. It shows both exactly as they appear and marks the claim for human review. Take both records to the Pension Disbursing Authority or the Head of Office and ask them to record the correction."
  },
  {
    category: "submission_on_behalf",
    triggers: [
      /\b(?:submit|file|send|lodge|apply)\b[^?]{0,30}\b(?:for me|on my behalf|for her|for him)\b/,
      /\bcan you (?:submit|file|send|lodge|apply|upload)\b/,
      /\b(?:submit|file) (?:it|this|the form|my claim) (?:to|with) the (?:bank|department|government|pda|head of office)\b/,
      /\bis this (?:an )?official (?:submission|application)\b/
    ],
    answer:
      "SevaPath does not submit anything to any government system, and the submission and receipt shown in this prototype are a demonstration only. SevaPath prepares a summary you carry to the Pension Disbursing Authority or the Head of Office; the real claim is made there in person or through the official channel."
  },
  {
    category: "personal_data",
    triggers: [
      /\b(?:enter|give|provide|store|save|upload|type)\b[^?]{0,30}\b(?:aadhaar|aadhar|pan|otp|password|account number|passbook)\b/,
      /\b(?:my|her|his) (?:real )?(?:aadhaar|aadhar|pan number|otp|password|bank account number)\b/,
      /\bshould i (?:share|give)\b[^?]{0,25}\b(?:aadhaar|aadhar|pan|otp|password)\b/
    ],
    answer:
      "SevaPath never collects Aadhaar, PAN, account numbers, OTPs, passwords or payment details. This prototype runs entirely on built-in synthetic records and has no upload. Enter those details only on the official form, in person, at the Pension Disbursing Authority or the Head of Office."
  }
];

export interface RefusalMatch {
  category: RefusalCategory;
  answer: string;
}

/**
 * Returns the boundary that applies to `question`, or `null` when SevaPath may
 * attempt an answer from the corpus.
 */
export function classifyRefusal(question: string): RefusalMatch | null {
  const normalised = question.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalised === "") return null;

  for (const rule of RULES) {
    if (rule.exemptions?.some((pattern) => pattern.test(normalised))) continue;
    if (rule.triggers.some((pattern) => pattern.test(normalised))) {
      return { category: rule.category, answer: rule.answer };
    }
  }
  return null;
}

/** Exposed so tests can assert the full set of boundaries is covered. */
export const REFUSAL_CATEGORIES: RefusalCategory[] = RULES.map((rule) => rule.category);
