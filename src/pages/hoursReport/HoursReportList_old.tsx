// import React, { useEffect, useState, useMemo } from 'react';
// import {
//   Clock, Calendar, User, Briefcase,
//   ChevronDown, ChevronUp, Trash2, X, Edit2, Filter,
//   List,
// } from 'lucide-react';

// import HoursReportHeader from './HoursReportHeader';
// import HoursReportDbFilter, {
//   getDefaultHoursDBFilters,
//   countActiveHoursDbFilters,
// } from './HoursReportDbFilter';
// import { usePersistedHoursDbFilters } from '../../hooks/usePersistedHoursDbFilters';
// import { formatDateHe, formatHours, getInitials, groupByDate, groupByEmployee, groupByProject, type HourReportList, type HourReportProject, type HourReportStep, type HoursReport } from '../../Data/HoursReportData';
// import type { TaskReview } from '../../Data/projectsData';
// import HoursReportModal from './HoursReportModal';
// import { deleteHourReport, getHourReportProjects, getHourReportStepsByProjectId, getHourReports } from '../../services/hourReportService';
// import authService from '../../services/authService';
// import AutoComplete from '../shared/AutoComplete';
// import SearchableCheckboxFilter from '../shared/SearchableCheckboxFilter';

// type ViewMode =  'all' | 'date' | 'employee' | 'project';
// type HoursColumnFilterKey = 'dateTime' | 'projectName' | 'employeeName';

// const AVATAR_COLORS = [
//   'from-violet-400 to-purple-500', 'from-sky-400 to-blue-500',
//   'from-rose-400 to-pink-500',     'from-amber-400 to-orange-500',
//   'from-emerald-400 to-teal-500',
// ];
// const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// // ── Data row ───────────────────────────────────────────────────────────────────
// function DataRow({ r, onDelete, onEdit, hideDate, hideProject, hideEmployee }: {
//   r: HourReportList; onDelete: (id: number) => void; onEdit: (r: HourReportList) => void;
//   hideDate?: boolean; hideProject?: boolean; hideEmployee?: boolean;
// }) {
//   const [hovered, setHovered] = useState(false);
//   return (
//     <tr
//       className="hover:bg-teal-50 transition-colors border-b border-gray-100 relative group"
//       onMouseEnter={() => setHovered(true)}
//       onMouseLeave={() => setHovered(false)}
//     >
//       {!hideDate && (
//         <td className="px-4 py-2.5">
//           <span className="text-xs font-semibold text-gray-700">{formatDateHe(r.dateTime)}</span>
//         </td>
//       )}
//       <td className="px-4 py-2.5">
//         <div className="text-xs font-semibold text-gray-800">{r.name}</div>
//         <div className="text-[10px] text-gray-400 mt-0.5">{r.isPlanningStep ? 'שלב' : 'משימה'}</div>
//       </td>
//       {!hideProject && (
//         <td className="px-4 py-2.5">
//           <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{r.projectName}</span>
//         </td>
//       )}
//       {!hideEmployee && (
//         <td className="px-4 py-2.5">
//           <div className="flex items-center gap-2">
//             <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarColor(r.employeeName)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
//               {getInitials(r.employeeName)}
//             </div>
//             <span className="text-xs font-medium text-gray-700">{r.employeeName}</span>
//           </div>
//         </td>
//       )}
//       <td className="px-4 py-2.5 text-center">
//         {r.startTime
//           ? <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{r.startTime}</span>
//           : <span className="text-xs text-gray-400">—</span>
//         }
//       </td>
//       <td className="px-4 py-2.5 text-center">
//         {r.endTime
//           ? <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{r.endTime}</span>
//           : <span className="text-xs text-gray-400">—</span>
//         }
//       </td>
//       <td className="px-4 py-2.5 text-center">
//         <span className="inline-flex items-center px-2.5 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-bold">
//           {formatHours(r.hours)}
//         </span>
//       </td>
//       <td className="px-4 py-2.5">
//         {r.description
//           ? <span className="text-xs text-gray-500 italic">{r.description}</span>
//           : <span className="text-xs text-gray-300">—</span>
//         }
//       </td>
//       {/* Edit + Delete */}
//       <td className="px-4 py-2.5 text-center">
//         <div className="flex items-center justify-center gap-1">
//           <button
//             onClick={() => onEdit(r)}
//             className={`p-1.5 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-all ${hovered ? 'opacity-100' : 'opacity-0'}`}
//             title="ערוך דיווח"
//           >
//             <Edit2 size={13} />
//           </button>
//           <button
//             onClick={() => onDelete(r.hoursReportID)}
//             className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
//             title="מחק דיווח"
//           >
//             <Trash2 size={13} />
//           </button>
//         </div>
//       </td>
//     </tr>
//   );
// }

