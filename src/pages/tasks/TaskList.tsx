import { useState } from 'react';
import type { Task, CurrentView } from '../../types/index';
import { initialTasks } from '../../Data/tasksData';
import AllTasks from './AllTasks';
import MyTasks from './MyTasks';

interface TaskListProps {
  currentView: CurrentView;
}

export default function TaskList({ currentView }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const handleTasksUpdate = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  };

  return (
    <>
      {currentView === 'allTasks' ? (
        <AllTasks 
          tasks={tasks} 
          onTaskUpdate={handleTaskUpdate}
          onTasksUpdate={handleTasksUpdate}
        />
      ) : (
        <MyTasks 
          tasks={tasks} 
          onTaskUpdate={handleTaskUpdate}
          onTasksUpdate={handleTasksUpdate}
        />
      )}
    </>
  );
}