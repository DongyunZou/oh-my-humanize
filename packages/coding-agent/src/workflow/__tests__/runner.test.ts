import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { $ } from "bun";
import type { WorkflowDefinition } from "../definition";
import type { FlowFreeze } from "../freeze";
import type { RuntimeBindingSnapshot, WorkflowLifecycleBranchEntry } from "../lifecycle";
import { reconstructWorkflowFamilies } from "../lifecycle";
import type { WorkflowNodeRuntimeHost } from "../node-runtime";
import { runWorkflow } from "../runner";
import type { WorkflowActivation } from "../scheduler";
import { assertWorkflowCheckpointWorkspaceMatches } from "../workspace-checkpoint";

describe("runWorkflow lifecycle", () => {
	it("creates a restartable checkpoint when an activation fails", async () => {
		const host = new MemoryWorkflowHost();
		const definition = failureRecoveryDefinition();
		const freeze = freezeForDefinition(definition);
		let failMiddleNode = true;
		const runtimeHost: WorkflowNodeRuntimeHost = {
			runScriptNode: async input => {
				if (input.node.id === "middle" && failMiddleNode) {
					throw new Error("middle exploded");
				}
				if (input.node.id === "setup") {
					return {
						summary: "setup complete",
						statePatch: [{ op: "set", path: "/ready", value: true }],
					};
				}
				if (input.node.id === "middle") {
					return {
						summary: "middle recovered",
						statePatch: [{ op: "set", path: "/middleRecovered", value: true }],
					};
				}
				return {
					summary: "finished",
					statePatch: [{ op: "set", path: "/done", value: true }],
				};
			},
		};

		const firstRun = await runWorkflow({
			host,
			definition,
			runId: "run-1",
			graphRevisionId: "graph-1",
			startNodeId: "setup",
			runtimeHost,
			lifecycle: {
				familyId: "family-1",
				attemptId: "attempt-1",
				freeze,
				runtimeBindingSnapshot: bindingSnapshot("attempt-1:binding-1"),
			},
		});

		const failedFamily = reconstructWorkflowFamilies(host.getBranch())[0]!;
		const failedAttempt = failedFamily.attempts[0]!;
		expect(failedAttempt.status).toBe("failed");
		expect(failedAttempt.error).toContain("middle exploded");
		expect(failedFamily.checkpoints).toHaveLength(1);
		expect(failedFamily.checkpoints[0]).toMatchObject({
			id: "attempt-1:checkpoint-1",
			attemptId: "attempt-1",
			frontierNodeIds: ["middle"],
			state: { ready: true },
			sourceMapping: { middle: "middle" },
		});
		expect(failedFamily.checkpoints[0]!.completedActivationIds).toEqual(["activation-1"]);

		failMiddleNode = false;
		const completedActivations = firstRun.scheduler.activations.filter(
			(activation): activation is WorkflowActivation => activation.status === "completed",
		);
		await runWorkflow({
			host,
			definition,
			runId: "run-2",
			graphRevisionId: "graph-2",
			startNodeId: "middle",
			startNodeIds: ["middle"],
			startParentActivationIds: failedFamily.checkpoints[0]!.completedActivationIds,
			initialState: failedFamily.checkpoints[0]!.state,
			completedActivations,
			runtimeHost,
			lifecycle: {
				familyId: "family-1",
				attemptId: "attempt-2",
				checkpointId: failedFamily.checkpoints[0]!.id,
				freeze,
				runtimeBindingSnapshot: bindingSnapshot("attempt-2:binding-1"),
				recordFamily: false,
				recordFreeze: false,
			},
		});

		const recoveredFamily = reconstructWorkflowFamilies(host.getBranch())[0]!;
		const recoveredAttempt = recoveredFamily.attempts[1]!;
		expect(recoveredAttempt.status).toBe("completed");
		expect(recoveredAttempt.checkpointId).toBe("attempt-1:checkpoint-1");
		expect(recoveredAttempt.activations.map(activation => activation.nodeId)).toEqual(["middle", "after"]);
	});

	it("records the workspace snapshot when a stopped activation leaves dirty files", async () => {
		const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "omp-workflow-checkpoint-workspace-"));
		try {
			await initializeGitWorkspace(workspace);
			const host = new MemoryWorkflowHost();
			const definition = stoppedWorkspaceDefinition();
			const freeze = freezeForDefinition(definition);
			const controller = new AbortController();
			const wrotePartialFile = Promise.withResolvers<void>();
			const runtimeHost: WorkflowNodeRuntimeHost = {
				runScriptNode: async input => {
					await Bun.write(path.join(workspace, "src", "partial.ts"), "export const partial = true;\n");
					wrotePartialFile.resolve();
					const parked = Promise.withResolvers<never>();
					input.signal?.addEventListener("abort", () => parked.reject(new Error("workflow activation stopped")), {
						once: true,
					});
					return parked.promise;
				},
			};

			const runPromise = runWorkflow({
				host,
				definition,
				runId: "run-1",
				graphRevisionId: "graph-1",
				startNodeId: "writePartial",
				runtimeHost,
				workspaceRoot: workspace,
				signal: controller.signal,
				nodeAbortSignal: controller.signal,
				lifecycle: {
					familyId: "family-1",
					attemptId: "attempt-1",
					freeze,
					runtimeBindingSnapshot: bindingSnapshot("attempt-1:binding-1"),
				},
			});
			await wrotePartialFile.promise;
			controller.abort("operator stop");
			await runPromise;

			const checkpoint = reconstructWorkflowFamilies(host.getBranch())[0]?.checkpoints[0];
			expect(checkpoint?.abortedActivationIds).toEqual(["activation-1"]);
			expect(checkpoint?.workspace).toMatchObject({
				kind: "git",
				status: "dirty",
				dirtyPaths: ["src/partial.ts"],
			});
			expect(checkpoint?.workspace?.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
		} finally {
			await fs.rm(workspace, { recursive: true, force: true });
		}
	});

	it("rejects restart validation when the checkpoint workspace snapshot no longer matches", async () => {
		const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "omp-workflow-checkpoint-restart-"));
		try {
			await initializeGitWorkspace(workspace);
			const host = new MemoryWorkflowHost();
			const definition = stoppedWorkspaceDefinition();
			const freeze = freezeForDefinition(definition);
			const controller = new AbortController();
			const wrotePartialFile = Promise.withResolvers<void>();
			const runtimeHost: WorkflowNodeRuntimeHost = {
				runScriptNode: async input => {
					await Bun.write(path.join(workspace, "src", "partial.ts"), "export const partial = true;\n");
					wrotePartialFile.resolve();
					const parked = Promise.withResolvers<never>();
					input.signal?.addEventListener("abort", () => parked.reject(new Error("workflow activation stopped")), {
						once: true,
					});
					return parked.promise;
				},
			};

			const runPromise = runWorkflow({
				host,
				definition,
				runId: "run-1",
				graphRevisionId: "graph-1",
				startNodeId: "writePartial",
				runtimeHost,
				workspaceRoot: workspace,
				signal: controller.signal,
				nodeAbortSignal: controller.signal,
				lifecycle: {
					familyId: "family-1",
					attemptId: "attempt-1",
					freeze,
					runtimeBindingSnapshot: bindingSnapshot("attempt-1:binding-1"),
				},
			});
			await wrotePartialFile.promise;
			controller.abort("operator stop");
			await runPromise;

			const checkpoint = reconstructWorkflowFamilies(host.getBranch())[0]?.checkpoints[0];
			if (checkpoint === undefined) throw new Error("expected workflow checkpoint");
			await expect(assertWorkflowCheckpointWorkspaceMatches(checkpoint, workspace)).resolves.toBeUndefined();

			await Bun.write(path.join(workspace, "src", "unexpected.ts"), "export const unexpected = true;\n");
			await expect(assertWorkflowCheckpointWorkspaceMatches(checkpoint, workspace)).rejects.toThrow(
				"Workflow checkpoint workspace state does not match current workspace",
			);
		} finally {
			await fs.rm(workspace, { recursive: true, force: true });
		}
	});
});

