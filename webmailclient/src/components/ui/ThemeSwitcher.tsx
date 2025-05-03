// src/components/ThemeSwitcher.tsx

import { useThemeStore } from "../../store/themeStore";
import { Sun, Moon, Monitor } from 'lucide-react'; // using lucide icons

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useThemeStore();

  const renderIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4 mr-2" />;
    if (theme === 'dark') return <Moon className="h-4 w-4 mr-2" />;
    return <Monitor className="h-4 w-4 mr-2" />;
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex items-center justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
          id="theme-menu"
          aria-haspopup="true"
        >
          {renderIcon()}
          {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
          <svg
            className="-mr-1 ml-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
        <div className="py-1">
          <button
            onClick={() => setTheme('light')}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Sun className="h-4 w-4 mr-2" />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Moon className="h-4 w-4 mr-2" />
            Dark
          </button>
          <button
            onClick={() => setTheme('system')}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Monitor className="h-4 w-4 mr-2" />
            System
          </button>
        </div>
      </div>
    </div>
  );
};
