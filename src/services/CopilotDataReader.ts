import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import initSqlJs, { SqlJsStatic } from 'sql.js';
import { getCopilotChatStoragePath, getWorkspaceStorageBasePath } from '../utils/paths';
import { estimateTokens, estimateCost } from '../utils/cost';
import type { Session, Message, ToolCall } from '../models/types';

/** Shape of a session entry inside chat.ChatSessionStore.index */
interface VscdbSessionEntry {
  sessionId: string;
  title: string;
  lastMessageDate?: number;
  timing?: {
    created?: number;
    lastRequestStarted?: number;
    lastRequestEnded?: number;
  };
  isEmpty?: boolean;
  isExternal?: boolean;
}

/** Shape of a single user-input item stored in memento/interactive-session */
interface HistoryItem {
  inputText: string;
  selectedModel?: {
    identifier?: string;
    metadata?: {
      name?: string;
      family?: string;
      maxInputTokens?: number;
      maxOutputTokens?: number;
    };
  };
  mode?: { id?: string };
}

/** Shape of an aiStats session entry */
interface AiStatSession {
  startTime: number;
  aiCharacters: number;
  typedCharacters?: number;
  chatEditCount?: number;
  acceptedInlineSuggestions?: number;
}

export class CopilotDataReader {
  private storagePath: string | null = null;
  private workspaceStoragePath: string | null = null;
  private SQL: SqlJsStatic | null = null;
  private fileModTimes = new Map<string, number>();

  async initialize(wasmPath: string): Promise<boolean> {
    this.SQL = await initSqlJs({ locateFile: () => wasmPath });
    this.storagePath = getCopilotChatStoragePath();
    this.workspaceStoragePath = getWorkspaceStorageBasePath();

    const hasLegacy = this.storagePath && fsSync.existsSync(this.storagePath);
    const hasVscdb = this.workspaceStoragePath && fsSync.existsSync(this.workspaceStoragePath);
    return !!(hasLegacy || hasVscdb);
  }

  getStoragePath(): string | null {
    return this.workspaceStoragePath ?? this.storagePath;
  }

  async scanSessions(): Promise<Session[]> {
    const sessions: Session[] = [];

    // Primary: scan VS Code workspace storage vscdb files
    if (this.workspaceStoragePath && this.SQL) {
      const vscdbSessions = await this.scanVscdbSessions();
      sessions.push(...vscdbSessions);
    }

    // Fallback: scan legacy JSON/JSONL files
    if (this.storagePath && fsSync.existsSync(this.storagePath) && sessions.length === 0) {
      const legacySessions = await this.scanLegacyJsonFiles();
      sessions.push(...legacySessions);
    }

    return sessions;
  }

  // --------------- vscdb scanning ---------------

  private async scanVscdbSessions(): Promise<Session[]> {
    if (!this.workspaceStoragePath || !this.SQL) { return []; }

    const sessions: Session[] = [];

    try {
      const dirs = await fs.readdir(this.workspaceStoragePath, { withFileTypes: true });

      for (const dir of dirs) {
        if (!dir.isDirectory()) { continue; }

        const dirPath = path.join(this.workspaceStoragePath, dir.name);
        const dbPath = path.join(dirPath, 'state.vscdb');

        if (!fsSync.existsSync(dbPath)) { continue; }
        if (!(await this.hasFileChanged(dbPath))) { continue; }

        try {
          const workspaceSessions = await this.readWorkspaceDb(dirPath, dbPath);
          sessions.push(...workspaceSessions);
        } catch {
          // Skip unreadable databases
        }
      }
    } catch (err) {
      console.error('Error scanning workspace storage:', err);
    }

    return sessions;
  }

