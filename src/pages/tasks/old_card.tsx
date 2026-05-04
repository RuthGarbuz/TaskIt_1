import { useEffect, useState } from 'react';
import { X, AlertCircle, Clock, User, Trash2, Plus } from 'lucide-react';
import type { EmployeeLink, SystemTable, TaskReview } from '../../Data/projectsData';
import { getEmployees, type EmployeeBasic } from '../../services/templatesSettingServices';
import { deleteTaskOrStageAsync, getEmployeeLinksAsync } from '../../services/taskService';
import MessageBox from '../shared/MessageBox';

const WORK_HOURS_PER_DAY = 8.0;

interface TaskCardProps {
  task: TaskReview;
  onClose: () => void;
  onUpdate: (updatedTask: TaskReview, employeeLinks: EmployeeLink[]) => void;
  viewMode: 'myTasks' | 'allTasks';
  statuses: SystemTable[];
  priorities: SystemTable[];
}

export default function TaskCard({
  task,
  onClose,
  onUpdate,
  viewMode,
  statuses,
  priorities
}: TaskCardProps) {
  const [editedTask, setEditedTask] = useState<TaskReview>(task);
  const [newReceiver, setNewReceiver] = useState<EmployeeBasic | null>(null);
  const [availableEmployees, setAvailableEmployees] = useState<EmployeeBasic[]>([]);
  const [employeeLinks, setEmployeeLinks] = useState<EmployeeLink[]>([]);
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

  const showMessage = (
    message: string,
    title: string = 'הודעה',
    type: 'alert' | 'success' | 'error' | 'warning' = 'warning'
  ) => {
    setMessageBox({
      isOpen: true,
      title,
      message,
      type,
      confirmText: 'אישור'
    });
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
    const loadEmployeeLinks = async () => {
      try {
        const data = await getEmployeeLinksAsync(editedTask.id, !editedTask.isPlanningSte);
        setEmployeeLinks(data ?? []);
        setEditedTask(prev => ({
          ...prev,
          receivers: (data ?? []).map(d => d.employeeName)
        }));
      } catch (error) {
        console.error('Failed to load employee links:', error);
      }
    };
    loadEmployeeLinks();
  }, [editedTask.id, editedTask.isPlanningSte]);

  const updateEmployeeLink = (employeeId: number, patch: Partial<EmployeeLink>) => {
    setEmployeeLinks(prev =>
      prev.map(link =>
        link.employeeId === employeeId
          ? { ...link, ...patch, isModified: true }
          : link
      )
    );
  };

  const updateEmployeePercentage = (employeeId: number, value: number) => {
    const newPercentage = Math.max(0, value);

    const otherEmployees = employeeLinks.filter(link => !link.isDeleted && link.employeeId !== employeeId);
    const otherPercentagesSum = otherEmployees.reduce((sum, link) => sum + (link.percentage ?? 0), 0);

    if (otherPercentagesSum + newPercentage > 100) {
      showMessage('סה"כ אחוזים לא יכול לעבור 100%', 'אזהרה', 'warning');
      return;
    }

    const taskHours = Math.max(0, editedTask.workHours ?? 0);
    const calculatedHours = (taskHours * newPercentage) / 100;
    const calculatedDays = calculatedHours / WORK_HOURS_PER_DAY;

    setEmployeeLinks(prev => prev.map(link =>
      link.employeeId === employeeId
        ? {
            ...link,
            percentage: newPercentage,
            workHours: calculatedHours,
            workDays: calculatedDays,
            isModified: true
          }
        : link
    ));
  };

  const updateEmployeeWorkHours = async (employeeId: number, value: number) => {
    const newHours = Math.max(0, value);
    const taskHours = Math.max(0, editedTask.workHours ?? 0);

    const otherEmployees = employeeLinks.filter(link => !link.isDeleted && link.employeeId !== employeeId);
    const otherHoursSum = otherEmployees.reduce((sum, link) => sum + (link.workHours ?? 0), 0);

    if (otherHoursSum + newHours > taskHours) {
      const shouldUpdate = await openConfirm(
        `יש חריגה במספר השעות. שעות העובדים גדולים משעות המשימה (${taskHours} שעות).\n\nהאם לעדכן את שעות המשימה?`
      );

      if (!shouldUpdate) {
        return;
      }

      const newTaskHours = otherHoursSum + newHours;
      const newTaskDays = newTaskHours / WORK_HOURS_PER_DAY;
      const newPercentage = newTaskHours > 0 ? (newHours / newTaskHours) * 100 : 0;
      const newDays = newHours / WORK_HOURS_PER_DAY;

      setEditedTask(prev => ({ ...prev, workHours: newTaskHours, workDays: newTaskDays }));
      setEmployeeLinks(prev => prev.map(link => {
        if (link.employeeId === employeeId) {
          return {
            ...link,
            workHours: newHours,
            workDays: newDays,
            percentage: newPercentage,
            isModified: true
          };
        }

        const recalcPercentage = newTaskHours > 0 ? ((link.workHours ?? 0) / newTaskHours) * 100 : 0;
        return {
          ...link,
          percentage: recalcPercentage,
          isModified: true
        };
      }));
      return;
    }

    const newPercentage = taskHours > 0 ? (newHours / taskHours) * 100 : 0;
    const newDays = newHours / WORK_HOURS_PER_DAY;

    setEmployeeLinks(prev => prev.map(link =>
      link.employeeId === employeeId
        ? {
            ...link,
            workHours: newHours,
            workDays: newDays,
            percentage: newPercentage,
            isModified: true
          }
        : link
    ));
  };

  const updateEmployeeWorkDays = async (employeeId: number, value: number) => {
    const newDays = Math.max(0, value);
    const calculatedHours = newDays * WORK_HOURS_PER_DAY;
    const taskHours = Math.max(0, editedTask.workHours ?? 0);

    const otherEmployees = employeeLinks.filter(link => !link.isDeleted && link.employeeId !== employeeId);
    const otherHoursSum = otherEmployees.reduce((sum, link) => sum + (link.workHours ?? 0), 0);

    if (otherHoursSum + calculatedHours > taskHours) {
      const shouldUpdate = await openConfirm(
        `יש חריגה במספר השעות. שעות העובדים גדולים משעות המשימה (${taskHours} שעות).\n\nהאם לעדכן את שעות המשימה?`
      );

      if (!shouldUpdate) {
        return;
      }

      const newTaskHours = otherHoursSum + calculatedHours;
      const newTaskDays = newTaskHours / WORK_HOURS_PER_DAY;
      const newPercentage = newTaskHours > 0 ? (calculatedHours / newTaskHours) * 100 : 0;

      setEditedTask(prev => ({ ...prev, workHours: newTaskHours, workDays: newTaskDays }));
      setEmployeeLinks(prev => prev.map(link => {
        if (link.employeeId === employeeId) {
          return {
            ...link,
            workDays: newDays,
            workHours: calculatedHours,
            percentage: newPercentage,
            isModified: true
          };
        }

        const recalcPercentage = newTaskHours > 0 ? ((link.workHours ?? 0) / newTaskHours) * 100 : 0;
        return {
          ...link,
          percentage: recalcPercentage,
          isModified: true
        };
      }));
      return;
    }

    const newPercentage = taskHours > 0 ? (calculatedHours / taskHours) * 100 : 0;

    setEmployeeLinks(prev => prev.map(link =>
      link.employeeId === employeeId
        ? {
            ...link,
            workDays: newDays,
            workHours: calculatedHours,
            percentage: newPercentage,
            isModified: true
          }
        : link
    ));
  };

  const removeReceiver = (receiverId: number) => {
   
      const receiverName = availableEmployees.find(emp => emp.id === receiverId)?.name;
    setEmployeeLinks(prev =>
      prev.map(link =>
        link.employeeId === receiverId
          ? { ...link, isDeleted: true, isModified: true }
          : link
      )
    );
    setEditedTask(prev => ({
      ...prev,
      receivers: (prev.receivers ?? []).filter(r => r !== receiverName)
    }));
  };

  const addReceiver = () => {
    const currentReceivers = editedTask.receivers ?? [];
    if (newReceiver && !currentReceivers.includes(newReceiver.name)) {
      setEditedTask({ ...editedTask, receivers: [...currentReceivers, newReceiver.name] });
      setEmployeeLinks(prev => ([
        ...prev,
        {
          linkId: editedTask.id,
          id: 0,
          employeeId: newReceiver.id,
          employeeName: newReceiver.name,
          percentage: 0,
          workHours: 0,
          workDays: 0,
          duration: 0,
          statusId:editedTask.statuID ?? 0,
          isNew: true,
          isModified: true
        }
      ]));
      setNewReceiver(null);
    }
  };
  const isTaskClosed = editedTask.isClosed === true;
  const canEditFull = viewMode === 'allTasks' && !isTaskClosed;
  const canEditStatus = (viewMode === 'myTasks' || viewMode === 'allTasks') && !isTaskClosed;

 // const availableEmployees = ['Itzik', 'מיכל', 'יוסי', 'שרה', 'רון', 'דני'];
useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await getEmployees();
        setAvailableEmployees(data);
      } catch (error) {
        console.error('Failed to load employees:', error);
      } finally {
      }
    };
    loadEmployees();
  }, []);

  const handleSave = () => {
    if (onUpdate) onUpdate(editedTask, employeeLinks);
    onClose();
  };

  const handleDelete = async () => {
    const confirmed = await openConfirm('האם אתה בטוח שברצונך למחוק משימה זו?');
    if (!confirmed) return;

    await deleteTaskOrStageAsync(editedTask.id, !editedTask.isPlanningSte);
    onClose();
  };

  // const addReceiver = () => {
  //   const currentReceivers = editedTask.receivers ?? [];
  //   if (newReceiver && !currentReceivers.includes(newReceiver.name)) {
  //     setEditedTask({ ...editedTask, receivers: [...currentReceivers, newReceiver.name] });
  //     setNewReceiver(null);
  //   }
  // };

  // const removeReceiver = (receiver: string) => {
  //   const currentReceivers = editedTask.receivers ?? [];
  //   setEditedTask({ ...editedTask, receivers: currentReceivers.filter(r => r !== receiver) });
  // };

  const statusKeyFromName = (statusName: string) => {
    const value = statusName.toLowerCase();
    if (value.includes('done') || value.includes('הושלם') || value.includes('סגור')) return 'done';
    if (value.includes('progress') || value.includes('בביצוע')) return 'inProgress';
    return 'todo';
  };

  const urgencyKeyFromName = (urgencyName: string) => {
    const value = urgencyName.toLowerCase();
    if (value.includes('high') || value.includes('גבוה')) return 'high';
    if (value.includes('medium') || value.includes('בינונית')) return 'medium';
    return 'low';
  };

  const getStatusColor = (statusName: string) => {
    switch (statusKeyFromName(statusName)) {
      case 'done': return 'bg-green-100 text-green-700 border-green-300';
      case 'inProgress': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

 

  const getUrgencyColor = (urgencyName: string) => {
    switch (urgencyKeyFromName(urgencyName)) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };



  const safeConvertToInputDate = (dateStr?: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 10);
    }
    const parts = dateStr.split('/');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const convertToDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };
   const getStatusColorByKey = (statusId: number) => {
    const status = statuses.find(s => s.id === statusId);
    const color = status?.color ?? '';
   return color
      ? ({ color, stroke: color } as React.CSSProperties)
      : undefined;
  };
  // תאריך יצירה ועדכון — mock אם לא קיים

