import * as path from "node:path";

const taskDir = process.cwd();
const outputDir = path.join(taskDir, "workflow-output");
const task = await Bun.file(path.join(taskDir, "task.md")).text();
const lineCount = task.split(/\r?\n/).filter(line => line.trim().length > 0).length;
const report = {
	branch: "safe",
	lineCount,
	reason: "default route records a generic task line-count baseline",
};
await Bun.write(path.join(outputDir, "safe-path.json"), JSON.stringify(report, null, 2));
console.log(
	JSON.stringify({
		summary: `safe branch recorded ${lineCount} task lines`,
		data: { branch: "safe", lineCount },
		statePatch: [{ op: "set", path: "/branch/score", value: lineCount }],
	}),
);
