import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { getGeneralSettings, updateGeneralSettings as saveGeneralSettings } from '../../../services/settingService';
import type { GeneralSettings as GeneralSettingsType } from '../../../types/settings';
import MessageBox from '../../shared/MessageBox';

export default function GeneralSettings() {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [messageBox, setMessageBox] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'success' | 'error' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'alert' });
const MONTHLY_HOURS_BASE = 182; 
  useEffect(() => {
    const fetchGeneralSettings = async () => {
      try {
        setIsLoading(true);
        const data = await getGeneralSettings();
        
        if (data) {
          setGeneralSettings(data);
          console.log('State updated, generalSettings should now be:', data);
        }
      } catch (error) {
        console.error('Failed to fetch general settings:', error);
        setMessageBox({
          isOpen: true,
          title: 'שגיאה',
          message: 'שגיאה בטעינת ההגדרות',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGeneralSettings();
  }, []);

  const updateGeneralSettings = (updates: Partial<GeneralSettingsType>) => {
    setGeneralSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  const decimalHours = generalSettings ? generalSettings.hours + generalSettings.minutes / 60 : 0;
  const totalMinutes = generalSettings ? generalSettings.hours * 60 + generalSettings.minutes : 0;
  const costWithProfit = generalSettings ? generalSettings.workingHourCost * (1 + generalSettings.profitPercentage / 100) : 0;

  const handleSave = async () => {
    if (!generalSettings) {
      setMessageBox({
        isOpen: true,
        title: 'אין נתונים',
        message: 'אין נתונים לשמירה',
        type: 'warning'
      });
      return;
    }

    try {
      setIsSaving(true);
      const success = await saveGeneralSettings(generalSettings);
      
      if (success) {
        setMessageBox({
          isOpen: true,
          title: 'שמירה הצליחה',
          message: 'ההגדרות נשמרו בהצלחה!',
          type: 'success'
        });
      } else {
        setMessageBox({
          isOpen: true,
          title: 'שגיאה',
          message: 'שגיאה בשמירת ההגדרות',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Failed to save general settings:', error);
      setMessageBox({
        isOpen: true,
        title: 'שגיאה',
        message: 'שגיאה בשמירת ההגדרות',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">טוען הגדרות...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-6xl">
      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-800">הגדרות כלליות</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold shadow-md text-sm w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          {isSaving ? 'שומר...' : 'שמור הגדרות'}
        </button>
      </div>

      {/* שעות עבודה ביום - שעות ודקות עם חישוב בצד */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">שעות עבודה ביום</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
          {/* שעות ודקות */}
          <div className="grid grid-cols-2 gap-6">
            <div >
              <label className="block text-sm font-semibold text-gray-700 mb-2">דקות</label>
              <input
                type="number"
                min="0"
                max="59"
                value={generalSettings?.minutes.toLocaleString() ?? 0}
                onChange={(e) => updateGeneralSettings({ minutes: Math.max(0, Math.min(59, Number(e.target.value))) })}
                className="w-full px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">שעות</label>
              <input
                type="number"
                min="0"
                max="23"
                value={generalSettings?.hours.toLocaleString() ?? 0}
                onChange={(e) => updateGeneralSettings({ hours: Math.max(0, Math.min(23, Number(e.target.value))) })}
                className="w-full px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
              />
            </div>
          </div>

          {/* תצוגת חישוב - בצד שמאל */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 min-w-[300px]">
            <div className="flex items-center gap-6 justify-center">
              <div className="text-center hidden">
                <div className="text-sm text-blue-600 mb-1">סה״כ דקות</div>
                <div className="text-3xl font-bold text-blue-800">{totalMinutes.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-blue-600 mb-1">שעות עשרוניות</div>
                <div className="text-3xl font-bold text-blue-800">{decimalHours.toFixed(2)}</div>
              </div>
            </div>
            <p className="text-xs text-blue-600 text-center mt-3">
              מקסימום 23:59 | השעות מחושבות בדקות
            </p>
          </div>
        </div>
      </div>

      {/* היקף משרה מקצועי חודשי */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">הגדרת היקף שעות עבודה לפרויקט ולמשימות מקצועיות  </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              היקף חודשי (שעות)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={generalSettings?.monthlyJobScopeHours ?? 0}
              onChange={(e) => updateGeneralSettings({ monthlyJobScopeHours: Number(e.target.value) })}
              className="w-full px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
            />
          </div>
          
          <div className="text-sm text-gray-600 bg-blue-50 border-2 border-blue-200 rounded-lg p-4 min-w-[300px]">
            <div className="font-semibold text-blue-800 mb-1">💡 הערה</div>
            <div> היקף משרה מלאה בישראל היא <strong className="text-blue-900">{MONTHLY_HOURS_BASE} שעות</strong> חודשיות</div>
          </div>
        </div>
      </div>

      {/* עלות שעת עבודה ממוצעת - עם חישוב בצד */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">עלות שעת עבודה ממוצעת (₪)</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
          {/* עלות + רווח */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">עלות שעה (₪)</label>
              <input
                type="number"
                min="0"
                value={generalSettings?.workingHourCost ?? 0}
                onChange={(e) => updateGeneralSettings({ workingHourCost: Number(e.target.value) })}
                className="w-full px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">אחוז רווח רצוי (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={generalSettings?.profitPercentage ?? 0}
                onChange={(e) => updateGeneralSettings({ profitPercentage: Number(e.target.value) })}
                className="w-full px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
              />
            </div>
          </div>

          {/* תצוגת עלות סופית - בצד שמאל */}
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-6 min-w-[300px]">
            <div className="text-center">
              <div className="text-sm text-emerald-700 mb-2">שיכלול עלות שעת עבודה כולל רווח</div>
              <div className="text-5xl font-bold text-emerald-800 mb-2">
                ₪{costWithProfit.toFixed(2)}
              </div>
              <div className="text-sm text-emerald-600">
                (₪{generalSettings?.workingHourCost ?? 0} + {generalSettings?.profitPercentage ?? 0}% רווח)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* תצוגת עבודה - אחד ליד השני */}
      <div className="hidden bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">תצוגת עבודה</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* שעות עבודה */}
          <label className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            generalSettings?.displayMode === 1
              ? 'border-emerald-500 bg-white shadow-sm' 
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}>
            <input
              type="radio"
              name="displayMode"
              value="hours"
              checked={generalSettings?.displayMode === 1}
              onChange={() => updateGeneralSettings({ displayMode: 1 })}
              className="w-5 h-5 text-emerald-500 cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-base font-semibold text-gray-800">שעות עבודה</span>
              <p className="text-xs text-gray-500 mt-1">תצוגה על פי שעות</p>
            </div>
          </label>
          
          {/* ימי עבודה */}
          <label className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            generalSettings?.displayMode === 2
              ? 'border-emerald-500 bg-white shadow-sm' 
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}>
            <input
              type="radio"
              name="displayMode"
              value="days"
              checked={generalSettings?.displayMode === 2}
              onChange={() => updateGeneralSettings({ displayMode: 2 })}
              className="w-5 h-5 text-emerald-500 cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-base font-semibold text-gray-800">ימי עבודה</span>
              <p className="text-xs text-gray-500 mt-1">תצוגה על פי ימי עבודה</p>
            </div>
          </label>
        </div>
      </div>

      {/* סגירה ובקשות חשבון */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">סגירה ובקשות חשבון</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <label className="flex items-center gap-4 p-4 border-2 border-gray-300 rounded-lg cursor-pointer transition-all hover:border-gray-400 bg-white">
            <input
              type="checkbox"
              checked={generalSettings?.billRequestSent ?? false}
              onChange={(e) => updateGeneralSettings({ billRequestSent: e.target.checked })}
              className="w-5 h-5 text-emerald-500 cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-800">סגור משימה בשינוי סטטוס להושלם</span>
          </label>

          <label className="flex items-center gap-4 p-4 border-2 border-gray-300 rounded-lg cursor-pointer transition-all hover:border-gray-400 bg-white">
            <input
              type="checkbox"
              checked={generalSettings?.closedByStatusChange ?? false}
              onChange={(e) => updateGeneralSettings({ closedByStatusChange: e.target.checked })}
              className="w-5 h-5 text-emerald-500 cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-800">שלח בקשה להגשת חשבון בסגירת משימות</span>
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