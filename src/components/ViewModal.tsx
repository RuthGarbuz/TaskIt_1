import { X } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">בחר תצוגה</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        <div className="p-6 space-y-2">
          {views.map((view) => (
            <button
              key={view.value}
              onClick={() => onViewChange(view.value)}
              className={`w-full text-right px-4 py-3 rounded-lg font-medium transition-colors ${
                activeView === view.value 
                  ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' 
                  : 'hover:bg-gray-50 border-2 border-transparent'
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