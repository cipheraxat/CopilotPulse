import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageHandler } from '../services/MessageHandler';
import type { MessageToWebview } from '../models/types';

// Create mock services
function createMockStorage() {
  return {
    getSessions: vi.fn().mockReturnValue([
      { id: 's1', title: 'Test', messages: [], toolCalls: [], totalTokens: 100 },
    ]),
    getSession: vi.fn().mockReturnValue({
      id: 's1', title: 'Test', messages: [], toolCalls: [],
    }),
    getProjects: vi.fn().mockReturnValue([]),
    getSessionCountFiltered: vi.fn().mockReturnValue(1),
    exportAllData: vi.fn().mockReturnValue({ sessions: [], projects: [] }),
  } as any;
}

function createMockAnalytics() {
  return {
    getDashboardStats: vi.fn().mockReturnValue({
      todaySessions: 1, todayTokens: 100, todayCost: 0.01,
      totalSessions: 5, totalTokens: 500, totalCost: 0.05,
      activeSessions: 1, recentSessions: [],
    }),
    getAnalytics: vi.fn().mockReturnValue({
      totalSessions: 5, totalTokens: 500, totalInputTokens: 200,
      totalOutputTokens: 300, totalCost: 0.05, averageSessionDuration: 60,
      averageTokensPerSession: 100, sessionsOverTime: [], tokensOverTime: [],
      inputTokensOverTime: [], outputTokensOverTime: [],
      costOverTime: [], toolUsage: [], peakHours: [], modelDistribution: [],
    }),
    getToolUsageStats: vi.fn().mockReturnValue([]),
  } as any;
}

function createMockContext() {
  return {
    globalStorageUri: { fsPath: '/tmp/test' },
    extensionPath: '/tmp/test',
  } as any;
}

describe('MessageHandler', () => {
  let handler: MessageHandler;
  let mockStorage: ReturnType<typeof createMockStorage>;
  let mockAnalytics: ReturnType<typeof createMockAnalytics>;
  let posted: MessageToWebview[];

  beforeEach(() => {
    mockStorage = createMockStorage();
    mockAnalytics = createMockAnalytics();
    handler = new MessageHandler(mockStorage, mockAnalytics, createMockContext());
    posted = [];
  });

  const post = (msg: MessageToWebview) => { posted.push(msg); };

  it('should handle get-sessions', async () => {
    await handler.handle({ type: 'get-sessions' }, post);

    expect(mockStorage.getSessions).toHaveBeenCalled();
    expect(mockStorage.getSessionCountFiltered).toHaveBeenCalled();
    expect(posted).toHaveLength(1);
    expect(posted[0].type).toBe('sessions');
  });

  it('should handle get-sessions with filter', async () => {
    await handler.handle({
      type: 'get-sessions',
      filter: { search: 'test', page: 2, pageSize: 10, status: 'active', sortBy: 'tokens', sortOrder: 'asc' },
    }, post);

    expect(mockStorage.getSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'test',
        limit: 10,
        offset: 10,
        status: 'active',
        sortBy: 'tokens',
        sortOrder: 'asc',
      }),
    );
  });

  it('should handle get-session-detail', async () => {
    await handler.handle({ type: 'get-session-detail', sessionId: 's1' }, post);

    expect(mockStorage.getSession).toHaveBeenCalledWith('s1');
    expect(posted).toHaveLength(1);
    expect(posted[0].type).toBe('session-detail');
  });

  it('should return error for missing session', async () => {
    mockStorage.getSession.mockReturnValue(null);

    await handler.handle({ type: 'get-session-detail', sessionId: 'missing' }, post);

    expect(posted).toHaveLength(1);
    expect(posted[0].type).toBe('error');
  });

  it('should handle get-projects', async () => {
    await handler.handle({ type: 'get-projects' }, post);
    expect(mockStorage.getProjects).toHaveBeenCalled();
    expect(posted[0].type).toBe('projects');
  });

  it('should handle get-analytics', async () => {
    await handler.handle({ type: 'get-analytics', timeRange: '7d' }, post);
    expect(mockAnalytics.getAnalytics).toHaveBeenCalledWith('7d');
    expect(posted[0].type).toBe('analytics');
  });

  it('should handle get-dashboard-stats', async () => {
    await handler.handle({ type: 'get-dashboard-stats' }, post);
    expect(mockAnalytics.getDashboardStats).toHaveBeenCalled();
    expect(posted[0].type).toBe('dashboard-stats');
  });

  it('should handle get-tools', async () => {
    await handler.handle({ type: 'get-tools' }, post);
    expect(mockAnalytics.getToolUsageStats).toHaveBeenCalled();
    expect(posted[0].type).toBe('tools');
  });

  it('should handle get-settings', async () => {
    await handler.handle({ type: 'get-settings' }, post);
    expect(posted).toHaveLength(1);
    expect(posted[0].type).toBe('settings');
    if (posted[0].type === 'settings') {
      expect(posted[0].data.refreshInterval).toBe(30);
    }
  });

  it('should validate open-external URL scheme', async () => {
    const openExternal = vi.fn();
    const { env } = await import('vscode');
    (env as any).openExternal = openExternal;

    await handler.handle({ type: 'open-external', url: 'https://github.com' }, post);
    expect(openExternal).toHaveBeenCalled();

    openExternal.mockClear();
    await handler.handle({ type: 'open-external', url: 'file:///etc/passwd' }, post);
    expect(openExternal).not.toHaveBeenCalled();

    openExternal.mockClear();
    await handler.handle({ type: 'open-external', url: 'javascript:alert(1)' }, post);
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('should catch and report errors', async () => {
    mockStorage.getSessions.mockImplementation(() => { throw new Error('DB locked'); });

    await handler.handle({ type: 'get-sessions' }, post);

    expect(posted).toHaveLength(1);
    expect(posted[0].type).toBe('error');
    if (posted[0].type === 'error') {
      expect(posted[0].message).toBe('DB locked');
    }
  });
});
