const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
const task = state.task && typeof state.task === "object" ? state.task : {};
const regression = state.regression && typeof state.regression === "object" ? state.regression : {};

if (regression.status !== "pass") {
	throw new Error("cannot archive bug triage flow before task-declared validation passes");
}

const changedFiles = await gitDiffHeadChangedFiles();
const projectChangedFiles = changedFiles.filter((file) => !file.startsWith("workflow-output/") && file !== "task.md");
if (projectChangedFiles.length === 0 && !allowsNoCodeResolution(task)) {
	throw new Error(
		"cannot archive bug triage flow without project changes; add `No-Code Resolution: allowed` to task.md only for evidence-only investigations",
	);
}

const archivePath = "workflow-output/bugfix-archive.md";
const taskText = await readOptionalText("task.md");
const rollbackText = await readOptionalText("workflow-output/bugfix-rollback.md");
const reproductionText = await readOptionalText("workflow-output/reproduction.md");
const regressionText = await readOptionalText("workflow-output/regression.md");

await Bun.write(
	archivePath,
	[
		"# Bug Triage Repro Fix Archive",
		"",
		"## Task",
		"",
		boundedLines(taskText, 120),
		"",
		"## Reproduction",
		"",
		boundedLines(reproductionText, 160),
		"",
		"## Regression",
		"",
		boundedLines(regressionText, 160),
		"",
		"## Project Changes",
		"",
		projectChangedFiles.length > 0 ? projectChangedFiles.map((file) => `- ${file}`).join("\n") : "No project changes.",
		"",
		"## Rollback",
		"",
		rollbackText.trim() ? boundedLines(rollbackText, 120) : "No rollback notes were present.",
		"",
	].join("\n"),
);

return {
	summary: "archived bug triage repro/fix evidence",
	statePatch: [
		{
			op: "set",
			path: "/archive",
			value: {
				file: archivePath,
				validation: "pass",
				projectChangedFiles,
			},
		},
	],
};

async function gitDiffHeadChangedFiles() {
	const proc = Bun.spawn(["git", "diff", "HEAD", "--name-only"], {
		cwd: process.cwd(),
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (exitCode !== 0) throw new Error(`git diff HEAD failed: ${stderr.trim() || stdout.trim()}`);
	return stdout
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter(Boolean);
}

function allowsNoCodeResolution(task) {
	const taskText = typeof task.taskText === "string" ? task.taskText : typeof task.text === "string" ? task.text : "";
	return /\bNo-Code Resolution\s*:\s*allowed\b/iu.test(taskText);
}

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
