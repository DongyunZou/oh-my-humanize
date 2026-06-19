const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
const validation = state.validation && typeof state.validation === "object" ? state.validation : {};

if (validation.status !== "pass") {
	throw new Error("cannot archive documentation audit flow before task-declared validation passes");
}

const archivePath = "workflow-output/documentation-audit-archive.md";
const taskText = await readOptionalText("task.md");
const validationText = await readOptionalText("workflow-output/documentation-validation.md");
const rollbackText = await readOptionalText("workflow-output/documentation-rollback.md");

await Bun.write(
	archivePath,
	[
		"# Documentation Audit Archive",
		"",
		"## Task",
		"",
		boundedLines(taskText, 120),
		"",
		"## Validation",
		"",
		boundedLines(validationText, 160),
		"",
		"## Rollback",
		"",
		rollbackText.trim() ? boundedLines(rollbackText, 120) : "No rollback notes were present.",
		"",
	].join("\n"),
);

return {
	summary: "archived documentation audit evidence",
	statePatch: [
		{
			op: "set",
			path: "/archive",
			value: {
				file: archivePath,
				validation: "pass",
			},
		},
	],
};

async function readOptionalText(filePath) {
	try {
		return await Bun.file(filePath).text();
	} catch {
		return "";
	}
}

function boundedLines(text, limit) {
	const lines = text.split(/\r?\n/u);
	const kept = lines.slice(0, limit);
	if (lines.length > limit) kept.push(`[truncated ${lines.length - limit} additional lines]`);
	return kept.join("\n");
}
