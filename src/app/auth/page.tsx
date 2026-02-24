import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

async function AuthContent({
  redirectPath,
  callbackError,
}: {
  redirectPath: string;
  callbackError?: string | null;
}) {
  const t = await getTranslations('auth');
  const tc = await getTranslations('common');

  const error = callbackError === 'auth_callback_error' ? t('authFailed') : null;
  const showXAuth = process.env.ENABLE_X_AUTH === 'true';

  return (
    <div className="max-w-md w-full bg-card rounded-lg p-8">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold text-white mb-2">{t('signInTitle')}</h1>
        <p className="text-gray-400">
          {showXAuth ? t('useXOrGitHub') : t('useGitHub')} {t('toClaim')}
        </p>
      </div>

      <div className="space-y-4">
        {showXAuth && (
          <form action="/auth/sign-in" method="post">
            <input type="hidden" name="provider" value="x" />
            <input type="hidden" name="redirect" value={redirectPath} />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-900 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg border border-gray-700 transition-colors"
            >
              <XLogo className="w-5 h-5" />
              {t('continueWithX')}
            </button>
          </form>
        )}

        <form action="/auth/sign-in" method="post">
          <input type="hidden" name="provider" value="github" />
          <input type="hidden" name="redirect" value={redirectPath} />
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-[#24292e] hover:bg-[#2f363d] disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg border border-gray-700 transition-colors"
          >
            <GitHubLogo className="w-5 h-5" />
            {t('continueWithGitHub')}
          </button>
        </form>
      </div>

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          <p>{error}</p>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-gray-500">{t('terms')}</p>
    </div>
  );
}

async function AuthLoading() {
  const t = await getTranslations('auth');
  const tc = await getTranslations('common');

  return (
    <div className="max-w-md w-full bg-card rounded-lg p-8">
      <div className="text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold text-white mb-2">{t('signInTitle')}</h1>
        <p className="text-gray-400">{tc('loading')}</p>
      </div>
    </div>
  );
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;
  const rawRedirect = params?.redirect ?? '/';
  const redirectPath = rawRedirect.startsWith('/') ? rawRedirect : '/';
  const callbackError = params?.error;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense fallback={<AuthLoading />}>
        <AuthContent redirectPath={redirectPath} callbackError={callbackError} />
      </Suspense>
    </main>
  );
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
