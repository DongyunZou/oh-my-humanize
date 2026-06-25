const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
const idea = state.idea && typeof state.idea === "object" ? state.idea : {};
const input = idea.input && typeof idea.input === "object" ? idea.input : {};
const synthesis = idea.synthesis && typeof idea.synthesis === "object" ? idea.synthesis : {};
const outputPath = typeof input.outputPath === "string" && input.outputPath.trim() ? input.outputPath.trim() : undefined;
if (!outputPath) throw new Error("idea output path missing from workflow state");
assertSafeOutputPath(outputPath);
const draft = extractDraft(synthesis);
if (!draft.trim()) throw new Error("synthesizeIdeaDraft did not produce draft content");
if (!/^#\s+\S/mu.test(draft)) throw new Error("idea draft must start with a Markdown title");
await Bun.write(outputPath, ensureTrailingNewline(draft));
const result = {
	...idea,
	output: {
		path: outputPath,
		writtenAt: new Date().toISOString(),
		bytes: new TextEncoder().encode(draft).byteLength,
	},
};
return {
	summary: `Humanize idea draft written to ${outputPath}`,
	data: result,
	statePatch: [{ op: "set", path: "/idea", value: result }],
	artifacts: [`local://${outputPath}`],
};

function extractDraft(value) {
	if (typeof value === "string") return value;
	if (!value || typeof value !== "object" || Array.isArray(value)) return "";
	for (const key of ["draft", "content", "markdown", "summary"]) {
		if (typeof value[key] === "string" && value[key].trim()) return value[key];
	}
	return JSON.stringify(value, null, 2);
}

function assertSafeOutputPath(path) {
	if (path.includes("..")) throw new Error(`unsafe idea output path: ${path}`);
	if (!path.endsWith(".md")) throw new Error(`idea output path must be a Markdown file: ${path}`);
	if (path.startsWith("/") || /^[A-Za-z]:/u.test(path)) throw new Error(`idea output path must be relative: ${path}`);
}

function ensureTrailingNewline(text) {
	return text.endsWith("\n") ? text : `${text}\n`;
}
