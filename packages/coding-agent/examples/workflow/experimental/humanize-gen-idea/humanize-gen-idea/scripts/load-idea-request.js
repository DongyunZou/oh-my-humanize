const request = await loadIdeaRequest();
const now = new Date();
const outputPath = request.outputPath || defaultOutputPath(request.slug, now);
const n = normalizeDirectionCount(request.n);
const payload = {
	input: {
		mode: request.mode,
		body: request.body,
		sourcePath: request.sourcePath,
		slug: request.slug,
		n,
		outputPath,
		loadedAt: now.toISOString(),
	},
};

return {
	summary: `loaded Humanize idea request for ${n} directed exploration lanes`,
	statePatch: [{ op: "set", path: "/idea", value: payload }],
};

async function loadIdeaRequest() {
	const humanRequest = readHumanRequest();
	if (humanRequest) return normalizeJsonRequest(humanRequest);
	const jsonRequest = await readJsonRequest();
	if (jsonRequest) return normalizeJsonRequest(jsonRequest);
	const draftText = await readOptionalText("idea.md");
	if (draftText.trim()) {
		return normalizeJsonRequest({ mode: "file", body: draftText, sourcePath: "idea.md" });
	}
	const taskText = await readOptionalText("task.md");
	if (taskText.trim()) {
		return normalizeJsonRequest({ mode: "file", body: taskText, sourcePath: "task.md" });
	}
	throw new Error(
		"humanize-gen-idea requires a human response, .humanize/gen-idea-request.json, idea.md, or task.md in the project root",
	);
}

function readHumanRequest() {
	const state = workflowContext.state && typeof workflowContext.state === "object" ? workflowContext.state : {};
	const idea = state.idea && typeof state.idea === "object" ? state.idea : {};
	const request = idea.request && typeof idea.request === "object" ? idea.request : undefined;
	const raw = request?.data && typeof request.data === "object" ? request.data.response : request?.response;
	if (typeof raw !== "string" || !raw.trim()) return null;
	return parseLooseRequest(raw, { bodyKey: "body", defaultOutputPath: undefined });
}

function parseLooseRequest(text, options) {
	const trimmed = text.trim();
	if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
	const result = { [options.bodyKey]: trimmed };
	const lines = trimmed.split(/\r?\n/u);
	const bodyLines = [];
	let sawField = false;
	for (const line of lines) {
		const match = /^(body|idea|draft|prompt|outputPath|output|slug|n|mode)\s*:\s*(.*)$/iu.exec(line);
		if (!match) {
			bodyLines.push(line);
			continue;
		}
		sawField = true;
		const key = match[1].toLowerCase();
		const value = match[2].trim();
		if (key === "output") result.outputPath = value;
		else if (key === "prompt" || key === "idea") result[options.bodyKey] = value;
		else if (key === "n") result.n = Number.parseInt(value, 10);
		else result[key] = value;
	}
	if (sawField && bodyLines.join("\n").trim()) result[options.bodyKey] = bodyLines.join("\n").trim();
	return result;
}

async function readJsonRequest() {
	const text = await readOptionalText(".humanize/gen-idea-request.json");
	if (!text.trim()) return null;
	try {
		return JSON.parse(text);
	} catch (error) {
		throw new Error(`invalid .humanize/gen-idea-request.json: ${error instanceof Error ? error.message : String(error)}`);
	}
}

function normalizeJsonRequest(raw) {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("gen idea request must be an object");
	const sourcePath = typeof raw.sourcePath === "string" && raw.sourcePath.trim() ? raw.sourcePath.trim() : undefined;
	const mode = raw.mode === "file" || sourcePath ? "file" : "inline";
	const body = typeof raw.body === "string" ? raw.body : typeof raw.idea === "string" ? raw.idea : "";
	if (!body.trim()) throw new Error("gen idea request body must be a non-empty string");
	return {
		mode,
		body,
		sourcePath,
		slug: slugify(typeof raw.slug === "string" && raw.slug.trim() ? raw.slug : body),
		n: raw.n,
		outputPath: typeof raw.outputPath === "string" && raw.outputPath.trim() ? raw.outputPath.trim() : undefined,
	};
}

function normalizeDirectionCount(value) {
	if (value === undefined || value === null || value === "") return 6;
	const numeric = typeof value === "number" ? value : Number.parseInt(String(value), 10);
	if (!Number.isSafeInteger(numeric) || numeric < 2 || numeric > 6) {
		throw new Error("humanize-gen-idea supports n between 2 and 6; omit n for the default 6 lanes");
	}
	return numeric;
}

async function readOptionalText(path) {
	try {
		return await Bun.file(path).text();
	} catch {
		return "";
	}
}

function defaultOutputPath(slug, date) {
	const stamp = date.toISOString().replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z").replace("T", "-");
	return `.humanize/ideas/${slug}-${stamp}.md`;
}

function slugify(value) {
	const slug = value
		.slice(0, 80)
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, "-")
		.replace(/-+/gu, "-")
		.replace(/^-|-$/gu, "");
	return slug || "idea";
}
