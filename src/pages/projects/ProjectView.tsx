import { useState, useEffect } from 'react';
import { Star, ChevronLeft, Folder, ListTodo, BarChart3, Info } from 'lucide-react';
import ProjectTopicsTab from './projectTopics/ProjectTopicsTab';
import ProjectTasksTab from '../../components/ProjectTasksTab';
import ProjectDashboardTab from '../../components/ProjectDashboardTab';
import ProjectInfoTab from './projectInfo/ProjectInfoTab';
import { updateProjectIsDefault } from '../../services/projectInfoService';

interface ProjectViewProps {
  projectId: number;
  projectName: string;
  onBack: () => void;
  isDefault: boolean;
  onFavoriteChange: (projectId: number, isDefault: boolean) => void;
}

type ProjectTab = 'topics' | 'tasks' | 'dashboard' | 'info';

export default function ProjectView({ projectId, projectName, onBack, isDefault, onFavoriteChange }: ProjectViewProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>('topics');
  const [isFavorite, setIsFavorite] = useState(isDefault);

  const tabs: { id: ProjectTab; label: string; icon: React.ElementType }[] = [
    { id: 'topics',    label: 'נושאי תכנון', icon: Folder   },
    { id: 'tasks',     label: 'משימות',       icon: ListTodo },
    { id: 'dashboard', label: 'דאשבורד',      icon: BarChart3 },
    { id: 'info',      label: 'מידע נוסף',    icon: Info     },
  ];
  const handleUpdateProjectIsDefault = async (targetProjectId: number, isDefaultValue: boolean) => {
    const success = await updateProjectIsDefault(targetProjectId, isDefaultValue);
    if (success) {
      setIsFavorite(isDefaultValue);
      onFavoriteChange(targetProjectId, isDefaultValue);
    }
  };

  useEffect(() => {
    setIsFavorite(isDefault);
  }, [isDefault]);
  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen overflow-hidden" dir="rtl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-800">{projectName}</h1>
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-lg">
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
            <Star
              size={16}
              className={isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}
            />
            <span className="font-medium text-gray-700">
              {isFavorite ? 'מועדף' : 'פרויקט'}
            </span>
            </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-all text-sm rounded-t-lg ${
                activeTab === tab.id
                  ? tab.id === 'info'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'topics' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <ProjectTopicsTab projectId={projectId} />
          </div>
        )}
        {activeTab === 'tasks' && <ProjectTasksTab />}
        {activeTab === 'dashboard' && <ProjectDashboardTab />}
        {activeTab === 'info' && (
          <ProjectInfoTab
            projectId={projectId}
          />
        )}
      </div>
    </div>
  );
}