import { buildNonInteractiveEnv } from "./non-interactive-env";

export type ShellEnvironmentPolicy = "isolated" | "workflow";

export function buildShellEnvironment(
	policy: ShellEnvironmentPolicy | undefined,
	overrides?: Record<string, string>,
	baseEnv: Record<string, string | undefined> = Bun.env,
	platform: NodeJS.Platform = process.platform,
): Record<string, string> {
	if (policy === "workflow") {
		return buildWorkflowShellEnvironment(overrides, baseEnv, platform);
	}
	return buildNonInteractiveEnv(overrides, baseEnv, platform);
}

export function buildWorkflowShellEnvironment(
	overrides?: Record<string, string>,
	baseEnv: Record<string, string | undefined> = Bun.env,
	platform: NodeJS.Platform = process.platform,
): Record<string, string> {
	const env = {
		...definedShellEnvironment(baseEnv),
		...buildNonInteractiveEnv(overrides, baseEnv, platform),
	};
	delete env.PYTHONNOUSERSITE;
	delete env.PYTHONPATH;
	return env;
}

function definedShellEnvironment(baseEnv: Record<string, string | undefined>): Record<string, string> {
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(baseEnv)) {
		if (value !== undefined) env[key] = value;
	}
	return env;
}
