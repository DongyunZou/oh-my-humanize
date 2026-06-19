import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

interface WorkflowActivationOutput {
	summary?: string;
	data?: {
		verdict?: string;
	};
}

interface WorkflowActivation {
	id: string;
	nodeId: string;
	output?: WorkflowActivationOutput;
}

interface WorkflowContext {
	activation: {
		id: string;
	};
	completedActivations: WorkflowActivation[];
}

interface ReviewRouteResult {
	summary: string;
	data: {
		decision: string;
		reason: string;
		setupBlockerEvidenceFiles: string[];
		reviewVerdict?: string;
	};
	statePatch: Array<{
		op: "set";
		path: string;
		value: ReviewRouteResult["data"];
	}>;
}

const AsyncFunctionConstructor = Object.getPrototypeOf(async () => {}).constructor as new (
	workflowContextName: string,
	code: string,
) => (workflowContext: WorkflowContext) => Promise<ReviewRouteResult>;

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe("agent-build-review-loop flow contract", () => {
	it("routes explicit setup-blocker evidence to reject instead of another build round", async () => {
		const cwd = await createTempDir();
		await fs.mkdir(path.join(cwd, "workflow-output"), { recursive: true });
		await Bun.write(
			path.join(cwd, "workflow-output", "setup-blocker-evidence.json"),
			JSON.stringify({ status: "setup-blocker", reason: "validation dependencies missing" }),
		);

		const result = await runReviewRouteClassifier(cwd, {
			verdict: "continue",
			summary: "Validation dependencies are missing, so another build round should investigate.",
		});

		expect(result.data).toMatchObject({
			decision: "reject",
			reviewVerdict: "continue",
			setupBlockerEvidenceFiles: ["workflow-output/setup-blocker-evidence.json"],
		});
		expect(result.summary).toContain("setup blocker");
	});

	it("preserves an ordinary continue review when no setup blocker evidence exists", async () => {
		const cwd = await createTempDir();
		await fs.mkdir(path.join(cwd, "workflow-output"), { recursive: true });

		const result = await runReviewRouteClassifier(cwd, {
			verdict: "continue",
			summary: "Validation failed because the implementation needs another focused fix.",
		});

		expect(result.data).toMatchObject({
			decision: "continue",
			reviewVerdict: "continue",
			setupBlockerEvidenceFiles: [],
		});
	});
});

async function runReviewRouteClassifier(
	cwd: string,
	reviewOutput: { verdict: string; summary: string },
): Promise<ReviewRouteResult> {
	const scriptPath = path.resolve(
		import.meta.dir,
		"../../examples/workflow/experimental/agent-build-review-loop/agent-build-review-loop/scripts/classify-review-route.js",
	);
	const script = await Bun.file(scriptPath).text();
	const execute = new AsyncFunctionConstructor("workflowContext", script);
	const originalCwd = process.cwd();
	try {
		process.chdir(cwd);
		return await execute({
			activation: { id: "activation-classify-review" },
			completedActivations: [
				{
					id: "activation-review",
					nodeId: "reviewRound",
					output: {
						summary: reviewOutput.summary,
						data: { verdict: reviewOutput.verdict },
					},
				},
			],
		});
	} finally {
		process.chdir(originalCwd);
	}
}

async function createTempDir(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "omh-agent-loop-contract-"));
	tempDirs.push(dir);
	return dir;
}
