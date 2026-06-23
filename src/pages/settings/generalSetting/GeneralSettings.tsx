import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Save } from 'lucide-react';
import { getGeneralSettings, updateGeneralSettings as saveGeneralSettings } from '../../../services/settingService';
import type { GeneralSettings as GeneralSettingsType } from '../../../types/settings';
import MessageBox from '../../shared/MessageBox';
import NumberInput from '../../shared/NumberInput';
import type { SettingsTabHandle } from '../settingsTabHandle';
import { snapshotChanged } from '../settingsSnapshots';
import {
  SETTINGS_CHECKBOX_LABEL,
  SETTINGS_FIELD_LG,
  SETTINGS_INFO_BLUE,
  SETTINGS_INFO_EMERALD,
  SETTINGS_LABEL,
  SETTINGS_SECTION,
  SETTINGS_SUBTITLE,
  SETTINGS_TITLE,
} from '../settingsTheme';

const MONTHLY_HOURS_BASE = 182;

const GeneralSettings = forwardRef<SettingsTabHandle>((_props, ref) => {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsType | null>(null);
  const [savedSettings, setSavedSettings] = useState<GeneralSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [messageBox, setMessageBox] = useState<{
    isOpen: boolean; title: string; message: string;
    type: 'alert' | 'success' | 'error' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const loadGeneralSettings = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await getGeneralSettings();
      if (data) {
        setGeneralSettings(data);
        setSavedSettings(data);
      }
    } catch {
      setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה בטעינת ההגדרות', type: 'error' });
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadGeneralSettings();
  }, []);

  const updateGeneralSettings = (updates: Partial<GeneralSettingsType>) =>
    setGeneralSettings(prev => prev ? { ...prev, ...updates } : null);

  const decimalHours = generalSettings ? generalSettings.hours + generalSettings.minutes / 60 : 0;
  const costWithProfit = generalSettings ? generalSettings.workingHourCost * (1 + generalSettings.profitPercentage / 100) : 0;
  const jobScopePercent = MONTHLY_HOURS_BASE > 0
    ? ((generalSettings?.monthlyJobScopeHours ?? 0) / MONTHLY_HOURS_BASE) * 100
    : 0;
  const jobScopePercentDisplay = Math.round(jobScopePercent);

  const updateMonthlyJobScopeHours = (hours: number) => {
    updateGeneralSettings({ monthlyJobScopeHours: Math.max(0, Math.round(hours)) });
  };

  const updateJobScopePercent = (percent: number) => {
    const hours = Math.round((Math.max(0, Math.round(percent)) / 100) * MONTHLY_HOURS_BASE);
    updateGeneralSettings({ monthlyJobScopeHours: hours });
  };

  const persistSettings = async (showFeedback: boolean) => {
    if (!generalSettings) {
      if (showFeedback) {
        setMessageBox({ isOpen: true, title: 'אין נתונים', message: 'אין נתונים לשמירה', type: 'warning' });
      }
      return;
    }
    try {
      setIsSaving(true);
      const success = await saveGeneralSettings(generalSettings);
      if (success) {
        setSavedSettings(generalSettings);
      }
      if (showFeedback) {
        setMessageBox({
          isOpen: true,
          title: success ? 'שמירה הצליחה' : 'שגיאה',
          message: success ? 'ההגדרות נשמרו בהצלחה!' : 'שגיאה בשמירת ההגדרות',
          type: success ? 'success' : 'error',
        });
      }
      if (!success) {
        throw new Error('Failed to save general settings');
      }
    } catch {
      if (showFeedback) {
        setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה בשמירת ההגדרות', type: 'error' });
      }
      throw new Error('Failed to save general settings');
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    hasUnsavedChanges: () => snapshotChanged(generalSettings, savedSettings),
    save: () => persistSettings(false),
    reload: () => loadGeneralSettings(false),
  }));

  const handleSave = () => void persistSettings(true);

  if (isLoading) return (
    <div className="flex items-center justify-center h-32">
      <div className="text-sm text-gray-500">טוען הגדרות...</div>
    </div>
  );

  return (
    <div className="space-y-3 w-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={`!text-lg sm:!text-xl ${SETTINGS_TITLE}`}>הגדרות כלליות</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="settings-header-btn flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold shadow-md text-sm w-full sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Save size={14} />
          {isSaving ? 'שומר...' : 'שמור'}
        </button>
      </div>

      {/* שעות עבודה ביום */}
      <div className={SETTINGS_SECTION}>
        <h3 className={`${SETTINGS_SUBTITLE} mb-3`}>היקף שעות עבודה ביום</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            
             <div className="text-center">
              <label className={SETTINGS_LABEL}>דקות</label>
              <NumberInput integerOnly min={0} max={59}
                value={generalSettings?.minutes ?? 0}
                onChange={v => updateGeneralSettings({ minutes: Math.max(0, Math.min(59, v)) })}
                className={`w-20 ${SETTINGS_FIELD_LG}`}
              />
            </div>
            <span className="text-xl font-bold text-gray-400 mt-4">:</span>
           <div className="text-center">
              <label className={SETTINGS_LABEL}>שעות</label>
              <NumberInput integerOnly min={0} max={23}
                value={generalSettings?.hours ?? 0}
                onChange={v => updateGeneralSettings({ hours: Math.max(0, Math.min(23, v)) })}
                className={`w-20 ${SETTINGS_FIELD_LG}`}
              />
            </div>
          </div>
          <div className={SETTINGS_INFO_BLUE}>
            <div className="text-xs text-blue-500">שעות עשרוניות</div>
            <div className="text-xl font-bold text-blue-800">{decimalHours.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* היקף משרה חודשי */}
      <div className={SETTINGS_SECTION}>
        <h3 className={`${SETTINGS_SUBTITLE} mb-3`}>היקף משרה מקצועית לפרויקטים</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-center">
            <label className="block text-xs text-gray-500 mb-1">שעות חודשיות</label>
            <NumberInput integerOnly min={0} step={1}
              value={Math.round(generalSettings?.monthlyJobScopeHours ?? 0)}
              onChange={updateMonthlyJobScopeHours}
              className="w-28 px-2 py-1.5 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
            />
          </div>
          <div className="text-center">
            <label className="block text-xs text-gray-500 mb-1">אחוז משרה</label>
            <div className="flex items-center gap-1 justify-center">
              <NumberInput integerOnly min={0} step={1}
                value={jobScopePercentDisplay}
                onChange={updateJobScopePercent}
                className="w-28 px-2 py-1.5 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
              />
              <span className="text-sm text-gray-500 font-medium">%</span>
            </div>
          </div>
          <div className={SETTINGS_INFO_BLUE}>
            <div className="text-xs text-blue-500">
              💡 משרה מלאה בישראל </div>
            <div className="text-xl font-bold text-blue-800">
              {MONTHLY_HOURS_BASE} שעות
            </div>
          </div>
          {/* <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-700">
            💡 משרה מלאה בישראל ≈ <strong>{MONTHLY_HOURS_BASE} שעות</strong>
          </div> */}
        </div>
      </div>

      {/* עלות שעת עבודה */}
      <div className={SETTINGS_SECTION}>
        <h3 className={`${SETTINGS_SUBTITLE} mb-3`}>עלות שעת עבודה ממוצעת (₪)</h3>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="text-center">
            <label className="block text-xs text-gray-500 mb-1">עלות שעה (₪)</label>
            <NumberInput min={0}
              value={generalSettings?.workingHourCost ?? 0}
              onChange={v => updateGeneralSettings({ workingHourCost: v })}
              className="w-28 px-2 py-1.5 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
            />
          </div>
          <div className="text-center">
            <label className="block text-xs text-gray-500 mb-1">רווח (%)</label>
            <NumberInput integerOnly min={0} max={100}
              value={generalSettings?.profitPercentage ?? 0}
              onChange={v => updateGeneralSettings({ profitPercentage: v })}
              className="w-24 px-2 py-1.5 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
            />
          </div>
          <div className={SETTINGS_INFO_EMERALD}>
            <div className="text-xs text-emerald-600 mb-1">שיכלול עלות שעת עבודה כולל רווח</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-800">₪{costWithProfit.toFixed(2)}</span>
              <span className="text-xs text-emerald-600">(₪{generalSettings?.workingHourCost ?? 0} + {generalSettings?.profitPercentage ?? 0}% רווח)</span>
            </div>
          </div>
        </div>
      </div>

      {/* אוטומציות */}
      <div className={SETTINGS_SECTION}>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">אוטומציות למשימות</h3>
        <div className="flex flex-col gap-2">
          <label className={SETTINGS_CHECKBOX_LABEL}>
            <input
              type="checkbox"
              checked={generalSettings?.billRequestSent ?? false}
              onChange={e => updateGeneralSettings({ billRequestSent: e.target.checked })}
              className="w-4 h-4 text-emerald-500 cursor-pointer"
            />
            <span className="text-gray-700 dark:text-gray-200">בהפיכת סטטוס המשימה ל-"הושלם" תשלח אוטומטית אינדיקציה להגשת חשבון עסקה.</span>
          </label>
          <label className={SETTINGS_CHECKBOX_LABEL}>
            <input
              type="checkbox"
              checked={generalSettings?.closedByStatusChange ?? false}
              onChange={e => updateGeneralSettings({ closedByStatusChange: e.target.checked })}
              className="w-4 h-4 text-emerald-500 cursor-pointer"
            />
            <span className="text-gray-700 dark:text-gray-200">בהפיכת סטטוס המשימה ל-"הושלם" המשימה אוטומטית תסומן כמשימה שנבדקה.</span>
          </label>
          <label className={SETTINGS_CHECKBOX_LABEL}>
            <input
              type="checkbox"
              checked={generalSettings?.isShowNotification ?? false}
              onChange={e => updateGeneralSettings({ isShowNotification: e.target.checked })}
              className="w-4 h-4 text-emerald-500 cursor-pointer"
            />
            <span className="text-gray-700 dark:text-gray-200">בשיוך משימה חדשה לעובד תישלח אוטומטית התראה לעובד המשויך.</span>
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
});

GeneralSettings.displayName = 'GeneralSettings';

export default GeneralSettings;