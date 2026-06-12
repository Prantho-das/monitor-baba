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
        base: 'rgb(var(--bg-main) / <alpha-value>)',
        card: 'rgb(var(--bg-card) / <alpha-value>)',
        hover: 'rgb(var(--bg-hover) / <alpha-value>)',
        borderg: 'rgb(var(--border-line) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        online: 'rgb(var(--color-online) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        critical: 'rgb(var(--color-critical) / <alpha-value>)',
        textp: 'rgb(var(--text-primary) / <alpha-value>)',
        texts: 'rgb(var(--text-secondary) / <alpha-value>)',
        textm: 'rgb(var(--text-muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Menlo', 'Monaco', 'Lucida Console', 'Liberation Mono', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card': '0 0 0 1px rgb(var(--border-line)), 0 2px 4px rgba(0,0,0,0.02)',
        'card-hover': '0 0 0 1px rgb(var(--border-line)), 0 4px 8px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
};

export default config;
