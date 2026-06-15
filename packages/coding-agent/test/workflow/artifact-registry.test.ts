import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	getBuiltinWorkflowRoot,
	installWorkflowArtifact,
	listWorkflowFlowSpecs,
	resolveWorkflowFlowSpec,
	uninstallWorkflowArtifact,
} from "../../src/workflow/artifact-registry";
import { freezeWorkflowArtifact } from "../../src/workflow/freeze";
import { loadWorkflowArtifact } from "../../src/workflow/package-loader";
import { reconstructWorkflowRuns, type WorkflowRunStoreHost } from "../../src/workflow/run-store";
import { runWorkflow } from "../../src/workflow/runner";
import {
	createSessionWorkflowRuntimeHost,
	type WorkflowScriptEvalRequest,
	type WorkflowScriptEvalResult,
} from "../../src/workflow/session-runtime";

const tempDirs: string[] = [];

interface CapturedEntry {
	type: "custom";
	customType: string;
	data?: unknown;
}

async function createTempDir(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "omp-workflow-registry-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe("workflow artifact registry", () => {
	it("resolves and freezes bundled practical workflow artifacts by name", async () => {
		const expected = [
			"humanize-rlcr",
			"kda-humanize-reference",
			"parallel-weak-implementation",
			"agent-build-review-loop",
			"human-interactive-dev",
			"recflow-audit-events-cockpit",
			"branch-conditional",
			"loop-until-done",
			"parallel-join",
		];

		for (const name of expected) {
			const spec = await resolveWorkflowFlowSpec(name, { cwd: process.cwd(), flowDirs: [] });

			expect(spec).toMatchObject({
				kind: "named",
				name,
				source: "builtin",
			});
			expect(spec.path).toBe(path.join(getBuiltinWorkflowRoot(), name, `${name}.omhflow`));
			await expect(freezeWorkflowArtifact(await loadWorkflowArtifact(spec.path))).resolves.toMatchObject({
				definition: { name },
			});
		}
	});

	it("runs bundled control-flow primitive artifacts in a generic workspace", async () => {
		for (const name of ["branch-conditional", "loop-until-done", "parallel-join"]) {
			const spec = await resolveWorkflowFlowSpec(name, { cwd: process.cwd(), flowDirs: [] });
			const artifact = await loadWorkflowArtifact(spec.path);
			const freeze = await freezeWorkflowArtifact(artifact);
			const taskDir = await createTempDir();
			await Bun.write(
				path.join(taskDir, "task.md"),
				[
					"# Primitive built-in smoke",
					"",
					"## Objective",
					"",
					`Run ${name} in a generic workspace with no project-specific binaries.`,
				].join("\n"),
			);
			const host = createRunHost();

			const result = await runWorkflow({
				host,
				definition: freeze.definition,
				runId: `${name}-generic`,
				startNodeId: freeze.definition.nodes[0]?.id ?? "",
				runtimeHost: createSessionWorkflowRuntimeHost({
					cwd: taskDir,
					runEvalScript: request => runBunWorkflowScript(taskDir, request),
				}),
				packageRoot: artifact.resourceDir,
				frozenResources: freeze.resourceSnapshots,
				maxActivations: 16,
			});

			expect(result.scheduler.activations.every(activation => activation.status === "completed")).toBe(true);
			expect(result.scheduler.frontierNodeIds).toEqual([]);
			expect(reconstructWorkflowRuns(host.getBranch())[0]?.state).toBeDefined();
			await expect(Bun.file(path.join(taskDir, "workflow-output", "task-report.md")).text()).resolves.toContain(
				"Status: passed",
			);
		}
	});

	it("treats explicit paths as paths even when the basename matches an installed flow name", async () => {
		const dir = await createTempDir();
		const flowPath = await writeFlowArtifact(dir, "humanize-rlcr");

		const spec = await resolveWorkflowFlowSpec("./humanize-rlcr.omhflow", { cwd: dir, flowDirs: [] });

		expect(spec).toEqual({ kind: "path", input: "./humanize-rlcr.omhflow", path: flowPath });
	});

	it("keeps infrastructure usable without bundled flow artifacts when a path is supplied", async () => {
		const dir = await createTempDir();
		const missingBuiltinRoot = path.join(dir, "missing-builtins");
		const flowPath = await writeFlowArtifact(dir, "standalone-flow");

		await expect(listWorkflowFlowSpecs({ builtinRoot: missingBuiltinRoot, flowDirs: [] })).resolves.toEqual([]);
		await expect(
			resolveWorkflowFlowSpec(flowPath, { cwd: dir, builtinRoot: missingBuiltinRoot, flowDirs: [] }),
		).resolves.toEqual({ kind: "path", input: flowPath, path: flowPath });
		await expect(freezeWorkflowArtifact(await loadWorkflowArtifact(flowPath))).resolves.toMatchObject({
			definition: { name: "standalone-flow" },
		});
	});

	it("resolves OMHFLOW_DIR names from flat and nested artifact layouts", async () => {
		const flatRoot = await createTempDir();
		const nestedRoot = await createTempDir();
		const flatPath = await writeFlowArtifact(flatRoot, "flat-flow");
		const nestedPath = await writeFlowArtifact(path.join(nestedRoot, "nested-flow"), "nested-flow");

		await expect(resolveWorkflowFlowSpec("flat-flow", { cwd: process.cwd(), flowDirs: [flatRoot] })).resolves.toEqual(
			{
				kind: "named",
				input: "flat-flow",
				name: "flat-flow",
				path: flatPath,
				root: flatRoot,
				source: "omhflow-dir",
			},
		);
		await expect(
			resolveWorkflowFlowSpec("nested-flow", { cwd: process.cwd(), flowDirs: [nestedRoot] }),
		).resolves.toEqual({
			kind: "named",
			input: "nested-flow",
			name: "nested-flow",
			path: nestedPath,
			root: nestedRoot,
			source: "omhflow-dir",
		});
	});

	it("rejects ambiguous external flow names across multiple OMHFLOW_DIR roots", async () => {
		const left = await createTempDir();
		const right = await createTempDir();
		await writeFlowArtifact(path.join(left, "dupe-flow"), "dupe-flow");
		await writeFlowArtifact(path.join(right, "dupe-flow"), "dupe-flow");

		await expect(
			resolveWorkflowFlowSpec("dupe-flow", { cwd: process.cwd(), flowDirs: [left, right] }),
		).rejects.toThrow(/workflow flow "dupe-flow" is ambiguous/);
	});

	it("installs, lists, and uninstalls distributable .omhflow artifacts in the target flow dir", async () => {
		const sourceRoot = await createTempDir();
		const installRoot = await createTempDir();
		const sourcePath = await writeFlowArtifact(sourceRoot, "installed-flow", {
			resourcePath: "prompts/task.md",
			resourceText: "Do the installed task.\n",
		});

		const installed = await installWorkflowArtifact(sourcePath, {
			flowDirs: [installRoot],
		});
		const listed = await listWorkflowFlowSpecs({ flowDirs: [installRoot] });
		const resolved = await resolveWorkflowFlowSpec("installed-flow", { cwd: process.cwd(), flowDirs: [installRoot] });
		const uninstall = await uninstallWorkflowArtifact("installed-flow", { flowDirs: [installRoot] });

		expect(installed).toMatchObject({
			name: "installed-flow",
			path: path.join(installRoot, "installed-flow", "installed-flow.omhflow"),
			root: installRoot,
		});
		expect(listed.map(flow => [flow.name, flow.source])).toContainEqual(["installed-flow", "omhflow-dir"]);
		expect(resolved.path).toBe(installed.path);
		expect(uninstall.path).toBe(installed.path);
		expect(await Bun.file(installed.path).exists()).toBe(false);
	});

	it("refuses to uninstall built-in flows from the user flow directory command", async () => {
		const installRoot = await createTempDir();

		await expect(uninstallWorkflowArtifact("humanize-rlcr", { flowDirs: [installRoot] })).rejects.toThrow(
			'built-in workflow flow "humanize-rlcr" cannot be uninstalled',
		);
	});
});

