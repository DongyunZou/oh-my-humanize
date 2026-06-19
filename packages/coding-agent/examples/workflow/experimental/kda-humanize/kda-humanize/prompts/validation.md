Validate the candidate against the KDA task contract and plan using this
bounded validation context.

```json
{{jsonStringify validationContext}}
```

The context is intentionally compact. Treat listed artifact paths as the raw
evidence locations. Do not require raw transcripts or full validation output to
be inlined into this prompt; ask for `revise` only when the compact context
shows that required evidence is absent, contradictory, stale, or too narrow.

Decide whether this candidate is ready to be promoted into the project.

Return `promote` only when:

- the candidate directly addresses the contract;
- the candidate uses or explicitly reconciles the nested Humanize handoff;
- the declared validation, benchmark, or evidence requirement passed, or the
  contract explicitly allows manual evidence;
- risks and rollback notes are clear;
- no higher-priority candidate issue remains unresolved.

Return `revise` when evidence is missing, validation failed, the candidate is
off-scope, the comparison is inconclusive, or another candidate round is needed.

Write a short review first, then put exactly one token on the final non-empty
line: `revise` or `promote`.
