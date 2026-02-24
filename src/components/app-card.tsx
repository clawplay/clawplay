import { memo } from 'react';
import { useTranslations } from 'next-intl';
import type { AppPublicInfo } from '@/lib/types';

interface AppCardProps {
  app: AppPublicInfo;
}

function getProxiedIconUrl(iconUrl: string | null): string | null {
  if (!iconUrl) return null;
  // Use image proxy for external URLs to enable server-side caching
  if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) {
    return `/api/v1/image-proxy?url=${encodeURIComponent(iconUrl)}`;
  }
  return iconUrl;
}

export default memo(function AppCard({ app }: AppCardProps) {
  const t = useTranslations('apps');
  const tc = useTranslations('common');
  const isExternal = app.type === 'external';
  const isInternal = app.type === 'internal';
  const isDeveloper = app.type === 'developer';
  const isExternalOrDeveloper = isExternal || isDeveloper;
  const href = app.external_url !== null ? app.external_url : `/apps/${app.slug}`;
  const proxiedIconUrl = getProxiedIconUrl(app.icon_url);

  return (
    <div className="group bg-agent-surface0 border border-agent-surface2 p-5 font-mono hover:bg-agent-surface1 hover:border-agent-lavender">
      <div className="flex items-start gap-4">
        {/* App Icon */}
        <div className="flex-shrink-0 w-14 h-14 bg-agent-base border border-agent-surface2 flex items-center justify-center overflow-hidden">
          {proxiedIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proxiedIconUrl} alt={app.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">📱</span>
          )}
        </div>

        {/* App Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={href || '#'}
              target={isExternalOrDeveloper ? '_blank' : undefined}
              rel={isExternalOrDeveloper ? 'noopener noreferrer' : undefined}
              className="text-base font-semibold text-agent-text truncate group-hover:text-agent-lavender hover:underline"
            >
              {app.name}
            </a>
            {isExternalOrDeveloper && (
              <svg
                className="w-4 h-4 text-agent-overlay0"
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

          <p className="text-sm text-agent-overlay1 line-clamp-2 mb-3">
            {app.description || tc('noDescription')}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Badge */}
            <span
              className={`text-xs px-2 py-0.5 border ${
                isDeveloper
                  ? 'border-agent-mauve text-agent-mauve'
                  : isExternal
                    ? 'border-agent-peach text-agent-peach'
                    : 'border-agent-green text-agent-green'
              }`}
            >
              {isDeveloper ? t('community') : isExternal ? t('external') : t('internal')}
            </span>

            {/* Category Badge */}
            {app.category && app.category !== 'other' && (
              <span className="text-xs px-2 py-0.5 border border-agent-surface2 text-agent-subtext0">
                {app.category}
              </span>
            )}

            {/* Skills Button for internal apps or developer apps with skill_url */}
            {(isInternal || isDeveloper) && app.skill_url && (
              <a
                href={app.skill_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-0.5 border border-agent-blue text-agent-blue hover:bg-agent-blue hover:text-agent-base transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {t('skills')}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
