---
id: name-consistency
title: When the name on the record and the name on the bank account differ
topic: consistency-check
route: both
status: current
keywords:
  - name mismatch
  - name different
  - spelling
  - middle initial
  - bank account name
  - same name
  - discrepancy
sources:
  FORM10:
    sourceId: FORM10-2021
    issuer: Department of Pension and Pensioners' Welfare
    title: "Form 10 — Application to the Head of Office for Family Pension on Death of a Government Servant or Pensioner or on Death or Ineligibility of a Family Pensioner or when a Government Servant or Pensioner or Family Pensioner goes missing"
    url: https://pensionersportal.gov.in/Forms/pension_new_forms/Form10.pdf
    accessed: 2026-08-27
  RULE79:
    sourceId: CCS2021-NOTIFICATION
    issuer: Department of Pension and Pensioners' Welfare
    title: "Central Civil Services (Pension) Rules, 2021 (Gazette of India, Extraordinary, Part II Sec. 3(i))"
    url: https://pensionersportal.gov.in/Document/CCS-Pension-Rules%202021-English.pdf
    accessed: 2026-08-27
  GUIDELINES:
    sourceId: PENSIONER-GUIDELINES
    issuer: Department of Pension and Pensioners' Welfare
    title: "Guidelines for Pensioners"
    url: https://pensionersportal.gov.in/guidelines.aspx
    accessed: 2026-08-27
---

## Why the names are expected to agree

The document list on Form 10 requires a copy of the first page of the pass book
showing the name and account number to which family pension is to be credited,
and states in the same item that the name of the claimant in the form and in the
bank account should be the same. [FORM10: Form 10, page 3, list item 19]

The Form 12 route rests on the claimant being the person whose name has been
included in the Pension Payment Order, so the name on the Pension Payment Order
matters too. [RULE79: Rule 79(2)(a)(ii), printed page 177, PDF page 56]

## What a difference means, and what it does not

A difference in how a name is written across records — for example an extra
middle initial on a bank record — is a discrepancy to be resolved with the
office that issued the record. Nothing in the collected sources authorises a
third party to decide that two differently written names are the same person.

The Pensioners' Portal guidance on correcting a Pension Payment Order directs the
pensioner to contact the Head of Office or the Pension Disbursing Agency for
necessary action. [GUIDELINES: "Verification of PPO"]

## What SevaPath does

<!-- product-policy: describes SevaPath behaviour, not a claim about official sources -->

SevaPath shows both values exactly as they appear on the records, side by side,
and marks the claim as needing human review. It does not choose between the
values, does not merge them, does not normalise spelling, and does not decide
whether the two names belong to one person. Resolving the difference is a task
for the claimant with the Pension Disbursing Authority or the Head of Office.
