import { useState, useMemo } from 'react';
import type { Task, CurrentView } from '../types/index';
import type { TaskReview } from '../Data/projectsData';
import { parseDate } from '../Data/tasksData';

interface Filters {
  status: string[];
  urgency: string[];
  project: string[];
  dateFrom: string;
  dateTo: string;
  sender: string[];
  completed: 'all' | 'yes' | 'no';
  projectActive: 'all' | 'active' | 'inactive';
}

type TaskLike = Task | TaskReview;

const getReceivers = (task: TaskLike): string[] =>
  'receivers' in task && Array.isArray((task as Task).receivers) ? (task as Task).receivers : (task as TaskReview).receivers ?? [];

const getStatusKey = (task: TaskLike): string => {
  if ('status' in task) return task.status;
  const value = (task as TaskReview).statusName?.toLowerCase() ?? '';
  if (value.includes('done') || value.includes('הושלם') || value.includes('סגור')) return 'done';
  if (value.includes('progress') || value.includes('בביצוע')) return 'inProgress';
  return 'todo';
};

const getUrgencyKey = (task: TaskLike): string => {
  if ('urgency' in task) return task.urgency;
  const value = (task as TaskReview).urgencyName?.toLowerCase() ?? '';
  if (value.includes('high') || value.includes('גבוה')) return 'high';
  if (value.includes('medium') || value.includes('בינונית')) return 'medium';
  return 'low';
};

const getProject = (task: TaskLike): string =>
  'project' in task ? task.project : (task as TaskReview).projectName ?? '';

const getSender = (task: TaskLike): string =>
  'sender' in task ? (task.sender ?? '') : (task as TaskReview).senderName ?? '';

const getSubject = (task: TaskLike): string =>
  'subject' in task ? (task.subject ?? '') : ((task as TaskReview).subject || (task as TaskReview).name || '');

const getCompleted = (task: TaskLike): boolean =>
  'completed' in task ? Boolean(task.completed) : Boolean((task as TaskReview).isClosed);

const getDateValue = (task: TaskLike): string =>
  'date' in task ? (task.date ?? '') : (task as TaskReview).creatDate ?? '';

const parseTaskDate = (dateStr: string) => {
  if (!dateStr) return null;
  if (dateStr.includes('-')) {
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return parseDate(dateStr);
};

export const useTaskFilters = <T extends TaskLike>(tasks: T[], currentView: CurrentView, selectedEmployee: string) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({
    status: [],
    urgency: [],
    project: [],
    dateFrom: '',
    dateTo: '',
    sender: [],
    completed: 'all',
    projectActive: 'all',
  });

  // Filter tasks by view
  const baseTasks = useMemo(() => tasks, [tasks]);

  // Apply all filters
  const filteredTasks = useMemo(() => {
    let filtered = baseTasks as T[];

    // Filter by employee (only in allTasks view)
    if (currentView === 'allTasks' && selectedEmployee) {
      filtered = filtered.filter(task => getReceivers(task as TaskLike).includes(selectedEmployee));
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        getSubject(task as TaskLike).toLowerCase().includes(q) ||
        getProject(task as TaskLike).toLowerCase().includes(q) ||
        getSender(task as TaskLike).toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status.includes(getStatusKey(task as TaskLike)));
    }

    // Urgency filter
    if (filters.urgency.length > 0) {
      filtered = filtered.filter(task => filters.urgency.includes(getUrgencyKey(task as TaskLike)));
    }

    // Project filter
    if (filters.project.length > 0) {
      filtered = filtered.filter(task => filters.project.includes(getProject(task as TaskLike)));
    }

    // Sender filter
    if (filters.sender.length > 0) {
      filtered = filtered.filter(task => filters.sender.includes(getSender(task as TaskLike)));
    }

    // Completed filter
    if (filters.completed === 'yes') {
      filtered = filtered.filter(task => getCompleted(task as TaskLike) === true);
    } else if (filters.completed === 'no') {
      filtered = filtered.filter(task => getCompleted(task as TaskLike) !== true);
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(task => {
        const taskDate = parseTaskDate(getDateValue(task as TaskLike));
        return taskDate ? taskDate >= fromDate : false;
      });
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(task => {
        const taskDate = parseTaskDate(getDateValue(task as TaskLike));
        return taskDate ? taskDate <= toDate : false;
      });
    }

    return filtered;
  }, [baseTasks, currentView, selectedEmployee, searchQuery, filters]);

  const toggleFilter = (type: 'status' | 'urgency' | 'project' | 'sender', value: string) => {
    setFilters(prev => {
      const current = prev[type] as string[];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      urgency: [],
      project: [],
      dateFrom: '',
      dateTo: '',
      sender: [],
      completed: 'all',
      projectActive: 'all',
    });
  };

  const activeFiltersCount =
    filters.status.length +
    filters.urgency.length +
    filters.project.length +
    filters.sender.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.completed !== 'all' ? 1 : 0) +
    (filters.projectActive !== 'all' ? 1 : 0);

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    toggleFilter,
    clearFilters,
    filteredTasks,
    baseTasks,
    activeFiltersCount,
  };
};