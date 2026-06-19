const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
const validation = state.validation && typeof state.validation === "object" ? state.validation : {};

if (validation.status !== "pass") {
	throw new Error("cannot archive refactor migration flow before task-declared validation passes");
}

const archivePath = "workflow-output/refactor-migration-archive.md";
const taskText = await readOptionalText("task.md");
const validationText = await readOptionalText("workflow-output/refactor-migration-validation.md");
const rollbackText = await readOptionalText("workflow-output/refactor-migration-rollback.md");

await Bun.write(
	archivePath,
	[
		"# Refactor Migration Archive",
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
	summary: "archived refactor migration evidence",
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
