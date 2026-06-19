# Examples

Example code for the OMH coding-agent SDK, hooks, custom tools, and workflow
artifacts.

## Directories

### [sdk/](sdk/)
Programmatic usage via `createAgentSession()`. Shows how to customize models, prompts, tools, hooks, and session management.

### [hooks/](hooks/)
Example hooks for intercepting tool calls, adding safety gates, and integrating with external systems.

### [custom-tools/](custom-tools/)
Example custom tools that extend the agent's capabilities.

### [workflow/](workflow/)
Workflow artifacts are separated by validation tier.

The top level is reserved for formally promoted practical workflows. A workflow
may be added there only after it is generic, useful on real projects, and backed
by at least 100 cumulative hours of successful Project x Flow x Task validation
evidence.

### [workflow/experimental/](workflow/experimental/)
Practical workflows that are useful enough to share as examples, but have not
earned formal promotion. They should still be treated as experimental
`OMHFLOW_DIR` artifacts, not built-in workflows with stability guarantees.

### [workflow/demo/](workflow/demo/)
Workflow-language demos and fixtures. These artifacts may be executable, but
they are teaching or seed-bound examples rather than practical promoted flows.

## Documentation

- [SDK Reference](sdk/README.md)
- [Hooks Documentation](../docs/hooks.md)
- [Custom Tools Documentation](../docs/custom-tools.md)
- [Skills Documentation](../docs/skills.md)
