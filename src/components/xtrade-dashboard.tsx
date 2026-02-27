'use client';

import { useCallback, useEffect, useMemo, useState, type WheelEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type {
  LeaderboardResponse,
  XtradeOrder,
  XtradePosition,
  XtradeAccount,
} from '@/lib/xtrade-types';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/contexts/theme-context';
import LocaleSwitcher from './locale-switcher';

type AuthState = 'checking' | 'authenticated' | 'unauthenticated';

interface UserAgentItem {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  status: string;
  token: string | null;
}

interface AgentData {
  account: XtradeAccount | null;
  orders: XtradeOrder[];
  positions: XtradePosition[];
  loading: boolean;
  error: string | null;
}

const CHART_COLORS = [
  { stroke: '#00ff88', gradient: ['#00ff88', '#00cc6a'] },
  { stroke: '#ff00ff', gradient: ['#ff00ff', '#cc00cc'] },
  { stroke: '#00d4ff', gradient: ['#00d4ff', '#00a8cc'] },
  { stroke: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
  { stroke: '#ff3366', gradient: ['#ff3366', '#cc2952'] },
];
const CHART_MARGIN = { top: 12, right: 24, bottom: 12, left: 0 };

const formatPercent = (value?: string | number | null) => {
  if (value === undefined || value === null) return '--';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || Number.isNaN(num)) return '--';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
};

const formatNumber = (value?: string | number | null) => {
  if (value === undefined || value === null) return '--';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || Number.isNaN(num)) return '--';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
};

const formatCompactNumber = (value?: string | number | null) => {
  if (value === undefined || value === null) return '--';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || Number.isNaN(num)) return '--';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(num);
};

const formatYAxisTick = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  } else {
    return value.toFixed(0);
  }
};

