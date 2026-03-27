import * as os from 'os';
import * as path from 'path';

function getCodeUserPath(): string {
  const platform = os.platform();
  const homeDir = os.homedir();

  switch (platform) {
    case 'darwin':
      return path.join(homeDir, 'Library', 'Application Support', 'Code', 'User');
    case 'linux':
      return path.join(homeDir, '.config', 'Code', 'User');
    case 'win32':
      return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'Code', 'User');
    default:
      return path.join(homeDir, '.config', 'Code', 'User');
  }
}

/**
 * Get the OS-specific globalStorage path for the Copilot Chat extension.
 */
export function getCopilotChatStoragePath(): string {
  return path.join(getCodeUserPath(), 'globalStorage', 'github.copilot-chat');
}

/**
 * Get the OS-specific workspaceStorage base path for VS Code.
 */
export function getWorkspaceStorageBasePath(): string {
  return path.join(getCodeUserPath(), 'workspaceStorage');
}
