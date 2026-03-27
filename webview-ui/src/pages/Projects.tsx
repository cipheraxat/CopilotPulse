import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CardSkeleton } from '../components/Common/Skeleton';
import { EmptyState } from '../components/Common/EmptyState';
import { formatNumber, formatCost, relativeTime } from '../utilities/formatters';

export function Projects() {
  const { state, fetchProjects, navigate } = useApp();
  const { projects, loading } = state;

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  if (loading && !projects.length) {
    return (
      <div className="p-4 space-y-3">
        <h1 className="text-lg font-bold">Projects</h1>
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold">Projects</h1>

      {projects.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No projects found"
          description="Projects will appear here once sessions are grouped by workspace."
        />
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <button
              key={project.id}
              className="card w-full text-left cursor-pointer transition-all hover:scale-[1.01]"
              onClick={() => {
                navigate('/sessions');
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{project.name}</h3>
                  <p className="text-xs opacity-50 mt-0.5 truncate max-w-[300px]">{project.path}</p>
                </div>
                <span className="text-xs opacity-50">{relativeTime(project.lastActive)}</span>
              </div>
              <div className="flex gap-4 text-xs opacity-70">
                <span>💬 {project.sessionCount} sessions</span>
                <span>🔤 {formatNumber(project.totalTokens)} tokens</span>
                <span>💰 {formatCost(project.totalCost)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
