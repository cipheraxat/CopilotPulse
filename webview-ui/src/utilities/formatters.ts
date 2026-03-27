/**
 * Format a cost value as USD.
 */
export function formatCost(cost: number): string {
  const abs = Math.abs(cost);
  const sign = cost < 0 ? '-' : '';
  if (abs < 0.01) {
    return `${sign}$${abs.toFixed(4)}`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

/**
 * Format a number with comma separators.
 */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toLocaleString();
}

/**
 * Format a duration in milliseconds to human-readable.
 */
export function formatDuration(ms: number): string {
  if (ms < 0) { return '0s'; }
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) { return `${seconds}s`; }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) { return `${minutes}m ${remainingSeconds}s`; }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format a timestamp to relative time.
 */
export function relativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) { return 'just now'; }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) { return `${minutes}m ago`; }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) { return `${hours}h ago`; }
  const days = Math.floor(hours / 24);
  if (days < 7) { return `${days}d ago`; }
  return new Date(ts).toLocaleDateString();
}

/**
 * Format a timestamp to a short date/time string.
 */
export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a timestamp to just a date.
 */
export function formatDateOnly(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Group items by a date label (Today, Yesterday, This Week, etc.).
 */
export function groupByDate<T>(items: T[], getTimestamp: (item: T) => number): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const thisWeek = today - 7 * 86400000;
  const thisMonth = today - 30 * 86400000;

  for (const item of items) {
    const ts = getTimestamp(item);
    let label: string;
    if (ts >= today) {
      label = 'Today';
    } else if (ts >= yesterday) {
      label = 'Yesterday';
    } else if (ts >= thisWeek) {
      label = 'This Week';
    } else if (ts >= thisMonth) {
      label = 'This Month';
    } else {
      label = 'Older';
    }
    const existing = groups.get(label) || [];
    existing.push(item);
    groups.set(label, existing);
  }

  return groups;
}
