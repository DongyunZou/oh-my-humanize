import { describe, expect, it } from "bun:test";
import * as path from "node:path";

interface WorkflowActivationOutput {
	summary?: string;
	data?: {
		response?: string;
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

interface OperatorGateStatePatch {
	op: "set";
	path: string;
	value: {
		decision?: string;
		strength?: string;
		reasons?: string[];
		response?: string;
	};
}

interface ScriptResult {
	summary: string;
	statePatch: OperatorGateStatePatch[];
}

const AsyncFunctionConstructor = Object.getPrototypeOf(async () => {}).constructor as new (
	workflowContextName: string,
	code: string,
) => (workflowContext: WorkflowContext) => Promise<ScriptResult>;

describe("humanize-rlcr flow contract", () => {
	it("accepts canary evidence-class acknowledgement as an explicit proceed gate", async () => {
		const result = await runRecordOperatorGate(
			[
				"Decision: proceed.",
				"Scope is Axum routing, extractor, response, service boundary, and axum-extra test work.",
				"The components connect through Router, MethodRouter, State, FromRef, rejection ordering, and Tower service request handling.",
				"This is a canary-grade real development run; if it completes quickly, archive it honestly as short semantic evidence and enlarge the next real task.",
			].join("\n"),
		);

		const gate = result.statePatch.find(patch => patch.path === "/humanize/operatorGate")?.value;

		expect(gate).toMatchObject({
			decision: "proceed",
			strength: "explicit",
			reasons: [],
		});
	});

	it("keeps plain approval held until the operator gives a concrete proceed decision", async () => {
		const result = await runRecordOperatorGate("Approve.");

		const gate = result.statePatch.find(patch => patch.path === "/humanize/operatorGate")?.value;

		expect(gate).toMatchObject({
			decision: "hold",
			strength: "weak",
			reasons: ["approval is not an explicit proceed decision"],
		});
	});
});

async function runRecordOperatorGate(response: string): Promise<ScriptResult> {
	const scriptPath = path.resolve(
		import.meta.dir,
		"../../examples/workflow/experimental/humanize-rlcr/humanize-rlcr/scripts/record-operator-gate.js",
	);
	const script = await Bun.file(scriptPath).text();
	const execute = new AsyncFunctionConstructor("workflowContext", script);
	return execute({
		activation: { id: "activation-record" },
		completedActivations: [
			{
				id: "activation-human",
				nodeId: "planUnderstandingQuiz",
				output: {
					summary: response,
					data: { response },
				},
			},
		],
	});
}
