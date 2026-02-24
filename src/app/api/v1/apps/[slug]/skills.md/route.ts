import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { handleOptions } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const getAppUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return rawUrl.replace(/\/$/, '');
};

const renderTemplate = (template: string, slug: string) => {
  const appUrl = getAppUrl();
  const apiBase = `${appUrl}/api/v1`;
  const xtradeBase = `${appUrl}/api/xtrade`;

  return template
    .replaceAll('{{APP_URL}}', appUrl)
    .replaceAll('{{API_BASE}}', apiBase)
    .replaceAll('{{APP}}', slug)
    .replaceAll('{{XTRADE_BASE}}', xtradeBase);
};

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const templatePath = path.join(process.cwd(), 'templates', 'apps', slug, 'skill.md');

  try {
    const template = await readFile(templatePath, 'utf8');
    const body = renderTemplate(template, slug);

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return new NextResponse('Skill file not found', { status: 404 });
    }
    console.error('App skill render error:', err);
    return new NextResponse('Failed to load skill file', { status: 500 });
  }
}
