import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const provider = formData.get('provider');
  const rawRedirect = (formData.get('redirect') as string) || '/';
  const redirectPath = rawRedirect.startsWith('/') ? rawRedirect : '/';
  const { origin } = new URL(request.url);

  if (provider !== 'github' && provider !== 'x') {
    return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`);
  }

  const cookiesToSet: {
    name: string;
    value: string;
    options?: CookieOptions;
  }[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookies.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
    },
  });

  if (error || !data.url) {
    console.error('OAuth error:', error?.message);
    return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`);
  }

  const response = NextResponse.redirect(data.url, 303);
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}
