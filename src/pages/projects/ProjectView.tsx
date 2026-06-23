import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, ChevronLeft, Folder, ListTodo, BarChart3, Info } from 'lucide-react';
import ProjectTopicsTab from './projectTopics/ProjectTopicsTab';
import ProjectDashboardTab from './dashBoard/ProjectDashboardTab';
import ProjectInfoTab from './projectInfo/ProjectInfoTab';
import { updateProjectIsDefault } from '../../services/projectInfoService';
import AllTasks from '../tasks/AllTasks';
import type { TaskReview } from '../../Data/projectsData';
import type { SettingsTabHandle } from '../settings/settingsTabHandle';
import { useUnsavedChangesPrompt } from '../settings/useUnsavedChangesPrompt';

interface ProjectViewProps {
  projectId: number;
  projectName: string;
  onBack: () => void;
  isDefault: boolean;
  onFavoriteChange: (projectId: number, isDefault: boolean) => void;
  permissionId?: number;
}

type ProjectTab = 'topics' | 'tasks' | 'dashboard' | 'info';
type ProjectTopicsStepFocus = {
  projectId: number;
  planningTopicId: number;
  stepId: number;
  token: number;
};

/** Read focus once (sync) so the first paint can pass ids into ProjectTopicsTab before useEffect runs. */
function readTopicsStepFocusFromSession(forProjectId: number): ProjectTopicsStepFocus | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('projectTopicsStepFocus');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProjectTopicsStepFocus;
    if (parsed && parsed.projectId === forProjectId) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export default function ProjectView({ projectId, projectName, onBack, isDefault, onFavoriteChange, permissionId }: ProjectViewProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>('topics');
  const [isFavorite, setIsFavorite] = useState(isDefault);
  const [tasks, setTasks] = useState<TaskReview[]>();
  const [topicsStepFocus, setTopicsStepFocus] = useState<ProjectTopicsStepFocus | null>(() =>
    readTopicsStepFocusFromSession(projectId)
  );

  const topicsRef = useRef<SettingsTabHandle>(null);
  const infoRef = useRef<SettingsTabHandle>(null);
  const { guardLeave, messageBoxNode } = useUnsavedChangesPrompt();

  const getHandleForTab = (tab: ProjectTab): SettingsTabHandle | null => {
    switch (tab) {
      case 'topics':
        return topicsRef.current;
      case 'info':
        return infoRef.current;
      default:
        return null;
    }
  };

  const getActiveHandle = () => getHandleForTab(activeTab);

  const tryChangeTab = useCallback(async (next: ProjectTab) => {
    if (next === activeTab) return;
    const canLeave = await guardLeave(getActiveHandle());
    if (!canLeave) return;
    setActiveTab(next);
    await getHandleForTab(next)?.reload();
  }, [activeTab, guardLeave]);

  const tryBack = useCallback(async () => {
    const canLeave = await guardLeave(getHandleForTab(activeTab));
    if (canLeave) onBack();
  }, [activeTab, guardLeave, onBack]);

  const tabs: { id: ProjectTab; label: string; icon: React.ElementType; permission: boolean }[] = [
    { id: 'topics', label: 'נושאי תכנון', icon: Folder, permission: permissionId ? permissionId < 4 : false },
    { id: 'tasks', label: 'משימות', icon: ListTodo, permission: true },
    { id: 'dashboard', label: 'דאשבורד', icon: BarChart3, permission: permissionId ? permissionId < 3 : false },
    { id: 'info', label: 'מידע נוסף', icon: Info, permission: permissionId ? permissionId < 4 : false },
  ];

  const handleUpdateProjectIsDefault = async (targetProjectId: number, isDefaultValue: boolean) => {
    const success = await updateProjectIsDefault(targetProjectId, isDefaultValue);
    if (success) {
      setIsFavorite(isDefaultValue);
      onFavoriteChange(targetProjectId, isDefaultValue);
    }
  };

  const handleTaskUpdate = (updatedTask: TaskReview) => {
    setTasks(tasks?.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const handleTasksUpdate = (updatedTasks: TaskReview[]) => {
    setTasks(updatedTasks);
  };

  useEffect(() => {
    if (permissionId && permissionId === 4) {
      setActiveTab('tasks');
    }
    setIsFavorite(isDefault);
  }, [isDefault, permissionId]);

  useEffect(() => {
    const raw = sessionStorage.getItem('projectTopicsStepFocus');
    if (!raw) {
      setTopicsStepFocus(null);
      return;
    }
    try {
      const fromSession = readTopicsStepFocusFromSession(projectId);
      if (fromSession) {
        setTopicsStepFocus(fromSession);
        void tryChangeTab('topics');
      } else {
        setTopicsStepFocus(null);
      }
    } catch {
      setTopicsStepFocus(null);
    } finally {
      sessionStorage.removeItem('projectTopicsStepFocus');
    }
  }, [projectId, tryChangeTab]);

  useEffect(() => {
    const onFocusEvent = (evt: Event) => {
      const ce = evt as CustomEvent<ProjectTopicsStepFocus>;
      const detail = ce.detail;
      if (!detail || detail.projectId !== projectId) return;
      setTopicsStepFocus(detail);
      void tryChangeTab('topics');
    };
    window.addEventListener('project-topics-focus', onFocusEvent as EventListener);
    return () => window.removeEventListener('project-topics-focus', onFocusEvent as EventListener);
  }, [projectId, tryChangeTab]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 h-screen overflow-hidden" dir="rtl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => void tryBack()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-200"
            >
              <ChevronLeft size={20} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">{projectName}</h1>
                <span className="bright-surface bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-lg">
                  P-{String(projectId).padStart(4, '0')}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              const nextValue = !isFavorite;
              await handleUpdateProjectIsDefault(projectId, nextValue);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            <Star
              size={16}
              className={isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}
            />
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {isFavorite ? 'מועדף' : 'פרויקט'}
            </span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.filter(tab => tab.permission).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => void tryChangeTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-all text-sm rounded-t-lg ${
                activeTab === tab.id
                  ? tab.id === 'info'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4">
        <div className="min-h-full">
          <div className={activeTab === 'topics' ? '' : 'hidden'}>
            <ProjectTopicsTab
              ref={topicsRef}
              projectId={projectId}
              focusPlanningTopicId={topicsStepFocus?.planningTopicId}
              focusStepId={topicsStepFocus?.stepId}
              focusToken={topicsStepFocus?.token}
            />
          </div>
          {activeTab === 'tasks' && (
            <AllTasks
              tasks={tasks ?? []}
              projectId={projectId}
              onTaskUpdate={handleTaskUpdate}
              onTasksUpdate={handleTasksUpdate}
            />
          )}
          {activeTab === 'dashboard' && (
            <ProjectDashboardTab projectId={projectId} />
          )}
          <div className={activeTab === 'info' ? '' : 'hidden'}>
            <ProjectInfoTab
              ref={infoRef}
              projectId={projectId}
              permissionId={permissionId}
            />
          </div>
        </div>
      </div>
      {messageBoxNode}
    </div>
  );
}
