import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const templatePath = path.join(process.cwd(), 'templates', 'skill.md');

const getAppUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return rawUrl.replace(/\/$/, '');
};

const renderTemplate = (template: string) => {
  const appUrl = getAppUrl();
  const apiBase = `${appUrl}/api/v1`;
  return template.replaceAll('{{APP_URL}}', appUrl).replaceAll('{{API_BASE}}', apiBase);
};

export async function GET() {
  const template = await readFile(templatePath, 'utf8');
  const body = renderTemplate(template);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
