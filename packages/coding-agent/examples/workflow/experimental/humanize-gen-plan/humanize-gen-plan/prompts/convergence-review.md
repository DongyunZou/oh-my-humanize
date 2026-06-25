Review the current Humanize gen-plan candidate for convergence.

Candidate:

```json
{{jsonStringify candidate}}
```

First-pass analysis:

```json
{{jsonStringify codexAnalysis}}
```

Check:
- All draft content preserved.
- Acceptance criteria use AC-X and include positive and negative tests.
- Path boundaries are affirmative and not over-prescriptive.
- Task breakdown exists; every task has exactly `coding` or `analyze`.
- Relevant repo references are concrete and not fabricated.
- Pending user decisions are explicit.
- Plan is coherent enough for RLCR implementation.

Write review findings with sections:
- AGREE
- DISAGREE
- REQUIRED_CHANGES
- OPTIONAL_IMPROVEMENTS
- UNRESOLVED

Final non-empty line MUST be exactly:
- `CONVERGED` if no required changes remain.
- `REVISE` if candidate needs another revision.
