import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { StorageService } from '../services/StorageService';

function makeMockContext(tmpDir: string) {
  // Ensure the WASM file is accessible at <extensionPath>/dist/sql-wasm.wasm
  const distDir = path.join(tmpDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const wasmSrc = path.resolve('node_modules/sql.js/dist/sql-wasm.wasm');
  if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, path.join(distDir, 'sql-wasm.wasm'));
  }

  return {
    globalStorageUri: { fsPath: tmpDir },
    extensionPath: tmpDir,
  } as any;
}

function makeSession(overrides: Partial<{
  id: string; title: string; workspace: string; workspaceName: string;
  startTime: number; inputTokens: number; outputTokens: number;
  totalTokens: number; estimatedCost: number; model: string; status: string;
  duration: number; messageCount: number;
}> = {}) {
  return {
    id: overrides.id ?? 'test-1',
    title: overrides.title ?? 'Test Session',
    slug: (overrides.id ?? 'test-1').slice(0, 8),
    workspace: overrides.workspace ?? '/project',
    workspaceName: overrides.workspaceName ?? 'project',
    startTime: overrides.startTime ?? Date.now(),
    duration: overrides.duration ?? 1000,
    messageCount: overrides.messageCount ?? 5,
    inputTokens: overrides.inputTokens ?? 100,
    outputTokens: overrides.outputTokens ?? 200,
    totalTokens: overrides.totalTokens ?? 300,
    estimatedCost: overrides.estimatedCost ?? 0.01,
    model: overrides.model ?? undefined,
    status: (overrides.status ?? 'completed') as 'active' | 'completed' | 'unknown',
  };
}

