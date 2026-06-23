import { useMemo } from 'react';
import type { Task } from '../types/index';
import type { TaskReview } from '../Data/projectsData';

type GroupView = 'all' | 'status' | 'urgency' | 'project' | 'date';
type TaskLike = Task | TaskReview;

const getProject = (task: TaskLike): string =>
  'project' in task ? task.project : (task as TaskReview).projectName ?? '';

const getDateValue = (task: TaskLike): string => {
  const raw = 'date' in task
    ? (task.date ?? '')
    : (task as TaskReview).endDate ?? (task as TaskReview).startDate ?? '';
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useTaskGrouping = <T extends TaskLike>(tasks: T[], activeView: GroupView) => {
  const groupedTasks = useMemo(() => {
    if (activeView === 'all') {
      return { all: tasks };
    }

    const grouped: { [key: string]: T[] } = {};

    if (activeView === 'status') {
      const statuses = [...new Set(tasks.map(t => (t as TaskReview).statusName ?? ''))];
      statuses.forEach(status => {
        grouped[status || 'לא ידוע'] = tasks.filter(t => (t as TaskReview).statusName === status);
      });
    } else if (activeView === 'urgency') {
      const urgencies = [...new Set(tasks.map(t => (t as TaskReview).urgencyName ?? ''))];
      urgencies.forEach(urgency => {
        grouped[urgency || 'לא ידוע'] = tasks.filter(t => (t as TaskReview).urgencyName === urgency);
      });
    } else if (activeView === 'project') {
      const projects = [...new Set(tasks.map(t => getProject(t as TaskLike)))];
      projects.forEach(project => {
        grouped[project] = tasks.filter(t => getProject(t as TaskLike) === project);
      });
    } else if (activeView === 'date') {
      const dates = [...new Set(tasks.map(t => getDateValue(t as TaskLike)))]
        .sort();

      dates.forEach(date => {
        const displayKey = date
          ? date.split('-').reverse().join('/')
          : 'לא ידוע';
        grouped[displayKey] = tasks.filter(t => getDateValue(t as TaskLike) === date);
      });
    }

    return grouped;
  }, [tasks, activeView]);

  return groupedTasks;
};