/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',   // Neon Purple
        secondary: '#A78BFA', // Soft Purple
        cta: '#F43F5E',       // Neon Rose
        background: '#0F0F23',// Deep Navy
        text: '#E2E8F0',      // Ice White
        solana: {
          purple: '#8b5cf6',
          blue: '#3b82f6',
          cyan: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['"Exo 2"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Orbitron"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        russo: ['"Russo One"', 'sans-serif'], // Kept for legacy compatibility if needed
        chakra: ['"Chakra Petch"', 'sans-serif'], // Kept for compatibility
      },
      boxShadow: {
        'neon-primary': '0 0 10px #7C3AED',
        'neon-cta': '0 0 10px #F43F5E',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'bounce-slow': 'bounce 2s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)' }, // Updated to match primary
          '50%': { boxShadow: '0 0 40px rgba(124, 58, 237, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
