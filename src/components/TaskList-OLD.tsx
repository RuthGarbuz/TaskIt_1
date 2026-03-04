// import { useState } from 'react';
// import { Clock, AlertCircle, Search, Filter, BarChart3, List, X, Calendar, Eye } from 'lucide-react';
// import type { Task, CurrentView } from '../types';
// import TaskCard from '../pages/tasks/TaskCard';

// interface TaskListProps {
//   currentView: CurrentView;
// }

// const allTasks: Task[] = [
//   { id: 1, subject: 'עיצוב ממשק משתמש חדש', stage: 'פיתוח', planning: 'Q1 2026', project: 'פרויקט א', status: 'inProgress', urgency: 'high', sender: 'יוסי כהן', receivers: ['מיכל'], date: '28/01/2026', hoursEstimate: 40, dependsOnStage: true },
//   { id: 2, subject: 'בדיקת באגים במערכת', stage: 'QA', planning: 'ינואר 2026', project: 'פרויקט ב', status: 'todo', urgency: 'medium', sender: 'שרה לוי', receivers: ['רון', 'דני'], date: '28/01/2026', hoursEstimate: 16, dependsOnStage: false },
//   { id: 3, subject: 'פגישה עם לקוח', stage: 'אנליזה', planning: 'פברואר 2026', project: 'פרויקט א', status: 'done', urgency: 'low', sender: 'דני אבני', receivers: ['יוסי', 'שרה', 'מיכל'], date: '29/01/2026', hoursEstimate: 4, dependsOnStage: false, completed: true },
//   { id: 4, subject: 'סקירת קוד פרונט', stage: 'פיתוח', planning: 'Q1 2026', project: 'פרויקט ב', status: 'inProgress', urgency: 'medium', sender: 'מיכל דהן', receivers: ['Itzik'], date: '28/01/2026', hoursEstimate: 8, dependsOnStage: false },
//   { id: 5, subject: 'עדכון דוקומנטציה', stage: 'תיעוד', planning: 'פברואר 2026', project: 'פרויקט ג', status: 'todo', urgency: 'low', sender: 'רון פרץ', receivers: ['Itzik'], date: '29/01/2026', hoursEstimate: 12, dependsOnStage: true },
//   { id: 6, subject: 'אינטגרציה עם API', stage: 'פיתוח', planning: 'Q1 2026', project: 'פרויקט ד', status: 'todo', urgency: 'high', sender: 'יוסי כהן', receivers: ['Itzik', 'מיכל'], date: '30/01/2026', hoursEstimate: 24, dependsOnStage: false },
//   { id: 7, subject: 'בדיקות אבטחה', stage: 'QA', planning: 'פברואר 2026', project: 'פרויקט ה', status: 'inProgress', urgency: 'high', sender: 'שרה לוי', receivers: ['רון'], date: '31/01/2026', hoursEstimate: 20, dependsOnStage: true },
// ];

// export default function TaskList({ currentView }: TaskListProps) {
//   const [selectedTask, setSelectedTask] = useState<Task | null>(null);
//   const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
//   const [ganttTimeframe, setGanttTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [showViewModal, setShowViewModal] = useState(false);
//   const [showFilterModal, setShowFilterModal] = useState(false);
//   const [activeView, setActiveView] = useState<'all' | 'status' | 'urgency' | 'project' | 'date'>('all');
//   const [tasks, setTasks] = useState<Task[]>(allTasks);
//   const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
//   const [editingSubject, setEditingSubject] = useState('');
//   const [selectedEmployee, setSelectedEmployee] = useState<string>('');
//   const [projectSearchQuery, setProjectSearchQuery] = useState('');
//   const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
//   const [filters, setFilters] = useState({
//     status: [] as string[],
//     urgency: [] as string[],
//     project: [] as string[],
//     dateFrom: '',
//     dateTo: '',
//   });
  
//   // סינון משימות לפי התצוגה
//   const baseTasks = currentView === 'myTasks' 
//     ? tasks.filter(task => task.receivers.includes('Itzik'))
//     : tasks;

