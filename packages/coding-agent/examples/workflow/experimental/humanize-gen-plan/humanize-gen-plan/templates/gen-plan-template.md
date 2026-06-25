# <Plan Title>

## Goal Description
<Clear, direct description of what needs to be accomplished>

## Acceptance Criteria

Following TDD philosophy, each criterion includes positive and negative tests for deterministic verification.

- AC-1: <First criterion>
  - Positive Tests (expected to PASS):
    - <Test case that should succeed when criterion is met>
  - Negative Tests (expected to FAIL):
    - <Test case that should fail/be rejected when working correctly>

## Path Boundaries

### Upper Bound (Maximum Acceptable Scope)
<Maximum acceptable implementation>

### Lower Bound (Minimum Acceptable Scope)
<Minimum acceptable implementation>

### Allowed Choices
- Can use: <allowed approaches>
- Cannot use: <prohibited approaches>

## Feasibility Hints and Suggestions

### Conceptual Approach
<One possible implementation path>

### Relevant References
- <path> - <description>

## Dependencies and Sequence

### Milestones
1. <Milestone>: <Description>

## Task Breakdown

Each task must include exactly one routing tag: `coding` or `analyze`.

| Task ID | Description | Target AC | Tag (`coding`/`analyze`) | Depends On |
|---------|-------------|-----------|----------------------------|------------|
| task1 | <...> | AC-1 | coding | - |

## Claude-Codex Deliberation

### Agreements
- <Point both sides agree on>

### Resolved Disagreements
- <Topic>: <resolution>

### Convergence Status
- Final Status: `converged` or `partially_converged`

## Pending User Decisions

- DEC-1: <Decision topic>
  - Claude Position: <...>
  - Codex Position: <...>
  - Tradeoff Summary: <...>
  - Decision Status: `PENDING` or `<decision>`

## Implementation Notes

### Code Style Requirements
- Implementation code and comments must NOT contain plan-specific terminology such as "AC-", "Milestone", "Step", "Phase", or similar workflow markers.
- Use descriptive, domain-appropriate naming in code instead.
