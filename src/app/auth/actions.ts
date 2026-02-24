'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function buildOrigin() {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
  const protocol = headersList.get('x-forwarded-proto') ?? 'http';

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';
}

async function signInWithProvider(provider: 'github' | 'x', formData: FormData) {
  const redirectPath = (formData.get('redirect') as string) || '/';
  const supabase = await createClient();
  const origin = await buildOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
    },
  });

  if (error) {
    console.error('OAuth error:', error);
    return redirect(`/auth?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    return redirect(data.url);
  }
}

export async function signInWithGitHub(formData: FormData) {
  return signInWithProvider('github', formData);
}

export async function signInWithTwitter(formData: FormData) {
  return signInWithProvider('x', formData);
}
