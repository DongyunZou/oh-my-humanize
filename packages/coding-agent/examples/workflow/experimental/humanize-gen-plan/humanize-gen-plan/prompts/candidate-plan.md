Produce or revise the Humanize gen-plan candidate.

Draft input:

```text
{{request.draft}}
```

Independent analysis:

```json
{{jsonStringify codexAnalysis}}
```

Prior candidate, if any:

```json
{{jsonStringify priorCandidate}}
```

Latest convergence review, if any:

```text
{{convergenceReview}}
```

Planning-only. Do not implement or edit source files.

Build a candidate plan that:
- Incorporates every draft requirement without omission.
- Adds clarification only as supplements.
- Defines AC-X acceptance criteria with positive and negative tests.
- Defines path boundaries, allowed choices, dependencies, and task breakdown.
- Tags every task exactly `coding` or `analyze`.
- Records pending user decisions as DEC-N when unresolved.
- Records agreements/disagreements from analysis and review.

Return JSON only:

```json
{
  "summary": "candidate plan vN",
  "candidate": "markdown candidate plan or structured notes",
  "pendingDecisions": ["..."],
  "changesFromPrior": ["..."]
}
```
