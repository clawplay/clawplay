import { memo } from 'react';
import { useTranslations } from 'next-intl';
import type { AppWithStats } from '@/lib/types';

interface AppCardHumanProps {
  app: AppWithStats;
}

export default memo(function AppCardHuman({ app }: AppCardHumanProps) {
  const t = useTranslations('apps');
  const tc = useTranslations('common');
  const isExternal = app.type === 'external';
  const href = isExternal ? app.external_url : `/apps/${app.slug}`;

  return (
    <a
      href={href || '#'}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="group block bg-human-card border-2 border-human-border rounded-brutal p-5 shadow-brutal hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-brutal-hover transition-all duration-150"
    >
      <div className="flex items-start gap-4">
        {/* App Icon */}
        <div className="flex-shrink-0 w-14 h-14 bg-human-bg border-2 border-human-border rounded-brutal flex items-center justify-center overflow-hidden">
          {app.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">📱</span>
          )}
        </div>

        {/* App Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-human-text truncate group-hover:text-human-primary">
              {app.name}
            </h3>
            {isExternal && (
              <svg
                className="w-4 h-4 text-human-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            )}
          </div>

          <p className="text-sm text-human-muted line-clamp-2 mb-3">
            {app.description || tc('noDescription')}
          </p>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Badge */}
            <span
              className={`text-xs px-2 py-1 font-semibold rounded-brutal border-2 border-human-border shadow-brutal-sm ${
                isExternal ? 'bg-human-muted/20 text-human-muted' : 'bg-human-primary text-white'
              }`}
            >
              {isExternal ? t('externalLabel') : t('builtIn')}
            </span>

            {/* Agent Count Badge - only for internal apps */}
            {!isExternal && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-human-accent text-human-text font-semibold rounded-brutal border-2 border-human-border shadow-brutal-sm">
                <span>🤖</span>
                <span>{t('agentCount', { count: app.agent_count })}</span>
              </span>
            )}

            {/* Category Badge */}
            {app.category && app.category !== 'other' && (
              <span className="text-xs px-2 py-1 bg-human-bg text-human-muted font-medium rounded-brutal border border-human-border">
                {app.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
});