// // ── Group header ───────────────────────────────────────────────────────────────
// function GroupRow({ label, sub, totalHours, count, color, expanded, onToggle, totalCols, avatar }: {
//   label: string; sub?: string; totalHours: number; count: number;
//   color: string; expanded: boolean; onToggle: () => void;
//   totalCols: number; avatar?: React.ReactNode;
// }) {
//   return (
//     <tr onClick={onToggle} className={`${color} cursor-pointer select-none`}>
//       <td colSpan={totalCols} className="px-5 py-2.5">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2.5">
//             {expanded ? <ChevronDown size={14} className="text-white opacity-80" /> : <ChevronUp size={14} className="text-white opacity-80" />}
//             {avatar}
//             <span className="font-bold text-white text-sm">{label}</span>
//             {sub && <span className="text-white opacity-60 text-xs">{sub}</span>}
//           </div>
//           <div className="flex items-center gap-3">
//             <span className="text-white opacity-75 text-xs">{count} דיווחים</span>
//             <span className="bg-white bg-opacity-20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
//               {formatHours(totalHours)}
//             </span>
//           </div>
//         </div>
//       </td>
//     </tr>
//   );
// }

// // ── View Modal ─────────────────────────────────────────────────────────────────
// function HoursViewModal({ viewMode, onSelect, onClose }: {
//   viewMode: ViewMode; onSelect: (v: ViewMode) => void; onClose: () => void;
// }) {
// const options: { value: ViewMode; label: string; desc: string; icon: React.ElementType }[] = [
// { value: 'all', label: 'הצג הכל', desc: 'כל הדיווחים ברשימה שטוחה ללא קיבוץ', icon: List },
// { value: 'date', label: 'קבץ לפי תאריך', desc: 'קבץ את הדיווחים לפי תאריך', icon: Calendar },
// { value: 'employee', label: 'קבץ לפי עובד', desc: 'קבץ את הדיווחים לפי שם העובד', icon: User },
// { value: 'project', label: 'קבץ לפי פרויקט', desc: 'קבץ את הדיווחים לפי שם הפרויקט', icon: Briefcase }, ];
//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
//         <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
//           <h2 className="text-xl font-bold text-gray-800">בחר תצוגה</h2>
//           <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
//             <X size={20} className="text-gray-600" />
//           </button>
//         </div>
//         <div className="p-6 space-y-2">
//           {options.map(opt => (
//             <button key={opt.value} onClick={() => { onSelect(opt.value); onClose(); }}
//               className={`w-full text-right px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
//                 viewMode === opt.value
//                   ? 'bg-teal-50 text-teal-700 border-2 border-teal-200'
//                   : 'hover:bg-gray-50 border-2 border-transparent text-gray-700'
//               }`}>
//               <opt.icon size={18} className={viewMode === opt.value ? 'text-teal-500' : 'text-gray-400'} />
//               {opt.label}
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── New Report Modal (select project + stage) ─────────────────────────────────

// function NewReportSelectorModal({ onSelect, onClose }: {
//   onSelect: (task: TaskReview) => void;
//   onClose: () => void;
// }) {
//   const [projects, setProjects] = useState<HourReportProject[]>([]);
//   const [steps, setSteps] = useState<HourReportStep[]>([]);
  
