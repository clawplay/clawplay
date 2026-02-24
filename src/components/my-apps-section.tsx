'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { DeveloperApp } from '@/lib/types';
import DeveloperAppCard from './developer-app-card';

interface CreateAppForm {
  name: string;
  slug: string;
  skill_url: string;
  description: string;
  icon_url: string;
  category: string;
}

const initialFormState: CreateAppForm = {
  name: '',
  slug: '',
  skill_url: '',
  description: '',
  icon_url: '',
  category: 'other',
};

export default function MyAppsSection() {
  const t = useTranslations('myApps');
  const tc = useTranslations('common');
  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<CreateAppForm>(initialFormState);
  const [creating, setCreating] = useState(false);
  const [editingApp, setEditingApp] = useState<DeveloperApp | null>(null);
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);
  const [publishingAppId, setPublishingAppId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setState('loading');
    setError(null);

    fetch('/api/v1/developers/apps', { credentials: 'include' })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setState('error');
          setError(t('failedLoadApps'));
          return;
        }
        const data = await response.json().catch(() => null);
        setApps((data?.data?.apps as DeveloperApp[]) ?? []);
        setState('ready');
      })
      .catch(() => {
        if (!active) return;
        setState('error');
        setError(t('failedLoadApps'));
      });

    return () => {
      active = false;
    };
  }, [t]);

  const handleCreateApp = useCallback(async () => {
    if (creating) return;

    if (!form.name.trim()) {
      setError(t('nameRequired'));
      return;
    }
    if (!form.slug.trim()) {
      setError(t('slugRequired'));
      return;
    }
    if (!form.skill_url.trim()) {
      setError(t('skillUrlRequired'));
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/developers/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || t('failedCreateApp'));
        return;
      }

      if (data?.data?.app) {
        setApps((prev) => [data.data.app as DeveloperApp, ...prev]);
        setForm(initialFormState);
        setShowCreateForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedCreateApp'));
    } finally {
      setCreating(false);
    }
  }, [creating, form, t]);

  const handleUpdateApp = useCallback(async () => {
    if (!editingApp || creating) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/developers/apps/${editingApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          icon_url: form.icon_url,
          skill_url: form.skill_url,
          description: form.description,
          category: form.category,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || t('failedUpdateApp'));
        return;
      }

      if (data?.data?.app) {
        setApps((prev) =>
          prev.map((app) => (app.id === editingApp.id ? (data.data.app as DeveloperApp) : app))
        );
        setEditingApp(null);
        setForm(initialFormState);
        setShowCreateForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedUpdateApp'));
    } finally {
      setCreating(false);
    }
  }, [creating, editingApp, form, t]);

  const handleDeleteApp = useCallback(
    async (app: DeveloperApp) => {
      if (deletingAppId) return;

      const confirmed = window.confirm(t('deleteConfirm', { name: app.name }));
      if (!confirmed) return;

      setDeletingAppId(app.id);
      setError(null);

      try {
        const response = await fetch(`/api/v1/developers/apps/${app.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setError(data?.error || t('failedDeleteApp'));
          return;
        }

        setApps((prev) => prev.filter((a) => a.id !== app.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('failedDeleteApp'));
      } finally {
        setDeletingAppId(null);
      }
    },
    [deletingAppId, t]
  );

  const handlePublishApp = useCallback(
    async (app: DeveloperApp) => {
      if (publishingAppId) return;

      setPublishingAppId(app.id);
      setError(null);

      try {
        const response = await fetch(`/api/v1/developers/apps/${app.id}/publish`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setError(data?.error || t('failedPublishApp'));
          return;
        }

        if (data?.data?.app) {
          setApps((prev) =>
            prev.map((a) => (a.id === app.id ? (data.data.app as DeveloperApp) : a))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('failedPublishApp'));
      } finally {
        setPublishingAppId(null);
      }
    },
    [publishingAppId, t]
  );

  const handleUnpublishApp = useCallback(
    async (app: DeveloperApp) => {
      if (publishingAppId) return;

      setPublishingAppId(app.id);
      setError(null);

      try {
        const response = await fetch(`/api/v1/developers/apps/${app.id}/unpublish`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setError(data?.error || t('failedUnpublishApp'));
          return;
        }

        if (data?.data?.app) {
          setApps((prev) =>
            prev.map((a) => (a.id === app.id ? (data.data.app as DeveloperApp) : a))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('failedUnpublishApp'));
      } finally {
        setPublishingAppId(null);
      }
    },
    [publishingAppId, t]
  );

  const handleEditApp = useCallback((app: DeveloperApp) => {
    setEditingApp(app);
    setForm({
      name: app.name,
      slug: app.slug,
      skill_url: app.skill_url,
      description: app.description || '',
      icon_url: app.icon_url || '',
      category: app.category,
    });
    setShowCreateForm(true);
    setError(null);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowCreateForm(false);
    setEditingApp(null);
    setForm(initialFormState);
    setError(null);
  }, []);

  if (state === 'loading') {
    return (
      <div className="bg-human-card border-2 border-human-border rounded-brutal p-8 shadow-brutal text-center text-human-muted">
        {t('loadingApps')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-human-text">{t('myApps')}</h3>
          <p className="text-sm text-human-muted">{t('manageApps')}</p>
        </div>
        {!showCreateForm && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="text-sm font-bold bg-human-primary text-white border-2 border-human-border rounded-brutal px-4 py-2 shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-brutal-hover transition-all"
          >
            {t('newApp')}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border-2 border-red-500/30 rounded-brutal p-3 text-red-500 text-sm">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-human-card border-2 border-human-border rounded-brutal p-5 shadow-brutal">
          <h4 className="text-lg font-bold text-human-text mb-4">
            {editingApp ? t('editApp') : t('createNewApp')}
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-human-text mb-1">
                {t('nameLabel')}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-white border-2 border-human-border rounded-brutal text-human-text outline-none focus:border-human-primary"
                placeholder={t('namePlaceholder')}
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-human-text mb-1">
                {t('slugLabel')}
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))
                }
                disabled={!!editingApp}
                className="w-full px-3 py-2 bg-white border-2 border-human-border rounded-brutal text-human-text outline-none focus:border-human-primary disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={t('slugPlaceholder')}
                maxLength={50}
              />
              <p className="text-xs text-human-muted mt-1">{t('slugHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-human-text mb-1">
                {t('skillUrlLabel')}
              </label>
              <input
                type="url"
                value={form.skill_url}
                onChange={(e) => setForm((prev) => ({ ...prev, skill_url: e.target.value }))}
                className="w-full px-3 py-2 bg-white border-2 border-human-border rounded-brutal text-human-text outline-none focus:border-human-primary"
                placeholder={t('skillUrlPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-human-text mb-1">
                {t('iconUrlLabel')}
              </label>
              <input
                type="url"
                value={form.icon_url}
                onChange={(e) => setForm((prev) => ({ ...prev, icon_url: e.target.value }))}
                className="w-full px-3 py-2 bg-white border-2 border-human-border rounded-brutal text-human-text outline-none focus:border-human-primary"
                placeholder={t('iconUrlPlaceholder')}
              />
              <p className="text-xs text-human-muted mt-1">{t('iconHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-human-text mb-1">
                {t('descriptionLabel')}
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-white border-2 border-human-border rounded-brutal text-human-text outline-none focus:border-human-primary resize-none"
                rows={2}
                placeholder={t('descriptionPlaceholder')}
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-human-text mb-1">
                {t('categoryLabel')}
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 bg-white border-2 border-human-border rounded-brutal text-human-text outline-none focus:border-human-primary"
              >
                <option value="social">{t('social')}</option>
                <option value="tool">{t('tool')}</option>
                <option value="game">{t('game')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={editingApp ? handleUpdateApp : handleCreateApp}
                disabled={creating}
                className="text-sm font-bold bg-human-primary text-white border-2 border-human-border rounded-brutal px-4 py-2 shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? t('saving') : editingApp ? t('saveChanges') : t('createApp')}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={creating}
                className="text-sm font-bold bg-human-muted/20 text-human-text border-2 border-human-border rounded-brutal px-4 py-2 shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tc('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {state === 'error' ? (
        <div className="bg-human-card border-2 border-human-border rounded-brutal p-8 shadow-brutal text-center text-human-muted">
          {t('failedLoadApps')}
        </div>
      ) : apps.length === 0 && !showCreateForm ? (
        <div className="bg-human-card border-2 border-human-border rounded-brutal p-8 shadow-brutal text-center text-human-muted">
          {t('noAppsYet')}
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => (
            <DeveloperAppCard
              key={app.id}
              app={app}
              onEdit={handleEditApp}
              onDelete={handleDeleteApp}
              onPublish={handlePublishApp}
              onUnpublish={handleUnpublishApp}
              isDeleting={deletingAppId === app.id}
              isPublishing={publishingAppId === app.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
