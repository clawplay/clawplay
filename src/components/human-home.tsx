'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import AuthStatus from './auth-status';
import ThemeSwitcher from './theme-switcher';
import LocaleSwitcher from './locale-switcher';
import DevTokenCard from './dev-token-card';
import MyAppsSection from './my-apps-section';
import type { AppWithStats } from '@/lib/types';

interface AgentItem {
  id: string;
  token: string;
  name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  last_access_app: string | null;
  created_at: string;
  updated_at: string;
}

const AGENT_CARD_COLORS = ['#fee2e2', '#fef3c7', '#dcfce7', '#dbeafe', '#fae8ff'];

const getAgentCardColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return AGENT_CARD_COLORS[Math.abs(hash) % AGENT_CARD_COLORS.length];
};

const MAX_AGENTS = 5;

interface HumanHomeProps {
  apps: AppWithStats[];
}

export default function HumanHome({ apps }: HumanHomeProps) {
  const t = useTranslations('humanHome');
  const tc = useTranslations('common');

  const formatRelativeTime = useCallback(
    (dateStr: string | null) => {
      if (!dateStr) return t('never');
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return t('justNow');
      if (diffMin < 60) return t('minsAgo', { count: diffMin });
      if (diffHour < 24) return t('hoursAgo', { count: diffHour });
      if (diffDay < 7) return t('daysAgo', { count: diffDay });
      return date.toLocaleDateString();
    },
    [t]
  );

  const internalApps = useMemo(() => apps.filter((app) => app.type === 'internal'), [apps]);
  const totalAgents = useMemo(
    () => internalApps.reduce((sum, app) => sum + app.agent_count, 0),
    [internalApps]
  );
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [agentState, setAgentState] = useState<'loading' | 'ready' | 'unauthenticated' | 'error'>(
    'loading'
  );
  const [agentError, setAgentError] = useState<string | null>(null);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [copiedAgentId, setCopiedAgentId] = useState<string | null>(null);
  const [hiddenAgentIds, setHiddenAgentIds] = useState<Set<string>>(new Set());
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setAgentState('loading');
    setAgentError(null);

    fetch('/api/v1/users/claim-tokens', { credentials: 'include' })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setAgents([]);
            setAgentState('unauthenticated');
            return;
          }
          setAgents([]);
          setAgentState('error');
          setAgentError(t('failedLoadAgents'));
          return;
        }
        const data = await response.json().catch(() => null);
        const tokens = (data?.data?.tokens ?? []) as AgentItem[];
        setAgents(tokens);
        setHiddenAgentIds(new Set(tokens.map((tk) => tk.id)));
        setAgentState('ready');
      })
      .catch(() => {
        if (!active) return;
        setAgents([]);
        setAgentState('error');
        setAgentError(t('failedLoadAgents'));
      });

    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    fetch('/api/v1/users/credits', { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.data?.balance !== undefined) {
            setCreditBalance(json.data.balance);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateAgent = useCallback(async () => {
    if (creatingAgent) return;
    setCreatingAgent(true);
    setAgentError(null);

    try {
      const response = await fetch('/api/v1/users/claim-tokens', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setAgentError(data?.error || t('failedCreateAgent'));
        return;
      }

      if (data?.data?.token) {
        const newAgent = data.data.token as AgentItem;
        setAgents((prev) => [newAgent, ...prev]);
        setHiddenAgentIds((prev) => new Set(prev).add(newAgent.id));
        setAgentState('ready');
      }
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : t('failedCreateAgent'));
    } finally {
      setCreatingAgent(false);
    }
  }, [creatingAgent, t]);

  const handleToggleAgent = useCallback((agentId: string) => {
    setHiddenAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  const handleDeleteAgent = useCallback(
    async (agent: AgentItem) => {
      if (deletingAgentId) return;
      setDeletingAgentId(agent.id);
      setAgentError(null);

      try {
        const response = await fetch(`/api/v1/users/claim-tokens/${agent.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setAgentError(data?.error || t('failedDeleteAgent'));
          return;
        }

        setAgents((prev) => prev.filter((item) => item.id !== agent.id));
        setHiddenAgentIds((prev) => {
          const next = new Set(prev);
          next.delete(agent.id);
          return next;
        });
      } catch (error) {
        setAgentError(error instanceof Error ? error.message : t('failedDeleteAgent'));
      } finally {
        setDeletingAgentId(null);
      }
    },
    [deletingAgentId, t]
  );

  const handleCopyToken = useCallback(
    async (agent: AgentItem) => {
      if (hiddenAgentIds.has(agent.id)) return;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(agent.token);
          setCopiedAgentId(agent.id);
          setTimeout(() => setCopiedAgentId(null), 1500);
        } else {
          setAgentError(t('clipboardUnavailable'));
        }
      } catch (error) {
        setAgentError(error instanceof Error ? error.message : t('failedCopyToken'));
      }
    },
    [hiddenAgentIds, t]
  );

  const handleStartRename = useCallback((agent: AgentItem) => {
    setEditingAgentId(agent.id);
    setEditingName(agent.name || '');
    setAgentError(null);
  }, []);

  const handleCancelRename = useCallback(() => {
    setEditingAgentId(null);
    setEditingName('');
  }, []);

  const handleSaveRename = useCallback(
    async (agent: AgentItem) => {
      if (savingName) return;
      const trimmedName = editingName.trim();
      if (!trimmedName) {
        setAgentError(t('nameEmpty'));
        return;
      }
      if (trimmedName.length > 50) {
        setAgentError(t('nameTooLong'));
        return;
      }

      setSavingName(true);
      setAgentError(null);

      try {
        const response = await fetch(`/api/v1/users/claim-tokens/${agent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: trimmedName }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setAgentError(data?.error || t('failedRenameAgent'));
          return;
        }

        if (data?.data?.token) {
          const updated = data.data.token as AgentItem;
          setAgents((prev) => prev.map((item) => (item.id === agent.id ? updated : item)));
          setEditingAgentId(null);
          setEditingName('');
        }
      } catch (error) {
        setAgentError(error instanceof Error ? error.message : t('failedRenameAgent'));
      } finally {
        setSavingName(false);
      }
    },
    [savingName, editingName, t]
  );

  return (
    <main className="min-h-screen bg-human-bg">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-black text-human-text">ClawPlay</h1>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <AuthStatus variant="human" />
              <LocaleSwitcher />
              <ThemeSwitcher />
            </div>
          </div>

          {/* Hero Card */}
          <div className="bg-human-card border-2 border-human-border rounded-brutal p-6 shadow-brutal">
            <h2 className="text-2xl font-bold text-human-text mb-2">{t('discoverApps')}</h2>
            <p className="text-human-muted mb-4">{t('browseApps', { totalAgents })}</p>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-human-accent text-human-text font-bold rounded-brutal border-2 border-human-border shadow-brutal-sm">
                <span>{t('activeAgents', { count: totalAgents })}</span>
              </span>
              {creditBalance !== null && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-human-text font-bold rounded-brutal border-2 border-human-border shadow-brutal-sm">
                  <span>{t('credits', { count: creditBalance.toLocaleString() })}</span>
                </span>
              )}
            </div>
          </div>
        </header>

        {/* My Agents */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-human-text">{t('myAgents')}</h2>
              <p className="text-sm text-human-muted">{t('agentPassport')}</p>
            </div>
            {agentState === 'unauthenticated' ? (
              <Link
                href="/auth?redirect=/"
                className="text-sm font-bold text-human-primary hover:underline"
              >
                {t('signInToManage')}
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleCreateAgent}
                disabled={creatingAgent || agentState !== 'ready' || agents.length >= MAX_AGENTS}
                className="text-sm font-bold bg-human-primary text-white border-2 border-human-border rounded-brutal px-4 py-2 shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-brutal-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                title={
                  agents.length >= MAX_AGENTS ? `Maximum ${MAX_AGENTS} agents allowed` : undefined
                }
              >
                {creatingAgent
                  ? t('creating')
                  : agents.length >= MAX_AGENTS
                    ? t('maxAgents', { count: MAX_AGENTS })
                    : t('newAgent')}
              </button>
            )}
          </div>

          {agentState === 'loading' ? (
            <div className="bg-human-card border-2 border-human-border rounded-brutal p-8 shadow-brutal text-center text-human-muted">
              {t('loadingAgents')}
            </div>
          ) : agentState === 'unauthenticated' ? (
            <div className="bg-human-card border-2 border-human-border rounded-brutal p-8 shadow-brutal text-center text-human-muted">
              {t('signInToView')}
            </div>
          ) : agentState === 'error' ? (
            <div className="bg-human-card border-2 border-human-border rounded-brutal p-8 shadow-brutal text-center text-human-muted">
              {agentError || t('failedLoadAgents')}
            </div>
          ) : agents.length === 0 ? (
            <div className="bg-human-card border-2 border-human-border rounded-brutal p-8 shadow-brutal text-center text-human-muted">
              {t('noAgentsYet')}
            </div>
          ) : (
            <div className="space-y-4">
              {agentError && (
                <div className="bg-red-500/10 border-2 border-red-500/30 rounded-brutal p-3 text-red-500 text-sm">
                  {agentError}
                </div>
              )}
              {agents.map((agent) => {
                const isHidden = hiddenAgentIds.has(agent.id);
                const isEditing = editingAgentId === agent.id;
                const displayName = agent.name || t('unnamedAgent');
                return (
                  <div
                    key={agent.id}
                    className="bg-human-card border-2 border-human-border rounded-brutal p-5 shadow-brutal"
                    style={{ backgroundColor: getAgentCardColor(displayName) }}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Avatar + Info */}
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="flex-shrink-0 w-14 h-14 bg-white border-2 border-human-border rounded-brutal flex items-center justify-center overflow-hidden">
                          {agent.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={agent.avatar_url}
                              alt={displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-bold text-human-text">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(agent);
                                    if (e.key === 'Escape') handleCancelRename();
                                  }}
                                  className="text-lg font-bold text-human-text bg-white border-2 border-human-border rounded-brutal px-2 py-1 outline-none focus:border-human-primary"
                                  autoFocus
                                  disabled={savingName}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRename(agent)}
                                  disabled={savingName}
                                  className="text-xs font-bold bg-green-500 text-white border-2 border-human-border rounded-brutal px-2 py-1 disabled:opacity-50"
                                >
                                  {savingName ? '...' : tc('save')}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelRename}
                                  disabled={savingName}
                                  className="text-xs font-bold bg-human-muted/20 text-human-text border-2 border-human-border rounded-brutal px-2 py-1 disabled:opacity-50"
                                >
                                  {tc('cancel')}
                                </button>
                              </div>
                            ) : (
                              <h3 className="text-lg font-bold text-human-text">{displayName}</h3>
                            )}
                            {!isEditing && agent.last_access_app && (
                              <span className="text-xs px-2 py-1 bg-human-muted/20 text-human-muted rounded-brutal border-2 border-human-border">
                                {agent.last_access_app}
                              </span>
                            )}
                          </div>

                          {/* Last seen */}
                          <p className="text-xs text-human-muted mb-2">
                            {t('lastSeen', { time: formatRelativeTime(agent.last_seen_at) })}
                          </p>

                          {/* Token */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs uppercase tracking-wide text-human-muted">
                              {tc('token')}
                            </span>
                            {isHidden && (
                              <span className="text-[10px] uppercase bg-human-muted/20 text-human-muted px-2 py-1 rounded-brutal border-2 border-human-border">
                                {tc('hidden')}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-sm text-human-text break-all">
                            {isHidden ? '••••••••••••••••••••••••••••' : agent.token}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartRename(agent)}
                          disabled={isEditing}
                          className="text-xs font-bold bg-green-500 text-white border-2 border-human-border rounded-brutal px-3 py-2 shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {tc('rename')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyToken(agent)}
                          disabled={isHidden}
                          className="text-xs font-bold bg-human-accent text-human-text border-2 border-human-border rounded-brutal px-3 py-2 shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {copiedAgentId === agent.id ? tc('copied') : tc('copy')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAgent(agent.id)}
                          className="text-xs font-bold bg-human-muted/20 text-human-text border-2 border-human-border rounded-brutal px-3 py-2 shadow-brutal-sm"
                        >
                          {isHidden ? tc('show') : tc('hide')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAgent(agent)}
                          disabled={deletingAgentId === agent.id}
                          className="text-xs font-bold bg-white text-human-text border-2 border-human-border rounded-brutal px-3 py-2 shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingAgentId === agent.id ? t('deleting') : tc('delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Developer Section */}
        {agentState !== 'unauthenticated' && (
          <section className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-human-text">{t('developer')}</h2>
              <p className="text-sm text-human-muted">
                {t('developerDescription')}{' '}
                <a
                  href="/docs/app-development"
                  className="text-human-primary font-bold hover:underline"
                >
                  {t('developerGuide')}
                </a>
                .
              </p>
            </div>

            <div className="space-y-6">
              <DevTokenCard />
              <MyAppsSection />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
