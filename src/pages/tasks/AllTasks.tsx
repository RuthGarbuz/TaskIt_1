import { useEffect, useState } from 'react';
import type { EmployeeLink, SystemTable, TaskReview, TaskUpdatePatch } from '../../Data/projectsData';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useTaskGrouping } from '../../hooks/useTaskGrouping';
import TaskControls from './TaskControls';
import TaskTable from './TaskTable';       
import TaskCard from './TaskCard';
import ViewModal from '../../components/ViewModal';        
import FilterModal from '../../components/FilterModal';
import GanttChart from './GanttChart';
import { getTaskPriorities, getTaskStatuses, updateStatusAsync, updateUrgencyAsync, updateTaskAsync } from '../../services/taskService';

interface AllTasksProps {
  tasks: TaskReview[];
  onTaskUpdate: (updatedTask: TaskReview) => void;
  onTasksUpdate: (tasks: TaskReview[]) => void;
}

export default function AllTasks({ tasks, onTaskUpdate, onTasksUpdate }: AllTasksProps) {
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [ganttTimeframe, setGanttTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeView, setActiveView] = useState<'all' | 'status' | 'urgency' | 'project' | 'date'>('all');
  const [selectedTask, setSelectedTask] = useState<TaskReview | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
const [statuses, setStatuses] = useState<SystemTable[]>([]);
  const [priorities, setPriorities] = useState<SystemTable[]>([]);


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
  } = useTaskFilters(tasks, 'allTasks', selectedEmployee);

  const groupedTasks = useTaskGrouping(filteredTasks, activeView);
  
  const allEmployees = Array.from(new Set(tasks.flatMap(task => task.receivers ?? []))).sort();
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

  const handleTaskComplete = (taskId: number) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, isClosed: !task.isClosed, statusName: !task.isClosed ? 'הושלם' : task.statusName }
        : task
    );
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

  const handleTaskSubjectChange = (taskId: number, newSubject: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, subject: newSubject }
        : task
    );
    onTasksUpdate(updatedTasks);
  };
  const buildChanges = (editedTask: TaskReview): TaskUpdatePatch => {
    const urgencyId = priorities.find(p => p.name === editedTask.urgencyName)?.id ?? editedTask.urgencyID;

    return {
      id: editedTask.id,
      subject: editedTask.subject,
      statuID: editedTask.statuID,
      urgencyID: editedTask.urgencyID,
      dependsOnStepID: editedTask.dependsOnStepID,
      dependsOnTaskID: editedTask.dependsOnTaskID,

      startDate: editedTask.startDate,
      endDate: editedTask.endDate
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
  const handleTaskUpdateFromCard = async (updatedTask: TaskReview, employeeLinks: EmployeeLink[]) => {
    const changes = buildChanges(updatedTask);
    const hasChanges = Object.keys(changes).length > 1; // id + something
    if (!hasChanges && employeeLinks.every(l => !l.isModified && !l.isNew && !l.isDeleted)) return;

    const isTask = updatedTask.isPlanningSte ?? false;
    await updateTaskAsync(changes, employeeLinks, !isTask);

    onTaskUpdate(updatedTask);
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

      {viewMode === 'list' ? (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
            <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {activeView !== 'all' && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3">
                  <h3 className="text-white font-bold text-lg">{groupName}</h3>
                  <p className="text-emerald-100 text-sm">{groupTasks.length} משימות</p>
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
              />
            </div>
          ))}
        </div>
      ) : (
      <GanttChart tasks={filteredTasks} timeframe={ganttTimeframe} currentView="allTasks" />
      )}

      {selectedTask && (
        <TaskCard 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onUpdate={(updatedTask, employeeLinks) => {
            handleTaskUpdateFromCard(updatedTask, employeeLinks);
            setSelectedTask(null);
          }}
          viewMode="allTasks"
          statuses={statuses}
          priorities={priorities}
        />
      )}
    </>
  );
}