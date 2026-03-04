import { useState } from 'react';
import { Clock, AlertCircle, Eye, MessageSquare, Send } from 'lucide-react';
import type { Task, CurrentView } from '../../types/index';
import { 
  getStatusColor, 
  getUrgencyColor, 
  getUrgencyText, 
  getInitials, 
  getAvatarColor 
} from '../../Data/tasksData';

interface TaskTableProps {
  tasks: Task[];
  currentView: CurrentView;
  onTaskComplete: (taskId: number) => void;
  onTaskStatusChange: (taskId: number, status: 'todo' | 'inProgress' | 'done') => void;
  onTaskUrgencyChange: (taskId: number, urgency: 'low' | 'medium' | 'high') => void;
  onTaskSubjectChange: (taskId: number, subject: string) => void;
  onTaskClick: (task: Task) => void;
}

export default function TaskTable({
  tasks,
  currentView,
  onTaskComplete,
  onTaskStatusChange,
  onTaskUrgencyChange,
  onTaskSubjectChange,
  onTaskClick,
}: TaskTableProps) {
  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingSubject, setEditingSubject] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTask, setChatTask] = useState<Task | null>(null);

  const startEditingSubject = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingSubject(task.subject);
  };

  const saveSubject = (taskId: number) => {
    if (editingSubject.trim()) {
      onTaskSubjectChange(taskId, editingSubject.trim());
    }
    setEditingTaskId(null);
    setEditingSubject('');
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingSubject('');
  };

  const handleOpenChat = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatTask(task);
    setShowChatModal(true);
  };

  const handleSendInvoiceRequest = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`שליחת בקשה להגשת חשבון עבור: ${task.subject}`);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1800px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-10">✓</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 min-w-[200px]">תיאור המשימה</th>

              {/* Chat - moved here, right after תיאור המשימה */}
              <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-16">Chat</th>

              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-32">שלב</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-36">נושא תכנון</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-28">פרויקט</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20">סטטוס</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20">דחיפות</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-24">שולח</th>
              {currentView === 'allTasks' && <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-24">מקבל</th>}
              <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-28">תאריך התחלה</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-28">תאריך סיום</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-20">תלוי בשלב</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-24">תקצוב שעות</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28">אחוז ניצול</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-20">חשבון</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <tr 
                key={task.id}
                onMouseEnter={() => setHoveredTaskId(task.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
                className="hover:bg-emerald-50 transition-colors relative group"
              >
                {/* Checkbox */}
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={task.completed || false}
                    onChange={() => onTaskComplete(task.id)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-500 cursor-pointer focus:ring-emerald-500" 
                  />
                </td>

                {/* תיאור המשימה */}
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  {currentView === 'allTasks' && editingTaskId === task.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingSubject}
                        onChange={(e) => setEditingSubject(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveSubject(task.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        className="flex-1 px-2 py-1 border border-emerald-500 rounded focus:ring-2 focus:ring-emerald-500 text-xs"
                        autoFocus
                      />
                      <button
                        onClick={() => saveSubject(task.id)}
                        className="px-2 py-1 bg-emerald-500 text-white rounded text-xs hover:bg-emerald-600"
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span 
                      onClick={currentView === 'allTasks' ? () => startEditingSubject(task) : undefined}
                      className={`text-xs font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'} ${currentView === 'allTasks' ? 'cursor-text hover:bg-gray-100' : ''} px-1 rounded`}
                    >
                      {task.subject}
                    </span>
                  )}
                </td>

                {/* Chat - moved here, right after תיאור המשימה */}
                <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleOpenChat(task, e)}
                    className="relative p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                    title="פתח צ'אט"
                  >
                    <MessageSquare size={14} />
                    {task.hasUnreadMessages && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                    )}
                  </button>
                </td>

                {/* שלב */}
                <td className="px-3 py-2">
                  <span className="inline-flex px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{task.stage}</span>
                </td>

                {/* נושא תכנון */}
                <td className="px-3 py-2">
                  <span className="text-xs text-gray-600">{task.planning}</span>
                </td>

                {/* פרויקט */}
                <td className="px-3 py-2">
                  <span className="text-xs text-gray-600">{task.project}</span>
                </td>

                {/* סטטוס */}
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={task.status}
                    onChange={(e) => onTaskStatusChange(task.id, e.target.value as any)}
                    className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer focus:ring-2 focus:ring-emerald-500 ${getStatusColor(task.status)}`}
                  >
                    <option value="todo">לביצוע</option>
                    <option value="inProgress">בביצוע</option>
                    <option value="done">הושלם</option>
                  </select>
                </td>

                {/* דחיפות */}
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  {currentView === 'allTasks' ? (
                    <select
                      value={task.urgency}
                      onChange={(e) => onTaskUrgencyChange(task.id, e.target.value as any)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer focus:ring-2 focus:ring-emerald-500 ${getUrgencyColor(task.urgency)}`}
                    >
                      <option value="high">גבוהה</option>
                      <option value="medium">בינונית</option>
                      <option value="low">נמוכה</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1">
                      <AlertCircle size={12} className={getUrgencyColor(task.urgency)} />
                      <span className={`text-xs font-medium ${getUrgencyColor(task.urgency)}`}>{getUrgencyText(task.urgency)}</span>
                    </div>
                  )}
                </td>

                {/* שולח */}
                <td className="px-3 py-2">
                  <span className="text-xs text-gray-600">{task.sender}</span>
                </td>

                {/* מקבל */}
                {currentView === 'allTasks' && (
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-0.5">
                      {task.receivers.slice(0, 2).map((receiver, idx) => (
                        <div key={idx} className={`w-5 h-5 rounded-full ${getAvatarColor(receiver)} flex items-center justify-center text-white text-[10px] font-bold ${idx > 0 ? '-mr-1' : ''} border-2 border-white`}>
                          {getInitials(receiver)}
                        </div>
                      ))}
                      {task.receivers.length > 2 && (
                        <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 text-[10px] font-bold -mr-1 border-2 border-white">
                          +{task.receivers.length - 2}
                        </div>
                      )}
                    </div>
                  </td>
                )}

                {/* תאריך התחלה */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-600">{task.startDate || task.date || '-'}</span>
                  </div>
                </td>

                {/* תאריך סיום */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-600">{task.endDate || '-'}</span>
                  </div>
                </td>

                {/* תלוי בשלב */}
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={task.dependsOnStage || false}
                    disabled
                    className="w-4 h-4 text-emerald-600 rounded cursor-not-allowed opacity-60"
                  />
                </td>

                {/* תקצוב שעות */}
                <td className="px-3 py-2">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                      {task.hoursEstimate || 0}h
                    </span>
                    {task.hoursActual !== undefined && task.hoursActual > 0 && (
                      <span className="text-[10px] text-gray-500">
                        ({task.hoursActual}h בפועל)
                      </span>
                    )}
                  </div>
                </td>

                {/* אחוז ניצול */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden min-w-[50px]">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          (task.utilizationPercentage || 0) >= 80 ? 'bg-emerald-500' :
                          (task.utilizationPercentage || 0) >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${task.utilizationPercentage || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 min-w-[35px]">
                      {task.utilizationPercentage || 0}%
                    </span>
                  </div>
                </td>

                {/* חשבון */}
                <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleSendInvoiceRequest(task, e)}
                    className="px-2 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-1 text-xs font-bold mx-auto"
                    title="שלח בקשה להגשת חשבון"
                  >
                    <Send size={12} />
                    <span className="hidden lg:inline">חשבון</span>
                  </button>
                </td>

                {/* View Eye Button */}
                <td className="px-2 py-2">
                  <button
                    onClick={() => onTaskClick(task)}
                    className={`p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all ${
                      hoveredTaskId === task.id ? 'opacity-100' : 'opacity-0'
                    }`}
                    title="צפה בכרטיס משימה"
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chat Modal */}
      {showChatModal && chatTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare size={26} className="text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">צ'אט משימה</h3>
                  <p className="text-sm text-blue-100">{chatTask.subject}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 w-9 h-9 flex items-center justify-center font-bold text-xl transition-all"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">💬 אזור הצ'אט של המשימה</p>
                  <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
                    <strong>פרויקט:</strong> {chatTask.project}
                    <br />
                    <strong>סטטוס:</strong> {chatTask.status === 'done' ? 'הושלם' : chatTask.status === 'inProgress' ? 'בביצוע' : 'לביצוע'}
                  </div>
                </div>
                <div className="text-center text-gray-400 text-sm py-8">
                  ההודעות יופיעו כאן
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 p-4 bg-white rounded-b-xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="כתוב הודעה..."
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold transition-all shadow-sm">
                  שלח
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}