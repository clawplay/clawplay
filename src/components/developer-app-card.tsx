'use client';

import { useTranslations } from 'next-intl';
import type { DeveloperApp } from '@/lib/types';

interface DeveloperAppCardProps {
  app: DeveloperApp;
  onEdit: (app: DeveloperApp) => void;
  onDelete: (app: DeveloperApp) => void;
  onPublish: (app: DeveloperApp) => void;
  onUnpublish: (app: DeveloperApp) => void;
  isDeleting: boolean;
  isPublishing: boolean;
}

const APP_CARD_COLORS = ['#dbeafe', '#dcfce7', '#fef3c7', '#fae8ff', '#fee2e2'];

const getAppCardColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return APP_CARD_COLORS[Math.abs(hash) % APP_CARD_COLORS.length];
};

export default function DeveloperAppCard({
  app,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
  isDeleting,
  isPublishing,
}: DeveloperAppCardProps) {
  const t = useTranslations('apps');
  const tc = useTranslations('common');

  return (
    <div
      className="bg-human-card border-2 border-human-border rounded-brutal p-5 shadow-brutal"
      style={{ backgroundColor: getAppCardColor(app.name) }}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Icon + Info */}
        <div className="flex items-start gap-4 min-w-0 flex-1">
          {/* Icon */}
          <div className="flex-shrink-0 w-14 h-14 bg-white border-2 border-human-border rounded-brutal flex items-center justify-center overflow-hidden">
            {app.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-human-text">
                {app.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h3 className="text-lg font-bold text-human-text">{app.name}</h3>
              <span
                className={`text-xs px-2 py-1 rounded-brutal border-2 border-human-border ${
                  app.is_published
                    ? 'bg-green-500 text-white'
                    : 'bg-human-muted/20 text-human-muted'
                }`}
              >
                {app.is_published ? t('published') : t('draft')}
              </span>
              <span className="text-xs px-2 py-1 bg-human-muted/20 text-human-muted rounded-brutal border-2 border-human-border">
                {app.category}
              </span>
            </div>

            <p className="text-xs text-human-muted mb-2">/{app.slug}</p>

            {app.description && (
              <p className="text-sm text-human-text mb-2 line-clamp-2">{app.description}</p>
            )}

            <div className="text-xs text-human-muted">
              <span className="font-mono break-all">{app.skill_url}</span>
            </div>

            <div className="text-xs text-human-muted mt-1">
              {t('agentPlural', { count: app.agent_count })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEdit(app)}
            className="text-xs font-bold bg-human-accent text-human-text border-2 border-human-border rounded-brutal px-3 py-2 shadow-brutal-sm"
          >
            {tc('edit')}
          </button>
          {app.is_published ? (
            <button
              type="button"
              onClick={() => onUnpublish(app)}
              disabled={isPublishing}
              className="text-xs font-bold bg-human-muted/20 text-human-text border-2 border-human-border rounded-brutal px-3 py-2 shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing ? '...' : t('unpublish')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onPublish(app)}
              disabled={isPublishing}
              className="text-xs font-bold bg-green-500 text-white border-2 border-human-border rounded-brutal px-3 py-2 shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing ? '...' : t('publish')}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(app)}
            disabled={isDeleting}
            className="text-xs font-bold bg-white text-human-text border-2 border-human-border rounded-brutal px-3 py-2 shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '...' : tc('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
