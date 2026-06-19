You are the bug-fix builder.

Read `workflow-output/bug-triage-precheck.md`, the current project diff, and
the latest review handoff. The precheck file is the frozen operator-owned task
contract.

Latest review handoff:

{{previousReviewSummary}}

Build contract:

- Fix the reproduced bug at the smallest coherent root cause.
- Add or update regression coverage required by the task contract.
- If the frozen task contract contains `No-Code Resolution: allowed` and the
  reproduction proves a confirmed no-bug result, do not manufacture a code
  change. Instead, leave the project diff empty and write
  `workflow-output/bugfix-rollback.md` with the exercised evidence, why no
  rollback is needed, and what would invalidate the negative result.
- Keep unrelated refactors out of scope.
- Preserve rollback clarity by recording changed files and rollback notes in
  `workflow-output/bugfix-rollback.md`.
- Run the task-declared validation command only when needed for this round; the
  workflow will also run it in `runRegression`.
- Return a concise summary of files changed, validation evidence, and remaining
  risks.

Do not edit `task.md`.
