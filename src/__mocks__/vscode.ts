/* eslint-disable @typescript-eslint/no-unused-vars */

export const Uri = {
  file: (p: string) => ({ fsPath: p, scheme: 'file', toString: () => `file://${p}` }),
  joinPath: (base: { fsPath: string }, ...segments: string[]) => {
    const joined = [base.fsPath, ...segments].join('/');
    return { fsPath: joined, scheme: 'file', toString: () => `file://${joined}` };
  },
  parse: (uri: string) => {
    try {
      const u = new URL(uri);
      return { fsPath: u.pathname, scheme: u.protocol.replace(':', ''), toString: () => uri };
    } catch {
      return { fsPath: uri, scheme: 'file', toString: () => uri };
    }
  },
};

export const workspace = {
  getConfiguration: (_section?: string) => ({
    get: <T>(_key: string, defaultValue?: T): T | undefined => defaultValue,
    update: async () => {},
  }),
  createFileSystemWatcher: () => ({
    onDidCreate: () => ({ dispose: () => {} }),
    onDidChange: () => ({ dispose: () => {} }),
    onDidDelete: () => ({ dispose: () => {} }),
    dispose: () => {},
  }),
  fs: {
    writeFile: async () => {},
  },
};

export const window = {
  showSaveDialog: async () => undefined,
  showInformationMessage: () => {},
  showWarningMessage: () => {},
  showErrorMessage: () => {},
  createStatusBarItem: () => ({
    text: '',
    tooltip: '',
    command: '',
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),
  registerWebviewViewProvider: () => ({ dispose: () => {} }),
};

export const env = {
  openExternal: () => {},
};

export const commands = {
  registerCommand: (_id: string, _cb: Function) => ({ dispose: () => {} }),
  executeCommand: async () => {},
};

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export class RelativePattern {
  constructor(public base: unknown, public pattern: string) {}
}
