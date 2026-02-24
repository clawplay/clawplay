'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, useRef, useEffect } from 'react';
import { locales, localeNames, type Locale } from '@/i18n/locale';

function setLocaleCookie(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
}

export default function LocaleSwitcher({ variant = 'human' }: { variant?: 'agent' | 'human' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('localeSwitcher');
  const currentLocale = useLocale();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(locale: Locale) {
    setLocaleCookie(locale);
    setIsOpen(false);
    window.location.reload();
  }

  const isAgent = variant === 'agent';

  if (isAgent) {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 bg-agent-surface0 border border-agent-surface2 text-agent-overlay1 text-xs font-mono hover:bg-agent-surface1 hover:text-agent-text"
          title={t('language')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <span className="uppercase">{currentLocale}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 min-w-[120px] bg-agent-surface0 border border-agent-surface2 shadow-lg z-50">
            {locales.map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => handleSelect(locale)}
                className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-agent-surface1 ${
                  currentLocale === locale
                    ? 'text-agent-lavender bg-agent-surface1'
                    : 'text-agent-text'
                }`}
              >
                {localeNames[locale]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-human-card border-2 border-human-border rounded-brutal shadow-brutal-sm text-human-muted text-xs font-semibold hover:text-human-text"
        title={t('language')}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
        <span className="uppercase">{currentLocale}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 min-w-[120px] bg-human-card border-2 border-human-border rounded-brutal shadow-brutal z-50 overflow-hidden">
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => handleSelect(locale)}
              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-human-bg ${
                currentLocale === locale ? 'text-human-primary bg-human-bg' : 'text-human-text'
              }`}
            >
              {localeNames[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
