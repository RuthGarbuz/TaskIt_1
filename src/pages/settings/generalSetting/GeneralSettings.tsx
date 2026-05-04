import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { getGeneralSettings, updateGeneralSettings as saveGeneralSettings } from '../../../services/settingService';
import type { GeneralSettings as GeneralSettingsType } from '../../../types/settings';
import MessageBox from '../../shared/MessageBox';

const MONTHLY_HOURS_BASE = 182;

export default function GeneralSettings() {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [messageBox, setMessageBox] = useState<{
    isOpen: boolean; title: string; message: string;
    type: 'alert' | 'success' | 'error' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  useEffect(() => {
    const fetchGeneralSettings = async () => {
      try {
        setIsLoading(true);
        const data = await getGeneralSettings();
        if (data) setGeneralSettings(data);
      } catch {
        setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה בטעינת ההגדרות', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchGeneralSettings();
  }, []);

  const updateGeneralSettings = (updates: Partial<GeneralSettingsType>) =>
    setGeneralSettings(prev => prev ? { ...prev, ...updates } : null);

  const decimalHours = generalSettings ? generalSettings.hours + generalSettings.minutes / 60 : 0;
  const costWithProfit = generalSettings ? generalSettings.workingHourCost * (1 + generalSettings.profitPercentage / 100) : 0;

  const handleSave = async () => {
    if (!generalSettings) {
      setMessageBox({ isOpen: true, title: 'אין נתונים', message: 'אין נתונים לשמירה', type: 'warning' });
      return;
    }
    try {
      setIsSaving(true);
      const success = await saveGeneralSettings(generalSettings);
      setMessageBox({
        isOpen: true,
        title: success ? 'שמירה הצליחה' : 'שגיאה',
        message: success ? 'ההגדרות נשמרו בהצלחה!' : 'שגיאה בשמירת ההגדרות',
        type: success ? 'success' : 'error',
      });
    } catch {
      setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה בשמירת ההגדרות', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-32">
      <div className="text-sm text-gray-500">טוען הגדרות...</div>
    </div>
  );

  return (
    <div className="space-y-3 w-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-gray-800">הגדרות כלליות</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold shadow-md text-sm w-full sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"

          //className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold text-xs shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={14} />
          {isSaving ? 'שומר...' : 'שמור'}
        </button>
      </div>

      {/* שעות עבודה ביום */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <h3 className="text-sm sm:text-base font-bold text-gray-700 mb-3">היקף שעות עבודה ביום</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            
             <div className="text-center">
              <label className="block text-xs text-gray-500 mb-1">דקות</label>
              <input
                type="number" min="0" max="59"
                value={generalSettings?.minutes ?? 0}
                onChange={e => updateGeneralSettings({ minutes: Math.max(0, Math.min(59, Number(e.target.value))) })}
                className="w-20 px-2 py-1.5 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
              />
            </div>
            <span className="text-xl font-bold text-gray-400 mt-4">:</span>
           <div className="text-center">
              <label className="block text-xs text-gray-500 mb-1">שעות</label>
              <input
                type="number" min="0" max="23"
                value={generalSettings?.hours ?? 0}
                onChange={e => updateGeneralSettings({ hours: Math.max(0, Math.min(23, Number(e.target.value))) })}
                className="w-20 px-2 py-1.5 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
              />
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-blue-500">שעות עשרוניות</div>
            <div className="text-xl font-bold text-blue-800">{decimalHours.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* היקף משרה חודשי */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <h3 className="text-sm sm:text-base font-bold text-gray-700 mb-3">היקף משרה מקצועית לפרויקטים</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-center">
            <label className="block text-xs text-gray-500 mb-1">שעות חודשיות</label>
            <input
              type="number" min="0" step="0.5"
              value={generalSettings?.monthlyJobScopeHours ?? 0}
              onChange={e => updateGeneralSettings({ monthlyJobScopeHours: Number(e.target.value) })}
              className="w-28 px-2 py-1.5 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-blue-500">💡 משרה מלאה בישראל </div>
            <div className="text-xl font-bold text-blue-800"><strong>{MONTHLY_HOURS_BASE} שעות</strong></div>
          </div>
          {/* <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-700">
            💡 משרה מלאה בישראל ≈ <strong>{MONTHLY_HOURS_BASE} שעות</strong>
          </div> */}
        </div>
      </div>

      {/* עלות שעת עבודה */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <h3 className="text-sm sm:text-base font-bold text-gray-700 mb-3">עלות שעת עבודה ממוצעת (₪)</h3>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="text-center">
            <label className="block text-xs text-gray-500 mb-1">עלות שעה (₪)</label>
            <input
              type="number" min="0"
              value={generalSettings?.workingHourCost ?? 0}
              onChange={e => updateGeneralSettings({ workingHourCost: Number(e.target.value) })}
              className="w-28 px-2 py-1.5 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
            />
          </div>
          <div className="text-center">
            <label className="block text-xs text-gray-500 mb-1">רווח (%)</label>
            <input
              type="number" min="0" max="100"
              value={generalSettings?.profitPercentage ?? 0}
              onChange={e => updateGeneralSettings({ profitPercentage: Number(e.target.value) })}
              className="w-24 px-2 py-1.5 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
            />
          </div>
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-4 py-2">
            <div className="text-xs text-emerald-600 mb-1">שיכלול עלות שעת עבודה כולל רווח</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-800">₪{costWithProfit.toFixed(2)}</span>
              <span className="text-xs text-emerald-600">(₪{generalSettings?.workingHourCost ?? 0} + {generalSettings?.profitPercentage ?? 0}% רווח)</span>
            </div>
          </div>
        </div>
      </div>

      {/* אוטומציות */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <h3 className="text-sm font-bold text-gray-700 mb-3">אוטומציות בסיום משימה</h3>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg cursor-pointer hover:bg-white bg-white text-sm">
            <input
              type="checkbox"
              checked={generalSettings?.billRequestSent ?? false}
              onChange={e => updateGeneralSettings({ billRequestSent: e.target.checked })}
              className="w-4 h-4 text-emerald-500 cursor-pointer"
            />
            <span className="text-gray-700">סימון שהמשימה נבדקה עם הפיכת סטטוס ל"הושלם"</span>
          </label>
          <label className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg cursor-pointer hover:bg-white bg-white text-sm">
            <input
              type="checkbox"
              checked={generalSettings?.closedByStatusChange ?? false}
              onChange={e => updateGeneralSettings({ closedByStatusChange: e.target.checked })}
              className="w-4 h-4 text-emerald-500 cursor-pointer"
            />
            <span className="text-gray-700">שליחת אינדיקציה להגשת חשבון בהפיכת סטטוס ל"הושלם"</span>
          </label>
        </div>
      </div>

      <MessageBox
        isOpen={messageBox.isOpen}
        onClose={() => setMessageBox({ ...messageBox, isOpen: false })}
        title={messageBox.title}
        message={messageBox.message}
        type={messageBox.type}
        confirmText="אישור"
      />
    </div>
  );
}