import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { freezeWorkflowArtifact } from "../../src/workflow/freeze";
import { loadWorkflowArtifact } from "../../src/workflow/package-loader";

const tempDirs: string[] = [];
const workflowTestTempRoot = path.resolve(import.meta.dir, "../../../..", "temp", "workflow-tests");

async function createTempDir(): Promise<string> {
	await fs.mkdir(workflowTestTempRoot, { recursive: true });
	const dir = await fs.mkdtemp(path.join(workflowTestTempRoot, "omp-omhflow-dsl-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe(".omhflow structured DSL compiler", () => {
	it("compiles modules, sequence, parallel branches, and joins into a canonical graph", async () => {
		const dir = await createTempDir();
		await fs.mkdir(path.join(dir, "optimizer"), { recursive: true });
		const flowPath = path.join(dir, "optimizer.omhflow");
		await Bun.write(
			flowPath,
			`---
name: optimizer-flow
version: 1
schema: omhflow/v1
checkpoint:
  stopDeadlineMs: 50
changePolicy:
  agentsCanPropose: true
  humansCanApprove: true
---
# Optimizer Flow

\`\`\`yaml workflow
modules:
  integrateFeature:
    sequence:
      - node:
          id: integrate
          type: script
      - node:
          id: review
          type: review
          gates:
            - finish
sequence:
  - parallel:
      - node:
          id: tryTiling
          type: script
      - node:
          id: tryFusion
          type: script
    join:
      id: evaluate
      type: script
  - use: integrateFeature
\`\`\`
`,
		);

		const artifact = await loadWorkflowArtifact(flowPath);
		const freeze = await freezeWorkflowArtifact(artifact);

		expect(artifact.definition.nodes.map(node => [node.id, node.type, node.waitFor])).toEqual([
			["tryTiling", "script", undefined],
			["tryFusion", "script", undefined],
			["evaluate", "script", ["tryTiling", "tryFusion"]],
			["integrate", "script", undefined],
			["review", "review", undefined],
		]);
		expect(artifact.definition.edges.map(edge => [edge.from, edge.to])).toEqual([
			["tryTiling", "evaluate"],
			["tryFusion", "evaluate"],
			["evaluate", "integrate"],
			["integrate", "review"],
		]);
		expect(freeze.canonicalGraphHash).toStartWith("sha256:");
		expect(freeze.sourceMapping.nodes.evaluate).toMatchObject({ sourceBlock: "workflow:0" });
	});

	it("rejects module cycles before graph compilation", async () => {
		const dir = await createTempDir();
		await fs.mkdir(path.join(dir, "cyclic"), { recursive: true });
		const flowPath = path.join(dir, "cyclic.omhflow");
		await Bun.write(
			flowPath,
			flowSource(`
modules:
  loop:
    use: loop
use: loop
`),
		);

		await expect(loadWorkflowArtifact(flowPath)).rejects.toThrow('modules.loop.use creates a module cycle at "loop"');
	});

	it("rejects artifacts with multiple workflow blocks", async () => {
		const dir = await createTempDir();
		await fs.mkdir(path.join(dir, "multi"), { recursive: true });
		const flowPath = path.join(dir, "multi.omhflow");
		await Bun.write(
			flowPath,
			`${flowSource(`
nodes:
  build:
    type: script
edges: []
`)}

\`\`\`yaml workflow
nodes:
  review:
    type: review
edges: []
\`\`\`
`,
		);

		await expect(loadWorkflowArtifact(flowPath)).rejects.toThrow(
			".omhflow must contain exactly one fenced workflow block",
		);
	});
});

function flowSource(workflowBlock: string): string {
	return `---
name: test-flow
version: 1
schema: omhflow/v1
checkpoint:
  stopDeadlineMs: 50
changePolicy:
  agentsCanPropose: true
  humansCanApprove: true
---
# Test Flow

\`\`\`yaml workflow
${workflowBlock.trim()}
\`\`\`
`;
}
