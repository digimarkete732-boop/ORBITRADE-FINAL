/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          DEFAULT: '#0a0e17',
          light: '#111827',
          dark: '#050810'
        },
        electric: {
          DEFAULT: '#3a86ff',
          dark: '#2563eb',
          light: '#60a5fa'
        },
        neon: {
          DEFAULT: '#2af5ff',
          dark: '#06b6d4',
          light: '#67e8f9'
        },
        vibrant: {
          DEFAULT: '#9d4edd',
          dark: '#7c3aed',
          light: '#c084fc'
        },
        amber: {
          DEFAULT: '#f59e0b',
          dark: '#d97706',
          light: '#fbbf24'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out infinite 2s',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'spin-slow': 'spin 60s linear infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 20px rgba(42, 245, 255, 0.4)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 40px rgba(42, 245, 255, 0.6)' }
        },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
