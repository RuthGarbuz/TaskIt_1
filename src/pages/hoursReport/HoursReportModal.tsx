import { useState } from 'react';
import { Clock, Calendar, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { Task } from '../../types';
import type { TaskReview } from '../../Data/projectsData';

interface HoursReportModalProps {
  task: Task | TaskReview;
  onClose: () => void;
  onSave: (report: HoursReport) => void;
}

export interface HoursReport {
  taskId: number;
  reportDate: string;
  fromTime: string;
  toTime: string;
  totalHours: number;
  inputMode: 'range' | 'total';
  notes?: string;
}

export default function HoursReportModal({ task, onClose, onSave }: HoursReportModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [reportDate, setReportDate] = useState(today);
  const [fromTime, setFromTime] = useState('09:00');
  const [toTime, setToTime] = useState('17:00');
  const [totalHours, setTotalHours] = useState<string>('');
  const [inputMode, setInputMode] = useState<'range' | 'total'>('range');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const calcHoursFromRange = (): number => {
    if (!fromTime || !toTime) return 0;
    const [fh, fm] = fromTime.split(':').map(Number);
    const [th, tm] = toTime.split(':').map(Number);
    const diff = (th * 60 + tm) - (fh * 60 + fm);
    return Math.max(0, diff / 60);
  };

  const displayedHours = inputMode === 'range'
    ? calcHoursFromRange()
    : parseFloat(totalHours) || 0;

  const handleSave = () => {
    setError('');

    if (!reportDate) {
      setError('נא להזין תאריך דיווח');
      return;
    }
    if (inputMode === 'range') {
      if (!fromTime || !toTime) {
        setError('נא להזין שעת התחלה וסיום');
        return;
      }
      if (calcHoursFromRange() <= 0) {
        setError('שעת הסיום חייבת להיות אחרי שעת ההתחלה');
        return;
      }
    } else {
      if (!totalHours || parseFloat(totalHours) <= 0) {
        setError('נא להזין מספר שעות תקין');
        return;
      }
    }

    const report: HoursReport = {
      taskId: task.id,
      reportDate,
      fromTime: inputMode === 'range' ? fromTime : '',
      toTime: inputMode === 'range' ? toTime : '',
      totalHours: displayedHours,
      inputMode,
      notes: notes.trim() || undefined,
    };

    setSaved(true);
    setTimeout(() => {
      onSave(report);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">דיווח שעות</h3>
              <p className="text-emerald-100 text-xs">לשלב / משימה</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1.5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Project Info - read only */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">פרויקט</span>
              <span className="font-semibold text-gray-800">{'project' in task ? task.project : task.projectName}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">שלב / משימה</span>
              <span className="font-semibold text-gray-800 truncate block">{'stage' in task ? (task.stage || task.subject) : (task.name || task.subject)}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 flex-1">

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <Calendar size={14} className="inline ml-1 text-emerald-600" />
              תאריך הדיווח
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
            />
          </div>

          {/* Mode Toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">שיטת דיווח</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setInputMode('range')}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                  inputMode === 'range'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                }`}
              >
                מ-שעה עד שעה
              </button>
              <button
                onClick={() => setInputMode('total')}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                  inputMode === 'total'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                }`}
              >
                סה"כ שעות
              </button>
            </div>
          </div>

          {/* Range inputs */}
          {inputMode === 'range' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">משעה</label>
                <input
                  type="time"
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">עד שעה</label>
                <input
                  type="time"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                />
              </div>
            </div>
          )}

          {/* Total hours input */}
          {inputMode === 'total' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">מספר שעות</label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
                placeholder="לדוגמה: 3.5"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
              />
            </div>
          )}

          {/* Calculated total */}
          {displayedHours > 0 && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-emerald-700 font-medium">סה"כ שעות לדיווח</span>
              <span className="text-xl font-bold text-emerald-700">
                {displayedHours % 1 === 0 ? displayedHours.toFixed(0) : displayedHours.toFixed(1)}h
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">הערה (אופציונלי)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הוסף הערה לדיווח..."
              rows={2}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-emerald-400 text-white cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
            }`}
          >
            {saved ? (
              <>
                <CheckCircle size={16} />
                נשמר!
              </>
            ) : (
              <>
                <Clock size={16} />
                שמור דיווח
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}