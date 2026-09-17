# Dead Lead Reactivator for Marketing & Web Agencies

Status: ready-for-agent

## Problem Statement

B2B digital marketing and web design agencies spend significant time and money generating inbound inquiries, conducting discovery calls, and submitting client proposals. Over 12–24 months, between 60% and 85% of these qualified leads stall out or "ghost" due to timing, lost budget, or shifting internal priorities. 

Agency owners and sales reps hate re-contacting cold leads because:
1. Manually reviewing old notes and crafting bespoke follow-up emails for 50–500 stalled contacts is mentally taxing and time-consuming.
2. Generic check-in templates ("Just bumping this", "Checking in on your Q3 plans") trigger spam filters and annoy prospects.
3. Reps prioritize incoming inbound leads over digging through old CRM archives.

Consequently, agencies sit on dormant pipelines worth \$100,000–\$500,000 in potential contract value that produces \$0 in revenue.

## Solution

The **Dead Lead Reactivator** is a specialized micro-SaaS and workflow engine that transforms cold agency pipelines into booked discovery calls with minimal human effort.

The agency owner uploads a CSV or pastes contact notes containing previously stalled leads (including name, company, past proposal focus, and last contact date). The system uses a domain-tuned AI engine to:
1. Analyze the context of why the lead went cold.
2. Select an appropriate high-converting, low-friction reactivation angle (e.g., "New Relevant Case Study", "Quick Clarification Angle", "Zero-Risk Pilot Offer", or "Resource/Strategy Share").
3. Generate a personalized, concise email sequence along with an optional LinkedIn DM draft.
4. Provide a 1-click review and export interface, enabling the agency to launch revival campaigns in minutes.

A single reactivated \$5,000 web design or marketing retainer yields an immediate 50x ROI on the software subscription.

## User Stories

1. As an agency owner, I want to upload a CSV of dormant leads with past notes, so that I don't have to manually re-type client information.
2. As an agency owner, I want the system to parse and clean varying CSV column names automatically (e.g. "Full Name", "Contact", "Email Address", "Deal Notes"), so that data entry is frictionless.
3. As an agency account executive, I want to select a primary "Reactivation Angle" (e.g., Case Study Drop, Quick Question, Low-Risk Pilot Offer, End of Quarter Check-in), so that the tone matches our current business campaign.
4. As an agency owner, I want to input our agency's core specialty and one recent client win or case study, so that the AI can cite concrete proof points in the reactivation messages.
5. As an agency sales rep, I want the generated email to directly reference the lead's specific past project or objection, so that the email feels 100% human and personalized rather than like a generic blast.
6. As an agency sales rep, I want the email hook to propose a low-friction call to action (e.g., "Mind if I send over a 2-minute Loom?" or "Are you still focused on X?"), so that the prospect feels comfortable replying without committing to a sales pitch.
7. As an agency sales rep, I want a short, matching LinkedIn connection/DM message alongside each email, so that I can reach the prospect on their preferred channel.
8. As an agency founder, I want to edit and polish generated drafts inline before exporting, so that I maintain complete brand quality control.
9. As an agency founder, I want to export the finalized emails and contacts as a structured CSV or copy them in 1-click, so that I can send them immediately via my existing email client (Gmail, Outlook) or cold email tool (Instantly, Smartlead).
10. As a prospective agency client running a free audit, I want to test 5 to 10 leads without paying upfront, so that I can see the caliber of reactivation emails before committing to a paid subscription.
11. As an agency owner, I want the system to flag leads whose past notes indicate a firm "do not contact" or "went out of business", so that our reputation is protected.
12. As an agency founder, I want to see an estimated pipeline value revived based on our average deal size, so that the financial return of using the tool is immediately obvious.
13. As an agency sales rep, I want the generated copy to be strictly between 50 and 110 words, so that mobile open-to-reply conversion rates remain high.
14. As an agency owner, I want the system to avoid spammy hype words (like "revolutionary", "game-changing", "guaranteed"), so that our agency sounds grounded and senior.
15. As an agency owner, I want to save our agency profile (niche, case studies, founder name, calendly link) once, so that I do not need to re-enter it for future batches.

## Implementation Decisions

### 1. Seams and Boundaries
- **Single Core Seam (`ReactivationEngine`)**: The entire domain capability is contained behind a single interface function:
  ```typescript
  interface ReactivationEngine {
    generateReactivationBatch(
      leads: LeadInput[],
      agencyProfile: AgencyProfile,
      strategyConfig: StrategyConfig
    ): Promise<ReactivationBatchResult>;
  }
  ```
  All testing, whether unit or end-to-end integration, will exercise this top-level seam.

### 2. Data Models
- **`LeadInput`**: `id`, `name`, `email`, `company`, `role`, `lastContactDate`, `pastDiscussionNotes`, `previousDealValue` (optional).
- **`AgencyProfile`**: `agencyName`, `niche` (e.g. "Shopify CRO", "B2B SaaS Web Design"), `caseStudySnippet`, `founderOrRepName`, `calendarLink`.
- **`StrategyConfig`**: `angle` (`case_study` | `quick_question` | `low_risk_pilot` | `quarterly_reconnect`), `maxWords` (default 90), `includeLinkedInDraft` (boolean).
- **`ReactivationOutput`**: `leadId`, `subjectLines` (2 variations), `emailBody`, `linkedInDm` (optional), `confidenceScore`, `flaggedRisk` (if objection cannot be resolved safely).

### 3. Architecture & LLM Orchestration
- **Prompt Architecture**: Uses structured JSON output with strong schema validation (Zod/JSON Schema).
- **Domain Guardrails**: Strict temperature control and anti-hallucination constraints: LLM is barred from inventing metrics not present in the `AgencyProfile` case study.
- **Delivery Strategy (V1)**: 
  - Pure clientside/serverless web interface with local file handling.
  - CSV in → AI batch enrichment → Interactive preview/edit table → CSV/Clipboard out.
  - No complex CRM OAuth requirements for V1; frictionless CSV onboarding eliminates setup barriers.

## Testing Decisions

- **Seam-Centric Testing**: All tests evaluate `ReactivationEngine` directly with deterministic fixture data and mocked LLM responses where appropriate.
- **Behavioral Assertions**:
  - Validates that every generated email incorporates the lead's prior context without exceeding word length constraints.
  - Validates that spam/hype words are filtered or absent.
  - Validates graceful handling of malformed or sparse lead records (e.g. missing notes or missing company names).
  - Validates output conformity to the `ReactivationOutput` schema.

## Out of Scope

- Direct two-way bidirectional CRM sync (HubSpot, Salesforce, Pipedrive API sync) for V1.
- Automated email sending via SMTP/OAuth in V1 (manual 1-click export/copy prevents spam penalties and keeps compliance overhead at zero).
- Inbound reply categorization and automatic calendar booking in V1.
- Phone/Voice AI calling agents.

## Further Notes

- **Initial Distribution Hook**: "Free 10-Lead Revival Audit" — agency founders can submit 10 stalled contacts and receive customized reactivation messages within hours, converting them into paying users once replies arrive.
- **Target Pricing**: \$99/month for up to 250 reactivations/month, or \$199/month for up to 1,000 reactivations/month.