//   const [projectsError, setProjectsError] = useState('');
//   const [stepsError, setStepsError] = useState('');

//   const [selectedProject, setSelectedProject] = useState<HourReportProject | null>(null);
//   const [selectedStep, setSelectedStep] = useState<HourReportStep | null>(null);

//   useEffect(() => {
//     const loadProjects = async () => {
//       setProjectsError('');

//       try {
//         const user = authService.getCurrentUser();
//         if (!user) {
//           setProjects([]);
//           setProjectsError('לא נמצא משתמש מחובר');
//           return;
//         }

//         const data = await getHourReportProjects(null, null);

//         setProjects(data);
//       } catch (error) {
//         setProjects([]);
//         setProjectsError(error instanceof Error ? error.message : 'שגיאה בטעינת פרויקטים');
//       }
//     };

//     void loadProjects();
//   }, []);

//   useEffect(() => {
//     const loadSteps = async () => {
//       setStepsError('');

//       if (!selectedProject) {
//         setSteps([]);
//         return;
//       }

//       const selectedProjectItem = projects.find((p) => p.id === selectedProject?.id);
//       if (!selectedProjectItem) {
//         setSteps([]);
//         return;
//       }

//       try {
//         const data = await getHourReportStepsByProjectId(selectedProjectItem.id, null);
//         setSteps(data);
//       } catch (error) {
//         setSteps([]);
//         setStepsError(error instanceof Error ? error.message : 'שגיאה בטעינת שלבים');
//       }
//     };

//     void loadSteps();
//   }, [selectedProject, projects]);

//   const handleConfirm = () => {
//     if (!selectedProject || !selectedStep) return;
//     //const selectedProjectItem = projects.find((p) => p.id === selectedProject?.id);
//     //const selectedStepItem = steps.find((s) => s.id === selectedStep?.id);

//     // Build a minimal Task object to pass to HoursReportModal
//     const fakeTask: TaskReview = {
//       id: selectedStep?.id ?? 0,
//       name: selectedStep?.name ?? '',
//       stage: selectedStep?.name ?? '',
//       planningStepID: 0,
//       planningSubjectName: '',
//       percentage: 0,
//       workHours: 0,
//       workDays: 0,
//       duration: 0,
//       isActive: true,
//       dependsOnStepID: false,
//       dependsOnTaskID: false,
//       startDate: '',
//       endDate: '',
//       senderID: 0,
//       receivers: [],
//       senderName: '',
//       statuID: 0,
//       statusName: '',
//       urgencyID: 0,
//       urgencyName: '',
//       note: null,
//       creatDate: new Date().toISOString(),
//       lastUpdate: new Date().toISOString(),
//       updateBy: 0,
//       isClosed: false,
//       orderNum: 0,
//       hourReport: 0,
//       projectName: selectedProject?.name ?? '',
//       projectId: selectedProject?.id ?? 0,
//       utilizationPercentage: 0,
//       hasChat: false,
//       isPlanningSte: selectedStep?.isPlanningStep ?? true,
//       projectType: '',
//       studioDepartment: '',
//     } as unknown as TaskReview;
//     onSelect(fakeTask);
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
//         <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl">
//           <div className="flex items-center gap-2">
//             <Clock size={20} className="text-white" />
//             <h2 className="text-lg font-bold text-white">דיווח שעות חדש</h2>
//           </div>
//           <button onClick={onClose} className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all">
//             <X size={18} className="text-white" />
//           </button>
//         </div>
//         <div className="p-6 space-y-4">
//           {projectsError && (
//             <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
//               {projectsError}
//             </div>
//           )}
//           <div>
//             <label className="block text-sm font-semibold text-gray-700 mb-1.5">פרויקט</label>
//             <AutoComplete
//               items={projects}
//               selectedItem={projects.find((p) => p.id === selectedProject?.id) ?? null}
//               onSelect={(item) => {
//                 setSelectedProject(item);
//                 setSelectedStep(null);
//               }}
//               getItemId={(item) => item.id}
//               getItemLabel={(item) => item.name}
//               placeholder="בחר פרויקט..."
//             />
//           </div>
//           {stepsError && (
//             <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
//               {stepsError}
//             </div>
//           )}
//           <div>
//             <label className="block text-sm font-semibold text-gray-700 mb-1.5">שלב / משימה</label>
//             <AutoComplete
//               items={steps}
//               selectedItem={steps.find((s) => s.id === selectedStep?.id) ?? null}
//               onSelect={(item) => setSelectedStep(item)}
//               getItemId={(item) => item.id}
//               getItemLabel={(item) => item.name}
//               placeholder="בחר שלב..."
//               disabled={!selectedProject}
//             />
//           </div>
//         </div>
//         <div className="border-t px-6 py-4 flex gap-3">
//           <button onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50">ביטול</button>
//           <button
//             onClick={handleConfirm}
//             disabled={!selectedProject || !selectedStep}
//             className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
//           >
//             המשך
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Main Component ─────────────────────────────────────────────────────────────
// export default function HoursReportList() {
//   const [reports, setReports]     = useState<HourReportList[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [loadError, setLoadError] = useState('');
//   const [viewMode, setViewMode]   = useState<ViewMode>('date');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [hoursDbFilters, setHoursDbFilters] = usePersistedHoursDbFilters(
//     'taskit.hoursReport.dbFilters',
//     getDefaultHoursDBFilters
//   );
//   const [showViewModal, setShowViewModal]     = useState(false);
//   const [showFilterModal, setShowFilterModal] = useState(false);
//   const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
//   const [openColumnFilter, setOpenColumnFilter] = useState<HoursColumnFilterKey | null>(null);
//   const [columnFilterSearch, setColumnFilterSearch] = useState({
//     dateTime: '',
//     projectName: '',
//     employeeName: ''
//   });
//   const [columnFilters, setColumnFilters] = useState({
//     dateTimes: [] as string[],
//     projectNames: [] as string[],
//     employeeNames: [] as string[]
//   });