class MemoryWorkflowHost {
	#entries: WorkflowLifecycleBranchEntry[] = [];

	appendCustomEntry(customType: string, data?: unknown): string {
		const id = `entry-${this.#entries.length + 1}`;
		this.#entries.push({ type: "custom", customType, data });
		return id;
	}

	getBranch(): WorkflowLifecycleBranchEntry[] {
		return this.#entries;
	}
}

function failureRecoveryDefinition(): WorkflowDefinition {
	return {
		name: "failure-recovery",
		version: 1,
		models: { roles: {}, defaults: {} },
		nodes: [
			{
				id: "setup",
				type: "script",
				script: { language: "sh", code: "setup" },
				writes: ["/ready"],
			},
			{
				id: "middle",
				type: "script",
				script: { language: "sh", code: "middle" },
				writes: ["/middleRecovered"],
			},
			{
				id: "after",
				type: "script",
				script: { language: "sh", code: "after" },
				writes: ["/done"],
			},
		],
		edges: [
			{ from: "setup", to: "middle" },
			{ from: "middle", to: "after" },
		],
	};
}

function stoppedWorkspaceDefinition(): WorkflowDefinition {
	return {
		name: "stopped-workspace",
		version: 1,
		models: { roles: {}, defaults: {} },
		nodes: [
			{
				id: "writePartial",
				type: "script",
				script: { language: "sh", code: "write partial" },
			},
		],
		edges: [],
	};
}

function freezeForDefinition(definition: WorkflowDefinition): FlowFreeze {
	return {
		id: "flowfreeze:test",
		schemaVersion: "omhflow/v1",
		flowPath: "/tmp/failure-recovery.omhflow",
		resourceDir: "/tmp/failure-recovery",
		mainContentHash: "sha256:main",
		resourceHashes: [],
		resourceSnapshots: [],
		canonicalGraphHash: "sha256:graph",
		sourceMapping: { workflowBlocks: [], nodes: {} },
		staticCheckReport: { status: "passed", checks: [{ name: "test", status: "passed" }] },
		portableDefaults: { models: definition.models },
		checkpointPolicy: { stopDeadlineMs: 0 },
		changePolicy: { agentsCanPropose: true, humansCanApprove: true },
		definition,
	};
}

function bindingSnapshot(id: string): RuntimeBindingSnapshot {
	return {
		id,
		requestedRoles: {},
		resolvedModels: {},
		tools: ["script"],
		agents: [],
		unavailable: [],
		warnings: [],
	};
}

async function initializeGitWorkspace(workspace: string): Promise<void> {
	await $`git init`.cwd(workspace).quiet();
	await Bun.write(path.join(workspace, "README.md"), "baseline\n");
	await $`git add README.md`.cwd(workspace).quiet();
	await $`git -c user.name=omh-test -c user.email=omh-test@example.invalid -c commit.gpgsign=false commit -m baseline`
		.cwd(workspace)
		.quiet();
}
