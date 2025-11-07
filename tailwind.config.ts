import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Vibrant casino colors
        neon: {
          pink: '#FF10F0',
          purple: '#B026FF',
          blue: '#00D9FF',
          green: '#39FF14',
          orange: '#FF6B00',
          yellow: '#FFEA00',
          red: '#FF0040',
        },
        casino: {
          gold: '#FFD700',
          ruby: '#E0115F',
          emerald: '#50C878',
          sapphire: '#0F52BA',
          diamond: '#E8F5FF',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-casino': 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        'gradient-gold': 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        'gradient-neon': 'linear-gradient(135deg, #FF10F0 0%, #B026FF 50%, #00D9FF 100%)',
        'mesh-light': 'radial-gradient(at 40% 20%, rgba(255, 16, 240, 0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(176, 38, 255, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(0, 217, 255, 0.1) 0px, transparent 50%)',
        'mesh-dark': 'radial-gradient(at 40% 20%, rgba(255, 16, 240, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(176, 38, 255, 0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(0, 217, 255, 0.15) 0px, transparent 50%)',
      },
      boxShadow: {
        'neon-pink': '0 0 20px rgba(255, 16, 240, 0.6), 0 0 40px rgba(255, 16, 240, 0.4)',
        'neon-purple': '0 0 20px rgba(176, 38, 255, 0.6), 0 0 40px rgba(176, 38, 255, 0.4)',
        'neon-blue': '0 0 20px rgba(0, 217, 255, 0.6), 0 0 40px rgba(0, 217, 255, 0.4)',
        'neon-green': '0 0 20px rgba(57, 255, 20, 0.6), 0 0 40px rgba(57, 255, 20, 0.4)',
        'glow-sm': '0 0 10px rgba(255, 255, 255, 0.3)',
        'glow-md': '0 0 20px rgba(255, 255, 255, 0.4)',
        'glow-lg': '0 0 30px rgba(255, 255, 255, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient': 'gradient 3s ease infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
