Consolidate the three documentation audits into one repair plan.

Task:

{{jsonStringify task}}

Bounded audit digest, including the inventory summary and lane findings:

{{jsonStringify auditDigest}}

Deduplicate findings, rank by user impact, and select the smallest coherent
documentation repair that can be validated by the task-declared commands.
Return changed-file targets, acceptance criteria, and rollback notes.

Do not edit files in this node.
