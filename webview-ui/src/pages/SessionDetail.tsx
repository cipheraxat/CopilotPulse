import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { MessageBubble } from '../components/Session/MessageBubble';
import { Timeline } from '../components/Session/Timeline';
import { StatsCard } from '../components/Charts/StatsCard';
import { CardSkeleton } from '../components/Common/Skeleton';
import { formatCost, formatNumber, formatDuration, formatDate } from '../utilities/formatters';

type Tab = 'conversation' | 'timeline' | 'analytics';

export function SessionDetail() {
  const { state, fetchSessionDetail, navigate } = useApp();
  const { sessionDetail: session, loading, currentRoute } = state;
  const [activeTab, setActiveTab] = useState<Tab>('conversation');

  const sessionId = currentRoute.split('/').pop() || '';

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetail(sessionId);
    }
  }, [sessionId, fetchSessionDetail]);

  if (loading && !session) {
    return (
      <div className="p-4 space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-4">
        <p className="opacity-60">Session not found.</p>
        <button className="btn-primary mt-2 text-xs" onClick={() => navigate('/sessions')}>
          Back to Sessions
        </button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'conversation', label: 'Conversation' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'analytics', label: 'Analytics' },
  ];

  const events = [
    ...session.messages.map((m) => ({
      id: m.id,
      type: m.role as string,
      title: m.role === 'user' ? 'User message' : m.role === 'assistant' ? 'Assistant response' : `${m.role} message`,
      description: m.content.slice(0, 100),
      timestamp: m.timestamp,
    })),
    ...session.toolCalls.map((t) => ({
      id: t.id,
      type: 'tool',
      title: t.name,
      description: t.status,
      timestamp: t.timestamp,
    })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <button
          className="text-xs opacity-60 hover:opacity-100 mb-2"
          onClick={() => navigate('/sessions')}
        >
          ← Back to Sessions
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold">{session.title || 'Untitled Session'}</h1>
            <p className="text-xs opacity-60 mt-0.5">
              {session.workspaceName} · {formatDate(session.startTime)}
              {session.model && ` · ${session.model}`}
            </p>
          </div>
          {session.status === 'active' && (
            <span className="badge badge-live">Live</span>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard label="Duration" value={formatDuration(session.duration)} icon="⏱" />
        <StatsCard label="Messages" value={String(session.messageCount)} icon="💬" />
        <StatsCard label="Tokens" value={formatNumber(session.totalTokens)} icon="🔤" />
        <StatsCard label="Cost" value={formatCost(session.estimatedCost)} icon="💰" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-vscode-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-vscode-button-bg text-vscode-fg'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'conversation' && (
        <div className="space-y-3">
          {session.messages.length === 0 ? (
            <p className="text-xs opacity-60 text-center py-8">No messages in this session.</p>
          ) : (
            session.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <Timeline messages={session.messages} toolCalls={session.toolCalls} />
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">Token Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="opacity-60">Input Tokens</span>
                <span>{formatNumber(session.inputTokens)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-60">Output Tokens</span>
                <span>{formatNumber(session.outputTokens)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-vscode-input-bg flex mt-1">
                <div
                  className="h-full"
                  style={{
                    width: `${session.totalTokens ? (session.inputTokens / session.totalTokens) * 100 : 50}%`,
                    backgroundColor: 'var(--vscode-charts-blue, #4f8ff7)',
                  }}
                />
                <div
                  className="h-full"
                  style={{
                    width: `${session.totalTokens ? (session.outputTokens / session.totalTokens) * 100 : 50}%`,
                    backgroundColor: 'var(--vscode-charts-purple, #7c5cfc)',
                  }}
                />
              </div>
              <div className="flex gap-4 text-xs mt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4f8ff7' }} />
                  Input
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#7c5cfc' }} />
                  Output
                </span>
              </div>
            </div>
          </div>

          {session.toolCalls.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold mb-3">Tool Calls ({session.toolCalls.length})</h3>
              <div className="space-y-2">
                {session.toolCalls.map((tool) => (
                  <div key={tool.id} className="flex items-center justify-between text-xs p-2 rounded bg-vscode-input-bg">
                    <span className="font-medium">{tool.name}</span>
                    <span className={`badge ${tool.status === 'success' ? 'badge-success' : tool.status === 'error' ? 'bg-red-500/20 text-red-400' : ''}`}>
                      {tool.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
