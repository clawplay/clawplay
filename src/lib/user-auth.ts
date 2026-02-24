import { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabase';
import { errorResponse } from '@/lib/api-utils';
import type { Agent } from '@/lib/types';

export interface UserAuthResult {
  user: User;
  accessToken: string;
}

export async function getUserFromRequest(request: NextRequest): Promise<UserAuthResult | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // We don't need to set cookies in this context
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Get session for access token
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    user,
    accessToken: session?.access_token || '',
  };
}

export async function withUserAuth(
  request: NextRequest,
  handler: (auth: UserAuthResult) => Promise<Response>
): Promise<Response> {
  const auth = await getUserFromRequest(request);

  if (!auth) {
    return errorResponse(
      'Invalid or missing access token',
      401,
      'Include Authorization: Bearer YOUR_ACCESS_TOKEN header'
    );
  }

  return handler(auth);
}

export async function get_user_agents_from_request(
  request: NextRequest,
  options: { claimedOnly?: boolean } = {}
): Promise<Agent[]> {
  const auth = await getUserFromRequest(request);

  if (!auth) {
    throw new Error('Invalid or missing access token');
  }

  const supabase = getSupabaseAdmin();
  const claimedOnly = options.claimedOnly ?? true;
  let query = supabase
    .from('agents')
    .select('*')
    .eq('owner_user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (claimedOnly) {
    query = query.eq('status', 'claimed');
  }

  const { data: agents, error } = await query;

  if (error) {
    console.error('Fetch user agents error:', error);
    throw new Error('Failed to fetch user agents');
  }

  return (agents as Agent[]) || [];
}
