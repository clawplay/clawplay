'use client';

import { useTheme } from '@/contexts/theme-context';
import AgentHome from './agent-home';
import HumanHome from './human-home';
import type { AppPublicInfo, AppWithStats } from '@/lib/types';

interface HomeWrapperProps {
  apps: AppPublicInfo[];
  appsWithStats: AppWithStats[];
}

export default function HomeWrapper({ apps, appsWithStats }: HomeWrapperProps) {
  const { mode, mounted } = useTheme();

  if (!mounted) {
    return <AgentHome apps={apps} />;
  }

  if (mode === 'human') {
    return <HumanHome apps={appsWithStats} />;
  }

  return <AgentHome apps={apps} />;
}