  private async readWorkspaceDb(dirPath: string, dbPath: string): Promise<Session[]> {
    if (!this.SQL) { return []; }

    const buffer = await fs.readFile(dbPath);
    const db = new this.SQL.Database(buffer);

    try {
      // Read session index
      const indexRows = db.exec("SELECT value FROM ItemTable WHERE key='chat.ChatSessionStore.index'");
      if (!indexRows.length || !indexRows[0].values.length) { return []; }

      const indexData = JSON.parse(indexRows[0].values[0][0] as string);
      const entries: VscdbSessionEntry[] = Object.values(indexData.entries || {});
      const nonEmpty = entries.filter(e => !e.isEmpty);
      if (nonEmpty.length === 0) { return []; }

      // Read workspace info
      const workspaceName = await this.readWorkspaceName(dirPath);

      // Read user input history
      let historyItems: HistoryItem[] = [];
      const historyRows = db.exec("SELECT value FROM ItemTable WHERE key='memento/interactive-session'");
      if (historyRows.length && historyRows[0].values.length) {
        try {
          const historyData = JSON.parse(historyRows[0].values[0][0] as string);
          historyItems = historyData?.history?.copilot || [];
        } catch { /* ignore parse errors */ }
      }

      // Read AI stats
      let aiStatSessions: AiStatSession[] = [];
      const aiRows = db.exec("SELECT value FROM ItemTable WHERE key='aiStats'");
      if (aiRows.length && aiRows[0].values.length) {
        try {
          const aiData = JSON.parse(aiRows[0].values[0][0] as string);
          aiStatSessions = aiData?.sessions || [];
        } catch { /* ignore parse errors */ }
      }

      // Total AI output characters
      const totalAiChars = aiStatSessions.reduce((s, a) => s + (a.aiCharacters || 0), 0);
      const totalAiOutputTokens = Math.ceil(totalAiChars / 4);

      // Get dominant model from history
      const modelName = historyItems.length > 0
        ? historyItems[historyItems.length - 1].selectedModel?.metadata?.name ?? undefined
        : undefined;

      // Build sessions
      const sessions: Session[] = [];

      // Distribute history items & output tokens proportionally across sessions
      const perSessionHistory = Math.max(1, Math.floor(historyItems.length / nonEmpty.length));
      const perSessionOutputTokens = nonEmpty.length > 0
        ? Math.floor(totalAiOutputTokens / nonEmpty.length)
        : 0;

      for (let idx = 0; idx < nonEmpty.length; idx++) {
        const entry = nonEmpty[idx];
        const startTime = entry.timing?.created || entry.lastMessageDate || Date.now();
        const endTime = entry.timing?.lastRequestEnded || entry.lastMessageDate || startTime;

        // Get the slice of history items for this session
        const historySliceStart = idx * perSessionHistory;
        const historySliceEnd = idx === nonEmpty.length - 1
          ? historyItems.length
          : historySliceStart + perSessionHistory;
        const sessionHistory = historyItems.slice(historySliceStart, historySliceEnd);

        // Build user messages from history
        const messages: Message[] = [];
        let inputTokens = 0;

        for (let mi = 0; mi < sessionHistory.length; mi++) {
          const h = sessionHistory[mi];
          const tokens = estimateTokens(h.inputText);
          inputTokens += tokens;

          messages.push({
            id: `${entry.sessionId}-msg-${mi * 2}`,
            sessionId: entry.sessionId,
            role: 'user',
            content: h.inputText,
            timestamp: startTime + mi * 60000,
            inputTokens: tokens,
            outputTokens: 0,
            model: h.selectedModel?.metadata?.name,
          });

          // Create a synthetic assistant response placeholder
          messages.push({
            id: `${entry.sessionId}-msg-${mi * 2 + 1}`,
            sessionId: entry.sessionId,
            role: 'assistant',
            content: '(response not stored in local data)',
            timestamp: startTime + mi * 60000 + 5000,
            inputTokens: 0,
            outputTokens: Math.floor(perSessionOutputTokens / Math.max(1, sessionHistory.length)),
            model: h.selectedModel?.metadata?.name,
          });
        }

        // If no history items mapped, create a minimal message pair
        if (messages.length === 0) {
          inputTokens = estimateTokens(entry.title);
          messages.push({
            id: `${entry.sessionId}-msg-0`,
            sessionId: entry.sessionId,
            role: 'user',
            content: entry.title,
            timestamp: startTime,
            inputTokens,
            outputTokens: 0,
          });
        }

        const outputTokens = perSessionOutputTokens;
        const totalTokens = inputTokens + outputTokens;

        sessions.push({
          id: entry.sessionId,
          title: entry.title || 'Untitled Session',
          slug: entry.sessionId.slice(0, 8),
          workspace: workspaceName.path,
          workspaceName: workspaceName.name,
          startTime,
          endTime,
          duration: Math.max(0, endTime - startTime),
          messageCount: messages.length,
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCost: estimateCost(inputTokens, outputTokens, modelName),
          model: modelName,
          status: this.inferSessionStatus(endTime),
          messages,
          toolCalls: [],
        });
      }

      return sessions;
    } finally {
      db.close();
    }
  }

