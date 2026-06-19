const completed = Array.isArray(workflowContext.completedActivations) ? workflowContext.completedActivations : [];
const parentIds = Array.isArray(workflowContext.activation.parentActivationIds)
	? workflowContext.activation.parentActivationIds
	: [];
const parent = [...completed].reverse().find(activation => parentIds.includes(activation.id));

if (!parent || !parent.output || typeof parent.output !== "object") {
	throw new Error("record-agent-artifact requires a completed parent agent activation");
}

const nodeId = typeof parent.nodeId === "string" ? parent.nodeId : "";
const output = parent.output;
const data = output.data && typeof output.data === "object" && !Array.isArray(output.data) ? output.data : {};
const summary = typeof output.summary === "string" ? output.summary.trim() : "";
const target = targetForNode(nodeId);
const value = await artifactValue(target, data, summary);

if (!value.trim()) {
	throw new Error(`record-agent-artifact could not extract ${target.label} from ${nodeId}`);
}

return {
	summary: `recorded ${target.label} from ${nodeId}`,
	data: {
		sourceActivationId: parent.id,
		sourceNodeId: nodeId,
		targetPath: target.path,
	},
	statePatch: [{ op: "set", path: target.path, value }],
};

function targetForNode(nodeId) {
	if (nodeId === "inspectWorkspace" || nodeId.endsWith("__inspectWorkspace")) {
		return {
			path: "/workspace",
			key: "workspace",
			label: "workspace report",
			artifactPath: "workflow-output/workspace-inspection.md",
		};
	}
	if (nodeId === "draftPlan" || nodeId.endsWith("__draftPlan")) {
		return {
			path: "/plan",
			key: "plan",
			label: "KDA plan",
			artifactPath: "workflow-output/kda-execution-plan.md",
		};
	}
	throw new Error(`record-agent-artifact has no target mapping for ${nodeId}`);
}

async function artifactValue(target, data, summary) {
	const direct = stringifyArtifact(data[target.key]);
	if (direct.trim()) return direct;
	const artifact = await readArtifact(target.artifactPath);
	if (artifact.trim()) return artifact;
	const parsedSummary = parseSummary(summary);
	const parsed = parsedSummary && typeof parsedSummary === "object" && !Array.isArray(parsedSummary)
		? stringifyArtifact(parsedSummary[target.key])
		: "";
	if (parsed.trim()) return parsed;
	return summary;
}

async function readArtifact(path) {
	if (!path) return "";
	try {
		return await Bun.file(path).text();
	} catch {
		return "";
	}
}

function stringifyArtifact(value) {
	if (typeof value === "string") return value;
	if (value === undefined || value === null) return "";
	return JSON.stringify(value, null, 2);
}

function parseSummary(summary) {
	if (!summary) return undefined;
	try {
		return JSON.parse(summary);
	} catch {
		return undefined;
	}
}
