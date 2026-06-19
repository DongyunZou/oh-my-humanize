Draft the KDA execution plan from the contract and workspace context.

Contract:
{{taskContract}}

Workspace:
{{workspace}}

The plan must be practical for the current project. Write the full plan to
`workflow-output/kda-execution-plan.md`, then include the same full plan in your
final response so downstream state does not collapse into a one-line summary.
Include:

- objective restatement and acceptance criteria;
- candidate list with one primary candidate and one fallback candidate;
- files/modules each candidate may touch;
- validation and comparison evidence required before promotion;
- Humanize subflow scope: what the nested build/review loop should implement,
  test, and review;
- stop/rollback criteria if a candidate is negative or unsafe;
- operator checkpoints where human steering may be needed.

Do not create a fixed documentation artifact unless the task contract asks for
documentation. The output should be the shared plan consumed by the subflow and
candidate validation steps.
