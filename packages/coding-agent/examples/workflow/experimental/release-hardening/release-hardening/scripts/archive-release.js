const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
const checks = state.checks && typeof state.checks === "object" ? state.checks : {};

if (checks.status !== "pass") {
	throw new Error("cannot archive release hardening flow before declared checks pass");
}

const archivePath = "workflow-output/release-hardening-archive.md";
const taskText = await readOptionalText("task.md");
const checksText = await readOptionalText("workflow-output/release-checks.md");
const rollbackText = await readOptionalText("workflow-output/release-rollback.md");

await Bun.write(
	archivePath,
	[
		"# Release Hardening Archive",
		"",
		"## Task",
		"",
		boundedLines(taskText, 120),
		"",
		"## Checks",
		"",
		boundedLines(checksText, 160),
		"",
		"## Rollback",
		"",
		rollbackText.trim() ? boundedLines(rollbackText, 120) : "No rollback notes were present.",
		"",
	].join("\n"),
);

return {
	summary: "archived release hardening evidence",
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
