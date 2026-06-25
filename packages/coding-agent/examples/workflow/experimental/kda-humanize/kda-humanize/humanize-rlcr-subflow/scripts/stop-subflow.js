const completed = workflowContext.completedActivations;
const parentIds = workflowContext.activation.parentActivationIds;
const parent = [...completed].reverse().find(activation => parentIds.includes(activation.id));
const output = parent?.output && typeof parent.output === "object" ? parent.output : {};
const data = output.data && typeof output.data === "object" ? output.data : {};
const verdict =
	typeof data.verdict === "string"
		? data.verdict
		: typeof output.verdict === "string"
			? output.verdict
			: "operator-gate";
const summary = typeof output.summary === "string" ? output.summary : "nested Humanize subflow stopped";

const stop = {
	status: "stopped",
	verdict,
	summary: summary.slice(0, 4000),
	sourceActivationId: parent?.id ?? null,
	sourceNodeId: parent?.nodeId ?? null,
	stoppedByActivationId: workflowContext.activation.id,
};

await Bun.write(
	"workflow-output/humanize-stop-summary.md",
	[
		"# Humanize Subflow Stop",
		"",
		`- status: ${stop.status}`,
		`- verdict: ${stop.verdict}`,
		`- source node: ${stop.sourceNodeId ?? "unknown"}`,
		`- source activation: ${stop.sourceActivationId ?? "unknown"}`,
		"",
		"## Summary",
		"",
		stop.summary,
		"",
	].join("\n"),
);

return {
	summary: `nested Humanize subflow stopped before promotion: ${verdict}: ${summary.slice(0, 240)}`,
	data: stop,
	artifacts: ["local://workflow-output/humanize-stop-summary.md"],
	statePatch: [
		{ op: "set", path: "/humanize/subflowStop", value: stop },
		{ op: "set", path: "/finalizeSummary", value: stop },
	],
};
