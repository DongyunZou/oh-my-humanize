Implement the next nested Humanize round for this KDA plan.

{{plan}}

Work in the current project directory and keep the round bounded. Each round
must advance one acceptance criterion, validation artifact, or candidate-risk
reduction. Before yielding, report:

- diff discipline: do not run whole-repository formatters, style rewriters,
  import organizers, or mechanical migrations unless the KDA plan explicitly
  asks for that project-wide change. Format only intentionally changed files in
  the existing repository style. If a formatter touches unrelated files, stop,
  revert unrelated churn, and report the risk.
- changed files and rationale;
- validation or benchmark command run, with result;
- acceptance evidence gained;
- risks, blockers, and rollback notes;
- what the next review should check.

Do not claim the KDA candidate is promotable unless validation evidence supports
that claim.