//   // קבלת רשימת עובדים ייחודית
//   const allEmployees = Array.from(new Set(tasks.flatMap(task => task.receivers))).sort();

//   const toggleTaskComplete = (taskId: number) => {
//     setTasks(tasks.map(task => 
//       task.id === taskId 
//         ? { ...task, completed: !task.completed, status: !task.completed ? 'done' : 'todo' }
//         : task
//     ));
//   };

//   const changeTaskStatus = (taskId: number, newStatus: 'todo' | 'inProgress' | 'done') => {
//     setTasks(tasks.map(task => 
//       task.id === taskId 
//         ? { ...task, status: newStatus, completed: newStatus === 'done' }
//         : task
//     ));
//   };

//   const changeTaskUrgency = (taskId: number, newUrgency: 'low' | 'medium' | 'high') => {
//     setTasks(tasks.map(task => 
//       task.id === taskId 
//         ? { ...task, urgency: newUrgency }
//         : task
//     ));
//   };

//   const startEditingSubject = (task: Task) => {
//     setEditingTaskId(task.id);
//     setEditingSubject(task.subject);
//   };

//   const saveSubject = (taskId: number) => {
//     if (editingSubject.trim()) {
//       setTasks(tasks.map(task => 
//         task.id === taskId 
//           ? { ...task, subject: editingSubject.trim() }
//           : task
//       ));
//     }
//     setEditingTaskId(null);
//     setEditingSubject('');
//   };

//   const cancelEditing = () => {
//     setEditingTaskId(null);
//     setEditingSubject('');
//   };

//   // המרת תאריך מפורמט DD/MM/YYYY לאובייקט Date
//   const parseDate = (dateStr: string) => {
//     const [day, month, year] = dateStr.split('/').map(Number);
//     return new Date(year, month - 1, day);
//   };

//   const getFilteredTasks = () => {
//     let filtered = baseTasks;

//     // סינון לפי עובד (רק בתצוגת "כל המשימות")
//     if (currentView === 'allTasks' && selectedEmployee) {
//       filtered = filtered.filter(task => task.receivers.includes(selectedEmployee));
//     }

//     if (searchQuery) {
//       filtered = filtered.filter(task =>
//         task.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         task.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         task.sender.toLowerCase().includes(searchQuery.toLowerCase())
//       );
//     }

//     if (filters.status.length > 0) {
//       filtered = filtered.filter(task => filters.status.includes(task.status));
//     }
//     if (filters.urgency.length > 0) {
//       filtered = filtered.filter(task => filters.urgency.includes(task.urgency));
//     }
//     if (filters.project.length > 0) {
//       filtered = filtered.filter(task => filters.project.includes(task.project));
//     }

//     // סינון לפי טווח תאריכים
//     if (filters.dateFrom) {
//       const fromDate = new Date(filters.dateFrom);
//       filtered = filtered.filter(task => {
//         const taskDate = parseDate(task.date);
//         return taskDate >= fromDate;
//       });
//     }
//     if (filters.dateTo) {
//       const toDate = new Date(filters.dateTo);
//       filtered = filtered.filter(task => {
//         const taskDate = parseDate(task.date);
//         return taskDate <= toDate;
//       });
//     }

//     return filtered;
//   };

//   const getGroupedTasks = () => {
//     const filtered = getFilteredTasks();
    
//     if (activeView === 'all') {
//       return { all: filtered };
//     }

//     const grouped: { [key: string]: Task[] } = {};

//     if (activeView === 'status') {
//       grouped['לביצוע'] = filtered.filter(t => t.status === 'todo');
//       grouped['בביצוע'] = filtered.filter(t => t.status === 'inProgress');
//       grouped['הושלם'] = filtered.filter(t => t.status === 'done');
//     } else if (activeView === 'urgency') {
//       grouped['דחיפות גבוהה'] = filtered.filter(t => t.urgency === 'high');
//       grouped['דחיפות בינונית'] = filtered.filter(t => t.urgency === 'medium');
//       grouped['דחיפות נמוכה'] = filtered.filter(t => t.urgency === 'low');
//     } else if (activeView === 'project') {
//       const projects = [...new Set(filtered.map(t => t.project))];
//       projects.forEach(project => {
//         grouped[project] = filtered.filter(t => t.project === project);
//       });
//     } else if (activeView === 'date') {
//       const dates = [...new Set(filtered.map(t => t.date))];
//       dates.forEach(date => {
//         grouped[date] = filtered.filter(t => t.date === date);
//       });
//     }

