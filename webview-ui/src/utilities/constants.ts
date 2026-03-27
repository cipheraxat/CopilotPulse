export const ROUTES = {
  HOME: '/',
  SESSIONS: '/sessions',
  SESSION_DETAIL: '/sessions/:id',
  PROJECTS: '/projects',
  ANALYTICS: '/analytics',
  TOOLS: '/tools',
  SETTINGS: '/settings',
} as const;

export const NAV_ITEMS = [
  { path: ROUTES.HOME, label: 'Home', icon: 'home' },
  { path: ROUTES.SESSIONS, label: 'Sessions', icon: 'comment-discussion' },
  { path: ROUTES.PROJECTS, label: 'Projects', icon: 'folder' },
  { path: ROUTES.ANALYTICS, label: 'Analytics', icon: 'graph' },
  { path: ROUTES.TOOLS, label: 'Tools', icon: 'tools' },
  { path: ROUTES.SETTINGS, label: 'Settings', icon: 'gear' },
] as const;

export const TIME_RANGES = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
] as const;

export const CHART_COLORS = {
  primary: '#4f8ff7',
  secondary: '#7c5cfc',
  success: '#73c991',
  warning: '#cca700',
  error: '#f48771',
  muted: '#666666',
  tokens: {
    input: '#4f8ff7',
    output: '#7c5cfc',
  },
};
