// Shared types between extension host and webview

export interface Session {
  id: string;
  title: string;
  slug: string;
  workspace: string;
  workspaceName: string;
  startTime: number;
  endTime?: number;
  duration: number;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model?: string;
  status: 'active' | 'completed' | 'unknown';
  messages: Message[];
  toolCalls: ToolCall[];
  tags?: string[];
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  inputTokens?: number;
  outputTokens?: number;
  toolCalls?: ToolCall[];
  model?: string;
}

export interface ToolCall {
  id: string;
  sessionId: string;
  messageId?: string;
  name: string;
  input?: string;
  output?: string;
  timestamp: number;
  duration?: number;
  status: 'success' | 'error' | 'pending';
}

export interface Project {
  id: string;
  path: string;
  name: string;
  sessionCount: number;
  totalTokens: number;
  totalCost: number;
  lastActive: number;
  sessions: Session[];
}

export interface AnalyticsData {
  totalSessions: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  averageSessionDuration: number;
  averageTokensPerSession: number;
  sessionsOverTime: TimeSeriesPoint[];
  tokensOverTime: TimeSeriesPoint[];
  inputTokensOverTime: TimeSeriesPoint[];
  outputTokensOverTime: TimeSeriesPoint[];
  costOverTime: TimeSeriesPoint[];
  toolUsage: ToolUsageStat[];
  peakHours: HourlyActivity[];
  modelDistribution: ModelStat[];
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ToolUsageStat {
  name: string;
  count: number;
  sessionCount: number;
  percentage: number;
}

export interface HourlyActivity {
  hour: number;
  count: number;
}

export interface ModelStat {
  model: string;
  count: number;
  tokens: number;
  percentage: number;
}

export interface DashboardStats {
  todaySessions: number;
  todayTokens: number;
  todayCost: number;
  totalSessions: number;
  totalTokens: number;
  totalCost: number;
  activeSessions: number;
  recentSessions: Session[];
}

// Message protocol between extension and webview
export type MessageToWebview =
  | { type: 'sessions'; data: Session[]; total: number }
  | { type: 'session-detail'; data: Session }
  | { type: 'projects'; data: Project[] }
  | { type: 'analytics'; data: AnalyticsData }
  | { type: 'dashboard-stats'; data: DashboardStats }
  | { type: 'tools'; data: ToolUsageStat[] }
  | { type: 'settings'; data: AppSettings }
  | { type: 'error'; message: string }
  | { type: 'loading'; loading: boolean }
  | { type: 'theme'; theme: 'light' | 'dark' | 'high-contrast' }
  | { type: 'export-complete'; path: string };

export type MessageToExtension =
  | { type: 'get-sessions'; filter?: SessionFilter }
  | { type: 'get-session-detail'; sessionId: string }
  | { type: 'get-projects' }
  | { type: 'get-analytics'; timeRange: TimeRange }
  | { type: 'get-dashboard-stats' }
  | { type: 'get-tools' }
  | { type: 'get-settings' }
  | { type: 'update-settings'; settings: Partial<AppSettings> }
  | { type: 'refresh' }
  | { type: 'export-data' }
  | { type: 'open-external'; url: string }
  | { type: 'navigate'; route: string };

export interface SessionFilter {
  search?: string;
  project?: string;
  dateFrom?: number;
  dateTo?: number;
  status?: 'active' | 'completed' | 'all';
  sortBy?: 'date' | 'duration' | 'tokens' | 'cost';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export type TimeRange = '24h' | '7d' | '30d' | '90d' | 'all';

export interface AppSettings {
  refreshInterval: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  showStatusBar: boolean;
}
