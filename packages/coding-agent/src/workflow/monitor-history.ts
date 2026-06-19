import * as path from "node:path";
import { getWorkflowMonitorCacheDir } from "@oh-my-pi/pi-utils";
import { renderWorkflowGraphText, type WorkflowGraphView } from "./graph-view";

export interface WorkflowGraphMonitorSnapshotOptions {
	agentDir?: string;
	now?: Date;
}

export interface WorkflowGraphMonitorSnapshot {
	timestamp: string;
	familyId: string;
	latestFreezeId?: string;
	currentAttemptId?: string;
	health: WorkflowGraphMonitorHealth;
	view: WorkflowGraphView;
	renderedText: string;
}

export interface WorkflowGraphMonitorHealth {
	persistedStatus?: NonNullable<WorkflowGraphView["currentAttempt"]>["status"];
	processLive: boolean;
	detached: boolean;
	runningNodeIds: string[];
	runningAgentActivationIds: string[];
	latestCheckpointId: string | null;
}

export async function writeWorkflowGraphMonitorSnapshot(
	view: WorkflowGraphView,
	options: WorkflowGraphMonitorSnapshotOptions = {},
): Promise<string> {
	const timestamp = (options.now ?? new Date()).toISOString();
	const snapshot: WorkflowGraphMonitorSnapshot = {
		timestamp,
		familyId: view.familyId,
		health: workflowGraphMonitorHealth(view),
		view,
		renderedText: renderWorkflowGraphText(view),
	};
	if (view.latestFreezeId !== undefined) snapshot.latestFreezeId = view.latestFreezeId;
	if (view.currentAttempt !== undefined) snapshot.currentAttemptId = view.currentAttempt.id;
	const filename = `${sanitizeWorkflowSnapshotSegment(timestamp)}-${sanitizeWorkflowSnapshotSegment(view.familyId)}.json`;
	const snapshotPath = path.join(getWorkflowMonitorCacheDir(options.agentDir), filename);
	await Bun.write(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
	return snapshotPath;
}

function workflowGraphMonitorHealth(view: WorkflowGraphView): WorkflowGraphMonitorHealth {
	const runningNodeIds = view.nodes.filter(node => node.status === "running").map(node => node.id);
	const runningAgentActivationIds = (view.activeAgents ?? []).map(agent => agent.activationId);
	const processLive =
		runningAgentActivationIds.length > 0 || view.actions.some(action => action.toLowerCase().startsWith("interrupt"));
	const persistedStatus = view.currentAttempt?.status;
	const detached =
		(persistedStatus === "running" || persistedStatus === "stop_requested") &&
		runningNodeIds.length > 0 &&
		!processLive;
	const health: WorkflowGraphMonitorHealth = {
		processLive,
		detached,
		runningNodeIds,
		runningAgentActivationIds,
		latestCheckpointId: view.checkpoint?.id ?? view.currentAttempt?.checkpointId ?? null,
	};
	if (persistedStatus !== undefined) health.persistedStatus = persistedStatus;
	return health;
}

function sanitizeWorkflowSnapshotSegment(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "workflow";
}
