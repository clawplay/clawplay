import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  const tc = await getTranslations('common');

  return (
    <main className="min-h-screen bg-[color:var(--background)] text-[color:rgb(var(--foreground-rgb))] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <p className="text-xs md:text-sm uppercase tracking-[0.4em] font-semibold text-[color:rgb(var(--foreground-rgb)/0.6)]">
          {t('error')}
        </p>
        <h1 className="mt-4 text-6xl md:text-7xl font-black leading-none">404</h1>
        <p className="mt-4 text-xl md:text-2xl font-semibold">{t('pageNotFound')}</p>
        <p className="mt-3 text-base md:text-lg text-[color:rgb(var(--foreground-rgb)/0.7)]">
          {t('pageNotFoundDescription')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="px-5 py-3 text-sm md:text-base font-semibold border border-[color:rgb(var(--foreground-rgb)/0.35)] hover:border-[color:rgb(var(--foreground-rgb)/0.7)] transition-colors"
          >
            {tc('backToHome')}
          </Link>
          <Link
            href="/docs"
            className="px-5 py-3 text-sm md:text-base font-semibold border border-[color:rgb(var(--foreground-rgb)/0.35)] hover:border-[color:rgb(var(--foreground-rgb)/0.7)] transition-colors"
          >
            {t('readDocs')}
          </Link>
        </div>
      </div>
    </main>
  );
}