//   // Edit / New report modals
//   const [editHourReport, setEditHourReport] = useState<HoursReport | null>(null);

//   const [editTask, setEditTask] = useState<TaskReview | null>(null);
//   const [showNewSelector, setShowNewSelector] = useState(false);

//   useEffect(() => {
//     void loadReports();
//   }, [hoursDbFilters.dateFrom, hoursDbFilters.dateTo]);
//   const toggleArrayFilter = <T,>(items: T[], value: T) =>
//     items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

//   const projectFilterOptions = useMemo(
//     () => [...new Set(reports.map((r) => r.projectName).filter(Boolean))]
//       .sort((a, b) => a.localeCompare(b, 'he'))
//       .map((name) => ({ value: name, label: name })),
//     [reports]
//   );

//   const employeeFilterOptions = useMemo(
//     () => [...new Set(reports.map((r) => r.employeeName).filter(Boolean))]
//       .sort((a, b) => a.localeCompare(b, 'he'))
//       .map((name) => ({ value: name, label: name })),
//     [reports]
//   );

//   const dateTimeFilterOptions = useMemo(
//     () => [...new Set(reports.map((r) => r.dateTime.split('T')[0]))]
//       .sort((a, b) => b.localeCompare(a))
//       .map((value) => ({ value, label: formatDateHe(value) })),
//     [reports]
//   );

//   const columnFilterCount =
//     columnFilters.dateTimes.length +
//     columnFilters.projectNames.length +
//     columnFilters.employeeNames.length;

//   const isColumnFilterActive = (key: HoursColumnFilterKey) => {
//     switch (key) {
//       case 'dateTime':
//         return columnFilters.dateTimes.length > 0;
//       case 'projectName':
//         return columnFilters.projectNames.length > 0;
//       case 'employeeName':
//         return columnFilters.employeeNames.length > 0;
//       default:
//         return false;
//     }
//   };

