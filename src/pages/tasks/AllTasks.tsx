import { useEffect, useMemo, useState } from 'react';
import type { EmployeeLink, SystemTable, TaskCardSaveOptions, TaskParentDateCascade, TaskReview, TaskStepHoursCascade, TaskUpdatePatch } from '../../Data/projectsData';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useTaskGrouping } from '../../hooks/useTaskGrouping';
import TaskControls from './TaskControls';
import TaskTable from './TaskTable';       
import TaskCard from './TaskCard';
import ViewModal from '../../components/ViewModal';        
import GanttChart from './GanttChart';
import { getTaskPriorities, getTaskStatuses, getTasks, updateStatusAsync, updateUrgencyAsync, updateTaskAsync, updateIsClosedAsync, updateNameAsync } from '../../services/taskService';
import DbFilterModal, { getDefaultDBFilters } from './DbFilterModal';
import type { DBFilters } from '../../Data/tasksData';
import { usePersistedDbFilters } from '../../hooks/usePersistedDbFilters';
import MyTasksReportModal, { type ReportColumn } from './MyTasksReportModal';

interface AllTasksProps {
  tasks: TaskReview[];
  projectId?: number;
  onTaskUpdate: (updatedTask: TaskReview) => void;
  onTasksUpdate: (tasks: TaskReview[]) => void;
}

const ALL_TASKS_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'isClosed', label: 'נבדק', widthPx: 60, widthChars: 8, align: 'center' },
  { key: 'subject', label: 'תיאור משימה', widthPx: 220, widthChars: 30 },
  { key: 'hasChat', label: 'Chat', widthPx: 60, widthChars: 8, align: 'center' },
  { key: 'stageName', label: 'שלב', widthPx: 150, widthChars: 22 },
  { key: 'planningSubject', label: 'נושא תכנון', widthPx: 160, widthChars: 24 },
  { key: 'project', label: 'פרויקט', widthPx: 170, widthChars: 24 },
  { key: 'status', label: 'סטטוס משימה', widthPx: 130, widthChars: 16 },
  { key: 'urgency', label: 'עדיפות', widthPx: 95, widthChars: 12 },
  { key: 'sender', label: 'שולח', widthPx: 110, widthChars: 16 },
  { key: 'receiver', label: 'מקבל', widthPx: 140, widthChars: 20 },
  { key: 'startDate', label: 'תאריך התחלה', widthPx: 100, widthChars: 12, align: 'center' },
  { key: 'endDate', label: 'תאריך סיום', widthPx: 100, widthChars: 12, align: 'center' },
  { key: 'dependsOnStep', label: 'תלוי בשלב', widthPx: 100, widthChars: 14, align: 'center' },
  { key: 'workHoursBudget', label: 'תקצוב שעות למשימה', widthPx: 150, widthChars: 20 },
  { key: 'utilization', label: 'אחוז ניצול במשימה', widthPx: 130, widthChars: 16, align: 'center' },
  { key: 'invoiceIndicator', label: 'אינדקציה לחשבון', widthPx: 120, widthChars: 16, hideInPrint: true, align: 'center' }
];

