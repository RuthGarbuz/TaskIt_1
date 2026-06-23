import { useEffect, useRef, useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { CompactDateInput as DateInput } from '../../shared/DateInput';
import { BRIGHT_SURFACE, MODAL_CLOSE_BTN, MODAL_FIELD, MODAL_TITLE, PROJECT_BTN_SECONDARY } from '../projectsTheme';

export type SubjectDatesBulkUpdatePayload =
  | { mode: 'days'; days: number }
  | { mode: 'date'; targetDate: string };

interface SubjectDatesBulkUpdateModalProps {
  subjectName: string;
  currentStartDate: string; // YYYY-MM-DD
  onApply: (payload: SubjectDatesBulkUpdatePayload) => void;
  onClose: () => void;
  onWarn: (message: string) => void;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isValidDaysInput(value: string): boolean {
  if (value === '' || value === '-') return true;
  if (value === '0' || value === '-0') return true;
  return /^-?[1-9]\d*$/.test(value);
}

export default function SubjectDatesBulkUpdateModal({
  subjectName,
  currentStartDate,
  onApply,
  onClose,
  onWarn,
}: SubjectDatesBulkUpdateModalProps) {
  const [daysInput, setDaysInput] = useState('0');
  const [targetDate, setTargetDate] = useState(currentStartDate);
  const daysInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    daysInputRef.current?.focus();
    daysInputRef.current?.select();
  }, []);

  useEffect(() => {
    setTargetDate(currentStartDate);
    setDaysInput('0');
  }, [currentStartDate]);

  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const iso = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    if (iso.includes('/')) {
      const [day, month, year] = iso.split('/');
      if (year && month && day) return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      return iso;
    }
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  };
  const handleDaysChange = (value: string) => {
    if (!isValidDaysInput(value)) return;
    setDaysInput(value);
    if (/^-?[1-9]\d*$|^-?0$/.test(value.trim())) {
      setTargetDate(addDays(currentStartDate, Number(value.trim())));
    }
  };

  const handleDateChange = (value: string) => {
    setTargetDate(value);
    if (value.trim() && currentStartDate) {
      const diff = daysBetween(currentStartDate, value.trim());
      setDaysInput(String(diff));
    }
  };

  const handleApply = () => {
    const trimmedDays = daysInput.trim();

    if (!trimmedDays) {
      onWarn('יש להזין מספר ימים או תאריך התחלה חדש.');
      return;
    }
    if (!/^-?[1-9]\d*$|^-?0$/.test(trimmedDays)) {
      onWarn('מספר הימים חייב להיות מספר שלם.');
      return;
    }

    const days = Number(trimmedDays);
    if (days === 0) {
      onApply({ mode: 'days', days: 0 });
      return;
    }

    onApply({ mode: 'days', days });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg flex flex-col" dir="rtl">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className={`text-lg ${MODAL_TITLE}`}>עדכון תאריכי נושא התכנון</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subjectName}</p>
          </div>
          <button type="button" onClick={onClose} className={MODAL_CLOSE_BTN}>
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Read-only current start date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              תאריך התחלה
            </label>
            <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-500 dark:text-gray-300 select-none">
              {formatDisplay(currentStartDate) || '—'}
            </div>
          </div>

          <div className="space-y-4">
            {/* Days input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                מספר ימים (מספר שלם)
              </label>
              <div className="relative">
                <input
                  ref={daysInputRef}
                  type="text"
                  inputMode="numeric"
                  value={daysInput}
                  onChange={e => handleDaysChange(e.target.value)}
                  onFocus={e => e.target.select()}
                  placeholder="לדוגמה: 10 או -10"
                  className={MODAL_FIELD}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 font-medium">
              <span className="flex-1 border-t border-gray-200 dark:border-gray-700" />
              <span>או</span>
              <span className="flex-1 border-t border-gray-200 dark:border-gray-700" />
            </div>

            {/* New target date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                תאריך התחלה חדש
              </label>
              <DateInput
                value={targetDate}
                onChange={handleDateChange}
                className="w-full"
              />
            </div>
          </div>

          {/* Info box */}
          <div className={`${BRIGHT_SURFACE} bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 text-xs text-amber-900 leading-relaxed`}>
            <p>• עדכון התאריך ישפיע באופן גורף על כל התאריכים בנושא התכנון תוך שמירה על הפערים הקיימים ביניהם.</p>
            <p>• ניתן להזין מספר ימים שלילי, ובמקרה כזה כל התאריכים יוזזו אחורה באותו מספר ימים.</p>
            <p>• מספר ימים חיובי יזיז את כל התאריכים קדימה באותו מספר ימים.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className={PROJECT_BTN_SECONDARY}
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium"
          >
            <Calendar size={16} />
            עדכון
          </button>
        </div>
      </div>
    </div>
  );
}