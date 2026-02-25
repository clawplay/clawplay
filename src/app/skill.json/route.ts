import { NextResponse } from 'next/server';
import { fetchSkill, renderTemplate } from '@/lib/skills-fetcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  const template = await fetchSkill('skill.json');
  if (!template) {
    return new NextResponse('Skill file not found', { status: 404 });
  }

  const body = renderTemplate(template);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
