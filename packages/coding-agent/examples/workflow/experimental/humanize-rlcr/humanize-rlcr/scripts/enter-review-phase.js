const state = workflowContext.state;
const humanize = state.humanize && typeof state.humanize === "object" ? state.humanize : {};
const ledger = humanize.ledger && typeof humanize.ledger === "object" ? humanize.ledger : {};
const operatorGate = humanize.operatorGate && typeof humanize.operatorGate === "object" ? humanize.operatorGate : {};
const startedAtMs = Number.isFinite(operatorGate.recordedAtMs) ? operatorGate.recordedAtMs : Date.now();
const elapsedMs = Math.max(0, Date.now() - startedAtMs);
let taskText = "";
try {
	taskText = await Bun.file("task.md").text();
} catch {
	taskText = "";
}
const baseBranchMatch = taskText.match(/(?:^|\n)\s*(?:base\s*branch|baseBranch|review\s*base)\s*:\s*([^\n]+)/iu);
const envBaseBranch = Bun.env.OMH_HUMANIZE_BASE_BRANCH?.trim();
const taskBaseBranch = baseBranchMatch?.[1]?.trim();
const baseBranch = envBaseBranch || taskBaseBranch || "main";
const reviewPhase = {
	baseBranch,
	status: "active",
	enteredAfterRound: Number.isFinite(ledger.currentRound) ? ledger.currentRound : 0,
	openIssueCount: Array.isArray(ledger.openIssues) ? ledger.openIssues.length : 0,
	queuedIssueCount: Array.isArray(ledger.queuedIssues) ? ledger.queuedIssues.length : 0,
};
const runtime = {
	startedAtMs,
	elapsedMs,
};

return {
	summary: "entered code review phase with ledger snapshot",
	statePatch: [
		{ op: "set", path: "/humanize/reviewPhase", value: reviewPhase },
		{ op: "set", path: "/humanize/runtime", value: runtime },
	],
};
