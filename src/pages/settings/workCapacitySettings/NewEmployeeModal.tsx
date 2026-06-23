import type { EmployeeWorkingSetting } from '../../../types/settings';
import { SETTINGS_FIELD, SETTINGS_INFO_BLUE, SETTINGS_LABEL } from '../settingsTheme';
import NumberInput from '../../shared/NumberInput';

interface NewEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  newEmployee: EmployeeWorkingSetting;
  setNewEmployee: (employee: EmployeeWorkingSetting) => void;

  calculateMonthlyHours: (percentage: number) => number;
}

export default function NewEmployeeModal({
  isOpen,
  onClose,
  onAdd,
  newEmployee,
  setNewEmployee,
  calculateMonthlyHours,
}: NewEmployeeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div className="bg-emerald-500 px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-bold text-white">הוספת עובד חדש</h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className={`${SETTINGS_LABEL} font-semibold text-gray-700 dark:text-gray-200 mb-2`}>שם פרטי</label>
            <input
              type="text"
              value={newEmployee.firstName}
              onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
              className={`w-full ${SETTINGS_FIELD} border-2`}
              placeholder="הזן שם פרטי"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">שם משפחה</label>
            <input
              type="text"
              value={newEmployee.lastName}
              onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
            className={`w-full ${SETTINGS_FIELD} border-2`}
              placeholder="הזן שם משפחה"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">ת״ז</label>
            <input
              type="text"
              value={newEmployee.idNumber}
              onChange={(e) => setNewEmployee({ ...newEmployee, idNumber: e.target.value })}
            className={`w-full ${SETTINGS_FIELD} border-2`}
              placeholder="הזן מספר תעודת זהות"
              maxLength={9}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">אחוז משרה</label>
            <div className="flex items-center gap-2">
              <NumberInput
                integerOnly
                min={0}
                max={200}
                value={newEmployee.jobPercentage}
                onChange={v => setNewEmployee({ ...newEmployee, jobPercentage: v })}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center"
              />
              <span className="text-lg font-semibold text-gray-600">%</span>
            </div>
          </div>

          <div className={`${SETTINGS_INFO_BLUE} p-3 text-left`}>
            <p className="text-sm text-blue-800">
              <strong>היקף שעות חודשי:</strong> {calculateMonthlyHours(newEmployee.jobPercentage)} שעות
            </p>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-all text-gray-700 dark:text-gray-200"
          >
            ביטול
          </button>
          <button
            onClick={onAdd}
            disabled={!newEmployee.firstName || !newEmployee.lastName || !newEmployee.idNumber}
            className="flex-1 bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-all"
          >
            הוסף
          </button>
        </div>
      </div>
    </div>
  );
}
