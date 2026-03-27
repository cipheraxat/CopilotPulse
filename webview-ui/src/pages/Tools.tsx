import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DonutChart } from '../components/Charts/DonutChart';
import { CardSkeleton } from '../components/Common/Skeleton';
import { EmptyState } from '../components/Common/EmptyState';

export function Tools() {
  const { state, fetchTools } = useApp();
  const { tools, loading } = state;

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  if (loading && !tools.length) {
    return (
      <div className="p-4 space-y-3">
        <h1 className="text-lg font-bold">Tool Usage</h1>
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  const chartData = tools.slice(0, 10).map((t) => ({
    name: t.name,
    value: t.count,
  }));

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-lg font-bold">Tool Usage</h1>

      {tools.length === 0 ? (
        <EmptyState
          icon="🛠"
          title="No tool usage data"
          description="Tool usage statistics will appear once sessions with tool calls are tracked."
        />
      ) : (
        <>
          {/* Distribution Chart */}
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">Tool Distribution</h3>
            <DonutChart data={chartData} height={300} />
          </div>

          {/* Tool List */}
          <div className="space-y-2">
            {tools.map((tool) => (
              <div key={tool.name} className="card flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">{tool.name}</h3>
                  <p className="text-xs opacity-50 mt-0.5">
                    Used in {tool.sessionCount} session{tool.sessionCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-sm">{tool.count}</span>
                  <span className="text-xs opacity-50 ml-1">calls</span>
                  <div className="w-24 h-1.5 rounded-full bg-vscode-input-bg mt-1">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${tool.percentage}%`,
                        backgroundColor: 'var(--vscode-charts-blue, #4f8ff7)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
