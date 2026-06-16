const progressPath = "progress.md";
const snapshotPath = "workflow-output/initial-loop-snapshot.md";

if (!(await fileExists(progressPath))) {
	await Bun.write(progressPath, "# Agent Build/Review Progress\n\n");
}

const taskText = await readRequiredTaskText();
const verifyCommand = requiredTaskValidationCommand(taskText);
const verification = await runTaskVerification(verifyCommand);
const snapshot = [
	"# Initial Loop Snapshot",
	"",
	"## Task",
	"",
	boundedLines(taskText, 120),
	"",
	"## Workspace Snapshot",
	"",
	"Workspace file listing is intentionally omitted from this portable flow script.",
	"Agents and reviewers should inspect the current project diff and task contract directly.",
	"",
	"## Initial Verification Result",
	"",
	"```text",
	verification.output,
	"```",
	"",
].join("\n");

await Bun.write(snapshotPath, snapshot);

return {
	summary: `initialized agent build/review loop with task-declared verification (${verification.status})`,
	statePatch: [
		{
			op: "set",
			path: "/progress",
			value: {
				file: progressPath,
				snapshot: snapshotPath,
				verification: verification.status,
			},
		},
	],
};

async function fileExists(filePath) {
	try {
		await Bun.file(filePath).text();
		return true;
	} catch {
		return false;
	}
}

async function readOptionalText(filePath) {
	try {
		return await Bun.file(filePath).text();
	} catch {
		return "";
	}
}

async function readRequiredTaskText() {
	const taskText = await readOptionalText("task.md");
	if (!taskText.trim()) {
		throw new Error("agent-build-review-loop requires a task.md contract in the project root");
	}
	return taskText;
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
