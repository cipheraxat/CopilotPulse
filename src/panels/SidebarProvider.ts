import * as vscode from 'vscode';
import { getNonce } from '../utils/nonce';
import { MessageHandler } from '../services/MessageHandler';
import { FileWatcher } from '../services/FileWatcher';
import type { MessageToExtension, MessageToWebview } from '../models/types';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'tokenDashboard.sidebar';

  private view?: vscode.WebviewView;

  constructor(
    private extensionUri: vscode.Uri,
    private messageHandler: MessageHandler,
    private fileWatcher: FileWatcher,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'webview-ui', 'dist'),
        vscode.Uri.joinPath(this.extensionUri, 'media'),
      ],
    };

    webviewView.webview.html = this.getWebviewContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: MessageToExtension) => {
      if (message.type === 'refresh') {
        await this.fileWatcher.sync();
        await this.messageHandler.handle(
          { type: 'get-dashboard-stats' },
          (msg) => webviewView.webview.postMessage(msg),
        );
        return;
      }

      if (message.type === 'navigate') {
        // Open the full dashboard panel and navigate there
        vscode.commands.executeCommand('tokenDashboard.openDashboard');
        return;
      }

      await this.messageHandler.handle(message, (msg) => {
        webviewView.webview.postMessage(msg);
      });
    });
  }

  public postMessage(message: MessageToWebview): void {
    this.view?.webview.postMessage(message);
  }

  private getWebviewContent(webview: vscode.Webview): string {
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
}
