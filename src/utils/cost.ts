import * as vscode from 'vscode';

/** Per-model pricing in dollars per token (derived from provider API pricing). */
interface ModelPricing {
  inputPerToken: number;
  outputPerToken: number;
}

/**
 * Known model pricing as of mid-2025, in $/token.
 * Sources: OpenAI, Anthropic, xAI public API pricing pages.
 * Keys are matched case-insensitively against model names from Copilot Chat.
 */
const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic — Claude 4.x family
  'claude opus 4.6':           { inputPerToken: 5 / 1e6,  outputPerToken: 25 / 1e6 },
  'claude sonnet 4.6':         { inputPerToken: 3 / 1e6,  outputPerToken: 15 / 1e6 },
  'claude opus 4.5':           { inputPerToken: 15 / 1e6, outputPerToken: 75 / 1e6 },
  'claude opus 4.5 (preview)': { inputPerToken: 15 / 1e6, outputPerToken: 75 / 1e6 },
  'claude sonnet 4.5':         { inputPerToken: 3 / 1e6,  outputPerToken: 15 / 1e6 },
  'claude haiku 4.5':          { inputPerToken: 1 / 1e6,  outputPerToken: 5 / 1e6 },

  // OpenAI — GPT-5.x family
  'gpt-5.3-codex':    { inputPerToken: 1.75 / 1e6, outputPerToken: 14 / 1e6 },
  'gpt-5.4':          { inputPerToken: 2.5 / 1e6,  outputPerToken: 15 / 1e6 },
  'gpt-5.4-mini':     { inputPerToken: 0.75 / 1e6, outputPerToken: 4.5 / 1e6 },
  'gpt-5.4-nano':     { inputPerToken: 0.2 / 1e6,  outputPerToken: 1.25 / 1e6 },
  'gpt-4o':           { inputPerToken: 2.5 / 1e6,  outputPerToken: 10 / 1e6 },
  'gpt-4o-mini':      { inputPerToken: 0.15 / 1e6, outputPerToken: 0.6 / 1e6 },

  // xAI — Grok family
  'grok code fast 1':   { inputPerToken: 0.2 / 1e6, outputPerToken: 0.5 / 1e6 },
  'grok-4':              { inputPerToken: 2 / 1e6,   outputPerToken: 6 / 1e6 },
  'grok-4-fast':         { inputPerToken: 0.2 / 1e6, outputPerToken: 0.5 / 1e6 },

  // Microsoft — Raptor (estimates based on similar-tier models)
  'raptor mini (preview)': { inputPerToken: 0.15 / 1e6, outputPerToken: 0.6 / 1e6 },
  'raptor mini':           { inputPerToken: 0.15 / 1e6, outputPerToken: 0.6 / 1e6 },
};

/** Fallback rate when model is unknown — roughly mid-range. */
const DEFAULT_INPUT_COST = 3 / 1e6;   // $3/M tokens
const DEFAULT_OUTPUT_COST = 15 / 1e6;  // $15/M tokens

/**
 * Look up per-token pricing for a model name.
 * Falls back to user-configured rates, then built-in defaults.
 */
export function getModelPricing(model?: string): ModelPricing {
  if (model) {
    const key = model.toLowerCase().trim();
    const exact = MODEL_PRICING[key];
    if (exact) { return exact; }

    // Partial match: model name might contain extra version info
    for (const [k, v] of Object.entries(MODEL_PRICING)) {
      if (key.includes(k) || k.includes(key)) { return v; }
    }
  }

  const config = vscode.workspace.getConfiguration('tokenDashboard');
  return {
    inputPerToken: config.get<number>('costPerInputToken', DEFAULT_INPUT_COST),
    outputPerToken: config.get<number>('costPerOutputToken', DEFAULT_OUTPUT_COST),
  };
}

/**
 * Estimate the cost for a given number of input and output tokens.
 * When a model name is provided, uses model-specific pricing.
 */
export function estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
  const pricing = getModelPricing(model);
  return inputTokens * pricing.inputPerToken + outputTokens * pricing.outputPerToken;
}

/**
 * Rough token estimate from character count (~4 chars per token).
 * This is an approximation that can be 30-50% off for non-ASCII text,
 * code-heavy content, or non-English languages. Prefer actual token
 * counts from the API when available.
 */
export function estimateTokens(text: string): number {
  if (!text) { return 0; }
  return Math.ceil(text.length / 4);
}
