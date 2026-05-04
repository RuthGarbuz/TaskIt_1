import { useState, useEffect } from 'react';
import { Trash2, X, AlertTriangle, Search } from 'lucide-react';
import { getEmployees, type EmployeeBasic } from '../../services/templatesSettingServices';
import type { EmployeeLink, LinkEmployeesToStageModalProps } from '../../Data/PlanningTemplates';
import MessageBox from './MessageBox';



export default function LinkEmployeesToStageModal({
  stageName,
  stageDuration,
  stageHours,
  hoursPerDay,
  statusId,
  itemType = 'stage',
  initialEmployees = [],
  onClose,
  onSave
}: LinkEmployeesToStageModalProps) {
  const [employees, setEmployees] = useState<EmployeeLink[]>(initialEmployees);
  const [availableEmployees, setAvailableEmployees] = useState<EmployeeBasic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [messageBox, setMessageBox] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'success' | 'error' | 'warning';
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const closeMessageBox = () => {
    setMessageBox(prev => ({
      ...prev,
      isOpen: false,
      showCancel: false,
      onConfirm: undefined,
      onCancel: undefined
    }));
  };

  const openConfirm = (message: string, title: string = 'אישור'): Promise<boolean> =>
    new Promise(resolve => {
      setMessageBox({
        isOpen: true,
        title,
        message,
        type: 'warning',
        showCancel: true,
        confirmText: 'אישור',
        cancelText: 'ביטול',
        onConfirm: () => {
          resolve(true);
          closeMessageBox();
        },
        onCancel: () => {
          resolve(false);
          closeMessageBox();
        }
      });
    });

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await getEmployees();
        setAvailableEmployees(data);
      } catch (error) {
        console.error('Failed to load employees:', error);
        setErrorMessage('שגיאה בטעינת רשימת עובדים');
      } finally {
      }
    };
    loadEmployees();
  }, []);

  const filteredEmployees = availableEmployees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !employees.find(e => e.employeeName === emp.name)
  );

  // Calculate totals
  const totals = employees.reduce((acc, emp) => ({
    percentage: acc.percentage + emp.percentage,
    workHours: acc.workHours + emp.workHours,
    workDays: acc.workDays + emp.workDays,
  }), { percentage: 0, workHours: 0, workDays: 0 });

  const addEmployee = (employee: EmployeeBasic) => {
    if (!employee.name.trim()) {
      setErrorMessage('נא לבחור עובד');
      return;
    }

    if (employees.find(e => e.employeeName === employee.name)) {
      setErrorMessage('עובד זה כבר קיים ברשימה');
      return;
    }

    const newEmployee: EmployeeLink = {
      linkId: 0,
      id: -Date.now(),
      employeeId: employee.id,
      employeeName: employee.name.trim(),
      percentage: 0,
      workHours: 0,
      workDays: 0,
      duration: Math.max(1, stageDuration),
      statusId: statusId, // Assuming 0 is the default status for new links
      isNew: true
    };

    setEmployees([...employees, newEmployee]);
    setSearchQuery('');
    setShowDropdown(false);
    setErrorMessage('');
  };

  const deleteEmployee = (id: number, linkId: number) => {
    setEmployees(prev => {
      if (linkId === 0) {
      return prev.filter(emp => emp.id !== id);
      }

      return prev.map(emp =>
        emp.id === id ? (emp.isNew ? emp : { ...emp, isDeleted: true }) : emp
      );
    });
  };

  const updateEmployeeName = (id: number, newName: string) => {
    if (employees.find(e => e.employeeId !== id && e.employeeName === newName)) {
      setErrorMessage('עובד זה כבר קיים ברשימה');
      return;
    }

    setEmployees(employees.map(emp =>
      emp.id === id ? { ...emp, employeeName: newName, isModified: !emp.isNew } : emp
    ));
    setErrorMessage('');
  };

  const updatePercentage = (id: number, value: number) => {
    const newPercentage = Math.max(0, value);
    
    const otherEmployees = employees.filter(e => e.id !== id);
    const otherPercentagesSum = otherEmployees.reduce((sum, e) => sum + e.percentage, 0);
    
    if (otherPercentagesSum + newPercentage > 100) {
      setErrorMessage('סה"כ אחוזים לא יכול לעבור 100%');
      return;
    }

    setErrorMessage('');
    
    // NO ROUNDING - exact calculation
    const calculatedHours = (stageHours * newPercentage) / 100;
    const calculatedDays = calculatedHours / hoursPerDay;

    setEmployees(employees.map(emp =>
      emp.id === id ? {
        ...emp,
        percentage: newPercentage,
        workHours: calculatedHours,
        workDays: calculatedDays,
        isModified: !emp.isNew
      } : emp
    ));
  };

  const updateWorkDays = async (id: number, value: number) => {
    const newDays = Math.max(0, value);
    const calculatedHours = newDays * hoursPerDay;
    
    const otherEmployees = employees.filter(e => e.id !== id);
    const otherHoursSum = otherEmployees.reduce((sum, e) => sum + e.workHours, 0);
    
    if (otherHoursSum + calculatedHours > stageHours) {
      const shouldUpdate = await openConfirm(
        `יש חריגה במספר השעות. שעות העובדים גדולים משעות השלב (${stageHours} שעות).\n\nהאם לעדכן את שעות השלב?`
      );
      
      if (!shouldUpdate) {
        return;
      }
      
      const newStageHours = otherHoursSum + calculatedHours;
      const newPercentage = (calculatedHours / newStageHours) * 100;
      
      setEmployees(employees.map(emp => {
        if (emp.id === id) {
          return {
            ...emp,
            workDays: newDays,
            workHours: calculatedHours,
            percentage: newPercentage,
            isModified: !emp.isNew
          };
        } else {
          const recalcPercentage = (emp.workHours / newStageHours) * 100;
          return {
            ...emp,
            percentage: recalcPercentage,
            isModified: !emp.isNew
          };
        }
      }));
      
      setErrorMessage('');
      return;
    }

    const newPercentage = (calculatedHours / stageHours) * 100;

    setEmployees(employees.map(emp =>
      emp.id === id ? {
        ...emp,
        workDays: newDays,
        workHours: calculatedHours,
        percentage: newPercentage,
        isModified: !emp.isNew
      } : emp
    ));
    setErrorMessage('');
  };

  const updateWorkHours = async (id: number, value: number) => {
    const newHours = Math.max(0, value);
    
    const otherEmployees = employees.filter(e => e.id !== id);
    const otherHoursSum = otherEmployees.reduce((sum, e) => sum + e.workHours, 0);
    
    if (otherHoursSum + newHours > stageHours) {
      const shouldUpdate = await openConfirm(
        `יש חריגה במספר השעות. שעות העובדים גדולים משעות השלב (${stageHours} שעות).\n\nהאם לעדכן את שעות השלב?`
      );
      
      if (!shouldUpdate) {
        return;
      }
      
      const newStageHours = otherHoursSum + newHours;
      const newPercentage = (newHours / newStageHours) * 100;
      const newDays = newHours / hoursPerDay;
      
      setEmployees(employees.map(emp => {
        if (emp.id === id) {
          return {
            ...emp,
            workHours: newHours,
            workDays: newDays,
            percentage: newPercentage,
            isModified: !emp.isNew
          };
        } else {
          const recalcPercentage = (emp.workHours / newStageHours) * 100;
          return {
            ...emp,
            percentage: recalcPercentage,
            isModified: !emp.isNew
          };
        }
      }));
      
      setErrorMessage('');
      return;
    }

    const newPercentage = (newHours / stageHours) * 100;
    const newDays = newHours / hoursPerDay;

    setEmployees(employees.map(emp =>
      emp.id === id ? {
        ...emp,
        workHours: newHours,
        workDays: newDays,
        percentage: newPercentage,
        isModified: !emp.isNew
      } : emp
    ));
    setErrorMessage('');
  };

  const updateDuration = (id: number, value: number) => {
    const newDuration = Math.max(1, Math.min(value, stageDuration));
    
    setEmployees(employees.map(emp =>
      emp.id === id ? { ...emp, duration: newDuration, isModified: !emp.isNew } : emp
    ));
  };

  const handleSave = () => {
    if (totals.percentage > 100) {
      setErrorMessage('סה"כ אחוזים לא יכול לעבור 100%');
      return;
    }
    
    onSave(employees);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">
              קישור עובדים ל{itemType === 'stage' ? 'שלב' : 'משימה'}
            </h3>
            <p className="text-sm text-blue-100">
              {itemType === 'stage' ? 'שלב' : 'משימה'}: {stageName} • משך: {stageDuration} ימים • שעות: {stageHours}h
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 w-9 h-9 flex items-center justify-center font-bold text-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-600" />
            <span className="text-red-700 text-sm font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Add Employee with Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="חפש עובד..."
                  className="w-full pr-10 pl-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {/* <button
                onClick={() => searchQuery && addEmployee(searchQuery)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-all"
              >
                <Plus size={20} />
                הוסף עובד
              </button> */}
            </div>

            {/* Dropdown */}
            {showDropdown && filteredEmployees.length > 0 && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => addEmployee(emp)}
                    className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    {emp.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700">עובד</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700">
                  {itemType === 'stage' ? 'אחוז העובד בשלב' : 'אחוז העובד במשימה'}
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700">שעות עבודה</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700">ימי עבודה</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700">משך זמן (ימים)</th>
                <th className="px-3 py-2 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.filter(emp => !emp.isDeleted).map(emp => (
                <tr key={emp.id} className="hover:bg-blue-50">
                  <td className="px-3 py-2">
                    <select
                      value={emp.employeeName}
                      onChange={(e) => updateEmployeeName(emp.id, e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-semibold"
                    >
                      <option value={emp.employeeName}>{emp.employeeName}</option>
                        {availableEmployees
                        .filter(ae =>
                          !employees.find(
                          e => e.employeeName === ae.name && !e.isDeleted
                          ) || ae.name === emp.employeeName
                        )
                        .map(ae => (
                          <option key={ae.id} value={ae.name}>{ae.name}</option>
                        ))
                        }
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={parseFloat(totals.percentage.toFixed(2))}
                        onChange={(e) => updatePercentage(emp.id, parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={parseFloat(totals.workHours.toFixed(2))}
                      onChange={(e) => updateWorkHours(emp.id, parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={parseFloat(totals.workDays.toFixed(2))}
                      onChange={(e) => updateWorkDays(emp.id, parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                      min="0"
                      step="0.001"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={emp.duration}
                      onChange={(e) => updateDuration(emp.id, parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                      min="1"
                      max={stageDuration}
                      step="1"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => deleteEmployee(emp.id,emp.linkId)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="מחק עובד"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Totals Row */}
              <tr className="bg-blue-100 font-bold">
                <td className="px-3 py-2 text-right">סה"כ</td>
                <td className="px-3 py-2 text-right">
                  <span className={totals.percentage > 100 ? 'text-red-600' : 'text-blue-700'}>
                     {parseFloat(totals.percentage.toFixed(2))}%
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-blue-700">
                  {parseFloat(totals.workHours.toFixed(2))}
                </td>
                <td className="px-3 py-2 text-right text-blue-700">
                  {totals.workDays}
                   {parseFloat(totals.workDays.toFixed(2))}
                </td>
                <td className="px-3 py-2 text-right text-gray-400">-</td>
                <td className="px-3 py-2"></td>
              </tr>
            </tbody>
          </table>

          {employees.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              לא נוספו עובדים. חפש והוסף עובד ראשון למעלה.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl flex justify-between items-center">
          <div className="text-sm text-gray-600">
            💡 סה"כ אחוז העובדים יכול להיות קטן או שווה ל-100%
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition-all"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-all"
            >
              שמור
            </button>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowDropdown(false)}
        />
      )}

      <MessageBox
        isOpen={messageBox.isOpen}
        onClose={closeMessageBox}
        title={messageBox.title}
        message={messageBox.message}
        type={messageBox.type}
        confirmText={messageBox.confirmText ?? 'אישור'}
        cancelText={messageBox.cancelText ?? 'ביטול'}
        showCancel={messageBox.showCancel}
        onConfirm={messageBox.onConfirm}
        onCancel={messageBox.onCancel}
      />
    </div>
  );
}