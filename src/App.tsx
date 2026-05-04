import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AllTasks from './pages/tasks/AllTasks';
import MyTasks from './pages/tasks/MyTasks';
import BillTasks from './pages/tasks/BillTasks';
import Settings from './pages/settings/Settings';
import ProjectView from './pages/projects/ProjectView';
import Login from './pages/login/Login';
import authService from './services/authService';
import { getBasicProjects } from './services/projectInfoService';
import type { CurrentView } from './types/index';
import type { ProjectBasic } from './Data/projectInfoData';
import HoursReportList from './pages/hoursReport/HoursReportList';
import type { TaskReview } from './Data/projectsData';
import WorkloadView from './pages/workload/WorkloadView';

interface SelectedProject {
  id: number;
  name: string;
}

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<ProjectBasic[]>([]);
  const [tasks, setTasks] = useState<TaskReview[]>();

  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(() => {
    const stored = sessionStorage.getItem('selectedProject');
    return stored ? JSON.parse(stored) : null;
  });

  // map path → CurrentView for Header
  const pathToView: Record<string, CurrentView> = {
    '/my-tasks':     'myTasks',
    '/all-tasks':    'allTasks',
    '/bill-tasks':   'billTasks',
    '/settings':     'settings',
    '/hours-report': 'hoursReport',
    '/workload':     'workload',
  };
  const currentView: CurrentView = location.pathname.startsWith('/project/')
    ? 'projects'
    : pathToView[location.pathname] ?? 'myTasks';

  const handleLogout = () => {
    authService.logout();
    sessionStorage.removeItem('selectedProject');
    setIsLoggedIn(false);
    setUsername('');
    setSelectedProject(null);
    setProjects([]);
    navigate('/login');
  };

  const handleProjectSelect = (projectId: number, projectName: string) => {
    const project = { id: projectId, name: projectName };
    setSelectedProject(project);
    sessionStorage.setItem('selectedProject', JSON.stringify(project));
    navigate(`/project/${projectId}`);
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

  const handleViewChange = (view: CurrentView) => {
    const viewToPath: Record<CurrentView, string> = {
      myTasks:     '/my-tasks',
      allTasks:    '/all-tasks',
      billTasks:   '/bill-tasks',
      settings:    '/settings',
      hoursReport: '/hours-report',
      workload:    '/workload',
      projects:    '/',
    };
    if (view !== 'projects') {
      setSelectedProject(null);
      sessionStorage.removeItem('selectedProject');
    }
    navigate(viewToPath[view] ?? '/my-tasks');
  };

  const handleTaskUpdate = (updatedTask: TaskReview) => {
    setTasks(prev => prev?.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const handleTasksUpdate = (updatedTasks: TaskReview[]) => {
    setTasks(updatedTasks);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        setUsername(userData?.username ?? '');
        setIsLoggedIn(true);
      } catch {
        navigate('/login');
      }
    };
    const loadProjects = async () => {
      try {
        const data = await getBasicProjects();
        setProjects(data);
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };
    loadUser();
    loadProjects();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        onProjectSelect={handleProjectSelect}
        onLogout={handleLogout}
        projects={projects}
        permissionId={user?.permissionId}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          {/* Project route */}
          <Route
            path="/project/:projectId"
            element={
              selectedProject ? (
                <ProjectView
                  projectId={selectedProject.id}
                  projectName={selectedProject.name}
                  onBack={() => {
                    setSelectedProject(null);
                    sessionStorage.removeItem('selectedProject');
                    navigate('/my-tasks');
                  }}
                  isDefault={projects.find(p => p.id === selectedProject.id)?.isDefault ?? false}
                  onFavoriteChange={handleFavoriteChange}
                  permissionId={user?.permissionId}
                />
              ) : (
                <Navigate to="/my-tasks" />
              )
            }
          />

          {/* All other routes */}
          <Route
            path="/*"
            element={
              <>
                <Header currentView={currentView} username={username} />
                <main className="flex-1 overflow-auto">
                  <Routes>
                    <Route index element={<Navigate to="/my-tasks" />} />
                    <Route path="/my-tasks" element={
                      <MyTasks
                        tasks={tasks ?? []}
                        onTaskUpdate={handleTaskUpdate}
                        onTasksUpdate={handleTasksUpdate}
                      />
                    } />
                    <Route path="/all-tasks" element={
                      <AllTasks
                        tasks={tasks ?? []}
                        onTaskUpdate={handleTaskUpdate}
                        onTasksUpdate={handleTasksUpdate}
                      />
                    } />
                    <Route path="/bill-tasks" element={
                      <BillTasks
                        tasks={tasks ?? []}
                        onTaskUpdate={handleTaskUpdate}
                        onTasksUpdate={handleTasksUpdate}
                      />
                    } />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/hours-report" element={<HoursReportList />} />
                    <Route path="/workload" element={<WorkloadView />} />
                    <Route path="*" element={<Navigate to="/my-tasks" />} />
                  </Routes>
                </main>
              </>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!sessionStorage.getItem('selectedProject') || !!localStorage.getItem('token');
  });

  const handleLogin = (username: string) => {
    setIsLoggedIn(true);
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/my-tasks" /> : <Login onLogin={handleLogin} />}
      />
      <Route
        path="/*"
        element={isLoggedIn ? <AppLayout /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}

export default App;