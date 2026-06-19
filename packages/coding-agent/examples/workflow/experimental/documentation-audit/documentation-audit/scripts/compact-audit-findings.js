const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};

const auditDigest = {
	apiDocsAudit: compactSection("apiDocsAudit", state.apiDocsAudit),
	tutorialAudit: compactSection("tutorialAudit", state.tutorialAudit),
	examplesAudit: compactSection("examplesAudit", state.examplesAudit),
};

await Bun.write("workflow-output/documentation-audit-digest.md", digestMarkdown(auditDigest));

return {
	summary: "compacted documentation audit fan-in for bounded consolidation",
	data: auditDigest,
	statePatch: [{ op: "set", path: "/auditDigest", value: auditDigest }],
};

function compactSection(name, value) {
	const text = stableString(value);
	return {
		source: name,
		originalChars: text.length,
		excerpt: truncateMiddle(text, 6000),
		truncated: text.length > 6000,
	};
}

function stableString(value) {
	if (typeof value === "string") return value;
	try {
		return JSON.stringify(value, sortObjectKeys, 2);
	} catch {
		return String(value);
	}
}

function sortObjectKeys(_key, value) {
	if (Array.isArray(value) || value === null || typeof value !== "object") return value;
	const sorted = {};
	for (const key of Object.keys(value).sort()) sorted[key] = value[key];
	return sorted;
}

function truncateMiddle(text, maxChars) {
	if (text.length <= maxChars) return text;
	const half = Math.floor((maxChars - 80) / 2);
	return `${text.slice(0, half)}\n\n...[omitted ${text.length - maxChars} chars]...\n\n${text.slice(-half)}`;
}

function digestMarkdown(digest) {
	const lines = ["# Documentation Audit Digest", ""];
	for (const [name, section] of Object.entries(digest)) {
		lines.push(`## ${name}`, "", `Original chars: ${section.originalChars}`, `Truncated: ${section.truncated}`, "", "```json");
		lines.push(section.excerpt);
		lines.push("```", "");
	}
	return lines.join("\n");
}
