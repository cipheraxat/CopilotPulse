import { describe, it, expect } from 'vitest';
import { reducer, initialState } from '../context/AppContext';
import type { Session, AnalyticsData, DashboardStats, AppSettings } from '../../../src/models/types';

const mockSession: Session = {
  id: 'test-1',
  title: 'Test',
  slug: 'test-1',
  workspace: '/proj',
  workspaceName: 'proj',
  startTime: Date.now(),
  duration: 1000,
  messageCount: 2,
  inputTokens: 50,
  outputTokens: 100,
  totalTokens: 150,
  estimatedCost: 0.005,
  status: 'completed',
  messages: [],
  toolCalls: [],
};

describe('reducer', () => {
  it('returns initial state for unknown action', () => {
    const result = reducer(initialState, { type: 'SET_LOADING', loading: false });
    expect(result.loading).toBe(false);
  });

  it('SET_ROUTE updates currentRoute', () => {
    const result = reducer(initialState, { type: 'SET_ROUTE', route: '/analytics' });
    expect(result.currentRoute).toBe('/analytics');
  });

  it('SET_SESSIONS updates sessions and total, clears loading', () => {
    const state = { ...initialState, loading: true };
    const result = reducer(state, {
      type: 'SET_SESSIONS',
      sessions: [mockSession],
      total: 1,
    });
    expect(result.sessions).toHaveLength(1);
    expect(result.sessionsTotal).toBe(1);
    expect(result.loading).toBe(false);
  });

  it('SET_SESSION_DETAIL updates sessionDetail, clears loading', () => {
    const state = { ...initialState, loading: true };
    const result = reducer(state, {
      type: 'SET_SESSION_DETAIL',
      session: mockSession,
    });
    expect(result.sessionDetail).toBe(mockSession);
    expect(result.loading).toBe(false);
  });

  it('SET_PROJECTS updates projects', () => {
    const result = reducer(initialState, { type: 'SET_PROJECTS', projects: [] });
    expect(result.projects).toEqual([]);
    expect(result.loading).toBe(false);
  });

  it('SET_ANALYTICS updates analytics data', () => {
    const mockAnalytics = {
      totalSessions: 10,
      totalTokens: 5000,
      totalInputTokens: 2000,
      totalOutputTokens: 3000,
      totalCost: 0.5,
      averageSessionDuration: 60000,
      averageTokensPerSession: 500,
      sessionsOverTime: [],
      tokensOverTime: [],
      inputTokensOverTime: [],
      outputTokensOverTime: [],
      costOverTime: [],
      toolUsage: [],
      peakHours: [],
      modelDistribution: [],
    } satisfies AnalyticsData;

    const result = reducer(initialState, { type: 'SET_ANALYTICS', analytics: mockAnalytics });
    expect(result.analytics).toBe(mockAnalytics);
    expect(result.loading).toBe(false);
  });

  it('SET_DASHBOARD_STATS updates stats', () => {
    const stats: DashboardStats = {
      todaySessions: 3,
      todayTokens: 1500,
      todayCost: 0.03,
      totalSessions: 100,
      totalTokens: 50000,
      totalCost: 1.5,
      activeSessions: 1,
      recentSessions: [],
    };
    const result = reducer(initialState, { type: 'SET_DASHBOARD_STATS', stats });
    expect(result.dashboardStats).toBe(stats);
  });

  it('SET_TOOLS updates tools list', () => {
    const tools = [{ name: 'search', count: 5, sessionCount: 3, percentage: 50 }];
    const result = reducer(initialState, { type: 'SET_TOOLS', tools });
    expect(result.tools).toBe(tools);
    expect(result.loading).toBe(false);
  });

  it('SET_SETTINGS updates settings', () => {
    const settings: AppSettings = {
      refreshInterval: 60,
      costPerInputToken: 0.000003,
      costPerOutputToken: 0.000015,
      showStatusBar: false,
    };
    const result = reducer(initialState, { type: 'SET_SETTINGS', settings });
    expect(result.settings).toBe(settings);
  });

  it('SET_LOADING sets loading state', () => {
    const result = reducer(initialState, { type: 'SET_LOADING', loading: true });
    expect(result.loading).toBe(true);
  });

  it('SET_ERROR sets error and clears loading', () => {
    const state = { ...initialState, loading: true };
    const result = reducer(state, { type: 'SET_ERROR', message: 'Something failed' });
    expect(result.error).toBe('Something failed');
    expect(result.loading).toBe(false);
  });

  it('SET_ERROR with null clears error', () => {
    const state = { ...initialState, error: 'old error' };
    const result = reducer(state, { type: 'SET_ERROR', message: null });
    expect(result.error).toBeNull();
  });

  it('preserves other state fields on partial update', () => {
    const stateWithSessions = reducer(initialState, {
      type: 'SET_SESSIONS',
      sessions: [mockSession],
      total: 1,
    });
    const result = reducer(stateWithSessions, { type: 'SET_ROUTE', route: '/tools' });
    expect(result.sessions).toHaveLength(1);
    expect(result.currentRoute).toBe('/tools');
  });
});
