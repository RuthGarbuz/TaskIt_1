import { useEffect, useState } from 'react';
import { Clock, Calendar, X, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import type { TaskReview } from '../../Data/projectsData';
import { insertHourReport, updateHourReport } from '../../services/hourReportService';
import type { HoursReport } from '../../Data/HoursReportData';

interface HoursReportModalProps {
  task:  TaskReview;
  editReport?: HoursReport|null;
  onClose: () => void;
  onSave: (report: HoursReport) => void;
  onDelete?: (id: number) => Promise<void> | void;
}



export default function HoursReportModal({ task, editReport, onClose, onSave, onDelete }: HoursReportModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<HoursReport | null>(null);

  const getInitialReport = (): HoursReport => ({
    id: 0,
    taskId: task.id,
    reportDate: today,
    fromTime: '09:00',
    toTime: '17:00',
    totalHours: 0,
    inputMode: 'range',
    notes: '',
  });

  const toDateInputValue = (value?: string | null): string => {
    if (!value) return '';
    const direct = value.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().split('T')[0];
  };

  useEffect(() => {
    if(editReport){
      setReport({
        ...editReport,
        reportDate: toDateInputValue(editReport.reportDate),
      });//edit
      return;
    }
    setReport(getInitialReport());//new
  }, [task.id, editReport]);

  const updateReport = (patch: Partial<HoursReport>) => {
    setReport((prev) => ({
      ...(prev ?? getInitialReport()),
      ...patch,
    }));
  };

  const calcHoursFromRange = (): number => {
    const currentReport = report ?? getInitialReport();
    if (!currentReport.fromTime || !currentReport.toTime) return 0;
    const [fh, fm] = currentReport.fromTime.split(':').map(Number);
    const [th, tm] = currentReport.toTime.split(':').map(Number);
    const diff = (th * 60 + tm) - (fh * 60 + fm);
    return Math.max(0, diff / 60);
  };

  const displayedHours = (report?.inputMode ?? 'range') === 'range'
    ? calcHoursFromRange()
    : report?.totalHours || 0;

  const handleSave = async () => {
    setError('');

    const currentReport = report ?? getInitialReport();

    if (!currentReport.reportDate) {
      setError('נא להזין תאריך דיווח');
      return;
    }
    if (currentReport.inputMode === 'range') {
      if (!currentReport.fromTime || !currentReport.toTime) {
        setError('נא להזין שעת התחלה וסיום');
        return;
      }
      if (calcHoursFromRange() <= 0) {
        setError('שעת הסיום חייבת להיות אחרי שעת ההתחלה');
        return;
      }
    } else if (!currentReport.totalHours || currentReport.totalHours <= 0) {
      setError('נא להזין מספר שעות תקין');
      return;
    }

    const reportToSave: HoursReport = {
      ...currentReport,
      taskId: task.id,
      fromTime: currentReport.inputMode === 'range' ? currentReport.fromTime : '',
      toTime: currentReport.inputMode === 'range' ? currentReport.toTime : '',
      totalHours: displayedHours,
      notes: currentReport.notes?.trim() || undefined,
    };

    try {
      if(report?.id&& report.id >0){
        await updateHourReport(report);
      }else
      {
      await insertHourReport(reportToSave,task.projectId,!task.isPlanningSte);
      }
      setSaved(true);
      setTimeout(() => {
        onSave(reportToSave);
        onClose();
        setReport(null);
      }, 900);
    } catch {
      setError('שמירת הדיווח נכשלה, נסה שוב');
      setSaved(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !report?.id || report.id <= 0) return;
    try {
      await onDelete(report.id);
      onClose();
      setReport(null);
    } catch {
      setError('מחיקת הדיווח נכשלה, נסה שוב');
    }
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
              <span className="font-semibold text-gray-800">{task.projectName}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">שלב / משימה</span>
              <span className="font-semibold text-gray-800 truncate block">{task.name}</span>
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
              value={report?.reportDate ?? ''}
              onChange={(e) => updateReport({ reportDate: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
            />
          </div>

          {/* Mode Toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">שיטת דיווח</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateReport({ inputMode: 'range' })}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                  (report?.inputMode ?? 'range') === 'range'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                }`}
              >
                מ-שעה עד שעה
              </button>
              <button
                onClick={() => updateReport({ inputMode: 'total' })}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                  (report?.inputMode ?? 'range') === 'total'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                }`}
              >
                סה"כ שעות
              </button>
            </div>
          </div>

          {/* Range inputs */}
          {(report?.inputMode ?? 'range') === 'range' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">משעה</label>
                <input
                  type="time"
                  value={report?.fromTime ?? ''}
                  onChange={(e) => updateReport({ fromTime: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">עד שעה</label>
                <input
                  type="time"
                  value={report?.toTime ?? ''}
                  onChange={(e) => updateReport({ toTime: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                />
              </div>
            </div>
          )}

          {/* Total hours input */}
          {(report?.inputMode ?? 'range') === 'total' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">מספר שעות</label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={report?.totalHours || ''}
                onChange={(e) => updateReport({ totalHours: e.target.value ? parseFloat(e.target.value) : 0 })}
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
              value={report?.notes ?? ''}
              onChange={(e) => updateReport({ notes: e.target.value })}
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
          {report?.id && report.id > 0 && (
            <button
              onClick={handleDelete}
              className="py-2.5 px-4 border-2 border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              מחק
            </button>
          )}
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