describe('StorageService', () => {
  let storage: StorageService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-test-'));
    const ctx = makeMockContext(tmpDir);
    storage = new StorageService(ctx);
    await storage.initialize();
  });

  afterEach(() => {
    storage.dispose();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should upsert and retrieve a session', () => {
    storage.upsertSession(makeSession());
    storage.flush();

    const sessions = storage.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe('Test Session');
    expect(sessions[0].totalTokens).toBe(300);
  });

  it('should update an existing session on re-upsert', () => {
    storage.upsertSession(makeSession({ id: 's1', title: 'Original' }));
    storage.upsertSession(makeSession({ id: 's1', title: 'Updated' }));
    storage.flush();

    const sessions = storage.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe('Updated');
  });

  it('should count sessions correctly', () => {
    for (let i = 0; i < 5; i++) {
      storage.upsertSession(makeSession({ id: `s-${i}`, startTime: Date.now() - i * 10000 }));
    }
    storage.flush();
    expect(storage.getSessionCount()).toBe(5);
  });

  it('should compute totals via SQL aggregate', () => {
    storage.upsertSession(makeSession({ id: 's1', inputTokens: 100, outputTokens: 200, totalTokens: 300, estimatedCost: 0.5 }));
    storage.upsertSession(makeSession({ id: 's2', inputTokens: 50, outputTokens: 150, totalTokens: 200, estimatedCost: 0.3 }));
    storage.flush();

    const totals = storage.getTotals();
    expect(totals.totalTokens).toBe(500);
    expect(totals.totalCost).toBeCloseTo(0.8);
  });

  it('should filter sessions by search term', () => {
    storage.upsertSession(makeSession({ id: 's1', title: 'Fix login bug' }));
    storage.upsertSession(makeSession({ id: 's2', title: 'Add feature' }));
    storage.flush();

    const results = storage.getSessions({ search: 'login' });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Fix login bug');
  });

  it('should filter sessions by status', () => {
    storage.upsertSession(makeSession({ id: 's1', status: 'active' }));
    storage.upsertSession(makeSession({ id: 's2', status: 'completed' }));
    storage.upsertSession(makeSession({ id: 's3', status: 'completed' }));
    storage.flush();

    expect(storage.getSessions({ status: 'active' })).toHaveLength(1);
    expect(storage.getSessions({ status: 'completed' })).toHaveLength(2);
    expect(storage.getSessions({ status: 'all' })).toHaveLength(3);
  });

  it('should paginate sessions', () => {
    for (let i = 0; i < 10; i++) {
      storage.upsertSession(makeSession({ id: `s-${i}`, startTime: Date.now() - i * 10000 }));
    }
    storage.flush();

    const page1 = storage.getSessions({ limit: 3, offset: 0 });
    const page2 = storage.getSessions({ limit: 3, offset: 3 });
    expect(page1).toHaveLength(3);
    expect(page2).toHaveLength(3);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('should count filtered sessions', () => {
    storage.upsertSession(makeSession({ id: 's1', title: 'Alpha', status: 'active' }));
    storage.upsertSession(makeSession({ id: 's2', title: 'Alpha Two', status: 'completed' }));
    storage.upsertSession(makeSession({ id: 's3', title: 'Beta', status: 'completed' }));
    storage.flush();

    expect(storage.getSessionCountFiltered({ search: 'Alpha' })).toBe(2);
    expect(storage.getSessionCountFiltered({ status: 'active' })).toBe(1);
  });

  it('should get session detail with messages and tool calls', () => {
    storage.upsertSession(makeSession({ id: 's1' }));
    storage.upsertMessage({
      id: 'm1', sessionId: 's1', role: 'user', content: 'Hello',
      timestamp: Date.now(), inputTokens: 10, outputTokens: 0,
    });
    storage.upsertMessage({
      id: 'm2', sessionId: 's1', role: 'assistant', content: 'Hi there',
      timestamp: Date.now() + 1000, inputTokens: 0, outputTokens: 20,
    });
    storage.upsertToolCall({
      id: 't1', sessionId: 's1', name: 'read_file', timestamp: Date.now(),
      status: 'success',
    });
    storage.flush();

    const session = storage.getSession('s1');
    expect(session).not.toBeNull();
    expect(session!.messages).toHaveLength(2);
    expect(session!.toolCalls).toHaveLength(1);
    expect(session!.toolCalls[0].name).toBe('read_file');
  });

  it('should return null for nonexistent session', () => {
    expect(storage.getSession('nonexistent')).toBeNull();
  });

  it('should group sessions into projects', () => {
    storage.upsertSession(makeSession({ id: 's1', workspace: '/a', workspaceName: 'ProjectA' }));
    storage.upsertSession(makeSession({ id: 's2', workspace: '/a', workspaceName: 'ProjectA' }));
    storage.upsertSession(makeSession({ id: 's3', workspace: '/b', workspaceName: 'ProjectB' }));
    storage.flush();

    const projects = storage.getProjects();
    expect(projects).toHaveLength(2);
    const projA = projects.find((p) => p.name === 'ProjectA');
    expect(projA?.sessionCount).toBe(2);
  });

  it('should return tool usage stats', () => {
    storage.upsertToolCall({ id: 't1', sessionId: 's1', name: 'read_file', timestamp: Date.now(), status: 'success' });
    storage.upsertToolCall({ id: 't2', sessionId: 's1', name: 'read_file', timestamp: Date.now(), status: 'success' });
    storage.upsertToolCall({ id: 't3', sessionId: 's2', name: 'write_file', timestamp: Date.now(), status: 'success' });
    storage.flush();

    const usage = storage.getAllToolUsage();
    expect(usage).toHaveLength(2);
    expect(usage[0].name).toBe('read_file');
    expect(usage[0].count).toBe(2);
  });

  it('should get today stats', () => {
    storage.upsertSession(makeSession({ id: 's1', startTime: Date.now(), totalTokens: 100, estimatedCost: 0.1 }));
    storage.flush();

    const today = storage.getTodayStats();
    expect(today.sessions).toBe(1);
    expect(today.tokens).toBe(100);
  });

  it('should compute range summary via SQL', () => {
    const now = Date.now();
    storage.upsertSession(makeSession({ id: 's1', startTime: now - 1000, inputTokens: 50, outputTokens: 100, totalTokens: 150, estimatedCost: 0.2, duration: 5000 }));
    storage.upsertSession(makeSession({ id: 's2', startTime: now - 500, inputTokens: 30, outputTokens: 70, totalTokens: 100, estimatedCost: 0.1, duration: 3000 }));
    storage.flush();

    const summary = storage.getRangeSummary(now - 2000, now);
    expect(summary.totalSessions).toBe(2);
    expect(summary.totalTokens).toBe(250);
    expect(summary.totalInputTokens).toBe(80);
    expect(summary.totalOutputTokens).toBe(170);
    expect(summary.totalCost).toBeCloseTo(0.3);
    expect(summary.totalDuration).toBe(8000);
  });

  it('should compute time series aggregates', () => {
    const now = Date.now();
    storage.upsertSession(makeSession({ id: 's1', startTime: now, inputTokens: 50, outputTokens: 100 }));
    storage.flush();

    const ts = storage.getTimeSeriesAggregates(now - 86400000, now + 86400000);
    expect(ts.length).toBeGreaterThanOrEqual(1);
    expect(ts[0].sessions).toBe(1);
    expect(ts[0].inputTokens).toBe(50);
    expect(ts[0].outputTokens).toBe(100);
  });

  it('should compute hourly aggregates with all 24 hours', () => {
    const now = Date.now();
    storage.upsertSession(makeSession({ id: 's1', startTime: now }));
    storage.flush();

    const hourly = storage.getHourlyAggregates(0, now + 1);
    expect(hourly).toHaveLength(24);
    const totalCount = hourly.reduce((s, h) => s + h.count, 0);
    expect(totalCount).toBe(1);
  });

  it('should compute model aggregates', () => {
    storage.upsertSession(makeSession({ id: 's1', model: 'gpt-4o', totalTokens: 100 }));
    storage.upsertSession(makeSession({ id: 's2', model: 'gpt-4o', totalTokens: 200 }));
    storage.upsertSession(makeSession({ id: 's3', model: 'claude-3', totalTokens: 50 }));
    storage.flush();

    const models = storage.getModelAggregates(0, Date.now() + 1);
    expect(models).toHaveLength(2);
    const gpt4 = models.find((m) => m.model === 'gpt-4o');
    expect(gpt4?.count).toBe(2);
    expect(gpt4?.tokens).toBe(300);
  });

  it('should export all data without artificial limits', () => {
    for (let i = 0; i < 10; i++) {
      storage.upsertSession(makeSession({ id: `s-${i}` }));
    }
    storage.flush();

    const data = storage.exportAllData() as { sessions: unknown[]; projects: unknown[] };
    expect(data.sessions).toHaveLength(10);
  });

  it('should persist data to disk and reload', async () => {
    storage.upsertSession(makeSession({ id: 's1', title: 'Persisted' }));
    storage.flush();
    storage.dispose();

    // Re-initialize from disk
    const ctx = makeMockContext(tmpDir);
    const storage2 = new StorageService(ctx);
    await storage2.initialize();

    const sessions = storage2.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe('Persisted');

    storage2.dispose();
  });
});
