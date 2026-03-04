import { ChevronDown, ChevronLeft, Trash2, Plus } from 'lucide-react';
import type { ProjectSection as ProjectSectionType } from '../Data/projectsData';
import StageItem from './StageItem';

interface ProjectSectionProps {
  section: ProjectSectionType;
  onToggle: () => void;
  onDelete: () => void;
  onToggleStage: (stageId: number) => void;
  onDeleteStage: (stageId: number) => void;
  onDeleteSubTask: (stageId: number, subTaskId: number) => void;
  onAddStage: (name: string) => void;
  onAddSubTask: (stageId: number, name: string) => void;
}

export default function ProjectSection({
  section,
  onToggle,
  onDelete,
  onToggleStage,
  onDeleteStage,
  onDeleteSubTask,
  onAddStage,
  onAddSubTask
}: ProjectSectionProps) {
  const handleAddStage = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget;
      onAddStage(input.value);
      input.value = '';
    }
  };

  return (
    <div className="border-r-4 border-amber-400">
      {/* Section Header - נושא תכנון */}
      <div className="flex items-center gap-3 bg-amber-50 px-4 py-3 rounded-lg hover:bg-amber-100 transition-colors group">
        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-emerald-500" />
        <button
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 text-right"
        >
          {section.isExpanded ? (
            <ChevronDown size={20} className="text-gray-600" />
          ) : (
            <ChevronLeft size={20} className="text-gray-600" />
          )}
          <span className="font-bold text-gray-800 text-base">{section.name}</span>
          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
            {section.stages.length} שלבים
          </span>
        </button>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded transition-all"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Stages - שלבים ישירות תחת נושא תכנון */}
      {section.isExpanded && (
        <div className="mr-8 mt-2 space-y-2">
          {section.stages.map((stage) => (
            <StageItem
              key={stage.id}
              stage={stage}
              onToggle={() => onToggleStage(stage.id)}
              onDelete={() => onDeleteStage(stage.id)}
              onDeleteSubTask={(subTaskId) => onDeleteSubTask(stage.id, subTaskId)}
              onAddSubTask={(name) => onAddSubTask(stage.id, name)}
            />
          ))}

          {/* Add Stage Input */}
          <div className="flex gap-2 pr-7">
            <input
              type="text"
              onKeyDown={handleAddStage}
              placeholder="הוסף שלב... (Enter)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}