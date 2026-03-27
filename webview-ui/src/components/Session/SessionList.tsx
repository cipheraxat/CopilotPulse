import React from 'react';
import type { Session } from '../../../../src/models/types';
import { SessionCard } from './SessionCard';
import { groupByDate } from '../../utilities/formatters';
import { EmptyState } from '../Common/EmptyState';

interface SessionListProps {
  sessions: Session[];
  onSessionClick: (session: Session) => void;
  viewMode?: 'list' | 'grid';
}

export function SessionList({ sessions, onSessionClick, viewMode = 'list' }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon="💬"
        title="No sessions found"
        description="Copilot Chat sessions will appear here as you use them."
      />
    );
  }

  const grouped = groupByDate(sessions, (s) => s.startTime);

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} onClick={onSessionClick} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([label, items]) => (
        <div key={label}>
          <h3 className="section-title">{label}</h3>
          <div className="space-y-2">
            {items.map((session) => (
              <SessionCard key={session.id} session={session} onClick={onSessionClick} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
