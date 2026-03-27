import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SessionList } from '../components/Session/SessionList';
import { SearchBar } from '../components/Common/SearchBar';
import { Pagination } from '../components/Common/Pagination';
import { CardSkeleton } from '../components/Common/Skeleton';
import { EmptyState } from '../components/Common/EmptyState';
import type { SessionFilter } from '../../../src/models/types';

const PAGE_SIZE = 20;

export function Sessions() {
  const { state, fetchSessions, navigate } = useApp();
  const { sessions, sessionsTotal, loading } = state;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SessionFilter['sortBy']>('date');
  const [sortOrder, setSortOrder] = useState<SessionFilter['sortOrder']>('desc');
  const [status, setStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const loadSessions = useCallback(() => {
    fetchSessions({
      search: debouncedSearch || undefined,
      sortBy,
      sortOrder,
      status,
      page,
      pageSize: PAGE_SIZE,
    });
  }, [fetchSessions, debouncedSearch, sortBy, sortOrder, status, page]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const totalPages = Math.ceil(sessionsTotal / PAGE_SIZE) || 1;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Sessions</h1>
        <div className="flex items-center gap-2">
          <button
            className={`p-1.5 rounded text-xs ${viewMode === 'list' ? 'bg-vscode-button-bg text-vscode-button-fg' : 'opacity-60 hover:opacity-100'}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            ☰
          </button>
          <button
            className={`p-1.5 rounded text-xs ${viewMode === 'grid' ? 'bg-vscode-button-bg text-vscode-button-fg' : 'opacity-60 hover:opacity-100'}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            ▦
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search sessions..."
          />
        </div>
        <div className="flex gap-2">
          <select
            className="input-field text-xs"
            value={status}
            onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <select
            className="input-field text-xs"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as SessionFilter['sortBy']); setPage(1); }}
          >
            <option value="date">Date</option>
            <option value="duration">Duration</option>
            <option value="tokens">Tokens</option>
            <option value="cost">Cost</option>
          </select>
          <button
            className="px-2 py-1 rounded text-xs opacity-60 hover:opacity-100"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {loading && !sessions.length ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No sessions found"
          description={search ? 'Try a different search term.' : 'Sessions will appear here once you start using Copilot Chat.'}
        />
      ) : (
        <>
          <SessionList sessions={sessions} viewMode={viewMode} onSessionClick={(s) => navigate(`/sessions/${s.id}`)} />
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
