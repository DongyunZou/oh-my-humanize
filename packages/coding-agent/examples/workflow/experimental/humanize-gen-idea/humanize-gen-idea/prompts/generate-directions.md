Generate exactly {{jsonStringify ideaInput.n}} orthogonal exploration directions for this Humanize idea.

Original idea input:

```text
{{ideaInput.body}}
```

Workflow contract:
- Draft-only. Do not edit repository files.
- Ground directions in this repository, not generic brainstorming.
- First inspect high-signal context: README, project instructions, top-level package layout, and nearby implementation patterns.
- Directions must be genuinely different. Do not restate the same feature with synonyms.
- If a direction is "do it better" without a distinct angle, replace it.

Return only JSON matching this shape:

```json
{
  "summary": "generated N orthogonal directions",
  "directions": [
    { "name": "2-5 word label", "rationale": "single sentence distinction" }
  ]
}
```

Rules:
- `directions.length` MUST equal {{jsonStringify ideaInput.n}}.
- Names MUST be short, stable labels.
- Rationales MUST explain distinctness versus sibling directions.
