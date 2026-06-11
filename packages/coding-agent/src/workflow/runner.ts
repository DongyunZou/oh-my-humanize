import * as path from "node:path";
import type { Api, Model } from "@oh-my-pi/pi-ai";
import type { CanonicalModelRegistry, ModelMatchPreferences } from "../config/model-resolver";
import type { Settings } from "../config/settings";
import type { WorkflowDefinition, WorkflowNode } from "./definition";
import type { FlowFreeze, FlowFreezeResourceSnapshot } from "./freeze";
import {
	appendWorkflowAttemptActivationCompleted,
	appendWorkflowAttemptActivationFailed,
	appendWorkflowAttemptActivationStarted,
	completeWorkflowAttempt,
	failWorkflowAttempt,
	type RuntimeBindingSnapshot,
	recordWorkflowFreeze,
	restartWorkflowAttempt,
	startWorkflowAttempt,
	startWorkflowFamily,
} from "./lifecycle";
import { resolveWorkflowNodeModel, type WorkflowModelResolutionAudit } from "./model-resolution";
import { executeWorkflowNode, type WorkflowNodeRuntimeHost } from "./node-runtime";
import {
	resolveWorkflowPrompt,
	type WorkflowActivationInputSnapshot,
	type WorkflowResolvedPrompt,
} from "./prompt-source";
import {
	appendWorkflowActivationCompleted,
	appendWorkflowActivationFailed,
	appendWorkflowActivationStarted,
	appendWorkflowStatePatch,
	startWorkflowRun,
	type WorkflowRunSnapshot,
	type WorkflowRunStoreHost,
} from "./run-store";
import {
	runWorkflowScheduler,
	type WorkflowActivation,
	type WorkflowSchedulerExecutionContext,
	type WorkflowSchedulerResult,
} from "./scheduler";
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
	initialState?: Record<string, unknown>;
	signal?: AbortSignal;
	packageRoot?: string;
	maxPromptBytes?: number;
	frozenResources?: FlowFreezeResourceSnapshot[];
	lifecycle?: WorkflowRunnerLifecycleOptions;
}

export interface WorkflowRunnerResult {
	run: WorkflowRunSnapshot;
	scheduler: WorkflowSchedulerResult;
}

export interface WorkflowRunnerLifecycleOptions {
	familyId: string;
	attemptId: string;
	objective?: string;
	freeze: FlowFreeze;
	runtimeBindingSnapshot: RuntimeBindingSnapshot;
	checkpointId?: string;
	recordFamily?: boolean;
	recordFreeze?: boolean;
}

export class WorkflowRunnerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "WorkflowRunnerError";
	}
}

export async function runWorkflow(options: WorkflowRunnerOptions): Promise<WorkflowRunnerResult> {
	startLifecycleAttempt(options);
	const run = startWorkflowRun(options.host, options.definition, {
		runId: options.runId,
		graphRevisionId: options.graphRevisionId,
	});
	const scheduler = await runWorkflowScheduler(options.definition, {
		startNodeId: options.startNodeId,
		maxActivations: options.maxActivations,
		maxNodeActivations: options.maxNodeActivations,
		initialState: options.initialState,
		signal: options.signal,
		graphRevisionId: run.currentGraphRevisionId,
		executeNode: async (activation, node, context) =>
			executeAndPersistActivation(options, run, activation, node, context),
	});
	finishLifecycleAttempt(options, scheduler);
	return { run, scheduler };
}

function startLifecycleAttempt(options: WorkflowRunnerOptions): void {
	const lifecycle = options.lifecycle;
	if (!lifecycle) return;
	if (lifecycle.recordFamily !== false) {
		startWorkflowFamily(options.host, {
			familyId: lifecycle.familyId,
			objective: lifecycle.objective,
		});
	}
	if (lifecycle.recordFreeze !== false) {
		recordWorkflowFreeze(options.host, lifecycle.freeze, { familyId: lifecycle.familyId });
	}
	const attemptOptions = {
		familyId: lifecycle.familyId,
		attemptId: lifecycle.attemptId,
		freezeId: lifecycle.freeze.id,
		startNodeId: options.startNodeId,
		runtimeBindingSnapshot: lifecycle.runtimeBindingSnapshot,
	};
	if (lifecycle.checkpointId !== undefined) {
		restartWorkflowAttempt(options.host, {
			...attemptOptions,
			checkpointId: lifecycle.checkpointId,
		});
		return;
	}
	startWorkflowAttempt(options.host, attemptOptions);
}

