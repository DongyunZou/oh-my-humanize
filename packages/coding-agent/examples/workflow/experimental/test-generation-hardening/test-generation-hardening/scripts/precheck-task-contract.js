const taskText = await readRequiredTaskText();
const validationCommand = requiredCommand(taskText, "Validation Command");
const runtime = runtimeFromTaskContract(taskText);

await Bun.write(
	"workflow-output/test-hardening-precheck.md",
	[
		"# Test Hardening Precheck",
		"",
		"## Frozen Task",
		"",
		"```markdown",
		taskText,
		"```",
		"",
		"## Validation Command",
		"",
		"```text",
		validationCommand,
		"```",
		"",
	].join("\n"),
);

return {
	summary: "validated test hardening task contract",
	statePatch: [
		{
			op: "set",
			path: "/task",
			value: {
				file: "task.md",
				taskText,
				validationCommand,
			},
		},
		{
			op: "set",
			path: "/runtime",
			value: runtime,
		},
	],
};

async function readRequiredTaskText() {
	let text = "";
	try {
		text = await Bun.file("task.md").text();
	} catch {
		throw new Error("test-generation-hardening requires task.md in the project root");
	}
	if (!text.trim()) throw new Error("test-generation-hardening task.md must not be empty");
	return text;
}

function requiredCommand(taskContract, label) {
	const command = commandField(taskContract, label);
	if (!command) throw new Error(`test-generation-hardening task.md must declare ${label}`);
	return command;
}

function commandField(taskContract, label) {
	const lines = taskContract.split(/\r?\n/u);
	const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
	const pattern = new RegExp(`^\\s*${escaped}\\s*:\\s*(.*)\\s*$`, "iu");
	for (let index = 0; index < lines.length; index += 1) {
		const match = pattern.exec(lines[index] ?? "");
		if (!match) continue;
		const inline = match[1]?.trim();
		if (inline) return inline;
		return firstFollowingCommandLine(lines, index + 1);
	}
	return "";
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

function runtimeFromTaskContract() {
	return {
		startedAtMs: Date.now(),
	};
}
