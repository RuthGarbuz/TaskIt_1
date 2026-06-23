import { useState } from 'react';
import { X, Send } from 'lucide-react';
import type { TaskReview } from '../../Data/projectsData';
import { savePlanningBill } from '../../services/taskBillService';
import authService from '../../services/authService';

interface PlanningBillRequestModalProps {
  task: TaskReview;
  onClose: () => void;
  onSuccess?: (billId: number) => void;
  onError?: (message: string) => void;
}

export default function PlanningBillRequestModal({
  task,
  onClose,
  onSuccess,
  onError,
}: PlanningBillRequestModalProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    const userId = authService.getCurrentUser()?.id;
    if (!userId) {
      onError?.('משתמש לא מחובר');
      return;
    }

    setSaving(true);
    try {
      const billId = await savePlanningBill(
        task.id,
        task.isPlanningSte,
        userId,
        note.trim() || null,
      );
      onSuccess?.(billId);
      onClose();
    } catch (err) {
      const message = err instanceof Error && err.message.trim()
        ? err.message.trim()
        : 'שגיאה בפתיחת בקשה להגשת חשבון';
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" dir="rtl">
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send size={18} className="text-white" />
            <h2 className="text-white font-bold text-base">הגשת חשבון</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            בחרת לפתוח בקשה להגשת חשבון עבור המשימה/השלב.
          </p>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-1 block">הערות (לא חובה)</span>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none disabled:bg-gray-50"
              placeholder="הוסף הערה לבקשה..."
            />
          </label>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={() => { void handleConfirm(); }}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'שולח...' : 'אישור'}
          </button>
        </div>
      </div>
    </div>
  );
}
