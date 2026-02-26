'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface DeveloperTokenData {
  id: string;
  token_prefix: string | null;
  plaintext_token?: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export default function DevTokenCard() {
  const t = useTranslations('developer');
  const tc = useTranslations('common');
  const [token, setToken] = useState<DeveloperTokenData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    let active = true;
    setState('loading');
    setError(null);

    fetch('/api/v1/developers/token', { credentials: 'include' })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setState('error');
          setError(t('failedLoadToken'));
          return;
        }
        const data = await response.json().catch(() => null);
        setToken(data?.data?.developer_token ?? null);
        setState('ready');
      })
      .catch(() => {
        if (!active) return;
        setState('error');
        setError(t('failedLoadToken'));
      });

    return () => {
      active = false;
    };
  }, [t]);

  const hasFullToken = !!token?.plaintext_token;

  const handleCopy = useCallback(async () => {
    if (!token?.plaintext_token) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(token.plaintext_token);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedCopyToken'));
    }
  }, [token, t]);

  const handleRegenerate = useCallback(async () => {
    if (regenerating) return;

    const confirmed = window.confirm(t('regenerateConfirm'));
    if (!confirmed) return;

    setRegenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/developers/token/regenerate', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || t('failedRegenerateToken'));
        return;
      }

      if (data?.data?.developer_token) {
        setToken(data.data.developer_token);
        setIsHidden(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedRegenerateToken'));
    } finally {
      setRegenerating(false);
    }
  }, [regenerating, t]);

  if (state === 'loading') {
    return (
      <div className="bg-human-card border-2 border-human-border rounded-brutal p-5 shadow-brutal">
        <h3 className="text-lg font-bold text-human-text mb-2">{t('developerToken')}</h3>
        <p className="text-human-muted text-sm">{tc('loading')}</p>
      </div>
    );
  }

  if (state === 'error' || !token) {
    return (
      <div className="bg-human-card border-2 border-human-border rounded-brutal p-5 shadow-brutal">
        <h3 className="text-lg font-bold text-human-text mb-2">{t('developerToken')}</h3>
        <p className="text-human-muted text-sm">{error || t('failedLoadTokenShort')}</p>
      </div>
    );
  }

  return (
    <div className="bg-human-card border-2 border-human-border rounded-brutal p-5 shadow-brutal">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-human-text">{t('developerToken')}</h3>
        <span className="text-xs px-2 py-1 bg-human-accent text-human-text rounded-brutal border-2 border-human-border">
          {t('apiKey')}
        </span>
      </div>

      <p className="text-human-muted text-sm mb-4">{t('tokenDescription')}</p>

      {error && (
        <div className="bg-red-500/10 border-2 border-red-500/30 rounded-brutal p-2 text-red-500 text-sm mb-3">
          {error}
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs uppercase tracking-wide text-human-muted">{tc('token')}</span>
          {isHidden && (
            <span className="text-[10px] uppercase bg-human-muted/20 text-human-muted px-2 py-1 rounded-brutal border-2 border-human-border">
              {tc('hidden')}
            </span>
          )}
        </div>
        <div className="font-mono text-sm text-human-text break-all bg-white/50 border-2 border-human-border rounded-brutal p-2">
          {hasFullToken
            ? isHidden
              ? '••••••••••••••••••••••••••••••••'
              : token.plaintext_token
            : `${token.token_prefix ?? ''}...`}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {hasFullToken && (
          <button
            type="button"
            onClick={() => setIsHidden(!isHidden)}
            className="text-xs font-bold bg-human-muted/20 text-human-text border-2 border-human-border rounded-brutal px-3 py-2 shadow-brutal-sm"
          >
            {isHidden ? tc('show') : tc('hide')}
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          disabled={!hasFullToken}
          className="text-xs font-bold bg-human-accent text-human-text border-2 border-human-border rounded-brutal px-3 py-2 shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? tc('copied') : tc('copy')}
        </button>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="text-xs font-bold bg-white text-human-text border-2 border-human-border rounded-brutal px-3 py-2 shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {regenerating ? t('regenerating') : t('regenerate')}
        </button>
      </div>
    </div>
  );
}
