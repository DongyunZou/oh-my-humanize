const review = latestActivationOutput("reviewRound");
const reviewVerdict = normalizeVerdict(review.data?.verdict ?? review.summary);
const setupBlockerEvidenceFiles = await findSetupBlockerEvidenceFiles();

let decision = reviewVerdict === "continue" ? "continue" : "complete";
let reason =
	decision === "continue"
		? "review requested another build round"
		: "review accepted the current implementation evidence";

if (setupBlockerEvidenceFiles.length > 0) {
	decision = "reject";
	reason = "setup blocker evidence is terminal; archive/reject instead of looping into another build round";
}

const route = {
	decision,
	reason,
	reviewVerdict,
	reviewSummary: review.summary ?? "",
	setupBlockerEvidenceFiles,
	checkedAtMs: Date.now(),
};

return {
	summary:
		decision === "reject"
			? `review route rejected due to setup blocker evidence: ${setupBlockerEvidenceFiles.join(", ")}`
			: `review route ${decision}: ${reason}`,
	data: route,
	statePatch: [{ op: "set", path: "/reviewRoute", value: route }],
};

function latestActivationOutput(nodeId) {
	const activations = Array.isArray(workflowContext.completedActivations) ? workflowContext.completedActivations : [];
	for (let index = activations.length - 1; index >= 0; index -= 1) {
		const activation = activations[index];
		if (activation?.nodeId === nodeId) return activation.output ?? {};
	}
	return {};
}

function normalizeVerdict(value) {
	const text = typeof value === "string" ? value.toLowerCase() : "";
	return /\bcontinue\b/u.test(text) ? "continue" : "complete";
}

async function findSetupBlockerEvidenceFiles() {
	const files = [];
	try {
		const glob = new Bun.Glob("workflow-output/**/*");
		for await (const file of glob.scan({ cwd: process.cwd(), onlyFiles: true })) {
			if (isSetupBlockerFileName(file) || (await fileContainsSetupBlocker(file))) files.push(file);
		}
	} catch {
		return [];
	}
	return files.sort();
}

function isSetupBlockerFileName(file) {
	return /(^|\/)setup[-_]?blocker/i.test(file);
}

async function fileContainsSetupBlocker(file) {
	try {
		const source = Bun.file(file);
		if (source.size > 128_000) return false;
		const text = await source.text();
		return /\bsetup[- ]blocker\b/i.test(text);
	} catch {
		return false;
	}
}