//     return grouped;
//   };

//   const toggleFilter = (type: 'status' | 'urgency' | 'project', value: string) => {
//     setFilters(prev => {
//       const current = prev[type];
//       const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
//       return { ...prev, [type]: updated };
//     });
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'done': return 'bg-green-100 text-green-700 border-green-200';
//       case 'inProgress': return 'bg-blue-100 text-blue-700 border-blue-200';
//       default: return 'bg-gray-100 text-gray-700 border-gray-200';
//     }
//   };

//   const getStatusText = (status: string) => {
//     switch (status) {
//       case 'done': return 'הושלם';
//       case 'inProgress': return 'בביצוע';
//       default: return 'לביצוע';
//     }
//   };

//   const getUrgencyColor = (urgency: string) => {
//     switch (urgency) {
//       case 'high': return 'text-red-600';
//       case 'medium': return 'text-yellow-600';
//       default: return 'text-green-600';
//     }
//   };

//   const getUrgencyText = (urgency: string) => {
//     switch (urgency) {
//       case 'high': return 'גבוהה';
//       case 'medium': return 'בינונית';
//       default: return 'נמוכה';
//     }
//   };

//   const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);
  
//   const getAvatarColor = (name: string) => {
//     const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
//     return colors[name.charCodeAt(0) % colors.length];
//   };

//   // סינון פרויקטים לפי חיפוש
//   const filteredProjects = [...new Set(baseTasks.map(t => t.project))].filter(project =>
//     project.toLowerCase().includes(projectSearchQuery.toLowerCase())
//   );

//   const activeFiltersCount = filters.status.length + filters.urgency.length + filters.project.length + 
//     (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

//   return (
//     <>
//       {/* Controls Bar */}
//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
//         <div className="flex items-center justify-between gap-4 flex-wrap">
//           <div className="flex gap-2">
//             <button
//               onClick={() => setViewMode('list')}
//               className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
//                 viewMode === 'list' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//               }`}
//             >
//               <List size={18} />
//               <span>רשימה</span>
//             </button>
//             <button
//               onClick={() => setViewMode('gantt')}
//               className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
//                 viewMode === 'gantt' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//               }`}
//             >
//               <BarChart3 size={18} />
//               <span>גאנט</span>
//             </button>
//           </div>

//           {/* Gantt Timeframe Selection */}
//           {viewMode === 'gantt' && (
//             <div className="flex gap-2 border-r border-gray-300 pr-4">
//               <button
//                 onClick={() => setGanttTimeframe('daily')}
//                 className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
//                   ganttTimeframe === 'daily' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                 }`}
//               >
//                 יומי
//               </button>
//               <button
//                 onClick={() => setGanttTimeframe('weekly')}
//                 className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
//                   ganttTimeframe === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                 }`}
//               >
//                 שבועי
//               </button>
//               <button
//                 onClick={() => setGanttTimeframe('monthly')}
//                 className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
//                   ganttTimeframe === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                 }`}
//               >
//                 חודשי
//               </button>
//             </div>
//           )}

//           <div className="flex-1 max-w-md">
//             <div className="relative">
//               <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
//               <input
//                 type="text"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 placeholder="חפש משימות..."
//                 className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
//               />
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             {/* Employee Filter (only in allTasks view) */}
//             {currentView === 'allTasks' && (
//               <select
//                 value={selectedEmployee}
//                 onChange={(e) => setSelectedEmployee(e.target.value)}
//                 className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
//               >
//                 <option value="">כל העובדים</option>
//                 {allEmployees.map(employee => (
//                   <option key={employee} value={employee}>{employee}</option>
//                 ))}
//               </select>
//             )}

