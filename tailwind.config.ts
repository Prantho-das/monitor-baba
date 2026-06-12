import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-main)',
        card: 'var(--bg-card)',
        hover: 'var(--bg-hover)',
        borderg: 'var(--border-line)',
        accent: 'var(--accent)',
        online: 'var(--color-online)',
        warning: 'var(--color-warning)',
        critical: 'var(--color-critical)',
        textp: 'var(--text-primary)',
        texts: 'var(--text-secondary)',
        textm: 'var(--text-muted)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Menlo', 'Monaco', 'Lucida Console', 'Liberation Mono', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card': '0 0 0 1px var(--border-line), 0 2px 4px rgba(0,0,0,0.02)',
        'card-hover': '0 0 0 1px var(--border-line), 0 4px 8px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
};

export default config;