function createRunHost(): WorkflowRunStoreHost & { entries: CapturedEntry[] } {
	const entries: CapturedEntry[] = [];
	return {
		entries,
		appendCustomEntry: (customType, data) => {
			entries.push({ type: "custom", customType, data });
			return `entry-${entries.length}`;
		},
		getBranch: () => entries,
	};
}

async function runBunWorkflowScript(
	cwd: string,
	request: WorkflowScriptEvalRequest,
): Promise<WorkflowScriptEvalResult> {
	const scriptPath = path.join(cwd, `.workflow-${request.activationId}.js`);
	await Bun.write(scriptPath, request.code);
	const proc = Bun.spawn([process.execPath, scriptPath], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return {
		exitCode,
		output: [stdout, stderr]
			.filter(text => text.trim().length > 0)
			.join("\n")
			.trim(),
		language: request.language,
		...(exitCode === 0 ? {} : { error: stderr.trim() || stdout.trim() || `exit code ${exitCode}` }),
	};
}

async function writeFlowArtifact(
	root: string,
	name: string,
	resource?: { resourcePath: string; resourceText: string },
): Promise<string> {
	await fs.mkdir(path.join(root, name), { recursive: true });
	if (resource !== undefined) {
		await Bun.write(path.join(root, name, resource.resourcePath), resource.resourceText);
	}
	const resources =
		resource === undefined
			? ""
			: `resources:
  - path: ${resource.resourcePath}
    kind: prompt
`;
	const flowPath = path.join(root, `${name}.omhflow`);
	await Bun.write(
		flowPath,
		`---
name: ${name}
version: 1
schema: omhflow/v1
checkpoint:
  stopDeadlineMs: 50
changePolicy:
  agentsCanPropose: true
  humansCanApprove: true
---

\`\`\`yaml workflow
${resources}nodes:
  build:
    type: script
    script:
      inline: |
        return { summary: "built ${name}" };
edges: []
\`\`\`
`,
	);
	return flowPath;
}
