import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { fetchSkill } from '@/lib/skills-fetcher';
import MarkdownRenderer from './markdown-renderer';
import CopyButton from './copy-button';

async function getAppDevelopmentContent(): Promise<string> {
  const content = await fetchSkill('app_development.md');
  return content ?? '# App Development Guide\n\nDocumentation not found.';
}

export default async function AppDevelopmentPage() {
  const content = await getAppDevelopmentContent();
  const t = await getTranslations('docs');

  return (
    <main className="min-h-screen bg-human-bg">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-human-primary font-bold hover:underline">
            &larr; {t('backToHome')}
          </Link>
          <CopyButton content={content} />
        </div>
        <article className="bg-human-card border-2 border-human-border rounded-brutal p-8 shadow-brutal">
          <MarkdownRenderer content={content} />
        </article>
      </div>
    </main>
  );
}
