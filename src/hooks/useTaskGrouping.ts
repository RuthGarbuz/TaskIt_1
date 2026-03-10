import { useMemo } from 'react';
import type { Task } from '../types/index';
import type { TaskReview } from '../Data/projectsData';

type GroupView = 'all' | 'status' | 'urgency' | 'project' | 'date';
type TaskLike = Task | TaskReview;

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

const getDateValue = (task: TaskLike): string =>
  'date' in task ? (task.date ?? '') : (task as TaskReview).creatDate ?? '';

export const useTaskGrouping = <T extends TaskLike>(tasks: T[], activeView: GroupView) => {
  const groupedTasks = useMemo(() => {
    if (activeView === 'all') {
      return { all: tasks };
    }

    const grouped: { [key: string]: T[] } = {};

    if (activeView === 'status') {
      grouped['לביצוע'] = tasks.filter(t => getStatusKey(t as TaskLike) === 'todo');
      grouped['בביצוע'] = tasks.filter(t => getStatusKey(t as TaskLike) === 'inProgress');
      grouped['הושלם'] = tasks.filter(t => getStatusKey(t as TaskLike) === 'done');
    } else if (activeView === 'urgency') {
      grouped['דחיפות גבוהה'] = tasks.filter(t => getUrgencyKey(t as TaskLike) === 'high');
      grouped['דחיפות בינונית'] = tasks.filter(t => getUrgencyKey(t as TaskLike) === 'medium');
      grouped['דחיפות נמוכה'] = tasks.filter(t => getUrgencyKey(t as TaskLike) === 'low');
    } else if (activeView === 'project') {
      const projects = [...new Set(tasks.map(t => getProject(t as TaskLike)))];
      projects.forEach(project => {
        grouped[project] = tasks.filter(t => getProject(t as TaskLike) === project);
      });
    } else if (activeView === 'date') {
      const dates = [...new Set(tasks.map(t => getDateValue(t as TaskLike)))];
      dates.forEach(date => {
        grouped[date || 'לא ידוע'] = tasks.filter(t => getDateValue(t as TaskLike) === date);
      });
    }

    return grouped;
  }, [tasks, activeView]);

  return groupedTasks;
};