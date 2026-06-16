const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
const taskContract = state.taskContract ?? {};
const plan = evidenceValue(state.plan, "draftPlan");
const candidate = evidenceValue(state.candidate, "implementCandidate");
const humanizeHandoff = evidenceValue(state.finalizeSummary, "humanize__finalize");
const validationActivations = completedActivationsFor("validateCandidate");
const latestValidation = validationActivations.at(-1)?.output ?? {};
const validationEvidence = activationEvidence(latestValidation);
const promotionVerdict = reviewVerdict(latestValidation) ?? "unknown";
const evidence = {
	status: "recorded",
	taskContract,
	plan,
	humanizeHandoff,
	candidate,
	validation: validationEvidence,
	validationVerdict: promotionVerdict,
	validationActivationCount: validationActivations.length,
	recordedAtMs: Date.now(),
};
await Bun.write(
	"workflow-output/kda-evidence.md",
	[
		"# KDA Evidence",
		"",
		"## Task Contract",
		"",
		"```json",
		JSON.stringify(taskContract, null, 2),
		"```",
		"",
		"## Plan",
		"",
		"```json",
		JSON.stringify(plan, null, 2),
		"```",
		"",
		"## Nested Humanize Handoff",
		"",
		"```json",
		JSON.stringify(humanizeHandoff, null, 2),
		"```",
		"",
		"## Candidate",
		"",
		"```json",
		JSON.stringify(candidate, null, 2),
		"```",
		"",
		"## Validation",
		"",
		`- Verdict: ${String(promotionVerdict)}`,
		`- Validation activations: ${validationActivations.length}`,
		"",
		"```json",
		JSON.stringify(validationEvidence, null, 2),
		"```",
		"",
	].join("\n"),
);

return {
	summary: "recorded KDA evidence from task contract, plan, nested Humanize handoff, candidate, and validation verdict",
	statePatch: [{ op: "set", path: "/evidence", value: evidence }],
	artifacts: ["local://workflow-output/kda-evidence.md"],
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

function reviewVerdict(output) {
	if (!output || typeof output !== "object") return undefined;
	if (typeof output.verdict === "string") return output.verdict;
	if (output.data && typeof output.data === "object" && typeof output.data.verdict === "string") {
		return output.data.verdict;
	}
	return undefined;
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
