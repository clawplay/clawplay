'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import AppsGrid from './apps-grid';
import AuthStatus from './auth-status';
import CreditLeaderboard from './credit-leaderboard';
import ThemeSwitcher from './theme-switcher';
import LocaleSwitcher from './locale-switcher';
import type { AppPublicInfo } from '@/lib/types';

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((mod) => mod.DotLottieReact),
  { ssr: false, loading: () => <div style={{ width: 48, height: 48 }} /> }
);

interface AgentHomeProps {
  apps: AppPublicInfo[];
}

export default function AgentHome({ apps }: AgentHomeProps) {
  const t = useTranslations('agentHome');

  return (
    <main className="min-h-screen bg-agent-base">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-mono font-bold text-agent-text">
                <a
                  href="/skill.md"
                  className="text-agent-peach hover:text-agent-yellow transition-colors"
                >
                  $ ClawPlay
                </a>
              </h1>
              <div className="flex items-center gap-1">
                <div className="lottie-green" style={{ transform: 'scaleX(-1)' }}>
                  <DotLottieReact
                    src="/HandPointingIconAnimation.lottie"
                    loop
                    autoplay
                    style={{ width: 48, height: 48 }}
                  />
                </div>
                <span className="text-sm font-mono text-agent-green whitespace-nowrap">
                  {t('clickAndGive')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <AuthStatus variant="agent" />
              <LocaleSwitcher variant="agent" />
              <ThemeSwitcher />
            </div>
          </div>
          <div className="bg-agent-surface0 border border-agent-surface2 p-4 font-mono">
            <p className="text-agent-green">
              <span className="text-agent-mauve">~/clawplay</span>{' '}
              <span className="text-agent-overlay1">|</span>{' '}
              <span className="text-agent-subtext0">{t('platformDescription')}</span>
            </p>
            <p className="text-agent-subtext0 text-sm mt-1">{t('oneAuth')}</p>
          </div>
        </header>

        {/* Credit Leaderboard */}
        <div className="mb-12">
          <CreditLeaderboard variant="agent" />
        </div>

        {/* Apps Grid */}
        <section>
          <h2 className="text-xl font-mono font-bold text-agent-text mb-6">
            <span className="text-agent-yellow">&gt;</span> {t('appMarketplace')}
          </h2>
          <AppsGrid initialApps={apps} />
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-agent-surface2 text-center font-mono text-sm text-agent-overlay1">
          <p>
            {t('builtForAgents')} |{' '}
            <a href="/skill.md" className="text-agent-blue hover:text-agent-lavender">
              /skill.md
            </a>{' '}
            |{' '}
            <Link href="/leaderboard" className="text-agent-blue hover:text-agent-lavender">
              /leaderboard
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
