# Changelog

All notable changes to **CopilotPulse** will be documented in this file.

## [0.1.2] — 2026-03-28

### Fixed
- **Extension stuck on loading** — removed webpack `noParse` for sql-wasm.js and set `__dirname: false` so Node.js paths resolve correctly at runtime.

## [0.1.1] — 2026-03-28

### Fixed
- **sql.js not bundled** — `sql.js` was marked as a webpack external, causing the extension to fail when installed from the marketplace (node_modules excluded from VSIX).

## [0.1.0] — 2026-03-28

### Added
- **Dashboard** — at-a-glance overview of sessions, tokens, estimated cost, and recent activity.
- **Session Browser** — search, filter, sort, and paginate through all Copilot Chat sessions.
- **Session Detail** — full conversation view with message bubbles, timeline, and token breakdown.
- **Project Insights** — sessions grouped by workspace with per-project token and cost totals.
- **Analytics** — interactive charts for token trends, cost over time, peak hours, and model distribution.
- **Tool Usage** — donut chart and ranked list of tool calls across sessions.
- **Per-Model Cost Estimation** — built-in pricing for 15+ models (Claude, GPT, Grok, Raptor).
- **Transcript Parsing** — reads `GitHub.copilot-chat/transcripts/*.jsonl` for accurate assistant response and tool call data.
- **Data Export** — export all session data as JSON.
- **Status Bar** — live indicator showing session count and total token usage.
- **100% local** — all data stays on your machine, no network requests, no telemetry.
