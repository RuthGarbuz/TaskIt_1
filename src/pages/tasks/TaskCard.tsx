import { useEffect, useState } from 'react';
import { X, AlertCircle, Clock, User, Trash2, Plus } from 'lucide-react';
import type { EmployeeLink, SystemTable, TaskReview } from '../../Data/projectsData';
import { getEmployees, type EmployeeBasic } from '../../services/templatesSettingServices';
import { deleteTaskOrStageAsync, getEmployeeLinksAsync } from '../../services/taskService';

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
  const canEditFull = viewMode === 'allTasks';
  const canEditStatus = viewMode === 'myTasks' || canEditFull;

 // const availableEmployees = ['Itzik', 'מיכל', 'יוסי', 'שרה', 'רון', 'דני'];
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

  const handleSave = () => {
    if (onUpdate) onUpdate(editedTask, employeeLinks);
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      await deleteTaskOrStageAsync(editedTask.id, !editedTask.isPlanningSte);
      onClose();
    }
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
  const createdAt = task.creatDate ?? '-';
  const updatedAt = task.lastUpdate ?? '-';
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
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      {/* Fixed modal with internal scroll — same width on both sides */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* ── Header (fixed) ── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-lg">כרטיס משימה - {editedTask.name}</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all">
            <X size={22} className="text-white" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* תיאור המשימה */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-gray-700">תיאור המשימה</label>
              {/* תאריך יצירה ועדכון — קטן, לא לעריכה */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>נוצר: {createdAt}</span>
                {updatedAt !== '-' && <span>עודכן: {updatedAt}</span>}
              </div>
            </div>
            {canEditFull ? (
              <textarea
                value={editedTask.subject}
                onChange={(e) => setEditedTask({ ...editedTask, subject: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-sm"
                rows={3}
              />
            ) : (
              /* צמוד לצד שמאל */
              <div className="px-4 py-3 bg-gray-50 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-800 min-h-[80px] text-right">
                {editedTask.subject}
              </div>
            )}
          </div>

          {/* סטטוס, דחיפות, תלוי בשלב */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">סטטוס</label>
              {canEditStatus ? (
                <select
                  value={String(statuses.find(status => status.name === editedTask.statusName)?.id ?? editedTask.statuID ?? 0)}
                  onChange={(e) => {
                  const selectedId = Number(e.target.value);
                  const selectedStatus = statuses.find(status => status.id === selectedId);
                  const selectedName = selectedStatus?.name ?? editedTask.statusName;
                  setEditedTask({
                    ...editedTask,
                    statuID: selectedId,
                    statusName: selectedName
                  });
                  }}
                  className="w-full px-3 py-2 rounded-lg border-2 font-semibold text-sm focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  style={getStatusColorByKey(task.statuID ?? 0)}

                >
                  {editedTask.statuID === 0 && !statuses.some(status => status.name === editedTask.statusName) && (
                  <option value="0">{editedTask.statusName}</option>
                  )}
                  {statuses.map(status => (
                  <option key={status.id} value={String(status.id)}>
                    {status.name}
                  </option>
                  ))}
                </select>
              ) : (
                <div className={`px-3 py-2 rounded-lg border-2 font-semibold text-center text-sm ${getStatusColor(editedTask.statusName)}`}>
                  {editedTask.statusName}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">דחיפות</label>
              {canEditFull ? (
                <select
                  value={editedTask.urgencyID ?? 0}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const selectedPriority = priorities.find(priority => priority.id === selectedId);
                    const selectedName = selectedPriority?.name ?? editedTask.urgencyName;
                    setEditedTask({
                      ...editedTask,
                      urgencyID: selectedId,
                      urgencyName: selectedName
                    });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border-2 font-semibold text-sm cursor-pointer ${getUrgencyColor(editedTask.urgencyName)}`}
                >
                  {priorities.map(priority => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
                  ))}
                </select>
              ) : (
                <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 font-semibold text-sm ${getUrgencyColor(editedTask.urgencyName)}`}>
                  <AlertCircle size={16} />
                  <span>{editedTask.urgencyName}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">תלוי בשלב</label>
              {canEditFull ? (
                <select
                  value={editedTask.dependsOnStepID ? 'yes' : 'no'}
                  onChange={(e) => setEditedTask({ ...editedTask, dependsOnStepID: e.target.value === 'yes' })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-semibold text-sm cursor-pointer"
                >
                  <option value="yes">כן</option>
                  <option value="no">לא</option>
                </select>
              ) : (
                <div className={`px-3 py-2 rounded-lg border-2 text-center font-semibold text-sm ${
                  editedTask.dependsOnStepID ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {editedTask.dependsOnStepID ? 'כן' : 'לא'}
                </div>
              )}
            </div>
          </div>

          {/* תאריכים, שעות, יוצר */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <Clock size={14} className="text-emerald-500" />
                מתאריך
              </label>
              {canEditFull ? (
                <input
                  type="date"
                  value={safeConvertToInputDate(editedTask.startDate || editedTask.creatDate)}
                  onChange={(e) => setEditedTask({ ...editedTask, startDate: convertToDisplayDate(e.target.value) })}
                  className="w-full px-2 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                />
              ) : (
                <div className="px-2 py-2 bg-gray-50 rounded-lg border border-gray-200 text-center font-semibold text-xs ">
                  {(() => {
                    const iso = safeConvertToInputDate(editedTask.endDate);
                    return iso ? convertToDisplayDate(iso) : '-';
                  })()}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <Clock size={14} className="text-emerald-500" />
                עד תאריך
              </label>
              {canEditFull ? (
                <input
                  type="date"
                  value={safeConvertToInputDate(editedTask.endDate)}
                  onChange={(e) => setEditedTask({ ...editedTask, endDate: convertToDisplayDate(e.target.value) })}
                  className="w-full px-2 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                />
              ) : (
                <div className="px-2 py-2 bg-gray-50 rounded-lg border border-gray-200 text-center font-semibold text-xs ">
                  {(() => {
                     const iso = safeConvertToInputDate(editedTask.endDate);
                     return iso ? convertToDisplayDate(iso) : '-';
                   })()}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">מספר שעות</label>
              <div className="px-2 py-2 bg-indigo-50 text-indigo-700 rounded-lg border-2 border-indigo-200 text-center font-bold text-xs">
                {editedTask.workHours}h
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <User size={14} className="text-purple-500" />
                יוצר המשימה
              </label>
              <div className="px-2 py-2 bg-purple-50 rounded-lg border border-purple-200 font-semibold text-xs text-center text-purple-700">
                {editedTask.senderName}
              </div>
            </div>
          </div>

          {/* מידע כללי — read only, לא לעריכה */}
          <div className="bg-blue-50 rounded-xl p-5 border-2 border-blue-200">
            <h3 className="font-bold text-blue-900 mb-4 text-sm">מידע כללי</h3>
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1.5">שם פרויקט</label>
                <div className="px-3 py-2 bg-white rounded-lg border border-blue-200 text-sm font-semibold text-gray-800">
                  {editedTask.projectName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1.5">מספר פרויקט</label>
                <div className="px-3 py-2 bg-white rounded-lg border border-blue-200 text-sm font-semibold text-gray-800">
                  P-{editedTask.id.toString().padStart(4, '0')}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1.5">פרויקט פעיל</label>
                <div className="px-3 py-2 bg-white rounded-lg border border-blue-200 text-sm font-semibold text-gray-700">
                  {editedTask.isActive ? '✓ פעיל' : '✗ לא פעיל'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1.5">נושא תכנון</label>
                <div className="px-3 py-2 bg-white rounded-lg border border-blue-200 text-sm font-semibold text-gray-800">
                  {editedTask.planningSubjectName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1.5">מחלקה</label>
                <div className="px-3 py-2 bg-white rounded-lg border border-blue-200 text-sm font-medium text-gray-500">
                  לא הוגדר
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1.5">סוג פרויקט</label>
                <div className="px-3 py-2 bg-white rounded-lg border border-blue-200 text-sm font-medium text-gray-500">
                  לא הוגדר
                </div>
              </div>
            </div>
          </div>

          {/* סטטוס עובדים/שלבים/עבודות */}
          <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
            <h3 className="font-bold text-purple-900 mb-3 text-sm flex items-center justify-between">
              <span>סטטוס עובדים/שלבים/עבודות</span>
              <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-purple-200">
                {employeeLinks.filter(l => !l.isDeleted).length} עובדים
              </span>
            </h3>

            <div className="bg-white rounded-lg border-2 border-purple-200 overflow-hidden mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-purple-100 border-b-2 border-purple-200">
                    <th className="px-3 py-2 text-center font-bold text-purple-900">עובד</th>
                    <th className="px-3 py-2 text-center font-bold text-purple-900 border-l border-purple-200">אחוז </th>
                    <th className="px-3 py-2 text-center font-bold text-purple-900 border-l border-purple-200">שעות עבודה</th>
                    <th className="px-3 py-2 text-center font-bold text-purple-900 border-l border-purple-200">ימי עבודה</th>
                    <th className="px-3 py-2 text-center font-bold text-purple-900 border-l border-purple-200">משך עבודה</th>
                    {canEditFull && <th className="px-3 py-2 text-center font-bold text-purple-900 border-l border-purple-200 w-16">פעולות</th>}
                  </tr>
                </thead>
                <tbody>
                  {employeeLinks.filter(l => !l.isDeleted).map((link) => (
                    <tr key={link.employeeId} className="border-b border-purple-100 hover:bg-purple-50 transition-colors">
                      <td className="px-3 py-2 text-center font-semibold border-l border-purple-100">
                        {link.employeeName}
                      </td>
                      <td className="px-3 py-2 text-center border-l border-purple-100">
                        {canEditFull ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={link.percentage}
                            onChange={(e) => updateEmployeeLink(link.employeeId, { percentage: Number(e.target.value) })}
                            className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          />
                        ) : <span className="font-bold">{link.percentage}%</span>}
                      </td>
                      <td className="px-3 py-2 text-center border-l border-purple-100">
                        {canEditFull ? (
                          <input
                            type="number"
                            min="0"
                            value={link.workHours}
                            onChange={(e) => updateEmployeeLink(link.employeeId, { workHours: Number(e.target.value) })}
                            className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          />
                        ) : <span className="font-semibold">{link.workHours}</span>}
                      </td>
                      <td className="px-3 py-2 text-center border-l border-purple-100">
                        {canEditFull ? (
                          <input
                            type="number"
                            min="0"
                            value={link.workDays}
                            onChange={(e) => updateEmployeeLink(link.employeeId, { workDays: Number(e.target.value) })}
                            className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          />
                        ) : <span className="font-semibold">{link.workDays}</span>}
                      </td>
                      <td className="px-3 py-2 text-center border-l border-purple-100">
                        {canEditFull ? (
                          <input
                            type="number"
                            min="0"
                            value={link.duration}
                            onChange={(e) => updateEmployeeLink(link.employeeId, { duration: Number(e.target.value) })}
                            className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          />
                        ) : <span className="font-semibold">{link.duration}</span>}
                      </td>
                      {canEditFull && (
                        <td className="px-2 py-2 text-center border-l border-purple-100">
                          <button
                            onClick={() => removeReceiver(link.employeeId)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                            title="הסר עובד"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-gradient-to-r from-emerald-100 to-teal-100 font-bold border-t-2 border-emerald-300">
                    <td className="px-3 py-2 text-center text-emerald-900">סה"כ</td>
                    <td className="px-3 py-2 text-center text-emerald-900 border-l border-emerald-200">
                      {totals.percentage}%
                    </td>
                    <td className="px-3 py-2 text-center text-emerald-900 border-l border-emerald-200">
                      {totals.workHours}
                    </td>
                    <td className="px-3 py-2 text-center text-emerald-900 border-l border-emerald-200">
                      {totals.workDays}
                    </td>
                    <td className="px-3 py-2 text-center text-emerald-900 border-l border-emerald-200">
                      {totals.duration}
                    </td>
                    {canEditFull && <td className="border-l border-emerald-200"></td>}
                  </tr>
                </tbody>
              </table>
            </div>

            {canEditFull && (
              <div className="flex gap-2 pt-2">
                <select
                  value={newReceiver ? String(newReceiver.id) : ''}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    setNewReceiver(availableEmployees.find(emp => emp.id === selectedId) || null);
                  }}
                  className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                >
                  <option value="">בחר עובד להוספה...</option>
                  {availableEmployees.filter(emp => !(editedTask.receivers ?? []).includes(emp.name)).map(emp => (
                    <option key={emp.id} value={String(emp.id)}>{emp.name}</option>
                  ))}
                </select>
                <button onClick={addReceiver} disabled={!newReceiver}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-semibold text-sm">
                  <Plus size={18} />
                  הוסף
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer (fixed) ── */}
        <div className="flex-shrink-0 flex gap-3 px-6 py-4 border-t-2 border-gray-200 bg-white rounded-b-2xl">
          {canEditFull && (
            <button onClick={handleDelete}
              className="px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-bold transition-all text-sm flex items-center gap-2">
              <Trash2 size={18} />
              מחק
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-bold transition-all text-sm">
            ביטול
          </button>
          <button onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2 rounded-lg hover:from-emerald-600 hover:to-teal-600 font-bold transition-all shadow-lg text-sm">
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
}