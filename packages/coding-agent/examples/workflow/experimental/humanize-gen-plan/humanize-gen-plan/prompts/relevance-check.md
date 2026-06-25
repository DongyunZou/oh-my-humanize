Check whether this Humanize gen-plan draft is relevant to the current repository.

Draft input path: {{request.inputPath}}

```text
{{request.draft}}
```

Decision rule:
- Return `RELEVANT` unless the draft is clearly unrelated to this repository.
- Do not over-invest. A rough feature/design idea that could plausibly affect this repo is relevant.
- `NOT_RELEVANT` is for mismatched domains, e.g. cake recipe in a coding-agent repo.

Inspect high-signal repository context: README, package metadata, top-level layout, and files named in the draft.

Write a brief reason, then put exactly one control token on the final non-empty line: `RELEVANT` or `NOT_RELEVANT`.
