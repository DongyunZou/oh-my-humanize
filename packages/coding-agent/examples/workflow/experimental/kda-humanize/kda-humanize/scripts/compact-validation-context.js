const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
const taskContract = state.taskContract ?? {};
const plan = evidenceValue(state.plan, "draftPlan");
const candidate = evidenceValue(state.candidate, "implementCandidate");
const humanizeHandoff = evidenceValue(state.finalizeSummary, "humanize__finalize");
const latestCandidateOutput = latestCompletedOutput("implementCandidate");
const context = {
	status: "bounded-validation-context",
	generatedAtMs: Date.now(),
	taskContract: boundedValue(taskContract, 2000),
	plan: boundedValue(plan, 2600),
	nestedHumanizeHandoff: boundedValue(humanizeHandoff, 2200),
	candidate: boundedValue(candidate, 2600),
	candidateSummary: boundedValue(latestCandidateOutput?.summary ?? "", 1600),
	changedFiles: await changedProjectFiles(),
	artifactIndex: await workflowArtifactIndex(),
	reviewerInstructions: [
		"Promote only when the task contract, plan, nested Humanize handoff, validation evidence, and rollback or metric evidence are coherent.",
		"Artifact paths are evidence references; raw transcripts should stay out of the prompt unless a later agent explicitly inspects them.",
		"Reject/revise duration-only, sleep-only, idle-loop, or no-op evidence.",
	],
};

await Bun.write("workflow-output/kda-validation-context.json", JSON.stringify(context, null, 2));

return {
	summary: "prepared bounded KDA validation context",
	statePatch: [{ op: "set", path: "/validationContext", value: context }],
	artifacts: ["local://workflow-output/kda-validation-context.json"],
};

function evidenceValue(stateValue, nodeId) {
	if (!isEmptyEvidence(stateValue)) return stateValue;
	return activationEvidence(latestCompletedOutput(nodeId));
}

function activationEvidence(output) {
	if (!output || typeof output !== "object") return {};
	const evidence = {};
	if (typeof output.summary === "string" && output.summary.trim()) evidence.summary = output.summary;
	if (output.data && typeof output.data === "object") evidence.data = output.data;
	if (Array.isArray(output.artifacts) && output.artifacts.length > 0) evidence.artifacts = output.artifacts;
	return evidence;
}

function latestCompletedOutput(nodeId) {
	return completedActivationsFor(nodeId).at(-1)?.output;
}

function completedActivationsFor(nodeId) {
	return workflowContext.completedActivations.filter(
		activation => activation.nodeId === nodeId && activation.status === "completed",
	);
}

function isEmptyEvidence(value) {
	if (value === undefined || value === null) return true;
	if (typeof value === "string") return value.trim().length === 0;
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === "object") return Object.keys(value).length === 0;
	return false;
}

function boundedValue(value, maxChars) {
	const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
	return boundedText(text, maxChars);
}

function boundedText(text, maxChars) {
	if (text.length <= maxChars) return text;
	return `${text.slice(0, maxChars)}\n[truncated ${text.length - maxChars} chars]`;
}

async function changedProjectFiles() {
	const proc = Bun.spawn(["git", "status", "--short", "--untracked-files=all"], {
		cwd: process.cwd(),
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
	if (exitCode !== 0) return [];
	return stdout
		.split(/\r?\n/u)
		.map(statusLineToPath)
		.filter(Boolean)
		.filter(file => !ignoredEvidencePath(file))
		.slice(0, 40);
}

function statusLineToPath(line) {
	const trimmed = line.trim();
	if (!trimmed) return "";
	const rename = /^R[ MDA?]?\s+(.+?)\s+->\s+(.+)$/u.exec(trimmed);
	if (rename) return rename[2]?.trim() ?? "";
	return trimmed.slice(2).trim();
}

function ignoredEvidencePath(file) {
	return (
		file === "task.md" ||
		file === "progress.md" ||
		file.startsWith(".git/") ||
		file.includes("/.pytest_cache/") ||
		file.includes("/node_modules/") ||
		file.includes("/.venv/")
	);
}

async function workflowArtifactIndex() {
	const files = await workflowOutputFiles();
	const indexed = [];
	for (const file of files.slice(0, 15)) {
		const text = await readOptionalText(file);
		indexed.push({
			file,
			sizeChars: text.length,
			preview: boundedText(text, 360),
		});
	}
	return indexed;
}

async function workflowOutputFiles() {
	try {
		const glob = new Bun.Glob("workflow-output/*");
		const files = [];
		for await (const file of glob.scan({ cwd: process.cwd(), onlyFiles: true })) {
			files.push(file);
		}
		return files.sort();
	} catch {
		return [];
	}
}

async function readOptionalText(filePath) {
	try {
		return await Bun.file(filePath).text();
	} catch {
		return "";
	}
}
