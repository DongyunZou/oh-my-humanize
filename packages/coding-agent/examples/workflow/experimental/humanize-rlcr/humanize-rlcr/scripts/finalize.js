const state = workflowContext.state;
const humanize = state.humanize && typeof state.humanize === "object" ? state.humanize : {};
const ledger = humanize.ledger && typeof humanize.ledger === "object" ? humanize.ledger : {};
const operatorGate = humanize.operatorGate && typeof humanize.operatorGate === "object" ? humanize.operatorGate : {};
const startedAtMs = Number.isFinite(operatorGate.recordedAtMs) ? operatorGate.recordedAtMs : Date.now();
const elapsedMs = Math.max(0, Date.now() - startedAtMs);
const final = {
	status: "done",
	rounds: Number.isFinite(ledger.currentRound) ? ledger.currentRound : 0,
	openIssueCount: Array.isArray(ledger.openIssues) ? ledger.openIssues.length : 0,
	queuedIssueCount: Array.isArray(ledger.queuedIssues) ? ledger.queuedIssues.length : 0,
	stagnation: ledger.stagnation ?? {},
	elapsedMs,
};
const runtime = {
	startedAtMs,
	elapsedMs,
};

return {
	summary: "humanize RLCR finalized with durable ledger summary",
	statePatch: [
		{ op: "set", path: "/humanize/final", value: final },
		{ op: "set", path: "/humanize/runtime", value: runtime },
	],
};
