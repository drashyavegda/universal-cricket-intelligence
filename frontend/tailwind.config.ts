import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#070B14', 900: '#0A1020', 850: '#0D1526', 800: '#111A2E', 700: '#16223C', 600: '#1E2C4A' },
        line: '#1C2942',
        turf: { 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399', 500: '#10B981', 600: '#059669', 700: '#047857' },
        gold: { 200: '#FAEEBF', 300: '#F5D98B', 400: '#E8C15C', 500: '#D4A72C', 600: '#B08A1D' },
        ember: { 300: '#FDBA74', 400: '#FB923C', 500: '#F97316', 600: '#EA580C' },
        danger: { 300: '#FCA5A5', 400: '#F87171', 500: '#EF4444', 600: '#DC2626' },
        slateink: { 200: '#C7D2E4', 300: '#A8B6D0', 400: '#8695B4', 500: '#6B7A99', 600: '#54617E', 700: '#3F4B66' },
      },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Inter', 'sans-serif'], mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'] },
      boxShadow: { card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -16px rgba(0,0,0,0.9)' },
      backgroundImage: {
        'radial-turf': 'radial-gradient(1200px 600px at 15% -10%, rgba(16,185,129,0.14), transparent 60%)',
        'radial-gold': 'radial-gradient(900px 500px at 90% -20%, rgba(212,167,44,0.12), transparent 60%)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { 'fade-up': 'fade-up .35s ease-out both', shimmer: 'shimmer 1.6s infinite' },
    },
  },
  plugins: [],
};
export default config;
