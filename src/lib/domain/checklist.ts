import type { ChecklistItem, ExtractionResult, RouteId } from "./types";
import { valueOf } from "./validation/checks";

/**
 * The preparation checklist for whichever official route applies.
 *
 * `satisfied` means only that SevaPath could read the corresponding detail off
 * the synthetic records. It is never a statement that the department will
 * accept the item.
 *
 * The two routes ask for different papers, so they get different lists. Handing
 * a Head-of-Office claimant the Form 12 list would be the exact wrong-form
 * mistake this product exists to prevent.
 */
export function buildChecklist(route: RouteId, extraction: ExtractionResult): ChecklistItem[] {
  if (route === "form10_hoo") return form10Checklist(extraction);
  if (route !== "form12_pda") return [];

  const dateOfDeath = valueOf(extraction, "death_certificate", "date_of_death");
  const ppoNumber = valueOf(extraction, "ppo", "ppo_number");
  const accountNumber = valueOf(extraction, "bank_proof", "account_number");
  const ifsc = valueOf(extraction, "bank_proof", "ifsc");
  const bankName = valueOf(extraction, "bank_proof", "bank_name");

  return [
    {
      id: "form12",
      label: "Form 12, filled in and signed",
      detail:
        "The claim itself. Download it from the Pensioners' Portal forms page and fill it in by hand or on screen.",
      satisfied: false,
      reference: "Form 12, page 1",
      sourceId: "FORM12-2021"
    },
    {
      id: "death_certificate_copy",
      label: "A copy of the death certificate",
      detail:
        dateOfDeath === null
          ? "SevaPath could not read the date of death from the record, so a legible copy is needed."
          : `Named in the rule as one of the three things that accompany the claim. The record shows the date of death as ${dateOfDeath}.`,
      satisfied: dateOfDeath !== null,
      reference: "Rule 79(2)(a)(ii), printed page 177",
      sourceId: "CCS2021-NOTIFICATION"
    },
    {
      id: "format9",
      label: "Format 9 undertaking, signed",
      detail:
        "The undertaking to the bank about refunding any excess payment. Download Format 9 from the Pensioners' Portal.",
      satisfied: false,
      reference: "Rule 79(2)(a)(ii), printed page 177; Format 9",
      sourceId: "FORMAT9-2021"
    },
    {
      id: "specimen_signatures",
      label: "Two specimen signatures on a separate sheet",
      detail:
        "Form 12's own document list asks for these. Someone who cannot sign may give left hand thumb and finger impressions instead.",
      satisfied: false,
      reference: "Form 12, page 2, list item 1",
      sourceId: "FORM12-2021"
    },
    {
      id: "photographs",
      label: "Two passport size photographs",
      detail: "Of the claimant. Form 12's document list asks for two copies.",
      satisfied: false,
      reference: "Form 12, page 2, list item 2",
      sourceId: "FORM12-2021"
    },
    {
      id: "ppo_copy",
      label: "A copy of the Pension Payment Order, if you have one",
      detail:
        ppoNumber === null
          ? "Form 12's list asks for this if available."
          : `Form 12's list asks for this if available. The record shows PPO number ${ppoNumber}.`,
      satisfied: ppoNumber !== null,
      reference: "Form 12, page 2, list item 7",
      sourceId: "FORM12-2021"
    },
    {
      id: "bank_details",
      label: "Bank account details for the credit",
      detail:
        accountNumber === null || ifsc === null
          ? "Form 12 asks for the account number, the bank's name and branch, and the IFS code. SevaPath could not read all of them."
          : `Form 12 asks for the account number, the bank's name and branch, and the IFS code. The record shows ${accountNumber} at ${bankName ?? "the bank named on the record"}, IFSC ${ifsc}.`,
      satisfied: accountNumber !== null && ifsc !== null,
      reference: "Form 12, page 1, item 4",
      sourceId: "FORM12-2021"
    },
    {
      id: "existing_joint_account",
      label: "Decide which account the pension should go to",
      detail:
        "If the pension was already credited to a joint account, the bank is directed not to insist on a new account when the spouse opts for that existing joint account.",
      satisfied: false,
      reference: "RBI Directions 2026, Chapter VII(E), paragraph 23",
      sourceId: "RBI2026-MD"
    }
  ];
}

/**
 * The alternative Head of Office route.
 *
 * Every item is taken from Form 10's own attachment list or from rule 79(2)(b)(i),
 * as recorded in `rag-corpus/ingest/02-form10-hoo-route.md`. Form 12 and the
 * Rule 79(2)(a)(ii) one-month duty belong to the Pension Disbursing Authority
 * route and deliberately do not appear here.
 */
function form10Checklist(extraction: ExtractionResult): ChecklistItem[] {
  const dateOfDeath = valueOf(extraction, "death_certificate", "date_of_death");
  const accountNumber = valueOf(extraction, "bank_proof", "account_number");
  const bankName = valueOf(extraction, "bank_proof", "bank_name");

  return [
    {
      id: "form10",
      label: "Form 10, filled in and signed",
      detail:
        "The application to the Head of Office for family pension. Download it from the Pensioners' Portal forms page.",
      satisfied: false,
      reference: "Form 10, page 1 header",
      sourceId: "FORM10-2021"
    },
    {
      id: "death_certificate_copy",
      label: "A copy of the death certificate",
      detail:
        dateOfDeath === null
          ? "SevaPath could not read the date of death from the record, so a legible copy is needed."
          : `Evidence of the death that the claim rests on. The record shows the date of death as ${dateOfDeath}.`,
      satisfied: dateOfDeath !== null,
      reference: "Rule 79(2)(b)(i), printed page 177",
      sourceId: "CCS2021-NOTIFICATION"
    },
    {
      id: "proof_of_identity",
      label: "Proof of identity",
      detail: "Form 10's own document list asks for proof of the claimant's identity.",
      satisfied: false,
      reference: "Form 10, page 3, list item 2",
      sourceId: "FORM10-2021"
    },
    {
      id: "proof_of_relationship",
      label: "Proof of relationship with the deceased",
      detail:
        "Form 10's document list asks for evidence of the claimant's relationship to the person who has died.",
      satisfied: false,
      reference: "Form 10, page 3, list item 3",
      sourceId: "FORM10-2021"
    },
    {
      id: "family_details_form4",
      label: "Details of family in Form 4",
      detail: "Form 10's document list asks for the family details statement in Form 4.",
      satisfied: false,
      reference: "Form 10, page 3, list item 5",
      sourceId: "FORM10-2021"
    },
    {
      id: "format9",
      label: "Format 9 undertaking, signed",
      detail:
        "The undertaking about refunding any excess payment made by the pension disbursing bank. Form 10's list asks for it too.",
      satisfied: false,
      reference: "Form 10, page 3, list item 6; Format 9",
      sourceId: "FORMAT9-2021"
    },
    {
      id: "passbook_first_page",
      label: "A copy of the first page of the pass book",
      detail:
        accountNumber === null
          ? "It must show the name and account number. Form 10 states the claimant's name on the form and on the bank account should be the same."
          : `It must show the name and account number. The record shows ${accountNumber} at ${bankName ?? "the bank named on the record"}. Form 10 states the claimant's name on the form and on the bank account should be the same.`,
      satisfied: accountNumber !== null,
      reference: "Form 10, page 3, list item 19",
      sourceId: "FORM10-2021"
    }
  ];
}
