import React from 'react';
import { useApp } from '../../context/AppContext';

interface NavCardProps {
  path: string;
  icon: string;
  title: string;
  description: string;
  stat?: string;
}

function NavCard({ path, icon, title, description, stat }: NavCardProps) {
  const { navigate } = useApp();

  return (
    <button
      className="card text-left cursor-pointer transition-all hover:scale-[1.02] flex flex-col gap-2"
      onClick={() => navigate(path)}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {stat && <span className="badge">{stat}</span>}
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs opacity-60">{description}</p>
    </button>
  );
}

export function NavigationGrid() {
  const { state } = useApp();
  const stats = state.dashboardStats;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <NavCard
        path="/sessions"
        icon="💬"
        title="Sessions"
        description="Browse all Copilot Chat sessions"
        stat={stats ? `${stats.totalSessions}` : undefined}
      />
      <NavCard
        path="/projects"
        icon="📁"
        title="Projects"
        description="Sessions grouped by workspace"
      />
      <NavCard
        path="/analytics"
        icon="📈"
        title="Analytics"
        description="Token usage, costs, and trends"
      />
      <NavCard
        path="/tools"
        icon="🛠"
        title="Tools"
        description="Tool usage across sessions"
      />
      <NavCard
        path="/settings"
        icon="⚙️"
        title="Settings"
        description="Configure cost rates and more"
      />
    </div>
  );
}
