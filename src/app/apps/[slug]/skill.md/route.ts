import { NextRequest, NextResponse } from 'next/server';
import { fetchSkill, renderTemplate } from '@/lib/skills-fetcher';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = await fetchSkill(`apps/${slug}/skill.md`);

  if (!template) {
    return new NextResponse('Skill file not found for this app', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const body = renderTemplate(template, { slug });

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
