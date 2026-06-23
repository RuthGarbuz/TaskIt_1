import { useState, useEffect, useMemo, useCallback } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { getEmployees, type EmployeeBasic } from '../../services/templatesSettingServices';
import type { SystemTable } from '../../Data/projectsData';
import type { EmployeeLink, LinkEmployeesToStageModalProps } from '../../Data/PlanningTemplates';
import { getTaskStatuses } from '../../services/taskService';
import MessageBox from './MessageBox';
import NumberInput from './NumberInput';
import SearchInput from './SearchInput';
import {
  MODAL_FIELD,
  MODAL_FOOTER,
  MODAL_LABEL,
  TASK_CTRL_BTN,
  TASK_TABLE_HEAD,
} from '../tasks/taskViewTheme';

const COMPLETED_STATUS_ID = 3;

const serializeEmployees = (list: EmployeeLink[]): string =>
  JSON.stringify(
    list
      .map((e) => ({
        id: e.id,
        linkId: e.linkId,
        employeeId: e.employeeId,
        employeeName: e.employeeName,
        percentage: e.percentage,
        workHours: e.workHours,
        workDays: e.workDays,
        duration: e.duration,
        statusId: e.statusId,
        isDeleted: Boolean(e.isDeleted),
      }))
      .sort((a, b) => a.id - b.id),
  );

