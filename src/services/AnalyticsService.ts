import { StorageService } from './StorageService';
import type { AnalyticsData, TimeRange, ToolUsageStat, DashboardStats } from '../models/types';

export class AnalyticsService {
  constructor(private storage: StorageService) {}

  getDashboardStats(): DashboardStats {
    const today = this.storage.getTodayStats();
    const totalSessions = this.storage.getSessionCount();
    const activeSessions = this.storage.getActiveSessions();
    const recentSessions = this.storage.getRecentSessions(8);

    // Compute totals via SQL aggregate
    const totals = this.storage.getTotals();

    return {
      todaySessions: today.sessions,
      todayTokens: today.tokens,
      todayCost: today.cost,
      totalSessions,
      totalTokens: totals.totalTokens,
      totalCost: totals.totalCost,
      activeSessions: activeSessions.length,
      recentSessions,
    };
  }

  getAnalytics(timeRange: TimeRange): AnalyticsData {
    const { from, to } = this.resolveTimeRange(timeRange);

    const summary = this.storage.getRangeSummary(from, to);
    const timeSeries = this.storage.getTimeSeriesAggregates(from, to);
    const peakHours = this.storage.getHourlyAggregates(from, to);
    const modelDist = this.storage.getModelAggregates(from, to);
    const total = summary.totalSessions;

    return {
      totalSessions: summary.totalSessions,
      totalTokens: summary.totalTokens,
      totalInputTokens: summary.totalInputTokens,
      totalOutputTokens: summary.totalOutputTokens,
      totalCost: summary.totalCost,
      averageSessionDuration: total ? summary.totalDuration / total : 0,
      averageTokensPerSession: total ? summary.totalTokens / total : 0,
      sessionsOverTime: timeSeries.map((d) => ({ date: d.date, value: d.sessions })),
      tokensOverTime: timeSeries.map((d) => ({ date: d.date, value: d.inputTokens + d.outputTokens })),
      inputTokensOverTime: timeSeries.map((d) => ({ date: d.date, value: d.inputTokens })),
      outputTokensOverTime: timeSeries.map((d) => ({ date: d.date, value: d.outputTokens })),
      costOverTime: timeSeries.map((d) => ({ date: d.date, value: d.cost })),
      toolUsage: this.getToolUsageStats(),
      peakHours,
      modelDistribution: modelDist.map((m) => ({
        model: m.model,
        count: m.count,
        tokens: m.tokens,
        percentage: total > 0 ? Math.round((m.count / total) * 100) : 0,
      })),
    };
  }

  getToolUsageStats(): ToolUsageStat[] {
    const raw = this.storage.getAllToolUsage();
    const total = raw.reduce((sum, t) => sum + t.count, 0);

    return raw.map((t) => ({
      name: t.name,
      count: t.count,
      sessionCount: t.sessionCount,
      percentage: total > 0 ? Math.round((t.count / total) * 100) : 0,
    }));
  }

  private resolveTimeRange(range: TimeRange): { from: number; to: number } {
    const now = Date.now();
    const to = now;
    let from: number;

    switch (range) {
      case '24h':
        from = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        from = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        from = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case '90d':
        from = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case 'all':
      default:
        from = 0;
        break;
    }

    return { from, to };
  }
}
