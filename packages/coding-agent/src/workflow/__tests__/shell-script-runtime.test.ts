import { afterEach, describe, expect, it } from "bun:test";
import { TempDir } from "@oh-my-pi/pi-utils";
import { Settings } from "../../config/settings";
import type { ToolSession } from "../../tools";
import { createShellScriptRunner } from "../shell-script-runtime";

const zshPath = findZshPath();
let previousShell: string | undefined;

afterEach(() => {
	if (previousShell === undefined) {
		delete Bun.env.SHELL;
	} else {
		Bun.env.SHELL = previousShell;
	}
	previousShell = undefined;
});

describe.skipIf(!zshPath)("createShellScriptRunner", () => {
	it("runs sh workflow scripts with sh semantics under a zsh user shell", async () => {
		using tempDir = TempDir.createSync("@omp-workflow-sh-runtime-");
		previousShell = Bun.env.SHELL;
		Bun.env.SHELL = zshPath ?? "";

		const settings = await Settings.init();
		const session: ToolSession = {
			cwd: tempDir.path(),
			hasUI: false,
			getSessionFile: () => null,
			getSessionSpawns: () => null,
			settings,
		};
		const runner = createShellScriptRunner(session);

		const result = await runner({
			activationId: "activation-1",
			nodeId: "statusNode",
			code: ["status=0", 'printf \'{"summary":"ok","data":{"status":"%s"}}\\n\' "$status"'].join("\n"),
			language: "sh",
			title: "status-node.sh",
		});

		expect(result.exitCode).toBe(0);
		expect(result.error).toBeUndefined();
		expect(result.output).toContain('"status":"0"');
	});
});

function findZshPath(): string | undefined {
	const result = Bun.spawnSync({
		cmd: ["sh", "-lc", "command -v zsh"],
		stdout: "pipe",
		stderr: "ignore",
	});
	if (result.exitCode !== 0) return undefined;
	const output = new TextDecoder().decode(result.stdout).trim();
	return output || undefined;
}