function finishLifecycleAttempt(options: WorkflowRunnerOptions, scheduler: WorkflowSchedulerResult): void {
	const lifecycle = options.lifecycle;
	if (!lifecycle) return;
	const failed = scheduler.activations.find(activation => activation.status === "failed");
	if (failed) {
		failWorkflowAttempt(options.host, {
			attemptId: lifecycle.attemptId,
			error: failed.error ?? `workflow activation ${failed.id} failed`,
		});
		return;
	}
	completeWorkflowAttempt(options.host, {
		attemptId: lifecycle.attemptId,
		summary: scheduler.limitReached ? "workflow stopped at activation limit" : "workflow completed",
	});
}

async function executeAndPersistActivation(
	options: WorkflowRunnerOptions,
	run: WorkflowRunSnapshot,
	activation: WorkflowActivation,
	node: WorkflowNode,
	context: WorkflowSchedulerExecutionContext,
): Promise<WorkflowActivationOutput> {
	let started = false;
	try {
		const resolvedPrompt = await resolvePromptForActivation(options, activation, node, context);
		const input = inputSnapshotFromPrompt(resolvedPrompt);
		appendWorkflowActivationStarted(options.host, run.id, {
			activationId: activation.id,
			nodeId: node.id,
			graphRevisionId: activation.graphRevisionId,
			parentActivationIds: activation.parentActivationIds,
			input,
		});
		appendLifecycleActivationStarted(options, activation, node);
		started = true;
		const promptedNode = resolvedPrompt ? { ...node, prompt: resolvedPrompt.value } : node;
		const nodeForExecution = await resolveScriptForExecution(options, promptedNode);
		const modelAudit = nodeRequiresModel(node) ? resolveModelAudit(options, node) : undefined;
		if (modelAudit?.error && nodeRequiresModel(node)) {
			throw new WorkflowRunnerError(modelAudit.error);
		}
		const output = validateWorkflowActivationOutput(
			await executeWorkflowNode(nodeForExecution, activation, options.runtimeHost, {
				modelOverride: modelOverrideFromAudit(modelAudit),
			}),
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
		appendLifecycleActivationCompleted(options, activation, output);
		return output;
	} catch (error) {
		if (!started) {
			appendWorkflowActivationStarted(options.host, run.id, {
				activationId: activation.id,
				nodeId: node.id,
				graphRevisionId: activation.graphRevisionId,
				parentActivationIds: activation.parentActivationIds,
			});
			appendLifecycleActivationStarted(options, activation, node);
		}
		const message = error instanceof Error ? error.message : String(error);
		appendWorkflowActivationFailed(options.host, run.id, {
			activationId: activation.id,
			error: message,
		});
		appendLifecycleActivationFailed(options, activation, message);
		throw error;
	}
}

function appendLifecycleActivationStarted(
	options: WorkflowRunnerOptions,
	activation: WorkflowActivation,
	node: WorkflowNode,
): void {
	const lifecycle = options.lifecycle;
	if (!lifecycle) return;
	appendWorkflowAttemptActivationStarted(options.host, {
		attemptId: lifecycle.attemptId,
		activationId: activation.id,
		nodeId: node.id,
		parentActivationIds: activation.parentActivationIds,
	});
}

function appendLifecycleActivationCompleted(
	options: WorkflowRunnerOptions,
	activation: WorkflowActivation,
	output: WorkflowActivationOutput,
): void {
	const lifecycle = options.lifecycle;
	if (!lifecycle) return;
	appendWorkflowAttemptActivationCompleted(options.host, {
		attemptId: lifecycle.attemptId,
		activationId: activation.id,
		output,
	});
}

function appendLifecycleActivationFailed(
	options: WorkflowRunnerOptions,
	activation: WorkflowActivation,
	error: string,
): void {
	const lifecycle = options.lifecycle;
	if (!lifecycle) return;
	appendWorkflowAttemptActivationFailed(options.host, {
		attemptId: lifecycle.attemptId,
		activationId: activation.id,
		error,
	});
}

function modelOverrideFromAudit(modelAudit: WorkflowModelResolutionAudit | undefined): string | undefined {
	if (!modelAudit?.resolvedModel) return undefined;
	if (modelAudit.explicitThinkingLevel && modelAudit.thinkingLevel) {
		return `${modelAudit.resolvedModel}:${modelAudit.thinkingLevel}`;
	}
	return modelAudit.resolvedModel;
}

async function resolvePromptForActivation(
	options: WorkflowRunnerOptions,
	activation: WorkflowActivation,
	node: WorkflowNode,
	context: WorkflowSchedulerExecutionContext,
): Promise<WorkflowResolvedPrompt | undefined> {
	if (!nodeConsumesPrompt(node)) return undefined;
	return resolveWorkflowPrompt(node, {
		state: context.state,
		completedActivations: context.completedActivations,
		parentActivationIds: activation.parentActivationIds,
		packageRoot: options.packageRoot,
		maxPromptBytes: options.maxPromptBytes,
		frozenResources: workflowFrozenResources(options),
	});
}

function inputSnapshotFromPrompt(
	resolvedPrompt: WorkflowResolvedPrompt | undefined,
): WorkflowActivationInputSnapshot | undefined {
	return resolvedPrompt ? { prompt: resolvedPrompt } : undefined;
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

async function resolveScriptForExecution(options: WorkflowRunnerOptions, node: WorkflowNode): Promise<WorkflowNode> {
	if (node.type !== "script" || !node.script?.file) return node;
	if (!options.packageRoot) {
		throw new WorkflowRunnerError(`workflow script file for node "${node.id}" requires a workflow package root`);
	}
	const root = path.resolve(options.packageRoot);
	const resolved = path.resolve(root, node.script.file);
	const relative = path.relative(root, resolved);
	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		throw new WorkflowRunnerError(`workflow script file for node "${node.id}" escapes the package root`);
	}
	const snapshot = findFrozenResourceSnapshot(workflowFrozenResources(options), relative);
	if (snapshot) {
		return {
			...node,
			script: {
				...node.script,
				code: snapshot.text,
			},
		};
	}
	if (workflowFrozenResources(options)) {
		throw new WorkflowRunnerError(
			`workflow script file for node "${node.id}" was not captured in the workflow freeze: ${node.script.file}`,
		);
	}
	try {
		const code = await Bun.file(resolved).text();
		return {
			...node,
			script: {
				...node.script,
				code,
			},
		};
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new WorkflowRunnerError(`workflow script file for node "${node.id}" is not readable: ${reason}`);
	}
}

function nodeRequiresModel(node: WorkflowNode): boolean {
	return node.type === "agent" || node.type === "review" || node.model !== undefined;
}

function nodeConsumesPrompt(node: WorkflowNode): boolean {
	return node.type === "agent" || node.type === "review" || node.type === "human";
}

function workflowFrozenResources(options: WorkflowRunnerOptions): FlowFreezeResourceSnapshot[] | undefined {
	return options.frozenResources ?? options.lifecycle?.freeze.resourceSnapshots;
}

function findFrozenResourceSnapshot(
	snapshots: FlowFreezeResourceSnapshot[] | undefined,
	relativePath: string,
): FlowFreezeResourceSnapshot | undefined {
	if (!snapshots) return undefined;
	const normalized = relativePath.split(path.sep).join("/");
	return snapshots.find(snapshot => snapshot.path === normalized);
}
