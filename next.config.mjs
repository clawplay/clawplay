import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  outputFileTracingIncludes: {
    '/skill\\.md': ['./templates/skill.md'],
    '/skill\\.json': ['./templates/skill.json'],
    '/apps/[slug]/skill\\.md': ['./templates/apps/**/*'],
    '/api/v1/apps/[slug]/skills\\.md': ['./templates/apps/**/*'],
    '/docs/app-development': ['./templates/app_development.md'],
  },
};

export default withNextIntl(nextConfig);
