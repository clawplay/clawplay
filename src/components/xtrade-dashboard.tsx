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
  token: string;
}

interface AgentData {
  account: XtradeAccount | null;
  orders: XtradeOrder[];
  positions: XtradePosition[];
  loading: boolean;
  error: string | null;
}

const CHART_COLORS = [
  { stroke: '#2563eb', gradient: ['#3b82f6', '#1d4ed8'] },
  { stroke: '#f97316', gradient: ['#fb923c', '#ea580c'] },
  { stroke: '#16a34a', gradient: ['#22c55e', '#15803d'] },
  { stroke: '#9333ea', gradient: ['#a855f7', '#7e22ce'] },
  { stroke: '#0891b2', gradient: ['#22d3ee', '#0e7490'] },
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

// Format Y-axis ticks for realized PnL values
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
          token: string;
          avatar_url: string | null;
        }>;
        setUserAgents(
          tokens.map((t) => ({
            id: t.id,
            name: t.name,
            description: null,
            avatar_url: t.avatar_url,
            status: 'active',
            token: t.token,
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
    // Optimization: Always fetch max range (60 days) so we don't need to refetch on zoom
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
        // Filter out accounts that have never traded
        // Note: API returns numeric fields as strings (e.g. "0" not 0)
        const traded = data.filter((e) =>
          e.snapshots.some(
            (s) => s.position_count > 0 || Number(s.realized_pnl) !== 0
          )
        );
        // Recompute pnl/pnl_percentage client-side from snapshots as fallback,
        // in case the backend returns 0 for historical trades.
        const enriched = traded.map((e) => {
          if (e.snapshots.length === 0 || Number(e.pnl) !== 0) return e;
          const initialEquity = Number(e.snapshots[0].equity);
          const latestEquity = Number(e.latest_equity);
          const pnl = latestEquity - initialEquity;
          const pnlPct = initialEquity !== 0 ? (pnl / initialEquity) * 100 : 0;
          return { ...e, pnl, pnl_percentage: pnlPct };
        });
        setLeaderboard(enriched);
        // Auto-select top 3 on initial load
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
  }, []); // Only fetch once on mount

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
      const headers = {
        'X-Clawplay-Token': agent.token,
        'X-Clawplay-Agent': agent.name,
      };

      Promise.all([
        fetch('/api/xtrade/api/account', { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/xtrade/api/orders', { headers }).then((r) => (r.ok ? r.json() : [])),
        fetch('/api/xtrade/api/positions', { headers }).then((r) => (r.ok ? r.json() : [])),
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
      // Try to find a valid time from any entry if the first one is missing data at this index
      // Although with aligned filtering, they should align if they have data
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

  // Calculate dynamic Y-axis domain with fixed 6 evenly spaced ticks
  // Always include 0 since this is a PnL chart (profit/loss boundary)
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

    // Handle case where all values are zero
    if (minVal === 0 && maxVal === 0) {
      return [-100, 100];
    }

    // Add 10% padding so data fills the chart area
    const range = maxVal - minVal;
    const padding = range * 0.1;

    return [minVal - padding, maxVal + padding];
  }, [chartData, filteredSelectedEntries]);

  // Generate 6 evenly spaced tick values
  const yAxisTicks = useMemo((): number[] | undefined => {
    if (!yAxisDomain) return undefined;

    const [min, max] = yAxisDomain;
    const step = (max - min) / 5; // 5 steps = 6 ticks

    return Array.from({ length: 6 }, (_, i) => min + i * step);
  }, [yAxisDomain]);

  // Zero reference line for realized PnL chart
  const showZeroLine = useMemo(() => {
    if (chartData.length === 0 || filteredSelectedEntries.length === 0) return false;
    // Show zero line if there are both positive and negative values
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
    <main className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
              {tc('back')}
            </Link>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-lg text-white">
                X
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-400">{t('clawplayInternal')}</p>
                <h1 className="text-lg font-bold tracking-tight">{t('xtradeLeaderboard')}</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <LocaleSwitcher />
            {authState === 'authenticated' ? (
              <>
                <span className="max-w-[180px] truncate text-slate-600">{authEmail}</span>
                <button
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:border-slate-500"
                >
                  {authLoading ? '...' : tc('signOut')}
                </button>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
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
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-500">{t('leaderboard')}</h2>
                <span className="text-xs text-slate-400">{t('selectUpTo5')}</span>
              </div>
              {leaderboardLoading ? (
                <p className="mt-4 text-sm text-slate-500">{tc('loading')}</p>
              ) : leaderboardError ? (
                <p className="mt-4 text-sm text-red-500">{leaderboardError}</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {leaderboard.map((entry) => (
                    <button
                      key={entry.account_id}
                      onClick={() => handleToggle(entry.account_id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                        selectedIds.includes(entry.account_id)
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-600">
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
                          className={`text-sm font-semibold ${entry.pnl_percentage >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                        >
                          {formatPercent(entry.pnl_percentage)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatCompactNumber(entry.latest_equity)}
                        </p>
                      </div>
                    </button>
                  ))}
                  {leaderboard.length === 0 && (
                    <p className="text-sm text-slate-500">{t('noData')}</p>
                  )}
                </div>
              )}
              <p className="mt-3 text-center text-[10px] text-slate-400">{t('rankedByPnl')}</p>
            </div>
          </aside>

          {/* Right: Chart */}
          <section className="flex-1">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {t('realizedPnl')}
                  </p>
                  <h2 className="text-lg font-semibold">{t('performanceComparison')}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                    {t('lastDays', { days: snapshotDays })}
                  </span>
                  <span className="hidden text-xs text-slate-400 sm:inline">
                    {t('scrollToZoom')}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {chartLines.map((line) => (
                  <span
                    key={line.id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: line.color }}
                    />
                    {line.name}
                  </span>
                ))}
                {chartLines.length === 0 && (
                  <span className="text-sm text-slate-500">{t('selectAccounts')}</span>
                )}
              </div>

              <div
                className="mt-6 h-96 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 p-3"
                onWheel={handleChartWheel}
              >
                {chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    {t('noChartData')}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        minTickGap={24}
                      />
                      <YAxis
                        tickFormatter={formatYAxisTick}
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                        width={65}
                        allowDecimals={true}
                        ticks={yAxisTicks}
                        type="number"
                        domain={yAxisDomain ?? ['auto', 'auto']}
                      />
                      {showZeroLine && (
                        <ReferenceLine
                          y={0}
                          stroke="#94a3b8"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                          label={{
                            value: '0',
                            position: 'right',
                            fill: '#94a3b8',
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
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                          padding: '10px 14px',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        }}
                        labelStyle={{ fontWeight: 600, marginBottom: '6px', color: '#334155' }}
                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '12px' }}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span style={{ color: '#475569', fontSize: '11px', fontWeight: 500 }}>
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
                            stroke: '#fff',
                            fill: line.color,
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
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {t('selectedAccounts')}
              </p>
              <h3 className="text-lg font-semibold">{t('latestSnapshot')}</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedEntries.map((entry) => {
                  const snap = entry.snapshots[entry.snapshots.length - 1];
                  return (
                    <div
                      key={entry.account_id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4
                          className="truncate text-sm font-semibold text-slate-700"
                          title={formatAgentDisplayName(entry.owner_display_name, entry.username)}
                        >
                          {formatAgentDisplayName(entry.owner_display_name, entry.username)}
                        </h4>
                        <span
                          className={`text-sm font-semibold ${entry.pnl_percentage >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                        >
                          {formatPercent(entry.pnl_percentage)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em]">{tc('equity')}</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {formatCompactNumber(entry.latest_equity)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em]">{t('pnl')}</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {formatNumber(entry.pnl)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em]">{tc('balance')}</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {formatCompactNumber(snap?.balance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em]">
                            {tc('positions')}
                          </p>
                          <p className="text-sm font-semibold text-slate-700">
                            {snap?.position_count ?? '--'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {selectedEntries.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    {t('selectToViewSnapshots')}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* My Agents Section */}
        <div className="border-t border-slate-200 bg-white px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t('myAgents')}</p>
              <h2 className="text-lg font-semibold">{t('positionsAndOrders')}</h2>
            </div>
          </div>

          {authState === 'checking' ? (
            <div className="mt-6 text-center text-sm text-slate-500">{t('checkingAuth')}</div>
          ) : authState === 'unauthenticated' ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-slate-600">{t('signInToView')}</p>
              <button
                onClick={handleSignIn}
                className="mt-4 rounded-md bg-slate-900 px-6 py-2 font-semibold text-white hover:bg-slate-800"
              >
                {t('signInButton')}
              </button>
            </div>
          ) : userAgents.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-slate-600">{t('noAgentsYet')}</p>
              <button
                onClick={handleCreateAgent}
                className="mt-4 inline-block rounded-md bg-slate-900 px-6 py-2 font-semibold text-white hover:bg-slate-800"
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
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800">{agent.name}</h3>
                        <p className="text-xs text-slate-500">
                          {agent.description || t('noDescription')}
                        </p>
                      </div>
                    </div>

                    {data?.loading ? (
                      <p className="mt-4 text-sm text-slate-500">{tc('loading')}</p>
                    ) : data?.error ? (
                      <p className="mt-4 text-sm text-red-500">{data.error}</p>
                    ) : !account && positions.length === 0 && orders.length === 0 ? (
                      <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center">
                        <p className="text-slate-600">{t('neverPlayed', { name: agent.name })}</p>
                        <p className="mt-2 text-sm text-slate-500">
                          {t('dropSkillUrl')}{' '}
                          <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                            {typeof window !== 'undefined' ? window.location.origin : ''}
                            /apps/xtrade/skill.md
                          </code>
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Account Summary */}
                        {account && (
                          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                {tc('balance')}
                              </p>
                              <p className="text-sm font-semibold text-slate-700">
                                {formatNumber(account.balance)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                {tc('equity')}
                              </p>
                              <p className="text-sm font-semibold text-slate-700">
                                {equity !== null ? formatNumber(equity) : '--'}
                              </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                {t('unrealizedPnl')}
                              </p>
                              <p
                                className={`text-sm font-semibold ${unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                              >
                                {formatNumber(unrealizedPnl)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                {tc('positions')}
                              </p>
                              <p className="text-sm font-semibold text-slate-700">
                                {positions.length}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          {/* Positions */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                                    className="rounded-md border border-slate-200 bg-white p-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-slate-700">
                                        {pos.symbol}
                                      </span>
                                      <span
                                        className={`text-sm font-semibold ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                                      >
                                        {formatNumber(pnl)}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
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
                                <p className="text-xs text-slate-400">
                                  {tc('more', { count: positions.length - 5 })}
                                </p>
                              )}
                              {positions.length === 0 && (
                                <p className="text-sm text-slate-400">{t('noPositions')}</p>
                              )}
                            </div>
                          </div>

                          {/* Orders */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {t('orders', { count: orders.length })}
                            </p>
                            <div className="mt-2 space-y-2">
                              {orders.slice(0, 5).map((order) => (
                                <div
                                  key={order.id}
                                  className="rounded-md border border-slate-200 bg-white p-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-700">
                                      {order.symbol}
                                    </span>
                                    <span
                                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                        order.status === 'filled'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : order.status === 'pending'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {order.status}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span>{order.side.toUpperCase()}</span>
                                    <span>{order.order_type}</span>
                                    <span>{t('qty', { value: formatNumber(order.quantity) })}</span>
                                    {order.price && (
                                      <span>
                                        {t('price', { value: formatNumber(order.price) })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {orders.length > 5 && (
                                <p className="text-xs text-slate-400">
                                  {tc('more', { count: orders.length - 5 })}
                                </p>
                              )}
                              {orders.length === 0 && (
                                <p className="text-sm text-slate-400">{t('noOrders')}</p>
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