  private async readWorkspaceName(dirPath: string): Promise<{ name: string; path: string }> {
    try {
      const wsFile = path.join(dirPath, 'workspace.json');
      const content = await fs.readFile(wsFile, 'utf-8');
      const data = JSON.parse(content);
      const folder = data?.folder as string | undefined;
      if (folder) {
        const decoded = decodeURIComponent(folder.replace('file://', ''));
        return { path: decoded, name: path.basename(decoded) };
      }
    } catch { /* ignore */ }
    return { path: '', name: 'Unknown' };
  }

  private inferSessionStatus(endTime: number): Session['status'] {
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - endTime < fiveMinutes ? 'active' : 'completed';
  }

  // --------------- Legacy JSON/JSONL scanning ---------------

  private async scanLegacyJsonFiles(): Promise<Session[]> {
    if (!this.storagePath) { return []; }

    const sessions: Session[] = [];

    try {
      const entries = await fs.readdir(this.storagePath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(this.storagePath, entry.name);

        if (entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.jsonl'))) {
          if (await this.hasFileChanged(fullPath)) {
            const parsed = await this.parseFile(fullPath);
            sessions.push(...parsed);
          }
        } else if (entry.isDirectory()) {
          const subSessions = await this.scanDirectory(fullPath);
          sessions.push(...subSessions);
        }
      }
    } catch (err) {
      console.error('Error scanning legacy Copilot Chat storage:', err);
    }

    return sessions;
  }

  private async scanDirectory(dirPath: string): Promise<Session[]> {
    const sessions: Session[] = [];

    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      for (const file of files) {
        if (file.isFile() && (file.name.endsWith('.json') || file.name.endsWith('.jsonl'))) {
          const fullPath = path.join(dirPath, file.name);
          if (await this.hasFileChanged(fullPath)) {
            const parsed = await this.parseFile(fullPath);
            sessions.push(...parsed);
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }

    return sessions;
  }

  private async hasFileChanged(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      const mtime = stat.mtimeMs;
      const prev = this.fileModTimes.get(filePath);
      if (prev !== undefined && prev === mtime) {
        return false;
      }
      this.fileModTimes.set(filePath, mtime);
      return true;
    } catch {
      return true;
    }
  }

  private async parseFile(filePath: string): Promise<Session[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      if (filePath.endsWith('.jsonl')) {
        return this.parseJsonl(content);
      }

      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        return data
          .map((item) => this.parseLegacyConversation(item))
          .filter((s): s is Session => s !== null);
      }

      if (data && typeof data === 'object') {
        if (data.conversations && Array.isArray(data.conversations)) {
          return data.conversations
            .map((item: RawConversation) => this.parseLegacyConversation(item))
            .filter((s: Session | null): s is Session => s !== null);
        }

        const session = this.parseLegacyConversation(data);
        return session ? [session] : [];
      }
    } catch {
      // File might be encrypted, binary, or malformed — skip silently
    }

