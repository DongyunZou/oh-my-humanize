import * as path from "node:path";

const taskDir = process.cwd();
const outputDir = path.join(taskDir, "workflow-output");
const task = await Bun.file(path.join(taskDir, "task.md")).text();
const words = task.split(/\s+/).filter(Boolean);
const report = {
	branch: "fast",
	wordCount: words.length,
	routeEvidence: "generic task word count",
};

await Bun.write(
	path.join(outputDir, "fast-path.log"),
	[`fast branch processed ${words.length} task words`, task].join("\n\n"),
);
await Bun.write(path.join(outputDir, "fast-path.json"), JSON.stringify(report, null, 2));
console.log(
	JSON.stringify({
		summary: `fast branch processed ${words.length} task words`,
		data: { branch: "fast", wordCount: words.length },
		statePatch: [{ op: "set", path: "/branch/score", value: words.length }],
	}),
);
