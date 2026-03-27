import React from 'react';
import type { Session } from '../../../../src/models/types';
import { formatDuration, formatNumber, relativeTime } from '../../utilities/formatters';

interface SessionCardProps {
  session: Session;
  onClick: (session: Session) => void;
  compact?: boolean;
}

export function SessionCard({ session, onClick, compact = false }: SessionCardProps) {
  return (
    <button
      className="card w-full text-left cursor-pointer transition-all hover:scale-[1.01]"
      onClick={() => onClick(session)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {session.status === 'active' && (
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 badge-live" />
            )}
            <h4 className="font-medium truncate">
              {session.title || session.slug || 'Untitled Session'}
            </h4>
          </div>
          {!compact && (
            <p className="text-xs opacity-60 truncate mb-2">
              {session.workspaceName || session.workspace || 'No workspace'}
            </p>
          )}
        </div>
        <span className="text-xs opacity-50 whitespace-nowrap">
          {relativeTime(session.startTime)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs opacity-70">
        <span title="Duration">⏱ {formatDuration(session.duration)}</span>
        <span title="Tokens">🔤 {formatNumber(session.totalTokens)}</span>
        <span title="Messages">💬 {session.messageCount}</span>
        {session.model && (
          <span className="badge text-[10px]">{session.model}</span>
        )}
      </div>
    </button>
  );
}
