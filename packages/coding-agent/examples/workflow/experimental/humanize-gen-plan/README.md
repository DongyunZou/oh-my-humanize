# Humanize Gen Plan

Experimental workflow equivalent of PolyArch Humanize `/humanize:gen-plan`.

TUI shortcut:

```text
/humanize-gen-plan build a workflow import dashboard with acceptance criteria
```

With no inline text, the workflow starts with a human prompt and asks for the draft:

```text
/humanize-gen-plan
```

Input priority from project root:

1. `.humanize/gen-plan-request.json`
2. `draft.md`
3. `idea.md`

JSON request shape:

```json
{
  "draft": "repo-grounded draft markdown",
  "inputPath": "draft.md",
  "outputPath": "docs/plan.md",
  "mode": "discussion",
  "autoStartRlcrIfConverged": false
}
```

The flow checks repository relevance, runs independent first-pass analysis, iterates candidate plan review until convergence, and writes a `gen-plan`-schema Markdown plan for RLCR.