//             {/* View button - hidden in gantt mode */}
//             {viewMode === 'list' && (
//               <button 
//                 onClick={() => setShowViewModal(true)}
//                 className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
//               >
//                 <BarChart3 size={18} />
//                 <span className="font-medium">תצוגה</span>
//               </button>
//             )}

//             <button 
//               onClick={() => setShowFilterModal(true)}
//               className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
//                 activeFiltersCount > 0
//                   ? 'bg-emerald-500 text-white border-emerald-600'
//                   : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
//               }`}
//             >
//               <Filter size={18} />
//               <span className="font-medium">סינון</span>
//               {activeFiltersCount > 0 && (
//                 <span className="bg-white text-emerald-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
//                   {activeFiltersCount}
//                 </span>
//               )}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* View Modal */}
//       {showViewModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
//             <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
//               <h2 className="text-xl font-bold text-gray-800">בחר תצוגה</h2>
//               <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
//                 <X size={20} className="text-gray-600" />
//               </button>
//             </div>
//             <div className="p-6 space-y-2">
//               {['all', 'status', 'urgency', 'project', 'date'].map((view) => (
//                 <button
//                   key={view}
//                   onClick={() => { setActiveView(view as any); setShowViewModal(false); }}
//                   className={`w-full text-right px-4 py-3 rounded-lg font-medium transition-colors ${
//                     activeView === view ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'hover:bg-gray-50 border-2 border-transparent'
//                   }`}
//                 >
//                   {view === 'all' ? 'הצג הכל' : view === 'status' ? 'קבץ לפי סטטוס' : view === 'urgency' ? 'קבץ לפי דחיפות' : view === 'project' ? 'קבץ לפי פרויקט' : 'קבץ לפי תאריך'}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Filter Modal - Compact Design */}
//       {showFilterModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
//             <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
//               <h2 className="text-xl font-bold">סינון משימות</h2>
//               <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
//                 <X size={20} />
//               </button>
//             </div>
//             <div className="p-6">
//               {/* Status and Urgency Side by Side */}
//               <div className="grid grid-cols-2 gap-6 mb-6">
//                 <div>
//                   <h3 className="font-semibold mb-3 text-gray-800">סטטוס</h3>
//                   <div className="space-y-2">
//                     {['todo', 'inProgress', 'done'].map(status => (
//                       <label key={status} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
//                         <input 
//                           type="checkbox" 
//                           checked={filters.status.includes(status)} 
//                           onChange={() => toggleFilter('status', status)} 
//                           className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500" 
//                         />
//                         <span className="text-sm">{getStatusText(status)}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//                 <div>
//                   <h3 className="font-semibold mb-3 text-gray-800">דחיפות</h3>
//                   <div className="space-y-2">
//                     {['high', 'medium', 'low'].map(urgency => (
//                       <label key={urgency} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
//                         <input 
//                           type="checkbox" 
//                           checked={filters.urgency.includes(urgency)} 
//                           onChange={() => toggleFilter('urgency', urgency)} 
//                           className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500" 
//                         />
//                         <span className="text-sm">{getUrgencyText(urgency)}</span>
//                       </label>
//                     ))}
//                   </div>
//                 </div>
//               </div>

//               {/* Projects with Search */}
//               <div className="mb-6 pb-6 border-b">
//                 <h3 className="font-semibold mb-3 text-gray-800">פרויקט</h3>
//                 <div className="mb-3">
//                   <input
//                     type="text"
//                     value={projectSearchQuery}
//                     onChange={(e) => setProjectSearchQuery(e.target.value)}
//                     placeholder="חפש פרויקט..."
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
//                   />
//                 </div>
//                 <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
//                   {filteredProjects.length > 0 ? (
//                     filteredProjects.map(project => (
//                       <label key={project} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
//                         <input 
//                           type="checkbox" 
//                           checked={filters.project.includes(project)} 
//                           onChange={() => toggleFilter('project', project)} 
//                           className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500" 
//                         />
//                         <span className="text-sm">{project}</span>
//                       </label>
//                     ))
//                   ) : (
//                     <p className="text-sm text-gray-500 p-2">לא נמצאו פרויקטים</p>
//                   )}
//                 </div>
//               </div>

