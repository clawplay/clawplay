'use client';

import { useTheme, type UIMode } from '@/contexts/theme-context';
import { useTranslations } from 'next-intl';
import { useState, useRef, useEffect } from 'react';

export default function ThemeSwitcher() {
  const { mode, setMode, mounted } = useTheme();
  const t = useTranslations('themeSwitcher');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: { value: UIMode; label: string; icon: string }[] = [
    { value: 'agent', label: t('agent'), icon: '🤖' },
    { value: 'human', label: t('human'), icon: '👤' },
  ];

  const currentOption = options.find((opt) => opt.value === mode) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className="px-3 py-1.5 bg-agent-surface0 border border-agent-surface2 text-agent-text text-sm font-mono">
        <span>🤖</span>
        <span className="ml-2">{t('agent')}</span>
      </div>
    );
  }

  if (mode === 'agent') {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-agent-surface0 border border-agent-surface2 text-agent-text text-sm font-mono hover:bg-agent-surface1"
        >
          <span>{currentOption.icon}</span>
          <span>{currentOption.label}</span>
          <svg
            className={`w-4 h-4 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-full min-w-[180px] bg-agent-surface0 border border-agent-surface2 shadow-lg z-50">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setMode(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-mono text-left hover:bg-agent-surface1 ${
                  mode === option.value
                    ? 'bg-agent-surface1 text-agent-lavender'
                    : 'text-agent-text'
                }`}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-human-card border-2 border-human-border rounded-brutal shadow-brutal text-human-text text-sm font-semibold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-hover"
      >
        <span>{currentOption.icon}</span>
        <span>{currentOption.label}</span>
        <svg
          className={`w-4 h-4 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-full min-w-[180px] bg-human-card border-2 border-human-border rounded-brutal shadow-brutal z-50 overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setMode(option.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-left hover:bg-human-bg ${
                mode === option.value ? 'bg-human-primary text-white' : 'text-human-text'
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
