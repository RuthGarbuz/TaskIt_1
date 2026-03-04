import { useState } from 'react';
import { X, Plus, Users, Search } from 'lucide-react';
//import type { Employee } from '../Data/templatesData';
import { initialEmployees, type Employee } from '../Data/templatesData';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmployeeIds: number[];
  onSave: (employeeIds: number[]) => void;
  title: string; // "שלב X" או "משימה Y"
}

export default function EmployeeModal({ isOpen, onClose, selectedEmployeeIds, onSave, title }: EmployeeModalProps) {
  const [employees] = useState<Employee[]>(initialEmployees);
  const [selected, setSelected] = useState<number[]>(selectedEmployeeIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');

  if (!isOpen) return null;

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleEmployee = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(empId => empId !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  const handleAddNewEmployee = () => {
    if (newEmployeeName.trim()) {
      // כאן תוסיף לוגיקה להוספת עובד חדש למערכת
      alert(`הוספת עובד חדש: ${newEmployeeName}`);
      setNewEmployeeName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-purple-600" />
            <h2 className="text-lg font-bold text-gray-800">ניהול עובדים - {title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש עובד..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          {/* Selected Employees */}
          {selected.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-sm font-semibold text-purple-900 mb-2">
                עובדים נבחרים ({selected.length}):
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.map(id => {
                  const emp = employees.find(e => e.id === id);
                  return emp ? (
                    <div
                      key={id}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-purple-300"
                    >
                      <span className="text-sm font-medium">{emp.name}</span>
                      <button
                        onClick={() => toggleEmployee(id)}
                        className="p-0.5 hover:bg-red-100 rounded"
                      >
                        <X size={14} className="text-red-500" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Available Employees */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">
              עובדים זמינים:
            </div>
            <div className="space-y-2">
              {filteredEmployees.map(emp => (
                <div
                  key={emp.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selected.includes(emp.id)
                      ? 'bg-purple-50 border-purple-400'
                      : 'bg-white border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => toggleEmployee(emp.id)}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(emp.id)}
                    onChange={() => {}}
                    className="w-5 h-5 text-purple-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{emp.name}</div>
                    <div className="text-xs text-gray-500">עובד מס׳ {emp.id}</div>
                  </div>
                  {selected.includes(emp.id) && (
                    <div className="text-purple-600 font-semibold text-sm">✓ נבחר</div>
                  )}
                </div>
              ))}
            </div>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                לא נמצאו עובדים
              </div>
            )}
          </div>

          {/* Add New Employee */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              הוסף עובד חדש:
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewEmployee()}
                placeholder="שם העובד..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <button
                onClick={handleAddNewEmployee}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                הוסף
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selected.length} עובדים נבחרו
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm"
            >
              שמור שינויים
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}