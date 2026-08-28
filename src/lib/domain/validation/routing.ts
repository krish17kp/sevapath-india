import type { RouteDecision, ScopeAnswers } from "../types";

/**
 * Deterministic route selection.
 *
 * Rule 79(2)(a)(ii) of the Central Civil Services (Pension) Rules, 2021 sends a
 * claimant named in the Pension Payment Order to the Pension Disbursing
 * Authority with a claim in Form 12. Rule 79(2)(b)(i) sends a claimant who is
 * not named there to the Head of Office with a claim in Form 10.
 *
 * No model is involved. The answers below are the ones the citizen gave on the
 * scope screen, and the mapping is fixed.
 */

export const SCOPE_QUESTIONS = [
  {
    key: "isSurvivingSpouse" as const,
    question: "Are you the surviving spouse of the person who has died?",
    help: "SevaPath's walkthrough covers a surviving spouse. Other family members have a different route."
  },
  {
    key: "isCentralCivilPension" as const,
    question: "Was their pension a Central Civil Services pension?",
    help: "This is the pension of a retired Central Government civil servant. Defence, railway and state pensions follow different rules."
  },
  {
    key: "isNamedInPpo" as const,
    question: "Is your name already written in their Pension Payment Order (PPO)?",
    help: "The PPO usually names the spouse who is to receive family pension. If you are not sure, answer no."
  },
  {
    key: "familyPensionAlreadyStarted" as const,
    question: "Has family pension already started being paid to you?",
    help: "If it has already started, you do not need to make this claim."
  }
];

export function decideRoute(answers: ScopeAnswers): RouteDecision {
  const reasons: string[] = [];

  if (answers.familyPensionAlreadyStarted === true) {
    return {
      route: "out_of_scope",
      label: "Family pension has already started",
      recipient: "Your pension disbursing bank branch",
      reasons: ["You answered that family pension is already being paid to you."],
      referral:
        "This walkthrough is for starting family pension for the first time. If a payment is missing or wrong, raise it with your pension disbursing bank branch, which the Reserve Bank of India directs to have nodal officers for pension complaints."
    };
  }

  if (answers.isSurvivingSpouse === false) {
    return {
      route: "out_of_scope",
      label: "Not the surviving spouse",
      recipient: "The Head of Office of the department the pensioner retired from",
      reasons: ["You answered that you are not the surviving spouse."],
      referral:
        "SevaPath only walks through the surviving spouse's route. A child, dependent parent, disabled sibling or guardian claims in Form 10 to the Head of Office. Form 10 is linked on the sources page."
    };
  }

  if (answers.isCentralCivilPension === false) {
    return {
      route: "out_of_scope",
      label: "Not a Central Civil Services pension",
      recipient: "The pension authority for that scheme",
      reasons: ["You answered that this is not a Central Civil Services pension."],
      referral:
        "SevaPath's corpus covers the Central Civil Services (Pension) Rules, 2021 only. Defence, railway, state government and autonomous body pensions have their own rules and their own forms, and SevaPath has not verified them."
    };
  }

  if (
    answers.isSurvivingSpouse === null ||
    answers.isCentralCivilPension === null ||
    answers.isNamedInPpo === null ||
    answers.familyPensionAlreadyStarted === null
  ) {
    return {
      route: "out_of_scope",
      label: "Scope not yet confirmed",
      recipient: "Not decided yet",
      reasons: ["Not every scope question has been answered."],
      referral: "Answer the four questions above so SevaPath can work out which route applies."
    };
  }

  if (answers.isNamedInPpo === true) {
    reasons.push("You are the surviving spouse.");
    reasons.push("The pension is a Central Civil Services pension.");
    reasons.push("Your name is already in the Pension Payment Order.");
    reasons.push("Family pension has not started yet.");
    return {
      route: "form12_pda",
      label: "Form 12 to the Pension Disbursing Authority",
      recipient: "The pension disbursing bank branch that was paying the pension",
      reasons
    };
  }

  reasons.push("You are the surviving spouse.");
  reasons.push("The pension is a Central Civil Services pension.");
  reasons.push("Your name is not in the Pension Payment Order.");
  reasons.push("Family pension has not started yet.");
  return {
    route: "form10_hoo",
    label: "Form 10 to the Head of Office",
    recipient: "The Head of Office of the department the pensioner retired from",
    reasons
  };
}
