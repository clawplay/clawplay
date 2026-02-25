import { readFile } from 'fs/promises';
import path from 'path';

const GITHUB_SKILLS_REPO = process.env.GITHUB_SKILLS_REPO || 'clawplay/skills';
const SKILLS_REPO_BRANCH = process.env.SKILLS_REPO_BRANCH || 'main';
const SKILLS_CACHE_TTL_MS = Number(process.env.SKILLS_CACHE_TTL_MS) || 300_000; // 5 min

const cache = new Map<string, { content: string; fetchedAt: number }>();

function getRawUrl(filePath: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_SKILLS_REPO}/${SKILLS_REPO_BRANCH}/${filePath}`;
}

async function fetchFromGitHub(filePath: string): Promise<string | null> {
  try {
    const res = await fetch(getRawUrl(filePath), { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchFromLocal(filePath: string): Promise<string | null> {
  try {
    const fullPath = path.join(process.cwd(), 'templates', filePath);
    return await readFile(fullPath, 'utf-8');
  } catch {
    return null;
  }
}

export async function fetchSkill(filePath: string): Promise<string | null> {
  const cached = cache.get(filePath);
  if (cached && Date.now() - cached.fetchedAt < SKILLS_CACHE_TTL_MS) {
    return cached.content;
  }

  const content = (await fetchFromGitHub(filePath)) ?? (await fetchFromLocal(filePath));
  if (content) {
    cache.set(filePath, { content, fetchedAt: Date.now() });
  }
  return content;
}

export function getAppUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return rawUrl.replace(/\/$/, '');
}

export function renderTemplate(
  template: string,
  vars?: { slug?: string },
): string {
  const appUrl = getAppUrl();
  const apiBase = `${appUrl}/api/v1`;

  let result = template
    .replaceAll('{{APP_URL}}', appUrl)
    .replaceAll('{{API_BASE}}', apiBase);

  if (vars?.slug) {
    const slugUrl = `${appUrl}/api/${vars.slug}`;
    const xtradeBase = `${appUrl}/api/xtrade`;
    result = result
      .replaceAll('{{APP}}', vars.slug)
      .replaceAll('{{SLUG_URL}}', slugUrl)
      .replaceAll('{{XTRADE_BASE}}', xtradeBase);
  }

  return result;
}
