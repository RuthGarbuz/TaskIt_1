import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AllTasks from './pages/tasks/AllTasks';
import MyTasks from './pages/tasks/MyTasks';
import Settings from './pages/settings/Settings';
import ProjectView from './pages/projects/ProjectView';
import Login from './pages/login/Login';
import authService from './services/authService';
import { getBasicProjects } from './services/projectInfoService';
import type { CurrentView } from './types/index';
import type { Task } from './types/index';
import { initialTasks } from './Data/tasks';
import type { ProjectBasic } from './Data/projectInfoData';
import WorkloadView from './components/WorkLoadView';
import HoursReportList from './pages/hoursReport/HoursReportList';

interface SelectedProject {
  id: number;
  name: string;
}

function App() {
  // Login state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  // Navigation state
  const [currentView, setCurrentView] = useState<CurrentView>('myTasks');
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);
  const [projects, setProjects] = useState<ProjectBasic[]>([]);

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Login handler
  const handleLogin = async (username: string) => {
    setUsername(username);
    setIsLoggedIn(true);
  };

  // Logout handler
  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setUsername('');
    setCurrentView('myTasks');
    setSelectedProject(null);
    setProjects([]);
  };

  // Project selection handler
  const handleProjectSelect = (projectId: number, projectName: string) => {
    setSelectedProject({ id: projectId, name: projectName });
    setCurrentView('projects');
  };

  const handleFavoriteChange = (projectId: number, isDefault: boolean) => {
    setProjects(prev => {
      const updated = prev.map(p => (p.id === projectId ? { ...p, isDefault } : p));

      if (isDefault) {
        const target = updated.find(p => p.id === projectId);
        return target ? [target, ...updated.filter(p => p.id !== projectId)] : updated;
      }

      const target = updated.find(p => p.id === projectId);
      const defaults = updated.filter(p => p.isDefault && p.id !== projectId);
      const others = updated.filter(p => !p.isDefault && p.id !== projectId);

      return target ? [...defaults, target, ...others] : updated;
    });
  };

  // Back from project handler
  const handleBackFromProject = () => {
    setSelectedProject(null);
    setCurrentView('myTasks');
  };

  // View change handler
  const handleViewChange = (view: CurrentView) => {
    setCurrentView(view);
    if (view !== 'projects') {
      setSelectedProject(null);
    }
  };

  // Task handlers
  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const handleTasksUpdate = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  };

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await getBasicProjects();
        setProjects(data);
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };

    if (isLoggedIn) {
      loadProjects();
    }
  }, [isLoggedIn]);

  // Show login if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">
      {/* Sidebar - always visible */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange}
        onProjectSelect={handleProjectSelect}
        onLogout={handleLogout}
        projects={projects}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedProject && currentView === 'projects' ? (
          <ProjectView
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            onBack={handleBackFromProject}
            isDefault={projects.find(p => p.id === selectedProject.id)?.isDefault ?? false}
            onFavoriteChange={handleFavoriteChange}
          />
        ) : (
          <>
            <Header currentView={currentView} username={username} />
            <main className="flex-1 overflow-auto">
              {currentView === 'myTasks' && (
                <MyTasks 
                  tasks={tasks}
                  onTaskUpdate={handleTaskUpdate}
                  onTasksUpdate={handleTasksUpdate}
                />
              )}
              {currentView === 'allTasks' && (
                <AllTasks 
                  tasks={tasks}
                  onTaskUpdate={handleTaskUpdate}
                  onTasksUpdate={handleTasksUpdate}
                />
              )}
              {currentView === 'settings' && <Settings />}
  {currentView === 'hoursReport' && <HoursReportList />}
              {currentView === 'workload'    && <WorkloadView />}
              
            </main>
          </>
        )}
      </div>
    </div>
  );
}

export default App;