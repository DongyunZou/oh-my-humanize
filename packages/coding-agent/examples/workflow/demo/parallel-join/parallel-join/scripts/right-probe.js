import * as path from "node:path";

const taskDir = process.cwd();
const outputDir = path.join(taskDir, "workflow-output");
const task = await Bun.file(path.join(taskDir, "task.md")).text();
const start = performance.now();
const words = task.split(/\s+/).filter(Boolean);
const uniqueWords = new Set(words.map(word => word.toLowerCase().replace(/^[^\w]+|[^\w]+$/gu, "")).filter(Boolean));
const elapsedMs = performance.now() - start;

await Bun.write(
	path.join(outputDir, "parallel-right.log"),
	`right probe counted ${words.length} words and ${uniqueWords.size} unique words\n`,
);
await Bun.write(
	path.join(outputDir, "parallel-right.json"),
	JSON.stringify({ elapsedMs, wordCount: words.length, uniqueWordCount: uniqueWords.size }, null, 2),
);
console.log(
	JSON.stringify({
		summary: `right probe counted ${words.length} task words`,
		data: { side: "right", wordCount: words.length, uniqueWordCount: uniqueWords.size, elapsedMs },
	}),
);
