const task = workflowContext.state?.task;
const command = task?.reproductionCommand;
if (typeof command !== "string" || command.trim() === "") {
	throw new Error("bug-triage-repro-fix requires /task.reproductionCommand before runReproduction");
}

const result = await runShell(command);
const outputPath = "workflow-output/reproduction.md";
await Bun.write(outputPath, evidenceMarkdown("Reproduction", command, result));

return {
	summary: `ran task-declared reproduction command; exit=${result.exitCode}`,
	data: result,
	statePatch: [
		{
			op: "set",
			path: "/repro",
			value: {
				command,
				exitCode: result.exitCode,
				outputPath,
				status: "recorded-real-command",
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

function evidenceMarkdown(label, command, result) {
	return [
		`# ${label} Evidence`,
		"",
		"## Command",
		"",
		"```sh",
		command,
		"```",
		"",
		`## Exit Code`,
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
