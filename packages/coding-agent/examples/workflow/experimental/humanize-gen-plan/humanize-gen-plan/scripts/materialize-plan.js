const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
const plan = state.plan && typeof state.plan === "object" ? state.plan : {};
const request = plan.request && typeof plan.request === "object" ? plan.request : {};
const outputPath = typeof request.outputPath === "string" && request.outputPath.trim() ? request.outputPath.trim() : "plan.md";
assertSafeOutputPath(outputPath);
const relevanceActivation = latestCompletedOutput("relevanceCheck");
const relevanceVerdict = relevanceActivation?.data?.verdict ?? relevanceActivation?.verdict;
if (relevanceVerdict === "NOT_RELEVANT") {
	const rejection = notRelevantDocument(request, relevanceActivation);
	await Bun.write(outputPath, rejection);
	return finish(plan, outputPath, rejection, "wrote NOT_RELEVANT planning report");
}
const final = plan.final && typeof plan.final === "object" ? plan.final : {};
const markdown = extractMarkdown(final);
if (!markdown.trim()) throw new Error("finalPlan did not produce plan markdown");
assertPlanSchema(markdown);
const body = ensureOriginalDraft(markdown, request.draft);
await Bun.write(outputPath, body);
return finish({ ...plan, final: { ...final, markdown: body } }, outputPath, body, `Humanize plan written to ${outputPath}`);

function finish(nextPlan, outputPath, body, summary) {
	const result = {
		...nextPlan,
		output: {
			path: outputPath,
			writtenAt: new Date().toISOString(),
			bytes: new TextEncoder().encode(body).byteLength,
		},
	};
	return {
		summary,
		data: result,
		statePatch: [{ op: "set", path: "/plan", value: result }],
		artifacts: [`local://${outputPath}`],
	};
}

function extractMarkdown(value) {
	if (typeof value === "string") return value;
	for (const key of ["plan", "markdown", "content", "summary"]) {
		if (typeof value[key] === "string" && value[key].trim()) return value[key];
	}
	return JSON.stringify(value, null, 2);
}

function assertPlanSchema(markdown) {
	const required = [
		"## Goal Description",
		"## Acceptance Criteria",
		"## Path Boundaries",
		"## Feasibility Hints and Suggestions",
		"## Dependencies and Sequence",
		"## Task Breakdown",
		"## Claude-Codex Deliberation",
		"## Pending User Decisions",
		"## Implementation Notes",
	];
	const missing = required.filter(section => !markdown.includes(section));
	if (missing.length > 0) throw new Error(`generated plan missing required sections: ${missing.join(", ")}`);
	if (!/AC-\d+/u.test(markdown)) throw new Error("generated plan must contain AC-X acceptance criteria");
	if (!/\|\s*Task ID\s*\|/u.test(markdown)) throw new Error("generated plan must contain task breakdown table");
}

function ensureOriginalDraft(markdown, draft) {
	const trimmed = markdown.trimEnd();
	if (trimmed.includes("--- Original Design Draft Start ---")) return `${trimmed}\n`;
	return `${trimmed}\n\n--- Original Design Draft Start ---\n\n${draft ?? ""}\n\n--- Original Design Draft End ---\n`;
}

function notRelevantDocument(request, relevanceOutput) {
	const reason = typeof relevanceOutput?.summary === "string" ? relevanceOutput.summary : "Draft was judged unrelated to this repository.";
	return `# Humanize Gen Plan Relevance Rejection\n\n## Status\n\nNOT_RELEVANT\n\n## Reason\n\n${reason}\n\n## Original Draft\n\n${request.draft ?? ""}\n`;
}

function latestCompletedOutput(nodeId) {
	return workflowContext.completedActivations.filter(a => a.nodeId === nodeId && a.status === "completed").at(-1)?.output;
}

function assertSafeOutputPath(path) {
	if (path.includes("..")) throw new Error(`unsafe plan output path: ${path}`);
	if (!path.endsWith(".md")) throw new Error(`plan output path must be a Markdown file: ${path}`);
	if (path.startsWith("/") || /^[A-Za-z]:/u.test(path)) throw new Error(`plan output path must be relative: ${path}`);
}
