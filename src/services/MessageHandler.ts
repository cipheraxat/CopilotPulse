import * as vscode from 'vscode';
import { StorageService } from './StorageService';
import { AnalyticsService } from './AnalyticsService';
import type { MessageToExtension, MessageToWebview, AppSettings } from '../models/types';

export class MessageHandler {
  constructor(
    private storage: StorageService,
    private analytics: AnalyticsService,
    private context: vscode.ExtensionContext,
  ) {}

  async handle(
    message: MessageToExtension,
    postMessage: (msg: MessageToWebview) => void,
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'get-sessions': {
          const sessions = this.storage.getSessions({
            search: message.filter?.search,
            workspace: message.filter?.project,
            status: message.filter?.status,
            sortBy: message.filter?.sortBy,
            sortOrder: message.filter?.sortOrder,
            limit: message.filter?.pageSize || 50,
            offset: message.filter?.page ? ((message.filter.page - 1) * (message.filter.pageSize || 50)) : 0,
          });
          const total = this.storage.getSessionCountFiltered({
            search: message.filter?.search,
            workspace: message.filter?.project,
            status: message.filter?.status,
          });
          postMessage({ type: 'sessions', data: sessions, total });
          break;
        }

        case 'get-session-detail': {
          const session = this.storage.getSession(message.sessionId);
          if (session) {
            postMessage({ type: 'session-detail', data: session });
          } else {
            postMessage({ type: 'error', message: 'Session not found' });
          }
          break;
        }

        case 'get-projects': {
          const projects = this.storage.getProjects();
          postMessage({ type: 'projects', data: projects });
          break;
        }

        case 'get-analytics': {
          const data = this.analytics.getAnalytics(message.timeRange);
          postMessage({ type: 'analytics', data });
          break;
        }

        case 'get-dashboard-stats': {
          const stats = this.analytics.getDashboardStats();
          postMessage({ type: 'dashboard-stats', data: stats });
          break;
        }

        case 'get-tools': {
          const tools = this.analytics.getToolUsageStats();
          postMessage({ type: 'tools', data: tools });
          break;
        }

        case 'get-settings': {
          const config = vscode.workspace.getConfiguration('tokenDashboard');
          const settings: AppSettings = {
            refreshInterval: config.get('refreshInterval', 30),
            costPerInputToken: config.get('costPerInputToken', 0.000003),
            costPerOutputToken: config.get('costPerOutputToken', 0.000015),
            showStatusBar: config.get('showStatusBar', true),
          };
          postMessage({ type: 'settings', data: settings });
          break;
        }

        case 'update-settings': {
          const config = vscode.workspace.getConfiguration('tokenDashboard');
          if (message.settings.refreshInterval !== undefined) {
            await config.update('refreshInterval', message.settings.refreshInterval, true);
          }
          if (message.settings.costPerInputToken !== undefined) {
            await config.update('costPerInputToken', message.settings.costPerInputToken, true);
          }
          if (message.settings.costPerOutputToken !== undefined) {
            await config.update('costPerOutputToken', message.settings.costPerOutputToken, true);
          }
          if (message.settings.showStatusBar !== undefined) {
            await config.update('showStatusBar', message.settings.showStatusBar, true);
          }
          // Send back updated settings
          const updated: AppSettings = {
            refreshInterval: config.get('refreshInterval', 30),
            costPerInputToken: config.get('costPerInputToken', 0.000003),
            costPerOutputToken: config.get('costPerOutputToken', 0.000015),
            showStatusBar: config.get('showStatusBar', true),
          };
          postMessage({ type: 'settings', data: updated });
          break;
        }

        case 'export-data': {
          const exportData = this.storage.exportAllData();
          const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('copilot-pulse-export.json'),
            filters: { 'JSON Files': ['json'] },
          });
          if (uri) {
            const content = JSON.stringify(exportData, null, 2);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
            postMessage({ type: 'export-complete', path: uri.fsPath });
            vscode.window.showInformationMessage(`Data exported to ${uri.fsPath}`);
          }
          break;
        }

        case 'open-external': {
          const parsed = vscode.Uri.parse(message.url);
          if (parsed.scheme === 'https' || parsed.scheme === 'http') {
            vscode.env.openExternal(parsed);
          }
          break;
        }

        case 'navigate':
          // Handled by the webview itself
          break;

        case 'refresh':
          // Trigger a re-sync (caller handles this)
          break;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      postMessage({ type: 'error', message: errorMessage });
    }
  }
}
