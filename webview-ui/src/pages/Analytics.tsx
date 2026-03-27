import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatsCard } from '../components/Charts/StatsCard';
import { BarChartComponent } from '../components/Charts/BarChart';
import { LineChartComponent } from '../components/Charts/LineChart';
import { DonutChart } from '../components/Charts/DonutChart';
import { StatsSkeleton } from '../components/Common/Skeleton';
import { EmptyState } from '../components/Common/EmptyState';
import { formatCost, formatNumber } from '../utilities/formatters';
import { TIME_RANGES, CHART_COLORS } from '../utilities/constants';
import type { TimeRange } from '../../../src/models/types';

export function Analytics() {
  const { state, fetchAnalytics } = useApp();
  const { analytics, loading } = state;
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    fetchAnalytics(timeRange);
  }, [fetchAnalytics, timeRange]);

  if (loading && !analytics) {
    return (
      <div className="p-4 space-y-6">
        <h1 className="text-lg font-bold">Analytics</h1>
        <StatsSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Analytics</h1>
        <div className="flex gap-1">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                timeRange === tr.value
                  ? 'bg-vscode-button-bg text-vscode-button-fg'
                  : 'opacity-60 hover:opacity-100'
              }`}
              onClick={() => setTimeRange(tr.value as TimeRange)}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {!analytics || analytics.totalSessions === 0 ? (
        <EmptyState
          icon="📈"
          title="No analytics data"
          description="Analytics will appear once sessions are tracked."
        />
      ) : (
        <>
          {/* Hero Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatsCard label="Sessions" value={String(analytics.totalSessions)} icon="💬" />
            <StatsCard label="Total Tokens" value={formatNumber(analytics.totalTokens)} icon="🔤" />
            <StatsCard label="Total Cost" value={formatCost(analytics.totalCost)} icon="💰" />
            <StatsCard
              label="Avg Duration"
              value={`${Math.round(analytics.averageSessionDuration / 60000)}m`}
              icon="⏱"
            />
          </div>

          {/* Sessions Over Time */}
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">Sessions Over Time</h3>
            <BarChartComponent
              data={analytics.sessionsOverTime}
              color={CHART_COLORS.primary}
              height={250}
            />
          </div>

          {/* Token Trends */}
          {analytics.inputTokensOverTime.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold mb-3">Token Usage Trends</h3>
              <LineChartComponent
                data={analytics.inputTokensOverTime.map((d, i) => ({
                  date: d.date,
                  input: d.value,
                  output: analytics.outputTokensOverTime[i]?.value ?? 0,
                }))}
                lines={[
                  { dataKey: 'input', color: CHART_COLORS.tokens.input, name: 'Input Tokens' },
                  { dataKey: 'output', color: CHART_COLORS.tokens.output, name: 'Output Tokens' },
                ]}
                height={250}
                formatValue={(v) => formatNumber(v)}
              />
            </div>
          )}

          {/* Cost Over Time */}
          {analytics.costOverTime.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold mb-3">Cost Over Time</h3>
              <BarChartComponent
                data={analytics.costOverTime}
                color={CHART_COLORS.success}
                height={200}
                formatValue={(v) => formatCost(v)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Model Distribution */}
            {analytics.modelDistribution.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold mb-3">Model Distribution</h3>
                <DonutChart
                  data={analytics.modelDistribution.map((m) => ({
                    name: m.model,
                    value: m.count,
                  }))}
                  height={250}
                />
              </div>
            )}

            {/* Peak Hours */}
            {analytics.peakHours.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold mb-3">Activity by Hour</h3>
                <BarChartComponent
                  data={analytics.peakHours.map((h) => ({
                    date: `${h.hour}:00`,
                    value: h.count,
                  }))}
                  color={CHART_COLORS.warning}
                  height={250}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