const activeLinks = employeeLinks.filter(l => !l.isDeleted);
  const totals = activeLinks.reduce(
    (acc, link) => ({
      percentage: acc.percentage + (link.percentage ?? 0),
      workHours: acc.workHours + (link.workHours ?? 0),
      workDays: acc.workDays + (link.workDays ?? 0),
      duration: acc.duration + (link.duration ?? 0)
    }),
    { percentage: 0, workHours: 0, workDays: 0, duration: 0 }
  );
  const formatNumberUpTo2 = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    const truncated = Math.trunc(value * 100) / 100;
    return Number.isInteger(truncated) ? String(truncated) : truncated.toFixed(2);
  };

  const [activeTab, setActiveTab] = useState<'info' | 'employees'>('info');
  const lbl = 'block text-xs font-semibold text-blue-700 mb-1.5';
  const readBox = 'px-3 py-2 bg-white rounded-lg border border-blue-200 text-sm font-semibold text-gray-800';
  const fmt = formatNumberUpTo2;

  // Render: use the new card markup (keeps all logic/state above)
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '90vh' }}>

          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 rounded-t-2xl flex items-center justify-between">
            <span className="text-white font-semibold text-sm">כרטיס משימה – {editedTask.name}</span>
            {task.creatDate && <span className="text-emerald-100 text-xs">נוצר: {task.creatDate}</span>}
            <button onClick={onClose} className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all">
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">תיאור המשימה</label>
                {canEditFull ? (
                  <textarea value={editedTask.subject} rows={3} onChange={e => setEditedTask({ ...editedTask, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white resize-none" />
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white min-h-[72px] leading-relaxed">{editedTask.subject}</div>
                )}
              </div>
              <div className="flex flex-col gap-2 pt-5 min-w-[110px]">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">יוצר המשימה</label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white">{editedTask.senderName}</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input type="checkbox" checked={editedTask.isClosed}
                    onChange={e => setEditedTask({ ...editedTask, isClosed: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500" />
                  <span className="text-sm font-semibold text-gray-700">סגור</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">סטטוס</label>
                {canEditStatus ? (
                  <select
                    value={String(statuses.find(s => s.name === editedTask.statusName)?.id ?? editedTask.statuID ?? 0)}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const name = statuses.find(s => s.id === id)?.name ?? editedTask.statusName;
                      setEditedTask({ ...editedTask, statuID: id, statusName: name });
                    }}
                    className="w-full px-3 py-2 rounded-lg border-2 font-medium cursor-pointer text-sm"
                    style={getStatusColorByKey(editedTask.statuID ?? 0)}
                  >
                    {editedTask.statuID === 0 && !statuses.some(s => s.name === editedTask.statusName) && (
                      <option value="0">{editedTask.statusName}</option>
                    )}
                    {statuses.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                  </select>
                ) : (
                  <div className={`${'px-3 py-2 rounded-lg border-2 font-medium text-center text-sm'} ${getStatusColor(editedTask.statusName)}`}>{editedTask.statusName}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">דחיפות</label>
                {canEditFull ? (
                  <select
                    value={editedTask.urgencyID ?? 0}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const name = priorities.find(p => p.id === id)?.name ?? editedTask.urgencyName;
                      setEditedTask({ ...editedTask, urgencyID: id, urgencyName: name });
                    }}
                    className={`w-full px-3 py-2 rounded-lg border-2 font-medium text-sm cursor-pointer ${getUrgencyColor(editedTask.urgencyName)}`}
                  >
                    {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : (
                  <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 font-medium text-sm ${getUrgencyColor(editedTask.urgencyName)}`}>
                    <AlertCircle size={12} />
                    <span>{editedTask.urgencyName}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">תלוי בשלב</label>
                <div className={`px-3 py-2 rounded-lg border-2 text-center font-medium text-sm ${editedTask.dependsOnStepID ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{editedTask.dependsOnStepID ? 'כן' : 'לא'}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                  <User size={14} className="text-purple-500" />
                  יוצר המשימה
                </label>
                <div className="px-2 py-2 bg-purple-50 rounded-lg border border-purple-200 font-semibold text-xs text-center text-purple-700">{editedTask.senderName}</div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">שעות עבודה</label>
                {canEditFull ? (
                  <input type="number" min="0" step="0.01" value={editedTask.workHours ?? 0} onChange={(e) => {
                    const h = Math.max(0, Number(e.target.value));
                    setEditedTask(prev => ({ ...prev, workHours: h, workDays: h / WORK_HOURS_PER_DAY }));
                    setEmployeeLinks(prev => prev.map(link => { const eh = h * (link.percentage ?? 0) / 100; return { ...link, workHours: eh, workDays: eh / WORK_HOURS_PER_DAY, isModified: true }; }));
                  }} className="w-full px-2 py-2 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center font-bold text-xs bg-indigo-50 text-indigo-700" />
                ) : (
                  <div className="px-2 py-2 bg-indigo-50 text-indigo-700 rounded-lg border-2 border-indigo-200 text-center font-bold text-xs">{editedTask.workHours}h</div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">ימי עבודה</label>
                {canEditFull ? (
                  <input type="number" min="0" step="0.001" value={editedTask.workDays !== undefined ? Number(editedTask.workDays).toFixed(3) : '0.000'} onChange={(e) => {
                    const d = Math.max(0, Number(e.target.value)); const h = d * WORK_HOURS_PER_DAY;
                    setEditedTask(prev => ({ ...prev, workDays: d, workHours: h }));
                    setEmployeeLinks(prev => prev.map(link => { const ed = d * (link.percentage ?? 0) / 100; return { ...link, workDays: ed, workHours: ed * WORK_HOURS_PER_DAY, isModified: true }; }));
                  }} className="w-full px-2 py-2 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center font-bold text-xs bg-emerald-50 text-emerald-700" />
                ) : (
                  <div className="px-2 py-2 bg-indigo-50 text-indigo-700 rounded-lg border-2 border-indigo-200 text-center font-bold text-xs">{editedTask.workDays}</div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">משך זמן</label>
                <div className="px-2 py-2 bg-indigo-50 text-indigo-700 rounded-lg border-2 border-indigo-200 text-center font-bold text-xs">{editedTask.duration}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><Clock size={14} className="text-emerald-500" />מתאריך</label>
                <div className="px-2 py-2 bg-gray-50 rounded-lg border border-gray-200 text-center font-semibold text-xs ">{(() => { const iso = safeConvertToInputDate(editedTask.startDate || editedTask.creatDate); return iso ? convertToDisplayDate(iso) : '-'; })()}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><Clock size={14} className="text-emerald-500" />עד תאריך</label>
                <div className="px-2 py-2 bg-gray-50 rounded-lg border border-gray-200 text-center font-semibold text-xs ">{(() => { const iso = safeConvertToInputDate(editedTask.endDate); return iso ? convertToDisplayDate(iso) : '-'; })()}</div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                {(['info', 'employees'] as const).map(tab => {
                  const labels: Record<string, string> = { info: 'מידע כללי', employees: 'עובדים' };
                  const isActive = activeTab === tab;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${isActive ? 'border-emerald-500 text-emerald-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      {labels[tab]}
                      {tab === 'employees' && (
                        <span className={`mr-1.5 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{activeLinks.length}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="p-4">
                {/* מידע כללי */}
                {activeTab === 'info' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className={lbl}>שם פרויקט</label><div className={readBox}>{editedTask.projectName}</div></div>
                    <div><label className={lbl}>מספר פרויקט</label><div className={readBox}>P-{editedTask.id.toString().padStart(4, '0')}</div></div>
                    <div><label className={lbl}>פרויקט פעיל</label><div className={readBox}>{editedTask.isActive ? '✓ פעיל' : '✗ לא פעיל'}</div></div>
                    <div><label className={lbl}>נושא תכנון</label><div className={readBox}>{editedTask.planningSubjectName}</div></div>
                    <div><label className={lbl}>מחלקה</label><div className={`${readBox} text-gray-400`}>לא הוגדר</div></div>
                    <div><label className={lbl}>סוג פרויקט</label><div className={`${readBox} text-gray-400`}>לא הוגדר</div></div>
                   
                  </div>
                )}

                {/* עובדים */}
                {activeTab === 'employees' && (
                  <>
                    <div className="rounded-lg border border-gray-200 overflow-hidden mb-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2 text-right font-medium text-gray-500">עובד</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500">אחוז</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500">שעות עבודה</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500">ימי עבודה</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500">משך עבודה</th>
                            {canEditFull && <th className="px-3 py-2 w-8" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {activeLinks.map(link => (
                            <tr key={link.employeeId} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2 font-medium text-gray-800">{link.employeeName}</td>
                              <td className="px-3 py-2 text-center">{canEditFull ? <input type="number" min="0" max="100" value={fmt(link.percentage)} onChange={e => updateEmployeePercentage(link.employeeId, Number(e.target.value))} className="w-16 px-2 py-1 text-center border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" /> : <span>{fmt(link.percentage)}%</span>}</td>
                              <td className="px-3 py-2 text-center">{canEditFull ? <input type="number" min="0" value={fmt(link.workHours)} onChange={e => updateEmployeeWorkHours(link.employeeId, Number(e.target.value))} className="w-16 px-2 py-1 text-center border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" /> : <span>{fmt(link.workHours)}</span>}</td>
                              <td className="px-3 py-2 text-center">{canEditFull ? <input type="number" min="0" value={fmt(link.workDays)} onChange={e => updateEmployeeWorkDays(link.employeeId, Number(e.target.value))} className="w-16 px-2 py-1 text-center border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" /> : <span>{fmt(link.workDays)}</span>}</td>
                              <td className="px-3 py-2 text-center">{canEditFull ? <input type="number" min="0" value={link.duration} onChange={e => { const v = Math.max(0, Number(e.target.value)); if (v > (editedTask.duration ?? 0)) { showMessage('משך זמן חייב להיות קטן או שווה למשך זמן המשימה', 'אזהרה'); return; } updateEmployeeLink(link.employeeId, { duration: v }); }} className="w-16 px-2 py-1 text-center border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" /> : <span>{link.duration}</span>}</td>
                              {canEditFull && (<td className="px-2 py-2 text-center"><button onClick={() => removeReceiver(link.employeeId)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"><Trash2 size={12} /></button></td>)}
                            </tr>
                          ))}
                          <tr className="bg-gray-50 border-t border-gray-200 font-medium text-gray-700">
                            <td className="px-3 py-2">סה"כ</td>
                            <td className="px-3 py-2 text-center">{fmt(totals.percentage)}%</td>
                            <td className="px-3 py-2 text-center">{fmt(totals.workHours)}</td>
                            <td className="px-3 py-2 text-center">{fmt(totals.workDays)}</td>
                            <td className="px-3 py-2 text-center">{totals.duration}</td>
                            {canEditFull && <td />}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {canEditFull && (
                      <div className="flex gap-2">
                        <select value={newReceiver ? String(newReceiver.id) : ''} onChange={e => setNewReceiver(availableEmployees.find(emp => emp.id === Number(e.target.value)) || null)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white">
                          <option value="">בחר עובד להוספה...</option>
                          {availableEmployees.filter(emp => !(editedTask.receivers ?? []).includes(emp.name)).map(emp => (<option key={emp.id} value={String(emp.id)}>{emp.name}</option>))}
                        </select>
                        <button onClick={addReceiver} disabled={!newReceiver} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 transition-all flex items-center gap-1.5 text-sm font-medium"><Plus size={14} /> הוסף</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex gap-3 px-6 py-4 border-t-2 border-gray-200 bg-white rounded-b-2xl">
            {canEditFull && (<button onClick={handleDelete} className="px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-bold transition-all text-sm flex items-center gap-2"><Trash2 size={18} />מחק</button>)}
            <button onClick={onClose} className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-bold transition-all text-sm">ביטול</button>
            <button onClick={handleSave} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2 rounded-lg hover:from-emerald-600 hover:to-teal-600 font-bold transition-all shadow-lg text-sm">שמירה</button>
          </div>
        </div>
      </div>
      <MessageBox isOpen={messageBox.isOpen} onClose={closeMessageBox} title={messageBox.title} message={messageBox.message} type={messageBox.type} confirmText={messageBox.confirmText ?? 'אישור'} cancelText={messageBox.cancelText ?? 'ביטול'} showCancel={messageBox.showCancel} onConfirm={messageBox.onConfirm} onCancel={messageBox.onCancel} />
    </>
  );
}