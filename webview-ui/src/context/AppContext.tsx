import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type {
  Session,
  Project,
  AnalyticsData,
  DashboardStats,
  ToolUsageStat,
  AppSettings,
  MessageToWebview,
  TimeRange,
  SessionFilter,
} from '../../../src/models/types';
import { useVsCode, useExtensionMessage } from '../hooks/useVsCode';

interface AppState {
  currentRoute: string;
  sessions: Session[];
  sessionsTotal: number;
  sessionDetail: Session | null;
  projects: Project[];
  analytics: AnalyticsData | null;
  dashboardStats: DashboardStats | null;
  tools: ToolUsageStat[];
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_ROUTE'; route: string }
  | { type: 'SET_SESSIONS'; sessions: Session[]; total: number }
  | { type: 'SET_SESSION_DETAIL'; session: Session }
  | { type: 'SET_PROJECTS'; projects: Project[] }
  | { type: 'SET_ANALYTICS'; analytics: AnalyticsData }
  | { type: 'SET_DASHBOARD_STATS'; stats: DashboardStats }
  | { type: 'SET_TOOLS'; tools: ToolUsageStat[] }
  | { type: 'SET_SETTINGS'; settings: AppSettings }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; message: string | null };

export const initialState: AppState = {
  currentRoute: '/',
  sessions: [],
  sessionsTotal: 0,
  sessionDetail: null,
  projects: [],
  analytics: null,
  dashboardStats: null,
  tools: [],
  settings: null,
  loading: false,
  error: null,
};

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ROUTE':
      return { ...state, currentRoute: action.route };
    case 'SET_SESSIONS':
      return { ...state, sessions: action.sessions, sessionsTotal: action.total, loading: false };
    case 'SET_SESSION_DETAIL':
      return { ...state, sessionDetail: action.session, loading: false };
    case 'SET_PROJECTS':
      return { ...state, projects: action.projects, loading: false };
    case 'SET_ANALYTICS':
      return { ...state, analytics: action.analytics, loading: false };
    case 'SET_DASHBOARD_STATS':
      return { ...state, dashboardStats: action.stats, loading: false };
    case 'SET_TOOLS':
      return { ...state, tools: action.tools, loading: false };
    case 'SET_SETTINGS':
      return { ...state, settings: action.settings };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.message, loading: false };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  navigate: (route: string) => void;
  fetchSessions: (filter?: SessionFilter) => void;
  fetchSessionDetail: (sessionId: string) => void;
  fetchProjects: () => void;
  fetchAnalytics: (timeRange: TimeRange) => void;
  fetchDashboardStats: () => void;
  fetchTools: () => void;
  fetchSettings: () => void;
  refresh: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { send } = useVsCode();

  // Handle messages from extension host
  useExtensionMessage((message: MessageToWebview) => {
    switch (message.type) {
      case 'sessions':
        dispatch({ type: 'SET_SESSIONS', sessions: message.data, total: message.total });
        break;
      case 'session-detail':
        dispatch({ type: 'SET_SESSION_DETAIL', session: message.data });
        break;
      case 'projects':
        dispatch({ type: 'SET_PROJECTS', projects: message.data });
        break;
      case 'analytics':
        dispatch({ type: 'SET_ANALYTICS', analytics: message.data });
        break;
      case 'dashboard-stats':
        dispatch({ type: 'SET_DASHBOARD_STATS', stats: message.data });
        break;
      case 'tools':
        dispatch({ type: 'SET_TOOLS', tools: message.data });
        break;
      case 'settings':
        dispatch({ type: 'SET_SETTINGS', settings: message.data });
        break;
      case 'error':
        dispatch({ type: 'SET_ERROR', message: message.message });
        break;
      case 'loading':
        dispatch({ type: 'SET_LOADING', loading: message.loading });
        break;
    }
  });

  const navigate = useCallback((route: string) => {
    dispatch({ type: 'SET_ROUTE', route });
  }, []);

  const fetchSessions = useCallback((filter?: SessionFilter) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    send({ type: 'get-sessions', filter });
  }, [send]);

  const fetchSessionDetail = useCallback((sessionId: string) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    send({ type: 'get-session-detail', sessionId });
  }, [send]);

  const fetchProjects = useCallback(() => {
    dispatch({ type: 'SET_LOADING', loading: true });
    send({ type: 'get-projects' });
  }, [send]);

  const fetchAnalytics = useCallback((timeRange: TimeRange) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    send({ type: 'get-analytics', timeRange });
  }, [send]);

  const fetchDashboardStats = useCallback(() => {
    dispatch({ type: 'SET_LOADING', loading: true });
    send({ type: 'get-dashboard-stats' });
  }, [send]);

  const fetchTools = useCallback(() => {
    dispatch({ type: 'SET_LOADING', loading: true });
    send({ type: 'get-tools' });
  }, [send]);

  const fetchSettings = useCallback(() => {
    send({ type: 'get-settings' });
  }, [send]);

  const refresh = useCallback(() => {
    send({ type: 'refresh' });
  }, [send]);

  // Fetch initial data
  useEffect(() => {
    fetchDashboardStats();
    fetchSettings();
  }, [fetchDashboardStats, fetchSettings]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        navigate,
        fetchSessions,
        fetchSessionDetail,
        fetchProjects,
        fetchAnalytics,
        fetchDashboardStats,
        fetchTools,
        fetchSettings,
        refresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
