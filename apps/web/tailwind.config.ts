import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cdy: {
          navy: '#0A1628',
          'navy-light': '#112240',
          'navy-border': '#1E3A5F',
          red: '#C41E3A',
          'red-hover': '#A01830',
          'red-light': '#2D0A10',
          white: '#F8FAFC',
          muted: '#94A3B8',
          dim: '#475569',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