//               {/* Date Range */}
//               <div className="mb-6">
//                 <h3 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
//                   <Calendar size={18} />
//                   טווח תאריכים
//                 </h3>
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm text-gray-600 mb-1">מתאריך</label>
//                     <input
//                       type="date"
//                       value={filters.dateFrom}
//                       onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
//                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm text-gray-600 mb-1">עד תאריך</label>
//                     <input
//                       type="date"
//                       value={filters.dateTo}
//                       onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
//                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* Actions */}
//               <div className="flex gap-3 pt-4 border-t">
//                 <button 
//                   onClick={() => setFilters({ status: [], urgency: [], project: [], dateFrom: '', dateTo: '' })} 
//                   className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
//                 >
//                   נקה הכל
//                 </button>
//                 <button 
//                   onClick={() => setShowFilterModal(false)} 
//                   className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg hover:bg-emerald-600 font-medium transition-colors shadow-sm"
//                 >
//                   החל
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Tasks List or Gantt */}
//       {viewMode === 'list' ? (
//         <div className="space-y-6">
//           {Object.entries(getGroupedTasks()).map(([groupName, groupTasks]) => (
//             <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//               {activeView !== 'all' && (
//                 <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3">
//                   <h3 className="text-white font-bold text-lg">{groupName}</h3>
//                   <p className="text-emerald-100 text-sm">{groupTasks.length} משימות</p>
//                 </div>
//               )}
              
