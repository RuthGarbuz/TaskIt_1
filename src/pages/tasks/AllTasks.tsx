import { useState } from 'react';
import type { Task } from '../../types/index';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useTaskGrouping } from '../../hooks/useTaskGrouping';
import TaskControls from './TaskControls';
import TaskTable from './TaskTable';       
import TaskCard from './TaskCard';
import ViewModal from '../../components/ViewModal';        
import FilterModal from '../../components/FilterModal';
import GanttChart from './GanttChart';

interface AllTasksProps {
  tasks: Task[];
  onTaskUpdate: (updatedTask: Task) => void;
  onTasksUpdate: (tasks: Task[]) => void;
}

export default function AllTasks({ tasks, onTaskUpdate, onTasksUpdate }: AllTasksProps) {
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [ganttTimeframe, setGanttTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeView, setActiveView] = useState<'all' | 'status' | 'urgency' | 'project' | 'date'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

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
  
  const allEmployees = Array.from(new Set(tasks.flatMap(task => task.receivers))).sort();

  const handleTaskComplete = (taskId: number) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed, status: !task.completed ? 'done' as const : 'todo' as const }
        : task
    );
    onTasksUpdate(updatedTasks);
  };

  const handleTaskStatusChange = (taskId: number, newStatus: 'todo' | 'inProgress' | 'done') => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: newStatus, completed: newStatus === 'done' }
        : task
    );
    onTasksUpdate(updatedTasks);
  };

  const handleTaskUrgencyChange = (taskId: number, newUrgency: 'low' | 'medium' | 'high') => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, urgency: newUrgency }
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
                onTaskClick={setSelectedTask}
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
          onUpdate={(updatedTask) => {
            onTaskUpdate(updatedTask);
            setSelectedTask(null);
          }}
          viewMode="allTasks"
        />
      )}
    </>
  );
}