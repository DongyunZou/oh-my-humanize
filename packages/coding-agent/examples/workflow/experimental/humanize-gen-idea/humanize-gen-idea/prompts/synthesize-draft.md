Synthesize the Humanize gen-idea exploration results into one repo-grounded idea draft.

Original idea input:

```text
{{ideaInput.body}}
```

Directions:

```json
{{jsonStringify directions}}
```

Exploration results:

### Direction 1

{{direction1}}

### Direction 2

{{direction2}}

### Direction 3

{{direction3}}

### Direction 4

{{direction4}}

### Direction 5

{{direction5}}

### Direction 6

{{direction6}}

Output contract:
- Pick one primary direction.
- Primary selection order: evidence density, fit with repo patterns, smaller implementation surface, confidence.
- Drop degraded direction outputs missing required fields.
- Keep at least two surviving proposals, otherwise return a clear failure summary.
- Preserve objective evidence; never fabricate repo paths.
- Use the exact Humanize idea draft schema below.
- Return JSON only: `{ "summary": "...", "draft": "# ..." }`.

Required draft schema:

```markdown
# <Title Case Title>

## Original Idea

<original idea verbatim>

## Primary Direction: <primary name>

### Rationale

<primary rationale>

### Approach Summary

<primary approach summary>

### Objective Evidence

- <evidence bullet>

### Known Risks

- <risk bullet>

## Alternative Directions Considered

### Alt-1: <name>
- Gist: <one-paragraph summary>
- Objective Evidence:
  - <evidence bullet>
- Why not primary: <tradeoff vs primary>

## Synthesis Notes

<one paragraph: alternative elements that could fold into primary>
```
