import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './locale';

function parseAcceptLanguage(header: string): Locale | null {
  const parts = header.split(',').map((part) => {
    const [lang, qStr] = part.trim().split(';q=');
    return { lang: lang.trim().toLowerCase(), q: qStr ? parseFloat(qStr) : 1 };
  });
  parts.sort((a, b) => b.q - a.q);

  for (const { lang } of parts) {
    const prefix = lang.split('-')[0];
    if (locales.includes(prefix as Locale)) {
      return prefix as Locale;
    }
  }
  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  let locale: Locale = defaultLocale;

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else {
    const acceptLang = headerStore.get('accept-language');
    if (acceptLang) {
      const detected = parseAcceptLanguage(acceptLang);
      if (detected) locale = detected;
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
