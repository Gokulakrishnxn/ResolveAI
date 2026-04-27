/**
 * ResolveAI marketing-site design tokens.
 *
 * This file is a single source of truth for colors, gradients, shadows
 * and radii used across the landing page. It mirrors the values declared
 * in `tailwind.config.ts` so component code can reference them directly
 * (e.g. for canvas backgrounds, inline SVG fills, or prop-driven CTAs).
 *
 * Visual identity:
 *   - Canvas — deep near-black (#05060a) with cool tint
 *   - Accent — sky-blue gradient (sky-400 → sky-500 → blue-500)
 *   - Surface — translucent white over the canvas (≤6% alpha)
 */

export const colors = {
  canvas: '#05060a',
  canvasRaised: '#0a0c12',
  canvasElevated: '#0f1117',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.14)',
  textPrimary: '#f5f7fa',
  textSecondary: '#a8b0c0',
  textTertiary: '#6b7280',
  sky: {
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
  },
  blue500: '#3b82f6',
} as const;

export const gradients = {
  sky: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #3b82f6 100%)',
  skySoft: 'linear-gradient(135deg, rgba(56,189,248,0.18) 0%, rgba(59,130,246,0.10) 100%)',
  radialGlow:
    'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.04) 40%, transparent 70%)',
  card: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
} as const;

export const shadows = {
  glow: '0 0 60px -10px rgba(56,189,248,0.45)',
  glowSoft: '0 0 80px -20px rgba(56,189,248,0.30)',
  card: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 30px 60px -30px rgba(0,0,0,0.6)',
} as const;

export const radii = {
  card: '1rem',
  cardLg: '1.25rem',
  pill: '9999px',
} as const;

/** Public app routes used by marketing CTAs. */
export const ROUTES = {
  signUp: 'https://app.resolveai.app/sign-up',
  signIn: 'https://app.resolveai.app/sign-in',
  bookDemo: 'mailto:hello@resolveai.app?subject=Demo%20request',
  contact: 'mailto:hello@resolveai.app',
} as const;
