# CopilotPulse

<p align="center">
  <img src="media/icon.png" alt="CopilotPulse" width="128" height="128">
</p>

<p align="center">
  <strong>Track the pulse of your AI coding assistant.</strong><br>
  A local-first VS Code extension that visualizes your GitHub Copilot Chat usage — sessions, tokens, costs, and analytics — all inside VS Code. No data leaves your machine.
</p>

---

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/your-username/copilot-pulse.git
cd copilot-pulse
npm install && cd webview-ui && npm install && cd ..

# 2. Build
npm run build

# 3. Run
# Press F5 in VS Code → Extension Development Host opens
# Click the CopilotPulse icon in the Activity Bar
```

> **Tip:** You can also install the packaged `.vsix` directly:
> ```bash
> npm run package          # creates copilot-pulse-0.1.0.vsix
> code --install-extension copilot-pulse-0.1.0.vsix
> ```

---

## Features

### Dashboard
At-a-glance overview: today's sessions, total tokens, estimated cost, and recent activity.

<img width="1111" height="981" alt="image" src="https://github.com/user-attachments/assets/095fb124-24fb-458d-84a2-9dfd8d99f971" />




### Session Browser
Search, filter, sort, and paginate through all your Copilot Chat sessions. Filter by project, date range, or status.

<img width="733" height="449" alt="image" src="https://github.com/user-attachments/assets/b925b46b-ebfa-488a-bb42-1680fafee4f7" />


### Session Detail
Full conversation view with message bubbles, timeline visualization, per-session token breakdown, and tool call history.

### Project Insights
Sessions grouped by workspace — see which projects consume the most tokens and cost.

<img width="732" height="241" alt="image" src="https://github.com/user-attachments/assets/1466f70c-7c38-4495-9181-b9b6c968c406" />


### Analytics
Interactive charts powered by Recharts:
- **Token trends** — input vs. output over time (24h / 7d / 30d / 90d / all)
- **Cost over time** — per-model cost breakdown
- **Peak hours** — when you use Copilot most
- **Model distribution** — usage share across Claude, GPT, Grok, etc.

<img width="732" height="1006" alt="image" src="https://github.com/user-attachments/assets/88bccec8-9ed0-4692-812b-8f21db6618af" />


### Tool Usage
Donut chart and ranked list of all tool calls (file reads, web searches, terminal commands) across sessions.

<img width="732" height="1006" alt="image" src="https://github.com/user-attachments/assets/161c10bf-4ef5-481e-8a41-b9400efb4fd8" />


### Per-Model Cost Estimation
Built-in pricing table for 15+ models with accurate rates from OpenAI, Anthropic, and xAI:

| Model | Input ($/M tokens) | Output ($/M tokens) |
|---|---:|---:|
| Claude Opus 4.6 | $5.00 | $25.00 |
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| Claude Opus 4.5 | $15.00 | $75.00 |
| GPT-5.3-Codex | $1.75 | $14.00 |
| GPT-5.4 | $2.50 | $15.00 |
| GPT-4o | $2.50 | $10.00 |
| Grok Code Fast 1 | $0.20 | $0.50 |
| Raptor mini | $0.15 | $0.60 |

Unknown models fall back to configurable default rates. Override globally via settings.

### Data Export
Export all session data as JSON — useful for custom analysis or archival.

<img width="733" height="738" alt="image" src="https://github.com/user-attachments/assets/9b790ca5-65b9-44cc-92da-036e353a1dc0" />


### Status Bar
Live indicator showing your session count and total token usage.

---

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│  VS Code Workspace Storage                               │
│  ~/Library/Application Support/Code/User/workspaceStorage│
│  └─ */state.vscdb (SQLite)                               │
│     ├─ chat.ChatSessionStore.index  → session metadata   │
│     ├─ memento/interactive-session  → user messages      │
│     └─ aiStats                      → AI output chars    │
└───────────────┬──────────────────────────────────────────┘
                │  CopilotDataReader (sql.js WASM)
                ▼
┌───────────────────────────────┐
│  StorageService               │
│  dashboard.db (local SQLite)  │
│  ├─ sessions                  │
│  ├─ messages                  │
│  └─ tool_calls                │
└───────────────┬───────────────┘
                │  MessageHandler (typed postMessage)
                ▼
┌───────────────────────────────┐
│  React Webview (Vite)         │
│  Dashboard · Sessions · etc.  │
└───────────────────────────────┘
```

1. **CopilotDataReader** scans VS Code's `workspaceStorage` directories for `state.vscdb` files containing Copilot Chat data.
2. **FileWatcher** detects changes and triggers re-sync with 2-second debounce.
3. **StorageService** normalizes and persists data into a local SQLite database via sql.js (WASM).
4. **AnalyticsService** runs SQL aggregations for dashboards and charts.
5. **MessageHandler** routes typed messages between the React webview and the extension host.
6. All data stays local — nothing is sent to any server.

---

## Commands

Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and type:

| Command | Description |
|---|---|
| `CopilotPulse: Open Dashboard` | Open the full dashboard in an editor tab |
| `CopilotPulse: Refresh Data` | Re-scan Copilot Chat storage and update |
| `CopilotPulse: Export Data as JSON` | Save all session data to a JSON file |

---

## Configuration

Go to **Settings** → search `tokenDashboard`, or edit `settings.json`:

```jsonc
{
  // How often to auto-refresh data (seconds, minimum 5)
  "tokenDashboard.refreshInterval": 30,

  // Fallback cost rates for unknown models (USD per token)
  "tokenDashboard.costPerInputToken": 0.000003,
  "tokenDashboard.costPerOutputToken": 0.000015,

  // Show session count + tokens in the status bar
  "tokenDashboard.showStatusBar": true
}
```

---

## Development

