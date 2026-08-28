# Two-minute demo script

## 0:00–1:00 — Citizen journey

**0:00–0:10**  
“When a pensioner dies, a surviving spouse can meet conflicting forms, scattered
records and avoidable counter visits. SevaPath makes one Central Civil journey
clear. It is an independent prototype using only invented records.”

**0:10–0:24**  
Click **Fill in the example answers**, choose **All records agree**, then **Read
the records and run the checks**. “These four answers identify a spouse already
named in the PPO. Fixed rules—not a model—select Form 12 and the pension-paying
bank branch.”

**0:24–0:38**  
Scroll through the synthetic record cards, checks and checklist. “SevaPath shows
what it read, why each check passed, what is still needed, and the exact official
reference.”

**0:38–0:50**  
Switch to **Name spelling differs between records** and rerun. “It preserves
‘Meera Sharma’ and ‘Meera R. Sharma’, makes no identity decision, and requires
me to acknowledge human review before continuing.”

**0:50–1:00**  
Tick the acknowledgement and run the demonstration submission. “The receipt
repeatedly says no claim was submitted and its fake reference cannot be used
anywhere.”

## 1:00–2:00 — How and why it works

**1:00–1:17**  
“The Next.js interface calls a deterministic TypeScript domain layer for route,
extraction, checks and route-specific worksheets. Form 12 goes to the Pension
Disbursing Authority; a spouse not in the PPO is shown Form 10 and the Head of
Office.”

**1:17–1:34**  
Ask **Is Form 14 still current?** “The local retrieval adapter searches original
summaries of verified official rules, forms and RBI directions. It cites the
source and explains that Form 14 is archived. Missing evidence gets an honest
‘could not verify’ response.”

**1:34–1:47**  
“Safety boundaries are structural: no upload or real identifiers, no pension
calculation, eligibility or identity decision, no government API, and no copied
source PDFs in the deployment.”

**1:47–2:00**  
“Codex recovered and audited the existing build, implemented the ADK serving path,
expanded the RAG corpus for Hindi and Marathi, hardened source validation, verified
172 TypeScript tests and 53 retrieval eval assertions, and prepared the release.
The public journey runs local RAG safely without credentials.”
