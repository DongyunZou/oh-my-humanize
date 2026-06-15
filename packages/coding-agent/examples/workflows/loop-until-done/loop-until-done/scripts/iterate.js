import * as path from "node:path";

const taskDir = process.cwd();
const outputDir = path.join(taskDir, "workflow-output");
const task = await Bun.file(path.join(taskDir, "task.md")).text();
const probes = [
	{ name: "lines", value: task.split(/\r?\n/).filter(line => line.trim().length > 0).length },
	{ name: "words", value: task.split(/\s+/).filter(Boolean).length },
	{ name: "characters", value: task.length },
];
const stateFile = Bun.file(path.join(outputDir, "loop-state.json"));
const previous = await stateFile.exists() ? await stateFile.json() : { round: 0, history: [], findings: [] };
const round = previous.round + 1;
const probe = probes[round - 1];
if (!probe) {
	throw new Error(`no loop probe configured for round ${round}`);
}
const shouldContinue = round < probes.length;
const finding = { round, name: probe.name, value: probe.value };
const history = [...previous.history, { round, shouldContinue, probe: probe.name }];
const findings = [...previous.findings, finding];
const next = { round, history, findings, done: !shouldContinue };

await Bun.write(path.join(outputDir, "loop-state.json"), JSON.stringify(next, null, 2));
await Bun.write(path.join(outputDir, `loop-round-${round}.json`), JSON.stringify(finding, null, 2));
await Bun.write(
	path.join(outputDir, `loop-round-${round}.log`),
	`round ${round} ${probe.name}: ${probe.value}\n`,
);
console.log(
	JSON.stringify({
		summary: `loop round ${round} recorded ${probe.name}: ${probe.value}${shouldContinue ? ", continuing" : ", finishing"}`,
		data: { round, continue: shouldContinue, probe: probe.name, value: probe.value },
		statePatch: [
			{ op: "set", path: "/loop/round", value: round },
			{ op: "set", path: "/loop/done", value: !shouldContinue },
		],
	}),
);