### Prerequisites

- **Node.js** 18+
- **VS Code** 1.85+

### Install Dependencies

```bash
npm install
cd webview-ui && npm install && cd ..
```

### Build

```bash
npm run build              # Build both extension + webview
npm run build:extension    # Webpack → dist/extension.js
npm run build:webview      # Vite → webview-ui/dist/
```

### Watch Mode (for development)

```bash
npm run watch              # Rebuilds on file changes (both)
```

### Run & Debug

1. Open the project in VS Code
2. Press **F5** — launches the Extension Development Host
3. Click the **CopilotPulse** icon in the Activity Bar (left sidebar)
4. Or run `CopilotPulse: Open Dashboard` from the Command Palette

### Test

```bash
npm test                   # Run all 87 tests (49 extension + 38 webview)
npm run test:watch         # Watch mode
```

Test suites:
- `src/__tests__/StorageService.test.ts` — SQLite CRUD, queries, schema
- `src/__tests__/CopilotDataReader.test.ts` — File parsing, JSON/JSONL, vscdb
- `src/__tests__/AnalyticsService.test.ts` — Aggregations, time ranges
- `src/__tests__/MessageHandler.test.ts` — Message routing
- `webview-ui/src/__tests__/reducer.test.ts` — State management
- `webview-ui/src/__tests__/formatters.test.ts` — Display formatting
- `webview-ui/src/__tests__/isValidMessage.test.ts` — Message validation

### Package as .vsix

```bash
npm run package            # Produces copilot-pulse-0.1.0.vsix
```

### Lint

```bash
npm run lint
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Extension Host | TypeScript, Webpack | Data pipeline, commands, lifecycle |
| Database | sql.js (WASM SQLite) | Local persistence, no native deps |
| Webview UI | React 18, Vite | Dashboard pages and components |
| Styling | Tailwind CSS 3.4 | VS Code theme–aware styling |
| Charts | Recharts | Line, bar, and donut charts |
| Testing | Vitest | Fast unit tests with mocks |

---

## Project Structure

```
copilot-pulse/
├── src/                           # Extension host (Node.js)
│   ├── extension.ts               # Entry: commands, lifecycle, status bar
│   ├── models/
│   │   └── types.ts               # Session, Message, ToolCall, Analytics types
│   ├── services/
│   │   ├── CopilotDataReader.ts   # Reads Copilot Chat data from vscdb files
│   │   ├── StorageService.ts      # SQLite DB (sessions, messages, tool_calls)
│   │   ├── AnalyticsService.ts    # SQL aggregations for charts & stats
│   │   ├── FileWatcher.ts         # Watches storage dir, syncs on change
│   │   └── MessageHandler.ts      # Routes webview ↔ extension messages
│   ├── panels/
│   │   ├── DashboardPanel.ts      # Full-page editor webview
│   │   └── SidebarProvider.ts     # Activity bar sidebar webview
│   ├── utils/
│   │   ├── cost.ts                # Per-model pricing table & estimation
│   │   ├── format.ts              # Number/token formatting
│   │   ├── nonce.ts               # CSP nonce generation
│   │   └── paths.ts               # Cross-platform storage path resolution
│   └── __tests__/                 # Extension unit tests
│
├── webview-ui/                    # React webview (Vite + Tailwind)
│   └── src/
│       ├── pages/                 # Home, Sessions, SessionDetail, Projects,
│       │                          # Analytics, Tools, Settings
│       ├── components/            # StatsCard, Charts, SessionCard, Timeline,
│       │                          # MessageBubble, Pagination, SearchBar, etc.
│       ├── context/               # AppContext (state + dispatch)
│       ├── hooks/                 # useVSCodeAPI, useMessages
│       ├── utilities/             # Formatters, validators
│       └── __tests__/             # Webview unit tests
│
├── media/                         # Extension icon and sidebar icon
├── dist/                          # Compiled extension output (webpack)
├── webpack.extension.config.js    # Webpack config (externals: vscode, sql.js)
├── vitest.config.ts               # Test config (extension)
├── tsconfig.json                  # TypeScript config
└── package.json                   # Extension manifest, commands, settings
```

---

## Data Privacy

- **100% local.** All data is read from your existing VS Code storage files and stored in a local SQLite database.
- **No network requests.** The extension never sends data to any external server.
- **No telemetry.** No usage tracking or analytics collection.
- Your Copilot Chat data stays exactly where VS Code already stores it — this extension just reads and visualizes it.

---

## Troubleshooting

### "No sessions tracked yet"
- Make sure you have used **GitHub Copilot Chat** in VS Code at least once.
- Run `CopilotPulse: Refresh Data` from the Command Palette.
- The extension reads from `~/Library/Application Support/Code/User/workspaceStorage/` (macOS) or the equivalent on your OS. Ensure this directory exists and contains `state.vscdb` files.

### Dashboard shows $0.00 for costs
- Cost estimation requires token data. Some sessions may show 0 output tokens if the assistant response wasn't stored in the local vscdb.
- You can override rates in Settings → `tokenDashboard.costPerInputToken`.

### Extension doesn't activate
- Check the **Output** panel → select "CopilotPulse" from the dropdown.
- Ensure VS Code version is 1.85 or newer.
- Try `Developer: Reload Window` from the Command Palette.

---

## Platform Support

| OS | Storage Path |
|---|---|
| macOS | `~/Library/Application Support/Code/User/workspaceStorage/` |
| Linux | `~/.config/Code/User/workspaceStorage/` |
| Windows | `%APPDATA%/Code/User/workspaceStorage/` |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Install dependencies: `npm install && cd webview-ui && npm install && cd ..`
4. Make your changes
5. Run tests: `npm test`
6. Build: `npm run build`
7. Submit a pull request

---

## License

MIT
