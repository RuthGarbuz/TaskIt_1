import { useState } from 'react';
import { Clock, AlertCircle, Eye, MessageSquare, Send, Paperclip, Link as LinkIcon, Smile, Image as ImageIcon } from 'lucide-react';
import type { Task } from '../../types/index';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useTaskGrouping } from '../../hooks/useTaskGrouping';
import TaskControls from './TaskControls';
import TaskCard from './TaskCard';
import ViewModal from '../../components/ViewModal';
import FilterModal from '../../components/FilterModal';
import { getUrgencyColor, getUrgencyText } from '../../Data/tasksData';
import GanttChart from './GanttChart';
import type { HoursReport } from '../hoursReport/HoursReportModal';
import HoursReportModal from '../hoursReport/HoursReportModal';

interface MyTasksProps {
  tasks: Task[];
  onTaskUpdate: (updatedTask: Task) => void;
  onTasksUpdate: (tasks: Task[]) => void;
}

interface ChatMessage {
  id: number;
  user: string;
  avatar: string;
  message: string;
  timestamp: string;
  mentions?: string[];
}

export default function MyTasks({ tasks, onTaskUpdate, onTasksUpdate }: MyTasksProps) {
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [ganttTimeframe, setGanttTimeframe] = useState< 'weekly' | 'monthly'>('weekly');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeView, setActiveView] = useState<'all' | 'status' | 'urgency' | 'project' | 'date'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTask, setChatTask] = useState<Task | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [hoursTask, setHoursTask] = useState<Task | null>(null);

  const [messages] = useState<ChatMessage[]>([
    {
      id: 1,
      user: 'Miri Label',
      avatar: 'ML',
      message: 'שמתי את שיבא בתואם משרדת כדי מייצב בניקלאוסטוס שלהם',
      timestamp: 'Jan 1',
      mentions: ['@Gal Shem-Tov']
    }
  ]);

  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    toggleFilter,
    clearFilters,
    filteredTasks,
    baseTasks,
    activeFiltersCount,
  } = useTaskFilters(tasks, 'myTasks', '');

  const groupedTasks = useTaskGrouping(filteredTasks, activeView);

  const handleTaskStatusChange = (taskId: number, newStatus: 'todo' | 'inProgress' | 'done') => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, status: newStatus, completed: newStatus === 'done' }
        : task
    );
    onTasksUpdate(updatedTasks);
  };

  const handleTaskClick = (task: Task) => setSelectedTask(task);

  const handleOpenChat = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatTask(task);
    setShowChatModal(true);
  };

  const handleOpenHoursReport = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setHoursTask(task);
    setShowHoursModal(true);
  };

  const handleSaveHoursReport = (report: HoursReport) => {
    console.log('Hours report saved:', report);
  };

  const handleSendInvoiceRequest = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`שליחת בקשה להגשת חשבון עבור: ${task.subject}`);
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      console.log('Sending message:', chatMessage);
      setChatMessage('');
    }
  };

  const handleAddLink = () => {
    if (linkUrl.trim()) {
      setChatMessage(prev => prev + ' ' + linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'done') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'inProgress') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <>
      <TaskControls
        viewMode={viewMode}
        setViewMode={setViewMode}
        ganttTimeframe={ganttTimeframe}
        setGanttTimeframe={setGanttTimeframe}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedEmployee=""
        setSelectedEmployee={() => {}}
        allEmployees={[]}
        currentView="myTasks"
        activeFiltersCount={activeFiltersCount}
        onShowViewModal={() => setShowViewModal(true)}
        onShowFilterModal={() => setShowFilterModal(true)}
        totalTasks={tasks.length}
        filteredTasksCount={filteredTasks.length}
      />

      {viewMode === 'list' ? (
        <div className="space-y-6">

          {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
            <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

              {activeView !== 'all' && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg">{groupName}</h3>
                    <p className="text-emerald-100 text-sm">{groupTasks.length} משימות</p>
                  </div>
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-white bg-opacity-25 text-white rounded-full text-sm font-bold">
                    {groupTasks.length}
                  </span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1800px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 min-w-[200px]">תיאור המשימה</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-16">Chat</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-32">שלב</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-36">נושא תכנון</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-28">פרויקט</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20">סטטוס</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20">דחיפות</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-24">שולח</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-28">תאריך התחלה</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-28">תאריך סיום</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28">תלוי שלב/משימה</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700 w-24">תקצוב שעות</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28">אחוז ניצול</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-28">דיווח שעות</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-emerald-700 w-20">חשבון</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {groupTasks.map((task) => (
                      <tr
                        key={task.id}
                        onMouseEnter={() => setHoveredTaskId(task.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                        className="hover:bg-emerald-50 transition-colors relative group"
                      >
                        {/* תיאור המשימה */}
                        <td className="px-3 py-2">
                          <span className={`text-xs font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'} px-1 rounded`}>
                            {task.subject}
                          </span>
                        </td>

                        {/* Chat */}
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
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value as any)}
                            className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer focus:ring-2 focus:ring-emerald-500 ${getStatusColor(task.status)}`}
                          >
                            <option value="todo">לביצוע</option>
                            <option value="inProgress">בביצוע</option>
                            <option value="done">הושלם</option>
                          </select>
                        </td>

                        {/* דחיפות */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <AlertCircle size={12} className={getUrgencyColor(task.urgency)} />
                            <span className={`text-xs font-medium ${getUrgencyColor(task.urgency)}`}>{getUrgencyText(task.urgency)}</span>
                          </div>
                        </td>

                        {/* שולח */}
                        <td className="px-3 py-2">
                          <span className="text-xs text-gray-600">{task.sender}</span>
                        </td>

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

                        {/* תלוי שלב/משימה */}
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

                        {/* דיווח שעות */}
                        <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleOpenHoursReport(task, e)}
                            className="px-2 py-1 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all flex items-center gap-1 text-xs font-bold mx-auto"
                            title="דיווח שעות לשלב/משימה"
                          >
                            <Clock size={12} />
                            <span className="hidden lg:inline">דיווח</span>
                          </button>
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
                            onClick={() => handleTaskClick(task)}
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

                    {groupTasks.length === 0 && (
                      <tr>
                        <td colSpan={16} className="px-4 py-12 text-center text-gray-500">
                          לא נמצאו משימות
                        </td>
                      </tr>
                    )}
                  </tbody>
                  
                </table>
              </div>
            </div>
          ))}



        </div>
      ) : (
        <GanttChart tasks={filteredTasks} timeframe={ganttTimeframe} currentView="myTasks" />
      )}

      {showViewModal && (
        <ViewModal
          activeView={activeView}
          onViewChange={(view) => { setActiveView(view); setShowViewModal(false); }}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {showFilterModal && (
        <FilterModal
          filters={filters}
          onFilterToggle={toggleFilter}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
          onClose={() => setShowFilterModal(false)}
          baseTasks={baseTasks}
          projectSearchQuery={projectSearchQuery}
          setProjectSearchQuery={setProjectSearchQuery}
        />
      )}

      {selectedTask && (
        <TaskCard
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updatedTask) => { onTaskUpdate(updatedTask); setSelectedTask(null); }}
          viewMode="myTasks"
        />
      )}

      {/* Hours Report Modal */}
      {showHoursModal && hoursTask && (
        <HoursReportModal
          task={hoursTask}
          onClose={() => { setShowHoursModal(false); setHoursTask(null); }}
          onSave={handleSaveHoursReport}
        />
      )}

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
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {msg.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">{msg.user}</span>
                          <span className="text-sm text-gray-500">{msg.timestamp}</span>
                        </div>
                        <p className="text-gray-700 text-sm">
                          {msg.mentions?.map((mention, i) => (
                            <span key={i} className="text-blue-600 font-medium">{mention} </span>
                          ))}
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-center text-gray-400 text-sm py-4">
                  ההודעות יופיעו כאן
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 p-4 bg-white rounded-b-xl">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="כתוב הודעה..."
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim()}
                  className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  שלח
                </button>
              </div>
              {showLinkInput && (
                <div className="mb-3 flex gap-2">
                  <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="הזן קישור (URL)..." className="flex-1 px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
                  <button onClick={handleAddLink} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-semibold">הוסף</button>
                  <button onClick={() => setShowLinkInput(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">ביטול</button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="הזכר אנשים">@</button>
                <button onClick={() => setShowLinkInput(!showLinkInput)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="הוסף קישור"><LinkIcon size={18} /></button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="הוסף קובץ"><Paperclip size={18} /></button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="הוסף תמונה"><ImageIcon size={18} /></button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="אימוג'י"><Smile size={18} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}