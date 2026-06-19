# Workflow Examples

This directory separates workflow artifacts by validation tier.

## Promoted Workflows

Formally promoted practical workflows live directly under this directory as
`<flow>/<flow>.omhflow` plus the matching `<flow>/<flow>/` resource directory.
Only workflows with at least 100 cumulative successful hours across real
Project x Flow x Task contexts should be placed at this tier.

There are currently no formally promoted workflows.

## Experimental

[`experimental/`](experimental/) contains practical workflows that are useful
enough to inspect or run by explicit path, but have not earned the promoted
tier. Treat them as experimental `OMHFLOW_DIR` artifacts without built-in
stability guarantees.

## Demos

[`demo/`](demo/) contains workflow-language demos, teaching fixtures, and
seed-bound examples. These are not practical promoted flows. Some demos are
kept specifically to illustrate language shapes or rejected production
patterns, so they are not required to pass the same production freeze checks as
promoted or experimental workflows.
