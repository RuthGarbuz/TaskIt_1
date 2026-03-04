import { useState, useEffect } from 'react';
import { Plus, Save, Users as UsersIcon, Search, X } from 'lucide-react';
import { getWorkCapacitySettings, updateEmployeeWorkCapacity, insertEmployee } from '../../../services/settingService';
import type { EmployeeWorkCapacityUpdate, EmployeeWorkingSetting } from '../../../types/settings';
import NewEmployeeModal from './NewEmployeeModal';
import MessageBox from '../../shared/MessageBox';



const MONTHLY_HOURS_BASE = 182; // קבוע - לא ניתן לשינוי

export default function WorkCapacitySettings() {
  const [employees, setEmployees] = useState<EmployeeWorkingSetting[]>([]);
  const [originalEmployees, setOriginalEmployees] = useState<EmployeeWorkingSetting[]>([]);
  const [monthlyHoursBase, setMonthlyHoursBase] = useState(MONTHLY_HOURS_BASE);
  const [isLoading, setIsLoading] = useState(true);
  const [messageBox, setMessageBox] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'success' | 'error' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'alert' });
 // const [isSaving, setIsSaving] = useState(false);

  // חישוב אוטומטי של שעות
  const calculateMonthlyHours = (percentage: number, baseHours: number = monthlyHoursBase): number => {
    return Math.round((baseHours * percentage / 100) * 10) / 10;
  };
