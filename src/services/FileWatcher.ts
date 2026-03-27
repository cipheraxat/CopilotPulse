import * as vscode from 'vscode';
import { CopilotDataReader } from './CopilotDataReader';
import { StorageService } from './StorageService';

export class FileWatcher implements vscode.Disposable {
  private watcher: vscode.FileSystemWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly debounceMs = 2000;

  constructor(
    private reader: CopilotDataReader,
    private storage: StorageService,
    private onUpdate?: () => void,
  ) {}

  start(): void {
    const storagePath = this.reader.getStoragePath();
    if (!storagePath) {
      console.warn('Copilot Chat storage path not found, file watcher not started.');
      return;
    }

    // Watch for all file changes in the Copilot Chat storage directory
    const pattern = new vscode.RelativePattern(
      vscode.Uri.file(storagePath),
      '**/*'
    );

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.watcher.onDidCreate(() => this.debouncedSync());
    this.watcher.onDidChange(() => this.debouncedSync());
    this.watcher.onDidDelete(() => this.debouncedSync());
  }

  private debouncedSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.sync();
    }, this.debounceMs);
  }

  async sync(): Promise<void> {
    try {
      const sessions = await this.reader.scanSessions();

      for (const session of sessions) {
        // Upsert session (without messages/toolCalls to avoid duplication in the table)
        const { messages, toolCalls, ...sessionData } = session;
        this.storage.upsertSession(sessionData);

        for (const msg of messages) {
          this.storage.upsertMessage(msg);
        }

        for (const tool of toolCalls) {
          this.storage.upsertToolCall(tool);
        }
      }

      // Flush all pending writes to disk in one batch
      await this.storage.flush();

      this.onUpdate?.();
    } catch (err) {
      console.error('Error syncing Copilot Chat data:', err);
    }
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.watcher?.dispose();
  }
}
