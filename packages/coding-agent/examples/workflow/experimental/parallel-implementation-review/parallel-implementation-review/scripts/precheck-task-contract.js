let taskText = "";
try {
	taskText = await Bun.file("task.md").text();
} catch {
	taskText = "";
}

const taskContract = taskText.trim();
if (!taskContract) {
	throw new Error("parallel-implementation-review requires a task.md contract in the project root");
}
assertTaskContract(taskContract);

return {
	summary: "parallel implementation task contract recorded from task.md",
	statePatch: [
		{ op: "set", path: "/taskContract", value: taskContract.slice(0, 8000) },
		{ op: "set", path: "/runtime", value: runtimeFromTaskContract(taskContract) },
	],
};

function runtimeFromTaskContract() {
	return {
		startedAtMs: Date.now(),
	};
}

function assertTaskContract(text) {
	const missing = [];
	if (!hasHeadingOrField(text, "objective")) missing.push("Objective");
	if (!hasHeadingOrField(text, "acceptance criteria")) missing.push("Acceptance Criteria");
	if (!hasValidationContract(text)) missing.push("Validation Command or Manual Evidence Allowed");
	if (!hasHeadingOrField(text, "lane ownership")) missing.push("Lane Ownership");
	if (!hasHeadingOrField(text, "stop conditions")) missing.push("Stop Conditions");
	if (missing.length > 0) {
		throw new Error(`parallel-implementation-review task.md missing required contract fields: ${missing.join(", ")}`);
	}
}

function hasValidationContract(text) {
	return hasHeadingOrField(text, "validation command") || hasHeadingOrField(text, "manual evidence allowed");
}

function hasHeadingOrField(text, label) {
	const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const pattern = new RegExp(`(^|\\n)\\s*(?:#+\\s*)?${escaped}\\s*:`, "iu");
	const headingPattern = new RegExp(`(^|\\n)\\s*#+\\s*${escaped}\\s*$`, "iu");
	return pattern.test(text) || headingPattern.test(text);
}
