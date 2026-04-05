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
        // New Professional Trading Theme
        app: '#080808',
        panel: '#121212',
        elevated: '#1A1A1A',
        
        // Brand
        brand: {
          DEFAULT: '#00BCD4',
          hover: '#26C6DA',
          glow: 'rgba(0, 188, 212, 0.3)'
        },
        
        // Trading Colors
        buy: {
          DEFAULT: '#00BFA5',
          hover: '#4CAF50',
          glow: 'rgba(0, 191, 165, 0.2)'
        },
        sell: {
          DEFAULT: '#E53935',
          hover: '#F44336',
          glow: 'rgba(229, 57, 53, 0.2)'
        },
        
        // Legacy colors (keep for compatibility)
        space: {
          DEFAULT: '#080808',
          light: '#121212',
          dark: '#050505'
        },
        electric: {
          DEFAULT: '#00BCD4',
          dark: '#0097A7',
          light: '#26C6DA'
        },
        neon: {
          DEFAULT: '#00BFA5',
          dark: '#00897B',
          light: '#4CAF50'
        },
        vibrant: {
          DEFAULT: '#E53935',
          dark: '#C62828',
          light: '#F44336'
        },
        amber: {
          DEFAULT: '#f59e0b',
          dark: '#d97706',
          light: '#fbbf24'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        body: ['IBM Plex Sans', 'Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace']
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out infinite 2s',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'spin-slow': 'spin 60s linear infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-in-up': 'slideInUp 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 20px rgba(0, 188, 212, 0.4)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 40px rgba(0, 188, 212, 0.6)' }
        },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        slideInUp: {
          '0%': { opacity: 0, transform: 'translateY(30px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' }
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 188, 212, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 188, 212, 0.4)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
