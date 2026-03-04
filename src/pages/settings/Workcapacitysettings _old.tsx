import { useState } from 'react';
import { Plus, Trash2, Save, Users as UsersIcon } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  jobPercentage: number;
  monthlyHoursCapacity: number;
  isActive: boolean;
}

// רשימת עובדים זמינים במערכת
const AVAILABLE_EMPLOYEES = [
  'Itzik Z',
  'מעיין טוטו',
  'אור ירבקן',
  'נטלי מזרחי',
  'מיכל רזן',
  'יוסי כהן',
  'שרה לוי',
  'דני אבני',
  'רון פרץ'
];

export default function WorkCapacitySettings() {
  const [employees, setEmployees] = useState<Employee[]>([
    { id: 1, name: 'מעיין טוטו', jobPercentage: 80, monthlyHoursCapacity: 145, isActive: true },
    { id: 2, name: 'אור ירבקן', jobPercentage: 100, monthlyHoursCapacity: 182, isActive: true },
    { id: 3, name: 'נטלי מזרחי', jobPercentage: 75, monthlyHoursCapacity: 136.5, isActive: true }
  ]);

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    jobPercentage: 100,
    monthlyHoursCapacity: 182
  });

  // חישוב היקף שעות אוטומטי (8 שעות × 22 ימים × אחוז)
  const calculateMonthlyHours = (percentage: number): number => {
    return Math.round((8 * 22 * percentage / 100) * 10) / 10;
  };

  // עובדים שעדיין לא נוספו
  const availableEmployeesToAdd = AVAILABLE_EMPLOYEES.filter(
    emp => !employees.some(e => e.name === emp)
  );

  const handleAddEmployee = () => {
    if (newEmployee.name) {
      const employee: Employee = {
        id: Math.max(...employees.map(e => e.id), 0) + 1,
        ...newEmployee,
        isActive: true
      };
      setEmployees([...employees, employee]);
      setNewEmployee({ name: '', jobPercentage: 100, monthlyHoursCapacity: 182 });
    }
  };

  const handleUpdateEmployee = (id: number, field: keyof Employee, value: any) => {
    setEmployees(employees.map(emp => {
      if (emp.id === id) {
        // אם משנים אחוז משרה, חישוב אוטומטי של שעות
        if (field === 'jobPercentage') {
          const percentage = Math.max(0, Math.min(200, Number(value) || 0));
          return {
            ...emp,
            jobPercentage: percentage,
            monthlyHoursCapacity: calculateMonthlyHours(percentage)
          };
        }
        return { ...emp, [field]: value };
      }
      return emp;
    }));
  };

  const handleDeleteEmployee = (id: number) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק עובד זה?')) {
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  const handleNewEmployeePercentageChange = (percentage: number) => {
    const validPercentage = Math.max(0, Math.min(200, percentage));
    setNewEmployee({
      ...newEmployee,
      jobPercentage: validPercentage,
      monthlyHoursCapacity: calculateMonthlyHours(validPercentage)
    });
  };

  const handleEmployeeSelect = (employeeName: string) => {
    setNewEmployee({
      ...newEmployee,
      name: employeeName
    });
  };

  const handleSave = () => {
    console.log('שמירת היקף עבודה:', employees);
    alert('הנתונים נשמרו בהצלחה!');
  };

  const activeEmployees = employees.filter(e => e.isActive);
  const totalHours = activeEmployees.reduce((sum, e) => sum + e.monthlyHoursCapacity, 0);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon size={20} className="text-emerald-600" />
          <h3 className="text-lg font-bold text-gray-800">הגדרת היקף עבודה חודשי לעובד</h3>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold shadow-md text-sm"
        >
          <Save size={16} />
          שמור
        </button>
      </div>

      {/* טבלה */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="space-y-2">
          {/* כותרות */}
          <div className="grid grid-cols-[1fr_120px_150px_80px_60px] gap-3 px-3 py-2 text-sm font-bold text-gray-700 bg-blue-100 rounded-lg">
            <div className="text-right">עובד</div>
            <div className="text-right">אחוז משרה</div>
            <div className="text-right">היקף שעות חודשי</div>
            <div className="text-center">פעיל</div>
            <div></div>
          </div>

          {/* רשימת עובדים */}
          {employees.map((employee) => (
            <div key={employee.id} className="grid grid-cols-[1fr_120px_150px_80px_60px] gap-3 items-center bg-white p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-all">
              {/* שם */}
              <div className="px-3 py-2 text-sm font-medium bg-gray-50 border border-gray-300 rounded-lg">
                {employee.name}
              </div>
              
              {/* אחוז משרה */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={employee.jobPercentage}
                  onChange={(e) => handleUpdateEmployee(employee.id, 'jobPercentage', e.target.value)}
                  className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-600 font-medium">%</span>
              </div>
              
              {/* היקף שעות */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={employee.monthlyHoursCapacity}
                  onChange={(e) => handleUpdateEmployee(employee.id, 'monthlyHoursCapacity', Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-600">שע׳</span>
              </div>
              
              {/* פעיל */}
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={employee.isActive}
                  onChange={(e) => handleUpdateEmployee(employee.id, 'isActive', e.target.checked)}
                  className="w-5 h-5 text-emerald-600 cursor-pointer rounded"
                />
              </div>
              
              {/* מחיקה */}
              <button
                onClick={() => handleDeleteEmployee(employee.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {/* הוספת עובד חדש */}
          <div className="grid grid-cols-[1fr_120px_150px_80px_60px] gap-3 items-center bg-emerald-50 p-3 rounded-lg border-2 border-emerald-300">
            {/* Dropdown בחירת עובד */}
            <select
              value={newEmployee.name}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              className="px-3 py-2 text-sm border-2 border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
            >
              <option value="">בחר עובד להוספה...</option>
              {availableEmployeesToAdd.map((emp) => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
            
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="200"
                value={newEmployee.jobPercentage}
                onChange={(e) => handleNewEmployeePercentageChange(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm text-center border-2 border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-emerald-700 font-medium">%</span>
            </div>
            
            <div className="flex items-center gap-1 bg-emerald-100 px-2 py-2 rounded-lg">
              <span className="w-full text-sm text-center font-semibold text-emerald-800">
                {newEmployee.monthlyHoursCapacity}
              </span>
              <span className="text-sm text-emerald-700">שע׳</span>
            </div>
            
            <div className="flex justify-center">
              <div className="w-5 h-5 bg-emerald-300 rounded flex items-center justify-center">
                <span className="text-xs text-emerald-800 font-bold">✓</span>
              </div>
            </div>
            
            <button
              onClick={handleAddEmployee}
              disabled={!newEmployee.name}
              className="p-2 bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* הודעה אם אין עובדים זמינים */}
          {availableEmployeesToAdd.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-sm text-yellow-800 font-medium">
                ✓ כל העובדים במערכת כבר נוספו
              </p>
            </div>
          )}
        </div>

        {/* הסבר */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-blue-800">
            <strong>💡 חישוב אוטומטי:</strong> כאשר משנים את אחוז המשרה, היקף השעות החודשי מתעדכן אוטומטית
            לפי הנוסחה: <code className="bg-blue-100 px-1 rounded">8 שעות × 22 ימים × אחוז משרה</code>
          </p>
        </div>

        {/* סיכום */}
        <div className="bg-gradient-to-l from-emerald-50 to-teal-50 rounded-lg p-4 mt-3 border border-emerald-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">סה״כ עובדים</div>
              <div className="text-2xl font-bold text-emerald-700">
                {activeEmployees.length} <span className="text-sm font-normal text-gray-600">פעילים מתוך {employees.length}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">סה״כ היקף שעות חודשי</div>
              <div className="text-2xl font-bold text-teal-700">
                {totalHours.toFixed(1)} <span className="text-sm font-normal text-gray-600">שעות</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}