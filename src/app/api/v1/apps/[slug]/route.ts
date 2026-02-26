import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  handleOptions,
  checkRateLimit,
  rateLimitResponse,
  getClientIp,
} from '@/lib/api-utils';

// Generate skill_url for internal apps
function getSkillUrl(slug: string, type: string): string | null {
  if (type !== 'internal') return null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/apps/${slug}/skill.md`;
}

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/apps/[slug] - Get app by slug
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`app_detail:${ip}`, 60, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

  try {
    const { slug } = await params;
    const supabase = getSupabaseAdmin();

    const { data: app, error } = await supabase
      .from('apps')
      .select(
        'slug, name, description, icon_url, type, category, route_path, external_url, created_at, updated_at'
      )
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !app) {
      return errorResponse('App not found', 404);
    }

    // Add skill_url for internal apps
    const appWithSkillUrl = {
      ...app,
      skill_url: getSkillUrl(app.slug, app.type),
    };

    return successResponse(appWithSkillUrl);
  } catch (error) {
    console.error('App fetch error:', error);
    return errorResponse('Internal server error', 500);
  }
}