export default function AllTasks({ tasks, projectId, onTaskUpdate, onTasksUpdate }: AllTasksProps) {
  const isProjectContext = (projectId ?? 0) > 0;
  const getAllTasksDefaultFilters = () => getDefaultDBFilters([], 'no');
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [ganttTimeframe, setGanttTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [ganttTask, setGanttTask] = useState<TaskReview[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeView, setActiveView] = useState<'all' | 'status' | 'urgency' | 'project' | 'date'>('all');
  const [selectedTask, setSelectedTask] = useState<TaskReview | null>(null);
  const [statuses, setStatuses] = useState<SystemTable[]>([]);
  const [priorities, setPriorities] = useState<SystemTable[]>([]);

  const taskCardStepContext = useMemo(() => {
    if (!selectedTask || selectedTask.isPlanningSte) {
      return { planStepListTask: undefined as TaskReview | undefined, tasksInSameStep: undefined as TaskReview[] | undefined };
    }
    const step = tasks.find(t => t.isPlanningSte && t.id === selectedTask.planningStepID);
    if (!step) {
      return { planStepListTask: undefined as TaskReview | undefined, tasksInSameStep: undefined as TaskReview[] | undefined };
    }
    const same = tasks.filter(t => !t.isPlanningSte && t.planningStepID === selectedTask.planningStepID);
    return { planStepListTask: step, tasksInSameStep: same };
  }, [selectedTask, tasks]);
  const [dbFilters, setDbFilters] = usePersistedDbFilters('taskit.dbFilters.allTasks', getAllTasksDefaultFilters);

  const {
    searchQuery,
    setSearchQuery,
    filteredTasks,
    activeFiltersCount,
  } = useTaskFilters(tasks, 'allTasks', selectedEmployee);

  const groupedTasks = useTaskGrouping(filteredTasks, activeView);
  
  const allEmployees = Array.from(new Set(tasks.flatMap(task => task.receivers ?? []))).sort();

  const loadTasks = async (mounted: boolean, filters?: DBFilters) => {
    try {
      const fromDate = isProjectContext ? null : (filters?.dateFrom || null);
      const toDate = isProjectContext ? null : (filters?.dateTo || null);
      const closedTasks = isProjectContext
        ? undefined
        : (filters?.closedTasks === 'yes' ? true : filters?.closedTasks === 'no' ? false : undefined);
      const extraFilters = isProjectContext
        ? undefined
        : {
            statusIds: filters?.status.length ? filters.status : undefined,
            priorityIds: filters?.urgency.length ? filters.urgency : undefined,
            projectIds: filters?.projects.length ? filters.projects : undefined,
            employeeIds: filters?.senders.length ? filters.senders : undefined
          };
      const data = await getTasks(
        projectId ?? 0,
        fromDate,
        toDate,
        closedTasks,
        extraFilters
      );
      if (mounted) onTasksUpdate(data ?? []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadGanttTasks = async (mounted: boolean, filters?: DBFilters) => {
    try {
      const closedTasks = isProjectContext
        ? undefined
        : (filters?.closedTasks === 'yes' ? true : filters?.closedTasks === 'no' ? false : undefined);
      const extraFilters = isProjectContext
        ? undefined
        : {
            statusIds: filters?.status.length ? filters.status : undefined,
            priorityIds: filters?.urgency.length ? filters.urgency : undefined,
            projectIds: filters?.projects.length ? filters.projects : undefined,
            employeeIds: filters?.senders.length ? filters.senders : undefined
          };
      const data = await getTasks(
        projectId ?? 0,
        null,
        null,
        closedTasks,
        extraFilters
      );
      if (mounted) setGanttTask(data ?? []);
    } catch (error) {
      console.error('Error loading gantt tasks:', error);
      if (mounted) setGanttTask([]);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadStatuses = async () => {
      try {
        const data = await getTaskStatuses();
        if (isMounted) {
          setStatuses(data ?? []);
        }
      } catch (error) {
        console.error('Error loading task statuses:', error);
        if (isMounted) {
          setStatuses([]);
        }
      }
    };

    const loadPriorities = async () => {
      try {
        const data = await getTaskPriorities();
        if (isMounted) {
          setPriorities(data ?? []);
        }
      } catch (error) {
        console.error('Error loading task priorities:', error);
        if (isMounted) {
          setPriorities([]);
        }
      }
    };

    loadStatuses();
    loadPriorities();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadTasks(isMounted, dbFilters);

    const intervalId = window.setInterval(() => loadTasks(true, dbFilters), 45000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [onTasksUpdate, projectId, dbFilters]);

  useEffect(() => {
    let isMounted = true;

    if (viewMode !== 'gantt') {
      return () => {
        isMounted = false;
      };
    }

    loadGanttTasks(isMounted, dbFilters);
    const intervalId = window.setInterval(() => loadGanttTasks(true, dbFilters), 45000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [viewMode, dbFilters, projectId]);

  const handleTaskComplete = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, isClosed: !task.isClosed, statusName: !task.isClosed ? 'הושלם' : task.statusName }
        : task
    );
    await updateIsClosedAsync(taskId, !task.isClosed, !task.isPlanningSte );

    onTasksUpdate(updatedTasks);
  };

  const handleTaskStatusChange = async (taskId: number, statusId: number, statusName: string) => {
    const isTask = tasks.find((task) => task.id === taskId)?.isPlanningSte ?? false;
    
    await updateStatusAsync(taskId, statusId, !isTask,true);

    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, statuID: statusId, statusName, isClosed: statusName === 'הושלם' }
        : task
    );
    onTasksUpdate(updatedTasks);
  };

 const handleTaskUrgencyChange = async (taskId: number, urgencyId: number, urgencyName: string) => {
  const isTask = tasks.find((task) => task.id === taskId)?.isPlanningSte ?? false;

  await updateUrgencyAsync(taskId, urgencyId, !isTask);

  const updatedTasks = tasks.map(task =>
    task.id === taskId
      ? { ...task, urgencyID: urgencyId, urgencyName }
      : task
  );
  onTasksUpdate(updatedTasks);
};

  const handleTaskSubjectChange = async (taskId: number, newSubject: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, stage: newSubject }
        : task
    );
    await updateNameAsync(taskId, newSubject, !task.isPlanningSte );
    onTasksUpdate(updatedTasks);
  };
  const buildChanges = (editedTask: TaskReview): TaskUpdatePatch => {
    return {
      id: editedTask.id,
      subject: editedTask.subject,
      statuID: editedTask.statuID,
      urgencyID: editedTask.urgencyID,
      dependsOnStepID: editedTask.dependsOnStepID,
      dependsOnTaskID: editedTask.dependsOnTaskID,
      workDays: editedTask.workDays,
      workHours: editedTask.workHours,
      percentage: editedTask.percentage,
      startDate: editedTask.startDate,
      endDate: editedTask.endDate,
      duration: editedTask.duration
    };
  };
 // const sameArray = (a?: string[] | null, b?: string[] | null) =>
    //JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  // const buildChanges = (editedTask: TaskReview): TaskUpdatePatch => {
  //   const changes: TaskUpdatePatch = { id: editedTask.id };
  //   const task = tasks.find((task) => task.id === editedTask.id);

  //   if (!task) return changes;


  //     if (editedTask.subject !== task.subject) changes.subject = editedTask.subject;
  //     if (editedTask.urgencyID !== task.urgencyID) {
  //       const urgencyId = priorities.find(p => p.name === editedTask.urgencyName)?.id;
  //       if (urgencyId != null) changes.urgencyID = urgencyId;
  //     }
  //     if (editedTask.dependsOnStepID !== task.dependsOnStepID) changes.dependsOnStepID = editedTask.dependsOnStepID;
  //     if ((editedTask.startDate ?? '') !== (task.startDate ?? '')) changes.startDate = editedTask.startDate;
  //     if ((editedTask.endDate ?? '') !== (task.endDate ?? '')) changes.endDate = editedTask.endDate;
  //     //if (!sameArray(editedTask.receivers, task.receivers)) changes.receivers = editedTask.receivers ?? [];


   
  //     if (editedTask.statuID !== task.statuID) changes.statuID = editedTask.statuID;


  //   return changes;
  // };
  const applyTasksLocal = (
    c: TaskStepHoursCascade,
    updated: TaskReview,
    parentDates?: TaskParentDateCascade
  ): TaskReview[] => {
    const byId = new Map(c.taskUpdates.map(x => [x.id, x]));
    return tasks.map(t => {
      if (t.id === updated.id) {
        return { ...updated };
      }
      const oDate = parentDates?.otherTaskDateUpdates?.find(x => x.id === t.id);
      if (oDate) {
        return { ...t, startDate: oDate.startDate, endDate: oDate.endDate, duration: oDate.duration };
      }
      const tu = byId.get(t.id);
      if (tu) {
        return { ...t, workHours: tu.workHours, workDays: tu.workDays, percentage: tu.percentage };
      }
      if (t.isPlanningSte && t.id === c.stepId) {
        const d =
          parentDates && parentDates.stepId === c.stepId
            ? { startDate: parentDates.startDate, endDate: parentDates.endDate }
            : {};
        return {
          ...t,
          workHours: c.newStepWorkHours,
          workDays: c.workDays ?? (c.newStepWorkHours / 8),
          ...(c.duration != null ? { duration: c.duration } : {}),
          ...d
        };
      }
      return t;
    });
  };

  const applyParentDateLocal = (d: TaskParentDateCascade, updated: TaskReview): TaskReview[] =>
    tasks.map(t => {
      if (t.id === updated.id) return { ...updated };
      const o = d.otherTaskDateUpdates?.find(x => x.id === t.id);
      if (o) {
        return { ...t, startDate: o.startDate, endDate: o.endDate, duration: o.duration };
      }
      if (t.isPlanningSte && t.id === d.stepId) {
        return {
          ...t,
          startDate: d.startDate,
          endDate: d.endDate,
          ...(d.duration != null ? { duration: d.duration } : {}),
          ...(d.workHours != null ? { workHours: d.workHours } : {}),
          ...(d.workDays != null ? { workDays: d.workDays } : {})
        };
      }
      return t;
    });

  const ymd = (v?: string | null) => {
    if (v == null || v === '') return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
  };

  const handleTaskUpdateFromCard = async (
    updatedTask: TaskReview,
    employeeLinks: EmployeeLink[],
    options?: TaskCardSaveOptions
  ) => {
    const stepCascade = options?.taskStepHoursCascade;
    const pdc = options?.taskParentDateCascade;

    if (stepCascade) {
      const c = stepCascade;
      for (const tu of c.taskUpdates) {
        const isCurrent = tu.id === updatedTask.id;
        const patch: TaskUpdatePatch = isCurrent
          ? { ...buildChanges(updatedTask), workHours: tu.workHours, workDays: tu.workDays, percentage: tu.percentage }
          : { id: tu.id, workHours: tu.workHours, workDays: tu.workDays, percentage: tu.percentage };
        await updateTaskAsync(patch, isCurrent ? employeeLinks : [], true);
      }
      const pdcForStep = pdc && pdc.stepId === c.stepId ? pdc : undefined;
      for (const o of pdcForStep?.otherTaskDateUpdates ?? []) {
        await updateTaskAsync(
          { id: o.id, startDate: o.startDate, endDate: o.endDate, duration: o.duration },
          [],
          true
        );
      }
      const stepPatch: TaskUpdatePatch = { id: c.stepId };
      if(c.newStepWorkHours) stepPatch.workHours = c.newStepWorkHours;
      if (c.duration != null) stepPatch.duration = c.duration;
      if (c.workDays != null) stepPatch.workDays = c.workDays;
      if (pdcForStep) {
        stepPatch.startDate = pdcForStep.startDate;
        stepPatch.endDate = pdcForStep.endDate;
        if (pdcForStep.duration != null) stepPatch.duration = pdcForStep.duration;
        if (pdcForStep.workHours != null) stepPatch.workHours = pdcForStep.workHours;
        if (pdcForStep.workDays != null) stepPatch.workDays = pdcForStep.workDays;
      }
      if (Object.keys(stepPatch).length > 1) {
        await updateTaskAsync(stepPatch, [], false);
      }
      onTasksUpdate(applyTasksLocal(c, updatedTask, pdcForStep));
      onTaskUpdate(updatedTask);
      return;
    }

    if (pdc) {
      const changes = buildChanges(updatedTask);
      const hasT = Object.keys(changes).length > 1;
      if (hasT || !employeeLinks.every(l => !l.isModified && !l.isNew && !l.isDeleted)) {
        await updateTaskAsync(changes, employeeLinks, true);
      }
      for (const o of pdc.otherTaskDateUpdates ?? []) {
        await updateTaskAsync(
          { id: o.id, startDate: o.startDate, endDate: o.endDate, duration: o.duration },
          [],
          true
        );
      }
      if (
        pdc.stepId
      ) {
        await updateTaskAsync(
          {
            id: pdc.stepId,
            startDate: pdc.startDate,
            endDate: pdc.endDate,
            ...(pdc.duration != null ? { duration: pdc.duration } : {}),
            ...(pdc.workHours != null ? { workHours: pdc.workHours } : {}),
            ...(pdc.workDays != null ? { workDays: pdc.workDays } : {})
          },
          [],
          false
        );
      }
      onTasksUpdate(applyParentDateLocal(pdc, updatedTask));
      onTaskUpdate(updatedTask);
      return;
    }

    const changes = buildChanges(updatedTask);
    const hasChanges = Object.keys(changes).length > 1; // id + something
    if (!hasChanges && employeeLinks.every(l => !l.isModified && !l.isNew && !l.isDeleted) && !options?.cascadeStage && !options?.taskStepHoursCascade && !options?.taskParentDateCascade) {
      return;
    }

    const isTask = updatedTask.isPlanningSte ?? false;
    await updateTaskAsync(changes, employeeLinks, !isTask);

    if (options?.cascadeStage) {
      const c = options.cascadeStage;
      await updateTaskAsync(
        { id: c.id, startDate: c.startDate, endDate: c.endDate },
        [],
        false
      );
      onTasksUpdate(
        tasks.map(t => {
          if (t.id === updatedTask.id) return { ...updatedTask };
          if (t.id === c.id) return { ...t, startDate: c.startDate, endDate: c.endDate };
          return t;
        })
      );
    }

    onTaskUpdate(updatedTask);
  };

  const formatDateCell = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-GB') : '-');

  const getReportRows = () =>
    filteredTasks.map((task) => {
      const utilization = task.utilizationPercentage ?? 0;
      const utilizationString = utilization % 1 !== 0 ? utilization.toFixed(2) : String(Math.round(utilization));
      const reported = task.hourReport ?? 0;
      const workBudget =
        reported > 0
          ? `${task.workHours ?? 0}h (${reported}h בפועל)`
          : `${task.workHours ?? 0}h`;

      return {
        isClosed: task.isClosed ? 'כן' : 'לא',
        subject: task.subject ?? '',
        hasChat: task.hasChat ? 'כן' : 'לא',
        stageName: task.name ?? '',
        planningSubject: task.planningSubjectName ?? '',
        project: task.projectName ?? '',
        status: task.statusName ?? '',
        urgency: task.urgencyName ?? '',
        sender: task.senderName ?? '',
        receiver: (task.receivers ?? []).join(', '),
        startDate: formatDateCell(task.startDate),
        endDate: formatDateCell(task.endDate),
        dependsOnStep: task.dependsOnStepID ? 'כן' : 'לא',
        workHoursBudget: workBudget,
        utilization: `${utilizationString}%`,
        invoiceIndicator: '—'
      };
    });

  const handleOpenReportMenu = () => {
    setShowReportModal(true);
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
        selectedEmployee={selectedEmployee}
        setSelectedEmployee={setSelectedEmployee}
        allEmployees={allEmployees}
        currentView="allTasks"
        activeFiltersCount={activeFiltersCount}
        onShowViewModal={() => setShowViewModal(true)}
        onShowFilterModal={() => setShowFilterModal(true)}
        onOpenReportModal={handleOpenReportMenu}
        showFilterButton={!isProjectContext}
        totalTasks={tasks.length}
        filteredTasksCount={filteredTasks.length}
      />

      {showViewModal && (
        <ViewModal
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            setShowViewModal(false);
          }}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {showFilterModal && !isProjectContext && (
        <DbFilterModal
          onClose={() => setShowFilterModal(false)}
          onApply={(nextFilters) => {
            setDbFilters(nextFilters);
            loadTasks(true, nextFilters);
          }}
          currentFilters={dbFilters}
          defaultClosedTasks="no"
        />
     
        // <FilterModal
        //   filters={filters}
        //   onFilterToggle={toggleFilter}
        //   onFiltersChange={setFilters}
        //   onClearFilters={clearFilters}
        //   onClose={() => setShowFilterModal(false)}
        //   baseTasks={baseTasks}
        //   projectSearchQuery={projectSearchQuery}
        //   setProjectSearchQuery={setProjectSearchQuery}
        // />
      )}

      {viewMode === 'list' ? (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
            <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            {activeView !== 'all' && (
            <div className={`px-6 py-3 flex items-center justify-between ${
              activeView === 'urgency' ? 'bg-gradient-to-r from-amber-400 to-orange-400' :
              activeView === 'project' ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
              activeView === 'status'  ? 'bg-gradient-to-r from-purple-400 to-purple-500' :
              activeView === 'date'    ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
              'bg-gradient-to-r from-violet-400 to-violet-500'
            }`}>
              <h3 className="text-white font-bold text-lg">{groupName}</h3>
              <span className="text-white text-sm opacity-80">({groupTasks.length} משימות)</span>
            </div>
          )}
                        
              <TaskTable
                tasks={groupTasks}
                currentView="allTasks"
                onTaskComplete={handleTaskComplete}
                onTaskStatusChange={handleTaskStatusChange}
                onTaskUrgencyChange={handleTaskUrgencyChange}
                onTaskSubjectChange={handleTaskSubjectChange}
                onTaskClick={(task) => setSelectedTask(task)}
                onTasksUpdate={onTasksUpdate}
                statuses={statuses}
                priorities={priorities}
                hideProjectColumn={isProjectContext}
              />
            </div>
            
          ))} <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-4">
            <div className="flex items-center gap-2 mb-3 border-b border-amber-200 pb-2">
              <span className="text-amber-600 text-lg">💡</span>
              <h3 className="text-sm font-semibold text-amber-800">הערות</h3>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-amber-800">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>רשימת המשימות שאני מורשה לראות</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-amber-800">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>אפשר לשנות תצוגה לרשימה, לקבץ לפי קטגוריה, עדיפות ועוד</span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
      <GanttChart 
        tasks={ganttTask}
            timeframe={ganttTimeframe}
            currentView="allTasks"
            statuses={statuses}
            priorities={priorities}
            onUpdate={(updatedTask, employeeLinks, options) => {
              void handleTaskUpdateFromCard(updatedTask, employeeLinks, options);
              setSelectedTask(null);
            } } viewMode={'allTasks'}      //onTaskUpdate={onTaskUpdate}
    //  onTasksUpdate={onTasksUpdate}
                />
      )}

      {selectedTask && (
        <TaskCard 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onUpdate={(updatedTask, employeeLinks, options) => {
            void handleTaskUpdateFromCard(updatedTask, employeeLinks, options);
            setSelectedTask(null);
          }}
          viewMode="allTasks"
          statuses={statuses}
          priorities={priorities}
          planStepListTask={taskCardStepContext.planStepListTask}
          tasksInSameStep={taskCardStepContext.tasksInSameStep}
        />
      )}

      {showReportModal && (
        <MyTasksReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          rows={getReportRows()}
          columns={ALL_TASKS_REPORT_COLUMNS}
          filteredCount={filteredTasks.length}
          reportTitle="דוח משימות - כל המשימות"
          fileBaseName={`all-tasks-report-${new Date().toISOString().slice(0, 10)}`}
        />
      )}
    </>
  );
}