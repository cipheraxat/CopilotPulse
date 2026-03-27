import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import initSqlJs, { Database } from 'sql.js';
import type { Session, Message, ToolCall, Project } from '../models/types';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Untitled',
    slug TEXT,
    workspace TEXT NOT NULL DEFAULT '',
    workspace_name TEXT NOT NULL DEFAULT '',
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    duration INTEGER NOT NULL DEFAULT 0,
    message_count INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost REAL NOT NULL DEFAULT 0,
    model TEXT,
    status TEXT NOT NULL DEFAULT 'unknown'
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    timestamp INTEGER NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    model TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS tool_calls (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    message_id TEXT,
    name TEXT NOT NULL,
    input TEXT,
    output TEXT,
    timestamp INTEGER NOT NULL,
    duration INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_time);
  CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace);
`;

export class StorageService {
  private db: Database | null = null;
  private dbPath: string;

  constructor(private context: vscode.ExtensionContext) {
    this.dbPath = path.join(context.globalStorageUri.fsPath, 'dashboard.db');
  }

  async initialize(): Promise<void> {
    const storagePath = this.context.globalStorageUri.fsPath;
    await fs.promises.mkdir(storagePath, { recursive: true });

    const wasmPath = path.join(this.context.extensionPath, 'dist', 'sql-wasm.wasm');
    const SQL = await initSqlJs({
      locateFile: () => wasmPath,
    });

    try {
      const buffer = await fs.promises.readFile(this.dbPath);
      this.db = new SQL.Database(buffer);
    } catch {
      this.db = new SQL.Database();
    }

    this.db.run(SCHEMA);
    this.save();
  }

  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  private save(): void {
    this.dirty = true;
    if (!this.saveTimer) {
      this.saveTimer = setTimeout(() => {
        this.flush().catch(err => console.error('Error writing database:', err));
      }, 500);
    }
  }

  async flush(): Promise<void> {
    if (this.dirty && this.db) {
      const data = this.db.export();
      await fs.promises.writeFile(this.dbPath, Buffer.from(data));
      this.dirty = false;
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  flushSync(): void {
    if (this.dirty && this.db) {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
      this.dirty = false;
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  // Sessions
  upsertSession(session: Omit<Session, 'messages' | 'toolCalls'>): void {
    if (!this.db) { return; }
    this.db.run(
      `INSERT OR REPLACE INTO sessions 
       (id, title, slug, workspace, workspace_name, start_time, end_time, duration,
        message_count, input_tokens, output_tokens, total_tokens, estimated_cost, model, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id, session.title, session.slug, session.workspace,
        session.workspaceName, session.startTime, session.endTime ?? null,
        session.duration, session.messageCount, session.inputTokens,
        session.outputTokens, session.totalTokens, session.estimatedCost,
        session.model ?? null, session.status,
      ]
    );
    this.save();
  }

  upsertMessage(message: Message): void {
    if (!this.db) { return; }
    this.db.run(
      `INSERT OR REPLACE INTO messages 
       (id, session_id, role, content, timestamp, input_tokens, output_tokens, model)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id, message.sessionId, message.role, message.content,
        message.timestamp, message.inputTokens ?? 0, message.outputTokens ?? 0,
        message.model ?? null,
      ]
    );
    this.save();
  }

  upsertToolCall(toolCall: ToolCall): void {
    if (!this.db) { return; }
    this.db.run(
      `INSERT OR REPLACE INTO tool_calls 
       (id, session_id, message_id, name, input, output, timestamp, duration, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        toolCall.id, toolCall.sessionId, toolCall.messageId ?? null,
        toolCall.name, toolCall.input ?? null, toolCall.output ?? null,
        toolCall.timestamp, toolCall.duration ?? null, toolCall.status,
      ]
    );
    this.save();
  }

  getSessions(options?: {
    search?: string;
    workspace?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    offset?: number;
  }): Session[] {
    if (!this.db) { return []; }

    let query = 'SELECT * FROM sessions WHERE 1=1';
    const params: unknown[] = [];

    if (options?.search) {
      query += ' AND (title LIKE ? OR workspace_name LIKE ?)';
      const term = `%${options.search}%`;
      params.push(term, term);
    }
    if (options?.workspace) {
      query += ' AND workspace = ?';
      params.push(options.workspace);
    }
    if (options?.status && options.status !== 'all') {
      query += ' AND status = ?';
      params.push(options.status);
    }

    const sortCol = {
      date: 'start_time',
      duration: 'duration',
      tokens: 'total_tokens',
      cost: 'estimated_cost',
    }[options?.sortBy ?? 'date'] ?? 'start_time';
    const sortDir = options?.sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${sortDir}`;

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = this.db.exec(query, params);
    if (!rows.length) { return []; }

    return rows[0].values.map((row) => this.rowToSession(rows[0].columns, row));
  }

  getSession(id: string): Session | null {
    if (!this.db) { return null; }

    const sessionRows = this.db.exec('SELECT * FROM sessions WHERE id = ?', [id]);
    if (!sessionRows.length || !sessionRows[0].values.length) { return null; }

    const session = this.rowToSession(sessionRows[0].columns, sessionRows[0].values[0]);

    // Load messages
    const msgRows = this.db.exec(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [id]
    );
    if (msgRows.length) {
      session.messages = msgRows[0].values.map((row) =>
        this.rowToMessage(msgRows[0].columns, row)
      );
    }

    // Load tool calls
    const toolRows = this.db.exec(
      'SELECT * FROM tool_calls WHERE session_id = ? ORDER BY timestamp ASC',
      [id]
    );
    if (toolRows.length) {
      session.toolCalls = toolRows[0].values.map((row) =>
        this.rowToToolCall(toolRows[0].columns, row)
      );
    }

    return session;
  }

  getProjects(): Project[] {
    if (!this.db) { return []; }

    const rows = this.db.exec(`
      SELECT workspace, workspace_name,
             COUNT(*) as session_count,
             SUM(total_tokens) as total_tokens,
             SUM(estimated_cost) as total_cost,
             MAX(start_time) as last_active
      FROM sessions
      WHERE workspace != ''
      GROUP BY workspace
      ORDER BY last_active DESC
    `);

    if (!rows.length) { return []; }

    return rows[0].values.map((row) => {
      const cols = rows[0].columns;
      const get = (name: string) => row[cols.indexOf(name)];
      const workspace = String(get('workspace') ?? '');
      return {
        id: workspace,
        path: workspace,
        name: String(get('workspace_name') ?? workspace.split('/').pop() ?? 'Unknown'),
        sessionCount: Number(get('session_count') ?? 0),
        totalTokens: Number(get('total_tokens') ?? 0),
        totalCost: Number(get('total_cost') ?? 0),
        lastActive: Number(get('last_active') ?? 0),
        sessions: [],
      };
    });
  }

  getSessionCount(): number {
    if (!this.db) { return 0; }
    const rows = this.db.exec('SELECT COUNT(*) as cnt FROM sessions');
    if (!rows.length) { return 0; }
    return Number(rows[0].values[0][0]) || 0;
  }

  getTodayStats(): { sessions: number; tokens: number; cost: number } {
    if (!this.db) { return { sessions: 0, tokens: 0, cost: 0 }; }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const ts = todayStart.getTime();

    const rows = this.db.exec(`
      SELECT COUNT(*) as cnt, 
             COALESCE(SUM(total_tokens), 0) as tokens,
             COALESCE(SUM(estimated_cost), 0) as cost
      FROM sessions WHERE start_time >= ?
    `, [ts]);

    if (!rows.length) { return { sessions: 0, tokens: 0, cost: 0 }; }
    const val = rows[0].values[0];
    return {
      sessions: Number(val[0]) || 0,
      tokens: Number(val[1]) || 0,
      cost: Number(val[2]) || 0,
    };
  }

  getActiveSessions(): Session[] {
    if (!this.db) { return []; }
    const rows = this.db.exec(
      "SELECT * FROM sessions WHERE status = 'active' ORDER BY start_time DESC"
    );
    if (!rows.length) { return []; }
    return rows[0].values.map((row) => this.rowToSession(rows[0].columns, row));
  }

  getRecentSessions(limit = 10): Session[] {
    return this.getSessions({ sortBy: 'date', sortOrder: 'desc', limit });
  }

  getAllToolUsage(from?: number, to?: number): { name: string; count: number; sessionCount: number }[] {
    if (!this.db) { return []; }

    let query = `
      SELECT name, 
             COUNT(*) as count,
             COUNT(DISTINCT session_id) as session_count
      FROM tool_calls`;
    const params: unknown[] = [];
    if (from !== undefined && to !== undefined) {
      query += ' WHERE timestamp >= ? AND timestamp <= ?';
      params.push(from, to);
    }
    query += ' GROUP BY name ORDER BY count DESC';

    const rows = this.db.exec(query, params);

    if (!rows.length) { return []; }
    return rows[0].values.map((row) => ({
      name: String(row[0]),
      count: Number(row[1]),
      sessionCount: Number(row[2]),
    }));
  }

  exportAllData(): { sessions: Session[]; projects: Project[] } {
    return {
      sessions: this.getSessions(),
      projects: this.getProjects(),
    };
  }

  getTotals(): { totalTokens: number; totalCost: number } {
    if (!this.db) { return { totalTokens: 0, totalCost: 0 }; }
    const rows = this.db.exec(
      'SELECT COALESCE(SUM(total_tokens), 0) as tokens, COALESCE(SUM(estimated_cost), 0) as cost FROM sessions'
    );
    if (!rows.length) { return { totalTokens: 0, totalCost: 0 }; }
    return {
      totalTokens: Number(rows[0].values[0][0]) || 0,
      totalCost: Number(rows[0].values[0][1]) || 0,
    };
  }

  getTimeSeriesAggregates(from: number, to: number): { date: string; sessions: number; inputTokens: number; outputTokens: number; cost: number }[] {
    if (!this.db) { return []; }
    const rows = this.db.exec(`
      SELECT
        date(start_time / 1000, 'unixepoch', 'localtime') as day,
        COUNT(*) as sessions,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(estimated_cost), 0) as cost
      FROM sessions
      WHERE start_time >= ? AND start_time <= ?
      GROUP BY day
      ORDER BY day ASC
    `, [from, to]);
    if (!rows.length) { return []; }
    return rows[0].values.map((row) => ({
      date: String(row[0]),
      sessions: Number(row[1]),
      inputTokens: Number(row[2]),
      outputTokens: Number(row[3]),
      cost: Number(row[4]),
    }));
  }

  getHourlyAggregates(from: number, to: number): { hour: number; count: number }[] {
    if (!this.db) { return []; }
    const rows = this.db.exec(`
      SELECT
        CAST(strftime('%H', start_time / 1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
        COUNT(*) as count
      FROM sessions
      WHERE start_time >= ? AND start_time <= ?
      GROUP BY hour
      ORDER BY hour ASC
    `, [from, to]);
    if (!rows.length) { return []; }
    const hourMap = new Map<number, number>();
    for (const row of rows[0].values) {
      hourMap.set(Number(row[0]), Number(row[1]));
    }
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourMap.get(h) || 0,
    }));
  }

  getModelAggregates(from: number, to: number): { model: string; count: number; tokens: number }[] {
    if (!this.db) { return []; }
    const rows = this.db.exec(`
      SELECT
        COALESCE(model, 'unknown') as model,
        COUNT(*) as count,
        COALESCE(SUM(total_tokens), 0) as tokens
      FROM sessions
      WHERE start_time >= ? AND start_time <= ?
      GROUP BY model
      ORDER BY count DESC
    `, [from, to]);
    if (!rows.length) { return []; }
    return rows[0].values.map((row) => ({
      model: String(row[0]),
      count: Number(row[1]),
      tokens: Number(row[2]),
    }));
  }

  getRangeSummary(from: number, to: number): { totalSessions: number; totalTokens: number; totalInputTokens: number; totalOutputTokens: number; totalCost: number; totalDuration: number } {
    if (!this.db) { return { totalSessions: 0, totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, totalDuration: 0 }; }
    const rows = this.db.exec(`
      SELECT
        COUNT(*) as total_sessions,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(input_tokens), 0) as total_input_tokens,
        COALESCE(SUM(output_tokens), 0) as total_output_tokens,
        COALESCE(SUM(estimated_cost), 0) as total_cost,
        COALESCE(SUM(duration), 0) as total_duration
      FROM sessions
      WHERE start_time >= ? AND start_time <= ?
    `, [from, to]);
    if (!rows.length) { return { totalSessions: 0, totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, totalDuration: 0 }; }
    const val = rows[0].values[0];
    return {
      totalSessions: Number(val[0]) || 0,
      totalTokens: Number(val[1]) || 0,
      totalInputTokens: Number(val[2]) || 0,
      totalOutputTokens: Number(val[3]) || 0,
      totalCost: Number(val[4]) || 0,
      totalDuration: Number(val[5]) || 0,
    };
  }

  getSessionCountFiltered(options?: {
    search?: string;
    workspace?: string;
    status?: string;
  }): number {
    if (!this.db) { return 0; }
    let query = 'SELECT COUNT(*) FROM sessions WHERE 1=1';
    const params: unknown[] = [];
    if (options?.search) {
      query += ' AND (title LIKE ? OR workspace_name LIKE ?)';
      const term = `%${options.search}%`;
      params.push(term, term);
    }
    if (options?.workspace) {
      query += ' AND workspace = ?';
      params.push(options.workspace);
    }
    if (options?.status && options.status !== 'all') {
      query += ' AND status = ?';
      params.push(options.status);
    }
    const rows = this.db.exec(query, params);
    if (!rows.length) { return 0; }
    return Number(rows[0].values[0][0]) || 0;
  }

  dispose(): void {
    if (this.db) {
      this.flushSync();
      this.db.close();
      this.db = null;
    }
  }

  // Row mappers
  private rowToSession(columns: string[], row: unknown[]): Session {
    const get = (name: string) => row[columns.indexOf(name)];
    return {
      id: String(get('id') ?? ''),
      title: String(get('title') ?? ''),
      slug: String(get('slug') ?? ''),
      workspace: String(get('workspace') ?? ''),
      workspaceName: String(get('workspace_name') ?? ''),
      startTime: Number(get('start_time') ?? 0),
      endTime: get('end_time') ? Number(get('end_time')) : undefined,
      duration: Number(get('duration') ?? 0),
      messageCount: Number(get('message_count') ?? 0),
      inputTokens: Number(get('input_tokens') ?? 0),
      outputTokens: Number(get('output_tokens') ?? 0),
      totalTokens: Number(get('total_tokens') ?? 0),
      estimatedCost: Number(get('estimated_cost') ?? 0),
      model: get('model') ? String(get('model')) : undefined,
      status: (String(get('status') ?? 'unknown') as Session['status']),
      messages: [],
      toolCalls: [],
    };
  }

  private rowToMessage(columns: string[], row: unknown[]): Message {
    const get = (name: string) => row[columns.indexOf(name)];
    return {
      id: String(get('id') ?? ''),
      sessionId: String(get('session_id') ?? ''),
      role: String(get('role') ?? 'user') as Message['role'],
      content: String(get('content') ?? ''),
      timestamp: Number(get('timestamp') ?? 0),
      inputTokens: Number(get('input_tokens') ?? 0),
      outputTokens: Number(get('output_tokens') ?? 0),
      model: get('model') ? String(get('model')) : undefined,
    };
  }

  private rowToToolCall(columns: string[], row: unknown[]): ToolCall {
    const get = (name: string) => row[columns.indexOf(name)];
    return {
      id: String(get('id') ?? ''),
      sessionId: String(get('session_id') ?? ''),
      messageId: get('message_id') ? String(get('message_id')) : undefined,
      name: String(get('name') ?? ''),
      input: get('input') ? String(get('input')) : undefined,
      output: get('output') ? String(get('output')) : undefined,
      timestamp: Number(get('timestamp') ?? 0),
      duration: get('duration') ? Number(get('duration')) : undefined,
      status: String(get('status') ?? 'pending') as ToolCall['status'],
    };
  }
}
