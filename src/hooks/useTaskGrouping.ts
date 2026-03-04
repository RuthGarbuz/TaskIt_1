import { useMemo } from 'react';
import type { Task } from '../types/index';

type GroupView = 'all' | 'status' | 'urgency' | 'project' | 'date';

export const useTaskGrouping = (tasks: Task[], activeView: GroupView) => {
  const groupedTasks = useMemo(() => {
    if (activeView === 'all') {
      return { all: tasks };
    }

    const grouped: { [key: string]: Task[] } = {};

    if (activeView === 'status') {
      grouped['לביצוע'] = tasks.filter(t => t.status === 'todo');
      grouped['בביצוע'] = tasks.filter(t => t.status === 'inProgress');
      grouped['הושלם'] = tasks.filter(t => t.status === 'done');
    } else if (activeView === 'urgency') {
      grouped['דחיפות גבוהה'] = tasks.filter(t => t.urgency === 'high');
      grouped['דחיפות בינונית'] = tasks.filter(t => t.urgency === 'medium');
      grouped['דחיפות נמוכה'] = tasks.filter(t => t.urgency === 'low');
    } else if (activeView === 'project') {
      const projects = [...new Set(tasks.map(t => t.project))];
      projects.forEach(project => {
        grouped[project] = tasks.filter(t => t.project === project);
      });
    } else if (activeView === 'date') {
      const dates = [...new Set(tasks.map(t => t.date))];
      dates.forEach(date => {
        grouped[date ?? 'לא ידוע'] = tasks.filter(t => t.date === date);
      });
    }

    return grouped;
  }, [tasks, activeView]);

  return groupedTasks;
};