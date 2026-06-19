const task = workflowContext.state?.task;
const benchmarkCommand = task?.benchmarkCommand;
const validationCommand = task?.validationCommand;
if (typeof benchmarkCommand !== "string" || benchmarkCommand.trim() === "") {
	throw new Error("performance-optimization-search requires /task.benchmarkCommand before benchmarkCandidates");
}
if (typeof validationCommand !== "string" || validationCommand.trim() === "") {
	throw new Error("performance-optimization-search requires /task.validationCommand before benchmarkCandidates");
}

const benchmark = await runShell(benchmarkCommand);
const validation = await runShell(validationCommand);
const outputPath = "workflow-output/performance-benchmark.md";
await Bun.write(outputPath, evidenceMarkdown(benchmarkCommand, benchmark, validationCommand, validation));

return {
	summary: `benchmark=${benchmark.exitCode === 0 ? "pass" : "fail"} validation=${
		validation.exitCode === 0 ? "pass" : "fail"
	}`,
	data: { benchmark, validation },
	statePatch: [
		{
			op: "set",
			path: "/benchmark",
			value: {
				benchmarkCommand,
				benchmarkExitCode: benchmark.exitCode,
				validationCommand,
				validationExitCode: validation.exitCode,
				status: benchmark.exitCode === 0 && validation.exitCode === 0 ? "pass" : "fail",
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

function evidenceMarkdown(benchmarkCommand, benchmark, validationCommand, validation) {
	return [
		"# Performance Benchmark Evidence",
		"",
		"## Benchmark Command",
		"",
		"```sh",
		benchmarkCommand,
		"```",
		"",
		`Exit code: ${benchmark.exitCode}`,
		"",
		"```text",
		benchmark.stdout || benchmark.stderr || "(empty)",
		"```",
		"",
		"## Validation Command",
		"",
		"```sh",
		validationCommand,
		"```",
		"",
		`Exit code: ${validation.exitCode}`,
		"",
		"```text",
		validation.stdout || validation.stderr || "(empty)",
		"```",
		"",
	].join("\n");
}

function bounded(text) {
	const limit = 12000;
	if (text.length <= limit) return text;
	return `${text.slice(0, limit)}\n[truncated ${text.length - limit} bytes]`;
}
