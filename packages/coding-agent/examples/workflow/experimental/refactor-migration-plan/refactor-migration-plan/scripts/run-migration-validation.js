const task = workflowContext.state?.task;
const validationCommand = task?.validationCommand;
const compatibilityCommand = task?.compatibilityCommand;

if (typeof validationCommand !== "string" || validationCommand.trim() === "") {
	throw new Error("refactor-migration-plan requires /task.validationCommand before runMigrationValidation");
}

const compatibility =
	typeof compatibilityCommand === "string" && compatibilityCommand.trim() !== ""
		? await runShell(compatibilityCommand)
		: undefined;
const validation = await runShell(validationCommand);
const outputPath = "workflow-output/refactor-migration-validation.md";
await Bun.write(outputPath, evidenceMarkdown(compatibilityCommand, compatibility, validationCommand, validation));

const compatibilityPass = compatibility === undefined || compatibility.exitCode === 0;
const validationPass = validation.exitCode === 0;

return {
	summary: `migration validation compatibility=${compatibilityPass ? "pass" : "fail"} validation=${
		validationPass ? "pass" : "fail"
	}`,
	data: { compatibility, validation },
	statePatch: [
		{
			op: "set",
			path: "/validation",
			value: {
				compatibilityCommand,
				compatibilityExitCode: compatibility?.exitCode,
				validationCommand,
				validationExitCode: validation.exitCode,
				status: compatibilityPass && validationPass ? "pass" : "fail",
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

function evidenceMarkdown(compatibilityCommand, compatibility, validationCommand, validation) {
	const lines = ["# Refactor Migration Validation Evidence", ""];
	if (compatibilityCommand && compatibility) {
		lines.push(
			"## Compatibility Command",
			"",
			"```sh",
			compatibilityCommand,
			"```",
			"",
			`Exit code: ${compatibility.exitCode}`,
			"",
			"```text",
			compatibility.stdout || compatibility.stderr || "(empty)",
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