const setNewEmployeeData = () => {
          setNewEmployee({ id: 0, firstName: '', lastName: '', idNumber: '', jobPercentage: 100, monthlyHoursCapacity: MONTHLY_HOURS_BASE, isActive: true });
};

  // Load work capacity settings from server
  const loadWorkCapacitySettings = async () => {
    try {
      setIsLoading(true);
      const data = await getWorkCapacitySettings();
      
      if (data) {
        setMonthlyHoursBase(data.monthlyJobScopeHours);
        
        // Transform API data to component format
        const transformedEmployees: EmployeeWorkingSetting[] = data.employees.map(emp => {
          const nameParts = emp.name.split(' ');
          return {
            id: emp.id,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            idNumber: emp.identityNum,
            jobPercentage: emp.workCapacityPercentage,
            monthlyHoursCapacity: calculateMonthlyHours(emp.workCapacityPercentage, data.monthlyJobScopeHours),
            isActive: emp.isActive
          };
        }); 
        setEmployees(transformedEmployees);
        setOriginalEmployees(JSON.parse(JSON.stringify(transformedEmployees))); // Deep copy
      }
    } catch (error) {
      console.error('Failed to fetch work capacity settings:', error);
      setMessageBox({
        isOpen: true,
        title: 'שגיאה',
        message: 'שגיאה בטעינת הגדרות היקף עבודה',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkCapacitySettings();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState<EmployeeWorkingSetting>({
    id: 0,
    firstName: '',
    lastName: '',
    idNumber: '',
    jobPercentage: 100,
    monthlyHoursCapacity: MONTHLY_HOURS_BASE,
    isActive: true
  });

  // סינון עובדים
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchQuery === '' || 
      emp.firstName.includes(searchQuery) || 
      emp.lastName.includes(searchQuery) ||
      emp.idNumber.includes(searchQuery);
    
    const matchesActive = activeFilter === 'all' || 
      (activeFilter === 'active' && emp.isActive) ||
      (activeFilter === 'inactive' && !emp.isActive);
    
    return matchesSearch && matchesActive;
  });

  const validateIdentity = (id: string): boolean => {
    // Allow "0000" as special case
    if (id === "0000") {
      return true;
    }

      // Check if ID is exactly 9 digits
    if (!/^\d{9}$/.test(id)) {
      setMessageBox({
        isOpen: true,
        title: 'מספר תעודת זהות לא תקין',
        message: 'מספר תעודת זהות חייב להכיל 9 ספרות',
        type: 'warning'
      });
      return false;
    }

    // Israeli ID validation algorithm (Luhn-like checksum)
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let digit = parseInt(id[i]);
      // Multiply by 1 or 2 based on position
      const multiplier = (i % 2) + 1;
      let result = digit * multiplier;
      
      // If result > 9, sum its digits
      if (result > 9) {
        result = Math.floor(result / 10) + (result % 10);
      }
      
      sum += result;
    }

    // Valid if sum is divisible by 10
    if (sum % 10 !== 0) {
      setMessageBox({
        isOpen: true,
        title: 'מספר תעודת זהות לא תקין',
        message: 'מספר תעודת זהות לא תקין',
        type: 'warning'
      });
      return false;
    }

    return true;
  };

  const handleAddEmployee = async () => {
    if (newEmployee.firstName.trim() && newEmployee.lastName.trim() && newEmployee.idNumber.trim()) {
      try {
        if(!validateIdentity(newEmployee.idNumber)) {
          return;
        }
        // Call API to insert employee
        const newId = await insertEmployee(newEmployee);
        
        if (newId) {
          // Reset form and close modal
          setNewEmployeeData();
          setShowAddModal(false);
          
          // Reload data from server to get updated list
          await loadWorkCapacitySettings();
          
          setMessageBox({
            isOpen: true,
            title: 'שמירה הצליחה',
            message: 'העובד נוסף בהצלחה!',
            type: 'success'
          });
        }

      } catch (error) {
        console.error('Failed to add employee:', error);
        setMessageBox({
          isOpen: true,
          title: 'שגיאה',
          message: 'שגיאה בהוספת העובד',
          type: 'error'
        });
      }
    }
  };
 
  const handleUpdateEmployee = (id: number, field: keyof EmployeeWorkingSetting, value: any) => {
   
    setEmployees(employees.map(emp => {
      if (emp.id === id) {
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
const handleSave = async () => {
    try {
    //  setIsSaving(true);
      
      // Find employees with changes
      const changedEmployees = employees.filter(emp => {
        const original = originalEmployees.find(orig => orig.id === emp.id);
        if (!original) return true; // New employee
        return original.jobPercentage !== emp.jobPercentage || 
               original.isActive !== emp.isActive;
      });
      
      if (changedEmployees.length === 0) {
        setMessageBox({
          isOpen: true,
          title: 'אין שינויים',
          message: 'אין שינויים לשמירה',
          type: 'warning'
        });
       // setIsSaving(false);
        return;
      }
      
      // Map to update format
      const employeeUpdates: EmployeeWorkCapacityUpdate[] = changedEmployees.map(emp => ({
        id: emp.id,
        workCapacityPercentage: emp.jobPercentage,
        isActive: emp.isActive,
      }));
      
      // Send to server
      const success = await updateEmployeeWorkCapacity(employeeUpdates);
      
      if (success) {
        // Update original employees after successful save
        setOriginalEmployees(JSON.parse(JSON.stringify(employees)));
        setMessageBox({
          isOpen: true,
          title: 'שמירה הצליחה',
          message: 'הנתונים נשמרו בהצלחה!',
          type: 'success'
        });
      } else {
        setMessageBox({
          isOpen: true,
          title: 'שגיאה',
          message: 'שגיאה בשמירת הנתונים',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Failed to save work capacity settings:', error);
      setMessageBox({
        isOpen: true,
        title: 'שגיאה',
        message: 'שגיאה בשמירת הנתונים',
        type: 'error'
      });
    } finally {
      // setIsSaving(false);
    }
  };

  const activeEmployees = employees.filter(e => e.isActive);
  const totalHours = activeEmployees.reduce((sum, e) => sum + e.monthlyHoursCapacity, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">טוען הגדרות...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <UsersIcon size={20} className="text-emerald-600 flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-bold text-gray-800">הגדרת תיקף עבודה חודשי לעובד</h3>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold shadow-md text-sm w-full sm:w-auto"
        >
          <Save size={16} />
          שמור
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם או ת״ז..."
            className="w-full pr-10 pl-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Active Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeFilter === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            הכל
          </button>
          <button
            onClick={() => setActiveFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeFilter === 'active'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            פעילים
          </button>
          <button
            onClick={() => setActiveFilter('inactive')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeFilter === 'inactive'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            לא פעילים
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 overflow-x-auto">
        <div className="min-w-[700px] space-y-2">
          {/* Headers */}
          <div className="grid grid-cols-[1fr_120px_150px_80px] gap-2 sm:gap-3 px-2 sm:px-3 py-2 text-xs sm:text-sm font-bold text-gray-700 bg-blue-100 rounded-lg">
            <div className="text-right">עובד</div>
            <div className="text-right">אחוז משרה</div>
            <div className="text-right">היקף שעות חודשי</div>
            <div className="text-center">פעיל</div>
          </div>

          {/* Employee List */}
          {filteredEmployees.map((employee) => (
            <div key={employee.id} className={`grid grid-cols-[1fr_120px_150px_80px] gap-2 sm:gap-3 items-center p-2 sm:p-3 rounded-lg border transition-all ${
              employee.isActive 
                ? 'bg-white border-gray-200 hover:shadow-sm' 
                : 'bg-gray-100 border-gray-300 opacity-60'
            }`}>
              {/* Name */}
              <div className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium bg-gray-50 border border-gray-300 rounded-lg">
                {employee.firstName} {employee.lastName}
              </div>
              
              {/* Job Percentage */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={employee.jobPercentage}
                  onChange={(e) => handleUpdateEmployee(employee.id, 'jobPercentage', e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs sm:text-sm text-gray-600 font-medium">%</span>
              </div>
              
              {/* Monthly Hours - Read Only */}
              <div className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-center font-semibold bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                {employee.monthlyHoursCapacity} שע׳
              </div>
              
              {/* Active Checkbox */}
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={employee.isActive}
                     onChange={(e) =>  setEmployees(employees.map(emp => emp.id === employee.id ? { ...emp, isActive: e.target.checked } : emp))}
                 // onChange={(e) => handleUpdateEmployee(employee.id, 'isActive', e.target.checked)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 cursor-pointer rounded"
                />
              </div>
            </div>
          ))}

          {/* Add Employee Button */}
          <div className="bg-emerald-50 p-3 rounded-lg border-2 border-emerald-300">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold text-sm transition-all"
            >
              <Plus size={18} />
              הוסף עובד חדש
            </button>
          </div>

          {/* No Results */}
          {filteredEmployees.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              לא נמצאו עובדים התואמים את החיפוש
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-yellow-800">
            <strong>⚠️ חישוב אוטומטי:</strong> כאשר משנים את אחוז המשרה, היקף השעות החודשי מתעדכן אוטומטית.
            <br />
            <strong>💡 היקף משרה חודשי:</strong> {monthlyHoursBase} שעות 
            <br />
            <strong>🔔 הערה חשובה:</strong> הפיכת עובד ללא פעיל תשפיע על העובד ב-MasterPlan
          </p>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-l from-emerald-50 to-teal-50 rounded-lg p-3 sm:p-4 mt-3 border border-emerald-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">סה״כ עובדים</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-700">
                {activeEmployees.length} <span className="text-xs sm:text-sm font-normal text-gray-600">פעילים מתוך {employees.length}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">סה״כ היקף שעות חודשי</div>
              <div className="text-xl sm:text-2xl font-bold text-teal-700">
                {totalHours.toFixed(1)} <span className="text-xs sm:text-sm font-normal text-gray-600">שעות</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      <NewEmployeeModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setNewEmployeeData(); }}
        onAdd={handleAddEmployee}
        newEmployee={newEmployee}
        setNewEmployee={setNewEmployee}
        calculateMonthlyHours={calculateMonthlyHours}
      />

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