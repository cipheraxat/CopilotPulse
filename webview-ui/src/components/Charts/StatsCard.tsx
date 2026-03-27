import React from 'react';

interface StatsCardProps {
  label: string;
  value: string;
  icon?: string;
  trend?: { value: number; label: string };
  color?: string;
}

export function StatsCard({ label, value, icon, trend, color }: StatsCardProps) {
  return (
    <div className="card flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg opacity-60">{icon}</span>}
        <span className="stat-label truncate">{label}</span>
      </div>
      <div className="stat-value" style={color ? { color } : undefined}>
        {value}
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs">
          <span style={{ color: trend.value >= 0 ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-errorForeground)' }}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="opacity-60">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
