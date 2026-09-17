# Social Media Background Check for Job Seekers: Feasibility Research

## 1. API Availability & Terms of Service Restrictions

A core requirement for a B2C "self-audit" tool is the ability to authenticate users via OAuth and scan their historical posts.

### LinkedIn
*   **OAuth & Post History:** The LinkedIn API allows users to authenticate, but it restricts data access strictly to managing LinkedIn Pages or Profiles for approved use cases (e.g., content scheduling, CRM). It does not provide an endpoint to pull a user's full post history for "auditing" purposes unless you are an approved official partner.
*   **API Terms:** LinkedIn's [User Agreement (Section 8.2)](https://www.linkedin.com/legal/user-agreement) strictly prohibits unauthorized automated scraping or scanning. Furthermore, the [API Terms of Use](https://developer.linkedin.com/legal/api-terms-of-use) restrict the use of data for unauthorized auditing. Automation is only permitted through official APIs for approved business use cases.

### Twitter / X
*   **OAuth & Post History:** X allows OAuth 2.0 authentication where users can grant `read` permissions to their post history. However, access to historical data is heavily restricted. The free tier offers minimal access; historical scanning requires costly Pro or Enterprise tiers.
*   **API Terms:** The [X Developer Agreement](https://developer.x.com/en/developer-terms/developer-agreement) prohibits unauthorized scraping and requires developers to respect the data lifecycle (e.g., deleting data when a user deletes a post). Scanning and auditing must be done strictly through official API tiers.

### Meta (Facebook & Instagram)
*   **OAuth & Post History:** While the Facebook Graph API offers a `user_posts` permission via OAuth, Meta heavily restricts access to user data. App review is required, and Meta generally does not approve apps whose primary function is mass data extraction of post histories for auditing outside of standard social management.
*   **API Terms:** Meta's [Platform Terms](https://developers.facebook.com/terms/) strictly regulate data usage. Specifically, using platform data to perform background checks, eligibility determinations, or to make employment decisions is prohibited. Even for a B2C "self-audit" tool, bulk downloading a user's history for algorithmic scanning might violate data minimization and permitted use policies.

### TikTok
*   **OAuth & Post History:** TikTok's Display API allows apps to read user videos if the user authorizes the connection via OAuth. However, TikTok has a rigorous manual app review process.
*   **API Terms:** According to the [TikTok Developer Terms](https://developers.tiktok.com/terms/api-terms-of-service/), developers cannot use unauthorized scraping. The focus is on compliance, and there is no specific "background check" API, though reading authorized user videos via the official Display API is permitted for approved apps.

## 2. Legal Compliance Requirements

### United States (FCRA & EEOC)
*   **FCRA Applicability:** The Fair Credit Reporting Act (FCRA) applies when a third-party Consumer Reporting Agency (CRA) compiles background information for employment purposes ([FTC Guidance on Background Checks](https://www.ftc.gov/business-guidance/resources/background-checks-what-employers-need-know)). If the B2C SaaS tool solely provides a report to the job seeker for self-auditing and does *not* provide the report to an employer, it may bypass strict FCRA requirements for employers (like Adverse Action notices). However, if the tool markets itself as generating "background checks," it risks falling under FCRA regulations if employers ever use the platform directly.
*   **Discrimination Risks:** Even for self-audits, the tool must be careful not to store or incorrectly flag protected class information (race, religion, age, disability), which are heavily protected under EEOC guidelines.

### Europe (GDPR)
*   **Lawful Basis & Consent:** Under [GDPR Article 6](https://gdpr-info.eu/art-6-gdpr/), processing personal data requires a lawful basis. For a B2C self-audit, this would be explicit user consent.
*   **Special Categories of Data:** Social media posts often reveal "special category" data (e.g., political opinions, sexual orientation, religious beliefs), which are strictly protected under [GDPR Article 9](https://gdpr-info.eu/art-9-gdpr/). The tool must have explicit consent to process this specific sensitive data, and data minimization principles mandate that the data should not be retained longer than necessary.

## 3. Existing Competitors

### B2C (Job Seeker Self-Audit)
*   **Glintcheck:** A platform that allows job seekers to run a professional-grade scan on their own social media profiles, highlighting what employers might flag and offering remediation steps.
*   **Reputation Management Tools:** General B2C tools like BrandYourself (now part of other privacy suites) historically offered features to scan and flag risky social media posts for individuals.

### B2B (Employer Background Checks)
*   **Fama:** An AI-based software solution used by employers to analyze publicly available social media and online content for behavioral risks while redacting protected class information.
*   **Checkr:** A major background check provider that integrates social media screening into its broader employment screening platform, designed for high-volume hiring.
*   **Ferretly:** An AI-driven platform offering fast turnaround social media screening with image/meme detection, focusing on risk mitigation for employers.
*   **HireRight & Sterling:** Enterprise-level global background check providers that offer comprehensive, FCRA-compliant social media screening services.

## Conclusion

Building a B2C social media self-audit tool faces significant technical headwinds due to restrictive API policies from major platforms (especially LinkedIn and Meta), which actively block or restrict the mass retrieval of historical user data needed for a thorough audit. Legally, while a purely B2C self-audit avoids the employer-facing FCRA requirements, GDPR imposes strict rules on processing the "special categories" of sensitive data inevitably found in social media histories. Competitors exist, but B2B tools currently dominate by analyzing publicly available data rather than relying on deep, API-level OAuth integrations for private post histories.
