import { NextRequest } from 'next/server';
import { successResponse, handleOptions } from '@/lib/api-utils';
import { withUserAuth } from '@/lib/user-auth';

export async function OPTIONS() {
  return handleOptions();
}

// GET /api/v1/auth/me - Get current user profile
export async function GET(request: NextRequest) {
  return withUserAuth(request, async (auth) => {
    const { user } = auth;
    const userMetadata = user.user_metadata || {};

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: userMetadata.full_name || userMetadata.name || userMetadata.user_name || null,
        avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
        provider: user.app_metadata?.provider || null,
      },
    });
  });
}
