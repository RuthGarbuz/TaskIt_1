import { useState } from 'react';
import { X, AlertCircle, Clock, User, Trash2, Plus } from 'lucide-react';
import type { Task, CurrentView } from '../../types/index';

interface TaskCardProps {
  task: Task;
  onClose: () => void;
  onUpdate?: (updatedTask: Task) => void;
  viewMode: CurrentView;
}

export default function TaskCard({ task, onClose, onUpdate, viewMode }: TaskCardProps) {
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [newReceiver, setNewReceiver] = useState('');

  const canEditFull = viewMode === 'allTasks';
  const canEditStatus = viewMode === 'myTasks' || canEditFull;

  const availableEmployees = ['Itzik', 'מיכל', 'יוסי', 'שרה', 'רון', 'דני'];

  const handleSave = () => {
    if (onUpdate) onUpdate(editedTask);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      onClose();
    }
  };

  const addReceiver = () => {
    if (newReceiver && !editedTask.receivers.includes(newReceiver)) {
      setEditedTask({ ...editedTask, receivers: [...editedTask.receivers, newReceiver] });
      setNewReceiver('');
    }
  };

  const removeReceiver = (receiver: string) => {
    setEditedTask({ ...editedTask, receivers: editedTask.receivers.filter(r => r !== receiver) });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-700 border-green-300';
      case 'inProgress': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'done': return 'הושלם';
      case 'inProgress': return 'בביצוע';
      default: return 'לביצוע';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'גבוהה';
      case 'medium': return 'בינונית';
      default: return 'נמוכה';
    }
  };

  const safeConvertToInputDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const convertToDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // תאריך יצירה ועדכון — mock אם לא קיים
  const createdAt = (task as any).createdAt ?? task.date ?? '-';
  const updatedAt = (task as any).updatedAt ?? '-';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      {/* Fixed modal with internal scroll — same width on both sides */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* ── Header (fixed) ── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-lg">כרטיס משימה - {editedTask.stage}</span>
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
                  value={editedTask.status}
                  onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as any })}
                  className={`w-full px-3 py-2 rounded-lg border-2 font-semibold text-sm focus:ring-2 focus:ring-emerald-500 cursor-pointer ${getStatusColor(editedTask.status)}`}
                >
                  <option value="todo">לביצוע</option>
                  <option value="inProgress">בביצוע</option>
                  <option value="done">הושלם</option>
                </select>
              ) : (
                <div className={`px-3 py-2 rounded-lg border-2 font-semibold text-center text-sm ${getStatusColor(editedTask.status)}`}>
                  {getStatusText(editedTask.status)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">דחיפות</label>
              {canEditFull ? (
                <select
                  value={editedTask.urgency}
                  onChange={(e) => setEditedTask({ ...editedTask, urgency: e.target.value as any })}
                  className={`w-full px-3 py-2 rounded-lg border-2 font-semibold text-sm cursor-pointer ${getUrgencyColor(editedTask.urgency)}`}
                >
                  <option value="high">גבוהה</option>
                  <option value="medium">בינונית</option>
                  <option value="low">נמוכה</option>
                </select>
              ) : (
                <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 font-semibold text-sm ${getUrgencyColor(editedTask.urgency)}`}>
                  <AlertCircle size={16} />
                  <span>{getUrgencyText(editedTask.urgency)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">תלוי בשלב</label>
              {canEditFull ? (
                <select
                  value={editedTask.dependsOnStage ? 'yes' : 'no'}
                  onChange={(e) => setEditedTask({ ...editedTask, dependsOnStage: e.target.value === 'yes' })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-semibold text-sm cursor-pointer"
                >
                  <option value="yes">כן</option>
                  <option value="no">לא</option>
                </select>
              ) : (
                <div className={`px-3 py-2 rounded-lg border-2 text-center font-semibold text-sm ${
                  editedTask.dependsOnStage ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {editedTask.dependsOnStage ? 'כן' : 'לא'}
                </div>
              )}
            </div>
          </div>

          {/* תאריכים, שעות, יוצר */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <Clock size={14} className="text-emerald-500" />
                מתאריך
              </label>
              {canEditFull ? (
                <input
                  type="date"
                  value={safeConvertToInputDate(editedTask.startDate || editedTask.date)}
                  onChange={(e) => setEditedTask({ ...editedTask, startDate: convertToDisplayDate(e.target.value) })}
                  className="w-full px-2 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                />
              ) : (
                <div className="px-2 py-2 bg-gray-50 rounded-lg border border-gray-200 text-center font-semibold text-xs">
                  {editedTask.startDate || editedTask.date || '-'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
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
                <div className="px-2 py-2 bg-gray-50 rounded-lg border border-gray-200 text-center font-semibold text-xs">
                  {editedTask.endDate || '-'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">מספר שעות</label>
              <div className="px-2 py-2 bg-indigo-50 text-indigo-700 rounded-lg border-2 border-indigo-200 text-center font-bold text-xs">
                {editedTask.hoursEstimate}h
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <User size={14} className="text-purple-500" />
                יוצר המשימה
              </label>
              <div className="px-2 py-2 bg-purple-50 rounded-lg border border-purple-200 font-semibold text-xs text-center text-purple-700">
                {editedTask.sender}
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
                  {editedTask.project}
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
                  {(task as any).projectActive !== false ? '✓ פעיל' : '✗ לא פעיל'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1.5">נושא תכנון</label>
                <div className="px-3 py-2 bg-white rounded-lg border border-blue-200 text-sm font-semibold text-gray-800">
                  {editedTask.planning}
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
                {editedTask.receivers.length} עובדים
              </span>
            </h3>

            <div className="bg-white rounded-lg border-2 border-purple-200 overflow-hidden mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-purple-100 border-b-2 border-purple-200">
                    <th className="px-3 py-2 text-center font-bold text-purple-900">עובד</th>
                    <th className="px-3 py-2 text-center font-bold text-purple-900 border-l border-purple-200">אחוז התקדמות</th>
                    <th className="px-3 py-2 text-center font-bold text-purple-900 border-l border-purple-200">משימות שבוצעו</th>
                    <th className="px-3 py-2 text-center font-bold text-purple-900 border-l border-purple-200">זמינות במכולו</th>
                    <th className="px-3 py-2 text-center font-bold text-purple-900 border-l border-purple-200">יחידות שנוצרו</th>
                    {canEditFull && <th className="px-3 py-2 text-center font-bold text-purple-900 border-l border-purple-200 w-16">פעולות</th>}
                  </tr>
                </thead>
                <tbody>
                  {editedTask.receivers.map((receiver, idx) => (
                    <tr key={idx} className="border-b border-purple-100 hover:bg-purple-50 transition-colors">
                      <td className="px-3 py-2 text-center font-semibold border-l border-purple-100">{receiver}</td>
                      <td className="px-3 py-2 text-center border-l border-purple-100">
                        {canEditFull ? (
                          <input type="number" min="0" max="100" defaultValue="0"
                            className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500" />
                        ) : <span className="font-bold">0%</span>}
                      </td>
                      <td className="px-3 py-2 text-center border-l border-purple-100">
                        {canEditFull ? (
                          <input type="number" min="0" defaultValue="0"
                            className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500" />
                        ) : <span className="font-semibold">0</span>}
                      </td>
                      <td className="px-3 py-2 text-center border-l border-purple-100">
                        {canEditFull ? (
                          <input type="number" min="0" defaultValue="0"
                            className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500" />
                        ) : <span className="font-semibold">0</span>}
                      </td>
                      <td className="px-3 py-2 text-center border-l border-purple-100">
                        {canEditFull ? (
                          <input type="number" min="0" defaultValue="0"
                            className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500" />
                        ) : <span className="font-semibold">0</span>}
                      </td>
                      {canEditFull && (
                        <td className="px-2 py-2 text-center border-l border-purple-100">
                          <button onClick={() => removeReceiver(receiver)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-all" title="הסר עובד">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-gradient-to-r from-emerald-100 to-teal-100 font-bold border-t-2 border-emerald-300">
                    <td className="px-3 py-2 text-center text-emerald-900">סה"כ</td>
                    <td className="px-3 py-2 text-center text-emerald-900 border-l border-emerald-200">100%</td>
                    <td className="px-3 py-2 text-center text-emerald-900 border-l border-emerald-200">0</td>
                    <td className="px-3 py-2 text-center text-emerald-900 border-l border-emerald-200">0</td>
                    <td className="px-3 py-2 text-center text-emerald-900 border-l border-emerald-200">0</td>
                    {canEditFull && <td className="border-l border-emerald-200"></td>}
                  </tr>
                </tbody>
              </table>
            </div>

            {canEditFull && (
              <div className="flex gap-2 pt-2">
                <select value={newReceiver} onChange={(e) => setNewReceiver(e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-medium">
                  <option value="">בחר עובד להוספה...</option>
                  {availableEmployees.filter(emp => !editedTask.receivers.includes(emp)).map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
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