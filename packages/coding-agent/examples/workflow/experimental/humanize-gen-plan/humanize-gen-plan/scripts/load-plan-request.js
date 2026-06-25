const request = await loadPlanRequest();
const payload = {
	request: {
		draft: request.draft,
		inputPath: request.inputPath,
		outputPath: request.outputPath,
		mode: request.mode,
		autoStartRlcrIfConverged: request.autoStartRlcrIfConverged,
		loadedAt: new Date().toISOString(),
	},
};
return {
	summary: `loaded Humanize plan request for ${request.outputPath}`,
	statePatch: [{ op: "set", path: "/plan", value: payload }],
};

async function loadPlanRequest() {
	const humanRequest = readHumanRequest();
	if (humanRequest) return normalizeRequest(humanRequest);
	const jsonRequest = await readJsonRequest();
	if (jsonRequest) return normalizeRequest(jsonRequest);
	const draft = await readOptionalText("draft.md");
	if (draft.trim()) return normalizeRequest({ inputPath: "draft.md", outputPath: "plan.md", draft });
	const idea = await readOptionalText("idea.md");
	if (idea.trim()) return normalizeRequest({ inputPath: "idea.md", outputPath: "plan.md", draft: idea });
	throw new Error("humanize-gen-plan requires a human response, .humanize/gen-plan-request.json, draft.md, or idea.md in the project root");
}

function readHumanRequest() {
	const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
	const plan = state.plan && typeof state.plan === "object" ? state.plan : {};
	const request = plan.requestInput && typeof plan.requestInput === "object" ? plan.requestInput : undefined;
	const raw = request?.data && typeof request.data === "object" ? request.data.response : request?.response;
	if (typeof raw !== "string" || !raw.trim()) return null;
	return parseLooseRequest(raw);
}

function parseLooseRequest(text) {
	const trimmed = text.trim();
	if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
	const result = { draft: trimmed };
	const lines = trimmed.split(/\r?\n/u);
	const draftLines = [];
	let sawField = false;
	for (const line of lines) {
		const match = /^(draft|body|prompt|inputPath|input|outputPath|output|mode|autoStartRlcrIfConverged)\s*:\s*(.*)$/iu.exec(line);
		if (!match) {
			draftLines.push(line);
			continue;
		}
		sawField = true;
		const key = match[1].toLowerCase();
		const value = match[2].trim();
		if (key === "output") result.outputPath = value;
		else if (key === "input") result.inputPath = value;
		else if (key === "prompt" || key === "body") result.draft = value;
		else if (key === "autostartrlcrifconverged") result.autoStartRlcrIfConverged = value === "true";
		else result[key] = value;
	}
	if (sawField && draftLines.join("\n").trim()) result.draft = draftLines.join("\n").trim();
	return result;
}

async function readJsonRequest() {
	const text = await readOptionalText(".humanize/gen-plan-request.json");
	if (!text.trim()) return null;
	try {
		return JSON.parse(text);
	} catch (error) {
		throw new Error(`invalid .humanize/gen-plan-request.json: ${error instanceof Error ? error.message : String(error)}`);
	}
}

function normalizeRequest(raw) {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("gen plan request must be an object");
	const draft = typeof raw.draft === "string" ? raw.draft : typeof raw.body === "string" ? raw.body : "";
	if (!draft.trim()) throw new Error("gen plan draft must be a non-empty string");
	const inputPath = typeof raw.inputPath === "string" && raw.inputPath.trim() ? raw.inputPath.trim() : "draft.md";
	const outputPath = typeof raw.outputPath === "string" && raw.outputPath.trim() ? raw.outputPath.trim() : "plan.md";
	assertSafeOutputPath(outputPath);
	const mode = raw.mode === "direct" ? "direct" : "discussion";
	return {
		draft,
		inputPath,
		outputPath,
		mode,
		autoStartRlcrIfConverged: raw.autoStartRlcrIfConverged === true,
	};
}

function assertSafeOutputPath(path) {
	if (path.includes("..")) throw new Error(`unsafe plan output path: ${path}`);
	if (!path.endsWith(".md")) throw new Error(`plan output path must be a Markdown file: ${path}`);
	if (path.startsWith("/") || /^[A-Za-z]:/u.test(path)) throw new Error(`plan output path must be relative: ${path}`);
}

async function readOptionalText(path) {
	try {
		return await Bun.file(path).text();
	} catch {
		return "";
	}
}
