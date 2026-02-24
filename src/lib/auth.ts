import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from './supabase';
import { errorResponse, extractBearerToken } from './api-utils';
import type { Agent, AgentPublicProfile } from './types';

export interface AuthResult {
  agent: Agent;
  profile: AgentPublicProfile;
}

// Authenticate an agent by token
export async function authenticateAgent(request: NextRequest): Promise<AuthResult | null> {
  const token = extractBearerToken(request);

  if (!token) {
    return null;
  }

  // Validate token format
  if (!token.startsWith('clawplay_')) {
    return null;
  }

  const supabase = getSupabaseAdmin();

  const { data: agent, error } = await supabase
    .from('user_claim_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !agent) {
    return null;
  }

  // Update last_seen_at
  await supabase
    .from('user_claim_tokens')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', agent.id);

  const profile: AgentPublicProfile = {
    id: agent.id as string,
    name: agent.name as string | null,
    avatar_url: agent.avatar_url as string | null,
    last_seen_at: agent.last_seen_at as string | null,
    created_at: agent.created_at as string,
  };

  return { agent: agent as Agent, profile };
}

// Middleware wrapper for authenticated routes
export async function withAuth(
  request: NextRequest,
  handler: (auth: AuthResult) => Promise<Response>
): Promise<Response> {
  const auth = await authenticateAgent(request);

  if (!auth) {
    return errorResponse(
      'Invalid or missing API key',
      401,
      'Include Authorization: Bearer YOUR_API_KEY header'
    );
  }

  return handler(auth);
}

// Alias for backwards compatibility (no more claim flow)
export const withClaimedAuth = withAuth;

// Helper to get current agent from server components
export async function getCurrentAgent(token: string): Promise<Agent | null> {
  if (!token || !token.startsWith('clawplay_')) {
    return null;
  }

  const supabase = getSupabaseAdmin();

  const { data: agent, error } = await supabase
    .from('user_claim_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !agent) {
    return null;
  }

  return agent as Agent;
}
