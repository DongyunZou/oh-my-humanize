const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
const suite = state.suite && typeof state.suite === "object" ? state.suite : {};

if (suite.status !== "pass") {
	throw new Error("cannot archive test hardening flow before task-declared validation passes");
}

const archivePath = "workflow-output/test-hardening-archive.md";
const taskText = await readOptionalText("task.md");
const suiteText = await readOptionalText("workflow-output/test-suite.md");
const repairEvidenceText = await readOptionalText("workflow-output/test-hardening-repair-evidence.md");
const rollbackText = await readOptionalText("workflow-output/test-hardening-rollback.md");

await Bun.write(
	archivePath,
	[
		"# Test Generation Hardening Archive",
		"",
		"## Task",
		"",
		boundedLines(taskText, 120),
		"",
		"## Suite Evidence",
		"",
		boundedLines(suiteText, 160),
		"",
		"## Repair Evidence",
		"",
		repairEvidenceText.trim() ? boundedLines(repairEvidenceText, 160) : "No repair evidence was present.",
		"",
		"## Rollback",
		"",
		rollbackText.trim() ? boundedLines(rollbackText, 120) : "No rollback notes were present.",
		"",
	].join("\n"),
);

return {
	summary: "archived test hardening evidence",
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
