const task = workflowContext.state?.task;
const command = task?.validationCommand;
if (typeof command !== "string" || command.trim() === "") {
	throw new Error("test-generation-hardening requires /task.validationCommand before runTestSuite");
}

const result = await runShell(command);
const outputPath = "workflow-output/test-suite.md";
await Bun.write(outputPath, evidenceMarkdown(command, result));

return {
	summary: `ran task-declared validation command; result=${result.exitCode === 0 ? "pass" : "fail"}`,
	data: result,
	statePatch: [
		{
			op: "set",
			path: "/suite",
			value: {
				command,
				exitCode: result.exitCode,
				status: result.exitCode === 0 ? "pass" : "fail",
				outputPath,
			},
		},
	],
};

async function runShell(command) {
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
	return {
		exitCode,
		stdout: bounded(stdout),
		stderr: bounded(stderr),
	};
}

function evidenceMarkdown(command, result) {
	return [
		"# Test Suite Evidence",
		"",
		"## Command",
		"",
		"```sh",
		command,
		"```",
		"",
		"## Exit Code",
		"",
		String(result.exitCode),
		"",
		"## Stdout",
		"",
		"```text",
		result.stdout || "(empty)",
		"```",
		"",
		"## Stderr",
		"",
		"```text",
		result.stderr || "(empty)",
		"```",
		"",
	].join("\n");
}

function bounded(text) {
	const limit = 12000;
	if (text.length <= limit) return text;
	return `${text.slice(0, limit)}\n[truncated ${text.length - limit} bytes]`;
}
