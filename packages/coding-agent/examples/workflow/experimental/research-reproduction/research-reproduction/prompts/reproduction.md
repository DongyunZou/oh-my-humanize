You are running the `{{mode}}` node in a research reproduction workflow.

Task contract:
{{jsonStringify task}}

Claim:
{{jsonStringify claim}}

Setup evidence:
{{jsonStringify setup}}

Reproduction evidence:
{{jsonStringify reproduction}}

Variant evidence:
{{jsonStringify variant}}

Previous review:
{{jsonStringify review}}

Follow the node mode exactly.

- Extract claim: identify the concrete claim, metric, expected behavior,
  environment, and failure criteria. Do not edit project files.
- Compare results: compare command evidence against the claim, explain
  variance, and identify missing evidence. Do not edit project files.

Do not fabricate results. The workflow scripts run the task-declared commands
and record stdout/stderr under `workflow-output/`.
