import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { StorageService } from '../services/StorageService';
import { AnalyticsService } from '../services/AnalyticsService';

function makeMockContext(tmpDir: string) {
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

function seedSessions(storage: StorageService, count: number) {
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    storage.upsertSession({
      id: `s-${i}`,
      title: `Session ${i}`,
      slug: `s-${i}`.slice(0, 8),
      workspace: '/project',
      workspaceName: 'project',
      startTime: now - i * 3600_000,
      duration: 60_000,
      messageCount: 3,
      inputTokens: 100 + i * 10,
      outputTokens: 200 + i * 20,
      totalTokens: 300 + i * 30,
      estimatedCost: 0.01 + i * 0.005,
      model: i % 2 === 0 ? 'gpt-4o' : 'claude-3',
      status: i === 0 ? 'active' : 'completed',
    });
  }
  storage.flush();
}

describe('AnalyticsService', () => {
  let storage: StorageService;
  let analytics: AnalyticsService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-analytics-'));
    const ctx = makeMockContext(tmpDir);
    storage = new StorageService(ctx);
    await storage.initialize();
    analytics = new AnalyticsService(storage);
  });

  afterEach(() => {
    storage.dispose();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return dashboard stats', () => {
    seedSessions(storage, 5);
    const stats = analytics.getDashboardStats();

    expect(stats.totalSessions).toBe(5);
    expect(stats.totalTokens).toBeGreaterThan(0);
    expect(stats.totalCost).toBeGreaterThan(0);
    expect(stats.activeSessions).toBe(1);
    expect(stats.recentSessions.length).toBeGreaterThan(0);
  });

  it('should return dashboard stats for empty database', () => {
    const stats = analytics.getDashboardStats();
    expect(stats.totalSessions).toBe(0);
    expect(stats.todaySessions).toBe(0);
  });

  it('should return analytics for 24h time range', () => {
    seedSessions(storage, 5);
    const data = analytics.getAnalytics('24h');

    expect(data.totalSessions).toBeGreaterThanOrEqual(0);
    expect(data.sessionsOverTime).toBeDefined();
    expect(data.tokensOverTime).toBeDefined();
    expect(data.inputTokensOverTime).toBeDefined();
    expect(data.outputTokensOverTime).toBeDefined();
    expect(data.costOverTime).toBeDefined();
    expect(data.peakHours).toHaveLength(24);
    expect(data.modelDistribution).toBeDefined();
  });

  it('should return analytics for all time range', () => {
    seedSessions(storage, 10);
    const data = analytics.getAnalytics('all');

    expect(data.totalSessions).toBe(10);
    expect(data.totalTokens).toBeGreaterThan(0);
    expect(data.totalInputTokens).toBeGreaterThan(0);
    expect(data.totalOutputTokens).toBeGreaterThan(0);
    expect(data.averageSessionDuration).toBeGreaterThan(0);
    expect(data.averageTokensPerSession).toBeGreaterThan(0);
  });

  it('should have real input/output token breakdown in time series', () => {
    seedSessions(storage, 3);
    const data = analytics.getAnalytics('all');

    const totalInput = data.inputTokensOverTime.reduce((s, p) => s + p.value, 0);
    const totalOutput = data.outputTokensOverTime.reduce((s, p) => s + p.value, 0);

    expect(totalInput).toBe(data.totalInputTokens);
    expect(totalOutput).toBe(data.totalOutputTokens);
  });

  it('should compute model distribution', () => {
    seedSessions(storage, 6);
    const data = analytics.getAnalytics('all');

    expect(data.modelDistribution.length).toBeGreaterThan(0);
    const totalPct = data.modelDistribution.reduce((s, m) => s + m.percentage, 0);
    // Percentages may not sum to exactly 100 due to rounding
    expect(totalPct).toBeGreaterThanOrEqual(95);
    expect(totalPct).toBeLessThanOrEqual(105);
  });

  it('should return tool usage stats', () => {
    seedSessions(storage, 2);
    storage.upsertToolCall({
      id: 't1', sessionId: 's-0', name: 'read_file',
      timestamp: Date.now(), status: 'success',
    });
    storage.upsertToolCall({
      id: 't2', sessionId: 's-0', name: 'read_file',
      timestamp: Date.now(), status: 'success',
    });
    storage.upsertToolCall({
      id: 't3', sessionId: 's-1', name: 'write_file',
      timestamp: Date.now(), status: 'success',
    });
    storage.flush();

    const tools = analytics.getToolUsageStats();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('read_file');
    expect(tools[0].count).toBe(2);
    expect(tools[0].percentage).toBeGreaterThan(0);
  });
});