//   const renderHeaderFilter = ({
//     filterKey,
//     label,
//     headerClassName,
//     align = 'right',
//     contentClassName = 'w-72',
//     children,
//   }: {
//     filterKey: HoursColumnFilterKey;
//     label: string;
//     headerClassName: string;
//     align?: 'right' | 'center';
//     contentClassName?: string;
//     children: React.ReactNode;
//   }) => (
//     <th className={`${headerClassName} relative`}>
//       <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : 'justify-between'}`}>
//         <span>{label}</span>
//         <button
//           type="button"
//           onClick={() => setOpenColumnFilter((current) => current === filterKey ? null : filterKey)}
//           className={`p-1 rounded-md border transition-colors ${
//             isColumnFilterActive(filterKey)
//               ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
//               : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'
//           }`}
//           title={`סינון ${label}`}
//         >
//           <Filter size={12} />
//         </button>
//       </div>

//       {openColumnFilter === filterKey && (
//           <div className={`absolute mt-2 z-50 right-0 ${contentClassName} rounded-xl border border-gray-200 bg-white shadow-xl p-3`}>
//       {/* <div className={`absolute top-full right-0 mt-2 z-50 ${contentClassName} rounded-xl border border-gray-200 bg-white shadow-xl p-3`}> */}
//           <div className="flex items-center justify-between mb-3">
//             <span className="text-sm font-semibold text-gray-800">סינון {label}</span>
//             <button
//               type="button"
//               onClick={() => setOpenColumnFilter(null)}
//               className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
//             >
//               <X size={14} />
//             </button>
//           </div>
//           {children}
//         </div>
//       )}
//     </th>
//   );

// const loadReports = async (dbRange?: { dateFrom: string; dateTo: string; projects: number[] }) => {
//       setIsLoading(true);
//       setLoadError('');

//       const range = dbRange ?? hoursDbFilters;

//       try {
//         const user = authService.getCurrentUser();
//         if (!user) {
//           setReports([]);
//           setLoadError('לא נמצא משתמש מחובר');
//           return;
//         }

//         const serverReports = await getHourReports({
//           Database: user.dataBase,
//           EmployeeID: user.id,
//           PermissionType: user.permissionId,
//           FromDate: range.dateFrom || null,
//           ToDate: range.dateTo || null,
//           projects: range.projects,
//         });

//         setReports(serverReports);
//       } catch (error) {
//         setReports([]);
//         setLoadError(error instanceof Error ? error.message : 'שגיאה בטעינת דיווחי שעות');
//       } finally {
//         setIsLoading(false);
//       }
//     };
//   const baseFiltered = useMemo(() => reports.filter(r => {
//     const q = searchQuery.toLowerCase();
//     const matchSearch = !q || [r.name, r.projectName, r.employeeName, r.description || '']
//       .some(v => v.toLowerCase().includes(q));
//     const matchDbProjects =
//       hoursDbFilters.projects.length === 0 || hoursDbFilters.projects.includes(r.projectID);
//     return matchSearch && matchDbProjects;
//   }), [reports, searchQuery, hoursDbFilters.projects]);

//   const filtered = useMemo(() => baseFiltered.filter((r) => {
//     const reportDateValue = r.dateTime.split('T')[0];

//     const matchDateTime = columnFilters.dateTimes.length === 0 || columnFilters.dateTimes.includes(reportDateValue);
//     const matchProject = columnFilters.projectNames.length === 0 || columnFilters.projectNames.includes(r.projectName);
//     const matchEmployee = columnFilters.employeeNames.length === 0 || columnFilters.employeeNames.includes(r.employeeName);

//     return matchDateTime && matchProject && matchEmployee;
//   }), [baseFiltered, columnFilters]);

//   const totalHours    = useMemo(() => filtered.reduce((s, r) => s + r.hours, 0), [filtered]);
//   const activeFilters = useMemo(
//     () => countActiveHoursDbFilters(hoursDbFilters) + columnFilterCount,
//     [hoursDbFilters, columnFilterCount]
//   );

