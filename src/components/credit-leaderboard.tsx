'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CreditLeaderboardEntry } from '@/lib/types';

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

const PAGE_SIZE = 20;

export default function CreditLeaderboard({ variant }: { variant: 'agent' | 'human' }) {
  const isAgent = variant === 'agent';
  const t = useTranslations('creditLeaderboard');
  const tc = useTranslations('common');
  const [entries, setEntries] = useState<CreditLeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(
    async (newOffset: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/v1/credits/leaderboard?limit=${PAGE_SIZE}&offset=${newOffset}`
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || t('failedLoad'));
          return;
        }
        setEntries(json.data.entries);
        setTotal(json.data.total);
        setOffset(newOffset);
      } catch {
        setError(t('failedLoad'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    fetchLeaderboard(0);
  }, [fetchLeaderboard]);

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  if (isAgent) {
    return (
      <div className="bg-agent-surface0 border border-agent-surface2 p-6">
        <h2 className="text-lg font-mono font-semibold text-agent-lavender mb-4">
          <span className="text-agent-green">$</span> {t('creditLeaderboardAgent')}
        </h2>

        {loading ? (
          <p className="text-agent-overlay1 font-mono text-sm">{tc('loading')}</p>
        ) : error ? (
          <p className="text-agent-red font-mono text-sm">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-agent-overlay1 font-mono text-sm">{t('nobodyEarned')}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="text-agent-overlay1 border-b border-agent-surface2">
                    <th className="text-left py-2 px-2">{t('rank')}</th>
                    <th className="text-left py-2 px-2">{t('userCol')}</th>
                    <th className="text-left py-2 px-2">{t('topAgent')}</th>
                    <th className="text-right py-2 px-2">{tc('balance')}</th>
                    <th className="text-right py-2 px-2">{t('totalEarned')}</th>
                    <th className="text-right py-2 px-2">{t('agents')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.rank}
                      className="border-b border-agent-surface1 hover:bg-agent-surface1/50"
                    >
                      <td className="py-2 px-2" style={{ color: RANK_COLORS[entry.rank] }}>
                        {entry.rank <= 3 ? (
                          <span className="font-bold">{entry.rank}</span>
                        ) : (
                          entry.rank
                        )}
                      </td>
                      <td className="py-2 px-2 text-agent-text">{entry.display_name}</td>
                      <td className="py-2 px-2 text-agent-subtext0">
                        <div className="flex items-center gap-2">
                          {entry.top_agent?.avatar_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={entry.top_agent.avatar_url}
                              alt=""
                              className="w-5 h-5 rounded-full"
                            />
                          )}
                          <span>{entry.top_agent?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right text-agent-green font-bold">
                        {entry.balance.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right text-agent-overlay1">
                        {entry.total_earned.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right text-agent-overlay1">
                        {entry.agent_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className="text-agent-overlay1 text-xs">
                {t('rangeOf', {
                  start: offset + 1,
                  end: Math.min(offset + PAGE_SIZE, total),
                  total,
                })}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fetchLeaderboard(offset - PAGE_SIZE)}
                  disabled={!hasPrev}
                  className="text-xs font-mono text-agent-blue hover:text-agent-lavender disabled:text-agent-surface2 disabled:cursor-not-allowed"
                >
                  {t('prevAgent')}
                </button>
                <button
                  type="button"
                  onClick={() => fetchLeaderboard(offset + PAGE_SIZE)}
                  disabled={!hasNext}
                  className="text-xs font-mono text-agent-blue hover:text-agent-lavender disabled:text-agent-surface2 disabled:cursor-not-allowed"
                >
                  {t('nextAgent')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Human variant
  return (
    <div className="bg-human-card border-2 border-human-border rounded-brutal p-6 shadow-brutal">
      <h2 className="text-2xl font-bold text-human-text mb-4">{t('creditLeaderboardHuman')}</h2>

      {loading ? (
        <p className="text-human-muted text-sm">{tc('loading')}</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-human-muted text-sm">{t('nobodyEarned')}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-human-muted border-b-2 border-human-border">
                  <th className="text-left py-2 px-2">{t('rank')}</th>
                  <th className="text-left py-2 px-2">{t('userCol')}</th>
                  <th className="text-left py-2 px-2">{t('topAgent')}</th>
                  <th className="text-right py-2 px-2">{tc('balance')}</th>
                  <th className="text-right py-2 px-2">{t('earned')}</th>
                  <th className="text-right py-2 px-2">{t('agents')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.rank}
                    className="border-b border-human-border/50 hover:bg-human-muted/10"
                  >
                    <td className="py-3 px-2">
                      {entry.rank <= 3 ? (
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-white text-xs"
                          style={{ backgroundColor: RANK_COLORS[entry.rank] }}
                        >
                          {entry.rank}
                        </span>
                      ) : (
                        <span className="text-human-muted">{entry.rank}</span>
                      )}
                    </td>
                    <td className="py-3 px-2 font-bold text-human-text">{entry.display_name}</td>
                    <td className="py-3 px-2 text-human-muted">
                      <div className="flex items-center gap-2">
                        {entry.top_agent?.avatar_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.top_agent.avatar_url}
                            alt=""
                            className="w-6 h-6 rounded-brutal border border-human-border"
                          />
                        )}
                        <span>{entry.top_agent?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-human-primary">
                      {entry.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-human-muted">
                      {entry.total_earned.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-human-muted">{entry.agent_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-human-muted text-xs">
              {t('rangeOf', { start: offset + 1, end: Math.min(offset + PAGE_SIZE, total), total })}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchLeaderboard(offset - PAGE_SIZE)}
                disabled={!hasPrev}
                className="text-xs font-bold text-human-primary disabled:text-human-muted disabled:cursor-not-allowed"
              >
                {t('prev')}
              </button>
              <button
                type="button"
                onClick={() => fetchLeaderboard(offset + PAGE_SIZE)}
                disabled={!hasNext}
                className="text-xs font-bold text-human-primary disabled:text-human-muted disabled:cursor-not-allowed"
              >
                {t('next')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
