export function workflowAgentTaskIdForNode(nodeId: string): string {
	const sanitized = nodeId.replaceAll(/[^A-Za-z0-9_]/g, "_").slice(0, 48);
	return sanitized || "workflow_node";
}
