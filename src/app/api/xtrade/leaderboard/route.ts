import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const XTRADE_BASE_URL = process.env.XTRADE_API_BASE_URL;
const XTRADE_SECRET = process.env.XTRADE_SECRET;

interface LeaderboardEntry {
  rank: number;
  account_id: string;
  user_id: string;
  username: string;
  latest_equity: number;
  pnl: number;
  pnl_percentage: number;
  snapshots: Array<{
    equity: number;
    balance: number;
    unrealized_pnl: number;
    realized_pnl: number;
    position_count: number;
    time: string;
  }>;
}

interface EnrichedLeaderboardEntry extends LeaderboardEntry {
  owner_display_name: string;
}

export async function GET(request: NextRequest) {
  if (!XTRADE_BASE_URL) {
    return NextResponse.json({ error: 'Xtrade API base URL not configured' }, { status: 500 });
  }

  if (!XTRADE_SECRET) {
    return NextResponse.json({ error: 'Xtrade secret not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();

  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const limit = searchParams.get('limit');
  const accounts = searchParams.get('accounts');

  if (start) params.set('start', start);
  if (end) params.set('end', end);
  if (limit) params.set('limit', limit);
  if (accounts) params.set('accounts', accounts);

  const targetUrl = `${XTRADE_BASE_URL.replace(/\/$/, '')}/api/admin/leaderboard${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'X-Xtrade-Secret': XTRADE_SECRET,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', details: text },
      { status: response.status }
    );
  }

  const data = (await response.json()) as LeaderboardEntry[];

  // Enrich with owner display names
  const enrichedData = await enrichWithOwnerNames(data);

  return NextResponse.json(enrichedData);
}

async function enrichWithOwnerNames(
  entries: LeaderboardEntry[]
): Promise<EnrichedLeaderboardEntry[]> {
  if (entries.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdmin();

  // user_id in leaderboard is the agent name (username in xtrade)
  const agentNames = entries.map((e) => e.user_id);

  // Query claim_tokens to get user_ids for these agent names
  const { data: tokens, error } = await supabase
    .from('user_claim_tokens')
    .select('name, user_id')
    .in('name', agentNames);

  if (error || !tokens) {
    // If lookup fails, return with default display name
    return entries.map((e) => ({
      ...e,
      owner_display_name: 'clawplay',
    }));
  }

  // Build a map of agent name -> supabase user_id
  const agentToUserId = new Map<string, string>();
  for (const token of tokens) {
    if (token.name && token.user_id) {
      agentToUserId.set(token.name, token.user_id);
    }
  }

  // Get unique user IDs
  const userIds = Array.from(new Set(tokens.filter((t) => t.user_id).map((t) => t.user_id!)));

  // Fetch user metadata for all users
  const userDisplayNames = new Map<string, string>();

  for (const userId of userIds) {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user) {
        const meta = userData.user.user_metadata || {};
        const displayName = meta.full_name || meta.name || meta.user_name || 'clawplay';
        userDisplayNames.set(userId, displayName);
      }
    } catch {
      // Ignore errors, will use default
    }
  }

  // Enrich entries with owner display names
  return entries.map((entry) => {
    const userId = agentToUserId.get(entry.user_id);
    const ownerDisplayName = userId ? userDisplayNames.get(userId) || 'clawplay' : 'clawplay';

    return {
      ...entry,
      owner_display_name: ownerDisplayName,
    };
  });
}