//   const handleDelete =  async (id: number) =>{
//     await deleteHourReport(id);
//    setReports(prev => prev.filter(r => r.hoursReportID !== id));

//   }
//   // Open edit modal — build a Task from the report entry
//   const handleEdit = (r: HourReportList) => {
//     const report:HoursReport={
//       id: r.hoursReportID,
//       taskId: r.objectID,
//       reportDate: r.dateTime,
//       fromTime: r.startTime,
//       toTime: r.endTime,
//       totalHours: r.hours,
//       inputMode:r.startTime && r.endTime ? 'range' : 'total',
//       notes: r.description ?? undefined,
//     }
//     setEditHourReport(report);
//     const task: TaskReview = {
//       id: r.objectID,
//       name: r.name,
//       stage: r.name,
//       projectName: r.projectName,
//       projectId: r.projectID,
//       isPlanningSte: r.isPlanningStep,
//       status: 'todo',
//       urgency: 'medium',
//       sender: r.employeeName,
//       receivers: [],
//       date: r.dateTime,
//       completed: false,
//       hoursEstimate: r.hours,
//       planning: '',
//     } as unknown as TaskReview;
//     setEditTask(task);
//   };

//   const handleSaveReport = () => {
//     // Update existing or add new
//     loadReports();
//     setEditTask(null);
//   };

//   const toggleGroup = (key: string) => setCollapsed(prev => {
//     const next = new Set(prev);
//     next.has(key) ? next.delete(key) : next.add(key);
//     return next;
//   });

//   const byDate     = useMemo(() => groupByDate(filtered),     [filtered]);
//   const byEmployee = useMemo(() => groupByEmployee(filtered), [filtered]);
//   const byProject  = useMemo(() => groupByProject(filtered),  [filtered]);

//   const hideDate     = viewMode === 'date';
//   const hideProject  = viewMode === 'project';
//   const hideEmployee = viewMode === 'employee'||authService.getPermissionId() === 4;
//   // Base columns: Task, Start, End, TotalHours, Notes, Actions (=6)
//   // Plus optional grouped columns (Date/Project/Employee).
//   const totalCols = 6 + (hideDate ? 0 : 1) + (hideProject ? 0 : 1) + (hideEmployee ? 0 : 1);

//   return (
//     <div className="p-6 space-y-5" dir="rtl">

//       {/* Header */}
//       <HoursReportHeader
//         searchQuery={searchQuery}
//         onSearchChange={setSearchQuery}
//         activeFiltersCount={activeFilters}
//         onShowViewModal={() => setShowViewModal(true)}
//         onShowFilterModal={() => setShowFilterModal(true)}
//         onShowNewSelector={() => setShowNewSelector(true)}
//         totalHours={totalHours}
//         filteredReportsCount={filtered.length}
//         totalReportsCount={reports.length}
//       />

//       {loadError && (
//         <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
//           {loadError}
//         </div>
//       )}

//       {isLoading && (
//         <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
//           <Clock size={40} className="text-gray-300 mx-auto mb-3 animate-pulse" />
//           <div className="text-gray-500 font-medium">טוען דיווחי שעות...</div>
//         </div>
//       )}

//       {/* Empty state */}
//       {!isLoading && filtered.length === 0 && (
//         <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
//           <Clock size={40} className="text-gray-300 mx-auto mb-3" />
//           <div className="text-gray-400 font-medium">לא נמצאו דיווחי שעות</div>
//           <div className="text-gray-300 text-sm mt-1">נסה לשנות את פרמטרי החיפוש</div>
//         </div>
//       )}

