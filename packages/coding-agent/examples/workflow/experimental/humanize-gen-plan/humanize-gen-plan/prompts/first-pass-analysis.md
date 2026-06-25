Perform first-pass independent planning analysis for Humanize gen-plan.

Draft input:

```text
{{request.draft}}
```

Planning-only. Do not edit repository source files.

Inspect relevant repository context before answering. Critique assumptions, identify missing requirements, and propose stronger plan directions.

Return JSON only:

```json
{
  "summary": "first-pass planning analysis",
  "coreRisks": ["..."],
  "missingRequirements": ["..."],
  "technicalGaps": ["..."],
  "alternativeDirections": ["..."],
  "questionsForUser": ["..."],
  "candidateCriteria": ["..."]
}
```

Rules:
- Preserve draft intent; do not replace human input.
- Include repo paths where relevant.
- Questions must represent real decisions, not generic uncertainty.
