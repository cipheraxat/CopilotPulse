import * as vscode from 'vscode';
import * as path from 'path';
import { StorageService } from './services/StorageService';
import { CopilotDataReader } from './services/CopilotDataReader';
import { FileWatcher } from './services/FileWatcher';
import { AnalyticsService } from './services/AnalyticsService';
import { MessageHandler } from './services/MessageHandler';
import { DashboardPanel } from './panels/DashboardPanel';
import { SidebarProvider } from './panels/SidebarProvider';
import { formatTokens } from './utils/format';

let statusBarItem: vscode.StatusBarItem | undefined;
let refreshInterval: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext) {
  // Initialize services
  const storage = new StorageService(context);
  const reader = new CopilotDataReader();
  const analytics = new AnalyticsService(storage);
  const messageHandler = new MessageHandler(storage, analytics, context);

  const fileWatcher = new FileWatcher(reader, storage, () => {
    // Notify any open panels about data updates
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel.sendMessage({ type: 'loading', loading: false });
    }
    updateStatusBar(analytics);
  });

  // Register sidebar webview provider
  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    messageHandler,
    fileWatcher,
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider,
    ),
  );

  // Register commands BEFORE async init so they're always available
  context.subscriptions.push(
    vscode.commands.registerCommand('tokenDashboard.openDashboard', () => {
      DashboardPanel.create(context.extensionUri, messageHandler, fileWatcher);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tokenDashboard.refresh', async () => {
      await fileWatcher.sync();
      vscode.window.showInformationMessage('CopilotPulse: Data refreshed');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tokenDashboard.exportData', async () => {
      await messageHandler.handle(
        { type: 'export-data' },
        () => {}, // No webview to send to
      );
    }),
  );

  // Async initialization — errors here won't prevent commands from registering
  let copilotAvailable = false;
  try {
    await storage.initialize();

    const wasmPath = path.join(context.extensionPath, 'dist', 'sql-wasm.wasm');
    copilotAvailable = await reader.initialize(wasmPath);

    if (copilotAvailable) {
      fileWatcher.start();
      await fileWatcher.sync();
    }
  } catch (err) {
    console.error('CopilotPulse: initialization error:', err);
    vscode.window.showErrorMessage(
      `CopilotPulse: Failed to initialize — ${err instanceof Error ? err.message : 'unknown error'}`,
    );
  }

  // Status bar
  setupStatusBar(context, analytics);

  // Periodic refresh
  const config = vscode.workspace.getConfiguration('tokenDashboard');
  const intervalSec = Math.max(5, config.get<number>('refreshInterval', 30));
  refreshInterval = setInterval(() => {
    if (copilotAvailable) {
      fileWatcher.sync();
    }
  }, intervalSec * 1000);

  // Listen for config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('tokenDashboard.showStatusBar')) {
        setupStatusBar(context, analytics);
      }
      if (e.affectsConfiguration('tokenDashboard.refreshInterval')) {
        if (refreshInterval) { clearInterval(refreshInterval); }
        const newInterval = Math.max(5, vscode.workspace
          .getConfiguration('tokenDashboard')
          .get<number>('refreshInterval', 30));
        refreshInterval = setInterval(() => {
          if (copilotAvailable) { fileWatcher.sync(); }
        }, newInterval * 1000);
      }
    }),
  );

  // Cleanup
  context.subscriptions.push({
    dispose: () => {
      if (refreshInterval) { clearInterval(refreshInterval); }
      fileWatcher.dispose();
      storage.dispose();
      statusBarItem?.dispose();
    },
  });

  if (!copilotAvailable) {
    vscode.window.showWarningMessage(
      'CopilotPulse: Could not find Copilot Chat storage. Sessions will be tracked once Copilot Chat data is available.'
    );
  }
}

function setupStatusBar(
  context: vscode.ExtensionContext,
  analytics: AnalyticsService,
): void {
  const config = vscode.workspace.getConfiguration('tokenDashboard');
  const showStatusBar = config.get<boolean>('showStatusBar', true);

  if (!showStatusBar) {
    statusBarItem?.dispose();
    statusBarItem = undefined;
    return;
  }

  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    statusBarItem.command = 'tokenDashboard.openDashboard';
    statusBarItem.tooltip = 'Open CopilotPulse';
    context.subscriptions.push(statusBarItem);
  }

  updateStatusBar(analytics);
  statusBarItem.show();
}

function updateStatusBar(analytics: AnalyticsService): void {
  if (!statusBarItem) { return; }

  try {
    const stats = analytics.getDashboardStats();
    statusBarItem.text = `$(dashboard) ${stats.todaySessions} sessions · ${formatTokens(stats.todayTokens)} tokens`;
  } catch {
    statusBarItem.text = '$(dashboard) CopilotPulse';
  }
}

export function deactivate() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
}