//       {/* Table */}
//       {!isLoading && filtered.length > 0 && (
//         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full table-fixed min-w-[900px]">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-200">
//                   {!hideDate && renderHeaderFilter({
//                     filterKey: 'dateTime',
//                     label: 'תאריך',
//                     headerClassName: 'px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-28',
//                     children: (
//                       <div className="relative">
//                         <SearchableCheckboxFilter
//                           searchValue={columnFilterSearch.dateTime}
//                           onSearchChange={(value) => setColumnFilterSearch((prev) => ({ ...prev, dateTime: value }))}
//                           options={dateTimeFilterOptions}
//                           selectedValues={columnFilters.dateTimes}
//                           onToggle={(value) => setColumnFilters((prev) => ({ ...prev, dateTimes: toggleArrayFilter(prev.dateTimes, value) }))}
//                           onClear={() => setColumnFilters((prev) => ({ ...prev, dateTimes: [] }))}
//                           searchPlaceholder="חיפוש תאריך..."
//                           emptyMessage="לא נמצאו תאריכים"
//                         />
//                       </div>
//                     )
//                   })}
//                   <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">שלב / משימה</th>
//                     {!hideProject && renderHeaderFilter({
//                     filterKey: 'projectName',
//                     label: 'פרויקט',
//                     headerClassName: 'px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-32',
//                     //contentClassName: 'w-72 -right-20',
//                     children: (
//                       <SearchableCheckboxFilter
//                       searchValue={columnFilterSearch.projectName}
//                       onSearchChange={(value) => setColumnFilterSearch((prev) => ({ ...prev, projectName: value }))}
//                       options={projectFilterOptions}
//                       selectedValues={columnFilters.projectNames}
//                       onToggle={(value) => setColumnFilters((prev) => ({ ...prev, projectNames: toggleArrayFilter(prev.projectNames, value) }))}
//                       onClear={() => setColumnFilters((prev) => ({ ...prev, projectNames: [] }))}
//                       searchPlaceholder="חיפוש פרויקט..."
//                       emptyMessage="לא נמצאו פרויקטים"
//                       />
//                     )
//                     })}
//                     {!hideEmployee && renderHeaderFilter({
//                     filterKey: 'employeeName',
//                     label: 'עובד מדווח',
//                     headerClassName: 'px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-36',
//                     children: (
//                       <div className="relative">
//                       <SearchableCheckboxFilter
//                         searchValue={columnFilterSearch.employeeName}
//                         onSearchChange={(value) => setColumnFilterSearch((prev) => ({ ...prev, employeeName: value }))}
//                         options={employeeFilterOptions}
//                         selectedValues={columnFilters.employeeNames}
//                         onToggle={(value) => setColumnFilters((prev) => ({ ...prev, employeeNames: toggleArrayFilter(prev.employeeNames, value) }))}
//                         onClear={() => setColumnFilters((prev) => ({ ...prev, employeeNames: [] }))}
//                         searchPlaceholder="חיפוש עובד..."
//                         emptyMessage="לא נמצאו עובדים"
//                       />
//                       </div>
//                     )
//                     })}
//                   <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 w-20">משעה</th>
//                   <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 w-20">עד שעה</th>
//                   <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 w-24">סה"כ שעות</th>
//                   <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">הערות</th>
//                   <th className="px-4 py-2.5 w-20"></th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {viewMode === 'date' && byDate.map(group => (
//                   <React.Fragment key={group.date}>
//                     <GroupRow
//                       label={formatDateHe(group.date)}
//                       sub={new Date(group.date).toLocaleDateString('he-IL', { weekday: 'long' })}
//                       totalHours={group.totalHours} count={group.reports.length}
//                       color="bg-gradient-to-l from-teal-600 to-teal-500"
//                       expanded={!collapsed.has(group.date)} onToggle={() => toggleGroup(group.date)}
//                       totalCols={totalCols}
//                     />
//                     {!collapsed.has(group.date) && group.reports.map(r => (
//                       <DataRow key={r.hoursReportID} r={r} onDelete={handleDelete} onEdit={handleEdit}
//                         hideDate={hideDate} hideProject={hideProject} hideEmployee={hideEmployee} />
//                     ))}
//                   </React.Fragment>
//                 ))}
//                 {viewMode === 'employee' && byEmployee.map(group => (
//                   <React.Fragment key={group.reporterName}>
//                     <GroupRow
//                       label={group.reporterName}
//                       totalHours={group.totalHours} count={group.reports.length}
//                       color="bg-gradient-to-l from-violet-600 to-violet-500"
//                       expanded={!collapsed.has(group.reporterName)} onToggle={() => toggleGroup(group.reporterName)}
//                       totalCols={totalCols}
//                       avatar={
//                         <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(group.reporterName)} flex items-center justify-center text-white text-[10px] font-bold border-2 border-white border-opacity-30`}>
//                           {getInitials(group.reporterName)}
//                         </div>
//                       }
//                     />
//                     {!collapsed.has(group.reporterName) && group.reports.map(r => (
//                       <DataRow key={r.hoursReportID} r={r} onDelete={handleDelete} onEdit={handleEdit}
//                         hideDate={hideDate} hideProject={hideProject} hideEmployee={hideEmployee} />
//                     ))}
//                   </React.Fragment>
//                 ))}
//                 {viewMode === 'project' && byProject.map(group => (
//                   <React.Fragment key={group.project}>
//                     <GroupRow
//                       label={group.project}
//                       totalHours={group.totalHours} count={group.reports.length}
//                       color="bg-gradient-to-l from-blue-600 to-blue-500"
//                       expanded={!collapsed.has(group.project)} onToggle={() => toggleGroup(group.project)}
//                       totalCols={totalCols}
//                     />
//                     {!collapsed.has(group.project) && group.reports.map(r => (
//                       <DataRow key={r.hoursReportID} r={r} onDelete={handleDelete} onEdit={handleEdit}
//                         hideDate={hideDate} hideProject={hideProject} hideEmployee={hideEmployee} />
//                     ))}
//                   </React.Fragment>
//                 ))}
//                 {/* flat list — no grouping */}
//                 {viewMode === 'all' && filtered.map(r => (
//                 <DataRow key={r.objectID} r={r} onDelete={handleDelete} onEdit={handleEdit} />
//                 ))}
//               </tbody>
//               <tfoot className="bg-teal-50 border-t-2 border-teal-200">
//                 <tr>
//                   {/* Span all columns up to the TotalHours column */}
//                   <td colSpan={totalCols - 3} className="px-4 py-2.5">
//                     <span className="text-sm font-bold text-teal-800">סה"כ: {filtered.length} דיווחים</span>
//                   </td>
//                   <td className="px-4 py-2.5 text-center">
//                     <span className="inline-flex items-center px-3 py-0.5 bg-teal-500 text-white rounded-full text-sm font-bold">
//                       {formatHours(totalHours)}
//                     </span>
//                   </td>
//                   <td colSpan={2}></td>
//                 </tr>
//               </tfoot>
//             </table>
//           </div>
//         </div>
//       )}

//       {/* Modals */}
//       {showViewModal && (
//         <HoursViewModal viewMode={viewMode} onSelect={setViewMode} onClose={() => setShowViewModal(false)} />
//       )}
//       {showFilterModal && (
//         <HoursReportDbFilter
//           onClose={() => setShowFilterModal(false)}
//           onApply={(next) => {
//             setHoursDbFilters(next);
//             void loadReports({ dateFrom: next.dateFrom, dateTo: next.dateTo,projects: next.projects});
//           }}
//           currentFilters={hoursDbFilters}
//         />
//       )}

//       {/* New report — step 1: select project + stage */}
//       {showNewSelector && (
//         <NewReportSelectorModal
//           onSelect={(task) => {
//             setEditHourReport(null);
//             setEditTask(task);
//             setShowNewSelector(false);
//           }}
//           onClose={() => setShowNewSelector(false)}
//         />
//       )}

//       {/* Edit / New report — step 2: HoursReportModal */}
//       {editTask && (
//         <HoursReportModal
//           task={editTask}
//           editReport={editHourReport}
//           onClose={() => {
//             setEditTask(null);
//             setEditHourReport(null);
//           }}
//           onSave={handleSaveReport}
//         />
//       )}

//     </div>
//   );
// }