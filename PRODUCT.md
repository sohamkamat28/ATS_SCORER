# ResumeLens

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

ResumeLens analyzes a resume, optionally compares it with a job description, and presents an ATS readiness report with concrete recommendations. A successful workflow moves from account access to upload, analysis, saved history, and PDF export.

## Operating Context

The production Next.js interface lives in `web/` and is hosted on Vercel. A FastAPI service on Render parses and scores resumes. Supabase provides email/password and Google authentication plus saved analysis history. The original Streamlit interface remains a separate local interface.

## Capabilities and Constraints

- The web upload accepts PDF and DOCX files, up to 5 MB. Legacy DOC files must be converted first.
- A job description is optional.
- Analysis reports include a score, five score components, recommendations, skill evidence, strengths, and role matching when a job description is supplied.
- Signed-in users can view saved reports, remove history entries, and export reports as PDFs.
- Email signup requires inbox confirmation. Existing authentication, validation, service timeouts, and error recovery must remain intact during UI work.
- Scores describe the application's analysis. They do not guarantee interviews, employment, or compatibility with every recruiting system.

## Brand Commitments

The product name is ResumeLens. The user explicitly chose the supplied Linear style reference and asked the redesign to stick to it. `DESIGN-REFERENCE.md` preserves that source. The user authorized parallel agent work to implement the redesign quickly.

## Evidence on Hand

The existing production workflow has been verified with a synthetic resume: Google sign-in, upload, scored report, saved history, and PDF export. Illustrative report values in the landing page must be labeled as an example. No testimonials, customer logos, usage figures, or performance claims are supplied.

## Product Principles

- Keep the analysis workflow understandable and operable.
- Preserve truthful score explanations and the full report detail.
- Make errors actionable and allow recovery.
- Keep account and file handling behavior consistent across screen sizes.
