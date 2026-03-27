import React from 'react';
import { useApp } from '../context/AppContext';
import { StatsCard } from '../components/Charts/StatsCard';
import { NavigationGrid } from '../components/Layout/NavigationGrid';
import { SessionList } from '../components/Session/SessionList';
import { StatsSkeleton } from '../components/Common/Skeleton';
import { EmptyState } from '../components/Common/EmptyState';
import { formatCost, formatNumber } from '../utilities/formatters';

export function Home() {
  const { state, fetchDashboardStats, navigate } = useApp();
  const { dashboardStats: stats, loading } = state;

  React.useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (loading && !stats) {
    return (
      <div className="p-4 space-y-6">
        <StatsSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-lg font-bold mb-1">CopilotPulse</h1>
        <p className="text-xs opacity-60">Monitor your Copilot Chat usage</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard
            label="Today's Sessions"
            value={String(stats.todaySessions)}
            icon="💬"
          />
          <StatsCard
            label="Today's Tokens"
            value={formatNumber(stats.todayTokens)}
            icon="🔤"
          />
          <StatsCard
            label="Today's Cost"
            value={formatCost(stats.todayCost)}
            icon="💰"
          />
          <StatsCard
            label="Active Now"
            value={String(stats.activeSessions)}
            icon="🟢"
          />
        </div>
      )}

      <NavigationGrid />

      {stats && stats.recentSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Recent Sessions</h2>
          <SessionList sessions={stats.recentSessions} onSessionClick={(s) => navigate(`/sessions/${s.id}`)} />
        </div>
      )}

      {stats && stats.totalSessions === 0 && (
        <EmptyState
          icon="💬"
          title="No sessions tracked yet"
          description="Start using GitHub Copilot Chat and sessions will appear here automatically."
        />
      )}
    </div>
  );
}
