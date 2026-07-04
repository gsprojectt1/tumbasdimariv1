/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        foreground: '#111111',
        primary: {
          DEFAULT: '#F26B3A',
          foreground: '#FFFFFF',
          50: '#FFF0E8',
          100: '#FFE0CC',
          200: '#FFC2A0',
          300: '#FFA373',
          400: '#FF8547',
          500: '#F26B3A',
          600: '#D4541F',
          700: '#A33F15',
          800: '#722A0F',
          900: '#421808',
        },
        border: '#EBEBEB',
        muted: '#F5F5F5',
        accent: { soft: '#FFF0E8' },
        success: '#16A34A',
        warning: '#EAB308',
        error: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.02em',
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,17,17,0.04)',
        lift: '0 6px 20px rgba(17,17,17,0.08)',
        nav: '0 4px 24px rgba(17,17,17,0.10)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'fade-up': 'fade-up 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
