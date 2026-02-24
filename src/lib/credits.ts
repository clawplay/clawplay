import { getSupabaseAdmin } from './supabase';
import { checkRateLimit } from './api-utils';

export const PASSIVE_CREDIT_AMOUNTS: Record<string, number> = {
  xtrade: 1,
  avalon: 1,
};

export async function earnPassiveCredit(
  userId: string,
  appSlug: string,
  agentId: string
): Promise<number | null> {
  const amount = PASSIVE_CREDIT_AMOUNTS[appSlug];
  if (!amount) return null;

  // Throttle: one passive credit per user per app per minute
  const rateKey = `passive_credit:${userId}:${appSlug}`;
  const rateCheck = checkRateLimit(rateKey, 1, 60_000);
  if (!rateCheck.allowed) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('earn_credit', {
    p_user_id: userId,
    p_amount: amount,
    p_source: appSlug,
    p_source_detail: { type: 'passive_use' },
    p_agent_id: agentId,
  });

  if (error) {
    console.error(`[credits] earn_credit failed for user=${userId} app=${appSlug}:`, error.message);
    return null;
  }

  return data as number;
}

export async function grantBonusCredit(
  userId: string,
  amount: number,
  source: string,
  reason: string,
  detail?: Record<string, unknown>,
  agentId?: string
): Promise<number | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('grant_bonus_credit', {
    p_user_id: userId,
    p_amount: amount,
    p_source: source,
    p_source_detail: { reason, ...detail },
    p_agent_id: agentId ?? null,
  });

  if (error) {
    console.error(`[credits] grant_bonus_credit failed for user=${userId}:`, error.message);
    return null;
  }

  return data as number;
}

export async function getUserCreditBalance(
  userId: string
): Promise<{ balance: number; total_earned: number; total_spent: number } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_credits')
    .select('balance, total_earned, total_spent')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { balance: 0, total_earned: 0, total_spent: 0 };
    }
    return null;
  }

  return data as { balance: number; total_earned: number; total_spent: number };
}

export async function resolveAgentOwner(
  agentName: string
): Promise<{ userId: string; agentId: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_claim_tokens')
    .select('id, user_id')
    .eq('name', agentName)
    .single();

  if (error || !data || !data.user_id) return null;

  return { userId: data.user_id as string, agentId: data.id as string };
}
