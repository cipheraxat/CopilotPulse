import React from 'react';
import type { Message, ToolCall } from '../../../../src/models/types';
import { formatDate, formatDuration } from '../../utilities/formatters';

interface TimelineProps {
  messages: Message[];
  toolCalls: ToolCall[];
}

interface TimelineEvent {
  id: string;
  type: 'message' | 'tool-call';
  timestamp: number;
  data: Message | ToolCall;
}

export function Timeline({ messages, toolCalls }: TimelineProps) {
  const events: TimelineEvent[] = [
    ...messages.map((m): TimelineEvent => ({
      id: m.id,
      type: 'message',
      timestamp: m.timestamp,
      data: m,
    })),
    ...toolCalls.map((t): TimelineEvent => ({
      id: t.id,
      type: 'tool-call',
      timestamp: t.timestamp,
      data: t,
    })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  if (events.length === 0) {
    return (
      <div className="text-center py-8 opacity-50">
        No timeline events for this session.
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div
        className="absolute left-2 top-0 bottom-0 w-0.5"
        style={{ background: 'var(--vscode-panel-border, #2b2b2b)' }}
      />
      {events.map((event, i) => {
        const isMessage = event.type === 'message';
        const msg = isMessage ? (event.data as Message) : null;
        const tool = !isMessage ? (event.data as ToolCall) : null;

        // Show time gap if >5 minutes between events
        const prevEvent = events[i - 1];
        const gap = prevEvent ? event.timestamp - prevEvent.timestamp : 0;
        const showGap = gap > 5 * 60 * 1000;

        return (
          <React.Fragment key={event.id}>
            {showGap && (
              <div className="flex items-center gap-2 my-2 -ml-4 text-[10px] opacity-40">
                <span>⏳ {formatDuration(gap)} gap</span>
              </div>
            )}
            <div className="relative mb-4">
              <div
                className="absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2"
                style={{
                  borderColor: isMessage
                    ? msg?.role === 'user'
                      ? 'var(--vscode-button-background, #0e639c)'
                      : 'var(--vscode-testing-iconPassed, #73c991)'
                    : 'var(--vscode-editorWarning-foreground, #cca700)',
                  background: 'var(--vscode-editor-background, #1e1e1e)',
                }}
              />
              <div className="card !p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">
                    {isMessage
                      ? msg?.role === 'user'
                        ? '👤 User Prompt'
                        : msg?.role === 'tool'
                        ? '🔧 Tool Result'
                        : '🤖 Assistant Response'
                      : `🛠 ${tool?.name || 'Tool Call'}`}
                  </span>
                  <span className="text-[10px] opacity-50">{formatDate(event.timestamp)}</span>
                  {tool?.duration && (
                    <span className="text-[10px] opacity-50">{formatDuration(tool.duration)}</span>
                  )}
                  {tool?.status && (
                    <span className={`badge text-[10px] ${
                      tool.status === 'success' ? 'badge-success' : tool.status === 'error' ? 'badge-error' : ''
                    }`}>
                      {tool.status}
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-70 line-clamp-3 whitespace-pre-wrap">
                  {isMessage
                    ? (msg?.content || '').substring(0, 300)
                    : tool?.input
                    ? tool.input.substring(0, 200)
                    : 'No details available'}
                </p>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
