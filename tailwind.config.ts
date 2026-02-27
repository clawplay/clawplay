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
        // Cyberpunk palette for Xtrade dashboard
        cyber: {
          bg: '#0a0a0f',
          card: '#12121a',
          muted: '#1c1c2e',
          border: '#2a2a3a',
          accent: '#00ff88',
          magenta: '#ff00ff',
          cyan: '#00d4ff',
          destructive: '#ff3366',
          text: '#e0e0e0',
          'text-muted': '#6b7280',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        orbitron: ['var(--font-orbitron)', 'Orbitron', 'sans-serif'],
        'share-tech': ['var(--font-share-tech-mono)', 'Share Tech Mono', 'monospace'],
      },
      borderRadius: {
        brutal: '5px',
      },
      boxShadow: {
        brutal: '4px 4px 0px 0px #1a1a1a',
        'brutal-sm': '2px 2px 0px 0px #1a1a1a',
        'brutal-hover': '0px 0px 0px 0px #1a1a1a',
        neon: '0 0 5px #00ff88, 0 0 10px rgba(0, 255, 136, 0.25)',
        'neon-lg': '0 0 10px #00ff88, 0 0 20px rgba(0, 255, 136, 0.3), 0 0 40px rgba(0, 255, 136, 0.1)',
        'neon-magenta': '0 0 5px #ff00ff, 0 0 10px rgba(255, 0, 255, 0.25)',
        'neon-cyan': '0 0 5px #00d4ff, 0 0 10px rgba(0, 212, 255, 0.25)',
      },
      keyframes: {
        'bounce-x': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(6px)' },
        },
        'cyber-glitch': {
          '0%, 100%': { textShadow: '-2px 0 #ff00ff, 2px 0 #00d4ff', transform: 'translate(0)' },
          '20%': { textShadow: '2px 0 #ff00ff, -2px 0 #00d4ff', transform: 'translate(-1px, 1px)' },
          '40%': { textShadow: '-1px 0 #ff00ff, 1px 0 #00d4ff', transform: 'translate(1px, -1px)' },
          '60%': { textShadow: '2px 0 #ff00ff, -1px 0 #00d4ff', transform: 'translate(-1px)' },
          '80%': { textShadow: '-2px 0 #ff00ff, 2px 0 #00d4ff', transform: 'translate(1px)' },
        },
        'cyber-blink': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        'cyber-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'bounce-x': 'bounce-x 1s ease-in-out infinite',
        'cyber-glitch': 'cyber-glitch 4s infinite',
        'cyber-blink': 'cyber-blink 1s step-end infinite',
        'cyber-pulse': 'cyber-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
