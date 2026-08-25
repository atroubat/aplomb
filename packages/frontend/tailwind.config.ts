import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          dark: '#818cf8',
        },
        secondary: '#8b5cf6',
        // Neon accent ramp — gradients, glows and key data points.
        accent: {
          50: '#eef0ff',
          100: '#e0e3ff',
          200: '#c6ccff',
          300: '#a3aaff',
          400: '#7c82ff',
          500: '#6366f1',
          600: '#5b4ee5',
          700: '#4c3fd0',
          DEFAULT: '#6366f1',
        },
        neon: {
          violet: '#8b5cf6',
          fuchsia: '#d946ef',
          cyan: '#22d3ee',
          emerald: '#34d399',
          amber: '#fbbf24',
          rose: '#fb7185',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.15rem',
        '3xl': '1.6rem',
      },
      boxShadow: {
        glass: '0 8px 32px -8px rgba(15, 23, 42, 0.18)',
        'glass-dark': '0 12px 40px -12px rgba(0, 0, 0, 0.55)',
        glow: '0 0 24px -4px rgba(99, 102, 241, 0.55)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'aurora-drift': {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%, -3%, 0) scale(1.08)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        aurora: 'aurora-drift 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
