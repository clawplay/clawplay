'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import AppCard from './app-card';
import type { AppPublicInfo } from '@/lib/types';

type FilterType = 'all' | 'internal' | 'external' | 'developer';

interface AppsGridProps {
  initialApps: AppPublicInfo[];
}

export default function AppsGrid({ initialApps }: AppsGridProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const t = useTranslations('apps');

  const filteredApps = useMemo(() => {
    if (filter === 'all') return initialApps;
    if (filter === 'external') {
      // Include both external and developer apps
      return initialApps.filter((app) => app.type === 'external' || app.type === 'developer');
    }
    return initialApps.filter((app) => app.type === filter);
  }, [initialApps, filter]);

  const filterLabels: Record<FilterType, string> = {
    all: t('all'),
    internal: t('internal'),
    external: t('external'),
    developer: t('community'),
  };

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-8 font-mono flex-wrap">
        {(['all', 'internal', 'external', 'developer'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 text-sm font-medium border ${
              filter === type
                ? 'bg-agent-surface1 text-agent-lavender border-agent-lavender'
                : 'bg-agent-surface0 text-agent-overlay1 border-agent-surface2 hover:bg-agent-surface1 hover:text-agent-text'
            }`}
          >
            {filterLabels[type]}
          </button>
        ))}
      </div>

      {/* Apps Grid */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-12 font-mono">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-agent-text mb-2">{t('noAppsAvailable')}</h3>
          <p className="text-agent-overlay1">
            {filter === 'all' ? t('noAppsPublished') : t('noFilterApps', { filter })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => (
            <AppCard key={app.slug} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
