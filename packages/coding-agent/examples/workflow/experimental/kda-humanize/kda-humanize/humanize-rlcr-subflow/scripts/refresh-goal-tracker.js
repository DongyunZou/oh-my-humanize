const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
const previous = state.goalTracker && typeof state.goalTracker === "object" ? state.goalTracker : {};
const tracker = {
	...previous,
	status: "implementation-round-recorded",
	updatedAtMs: Date.now(),
	planSummary: boundedValue(state.plan ?? "", 1200),
	implementationRounds: completedBySuffix("implementRound").length,
	fixRounds: completedBySuffix("fixCodeReviewIssues").length,
	latestImplementation: activationEvidence(latestCompletedBySuffix("implementRound")),
	latestImplementationReview: activationEvidence(latestCompletedBySuffix("implementationReview")),
	latestCodeReview: activationEvidence(latestCompletedBySuffix("codeReviewGate")),
	latestFix: activationEvidence(latestCompletedBySuffix("fixCodeReviewIssues")),
	changedFiles: await changedProjectFiles(),
	artifactIndex: await workflowArtifactIndex(),
};

await Bun.write("workflow-output/humanize-goal-tracker.json", JSON.stringify(tracker, null, 2));

return {
	summary: "refreshed nested Humanize goal tracker from latest evidence",
	statePatch: [{ op: "set", path: "/goalTracker", value: tracker }],
	artifacts: ["local://workflow-output/humanize-goal-tracker.json"],
};

function latestCompletedBySuffix(suffix) {
	return completedBySuffix(suffix).at(-1);
}

function completedBySuffix(suffix) {
	return (Array.isArray(workflowContext.completedActivations) ? workflowContext.completedActivations : []).filter(
		activation =>
			activation &&
			activation.status === "completed" &&
			typeof activation.nodeId === "string" &&
			(activation.nodeId === suffix || activation.nodeId.endsWith(`__${suffix}`)),
	);
}

function activationEvidence(activation) {
	const output = activation && typeof activation.output === "object" ? activation.output : {};
	return {
		nodeId: activation?.nodeId ?? "",
		activationId: activation?.id ?? "",
		summary: boundedValue(output.summary ?? "", 1400),
		artifacts: Array.isArray(output.artifacts) ? output.artifacts.slice(0, 20) : [],
		verdict: typeof output.verdict === "string" ? output.verdict : output.data?.verdict,
	};
}

function boundedValue(value, maxChars) {
	const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
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
		.slice(0, 60);
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
		file === "evidence-ledger.jsonl" ||
		file === "manifest-entry.json" ||
		file === "monitor-assignment.json" ||
		file.startsWith(".git/") ||
		file.includes("/.pytest_cache/") ||
		file.includes("/node_modules/") ||
		file.includes("/.venv/")
	);
}

async function workflowArtifactIndex() {
	const files = await workflowOutputFiles();
	const indexed = [];
	for (const file of files.slice(0, 30)) {
		const text = await readOptionalText(file);
		indexed.push({
			file,
			sizeChars: text.length,
			preview: boundedValue(text, 280),
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
