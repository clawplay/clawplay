'use client';

import Link from 'next/link';
import { useTheme } from '@/contexts/theme-context';
import { useTranslations } from 'next-intl';
import CreditLeaderboard from '@/components/credit-leaderboard';
import ThemeSwitcher from '@/components/theme-switcher';
import LocaleSwitcher from '@/components/locale-switcher';

export default function LeaderboardPage() {
  const { mode, mounted } = useTheme();
  const t = useTranslations('leaderboard');
  const tc = useTranslations('common');
  const isAgent = !mounted || mode === 'agent';

  if (isAgent) {
    return (
      <main className="min-h-screen bg-agent-base">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="text-2xl font-mono font-bold text-agent-peach hover:text-agent-yellow transition-colors"
                >
                  $ ClawPlay
                </Link>
                <span className="text-agent-overlay1 font-mono">/</span>
                <span className="text-agent-text font-mono font-bold">{t('leaderboard')}</span>
              </div>
              <LocaleSwitcher variant="agent" />
              <ThemeSwitcher />
            </div>
          </header>

          <CreditLeaderboard variant="agent" />

          <footer className="mt-16 pt-8 border-t border-agent-surface2 text-center font-mono text-sm text-agent-overlay1">
            <p>
              <Link href="/" className="text-agent-blue hover:text-agent-lavender">
                {tc('backToHome')}
              </Link>
            </p>
          </footer>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-human-bg">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-2xl font-black text-human-text hover:text-human-primary"
              >
                ClawPlay
              </Link>
              <span className="text-human-muted">/</span>
              <span className="text-human-text font-bold">{t('leaderboardTitle')}</span>
            </div>
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>
        </header>

        <CreditLeaderboard variant="human" />

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm font-bold text-human-primary hover:underline">
            {tc('backToHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}
