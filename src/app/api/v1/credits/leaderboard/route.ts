import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  handleOptions,
  checkRateLimit,
  getClientIp,
} from '@/lib/api-utils';

export async function OPTIONS() {
  return handleOptions();
}

function safeParseInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

// GET /api/v1/credits/leaderboard - Public leaderboard
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(`leaderboard:${ip}`, 30, 60_000);
  if (!rateCheck.allowed) {
    return errorResponse('Rate limit exceeded', 429);
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(safeParseInt(url.searchParams.get('limit'), 20), 1), 100);
  const offset = Math.max(safeParseInt(url.searchParams.get('offset'), 0), 0);

  const supabase = getSupabaseAdmin();

  // Fetch top users by balance
  const { data: credits, error } = await supabase
    .from('user_credits')
    .select('user_id, balance, total_earned')
    .order('balance', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[leaderboard] query error:', error.message);
    return errorResponse('Failed to fetch leaderboard', 500);
  }

  if (!credits || credits.length === 0) {
    return successResponse({ entries: [], total: 0 });
  }

  const userIds = credits.map((c) => c.user_id);

  // Fetch agent counts and top agents for each user (ordered by last_seen_at)
  const { data: agents } = await supabase
    .from('user_claim_tokens')
    .select('user_id, name, avatar_url')
    .in('user_id', userIds)
    .order('last_seen_at', { ascending: false, nullsFirst: false });

  // Fetch display names from auth.users in parallel
  const userDataResults = await Promise.allSettled(
    userIds.map((id) => supabase.auth.admin.getUserById(id))
  );

  const displayNames: Record<string, string> = {};
  userDataResults.forEach((result, idx) => {
    if (result.status === 'fulfilled' && result.value.data?.user) {
      const user = result.value.data.user;
      const meta = user.user_metadata;
      displayNames[userIds[idx]] =
        meta?.preferred_username ||
        meta?.user_name ||
        meta?.name ||
        user.email?.split('@')[0] ||
        'Unknown';
    }
  });

  const agentsByUser = new Map<string, { name: string | null; avatar_url: string | null }[]>();
  if (agents) {
    for (const agent of agents) {
      const list = agentsByUser.get(agent.user_id) || [];
      list.push({ name: agent.name, avatar_url: agent.avatar_url });
      agentsByUser.set(agent.user_id, list);
    }
  }

  const entries = credits.map((c, i) => {
    const userAgents = agentsByUser.get(c.user_id) || [];
    return {
      rank: offset + i + 1,
      display_name: displayNames[c.user_id] || 'Unknown',
      balance: c.balance,
      total_earned: c.total_earned,
      agent_count: userAgents.length,
      top_agent: userAgents[0] || null,
    };
  });

  // Get total count
  const { count } = await supabase
    .from('user_credits')
    .select('id', { count: 'exact', head: true });

  return successResponse({ entries, total: count || 0 });
}
