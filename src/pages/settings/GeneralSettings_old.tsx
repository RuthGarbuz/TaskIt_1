



import { useState } from 'react';
import { Save } from 'lucide-react';
import { useGeneralSettings } from '../../hooks/useSettings';
import { initialGeneralSettings, validateGeneralSettings } from '../../Data/settingsData';

export default function GeneralSettings() {
  const { settings, updateSetting } = useGeneralSettings(initialGeneralSettings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // המרת שעות עשרוניות לשעות:דקות
  const hoursToHoursMinutes = (decimalHours: number): { hours: number; minutes: number } => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return { hours, minutes };
  };

  // המרת שעות:דקות לשעות עשרוניות
  const hoursMinutesToDecimal = (hours: number, minutes: number): number => {
    return hours + (minutes / 60);
  };

  // חישוב דקות כולל
  const totalMinutes = Math.round(settings.workHoursPerDay * 60);
  const currentHoursMinutes = hoursToHoursMinutes(settings.workHoursPerDay);

  const validate = () => {
    const validationErrors = validateGeneralSettings(settings);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      console.log('שמירת הגדרות:', settings);
      alert('ההגדרות נשמרו בהצלחה!');
    }
  };

  const handleHoursChange = (value: number) => {
    const hours = Math.max(0, Math.min(23, value));
    const newDecimal = hoursMinutesToDecimal(hours, currentHoursMinutes.minutes);
    updateSetting('workHoursPerDay', Math.min(23.983, newDecimal)); // 23:59 = 23.983
  };

  const handleMinutesChange = (value: number) => {
    const minutes = Math.max(0, Math.min(59, value));
    const newDecimal = hoursMinutesToDecimal(currentHoursMinutes.hours, minutes);
    updateSetting('workHoursPerDay', Math.min(23.983, newDecimal));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-lg font-bold text-gray-800">הגדרות כלליות</h3>

      {/* שעות עבודה ביום */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          הגדרת שעות עבודה ביום
        </label>
        
        <div className="grid grid-cols-2 gap-3 mb-2" dir="rtl">
          {/* דקות - עכשיו בצד ימין */}
          <div>
            <label className="block text-xs text-gray-600 mb-1 text-right">דקות</label>
            <input
              type="number"
              min="0"
              max="59"
              value={currentHoursMinutes.minutes}
              onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 0)}
              className={`w-full px-4 py-2 text-center text-lg font-bold border-2 rounded-lg focus:ring-2 focus:ring-emerald-500 ${
                errors.workHoursPerDay ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </div>

          {/* שעות - עכשיו בצד שמאל */}
          <div>
            <label className="block text-xs text-gray-600 mb-1 text-right">שעות</label>
            <input
              type="number"
              min="0"
              max="23"
              value={currentHoursMinutes.hours}
              onChange={(e) => handleHoursChange(parseInt(e.target.value) || 0)}
              className={`w-full px-4 py-2 text-center text-lg font-bold border-2 rounded-lg focus:ring-2 focus:ring-emerald-500 ${
                errors.workHoursPerDay ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </div>
        </div>

        {/* תצוגת דקות */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-800 font-medium">סה״כ דקות:</span>
            <span className="text-blue-900 font-bold text-lg">{totalMinutes} דקות</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-blue-800 font-medium">שעות עשרוניות:</span>
            <span className="text-blue-900 font-bold">{settings.workHoursPerDay.toFixed(2)} שעות</span>
          </div>
        </div>

        {errors.workHoursPerDay && (
          <p className="text-red-500 text-sm mt-1">{errors.workHoursPerDay}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">
          <strong>הערה:</strong> מקסימום 23:59 שעות ביום | השעות מחושבות בדקות
        </p>
      </div>

      {/* תצוגת זמני עבודה */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          תצוגת זמני עבודה
        </label>
        <div className="bg-gray-100 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              value="hours"
              checked={settings.displayMode === 'hours'}
              onChange={() => updateSetting('displayMode', 'hours')}
              className="w-5 h-5 text-emerald-500"
            />
            <div>
              <div className="font-medium text-gray-800">שעות עבודה</div>
              <div className="text-xs text-gray-600">תצוגה במספר שעות (לדוגמה: 16 שעות)</div>
            </div>
          </label>
        </div>
        <p className="text-gray-500 text-xs mt-2">
          תצוגת ימי עבודה תופעל בעדכון עתידי
        </p>
      </div>

      {/* אחוז רווח */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          אחוז רווח (%)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.profitPercentage}
            onChange={(e) => updateSetting('profitPercentage', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <input
            type="number"
            min="0"
            max="100"
            value={settings.profitPercentage}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              updateSetting('profitPercentage', Math.min(100, Math.max(0, val)));
            }}
            className="w-20 px-3 py-2 border-2 rounded-lg text-center font-bold border-gray-300"
          />
          <span className="text-gray-700 font-semibold">%</span>
        </div>
      </div>

      {/* עלות שעת עבודה */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          עלות שעת עבודה ממוצעת (₪)
        </label>
        <input
          type="number"
          min="0"
          step="10"
          value={settings.hourlyRate}
          onChange={(e) => updateSetting('hourlyRate', parseFloat(e.target.value) || 0)}
          className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-emerald-500 ${
            errors.hourlyRate ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.hourlyRate && (
          <p className="text-red-500 text-sm mt-1">{errors.hourlyRate}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">
          שעת עבודה ממוצעת לצורך חישוב עלויות פרויקט
        </p>
      </div>

      {/* כפתור שמירה */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold shadow-lg text-sm"
        >
          <Save size={18} />
          שמור הגדרות
        </button>
      </div>

      {/* תצוגת מידע */}
      <div className="bg-gradient-to-l from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-lg p-4">
        <h4 className="font-bold text-emerald-900 mb-2 text-sm">סיכום הגדרות</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-gray-600 mb-0.5">יום עבודה:</div>
            <div className="font-bold text-emerald-800">
              {currentHoursMinutes.hours}:{currentHoursMinutes.minutes.toString().padStart(2, '0')} שעות
            </div>
          </div>
          <div>
            <div className="text-gray-600 mb-0.5">רווח:</div>
            <div className="font-bold text-emerald-800">{settings.profitPercentage}%</div>
          </div>
          <div>
            <div className="text-gray-600 mb-0.5">עלות שעה ממוצעת:</div>
            <div className="font-bold text-emerald-800">₪{settings.hourlyRate}</div>
          </div>
          <div>
            <div className="text-gray-600 mb-0.5">עלות עם רווח:</div>
            <div className="font-bold text-teal-800">
              ₪{Math.round(settings.hourlyRate * (1 + settings.profitPercentage / 100))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}