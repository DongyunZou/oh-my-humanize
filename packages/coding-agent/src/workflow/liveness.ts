import type { WorkflowDefinition, WorkflowNode } from "./definition";
import type { WorkflowActivation } from "./scheduler";

export const DEFAULT_WORKFLOW_SCRIPT_CYCLE_LIVENESS_WINDOW = 4;

export interface WorkflowLivenessDiagnostic {
	nodeId: string;
	cycleNodeIds: string[];
	stalledActivationIds: string[];
	message: string;
}

export function diagnoseWorkflowLiveness(
	definition: WorkflowDefinition,
	node: WorkflowNode,
	completedActivations: readonly WorkflowActivation[],
): WorkflowLivenessDiagnostic | undefined {
	if (node.type !== "script") return undefined;
	const cycleNodeIds = scriptOnlyCycleNodeIds(definition, node.id);
	if (cycleNodeIds === undefined) return undefined;
	const stalledActivations = consecutiveStalledCycleActivations(definition, cycleNodeIds, completedActivations);
	if (stalledActivations.length < DEFAULT_WORKFLOW_SCRIPT_CYCLE_LIVENESS_WINDOW) return undefined;
	const stalledActivationIds = stalledActivations.map(activation => activation.id);
	return {
		nodeId: node.id,
		cycleNodeIds,
		stalledActivationIds,
		message: [
			`workflow liveness guard blocked script-only cycle at node "${node.id}"`,
			`after ${stalledActivations.length} consecutive activations without state patches, artifacts, or agent/review/human progress`,
			`cycle: ${cycleNodeIds.join(" -> ")}`,
			`activations: ${stalledActivationIds.join(", ")}`,
		].join("; "),
	};
}

function scriptOnlyCycleNodeIds(definition: WorkflowDefinition, nodeId: string): string[] | undefined {
	const nodesById = new Map(definition.nodes.map(node => [node.id, node]));
	const node = nodesById.get(nodeId);
	if (node === undefined) return undefined;
	const reachableFromNode = reachableNodeIds(definition, nodeId, "forward");
	const canReachNode = reachableNodeIds(definition, nodeId, "reverse");
	const component = definition.nodes.filter(
		candidate => reachableFromNode.has(candidate.id) && canReachNode.has(candidate.id),
	);
	const cyclic = component.length > 1 || definition.edges.some(edge => edge.from === nodeId && edge.to === nodeId);
	if (!cyclic) return undefined;
	if (component.some(candidate => candidate.type !== "script")) return undefined;
	return component.map(candidate => candidate.id);
}

function reachableNodeIds(
	definition: WorkflowDefinition,
	startNodeId: string,
	direction: "forward" | "reverse",
): Set<string> {
	const reachable = new Set<string>();
	const queue = [startNodeId];
	while (queue.length > 0) {
		const nodeId = queue.shift();
		if (nodeId === undefined || reachable.has(nodeId)) continue;
		reachable.add(nodeId);
		for (const edge of definition.edges) {
			const nextNodeId = direction === "forward" && edge.from === nodeId ? edge.to : undefined;
			const previousNodeId = direction === "reverse" && edge.to === nodeId ? edge.from : undefined;
			const adjacentNodeId = nextNodeId ?? previousNodeId;
			if (adjacentNodeId !== undefined && !reachable.has(adjacentNodeId)) queue.push(adjacentNodeId);
		}
	}
	return reachable;
}

function consecutiveStalledCycleActivations(
	definition: WorkflowDefinition,
	cycleNodeIds: readonly string[],
	completedActivations: readonly WorkflowActivation[],
): WorkflowActivation[] {
	const nodesById = new Map(definition.nodes.map(node => [node.id, node]));
	const cycleNodeIdSet = new Set(cycleNodeIds);
	const stalledActivations: WorkflowActivation[] = [];
	for (let index = completedActivations.length - 1; index >= 0; index -= 1) {
		const activation = completedActivations[index];
		if (activation === undefined || activation.status !== "completed") break;
		if (!cycleNodeIdSet.has(activation.nodeId)) break;
		const activationNode = nodesById.get(activation.nodeId);
		if (activationHasWorkflowProgress(activation, activationNode)) break;
		stalledActivations.push(activation);
	}
	return stalledActivations.toReversed();
}

function activationHasWorkflowProgress(activation: WorkflowActivation, node: WorkflowNode | undefined): boolean {
	if (node?.type !== "script") return true;
	if ((activation.output?.statePatch?.length ?? 0) > 0) return true;
	if ((activation.output?.artifacts?.length ?? 0) > 0) return true;
	return false;
}