//               <div className="overflow-x-auto">
//                 <table className="w-full">
//                   <thead className="bg-gray-50 border-b border-gray-200">
//                     <tr>
//                       <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-10">✓</th>
//                       <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 min-w-[200px]">תיאור המשימה</th>
//                       <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-32">שלב</th>
//                       <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-36">נושא תכנון</th>
//                       <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-28">פרויקט</th>
//                       <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20">סטטוס</th>
//                       <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20">דחיפות</th>
//                       <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-24">שולח</th>
//                       {currentView === 'allTasks' && <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-24">מקבל</th>}
//                       <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20">תאריך</th>
//                       <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-16">שעות</th>
//                       <th className="px-2 py-2 w-10"></th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-200">
//                     {groupTasks.map((task) => (
//                       <tr 
//                         key={task.id}
//                         onMouseEnter={() => setHoveredTaskId(task.id)}
//                         onMouseLeave={() => setHoveredTaskId(null)}
//                         className="hover:bg-emerald-50 transition-colors relative group"
//                       >
//                         <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
//                           <input 
//                             type="checkbox" 
//                             checked={task.completed || false}
//                             onChange={() => toggleTaskComplete(task.id)}
//                             className="w-4 h-4 rounded border-gray-300 text-emerald-500 cursor-pointer focus:ring-emerald-500" 
//                           />
//                         </td>
//                         <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
//                           {currentView === 'allTasks' && editingTaskId === task.id ? (
//                             <div className="flex items-center gap-2">
//                               <input
//                                 type="text"
//                                 value={editingSubject}
//                                 onChange={(e) => setEditingSubject(e.target.value)}
//                                 onKeyDown={(e) => {
//                                   if (e.key === 'Enter') saveSubject(task.id);
//                                   if (e.key === 'Escape') cancelEditing();
//                                 }}
//                                 className="flex-1 px-2 py-1 border border-emerald-500 rounded focus:ring-2 focus:ring-emerald-500 text-xs"
//                                 autoFocus
//                               />
//                               <button
//                                 onClick={() => saveSubject(task.id)}
//                                 className="px-2 py-1 bg-emerald-500 text-white rounded text-xs hover:bg-emerald-600"
//                               >
//                                 ✓
//                               </button>
//                               <button
//                                 onClick={cancelEditing}
//                                 className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
//                               >
//                                 ✕
//                               </button>
//                             </div>
//                           ) : (
//                             <span 
//                               onClick={currentView === 'allTasks' ? () => startEditingSubject(task) : undefined}
//                               className={`text-xs font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'} ${currentView === 'allTasks' ? 'cursor-text hover:bg-gray-100' : ''} px-1 rounded`}
//                             >
//                               {task.subject}
//                             </span>
//                           )}
//                         </td>
//                         <td className="px-3 py-2">
//                           <span className="inline-flex px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{task.stage}</span>
//                         </td>
//                         <td className="px-3 py-2">
//                           <span className="text-xs text-gray-600">{task.planning}</span>
//                         </td>
//                         <td className="px-3 py-2">
//                           <span className="text-xs text-gray-600">{task.project}</span>
//                         </td>
//                         <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
//                           <select
//                             value={task.status}
//                             onChange={(e) => changeTaskStatus(task.id, e.target.value as any)}
//                             className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer focus:ring-2 focus:ring-emerald-500 ${getStatusColor(task.status)}`}
//                           >
//                             <option value="todo">לביצוע</option>
//                             <option value="inProgress">בביצוע</option>
//                             <option value="done">הושלם</option>
//                           </select>
//                         </td>
//                         <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
//                           {currentView === 'allTasks' ? (
//                             <select
//                               value={task.urgency}
//                               onChange={(e) => changeTaskUrgency(task.id, e.target.value as any)}
//                               className={`text-xs font-medium cursor-pointer focus:ring-2 focus:ring-emerald-500 bg-transparent border-0 ${getUrgencyColor(task.urgency)}`}
//                             >
//                               <option value="high">גבוהה</option>
//                               <option value="medium">בינונית</option>
//                               <option value="low">נמוכה</option>
//                             </select>
//                           ) : (
//                             <div className="flex items-center gap-1">
//                               <AlertCircle size={12} className={getUrgencyColor(task.urgency)} />
//                               <span className={`text-xs font-medium ${getUrgencyColor(task.urgency)}`}>{getUrgencyText(task.urgency)}</span>
//                             </div>
//                           )}
//                         </td>
//                         <td className="px-3 py-2">
//                           <span className="text-xs text-gray-600">{task.sender}</span>
//                         </td>
//                         {currentView === 'allTasks' && (
//                           <td className="px-3 py-2">
//                             <div className="flex items-center gap-0.5">
//                               {task.receivers.slice(0, 2).map((receiver, idx) => (
//                                 <div key={idx} className={`w-5 h-5 rounded-full ${getAvatarColor(receiver)} flex items-center justify-center text-white text-[10px] font-bold ${idx > 0 ? '-mr-1' : ''} border-2 border-white`}>
//                                   {getInitials(receiver)}
//                                 </div>
//                               ))}
//                               {task.receivers.length > 2 && (
//                                 <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 text-[10px] font-bold -mr-1 border-2 border-white">
//                                   +{task.receivers.length - 2}
//                                 </div>
//                               )}
//                             </div>
//                           </td>
//                         )}
//                         <td className="px-3 py-2">
//                           <div className="flex items-center gap-1">
//                             <Clock size={12} className="text-gray-400" />
//                             <span className="text-xs text-gray-600">{task.date}</span>
//                           </div>
//                         </td>
//                         <td className="px-3 py-2">
//                           <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
//                             {task.hoursEstimate}h
//                           </span>
//                         </td>
//                         <td className="px-2 py-2">
//                           <button
//                             onClick={() => setSelectedTask(task)}
//                             className={`p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all ${
//                               hoveredTaskId === task.id ? 'opacity-100' : 'opacity-0'
//                             }`}
//                             title="צפה בכרטיס משימה"
//                           >
//                             <Eye size={14} />
//                           </button>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
//           <BarChart3 size={64} className="mx-auto text-gray-300 mb-4" />
//           <h3 className="text-xl font-semibold text-gray-700 mb-2">
//             תצוגת גאנט - {ganttTimeframe === 'daily' ? 'יומי' : ganttTimeframe === 'weekly' ? 'שבועי' : 'חודשי'}
//           </h3>
//           <p className="text-gray-500">בפיתוח...</p>
//         </div>
//       )}

//       {selectedTask && (
//         <TaskCard 
//           task={selectedTask} 
//           onClose={() => setSelectedTask(null)}
//           onUpdate={(updatedTask) => {
//             setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
//             setSelectedTask(null);
//           }}
//           viewMode={currentView}
//         />
//       )}
//     </>
//   );
// }