import React from 'react';
import type { Message } from '../../../../src/models/types';
import { formatDate } from '../../utilities/formatters';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isUser
            ? 'text-right'
            : isTool
            ? 'opacity-70 text-xs'
            : ''
        }`}
        style={{
          background: isUser
            ? 'var(--vscode-button-background, #0e639c)'
            : isTool
            ? 'var(--vscode-textCodeBlock-background, #2d2d2d)'
            : 'var(--vscode-editorWidget-background, #252526)',
          color: isUser
            ? 'var(--vscode-button-foreground, #ffffff)'
            : 'var(--vscode-editor-foreground, #cccccc)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium opacity-80">
            {isUser ? '👤 You' : isTool ? '🔧 Tool' : isSystem ? '⚙️ System' : '🤖 Copilot'}
          </span>
          <span className="text-[10px] opacity-50">{formatDate(message.timestamp)}</span>
        </div>
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content.length > 2000
            ? message.content.substring(0, 2000) + '...'
            : message.content}
        </div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <span className="text-[10px] opacity-60">
              Tool calls: {message.toolCalls.map((t) => t.name).join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
