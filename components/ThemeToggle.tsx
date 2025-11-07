'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-16 h-8 rounded-full p-1 transition-all duration-500 ease-in-out transform hover:scale-110
                 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500
                 shadow-lg
                 group overflow-hidden"
      aria-label="Toggle theme"
    >
      {/* Toggle circle */}
      <div
        className={`relative w-6 h-6 rounded-full transition-all duration-500 ease-in-out transform
                    ${theme === 'dark' ? 'translate-x-0' : 'translate-x-8'}
                    bg-white dark:bg-gray-900
                    shadow-lg flex items-center justify-center
                    group-hover:rotate-180`}
      >
        {/* Icon */}
        <div className="text-xs">
          {theme === 'dark' ? '🌙' : '☀️'}
        </div>
      </div>
    </button>
  );
}
