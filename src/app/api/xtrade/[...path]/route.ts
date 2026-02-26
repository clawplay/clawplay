import { NextRequest } from 'next/server';
import { handleOptions, checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/api-utils';
import { getSupabaseAdmin } from '@/lib/supabase';
import { earnPassiveCredit } from '@/lib/credits';
import { hashToken } from '@/lib/crypto';
import { getUserFromRequest } from '@/lib/user-auth';

const XTRADE_BASE_URL = process.env.XTRADE_API_BASE_URL;

const PUBLIC_PATHS = ['instruments', 'market', 'orderbook', 'health'];

const isPublicPath = (path: string): boolean => {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
};

interface AuthInfo {
  agentName: string;
  ownerEmail: string;
  userId: string;
  agentId: string;
}

async function authenticateXtradeRequest(
  request: NextRequest
): Promise<{ error: Response } | { auth: AuthInfo }> {
  const token = request.headers.get('X-Clawplay-Token');
  const agentName = request.headers.get('X-Clawplay-Agent');

  if (!agentName) {
    return {
      error: new Response(
        JSON.stringify({
          error: 'Missing required headers',
          hint: 'Include X-Clawplay-Agent header',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  const supabase = getSupabaseAdmin();

  // Path 1: Token-based auth (for external agent API calls)
  if (token) {
    if (!token.startsWith('clawplay_')) {
      return {
        error: new Response(JSON.stringify({ error: 'Invalid token format' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    }

    const hashedToken = hashToken(token);
    const { data: agent, error } = await supabase
      .from('user_claim_tokens')
      .select('id, name, user_id')
      .eq('token', hashedToken)
      .single();

    if (error || !agent) {
      return {
        error: new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    }

    if (agent.name !== agentName) {
      return {
        error: new Response(JSON.stringify({ error: 'Token and agent name mismatch' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    }

    if (!agent.user_id) {
      return {
        error: new Response(JSON.stringify({ error: 'Agent has no owner' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      agent.user_id
    );

    if (userError || !userData?.user?.email) {
      return {
        error: new Response(JSON.stringify({ error: 'Failed to resolve owner account' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    }

    await supabase
      .from('user_claim_tokens')
      .update({ last_seen_at: new Date().toISOString(), last_access_app: 'xtrade' })
      .eq('id', agent.id);

    return {
      auth: {
        agentName: agent.name || 'unknown',
        ownerEmail: userData.user.email,
        userId: agent.user_id,
        agentId: agent.id,
      },
    };
  }

  // Path 2: Session-based auth (for dashboard UI without plaintext token)
  const userAuth = await getUserFromRequest(request);
  if (!userAuth) {
    return {
      error: new Response(
        JSON.stringify({
          error: 'Missing required headers',
          hint: 'Include X-Clawplay-Token and X-Clawplay-Agent headers',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  const { data: agent, error } = await supabase
    .from('user_claim_tokens')
    .select('id, name, user_id')
    .eq('name', agentName)
    .eq('user_id', userAuth.user.id)
    .single();

  if (error || !agent) {
    return {
      error: new Response(JSON.stringify({ error: 'Agent not found or not owned by you' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  await supabase
    .from('user_claim_tokens')
    .update({ last_seen_at: new Date().toISOString(), last_access_app: 'xtrade' })
    .eq('id', agent.id);

  return {
    auth: {
      agentName: agent.name || 'unknown',
      ownerEmail: userAuth.user.email!,
      userId: userAuth.user.id,
      agentId: agent.id,
    },
  };
}

const normalizeTarget = (baseUrl: string, path: string) => {
  let targetBase = baseUrl.replace(/\/$/, '');
  const targetPath = path.replace(/^\/+/, '');
  if (targetBase.endsWith('/api')) {
    targetBase = targetBase.replace(/\/api$/, '');
  }

  return { targetBase, targetPath };
};

export async function OPTIONS() {
  return handleOptions();
}

async function proxyRequest(
  request: NextRequest,
  params: Promise<{ path?: string[] }>
): Promise<Response> {
  if (!XTRADE_BASE_URL) {
    return new Response(JSON.stringify({ error: 'Xtrade API base URL not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { path: pathSegments } = await params;
  const path = pathSegments?.join('/') ?? '';

  let ownerEmail: string | null = null;
  let agentName: string | null = null;

  if (!isPublicPath(path)) {
    const authResult = await authenticateXtradeRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    const rl = checkRateLimit(`xtrade_proxy:${authResult.auth.agentId}`, 120, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    ownerEmail = authResult.auth.ownerEmail;
    agentName = authResult.auth.agentName;

    if (request.method === 'POST' || request.method === 'DELETE') {
      earnPassiveCredit(authResult.auth.userId, 'xtrade', authResult.auth.agentId).catch((err) => {
        console.error('[credits] passive credit error:', err);
      });
    }
  } else {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`xtrade_public:${ip}`, 120, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);
  }

  const url = new URL(request.url);
  const { targetBase, targetPath } = normalizeTarget(XTRADE_BASE_URL, path);
  const targetUrl = targetPath
    ? `${targetBase}/${targetPath}${url.search}`
    : `${targetBase}${url.search}`;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('content-type', contentType);
  }

  if (ownerEmail) {
    headers.set('X-Clawplay-Account', ownerEmail);
  }
  if (agentName) {
    headers.set('X-Clawplay-UserId', agentName);
    headers.set('X-Clawplay-Username', agentName);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl, init);
  const body = await response.arrayBuffer();

  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxyRequest(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxyRequest(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxyRequest(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxyRequest(request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxyRequest(request, params);
}
