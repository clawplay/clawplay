import { getSupabaseAdmin } from '@/lib/supabase';
import HomeWrapper from '@/components/home-wrapper';
import type { AppPublicInfo, AppWithStats } from '@/lib/types';

async function getPublishedApps(): Promise<AppPublicInfo[]> {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch platform apps
    const { data: platformApps, error: platformError } = await supabase
      .from('apps')
      .select(
        'slug, name, description, icon_url, type, category, route_path, external_url, skill_url'
      )
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (platformError) {
      console.error('Failed to fetch platform apps:', platformError);
    }

    // Fetch developer apps
    const { data: developerApps, error: developerError } = await supabase
      .from('developer_apps')
      .select('slug, name, description, icon_url, skill_url, category')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (developerError) {
      console.error('Failed to fetch developer apps:', developerError);
    }

    // Normalize and combine
    const normalizedPlatformApps: AppPublicInfo[] = (platformApps || []).map((app) => ({
      slug: app.slug,
      name: app.name,
      description: app.description,
      icon_url: app.icon_url,
      type: app.type as AppPublicInfo['type'],
      category: app.category,
      route_path: app.route_path,
      external_url: app.external_url,
      skill_url: app.skill_url,
    }));

    const normalizedDeveloperApps: AppPublicInfo[] = (developerApps || []).map((app) => ({
      slug: app.slug,
      name: app.name,
      description: app.description,
      icon_url: app.icon_url,
      type: 'developer' as const,
      category: app.category,
      skill_url: app.skill_url,
    }));

    return [...normalizedPlatformApps, ...normalizedDeveloperApps];
  } catch {
    return [];
  }
}

async function getPublishedAppsWithStats(): Promise<AppWithStats[]> {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch platform apps
    const { data: platformApps, error: platformError } = await supabase
      .from('apps')
      .select(
        'slug, name, description, icon_url, type, category, route_path, external_url, agent_count'
      )
      .eq('is_published', true)
      .order('agent_count', { ascending: false });

    if (platformError) {
      console.error('Failed to fetch platform apps with stats:', platformError);
    }

    // Fetch developer apps
    const { data: developerApps, error: developerError } = await supabase
      .from('developer_apps')
      .select('slug, name, description, icon_url, skill_url, category, agent_count')
      .eq('is_published', true)
      .order('agent_count', { ascending: false });

    if (developerError) {
      console.error('Failed to fetch developer apps with stats:', developerError);
    }

    // Normalize and combine
    const normalizedPlatformApps: AppWithStats[] = (platformApps || []).map((app) => ({
      slug: app.slug,
      name: app.name,
      description: app.description,
      icon_url: app.icon_url,
      type: app.type as AppWithStats['type'],
      category: app.category,
      route_path: app.route_path,
      external_url: app.external_url,
      agent_count: app.agent_count || 0,
    }));

    const normalizedDeveloperApps: AppWithStats[] = (developerApps || []).map((app) => ({
      slug: app.slug,
      name: app.name,
      description: app.description,
      icon_url: app.icon_url,
      type: 'developer' as const,
      category: app.category,
      skill_url: app.skill_url,
      agent_count: app.agent_count || 0,
    }));

    // Sort by agent_count descending
    return [...normalizedPlatformApps, ...normalizedDeveloperApps].sort(
      (a, b) => b.agent_count - a.agent_count
    );
  } catch {
    return [];
  }
}

export default async function Home() {
  const [apps, appsWithStats] = await Promise.all([
    getPublishedApps(),
    getPublishedAppsWithStats(),
  ]);

  return <HomeWrapper apps={apps} appsWithStats={appsWithStats} />;
}
