import * as path from "node:path";

const taskDir = process.cwd();
const outputDir = path.join(taskDir, "workflow-output");
const task = await Bun.file(path.join(taskDir, "task.md")).text();
const route = /\bfast\b/i.test(task) ? "fast" : "safe";
const report = {
	route,
	reason: route === "fast" ? "task explicitly requested fast route" : "default safe route",
};

await Bun.write(path.join(outputDir, "branch-route.json"), JSON.stringify(report, null, 2));
console.log(
	JSON.stringify({
		summary: `selected ${route} branch`,
		data: { route },
		statePatch: [{ op: "set", path: "/branch/route", value: route }],
	}),
);
