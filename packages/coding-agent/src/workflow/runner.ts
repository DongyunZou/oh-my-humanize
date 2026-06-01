import type { Api, Model } from "@oh-my-pi/pi-ai";
import type { CanonicalModelRegistry, ModelMatchPreferences } from "../config/model-resolver";
import type { Settings } from "../config/settings";
import type { WorkflowDefinition, WorkflowNode } from "./definition";
import { resolveWorkflowNodeModel, type WorkflowModelResolutionAudit } from "./model-resolution";
import { executeWorkflowNode, type WorkflowNodeRuntimeHost } from "./node-runtime";
import {
	appendWorkflowActivationCompleted,
	appendWorkflowActivationFailed,
	appendWorkflowActivationStarted,
	appendWorkflowStatePatch,
	startWorkflowRun,
	type WorkflowRunSnapshot,
	type WorkflowRunStoreHost,
} from "./run-store";
import { runWorkflowScheduler, type WorkflowActivation, type WorkflowSchedulerResult } from "./scheduler";
import { validateWorkflowActivationOutput, type WorkflowActivationOutput } from "./state";

export interface WorkflowRunnerModelResolutionOptions {
	availableModels: Model<Api>[];
	settings?: Settings;
	matchPreferences?: ModelMatchPreferences;
	modelRegistry?: CanonicalModelRegistry;
	parentActiveModelPattern?: string;
	agentModels?: Record<string, string | string[]>;
}

export interface WorkflowRunnerOptions {
	host: WorkflowRunStoreHost;
	definition: WorkflowDefinition;
	runId: string;
	graphRevisionId?: string;
	startNodeId: string;
	runtimeHost: WorkflowNodeRuntimeHost;
	modelResolution?: WorkflowRunnerModelResolutionOptions;
	maxActivations?: number;
	maxNodeActivations?: number;
}

export interface WorkflowRunnerResult {
	run: WorkflowRunSnapshot;
	scheduler: WorkflowSchedulerResult;
}

export class WorkflowRunnerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "WorkflowRunnerError";
	}
}

export async function runWorkflow(options: WorkflowRunnerOptions): Promise<WorkflowRunnerResult> {
	const run = startWorkflowRun(options.host, options.definition, {
		runId: options.runId,
		graphRevisionId: options.graphRevisionId,
	});
	const scheduler = await runWorkflowScheduler(options.definition, {
		startNodeId: options.startNodeId,
		maxActivations: options.maxActivations,
		maxNodeActivations: options.maxNodeActivations,
		executeNode: async (activation, node) => executeAndPersistActivation(options, run, activation, node),
	});
	return { run, scheduler };
}

async function executeAndPersistActivation(
	options: WorkflowRunnerOptions,
	run: WorkflowRunSnapshot,
	activation: WorkflowActivation,
	node: WorkflowNode,
): Promise<WorkflowActivationOutput> {
	appendWorkflowActivationStarted(options.host, run.id, {
		activationId: activation.id,
		nodeId: node.id,
		graphRevisionId: run.currentGraphRevisionId,
		parentActivationIds: activation.parentActivationIds,
	});
	const modelAudit = resolveModelAudit(options, node);
	try {
		if (modelAudit?.error && nodeRequiresModel(node)) {
			throw new WorkflowRunnerError(modelAudit.error);
		}
		const output = validateWorkflowActivationOutput(
			await executeWorkflowNode(node, activation, options.runtimeHost),
			{
				allowedWritePaths: node.writes,
			},
		);
		if (output.statePatch) {
			appendWorkflowStatePatch(options.host, run.id, {
				patch: output.statePatch,
				reason: `activation ${activation.id}`,
			});
		}
		appendWorkflowActivationCompleted(options.host, run.id, {
			activationId: activation.id,
			output,
			modelAudit,
		});
		return output;
	} catch (error) {
		appendWorkflowActivationFailed(options.host, run.id, {
			activationId: activation.id,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

function resolveModelAudit(
	options: WorkflowRunnerOptions,
	node: WorkflowNode,
): WorkflowModelResolutionAudit | undefined {
	const modelResolution = options.modelResolution;
	if (!modelResolution) return undefined;
	return resolveWorkflowNodeModel(options.definition, node, {
		availableModels: modelResolution.availableModels,
		settings: modelResolution.settings,
		matchPreferences: modelResolution.matchPreferences,
		modelRegistry: modelResolution.modelRegistry,
		parentActiveModelPattern: modelResolution.parentActiveModelPattern,
		agentModel: resolveAgentModelPattern(modelResolution, node),
	}).audit;
}

function resolveAgentModelPattern(
	modelResolution: WorkflowRunnerModelResolutionOptions,
	node: WorkflowNode,
): string | string[] | undefined {
	if (!node.agent) return undefined;
	return modelResolution.agentModels?.[node.agent] ?? modelResolution.agentModels?.[node.id];
}

function nodeRequiresModel(node: WorkflowNode): boolean {
	return node.type === "agent" || node.type === "review" || node.model !== undefined;
}
