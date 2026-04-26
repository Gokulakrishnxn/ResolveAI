import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#0b0b14',
        accent: '#5046E5',
        accentHover: '#3F36CC',
      },
    },
  },
};

export default config;
