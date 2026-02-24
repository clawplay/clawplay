import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        background: '#0f0f1a',
        card: '#1a1a2e',
        'card-hover': '#252542',
        // Catppuccin Mocha palette for Agent UI
        agent: {
          base: '#1e1e2e',
          surface0: '#313244',
          surface1: '#45475a',
          surface2: '#585b70',
          overlay0: '#6c7086',
          overlay1: '#7f849c',
          text: '#cdd6f4',
          subtext0: '#a6adc8',
          subtext1: '#bac2de',
          lavender: '#b4befe',
          blue: '#89b4fa',
          sapphire: '#74c7ec',
          sky: '#89dceb',
          teal: '#94e2d5',
          green: '#a6e3a1',
          yellow: '#f9e2af',
          peach: '#fab387',
          maroon: '#eba0ac',
          red: '#f38ba8',
          mauve: '#cba6f7',
          pink: '#f5c2e7',
          flamingo: '#f2cdcd',
          rosewater: '#f5e0dc',
        },
        // Neo Brutalism palette for Human UI
        human: {
          bg: '#f5f3ff',
          card: '#ffffff',
          border: '#1a1a1a',
          primary: '#7c3aed',
          secondary: '#a78bfa',
          accent: '#fbbf24',
          text: '#1a1a1a',
          muted: '#6b7280',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        brutal: '5px',
      },
      boxShadow: {
        brutal: '4px 4px 0px 0px #1a1a1a',
        'brutal-sm': '2px 2px 0px 0px #1a1a1a',
        'brutal-hover': '0px 0px 0px 0px #1a1a1a',
      },
      keyframes: {
        'bounce-x': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        'bounce-x': 'bounce-x 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
