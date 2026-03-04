import { useState, useMemo } from 'react';
import type { Task, CurrentView } from '../types/index';
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

export const useTaskFilters = (tasks: Task[], currentView: CurrentView, selectedEmployee: string) => {
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
  const baseTasks = useMemo(() => {
    return currentView === 'myTasks'
      ? tasks.filter(task => task.receivers.includes('Itzik'))
      : tasks;
  }, [tasks, currentView]);

  // Apply all filters
  const filteredTasks = useMemo(() => {
    let filtered = baseTasks;

    // Filter by employee (only in allTasks view)
    if (currentView === 'allTasks' && selectedEmployee) {
      filtered = filtered.filter(task => task.receivers.includes(selectedEmployee));
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        (task.subject ?? '').toLowerCase().includes(q) ||
        (task.project ?? '').toLowerCase().includes(q) ||
        (task.sender ?? '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status.includes(task.status));
    }

    // Urgency filter
    if (filters.urgency.length > 0) {
      filtered = filtered.filter(task => filters.urgency.includes(task.urgency));
    }

    // Project filter
    if (filters.project.length > 0) {
      filtered = filtered.filter(task => filters.project.includes(task.project));
    }

    // Sender filter
    if (filters.sender.length > 0) {
      filtered = filtered.filter(task => filters.sender.includes(task.sender ?? ''));
    }

    // Completed filter
    if (filters.completed === 'yes') {
      filtered = filtered.filter(task => task.completed === true);
    } else if (filters.completed === 'no') {
      filtered = filtered.filter(task => task.completed !== true);
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(task => {
        const taskDate = parseDate(task.date ?? '');
        return taskDate >= fromDate;
      });
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(task => {
        const taskDate = parseDate(task.date ?? '');
        return taskDate <= toDate;
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