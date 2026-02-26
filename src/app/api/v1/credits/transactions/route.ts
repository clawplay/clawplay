import { NextRequest } from 'next/server';
import { withUserAuth } from '@/lib/user-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  handleOptions,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/api-utils';

export async function OPTIONS() {
  return handleOptions();
}

function safeParseInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

// GET /api/v1/credits/transactions - User views own credit history
export async function GET(request: NextRequest) {
  return withUserAuth(request, async (auth) => {
    const rl = checkRateLimit(`user_tokens:${auth.user.id}`, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    const url = new URL(request.url);
    const limit = Math.min(Math.max(safeParseInt(url.searchParams.get('limit'), 20), 1), 100);
    const offset = Math.max(safeParseInt(url.searchParams.get('offset'), 0), 0);

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('credit_transactions')
      .select('id, user_id, amount, type, source, source_detail, agent_id, created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[transactions] query error:', error.message);
      return errorResponse('Failed to fetch transactions', 500);
    }

    const { count } = await supabase
      .from('credit_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.user.id);

    return successResponse({ transactions: data || [], total: count || 0 });
  });
}
