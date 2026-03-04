import { Plus, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { initialProjectsData } from '../Data/projectsData';
import { useProjects } from '../hooks/useProjects';
import ProjectSection from './ProjectSection';

interface ProjectsProps {
  selectedProjectId?: number | null;
}

export default function Projects({ selectedProjectId }: ProjectsProps) {
  const {
    sections,
    toggleSection,
    toggleStage,
    addSection,
    addStage,
    addSubTask,
    deleteSection,
    deleteStage,
    deleteSubTask
  } = useProjects(initialProjectsData);

  const [selectedProjectInfo, setSelectedProjectInfo] = useState<{name: string, number: string} | null>(null);

  // כאשר פרויקט נבחר מהסיידבר, מצא את פרטיו
  useEffect(() => {
    if (selectedProjectId) {
      // כאן צריך למצוא את הפרויקט לפי ID
      // אבל עכשיו אין לנו פרויקטים - רק נושאי תכנון
      // אז נשתמש ב-ID כמספר פרויקט
      setSelectedProjectInfo({
        name: `פרויקט ${selectedProjectId === 1 ? 'א' : selectedProjectId === 2 ? 'ב' : 'ג'}`,
        number: `P-000${selectedProjectId}`
      });

      // גלול אל הנושא תכנון הרלוונטי
      setTimeout(() => {
        const element = document.getElementById(`section-${selectedProjectId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-emerald-300', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-emerald-300', 'ring-offset-2');
          }, 2000);
        }
      }, 100);
    } else {
      setSelectedProjectInfo(null);
    }
  }, [selectedProjectId]);

  const handleAddSection = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget;
      addSection(input.value);
      input.value = '';
    }
  };

  // אם יש פרויקט נבחר, הצג את פרטיו
  if (selectedProjectInfo) {
    return (
      <div className="p-6" dir="rtl">
        <div className="max-w-5xl mx-auto">
          {/* Header with selected project */}
          <div className="mb-6">
            <button
              onClick={() => setSelectedProjectInfo(null)}
              className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-3 font-medium"
            >
              <ArrowRight size={20} />
              <span>חזרה לכל הפרויקטים</span>
            </button>
            
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-800">{selectedProjectInfo.name}</h1>
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                {selectedProjectInfo.number}
              </span>
            </div>
            <p className="text-gray-600 mt-2">ניהול שלבים ומשימות</p>
          </div>

          {/* Content for selected project */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200">
            <div className="p-6 space-y-3">
              {sections
                .filter(section => section.id === selectedProjectId)
                .map((section) => (
                  <ProjectSection
                    key={section.id}
                    section={section}
                    onToggle={() => toggleSection(section.id)}
                    onDelete={() => {
                      if (window.confirm('האם אתה בטוח שברצונך למחוק נושא תכנון זה?')) {
                        deleteSection(section.id);
                        setSelectedProjectInfo(null);
                      }
                    }}
                    onToggleStage={(stageId) => toggleStage(section.id, stageId)}
                    onDeleteStage={(stageId) => {
                      if (window.confirm('האם אתה בטוח שברצונך למחוק שלב זה?')) {
                        deleteStage(section.id, stageId);
                      }
                    }}
                    onDeleteSubTask={(stageId, subTaskId) => {
                      if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
                        deleteSubTask(section.id, stageId, subTaskId);
                      }
                    }}
                    onAddStage={(name) => addStage(section.id, name)}
                    onAddSubTask={(stageId, name) => addSubTask(section.id, stageId, name)}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // תצוגת כל הפרויקטים
  return (
    <div className="p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">נושאי תכנון</h1>
          <p className="text-gray-600">ניהול שלבים ומשימות</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200">
          <div className="p-6 space-y-3">
            {/* Sections - נושאי תכנון */}
            {sections.map((section) => (
              <div 
                key={section.id}
                id={`section-${section.id}`}
                className="transition-all duration-300"
              >
                <ProjectSection
                  section={section}
                  onToggle={() => toggleSection(section.id)}
                  onDelete={() => {
                    if (window.confirm('האם אתה בטוח שברצונך למחוק נושא תכנון זה?')) {
                      deleteSection(section.id);
                    }
                  }}
                  onToggleStage={(stageId) => toggleStage(section.id, stageId)}
                  onDeleteStage={(stageId) => {
                    if (window.confirm('האם אתה בטוח שברצונך למחוק שלב זה?')) {
                      deleteStage(section.id, stageId);
                    }
                  }}
                  onDeleteSubTask={(stageId, subTaskId) => {
                    if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
                      deleteSubTask(section.id, stageId, subTaskId);
                    }
                  }}
                  onAddStage={(name) => addStage(section.id, name)}
                  onAddSubTask={(stageId, name) => addSubTask(section.id, stageId, name)}
                />
              </div>
            ))}

            {/* Add Section */}
            <div className="flex gap-2 pt-4 border-t-2 border-gray-200">
              <input
                type="text"
                onKeyDown={handleAddSection}
                placeholder="הוסף נושא תכנון... (Enter)"
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-medium"
              />
              <button className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-semibold flex items-center gap-2">
                <Plus size={18} />
                הוסף נושא תכנון
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}