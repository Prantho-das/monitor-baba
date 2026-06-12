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
        // Light mode variables
        base: 'var(--bg-main)',
        sidebar: 'var(--bg-sidebar)',
        card: 'var(--bg-card)',
        hover: 'var(--bg-card-hover)',
        muted: 'var(--bg-muted)',
        borderg: 'var(--border-glass)',
        accent: 'var(--accent-cyan)',
        online: 'var(--color-online)',
        warning: 'var(--color-warning)',
        critical: 'var(--color-critical)',
        textp: 'var(--text-primary)',
        texts: 'var(--text-secondary)',
        textm: 'var(--text-muted)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
        'neon': '0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)',
      }
    },
  },
  plugins: [],
};

export default config;
