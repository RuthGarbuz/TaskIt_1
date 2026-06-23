import { Monitor, Moon, Sun } from 'lucide-react';
import { useAppearance, type AppearanceMode } from '../context/AppearanceContext';

const OPTIONS: { mode: AppearanceMode; icon: typeof Sun; title: string }[] = [
  { mode: 'system', icon: Monitor, title: 'מערכת' },
  { mode: 'light', icon: Sun, title: 'בהיר' },
  { mode: 'dark', icon: Moon, title: 'כהה' },
];

export default function AppearanceToggle() {
  const { mode, setMode } = useAppearance();

  return (
    <div
      className="flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 border border-gray-200/80 dark:border-gray-700"
      role="group"
      aria-label="מראה האפליקציה"
    >
      {OPTIONS.map(({ mode: optionMode, icon: Icon, title }) => {
        const selected = mode === optionMode;
        return (
          <button
            key={optionMode}
            type="button"
            onClick={() => setMode(optionMode)}
            title={title}
            aria-pressed={selected}
            className={`p-1.5 rounded-md transition-all ${
              selected
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={16} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
