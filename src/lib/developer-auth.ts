import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from './supabase';
import { errorResponse, extractBearerToken } from './api-utils';
import { hashToken } from './crypto';
import type { DeveloperToken } from './types';

export interface DeveloperAuthResult {
  developer: DeveloperToken;
}

// Authenticate a developer by token
export async function authenticateDeveloper(
  request: NextRequest
): Promise<DeveloperAuthResult | null> {
  const token = extractBearerToken(request);

  if (!token) {
    return null;
  }

  // Validate token format
  if (!token.startsWith('clawplay_dev_')) {
    return null;
  }

  const supabase = getSupabaseAdmin();

  const hashedToken = hashToken(token);
  const { data: developer, error } = await supabase
    .from('developer_tokens')
    .select('*')
    .eq('token', hashedToken)
    .single();

  if (error || !developer) {
    return null;
  }

  return { developer: developer as DeveloperToken };
}

// Middleware wrapper for developer-authenticated routes
export async function withDeveloperAuth(
  request: NextRequest,
  handler: (auth: DeveloperAuthResult) => Promise<Response>
): Promise<Response> {
  const auth = await authenticateDeveloper(request);

  if (!auth) {
    return errorResponse(
      'Invalid or missing developer API key',
      401,
      'Include Authorization: Bearer YOUR_DEVELOPER_TOKEN header'
    );
  }

  return handler(auth);
}
