const archivePath = "workflow-output/final-agent-loop-archive.md";
const taskText = await readRequiredTaskText();
const progressText = await readOptionalText("progress.md");
const verifyCommand = requiredTaskValidationCommand(taskText);
const verification = await runTaskVerification(verifyCommand);
const archive = [
	"# Agent Build/Review Loop Archive",
	"",
	"## Task",
	"",
	boundedLines(taskText, 160),
	"",
	"## Progress",
	"",
	progressText.trim() ? boundedLines(progressText, 160) : "No progress.md was present.",
	"",
	"## Final Verification",
	"",
	"```text",
	verification.output,
	"```",
	"",
	"## Workspace Snapshot",
	"",
	"Workspace file listing is intentionally omitted from this portable flow script.",
	"Reviewers should inspect the current project diff and task contract directly.",
	"",
].join("\n");

await Bun.write(archivePath, archive);

if (verification.status !== "pass") {
	throw new Error("final task-declared verification did not pass");
}

return {
	summary: "archived completed agent build/review loop",
	statePatch: [
		{
			op: "set",
			path: "/archive",
			value: {
				file: archivePath,
				verification: "pass",
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

function requiredTaskValidationCommand(taskText) {
	const lines = taskText.split(/\r?\n/u);
	for (let index = 0; index < lines.length; index += 1) {
		const match = /^\s*(?:verify|verification command|validation command)\s*:\s*(.*)\s*$/iu.exec(lines[index] ?? "");
		if (!match) continue;
		const inlineCommand = match[1]?.trim();
		if (inlineCommand) return inlineCommand;
		const followingCommand = firstFollowingCommandLine(lines, index + 1);
		if (followingCommand) return followingCommand;
	}
	throw new Error("agent-build-review-loop task.md must declare a Validation Command");
}

function firstFollowingCommandLine(lines, startIndex) {
	for (const line of lines.slice(startIndex)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("```")) continue;
		if (isTaskSectionHeading(trimmed)) return "";
		return trimmed;
	}
	return "";
}

function isTaskSectionHeading(line) {
	return line.startsWith("#") || /^[A-Z][A-Za-z /-]{0,80}:\s*$/u.test(line);
}

async function runTaskVerification(command) {
	const proc = Bun.spawn(["sh", "-c", command], {
		cwd: process.cwd(),
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	const output = [stdout, stderr]
		.filter(text => text.trim().length > 0)
		.join("\n")
		.trim();
	return {
		status: exitCode === 0 ? "pass" : "fail",
		output: output || `verification command exited with code ${exitCode}`,
	};
}

function boundedLines(text, limit) {
	const lines = text.split(/\r?\n/u);
	const kept = lines.slice(0, limit);
	if (lines.length > limit) kept.push(`[truncated ${lines.length - limit} additional lines]`);
	return kept.join("\n");
}

async function readRequiredTaskText() {
	const taskText = await readOptionalText("task.md");
	if (!taskText.trim()) {
		throw new Error("agent-build-review-loop requires a task.md contract in the project root");
	}
	return taskText;
}
