import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { Clock, Calendar, X, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import type { TaskReview } from '../../Data/projectsData';
import { insertHourReport, updateHourReport } from '../../services/hourReportService';
import { getGeneralSettings } from '../../services/settingService';
import type { HoursReport } from '../../Data/HoursReportData';
import { DateInput } from '../shared/DateInput';
import { MODAL_FIELD, MODAL_FOOTER, TASK_CTRL_BTN } from '../tasks/taskViewTheme';

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
  const [defaultDailyHours, setDefaultDailyHours] = useState(8);
  const reportDateRef = useRef<HTMLInputElement>(null);
  const fromTimeRef = useRef<HTMLInputElement>(null);
  const toTimeRef = useRef<HTMLInputElement>(null);
  const totalHoursRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const inputMode = report?.inputMode ?? 'range';

  const segmentTabCountRef = useRef(0);
  const segmentTabFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const getFormFieldRefs = () => (
    inputMode === 'range'
      ? [reportDateRef, fromTimeRef, toTimeRef, notesRef]
      : [reportDateRef, totalHoursRef, notesRef]
  );

  const getFormFields = () =>
    getFormFieldRefs()
      .map(r => r.current)
      .filter((el): el is HTMLInputElement | HTMLTextAreaElement => el != null);

  const getSegmentCount = (el: HTMLInputElement | HTMLTextAreaElement) => {
    if (el instanceof HTMLInputElement && el.type === 'date') return 3;
    if (el instanceof HTMLInputElement && el.type === 'time') return 2;
    return 1;
  };

  const focusFormFieldAt = (index: number) => {
    const fields = getFormFields();
    if (index < 0 || index >= fields.length) return;
    fields[index].focus();
  };

  const handleSegmentFieldFocus = (
    el: HTMLInputElement | HTMLTextAreaElement,
    e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const segments = getSegmentCount(el);
    const fields = getFormFields();
    const index = fields.findIndex(field => field === el);
    const related = e.relatedTarget;
    const relatedIndex = related instanceof HTMLInputElement || related instanceof HTMLTextAreaElement
      ? fields.findIndex(field => field === related)
      : -1;

    segmentTabFieldRef.current = el;
    segmentTabCountRef.current =
      segments > 1 && relatedIndex === index + 1 ? segments - 1 : 0;
  };

  const handleInputTab = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return;

    const input = e.currentTarget;
    const fields = getFormFields();
    const currentIndex = fields.findIndex(el => el === input);
    if (currentIndex === -1) return;

    const segments = getSegmentCount(input);
    if (segmentTabFieldRef.current !== input) {
      segmentTabFieldRef.current = input;
      segmentTabCountRef.current = 0;
    }

    if (segments === 1) {
      e.preventDefault();
      focusFormFieldAt(e.shiftKey ? currentIndex - 1 : currentIndex + 1);
      return;
    }

    if (e.shiftKey) {
      if (segmentTabCountRef.current > 0) {
        segmentTabCountRef.current -= 1;
        return;
      }
      e.preventDefault();
      segmentTabFieldRef.current = null;
      focusFormFieldAt(currentIndex - 1);
      return;
    }

    if (segmentTabCountRef.current < segments - 1) {
      segmentTabCountRef.current += 1;
      return;
    }

    e.preventDefault();
    segmentTabFieldRef.current = null;
    focusFormFieldAt(currentIndex + 1);
  };

  const dateTimeInputClass =
    `${MODAL_FIELD} border-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer`;

  const getInitialReport = (): HoursReport => ({
    id: 0,
    taskId: task.id,
    reportDate: today,
    fromTime: '09:00',
    toTime: '17:00',
    totalHours: defaultDailyHours,
    inputMode: 'range',
    notes: '',
  });

  useEffect(() => {
    let cancelled = false;
    const loadDefaultDailyHours = async () => {
      try {
        const settings = await getGeneralSettings();
        if (cancelled) return;
        const hours = settings?.hours ?? 8;
        const minutes = settings?.minutes ?? 0;
        const daily = hours + minutes / 60;
        setDefaultDailyHours(daily > 0 ? daily : 8);
      } catch {
        if (!cancelled) setDefaultDailyHours(8);
      }
    };
    void loadDefaultDailyHours();
    return () => { cancelled = true; };
  }, []);

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
  }, [task.id, editReport, defaultDailyHours]);

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

  const formatHoursAsDuration = (decimalHours: number): string => {
    const totalMinutes = Math.round(decimalHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const decimalHoursToTimeInputValue = (decimalHours: number): string => {
    if (!decimalHours || decimalHours <= 0) return '';
    return formatHoursAsDuration(decimalHours);
  };

  const parseTimeInputToDecimalHours = (time: string): number => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h + m / 60;
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
      setError('נא להזין משך שעות תקין (שעות:דקות)');
      return;
    } else if (currentReport.totalHours > 24) {
      setError('משך השעות לא יכול לעלות על 24 שעות');
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
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md flex flex-col overflow-hidden">

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
            type="button"
            tabIndex={-1}
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1.5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Project Info - read only */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-xs block mb-0.5">פרויקט</span>
              <span className="font-semibold text-gray-800 dark:text-gray-100">{task.projectName}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-xs block mb-0.5">שלב / משימה</span>
              <span className="font-semibold text-gray-800 dark:text-gray-100 truncate block">{task.name}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 flex-1">

          {/* Date */}
          <div>
            <label className={`block mb-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200`}>
              <Calendar size={14} className="inline ml-1 text-emerald-600" />
              תאריך הדיווח
            </label>
            <DateInput
              ref={reportDateRef}
              value={report?.reportDate ?? ''}
              onChange={v => updateReport({ reportDate: v })}
              className={dateTimeInputClass}
            />
          </div>

          {/* Mode Toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">שיטת דיווח</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => updateReport({ inputMode: 'range' })}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                  (report?.inputMode ?? 'range') === 'range'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-500'
                }`}
              >
                מ-שעה עד שעה
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  setError('');
                  updateReport({
                    inputMode: 'total',
                    ...((report?.totalHours ?? 0) <= 0 ? { totalHours: defaultDailyHours } : {}),
                  });
                }}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                  (report?.inputMode ?? 'range') === 'total'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-500'
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
                  ref={fromTimeRef}
                  type="time"
                  value={report?.fromTime ?? ''}
                  onChange={(e) => {
                    setError('');
                    updateReport({ fromTime: e.target.value });
                  }}
                  onFocus={(e) => {
                    setError('');
                    handleSegmentFieldFocus(e.currentTarget, e);
                  }}
                  onKeyDown={handleInputTab}
                  className={dateTimeInputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">עד שעה</label>
                <input
                  ref={toTimeRef}
                  type="time"
                  value={report?.toTime ?? ''}
                  onChange={(e) => {
                    setError('');
                    updateReport({ toTime: e.target.value });
                  }}
                  onFocus={(e) => {
                    setError('');
                    handleSegmentFieldFocus(e.currentTarget, e);
                  }}
                  onKeyDown={handleInputTab}
                  className={dateTimeInputClass}
                />
              </div>
            </div>
          )}

          {/* Total hours input */}
          {(report?.inputMode ?? 'range') === 'total' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">משך שעות (שעות:דקות)</label>
              <input
                ref={totalHoursRef}
                type="time"
                value={decimalHoursToTimeInputValue(report?.totalHours ?? 0)}
                onChange={(e) => {
                  setError('');
                  updateReport({ totalHours: parseTimeInputToDecimalHours(e.target.value) });
                }}
                onFocus={(e) => {
                  setError('');
                  handleSegmentFieldFocus(e.currentTarget, e);
                }}
                onKeyDown={handleInputTab}
                className={dateTimeInputClass}
                dir="ltr"
              />
            </div>
          )}

          {/* Calculated total */}
          {displayedHours > 0 && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-emerald-700 font-medium">סה"כ שעות לדיווח</span>
              <span className="text-xl font-bold text-emerald-700" dir="ltr">
                {formatHoursAsDuration(displayedHours)}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">הערה (אופציונלי)</label>
            <textarea
              ref={notesRef}
              value={report?.notes ?? ''}
              onChange={(e) => updateReport({ notes: e.target.value })}
              onFocus={(e) => handleSegmentFieldFocus(e.currentTarget, e)}
              onKeyDown={handleInputTab}
              placeholder="הוסף הערה לדיווח..."
              rows={2}
              className={`${MODAL_FIELD} border-2 resize-none`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${MODAL_FOOTER} flex gap-3`}>
          {report?.id && report.id > 0 && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleDelete}
              className="py-2.5 px-4 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-lg text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/30 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              מחק
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={onClose}
            className={`flex-1 py-2.5 border-2 rounded-lg text-sm font-semibold transition-all ${TASK_CTRL_BTN}`}
          >
            ביטול
          </button>
          <button
            type="button"
            tabIndex={-1}
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