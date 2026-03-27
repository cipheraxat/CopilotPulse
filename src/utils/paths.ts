import * as path from 'path';

/**
 * Derive the Copilot Chat globalStorage path from the extension's own globalStorage path.
 * This works across all VS Code variants (regular, Insiders, Cursor, etc.).
 *
 * @param extensionGlobalStoragePath - context.globalStorageUri.fsPath
 */
export function getCopilotChatStoragePath(extensionGlobalStoragePath: string): string {
  const globalStorageDir = path.dirname(extensionGlobalStoragePath);
  return path.join(globalStorageDir, 'github.copilot-chat');
}

/**
 * Derive the workspaceStorage base path from the extension's own globalStorage path.
 *
 * @param extensionGlobalStoragePath - context.globalStorageUri.fsPath
 */
export function getWorkspaceStorageBasePath(extensionGlobalStoragePath: string): string {
  const userDir = path.dirname(path.dirname(extensionGlobalStoragePath));
  return path.join(userDir, 'workspaceStorage');
}
