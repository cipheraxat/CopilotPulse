import * as vscode from 'vscode';
import { getNonce } from '../utils/nonce';
import { MessageHandler } from '../services/MessageHandler';
import { FileWatcher } from '../services/FileWatcher';
import type { MessageToExtension, MessageToWebview } from '../models/types';

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private static readonly viewType = 'tokenDashboard';

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private extensionUri: vscode.Uri,
    private messageHandler: MessageHandler,
    private fileWatcher: FileWatcher,
  ) {
    this.panel = panel;

    this.panel.webview.html = this.getWebviewContent();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message: MessageToExtension) => {
        if (message.type === 'refresh') {
          await this.fileWatcher.sync();
          // After sync, refresh dashboard stats
          await this.messageHandler.handle(
            { type: 'get-dashboard-stats' },
            (msg) => this.panel.webview.postMessage(msg),
          );
          return;
        }

        await this.messageHandler.handle(message, (msg) => {
          this.panel.webview.postMessage(msg);
        });
      },
      null,
      this.disposables,
    );
  }

  public static create(
    extensionUri: vscode.Uri,
    messageHandler: MessageHandler,
    fileWatcher: FileWatcher,
  ): DashboardPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel.panel.reveal(column);
      return DashboardPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      DashboardPanel.viewType,
      'CopilotPulse',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist'),
          vscode.Uri.joinPath(extensionUri, 'media'),
        ],
      },
    );

    panel.iconPath = vscode.Uri.joinPath(extensionUri, 'media', 'sidebar-icon.svg');

    DashboardPanel.currentPanel = new DashboardPanel(
      panel,
      extensionUri,
      messageHandler,
      fileWatcher,
    );

    return DashboardPanel.currentPanel;
  }

  public sendMessage(message: MessageToWebview): void {
    this.panel.webview.postMessage(message);
  }

  private getWebviewContent(): string {
    const webview = this.panel.webview;
    const distPath = vscode.Uri.joinPath(this.extensionUri, 'webview-ui', 'dist');

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distPath, 'assets', 'index.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distPath, 'assets', 'index.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <link rel="stylesheet" href="${styleUri}">
  <title>CopilotPulse</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    DashboardPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const d = this.disposables.pop();
      d?.dispose();
    }
  }
}
