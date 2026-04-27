import type { Config } from 'tailwindcss';

/**
 * ResolveAI marketing-site theme.
 *
 * Brand identity:
 *   - Canvas: deep near-black with a faint cool tint
 *   - Accent: sky-blue gradient (sky-400 → sky-500 → blue-500)
 *   - Type: Apple system stack, very tight tracking on display text
 *
 * The legacy `accent` / `accentHover` / `ink` tokens are kept so older
 * marketing pages (blog, customers, MDX) don't 404 visually.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      fontSize: {
        // Fluid display sizes for hero / section heads
        'display-2xl': ['clamp(2.75rem, 6vw + 1rem, 5.5rem)', { lineHeight: '1', letterSpacing: '-0.04em' }],
        'display-xl': ['clamp(2.25rem, 4vw + 1rem, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.035em' }],
        'display-lg': ['clamp(1.75rem, 3vw + 1rem, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.025em',
      },
      colors: {
        // Brand neutrals — cool dark scale tuned for the sky accent.
        canvas: {
          DEFAULT: '#05060a',
          raised: '#0a0c12',
          elevated: '#0f1117',
          hover: '#13161e',
        },
        ink: '#0b0b14', // legacy
        line: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.14)',
          subtle: 'rgba(255,255,255,0.05)',
        },
        text: {
          primary: '#f5f7fa',
          secondary: '#a8b0c0',
          tertiary: '#6b7280',
        },
        // Sky-blue accent ramp (mirrors Tailwind sky/blue but locked to brand).
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        accent: '#38bdf8', // legacy / aliased to sky-400
        accentHover: '#0ea5e9',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backgroundImage: {
        'gradient-sky': 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #3b82f6 100%)',
        'gradient-sky-soft': 'linear-gradient(135deg, rgba(56,189,248,0.18) 0%, rgba(59,130,246,0.10) 100%)',
        'gradient-radial-glow':
          'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.04) 40%, transparent 70%)',
        'gradient-card':
          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        'noise':
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      },
      boxShadow: {
        glow: '0 0 60px -10px rgba(56,189,248,0.45)',
        'glow-soft': '0 0 80px -20px rgba(56,189,248,0.30)',
        card: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 30px 60px -30px rgba(0,0,0,0.6)',
        'card-hover': '0 1px 0 0 rgba(255,255,255,0.08) inset, 0 40px 80px -30px rgba(56,189,248,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer-x': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.21, 0.61, 0.35, 1) both',
        'fade-in': 'fade-in 0.6s ease-out both',
        shimmer: 'shimmer-x 2.4s linear infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
    },
  },
};

export default config;
