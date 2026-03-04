import { ChevronDown, ChevronLeft, Trash2 } from 'lucide-react';
import type { Stage } from '../Data/projectsData';

interface StageItemProps {
  stage: Stage;
  onToggle: () => void;
  onDelete: () => void;
  onDeleteSubTask: (subTaskId: number) => void;
  onAddSubTask: (name: string) => void;
}

export default function StageItem({
  stage,
  onToggle,
  onDelete,
  onDeleteSubTask,
  onAddSubTask
}: StageItemProps) {
  const handleAddSubTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget;
      onAddSubTask(input.value);
      input.value = '';
    }
  };

  return (
    <div className="border-r-4 border-blue-400">
      {/* Stage Header */}
      <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors group">
        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-emerald-500" />
        <button
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 text-right"
        >
          {stage.isExpanded ? (
            <ChevronDown size={16} className="text-gray-600" />
          ) : (
            <ChevronLeft size={16} className="text-gray-600" />
          )}
          <span className="font-medium text-gray-800 text-sm">{stage.name}</span>
          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">
            {stage.subTasks.length}
          </span>
        </button>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* SubTasks */}
      {stage.isExpanded && (
        <div className="mr-8 mt-2 space-y-1">
          {stage.subTasks.map((subTask) => (
            <div 
              key={subTask.id} 
              className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <input 
                type="checkbox" 
                checked={subTask.completed}
                className="w-4 h-4 rounded border-gray-300 text-emerald-500" 
              />
              <span className={`text-sm flex-1 ${subTask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {subTask.name}
              </span>
              <button
                onClick={() => onDeleteSubTask(subTask.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Add SubTask Input */}
          <div className="flex gap-2 pr-7">
            <input
              type="text"
              onKeyDown={handleAddSubTask}
              placeholder="הוסף משימה... (Enter)"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}