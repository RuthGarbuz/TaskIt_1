import { useState } from 'react';
import type { CurrentView } from '../../types/index';
import type { TaskReview } from '../../Data/projectsData';
import AllTasks from './AllTasks';
import MyTasks from './MyTasks';

interface TaskListProps {
  currentView: CurrentView;
}

export default function TaskList({ currentView }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskReview[]>([]);

  const handleTaskUpdate = (updatedTask: TaskReview) => {
    setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const handleTasksUpdate = (updatedTasks: TaskReview[]) => {
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