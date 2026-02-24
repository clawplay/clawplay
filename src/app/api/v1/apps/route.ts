import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse, handleOptions } from '@/lib/api-utils';

// Generate skill_url for internal apps
function getSkillUrl(slug: string, type: string): string | null {
  if (type !== 'internal') return null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/apps/${slug}/skill.md`;
}

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/apps - List all published apps (including developer apps)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const category = searchParams.get('category');
    const type = searchParams.get('type');

    const supabase = getSupabaseAdmin();

    // Fetch platform apps
    let platformQuery = supabase
      .from('apps')
      .select(
        'slug, name, description, icon_url, type, category, route_path, external_url, agent_count, created_at'
      )
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    // Filter by category
    if (category && ['social', 'tool', 'game', 'other', 'trade'].includes(category)) {
      platformQuery = platformQuery.eq('category', category);
    }

    // Filter by type
    if (type && ['internal', 'external'].includes(type)) {
      platformQuery = platformQuery.eq('type', type);
    }

    const { data: platformApps, error: platformError } = await platformQuery;

    if (platformError) {
      console.error('Platform apps error:', platformError);
      return errorResponse('Failed to fetch apps', 500);
    }

    // Fetch developer apps (published)
    let developerQuery = supabase
      .from('developer_apps')
      .select('slug, name, description, icon_url, skill_url, category, agent_count, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    // Filter developer apps by category
    if (category && ['social', 'tool', 'game', 'other'].includes(category)) {
      developerQuery = developerQuery.eq('category', category);
    }

    // Skip developer apps if filtering by internal type
    interface DeveloperAppRow {
      slug: string;
      name: string;
      description: string | null;
      icon_url: string | null;
      skill_url: string;
      category: string;
      agent_count: number;
      created_at: string;
    }
    let developerApps: DeveloperAppRow[] = [];
    if (type !== 'internal') {
      const { data, error: devError } = await developerQuery;
      if (devError) {
        console.error('Developer apps error:', devError);
      } else {
        developerApps = (data as DeveloperAppRow[]) || [];
      }
    }

    // Add skill_url for internal apps and normalize platform apps
    const normalizedPlatformApps = (platformApps || []).map((app) => ({
      slug: app.slug,
      name: app.name,
      description: app.description,
      icon_url: app.icon_url,
      type: app.type as 'internal' | 'external',
      category: app.category,
      route_path: app.route_path,
      external_url: app.external_url,
      skill_url: getSkillUrl(app.slug, app.type),
      agent_count: app.agent_count || 0,
      created_at: app.created_at,
    }));

    // Normalize developer apps (mark as external type)
    const normalizedDeveloperApps = (developerApps || []).map((app) => ({
      slug: app.slug,
      name: app.name,
      description: app.description,
      icon_url: app.icon_url,
      type: 'developer' as const,
      category: app.category,
      route_path: null,
      external_url: null,
      skill_url: app.skill_url,
      agent_count: app.agent_count || 0,
      created_at: app.created_at,
    }));

    // Combine and sort by created_at
    const allApps = [...normalizedPlatformApps, ...normalizedDeveloperApps].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply pagination
    const total = allApps.length;
    const offset = (page - 1) * limit;
    const paginatedApps = allApps.slice(offset, offset + limit);

    return successResponse({
      apps: paginatedApps,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Apps list error:', error);
    return errorResponse('Internal server error', 500);
  }
}
