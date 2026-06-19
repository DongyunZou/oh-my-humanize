Fix blocking issues reported by the KDA code-review gate while preserving the
KDA plan scope.

Plan:
{{plan}}

Blocking review findings:
{{reviewFindings}}

Address only issues that block the candidate's acceptance, validation, or safe
promotion. Keep advisory improvements recorded without turning them into scope
creep. After the fix, summarize changed files, validation evidence, and any
issue intentionally deferred with a reason.

If the blocking issue is diff churn or scope drift, revert unrelated project
changes and keep only acceptance-relevant edits. Do not run a whole-repository
formatter or mechanical cleanup to normalize a broad diff after the fact.
