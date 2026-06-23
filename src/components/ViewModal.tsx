import { X } from 'lucide-react';
import { MODAL_CLOSE_BTN, MODAL_HEADER, MODAL_OVERLAY, MODAL_SHELL, MODAL_TITLE } from '../pages/tasks/taskViewTheme';

interface ViewModalProps {
  activeView: 'all' | 'status' | 'urgency' | 'project' | 'date';
  onViewChange: (view: 'all' | 'status' | 'urgency' | 'project' | 'date') => void;
  onClose: () => void;
  hideUrgencyOption?: boolean;
}

export default function ViewModal({ activeView, onViewChange, onClose, hideUrgencyOption = false }: ViewModalProps) {
  const allViews: Array<{ value: ViewModalProps['activeView']; label: string }> = [
    { value: 'all', label: 'הצג הכל' },
    { value: 'status', label: 'קבץ לפי סטטוס' },
    { value: 'urgency', label: 'קבץ לפי עדיפות' },
    { value: 'project', label: 'קבץ לפי פרויקט' },
    { value: 'date', label: 'קבץ לפי תאריך' },
  ];

  const views = allViews.filter((view) => !(hideUrgencyOption && view.value === 'urgency'));

  return (
    <div className={MODAL_OVERLAY}>
      <div className={`${MODAL_SHELL} w-full max-w-md`}>
        <div className={MODAL_HEADER}>
          <h2 className={MODAL_TITLE}>בחר תצוגה</h2>
          <button onClick={onClose} className={MODAL_CLOSE_BTN}>
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="p-6 space-y-2">
          {views.map((view) => (
            <button
              key={view.value}
              onClick={() => onViewChange(view.value)}
              className={`w-full text-right px-4 py-3 rounded-lg font-medium transition-colors ${
                activeView === view.value 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-700' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent text-gray-800'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}