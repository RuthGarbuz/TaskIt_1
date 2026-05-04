import { useState } from 'react';
import { ListTodo, CheckSquare, Settings, Folder, Star, Search, LogOut, ChevronDown, ChevronLeft, Clock, TrendingUp } from 'lucide-react';
import type { CurrentView } from '../types/index';
import type { ProjectBasic } from '../Data/projectInfoData';



interface SidebarProps {
  currentView: CurrentView;
  onViewChange: (view: CurrentView) => void;
  onProjectSelect: (projectId: number, projectName: string) => void;
  onLogout: () => void;
  projects: ProjectBasic[];
  permissionId?: number; // Add permissions prop to control access to menu items
}

export default function Sidebar({ currentView, onViewChange, onProjectSelect, onLogout, projects, permissionId }: SidebarProps) {

  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
     { id: 'settings' as CurrentView, label: 'הגדרות', icon: Settings, permissions: permissionId === 1 },
    { id: 'myTasks' as CurrentView, label: 'משימות שלי', icon: ListTodo ,permissions:true},
    { id: 'allTasks' as CurrentView, label: 'כל המשימות', icon: CheckSquare ,permissions: permissionId !== 4 },
    { id: 'hoursReport' as CurrentView, label: 'דיווחי שעות', icon: Clock,       activeColor: 'bg-teal-500'  ,permissions:true  },
    { id: 'workload' as CurrentView,    label: 'עומס עבודה',  icon: TrendingUp,  activeColor: 'bg-indigo-500' ,permissions:true },
  ];

  //const favoriteProjects = projects.filter(p => p.isDefault);
  const allProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col h-screen">
      {/* Menu Items */}
      <nav className="p-4 space-y-1">
        {menuItems.filter(item => item.permissions).map((item) => (
          <button
        key={item.id}
        onClick={() => onViewChange(item.id)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
          currentView === item.id
            ? 'bg-emerald-500 text-white shadow-lg'
            : 'text-gray-300 hover:bg-gray-700'
        }`}
          >
        <item.icon size={18} />
        <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Projects Section */}
      <div className="flex-1 overflow-hidden flex flex-col border-t border-gray-700">
        <button
          onClick={() => setProjectsExpanded(!projectsExpanded)}
          className=" flex items-center justify-between px-4 py-3 hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Folder size={18} className="text-gray-400" />
            <span className="font-semibold text-sm">פרויקטים</span>
          </div>
          {projectsExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
        </button>

        {projectsExpanded && (
          <div className="flex-1 px-4 pb-4 pt-1 flex flex-col overflow-hidden">
            {/* {favoriteProjects.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-400 font-semibold mb-2 px-2">
                  פרויקטים מועדפים
                </div>
                {favoriteProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onProjectSelect(project.id, project.name)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors text-sm group"
                  >
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="flex-1 text-right">{project.name}</span>
                  </button>
                ))}
              </div>
            )} */}

            <div className="flex flex-col flex-1 min-h-0">
              {/* <div className="text-xs text-gray-400 font-semibold mb-2 px-2">
                פרויקטים 
              </div> */}

              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש פרויקט..."
                  className="w-full bg-gray-700 text-white text-xs px-3 py-2 pl-9 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1 overflow-y-auto flex-1 pr-1 sidebar-scroll">
                {allProjects.map((project, index) => (
                  <button
                    key={project.id}
                    onClick={() => onProjectSelect(project.id, project.name)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors text-sm group"
                  >
                    <span className="text-xs text-gray-500 w-5">{index + 1}</span>
                    <span className="flex-1 text-right">{project.name}</span>
                    {project.isDefault && (
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    )}
                  </button>
                ))}
              </div>

              {allProjects.length === 0 && (
                <div className="text-center text-xs text-gray-500 py-4">
                  לא נמצאו פרויקטים
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer with Logout */}
      <div className="border-t border-gray-700 p-4">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>התנתק</span>
        </button>
        <div className="text-xs text-gray-500 text-center mt-3">
          TaskIt v1.0
        </div>
      </div>
    </aside>
  );
}