    return [];
  }

  private parseJsonl(content: string): Session[] {
    const sessions: Session[] = [];
    const lines = content.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        const session = this.parseLegacyConversation(data);
        if (session) { sessions.push(session); }
      } catch {
        // Skip malformed lines
      }
    }

    return sessions;
  }

  private parseLegacyConversation(raw: RawConversation): Session | null {
    if (!raw || typeof raw !== 'object') { return null; }

    const hasMessages = raw.messages && Array.isArray(raw.messages) && raw.messages.length > 0;
    const hasId = !!raw.id;
    if (!hasMessages && !hasId) { return null; }

    const id = raw.id || crypto.randomUUID();
    const messages = this.parseLegacyMessages(id, raw.messages || []);
    const toolCalls = this.extractToolCalls(id, raw);

    const startTime = raw.created || (messages.length > 0 ? messages[0].timestamp : Date.now());
    const lastMsgTime = messages.length > 0 ? messages[messages.length - 1].timestamp : startTime;
    const endTime = raw.lastUpdated || lastMsgTime;

    const inputTokens = messages.reduce((sum, m) => sum + (m.inputTokens || 0), 0);
    const outputTokens = messages.reduce((sum, m) => sum + (m.outputTokens || 0), 0);
    const totalTokens = inputTokens + outputTokens;

    const workspace = raw.workspaceFolder || '';
    const workspaceName = workspace ? path.basename(workspace) : 'Unknown';

    let title = raw.title || '';
    if (!title && messages.length > 0) {
      const firstUser = messages.find((m) => m.role === 'user');
      if (firstUser) {
        title = firstUser.content.slice(0, 80);
        if (firstUser.content.length > 80) { title += '...'; }
      }
    }
    title = title || 'Untitled Session';

    return {
      id,
      title,
      slug: id.slice(0, 8),
      workspace,
      workspaceName,
      startTime,
      endTime,
      duration: Math.max(0, endTime - startTime),
      messageCount: messages.length,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost: estimateCost(inputTokens, outputTokens, raw.model || messages.find((m) => m.model)?.model),
      model: raw.model || messages.find((m) => m.model)?.model,
      status: this.inferSessionStatus(endTime),
      messages,
      toolCalls,
    };
  }

  private parseLegacyMessages(sessionId: string, rawMessages: RawMessage[]): Message[] {
    return rawMessages.map((m, i) => {
      const content = m.content || m.text || '';
      const tokens = estimateTokens(content);

      return {
        id: m.id || `${sessionId}-msg-${i}`,
        sessionId,
        role: this.normalizeRole(m.role || 'user'),
        content,
        timestamp: m.timestamp || m.created || Date.now(),
        inputTokens: m.role === 'user' ? tokens : 0,
        outputTokens: m.role === 'assistant' ? tokens : 0,
        model: m.model,
      };
    });
  }

  private extractToolCalls(sessionId: string, raw: RawConversation): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    if (raw.messages) {
      for (const msg of raw.messages) {
        if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
          for (const tc of msg.toolCalls) {
            toolCalls.push({
              id: tc.id || crypto.randomUUID(),
              sessionId,
              messageId: msg.id,
              name: tc.name || tc.function?.name || 'unknown',
              input: typeof tc.input === 'object' ? JSON.stringify(tc.input) : tc.input?.toString(),
              output: typeof tc.output === 'object' ? JSON.stringify(tc.output) : tc.output?.toString(),
              timestamp: msg.timestamp || msg.created || Date.now(),
              status: 'success',
            });
          }
        }
      }
    }

    return toolCalls;
  }

  private normalizeRole(role: string): Message['role'] {
    const lower = role.toLowerCase();
    if (lower === 'user' || lower === 'human') { return 'user'; }
    if (lower === 'assistant' || lower === 'bot' || lower === 'ai') { return 'assistant'; }
    if (lower === 'system') { return 'system'; }
    if (lower === 'tool' || lower === 'function') { return 'tool'; }
    return 'user';
  }
}

interface RawConversation {
  id?: string;
  title?: string;
  messages?: RawMessage[];
  workspaceFolder?: string;
  created?: number;
  lastUpdated?: number;
  model?: string;
  [key: string]: unknown;
}

interface RawMessage {
  id?: string;
  role?: string;
  content?: string;
  text?: string;
  timestamp?: number;
  created?: number;
  model?: string;
  toolCalls?: RawToolCall[];
  [key: string]: unknown;
}

interface RawToolCall {
  id?: string;
  name?: string;
  function?: { name?: string; arguments?: string };
  input?: string | object;
  output?: string | object;
  [key: string]: unknown;
}