export default function LinkEmployeesToStageModal({
  stageName,
  stageDuration,
  stageHours,
  hoursPerDay,
  statusId,
  itemType = 'stage',
  showHoursActualColumn = true,
  initialEmployees = [],
  onClose,
  onSave
}: LinkEmployeesToStageModalProps) {
  const [employees, setEmployees] = useState<EmployeeLink[]>(initialEmployees);
  const [editableStageHours, setEditableStageHours] = useState<number>(Math.max(0, Number(stageHours) || 0));
  const [editableHoursPerDay, setEditableHoursPerDay] = useState<number>(Math.max(0.1, Number(hoursPerDay) || 8));
  const [availableEmployees, setAvailableEmployees] = useState<EmployeeBasic[]>([]);
  const [statusOptions, setStatusOptions] = useState<SystemTable[]>([]);
  const [statusesLoaded, setStatusesLoaded] = useState(false);
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
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false);

  const initialSnapshot = useMemo(
    () => ({
      employeesJson: serializeEmployees(initialEmployees),
      stageHours: Math.max(0, Number(stageHours) || 0),
      hoursPerDay: Math.max(0.1, Number(hoursPerDay) || 8),
    }),
    [initialEmployees, stageHours, hoursPerDay],
  );

  const hasUnsavedChanges = useCallback((): boolean => {
    if (employees.some((e) => e.isNew || e.isModified || e.isDeleted)) return true;
    if (Math.abs(editableStageHours - initialSnapshot.stageHours) > 0.001) return true;
    if (Math.abs(editableHoursPerDay - initialSnapshot.hoursPerDay) > 0.001) return true;
    return serializeEmployees(employees) !== initialSnapshot.employeesJson;
  }, [employees, editableStageHours, editableHoursPerDay, initialSnapshot]);

  // ── colors based on itemType ───────────────────────────────────────────────
  const isTask = itemType === 'task';
  const headerGradient  = isTask ? 'from-purple-500 to-violet-600' : 'from-blue-500 to-indigo-600';
  const headerSubText   = isTask ? 'text-purple-100'               : 'text-blue-100';
  const rowHover        = isTask ? 'hover:bg-purple-50 dark:hover:bg-purple-900/25' : 'hover:bg-blue-50 dark:hover:bg-blue-900/25';
  const totalRowBg      = isTask ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-blue-100 dark:bg-blue-900/40';
  const totalTextColor  = isTask ? 'text-purple-700 dark:text-purple-200' : 'text-blue-700 dark:text-blue-200';
  const saveButtonColor = isTask ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600';
  const dropdownHover   = isTask ? 'hover:bg-purple-50 dark:hover:bg-purple-900/30 text-gray-800 dark:text-gray-100' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-800 dark:text-gray-100';
  const hoursOverflowTarget = isTask ? 'המשימה' : 'השלב';
  const isParentCompleted = statusId === COMPLETED_STATUS_ID;

  const showParentCompletedWarning = (message: string) => {
    setMessageBox({ isOpen: true, title: 'אזהרה', message, type: 'warning' });
  };

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
        onConfirm: () => { resolve(true);  closeMessageBox(); },
        onCancel:  () => { resolve(false); closeMessageBox(); }
      });
    });
    // useEffect(() => {
    //   const loadEmployeeLinks = async () => {
    //     try {
    //       const data = await getEmployeeLinksAsync(editedTask.id, !editedTask.isPlanningSte);
    //       setEmployeeLinks(data ?? []);
    //       setEditedTask(prev => ({
    //         ...prev,
    //         receivers: (data ?? []).map(d => d.employeeName)
    //       }));
    //     } catch (error) {
    //       console.error('Failed to load employee links:', error);
    //     }
    //   };
    //   loadEmployeeLinks();
    // }, [editedTask.id, editedTask.isPlanningSte]);
  
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await getEmployees();
        setAvailableEmployees(data);
      } catch (error) {
        console.error('Failed to load employees:', error);
        setErrorMessage('שגיאה בטעינת רשימת עובדים');
      }
    };
    loadEmployees();
  }, []);

  useEffect(() => {
    setEditableStageHours(Math.max(0, Number(stageHours) || 0));
  }, [stageHours]);

  useEffect(() => {
    setEditableHoursPerDay(Math.max(0.1, Number(hoursPerDay) || 8));
  }, [hoursPerDay]);

  useEffect(() => {
    let isMounted = true;
    const loadStatuses = async () => {
      try {
        const data = await getTaskStatuses();
        if (isMounted) {
          setStatusOptions(data ?? []);
        }
      } catch (error) {
        console.error('Error loading task statuses:', error);
        if (isMounted) {
          setStatusOptions([]);
        }
      } finally {
        if (isMounted) {
          setStatusesLoaded(true);
        }
      }
    };
    void loadStatuses();
    return () => {
      isMounted = false;
    };
  }, []);

  const defaultStatusIdFromList =
    statusOptions.find(s => s.isDefault)?.id ?? statusOptions[0]?.id ?? 1;

  const filteredEmployees = availableEmployees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !employees.find(e => e.employeeName === emp.name && !e.isDeleted)
  );

  // ── Totals (only non-deleted) ──────────────────────────────────────────────
  const totals = employees
    .filter(e => !e.isDeleted)
    .reduce(
      (acc, emp) => ({
        percentage: acc.percentage + emp.percentage,
        workHours: acc.workHours + emp.workHours,
        workDays: acc.workDays + emp.workDays,
        hoursActual: acc.hoursActual + (emp.hoursActual ?? 0),
      }),
      { percentage: 0, workHours: 0, workDays: 0, hoursActual: 0 },
    );

  // ── Add employee ───────────────────────────────────────────────────────────
  const addEmployee = (employee: EmployeeBasic) => {
    if (isParentCompleted) {
      showParentCompletedWarning(
        isTask
          ? 'לא ניתן להוסיף עובד כאשר המשימה הושלמה. ניתן לשנות את הסטטוס של המשימה כדי להוסיף.'
          : 'לא ניתן להוסיף עובד כאשר השלב הושלם. ניתן לשנות את הסטטוס של השלב כדי להוסיף.',
      );
      return;
    }
    if (!employee.name.trim()) { setErrorMessage('נא לבחור עובד'); return; }
    if (employees.find(e => e.employeeName === employee.name && !e.isDeleted)) {
      setErrorMessage('עובד זה כבר קיים ברשימה'); return;
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
      statusId: defaultStatusIdFromList,
      hoursActual: 0,
      isNew: true
    };
    setEmployees(prev => [...prev, newEmployee]);
    setSearchQuery('');
    setShowDropdown(false);
    setErrorMessage('');
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteEmployee = (id: number, linkId: number) => {
    setEmployees(prev => {
      if (linkId === 0) return prev.filter(emp => emp.id !== id);
      return prev.map(emp =>
        emp.id === id ? (emp.isNew ? emp : { ...emp, isDeleted: true }) : emp
      );
    });
  };

  // ── Update name ────────────────────────────────────────────────────────────
  const updateEmployeeId = (rowId: number, newEmployeeId: number) => {
    if (employees.find(e => e.id !== rowId && e.employeeId === newEmployeeId && !e.isDeleted)) {
      setErrorMessage('עובד זה כבר קיים ברשימה'); return;
    }
    const picked = availableEmployees.find(ae => ae.id === newEmployeeId);
    setEmployees(prev => prev.map(emp =>
      emp.id === rowId
        ? {
            ...emp,
            employeeId: newEmployeeId,
            employeeName: picked?.name ?? emp.employeeName,
            isModified: !emp.isNew,
          }
        : emp
    ));
    setErrorMessage('');
  };

  const employeeSelectOptions = (row: EmployeeLink) =>
    availableEmployees.filter(
      ae =>
        ae.id === row.employeeId ||
        !employees.some(e => !e.isDeleted && e.id !== row.id && e.employeeId === ae.id),
    );

  // ── Update percentage ──────────────────────────────────────────────────────
  const updatePercentage = (id: number, value: number) => {
    const newPercentage = Math.max(0, value);
    const otherSum = employees
      .filter(e => e.id !== id && !e.isDeleted)
      .reduce((sum, e) => sum + e.percentage, 0);

    if (otherSum + newPercentage > 100) {
      setErrorMessage('סה"כ אחוזים לא יכול לעבור 100%'); return;
    }
    setErrorMessage('');

    const calculatedHours = (editableStageHours * newPercentage) / 100;
    const calculatedDays  = calculatedHours / editableHoursPerDay;

    // ✅ עדכון רק של העובד הספציפי
    setEmployees(prev => prev.map(emp =>
      emp.id === id
        ? { ...emp, percentage: newPercentage, workHours: calculatedHours, workDays: calculatedDays, isModified: !emp.isNew }
        : emp
    ));
  };

  // ── Update work hours ──────────────────────────────────────────────────────
  const updateWorkHours = async (id: number, value: number) => {
    const newHours = Math.max(0, value);
    const otherHoursSum = employees
      .filter(e => e.id !== id && !e.isDeleted)
      .reduce((sum, e) => sum + e.workHours, 0);

    if (otherHoursSum + newHours > editableStageHours) {
      const yes = await openConfirm(
        `יש חריגה במספר השעות. שעות העובדים גדולים משעות ${hoursOverflowTarget} (${editableStageHours} שעות).\n\nהאם לעדכן את שעות ${hoursOverflowTarget}?`
      );
      if (!yes) return;

      const newStageHours = otherHoursSum + newHours;
      setEditableStageHours(newStageHours);

      // ✅ עדכון רק של העובד הספציפי, אחוזים מחושבים מחדש יחסית לשעות החדשות
      setEmployees(prev => prev.map(emp => {
        if (emp.isDeleted) return emp;
        if (emp.id === id) {
          return { ...emp, workHours: newHours, workDays: newHours / editableHoursPerDay, percentage: (newHours / newStageHours) * 100, isModified: !emp.isNew };
        }
        return { ...emp, percentage: (emp.workHours / newStageHours) * 100, isModified: !emp.isNew };
      }));
      setErrorMessage('');
      return;
    }

    const newPercentage = editableStageHours > 0 ? (newHours / editableStageHours) * 100 : 0;
    const newDays = newHours / editableHoursPerDay;

    // ✅ עדכון רק של העובד הספציפי
    setEmployees(prev => prev.map(emp =>
      emp.id === id
        ? { ...emp, workHours: newHours, workDays: newDays, percentage: newPercentage, isModified: !emp.isNew }
        : emp
    ));
    setErrorMessage('');
  };

  // ── Update work days ───────────────────────────────────────────────────────
  const updateWorkDays = async (id: number, value: number) => {
    const newDays = Math.max(0, value);
    const calculatedHours = newDays * editableHoursPerDay;
    const otherHoursSum = employees
      .filter(e => e.id !== id && !e.isDeleted)
      .reduce((sum, e) => sum + e.workHours, 0);

    if (otherHoursSum + calculatedHours > editableStageHours) {
      const yes = await openConfirm(
        `יש חריגה במספר השעות. שעות העובדים גדולים משעות ${hoursOverflowTarget} (${editableStageHours} שעות).\n\nהאם לעדכן את שעות ${hoursOverflowTarget}?`
      );
      if (!yes) return;

      const newStageHours = otherHoursSum + calculatedHours;
      setEditableStageHours(newStageHours);

      // ✅ עדכון רק של העובד הספציפי
      setEmployees(prev => prev.map(emp => {
        if (emp.isDeleted) return emp;
        if (emp.id === id) {
          return { ...emp, workDays: newDays, workHours: calculatedHours, percentage: (calculatedHours / newStageHours) * 100, isModified: !emp.isNew };
        }
        return { ...emp, percentage: (emp.workHours / newStageHours) * 100, isModified: !emp.isNew };
      }));
      setErrorMessage('');
      return;
    }

    const newPercentage = editableStageHours > 0 ? (calculatedHours / editableStageHours) * 100 : 0;

    // ✅ עדכון רק של העובד הספציפי
    setEmployees(prev => prev.map(emp =>
      emp.id === id
        ? { ...emp, workDays: newDays, workHours: calculatedHours, percentage: newPercentage, isModified: !emp.isNew }
        : emp
    ));
    setErrorMessage('');
  };

  // ── Update duration ────────────────────────────────────────────────────────
  const updateDuration = (id: number, value: number) => {
    const newDuration = Math.max(1, Math.min(value, stageDuration));
    setEmployees(prev => prev.map(emp =>
      emp.id === id ? { ...emp, duration: newDuration, isModified: !emp.isNew } : emp
    ));
  };

  const updateStatusId = (id: number, nextStatusId: number) => {
    if (isParentCompleted) {
      const emp = employees.find(e => e.id === id);
      const currentId =
        emp?.statusId != null
          ? emp.statusId
          : statusId != null
            ? statusId
            : defaultStatusIdFromList;
      if (nextStatusId !== currentId) {
        showParentCompletedWarning(
          isTask
            ? 'לא ניתן לשנות סטטוס עובד כל עוד המשימה הושלמה.'
            : 'לא ניתן לשנות סטטוס עובד כל עוד השלב הושלם.',
        );
        return;
      }
    }
    setEmployees(prev =>
      prev.map(emp =>
        emp.id === id ? { ...emp, statusId: nextStatusId, isModified: !emp.isNew } : emp
      ),
    );
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (totals.percentage > 100) {
      setErrorMessage('סה"כ אחוזים לא יכול לעבור 100%'); return;
    }
    const shouldClose = await onSave(employees, {
      stageHours: Math.max(0, Number(editableStageHours) || 0),
      hoursPerDay: Math.max(0.1, Number(editableHoursPerDay) || 8),
    });
    if (shouldClose === false) return;
    onClose();
  };

  const handleRequestClose = useCallback(() => {
    if (!hasUnsavedChanges()) {
      onClose();
      return;
    }
    setUnsavedPromptOpen(true);
  }, [hasUnsavedChanges, onClose]);

  const handleUnsavedConfirmSave = async () => {
    setUnsavedPromptOpen(false);
    await handleSave();
  };

  const handleUnsavedDiscard = () => {
    setUnsavedPromptOpen(false);
    onClose();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-6xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className={`bg-gradient-to-r ${headerGradient} px-6 py-4 rounded-t-xl flex items-center justify-between`}>
          <div>
            <h3 className="text-xl font-bold text-white">
              קישור עובדים ל{isTask ? 'משימה' : 'שלב'}
            </h3>
            <p className={`text-sm ${headerSubText}`}>
              {isTask ? 'משימה' : 'שלב'}: {stageName} • משך: {stageDuration} ימים • שעות: {parseFloat(editableStageHours.toFixed(2))}h
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 w-9 h-9 flex items-center justify-center font-bold text-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className={`text-sm ${MODAL_LABEL}`}>
              <span className="block mb-1 font-medium">שעות {isTask ? 'משימה' : 'שלב'}</span>
              <NumberInput
              disabled={true}
                min={0}
                step={0.01}
                value={editableStageHours}
                onChange={v => setEditableStageHours(Math.max(0, v))}
                className={`${MODAL_FIELD} text-right disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed`}
              />
            </label>
            <label className={`text-sm ${MODAL_LABEL}`}>
              <span className="block mb-1 font-medium">שעות ליום</span>
              <NumberInput
               disabled={true}
                min={0.1}
                step={0.1}
                value={editableHoursPerDay}
                onChange={v => setEditableHoursPerDay(Math.max(0.1, v))}
                className={`${MODAL_FIELD} text-right disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed`}
              />
            </label>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mx-6 mt-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300 text-sm font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <SearchInput
              value={searchQuery}
              disabled={isParentCompleted}
              onChange={v => {
                if (isParentCompleted) return;
                setSearchQuery(v);
                setShowDropdown(true);
                if (!v.trim()) setShowDropdown(false);
              }}
              onFocus={() => {
                if (isParentCompleted) {
                  showParentCompletedWarning(
                    isTask
                      ? 'לא ניתן להוסיף עובד כאשר המשימה הושלמה. ניתן לשנות את הסטטוס של המשימה כדי להוסיף.'
                      : 'לא ניתן להוסיף עובד כאשר השלב הושלם. ניתן לשנות את הסטטוס של השלב כדי להוסיף.',
                  );
                  return;
                }
                setShowDropdown(true);
              }}
              placeholder={isParentCompleted
                ? (isTask ? 'לא ניתן להוסיף — המשימה הושלמה' : 'לא ניתן להוסיף — השלב הושלם')
                : 'חפש עובד...'}
              iconSize={18}
              className={`border-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 ${isParentCompleted ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}`}
            />
            {showDropdown && filteredEmployees.length > 0 && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {filteredEmployees.map((emp) => (
                  <button key={emp.id} onClick={() => addEmployee(emp)}
                    className={`w-full text-right px-4 py-2 ${dropdownHover} transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0`}>
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
            <thead className={`${TASK_TABLE_HEAD} sticky top-0 z-10`}>
              <tr>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-200"> {isTask ? 'עובד למשימה' : 'עובד לשלב'}</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-200 min-w-[7rem]"> {isTask ? 'סטטוס עובד למשימה' : 'סטטוס עובד לשלב'}</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-200">
                  {isTask ? 'אחוז העובד במשימה' : 'אחוז העובד בשלב'}
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-200">שעות עבודה</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-200">ימי עבודה</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-200">משך זמן בימים</th>
                {showHoursActualColumn && (
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap">שעות שדווחו</th>
                )}
                <th className="px-3 py-2 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {employees.filter(emp => !emp.isDeleted).map(emp => (
                <tr key={emp.id} className={rowHover}>
                  <td className="px-3 py-2">
                    <select
                      value={emp.employeeId}
                      onChange={(e) => updateEmployeeId(emp.id, Number(e.target.value))}
                      className={`w-full px-2 py-1 ${MODAL_FIELD} text-sm font-semibold`}
                    >
                      {emp.employeeId > 0 &&
                        !availableEmployees.some(ae => ae.id === emp.employeeId) && (
                          <option value={emp.employeeId}>{emp.employeeName}</option>
                        )}
                      {employeeSelectOptions(emp).map(ae => (
                        <option key={ae.id} value={ae.id}>
                          {ae.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-2">
                    {!statusesLoaded ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">טוען סטטוסים…</span>
                    ) : statusOptions.length === 0 ? (
                      <span className="text-sm text-amber-700 dark:text-amber-300">לא נטענו סטטוסים</span>
                    ) : (
                      (() => {
                        const inList = (id: number | undefined) =>
                          id != null && statusOptions.some(s => s.id === id);
                        const resolvedId =
                          emp.statusId != null
                            ? emp.statusId
                            : statusId != null
                              ? statusId
                              : defaultStatusIdFromList;
                        const showOrphan = !inList(resolvedId);
                        return (
                          <select
                            value={resolvedId}
                            disabled={isParentCompleted}
                            title={isParentCompleted
                              ? (isTask ? 'לא ניתן לשנות סטטוס עובד כל עוד המשימה הושלמה' : 'לא ניתן לשנות סטטוס עובד כל עוד השלב הושלם')
                              : undefined}
                            onChange={e => updateStatusId(emp.id, Number(e.target.value))}
                            className={`w-full min-w-[6.5rem] max-w-[10rem] px-2 py-1 ${MODAL_FIELD} text-sm font-semibold ${isParentCompleted ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}`}
                          >
                            {showOrphan && (
                              <option value={resolvedId}>סטטוס #{resolvedId}</option>
                            )}
                            {statusOptions.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        );
                      })()
                    )}
                  </td>

                  {/* ✅ תיקון: emp.percentage במקום totals.percentage */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <NumberInput
                        value={emp.percentage}
                        onChange={v => updatePercentage(emp.id, v)}
                        className={`w-24 px-2 py-1 ${MODAL_FIELD} text-right`}
                        min={0} max={100} step={0.01}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
                    </div>
                  </td>

                  {/* ✅ תיקון: emp.workHours במקום totals.workHours */}
                  <td className="px-3 py-2">
                    <NumberInput
                      value={emp.workHours}
                      onChange={v => updateWorkHours(emp.id, v)}
                      className={`w-24 px-2 py-1 ${MODAL_FIELD} text-right`}
                      min={0} step={0.01}
                    />
                  </td>

                  {/* ✅ תיקון: emp.workDays במקום totals.workDays */}
                  <td className="px-3 py-2">
                    <NumberInput
                      value={emp.workDays}
                      onChange={v => updateWorkDays(emp.id, v)}
                      className={`w-24 px-2 py-1 ${MODAL_FIELD} text-right`}
                      min={0} step={0.01}
                    />
                  </td>

                  <td className="px-3 py-2">
                    <NumberInput
                      integerOnly
                      value={emp.duration}
                      onChange={v => updateDuration(emp.id, Math.floor(v) || 1)}
                      className={`w-20 px-2 py-1 ${MODAL_FIELD} text-right`}
                      min={1} max={stageDuration} step={1}
                    />
                  </td>

                  {showHoursActualColumn && (
                    <td className="px-3 py-2 text-right text-sm text-gray-800 dark:text-gray-200 tabular-nums">
                      {parseFloat((emp.hoursActual ?? 0).toFixed(2))}
                    </td>
                  )}

                  <td className="px-3 py-2 text-right">
                    <button onClick={() => deleteEmployee(emp.id, emp.linkId)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="מחק עובד">
                      <Trash2 size={16} />
                    </button>
                  </td>
                  
                </tr>
              ))}

              {/* ✅ שורת סה"כ — ימי עבודה מוצג פעם אחת */}
              <tr className={`${totalRowBg} font-bold text-gray-800 dark:text-gray-100`}>
                <td className="px-3 py-2 text-right">סה"כ</td>
                <td className="px-3 py-2 text-right text-gray-400 dark:text-gray-500">—</td>
                <td className="px-3 py-2 text-right">
                  <span className={totals.percentage > 100 ? 'text-red-600 dark:text-red-400' : totalTextColor}>
                    {parseFloat(totals.percentage.toFixed(2))}%
                  </span>
                </td>
                <td className={`px-3 py-2 text-right ${totalTextColor}`}>
                  {parseFloat(totals.workHours.toFixed(2))}
                </td>
                <td className={`px-3 py-2 text-right ${totalTextColor}`}>
                  {parseFloat(totals.workDays.toFixed(2))}
                </td>
                <td className="px-3 py-2 text-right text-gray-400 dark:text-gray-500">-</td>
                {showHoursActualColumn && (
                  <td className={`px-3 py-2 text-right tabular-nums ${totalTextColor}`}>
                    {parseFloat(totals.hoursActual.toFixed(2))}
                  </td>
                )}
                <td className="px-3 py-2"></td>
              </tr>
            </tbody>
          </table>

          {employees.filter(e => !e.isDeleted).length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              לא נוספו עובדים. חפש והוסף עובד ראשון למעלה.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${MODAL_FOOTER} px-6 py-4 rounded-b-xl flex justify-between items-center`}>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            💡 סה"כ אחוז העובדים יכול להיות קטן או שווה ל-100%
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRequestClose}
              className={`px-6 py-2 ${TASK_CTRL_BTN} font-semibold transition-all`}
            >
              ביטול
            </button>
            <button onClick={handleSave}
              className={`px-6 py-2 ${saveButtonColor} text-white rounded-lg font-semibold transition-all`}>
              שמור
            </button>
          </div>
        </div>
      </div>

      {showDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
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

      <MessageBox
        isOpen={unsavedPromptOpen}
        onClose={() => setUnsavedPromptOpen(false)}
        title="שמירת שינויים"
        message="האם לשמור שינויים"
        type="warning"
        confirmText="שמור"
        cancelText="המשך בלי לשמור"
        showCancel
        onConfirm={() => void handleUnsavedConfirmSave()}
        onCancel={handleUnsavedDiscard}
      />
    </div>
  );
}