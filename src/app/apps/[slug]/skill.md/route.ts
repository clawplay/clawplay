import { readFile, access } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getAppUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return rawUrl.replace(/\/$/, '');
};

const renderTemplate = (template: string, slug: string) => {
  const appUrl = getAppUrl();
  const apiBase = `${appUrl}/api/v1`;
  const slugUrl = `${appUrl}/api/${slug}`;
  const xtradeBase = `${appUrl}/api/xtrade`;

  return template
    .replaceAll('{{APP_URL}}', appUrl)
    .replaceAll('{{API_BASE}}', apiBase)
    .replaceAll('{{APP}}', slug)
    .replaceAll('{{SLUG_URL}}', slugUrl)
    .replaceAll('{{XTRADE_BASE}}', xtradeBase);
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const templatesPath = process.env.NEXT_PUBLIC_TEMPLATES_PATH || process.cwd();

  // Check if template exists for this app
  const templatePath = path.join(templatesPath, 'apps', slug, 'skill.md');

  try {
    await access(templatePath);
  } catch {
    return new NextResponse('Skill file not found for this app', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const template = await readFile(templatePath, 'utf8');
  const body = renderTemplate(template, slug);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
