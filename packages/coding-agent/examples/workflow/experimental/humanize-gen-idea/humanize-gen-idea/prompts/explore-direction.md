Explore one Humanize gen-idea direction within the current repository.

Direction index: {{directionIndex}}

All candidate directions:

```json
{{jsonStringify directions}}
```

Original idea input:

```text
{{ideaInput.body}}
```

Use only the direction at 1-based index {{directionIndex}}. If that index is greater than the requested direction count, return the degraded sentinel below without broad exploration.

Read-only. Do not write files. Do not implement.

Gather OBJECTIVE EVIDENCE:
- Specific repo paths with existing patterns worth extending.
- Prior art or precedent in the codebase or adjacent tooling.
- Measurable considerations where discoverable from reading code.

No concrete evidence for this direction? Put exactly `exploratory, no concrete precedent` once under OBJECTIVE_EVIDENCE and stop exploring further.

Return exactly these Markdown fields:

APPROACH_SUMMARY:
Concrete design description: what to build, core mechanism, affected components.

OBJECTIVE_EVIDENCE:
- repo path or `exploratory, no concrete precedent`

KNOWN_RISKS:
- short risk

CONFIDENCE:
high | medium | low
