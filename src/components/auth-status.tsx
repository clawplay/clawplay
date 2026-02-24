'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

type AuthVariant = 'agent' | 'human';

type AuthState = 'checking' | 'authenticated' | 'unauthenticated';

interface AuthStatusProps {
  variant: AuthVariant;
}

const styles = {
  agent: {
    container: 'flex items-center gap-2 font-mono text-xs',
    pill: 'flex items-center gap-2 bg-agent-surface0 border border-agent-surface2 px-3 py-1.5 text-agent-text',
    email: 'text-agent-blue max-w-[180px] truncate',
    action: 'text-agent-peach hover:text-agent-yellow transition-colors',
    link: 'bg-agent-surface0 border border-agent-surface2 px-3 py-1.5 text-agent-text hover:bg-agent-surface1 transition-colors',
    muted: 'text-agent-subtext0',
  },
  human: {
    container: 'flex items-center gap-2 text-sm font-semibold',
    pill: 'flex items-center gap-2 bg-human-card border-2 border-human-border rounded-brutal shadow-brutal-sm px-3 py-2 text-human-text',
    email: 'text-human-text max-w-[200px] truncate',
    action:
      'bg-human-muted/20 border-2 border-human-border rounded-brutal px-3 py-2 text-human-text hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-brutal-hover transition-all',
    link: 'bg-human-primary text-white border-2 border-human-border rounded-brutal px-4 py-2 shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-brutal-hover transition-all',
    muted: 'text-human-muted',
  },
} as const;

function AuthStatusContent({ variant }: AuthStatusProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('common');

  const [status, setStatus] = useState<AuthState>('checking');
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectPath = useMemo(() => {
    const query = searchParams.toString();
    if (!pathname) {
      return '/';
    }
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(async (response) => {
        if (!active) {
          return;
        }
        if (!response.ok) {
          setStatus('unauthenticated');
          setDisplayName(null);
          return;
        }
        const data = await response.json().catch(() => null);
        const user = data?.data?.user;
        setDisplayName(user?.name || user?.email || null);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setStatus('unauthenticated');
        setDisplayName(null);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch('/api/v1/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
      });
      setStatus('unauthenticated');
      setDisplayName(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const theme = styles[variant];

  if (status === 'checking') {
    return (
      <div className={theme.container}>
        <div className={`${theme.pill} ${theme.muted}`}>{t('checkingSession')}</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className={theme.container}>
        <a href={`/auth?redirect=${encodeURIComponent(redirectPath)}`} className={theme.link}>
          {t('signIn')}
        </a>
      </div>
    );
  }

  return (
    <div className={theme.container}>
      <div className={theme.pill}>
        <span className={theme.muted}>{t('signedIn')}</span>
        <span className={theme.email}>{displayName || t('user')}</span>
      </div>
      <button type="button" onClick={handleSignOut} disabled={loading} className={theme.action}>
        {loading ? t('signingOut') : t('signOut')}
      </button>
    </div>
  );
}

function AuthStatusFallback({ variant }: AuthStatusProps) {
  const theme = styles[variant];
  const t = useTranslations('common');
  return (
    <div className={theme.container}>
      <div className={`${theme.pill} ${theme.muted}`}>{t('checkingSession')}</div>
    </div>
  );
}

export default function AuthStatus({ variant }: AuthStatusProps) {
  return (
    <Suspense fallback={<AuthStatusFallback variant={variant} />}>
      <AuthStatusContent variant={variant} />
    </Suspense>
  );
}
