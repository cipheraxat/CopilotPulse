import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { Header } from './components/Layout/Header';
import { Home } from './pages/Home';
import { Sessions } from './pages/Sessions';
import { SessionDetail } from './pages/SessionDetail';
import { Projects } from './pages/Projects';
import { Analytics } from './pages/Analytics';
import { Tools } from './pages/Tools';
import { Settings } from './pages/Settings';

function Router() {
  const { state } = useApp();
  const route = state.currentRoute;

  let page: React.ReactNode;

  if (route === '/') {
    page = <Home />;
  } else if (route === '/sessions') {
    page = <Sessions />;
  } else if (route.startsWith('/sessions/')) {
    page = <SessionDetail />;
  } else if (route === '/projects' || route.startsWith('/projects/')) {
    page = <Projects />;
  } else if (route === '/analytics') {
    page = <Analytics />;
  } else if (route === '/tools') {
    page = <Tools />;
  } else if (route === '/settings') {
    page = <Settings />;
  } else {
    page = <Home />;
  }

  return (
    <div className="min-h-screen bg-vscode-bg text-vscode-fg">
      <Header />
      <main className="pb-4">{page}</main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router />
      </AppProvider>
    </ErrorBoundary>
  );
}
