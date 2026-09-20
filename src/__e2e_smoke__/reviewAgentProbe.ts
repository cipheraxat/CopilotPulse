/**
 * Temporary smoke fixture for cipheraxat/codereviewer_agent.
 * Safe to delete after the PR review Action runs.
 */

// Intentional HIGH: hardcoded secret for review-agent detection
const OPENROUTER_API_KEY = "sk-live-copilotpulse-e2e-probe-do-not-use-abcdef123456";

// Intentional HIGH: string-concatenated SQL (injection pattern)
export function lookupSession(userId: string): string {
  return "SELECT * FROM sessions WHERE user_id = '" + userId + "'";
}

// Intentional MEDIUM/HIGH: eval enables code injection
export function runDynamic(expr: string): unknown {
  return eval(expr);
}

// Intentional quality smell (may be below posting threshold)
export function debugProbe(payload: unknown): void {
  console.log("probe payload", payload, OPENROUTER_API_KEY);
}
