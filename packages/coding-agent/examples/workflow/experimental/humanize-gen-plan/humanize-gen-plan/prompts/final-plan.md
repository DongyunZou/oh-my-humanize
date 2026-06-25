Generate the final Humanize implementation plan.

Draft input:

```text
{{request.draft}}
```

First-pass analysis:

```json
{{jsonStringify codexAnalysis}}
```

Candidate:

```json
{{jsonStringify candidate}}
```

Convergence review:

```text
{{convergenceReview}}
```

Return JSON only: `{ "summary": "final plan generated", "plan": "# ..." }`.

The `plan` Markdown MUST use exactly this top-level schema:

# <Plan Title>

## Goal Description

## Acceptance Criteria

## Path Boundaries

### Upper Bound (Maximum Acceptable Scope)

### Lower Bound (Minimum Acceptable Scope)

### Allowed Choices

## Feasibility Hints and Suggestions

### Conceptual Approach

### Relevant References

## Dependencies and Sequence

### Milestones

## Task Breakdown

## Claude-Codex Deliberation

### Agreements

### Resolved Disagreements

### Convergence Status

## Pending User Decisions

## Implementation Notes

### Code Style Requirements

Rules:
- Incorporate every draft detail; final plan must be a superset of draft + clarified analysis.
- Acceptance criteria MUST use AC-X or AC-X.Y and include positive and negative tests.
- No time estimates. Use Milestone, Phase, Step, Section only.
- Reference code by path only, no line numbers.
- Every task row MUST use tag `coding` or `analyze`.
- Include code style note: implementation code/comments must not contain plan-specific markers like AC-, Milestone, Step, Phase.
- Include pending decisions; use `None.` only if there are no unresolved decisions.
