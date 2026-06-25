# Humanize Gen Idea

Experimental workflow equivalent of PolyArch Humanize `/humanize:gen-idea`.

TUI shortcut:

```text
/humanize-gen-idea add repo-grounded long-context compression
```

With no inline text, the workflow starts with a human prompt and asks for the idea:

```text
/humanize-gen-idea
```

Input priority from project root:

1. `.humanize/gen-idea-request.json`
2. `idea.md`
3. `task.md`

JSON request shape:

```json
{
  "body": "loose idea text",
  "n": 6,
  "outputPath": ".humanize/ideas/my-idea.md",
  "slug": "my-idea"
}
```

The flow generates repo-grounded directions, explores six lanes in parallel, selects a primary direction, and writes a draft suitable for `humanize-gen-plan`.
