export const WORKFLOW_SCRIPT_TIMEOUT_MS = 60 * 60 * 1000;

export function resolveWorkflowScriptTimeoutMs(timeoutMs: number | undefined): number {
	return timeoutMs ?? WORKFLOW_SCRIPT_TIMEOUT_MS;
}
