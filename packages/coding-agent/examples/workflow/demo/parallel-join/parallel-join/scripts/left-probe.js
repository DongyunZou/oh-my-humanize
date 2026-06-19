import * as path from "node:path";

const taskDir = process.cwd();
const outputDir = path.join(taskDir, "workflow-output");
const task = await Bun.file(path.join(taskDir, "task.md")).text();
const start = performance.now();
const headings = task.match(/^#+\s+/gmu)?.length ?? 0;
const elapsedMs = performance.now() - start;
const lineCount = task.split(/\r?\n/).filter(line => line.trim().length > 0).length;

await Bun.write(
	path.join(outputDir, "parallel-left.log"),
	`left probe counted ${lineCount} non-empty lines and ${headings} markdown headings\n`,
);
await Bun.write(path.join(outputDir, "parallel-left.json"), JSON.stringify({ elapsedMs, lineCount, headings }, null, 2));
console.log(
	JSON.stringify({
		summary: `left probe counted ${lineCount} task lines`,
		data: { side: "left", lineCount, headings, elapsedMs },
	}),
);
