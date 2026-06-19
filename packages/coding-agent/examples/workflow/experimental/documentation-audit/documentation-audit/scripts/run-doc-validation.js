const task = workflowContext.state?.task;
const validationCommand = task?.validationCommand;
const docsCommand = task?.docsCommand;

if (typeof validationCommand !== "string" || validationCommand.trim() === "") {
	throw new Error("documentation-audit requires /task.validationCommand before runDocsValidation");
}

const docs = typeof docsCommand === "string" && docsCommand.trim() !== "" ? await runShell(docsCommand) : undefined;
const validation = await runShell(validationCommand);
const outputPath = "workflow-output/documentation-validation.md";
await Bun.write(outputPath, evidenceMarkdown(docsCommand, docs, validationCommand, validation));

const docsPass = docs === undefined || docs.exitCode === 0;
const validationPass = validation.exitCode === 0;

return {
	summary: `documentation validation docs=${docsPass ? "pass" : "fail"} validation=${
		validationPass ? "pass" : "fail"
	}`,
	data: { docs, validation },
	statePatch: [
		{
			op: "set",
			path: "/validation",
			value: {
				docsCommand,
				docsExitCode: docs?.exitCode,
				validationCommand,
				validationExitCode: validation.exitCode,
				status: docsPass && validationPass ? "pass" : "fail",
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

function evidenceMarkdown(docsCommand, docs, validationCommand, validation) {
	const lines = ["# Documentation Validation Evidence", ""];
	if (docsCommand && docs) {
		lines.push(
			"## Docs Command",
			"",
			"```sh",
			docsCommand,
			"```",
			"",
			`Exit code: ${docs.exitCode}`,
			"",
			"```text",
			docs.stdout || docs.stderr || "(empty)",
			"```",
			"",
		);
	}
	lines.push(
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
	);
	return lines.join("\n");
}

function bounded(text) {
	const limit = 12000;
	if (text.length <= limit) return text;
	return `${text.slice(0, limit)}\n[truncated ${text.length - limit} bytes]`;
}
