You are the test repair builder.

The reviewer requested another bounded test-hardening round:

{{reviewSummary}}

Read `workflow-output/test-hardening-precheck.md` first and treat its frozen
task section as the operator-owned contract. Repair only the issues named by
the reviewer. Preserve the existing task scope, project test style, and
rollback notes in `workflow-output/test-hardening-rollback.md`.

Update `workflow-output/test-hardening-repair-evidence.md` with the specific
review issue you addressed, the test files changed, the coverage gap now
covered, and any residual risk. Keep this artifact concise and cumulative
across repair rounds.

Do not edit `workflow-output/test-suite.md`; that file is owned by the
validation node and may be overwritten after your node completes.

Return changed files, validation evidence if you ran it, and any residual risk.

Do not edit `task.md`.
