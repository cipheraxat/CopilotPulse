import React from 'react';
import { useApp } from '../../context/AppContext';
import { NAV_ITEMS } from '../../utilities/constants';

export function Header() {
  const { state, navigate, refresh } = useApp();

  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-4 px-4 py-2 border-b"
      style={{
        background: 'var(--vscode-titleBar-activeBackground, #3c3c3c)',
        borderColor: 'var(--vscode-panel-border, #2b2b2b)',
      }}
    >
      <button
        className="font-semibold text-sm hover:opacity-80 transition-opacity"
        onClick={() => navigate('/')}
      >
        ⚡ CopilotPulse
      </button>

      <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
        {NAV_ITEMS.filter((item) => item.path !== '/').map((item) => (
          <button
            key={item.path}
            className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
              state.currentRoute === item.path || state.currentRoute.startsWith(item.path + '/')
                ? 'btn-primary'
                : 'hover:opacity-80'
            }`}
            style={
              state.currentRoute !== item.path && !state.currentRoute.startsWith(item.path + '/')
                ? { color: 'var(--vscode-descriptionForeground)' }
                : undefined
            }
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <button
        className="text-xs opacity-60 hover:opacity-100 transition-opacity"
        onClick={refresh}
        title="Refresh data"
      >
        ↻
      </button>
    </header>
  );
}
