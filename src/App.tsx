import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AllTasks from './pages/tasks/AllTasks';
import MyTasks from './pages/tasks/MyTasks';
import BillTasks from './pages/tasks/BillTasks';
import Settings, { type SettingsRef } from './pages/settings/Settings';
import ProjectView from './pages/projects/ProjectView';
import Login from './pages/login/Login';
import authService from './services/authService';
import { getBasicProjects } from './services/projectInfoService';
import type { CurrentView } from './types/index';
import type { ProjectBasic } from './Data/projectInfoData';
import HoursReportList from './pages/hoursReport/HoursReportList';
import type { BillTaskReview, TaskReview } from './Data/projectsData';
import WorkloadView from './pages/workload/WorkloadView';
import GanttSteps from './pages/gantt/GanttSteps';
import { AppearanceProvider } from './context/AppearanceContext';
import TaskNotificationBanner from './pages/notifications/TaskNotificationBanner';

interface SelectedProject {
  id: number;
  name: string;
}

type ProjectTopicsStepFocus = {
  projectId: number;
  planningTopicId: number;
  stepId: number;
  token: number;
};

function getPageTitle(view: CurrentView, projectName?: string): string {
  if (view === 'projects' && projectName) return `PlanIt - ${projectName}`;
  switch (view) {
    case 'myTasks':     return 'PlanIt - משימות שלי';
    case 'allTasks':    return 'PlanIt - כל המשימות';
    case 'projects':    return 'PlanIt - פרויקטים';
    case 'settings':    return 'PlanIt - הגדרות';
    case 'hoursReport': return 'PlanIt - דיווח שעות';
    case 'workload':    return 'PlanIt - עומס עבודה';
    case 'billTasks':   return 'PlanIt - חשבונות להגשה';
    case 'gantt':       return 'PlanIt - גאנט שלבים';
    default:            return 'PlanIt';
  }
}

function AppLayout({ onLogout, username }: { onLogout: () => void; username: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(() => {
    const stored = sessionStorage.getItem('selectedProject');
    return stored ? JSON.parse(stored) : null;
  });
  const [projects, setProjects] = useState<ProjectBasic[]>([]);
  const [tasks, setTasks] = useState<TaskReview[]>();
  const [billTasks, setBillTasks] = useState<BillTaskReview[]>([]);
  const settingsRef = useRef<SettingsRef>(null);

  const pathToView: Record<string, CurrentView> = {
    '/my-tasks':     'myTasks',
    '/all-tasks':    'allTasks',
    '/bill-tasks':   'billTasks',
    '/settings':     'settings',
    '/hours-report': 'hoursReport',
    '/workload':     'workload',
    '/gantt':        'gantt',
  };
  const currentView: CurrentView = location.pathname.startsWith('/project/')
    ? 'projects'
    : pathToView[location.pathname] ?? 'myTasks';

  useEffect(() => {
    document.title = getPageTitle(currentView, selectedProject?.name);
  }, [currentView, selectedProject?.name]);

  const navigateAwayFromSettings = useCallback(
    async (path: string) => {
      if (location.pathname.startsWith('/settings')) {
        const canLeave = await settingsRef.current?.confirmLeave();
        if (canLeave === false) return;
      }
      navigate(path);
    },
    [location.pathname, navigate]
  );

  const handleLogout = async () => {
    await authService.logout();
    sessionStorage.removeItem('selectedProject');
    setSelectedProject(null);
    setProjects([]);
    onLogout();
  };

  const handleProjectSelect = (projectId: number, projectName: string) => {
    const project = { id: projectId, name: projectName };
    setSelectedProject(project);
    sessionStorage.setItem('selectedProject', JSON.stringify(project));
    void navigateAwayFromSettings(`/project/${projectId}`);
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

  const handleTaskUpdate = (updatedTask: TaskReview) => {
    setTasks(prev => prev?.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const handleTasksUpdate = (updatedTasks: TaskReview[]) => {
    setTasks(updatedTasks);
  };

  const handleBillTaskUpdate = (updatedTask: BillTaskReview) => {
    setBillTasks(prev => prev.map(task => (
      task.planningBillID === updatedTask.planningBillID ? updatedTask : task
    )));
  };

  const handleBillTasksUpdate = (updatedTasks: BillTaskReview[]) => {
    setBillTasks(updatedTasks);
  };

  const loadProjects = useCallback(async () => {
    try {
      const data = await getBasicProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    loadProjects();
    loadUser();
  }, [loadProjects]);

  return (




    
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
            <TaskNotificationBanner />
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          const viewToPath: Record<CurrentView, string> = {
            myTasks:     '/my-tasks',
            allTasks:    '/all-tasks',
            billTasks:   '/bill-tasks',
            settings:    '/settings',
            hoursReport: '/hours-report',
            workload:    '/workload',
            projects:    '/',
            gantt:       '/gantt',
          };
          void navigateAwayFromSettings(viewToPath[view] ?? '/my-tasks');
        }}
        onProjectSelect={handleProjectSelect}
        onLogout={handleLogout}
        projects={projects}
        onReloadProjects={loadProjects}
        permissionId={user?.permissionId}
        onOpenProjectTopicStep={(payload) => {
          const project = { id: payload.projectId, name: payload.projectName };
          setSelectedProject(project);
          sessionStorage.setItem('selectedProject', JSON.stringify(project));
          const focus: ProjectTopicsStepFocus = {
            projectId: payload.projectId,
            planningTopicId: payload.planningTopicId,
            stepId: payload.stageId,
            token: Date.now(),
          };
          sessionStorage.setItem('projectTopicsStepFocus', JSON.stringify(focus));
          window.dispatchEvent(new CustomEvent('project-topics-focus', { detail: focus }));
          void navigateAwayFromSettings(`/project/${payload.projectId}`);
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Routes>
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
                  isDefault={projects.find(p => p.id === selectedProject?.id)?.isDefault ?? false}
                  onFavoriteChange={handleFavoriteChange}
                  permissionId={user?.permissionId}
                />
              ) : (
                <Navigate to="/my-tasks" />
              )
            }
          />

          <Route
            path="/*"
            element={
              <>
                <Header currentView={currentView} username={username} />
                <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
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
                        tasks={billTasks}
                        onTaskUpdate={handleBillTaskUpdate}
                        onTasksUpdate={handleBillTasksUpdate}
                      />
                    } />
                    <Route path="/settings" element={<Settings ref={settingsRef} />} />
                    <Route path="/hours-report" element={<HoursReportList />} />
                    <Route path="/workload" element={<WorkloadView />} />
                    
                   <Route path="/gantt" element={<GanttSteps />} />
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
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => authService.isAuthenticated?.() ?? false
  );
  const [username, setUsername] = useState(() => {
    const user = authService.getCurrentUser();
    return user?.username ?? user?.email ?? '';
  });

  useEffect(() => {
    if (!isLoggedIn || location.pathname === '/login') {
      document.title = 'PlanIt - התחברות';
    }
  }, [isLoggedIn, location.pathname]);

  const handleLogin = (username: string) => {
    setIsLoggedIn(true);
    setUsername(username);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
  };

  return (
    <AppearanceProvider>
      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn
              ? <Navigate to="/my-tasks" />
              : <Login onLogin={handleLogin} />
          }
        />
        <Route
          path="/*"
          element={
            isLoggedIn
              ? <AppLayout onLogout={handleLogout} username={username} />
              : <Navigate to="/login" />
          }
        />
      </Routes>
    </AppearanceProvider>
  );
}

export default App;