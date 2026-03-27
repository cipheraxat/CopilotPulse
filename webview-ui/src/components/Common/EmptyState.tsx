import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon = '📊', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-sm opacity-60 max-w-md mb-4">{description}</p>
      )}
      {action && (
        <button className="btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
