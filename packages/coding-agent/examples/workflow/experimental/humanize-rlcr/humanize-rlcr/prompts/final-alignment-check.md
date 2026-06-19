Perform the final alignment check.

Current durable Humanize state:

```json
{{jsonStringify humanize}}
```

Verify that the accepted implementation still matches the original goal,
acceptance criteria, and recorded plan evolution. Check that blocking findings
are closed, queued/advisory findings are intentionally non-blocking, and the
round ledger does not show unresolved stagnation.

Return `rework` if the final diff contains unexplained broad formatting,
style/import/order churn, generated-file churn, unrelated cleanup, or files
outside the accepted task surface. A large mechanical diff cannot be accepted as
long-running evidence unless that mechanical migration was the explicit task.

Return `finish` only when the workflow should finalize.

Return `rework` when final alignment is not satisfied and the workflow should
route back through the fix/review loop. Explain whether implementation,
code-review fix, design adjudication, or human steering is needed.

Put exactly one control token on the final non-empty line: `finish` or
`rework`.