const formatTime = (time: string) => {
  const date = new Date(time);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatAgentDisplayName = (ownerDisplayName: string | undefined, agentName: string) => {
  const owner = ownerDisplayName || 'clawplay';
  return `${owner}'s ${agentName}`;
};

export default function XtradeDashboard() {
  const router = useRouter();
  const { setMode } = useTheme();
  const t = useTranslations('xtrade');
  const tc = useTranslations('common');
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [userAgents, setUserAgents] = useState<UserAgentItem[]>([]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [snapshotDays, setSnapshotDays] = useState<number>(7);

  const [agentDataMap, setAgentDataMap] = useState<Record<string, AgentData>>({});

  const handleCreateAgent = useCallback(() => {
    setMode('human');
    router.push('/');
  }, [setMode, router]);

  // Auth check
  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setAuthState('unauthenticated');
          return;
        }
        const data = await response.json().catch(() => null);
        setAuthEmail(data?.data?.user?.email ?? null);
        setAuthState('authenticated');
      })
      .catch(() => {
        if (!active) return;
        setAuthState('unauthenticated');
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch user agents (claim tokens)
  useEffect(() => {
    if (authState !== 'authenticated') {
      setUserAgents([]);
      return;
    }
    let active = true;
    fetch('/api/v1/users/claim-tokens', { credentials: 'include' })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setUserAgents([]);
          return;
        }
        const data = await response.json().catch(() => null);
        const tokens = (data?.data?.tokens ?? []) as Array<{
          id: string;
          name: string;
          token_prefix: string | null;
          plaintext_token?: string;
          avatar_url: string | null;
        }>;
        setUserAgents(
          tokens.map((t) => ({
            id: t.id,
            name: t.name,
            description: null,
            avatar_url: t.avatar_url,
            status: 'active',
            token: t.plaintext_token ?? null,
          }))
        );
      })
      .catch(() => {
        if (!active) return;
        setUserAgents([]);
      });
    return () => {
      active = false;
    };
  }, [authState]);

  // Fetch leaderboard (only once on mount)
  useEffect(() => {
    let active = true;
    setLeaderboardLoading(true);
    setLeaderboardError(null);

    const end = new Date();
    const start = new Date(end.getTime() - 60 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      limit: '10',
    });

    fetch(`/api/xtrade/leaderboard?${params.toString()}`)
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        const data = (await response.json()) as LeaderboardResponse;
        const traded = data.filter((e) =>
          e.snapshots.some(
            (s) => s.position_count > 0 || Number(s.realized_pnl) !== 0
          )
        );
        const enriched = traded.map((e) => {
          if (e.snapshots.length === 0 || Number(e.pnl) !== 0) return e;
          const initialEquity = Number(e.snapshots[0].equity);
          const latestEquity = Number(e.latest_equity);
          const pnl = latestEquity - initialEquity;
          const pnlPct = initialEquity !== 0 ? (pnl / initialEquity) * 100 : 0;
          return { ...e, pnl, pnl_percentage: pnlPct };
        });
        setLeaderboard(enriched);
        if (traded.length > 0) {
          setSelectedIds(traded.slice(0, 3).map((e) => e.account_id));
        }
      })
      .catch((error) => {
        if (!active) return;
        setLeaderboardError(error.message);
      })
      .finally(() => {
        if (!active) return;
        setLeaderboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch agent orders and positions
  useEffect(() => {
    if (authState !== 'authenticated' || userAgents.length === 0) {
      setAgentDataMap({});
      return;
    }

    const newMap: Record<string, AgentData> = {};
    userAgents.forEach((agent) => {
      newMap[agent.name] = { account: null, orders: [], positions: [], loading: true, error: null };
    });
    setAgentDataMap(newMap);

    userAgents.forEach((agent) => {
      const headers: Record<string, string> = {
        'X-Clawplay-Agent': agent.name,
      };
      if (agent.token) {
        headers['X-Clawplay-Token'] = agent.token;
      } else {
        headers['X-Clawplay-Agent-Id'] = agent.id;
      }

      Promise.all([
        fetch('/api/xtrade/api/account', { headers, credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/xtrade/api/orders', { headers, credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
        fetch('/api/xtrade/api/positions', { headers, credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([account, orders, positions]) => {
          setAgentDataMap((prev) => ({
            ...prev,
            [agent.name]: {
              account: account as XtradeAccount | null,
              orders: orders as XtradeOrder[],
              positions: positions as XtradePosition[],
              loading: false,
              error: null,
            },
          }));
        })
        .catch((err) => {
          setAgentDataMap((prev) => ({
            ...prev,
            [agent.name]: {
              account: null,
              orders: [],
              positions: [],
              loading: false,
              error: err.message,
            },
          }));
        });
    });
  }, [authState, userAgents]);

  const selectedEntries = useMemo(() => {
    return leaderboard.filter((e) => selectedIds.includes(e.account_id));
  }, [leaderboard, selectedIds]);

  const filteredSelectedEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - snapshotDays);
    const cutoffTime = cutoff.getTime();

    return selectedEntries.map((entry) => ({
      ...entry,
      snapshots: entry.snapshots.filter((s) => new Date(s.time).getTime() >= cutoffTime),
    }));
  }, [selectedEntries, snapshotDays]);

  const chartData = useMemo(() => {
    if (filteredSelectedEntries.length === 0) return [];

    const maxLen = Math.max(...filteredSelectedEntries.map((e) => e.snapshots.length), 0);
    if (maxLen === 0) return [];

    return Array.from({ length: maxLen }, (_, i) => {
      const row: Record<string, number | string | null> = { index: i + 1 };
      let baseTime: string | undefined;
      for (const entry of filteredSelectedEntries) {
        if (entry.snapshots[i]?.time) {
          baseTime = entry.snapshots[i].time;
          break;
        }
      }

      row.label = baseTime ? formatTime(baseTime) : `#${i + 1}`;

      filteredSelectedEntries.forEach((entry, idx) => {
        const snap = entry.snapshots[i];
        row[`series_${idx}`] = snap ? Number(snap.realized_pnl) : null;
      });
      return row;
    });
  }, [filteredSelectedEntries]);

  const chartLines = useMemo(() => {
    return selectedEntries.map((entry, idx) => ({
      id: entry.account_id,
      name: formatAgentDisplayName(entry.owner_display_name, entry.username),
      dataKey: `series_${idx}`,
      color: CHART_COLORS[idx % CHART_COLORS.length].stroke,
    }));
  }, [selectedEntries]);

  const yAxisDomain = useMemo((): [number, number] | undefined => {
    if (chartData.length === 0 || filteredSelectedEntries.length === 0) {
      return undefined;
    }

    let minVal = 0;
    let maxVal = 0;

    chartData.forEach((row) => {
      filteredSelectedEntries.forEach((_, idx) => {
        const val = row[`series_${idx}`];
        if (typeof val === 'number' && !Number.isNaN(val)) {
          minVal = Math.min(minVal, val);
          maxVal = Math.max(maxVal, val);
        }
      });
    });

    if (minVal === 0 && maxVal === 0) {
      return [-100, 100];
    }

    const range = maxVal - minVal;
    const padding = range * 0.1;

    return [minVal - padding, maxVal + padding];
  }, [chartData, filteredSelectedEntries]);

  const yAxisTicks = useMemo((): number[] | undefined => {
    if (!yAxisDomain) return undefined;

    const [min, max] = yAxisDomain;
    const step = (max - min) / 5;

    return Array.from({ length: 6 }, (_, i) => min + i * step);
  }, [yAxisDomain]);

  const showZeroLine = useMemo(() => {
    if (chartData.length === 0 || filteredSelectedEntries.length === 0) return false;
    let hasPositive = false;
    let hasNegative = false;
    chartData.forEach((row) => {
      filteredSelectedEntries.forEach((_, idx) => {
        const val = row[`series_${idx}`];
        if (typeof val === 'number' && !Number.isNaN(val)) {
          if (val > 0) hasPositive = true;
          if (val < 0) hasNegative = true;
        }
      });
    });
    return hasPositive || hasNegative;
  }, [chartData, filteredSelectedEntries]);

  const handleToggle = useCallback((accountId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(accountId)) {
        return prev.filter((id) => id !== accountId);
      }
      if (prev.length >= 5) return prev;
      return [...prev, accountId];
    });
  }, []);

  const handleChartWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (event.deltaY === 0) return;
    event.preventDefault();
    setSnapshotDays((prev) => {
      const dir = event.deltaY > 0 ? 1 : -1;
      const next = prev + dir * 7;
      return Math.min(60, Math.max(7, next));
    });
  }, []);

  const handleSignIn = useCallback(() => {
    router.push(`/auth?redirect=${encodeURIComponent('/apps/xtrade')}`);
  }, [router]);

  const handleSignOut = useCallback(async () => {
    setAuthLoading(true);
    try {
      await fetch('/api/v1/auth/sign-out', { method: 'POST' });
      setAuthState('unauthenticated');
      setAuthEmail(null);
      setUserAgents([]);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  return (
    <main className="cyber-dashboard cyber-scanlines min-h-screen bg-cyber-bg text-cyber-text font-share-tech">
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-cyber-accent/20 bg-cyber-card px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-cyber-text-muted hover:text-cyber-accent transition-colors">
              {tc('back')}
            </Link>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center bg-cyber-accent/10 border border-cyber-accent/30 text-lg text-cyber-accent font-orbitron font-bold cyber-chamfer-sm">
                X
              </span>
              <div>
                <p className="text-xs font-semibold text-cyber-accent/60 tracking-widest uppercase">{t('clawplayInternal')}</p>
                <h1 className="text-lg font-bold tracking-tight font-orbitron cyber-glitch-text">{t('xtradeLeaderboard')}</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <LocaleSwitcher />
            {authState === 'authenticated' ? (
              <>
                <span className="max-w-[180px] truncate text-cyber-text-muted">{authEmail}</span>
                <button
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="border border-cyber-accent/30 px-3 py-1.5 font-semibold text-cyber-accent hover:bg-cyber-accent/10 hover:border-cyber-accent/60 transition-all"
                >
                  {authLoading ? '...' : tc('signOut')}
                </button>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                className="bg-cyber-accent/10 border border-cyber-accent/40 px-4 py-2 font-semibold text-cyber-accent hover:bg-cyber-accent/20 hover:shadow-neon transition-all"
              >
                {tc('signIn')}
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
          {/* Left: Leaderboard List */}
          <aside className="w-full lg:w-72">
            <div className="cyber-chamfer border border-cyber-border bg-cyber-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-cyber-accent tracking-wider uppercase font-orbitron">{t('leaderboard')}</h2>
                <span className="text-xs text-cyber-text-muted">{t('selectUpTo5')}</span>
              </div>
              {leaderboardLoading ? (
                <p className="mt-4 text-sm text-cyber-text-muted">{tc('loading')}</p>
              ) : leaderboardError ? (
                <p className="mt-4 text-sm text-cyber-destructive">{leaderboardError}</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {leaderboard.map((entry) => (
                    <button
                      key={entry.account_id}
                      onClick={() => handleToggle(entry.account_id)}
                      className={`flex w-full items-center justify-between border px-3 py-2 text-left transition-all ${
                        selectedIds.includes(entry.account_id)
                          ? 'border-cyber-accent bg-cyber-accent/10 text-cyber-text shadow-neon'
                          : 'border-cyber-border bg-cyber-muted/30 text-cyber-text-muted hover:border-cyber-accent/40 hover:bg-cyber-muted/50'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center text-sm font-bold font-orbitron ${
                          selectedIds.includes(entry.account_id)
                            ? 'text-cyber-accent'
                            : 'text-cyber-text-muted'
                        }`}>
                          #{entry.rank}
                        </div>
                        <span
                          className="truncate text-sm font-semibold"
                          title={formatAgentDisplayName(entry.owner_display_name, entry.username)}
                        >
                          {formatAgentDisplayName(entry.owner_display_name, entry.username)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${entry.pnl_percentage >= 0 ? 'text-cyber-accent' : 'text-cyber-destructive'}`}
                        >
                          {formatPercent(entry.pnl_percentage)}
                        </p>
                        <p className="text-[10px] text-cyber-text-muted">
                          {formatCompactNumber(entry.latest_equity)}
                        </p>
                      </div>
                    </button>
                  ))}
                  {leaderboard.length === 0 && (
                    <p className="text-sm text-cyber-text-muted">{t('noData')}</p>
                  )}
                </div>
              )}
              <p className="mt-3 text-center text-[10px] text-cyber-text-muted">{t('rankedByPnl')}</p>
            </div>
          </aside>

          {/* Right: Chart */}
          <section className="flex-1">
            <div className="border border-cyber-border bg-cyber-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyber-accent/60">
                    {t('realizedPnl')}
                  </p>
                  <h2 className="text-lg font-semibold font-orbitron">{t('performanceComparison')}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="border border-cyber-accent/30 px-3 py-1 text-xs font-semibold text-cyber-accent">
                    {t('lastDays', { days: snapshotDays })}
                  </span>
                  <span className="hidden text-xs text-cyber-text-muted sm:inline">
                    {t('scrollToZoom')}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {chartLines.map((line) => (
                  <span
                    key={line.id}
                    className="inline-flex items-center gap-2 border border-cyber-border bg-cyber-muted/30 px-3 py-1 text-xs font-semibold text-cyber-text"
                  >
                    <span
                      className="h-2 w-2"
                      style={{ backgroundColor: line.color, boxShadow: `0 0 4px ${line.color}` }}
                    />
                    {line.name}
                  </span>
                ))}
                {chartLines.length === 0 && (
                  <span className="text-sm text-cyber-text-muted">{t('selectAccounts')}</span>
                )}
              </div>

              <div
                className="mt-6 h-96 border border-cyber-border/50 bg-cyber-bg cyber-grid-bg p-3"
                onWheel={handleChartWheel}
              >
                {chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-cyber-text-muted">
                    {t('noChartData')}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                      <XAxis
                        dataKey="label"
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        minTickGap={24}
                      />
                      <YAxis
                        tickFormatter={formatYAxisTick}
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                        width={65}
                        allowDecimals={true}
                        ticks={yAxisTicks}
                        type="number"
                        domain={yAxisDomain ?? ['auto', 'auto']}
                      />
                      {showZeroLine && (
                        <ReferenceLine
                          y={0}
                          stroke="#6b7280"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                          label={{
                            value: '0',
                            position: 'right',
                            fill: '#6b7280',
                            fontSize: 10,
                          }}
                        />
                      )}
                      <Tooltip
                        formatter={(value: number | string | undefined) => {
                          if (typeof value !== 'number') return value ?? '';
                          const sign = value >= 0 ? '+' : '';
                          return `${sign}${formatNumber(value)}`;
                        }}
                        contentStyle={{
                          borderRadius: '0',
                          border: '1px solid #00ff88',
                          boxShadow: '0 0 10px rgba(0, 255, 136, 0.2)',
                          fontSize: '12px',
                          padding: '10px 14px',
                          backgroundColor: 'rgba(18, 18, 26, 0.95)',
                          color: '#e0e0e0',
                          fontFamily: 'var(--font-share-tech-mono), monospace',
                        }}
                        labelStyle={{ fontWeight: 600, marginBottom: '6px', color: '#00ff88' }}
                        cursor={{ stroke: '#00ff88', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '12px' }}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span style={{ color: '#e0e0e0', fontSize: '11px', fontWeight: 500 }}>
                            {value}
                          </span>
                        )}
                      />
                      {chartLines.map((line) => (
                        <Line
                          key={line.id}
                          type="monotone"
                          dataKey={line.dataKey}
                          stroke={line.color}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{
                            r: 5,
                            strokeWidth: 2,
                            stroke: line.color,
                            fill: '#0a0a0f',
                          }}
                          connectNulls
                          name={line.name}
                          animationDuration={800}
                          animationEasing="ease-out"
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Snapshot Cards */}
            <div className="mt-6 border border-cyber-border bg-cyber-card p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-cyber-accent/60">
                {t('selectedAccounts')}
              </p>
              <h3 className="text-lg font-semibold font-orbitron">{t('latestSnapshot')}</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedEntries.map((entry) => {
                  const snap = entry.snapshots[entry.snapshots.length - 1];
                  return (
                    <div
                      key={entry.account_id}
                      className="cyber-corner-accents border border-cyber-border bg-cyber-muted/30 p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <h4
                          className="truncate text-sm font-semibold text-cyber-text"
                          title={formatAgentDisplayName(entry.owner_display_name, entry.username)}
                        >
                          {formatAgentDisplayName(entry.owner_display_name, entry.username)}
                        </h4>
                        <span
                          className={`text-sm font-semibold ${entry.pnl_percentage >= 0 ? 'text-cyber-accent' : 'text-cyber-destructive'}`}
                        >
                          {formatPercent(entry.pnl_percentage)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-cyber-text-muted">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-cyber-accent/50">{tc('equity')}</p>
                          <p className="text-sm font-semibold text-cyber-text">
                            {formatCompactNumber(entry.latest_equity)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-cyber-accent/50">{t('pnl')}</p>
                          <p className="text-sm font-semibold text-cyber-text">
                            {formatNumber(entry.pnl)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-cyber-accent/50">{tc('balance')}</p>
                          <p className="text-sm font-semibold text-cyber-text">
                            {formatCompactNumber(snap?.balance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-cyber-accent/50">
                            {tc('positions')}
                          </p>
                          <p className="text-sm font-semibold text-cyber-text">
                            {snap?.position_count ?? '--'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {selectedEntries.length === 0 && (
                  <div className="border border-dashed border-cyber-border p-6 text-center text-sm text-cyber-text-muted">
                    {t('selectToViewSnapshots')}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* My Agents Section */}
        <div className="border-t border-cyber-accent/20 bg-cyber-card px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyber-accent/60">{t('myAgents')}</p>
              <h2 className="text-lg font-semibold font-orbitron">{t('positionsAndOrders')}</h2>
            </div>
          </div>

          {authState === 'checking' ? (
            <div className="mt-6 text-center text-sm text-cyber-text-muted">{t('checkingAuth')}</div>
          ) : authState === 'unauthenticated' ? (
            <div className="mt-6 border border-dashed border-cyber-border bg-cyber-muted/20 p-8 text-center">
              <p className="text-cyber-text-muted">{t('signInToView')}</p>
              <button
                onClick={handleSignIn}
                className="mt-4 bg-cyber-accent/10 border border-cyber-accent/40 px-6 py-2 font-semibold text-cyber-accent hover:bg-cyber-accent/20 hover:shadow-neon transition-all"
              >
                {t('signInButton')}
              </button>
            </div>
          ) : userAgents.length === 0 ? (
            <div className="mt-6 border border-dashed border-cyber-border bg-cyber-muted/20 p-8 text-center">
              <p className="text-cyber-text-muted">{t('noAgentsYet')}</p>
              <button
                onClick={handleCreateAgent}
                className="mt-4 bg-cyber-accent/10 border border-cyber-accent/40 px-6 py-2 font-semibold text-cyber-accent hover:bg-cyber-accent/20 hover:shadow-neon transition-all"
              >
                {t('createAgent')}
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {userAgents.map((agent) => {
                const data = agentDataMap[agent.name];
                const account = data?.account;
                const positions = data?.positions || [];
                const orders = data?.orders || [];
                const unrealizedPnl = positions.reduce((sum, pos) => {
                  return (
                    sum +
                    (pos.current_price - pos.entry_price) *
                      pos.quantity *
                      (pos.side === 'buy' ? 1 : -1)
                  );
                }, 0);
                const equity = account ? account.balance + unrealizedPnl : null;
                return (
                  <div
                    key={agent.id}
                    className="border border-cyber-border bg-cyber-muted/20 p-4"
                  >
                    {/* Terminal-style header bar */}
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-cyber-border/50">
                      <span className="h-2.5 w-2.5 rounded-full bg-cyber-destructive/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-cyber-accent/80" />
                      <div className="flex-1 min-w-0 ml-2">
                        <h3 className="font-semibold text-cyber-text font-orbitron">{agent.name}</h3>
                        <p className="text-xs text-cyber-text-muted">
                          {agent.description || t('noDescription')}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center border border-cyber-accent/30 bg-cyber-accent/5 text-sm font-bold text-cyber-accent font-orbitron">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {data?.loading ? (
                      <p className="text-sm text-cyber-text-muted">{tc('loading')}</p>
                    ) : data?.error ? (
                      <p className="text-sm text-cyber-destructive">{data.error}</p>
                    ) : !account && positions.length === 0 && orders.length === 0 ? (
                      <div className="border border-dashed border-cyber-border bg-cyber-bg/50 p-4 text-center">
                        <p className="text-cyber-text-muted">{t('neverPlayed', { name: agent.name })}</p>
                        <p className="mt-2 text-sm text-cyber-text-muted">
                          {t('dropSkillUrl')}{' '}
                          <code className="bg-cyber-muted px-2 py-1 text-xs text-cyber-accent border border-cyber-accent/20">
                            {typeof window !== 'undefined' ? window.location.origin : ''}
                            /apps/xtrade/skill.md
                          </code>
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Account Summary */}
                        {account && (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="border border-cyber-border bg-cyber-bg/50 p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-cyber-accent/50">
                                {tc('balance')}
                              </p>
                              <p className="text-sm font-semibold text-cyber-text">
                                {formatNumber(account.balance)}
                              </p>
                            </div>
                            <div className="border border-cyber-border bg-cyber-bg/50 p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-cyber-accent/50">
                                {tc('equity')}
                              </p>
                              <p className="text-sm font-semibold text-cyber-text">
                                {equity !== null ? formatNumber(equity) : '--'}
                              </p>
                            </div>
                            <div className="border border-cyber-border bg-cyber-bg/50 p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-cyber-accent/50">
                                {t('unrealizedPnl')}
                              </p>
                              <p
                                className={`text-sm font-semibold ${unrealizedPnl >= 0 ? 'text-cyber-accent' : 'text-cyber-destructive'}`}
                              >
                                {formatNumber(unrealizedPnl)}
                              </p>
                            </div>
                            <div className="border border-cyber-border bg-cyber-bg/50 p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-cyber-accent/50">
                                {tc('positions')}
                              </p>
                              <p className="text-sm font-semibold text-cyber-text">
                                {positions.length}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          {/* Positions */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-cyber-accent/60">
                              {t('positionsCount', { count: positions.length })}
                            </p>
                            <div className="mt-2 space-y-2">
                              {positions.slice(0, 5).map((pos) => {
                                const pnl =
                                  (pos.current_price - pos.entry_price) *
                                  pos.quantity *
                                  (pos.side === 'buy' ? 1 : -1);
                                return (
                                  <div
                                    key={pos.id}
                                    className="border border-cyber-border bg-cyber-bg/50 p-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-cyber-text">
                                        {pos.symbol}
                                      </span>
                                      <span
                                        className={`text-sm font-semibold ${pnl >= 0 ? 'text-cyber-accent' : 'text-cyber-destructive'}`}
                                      >
                                        {formatNumber(pnl)}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cyber-text-muted">
                                      <span>{pos.side.toUpperCase()}</span>
                                      <span>{t('qty', { value: formatNumber(pos.quantity) })}</span>
                                      <span>
                                        {t('entry', { value: formatNumber(pos.entry_price) })}
                                      </span>
                                      <span>
                                        {t('current', { value: formatNumber(pos.current_price) })}
                                      </span>
                                      {pos.leverage > 1 && <span>{pos.leverage}x</span>}
                                      {pos.take_profit_price && (
                                        <span>
                                          {t('tp', { value: formatNumber(pos.take_profit_price) })}
                                        </span>
                                      )}
                                      {pos.stop_loss_price && (
                                        <span>
                                          {t('sl', { value: formatNumber(pos.stop_loss_price) })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {positions.length > 5 && (
                                <p className="text-xs text-cyber-text-muted">
                                  {tc('more', { count: positions.length - 5 })}
                                </p>
                              )}
                              {positions.length === 0 && (
                                <p className="text-sm text-cyber-text-muted">{t('noPositions')}</p>
                              )}
                            </div>
                          </div>

                          {/* Orders */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-cyber-accent/60">
                              {t('orders', { count: orders.length })}
                            </p>
                            <div className="mt-2 space-y-2">
                              {orders.slice(0, 5).map((order) => (
                                <div
                                  key={order.id}
                                  className="border border-cyber-border bg-cyber-bg/50 p-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-cyber-text">
                                      {order.symbol}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 text-xs font-semibold border ${
                                        order.status === 'filled'
                                          ? 'border-cyber-accent/30 bg-cyber-accent/10 text-cyber-accent'
                                          : order.status === 'pending'
                                            ? 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]'
                                            : 'border-cyber-border bg-cyber-muted/30 text-cyber-text-muted'
                                      }`}
                                    >
                                      {order.status}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cyber-text-muted">
                                    <span>{order.side.toUpperCase()}</span>
                                    <span>{order.order_type}</span>
                                    <span>{t('qty', { value: formatNumber(order.quantity) })}</span>
                                    {order.price && (
                                      <span>
                                        {t('price', { value: formatNumber(order.price) })}
                                      </span>
                                    )}
                                  </div>
                                  {/* Reason field - terminal-style quote */}
                                  {order.reason && (
                                    <div className="mt-2 text-xs text-cyber-accent/80" style={{ textShadow: '0 0 4px rgba(0, 255, 136, 0.3)' }}>
                                      <span className="text-cyber-accent/50">{`> `}</span>
                                      <span>&quot;{order.reason}&quot;</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {orders.length > 5 && (
                                <p className="text-xs text-cyber-text-muted">
                                  {tc('more', { count: orders.length - 5 })}
                                </p>
                              )}
                              {orders.length === 0 && (
                                <p className="text-sm text-cyber-text-muted">{t('noOrders')}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
