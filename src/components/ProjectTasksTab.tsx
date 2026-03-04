import { useState } from 'react';
import { Filter, BarChart2, Search, List } from 'lucide-react';

interface Task {
  id: number;
  name: string;
  hours: string;
  stage: string;
  topic: string;
  project: string;
  status: 'פיתוח' | 'תיעוד' | 'בינוניות' | 'נמוכה';
  priority: 'בינונית' | 'נמוכה' | 'גבוהה';
  date: string;
  assignee: string;
  department: string;
  selected: boolean;
}

export default function ProjectTasksTab() {
  const [tasks] = useState<Task[]>([
    {
      id: 1,
      name: 'סקירת קוד פרונט',
      hours: '8h',
      stage: 'שלב ג',
      topic: 'נושא תכנון ב',
      project: 'פרויקט ד',
      status: 'בינוניות',
      priority: 'בינונית',
      date: '28/01/2026',
      assignee: 'מיכל רזן',
      department: 'פיתוח',
      selected: false
    },
    {
      id: 2,
      name: 'עדכון התקומניקציה',
      hours: '12h',
      stage: 'שלב ג',
      topic: 'נושא תכנון ג',
      project: 'פרויקט ד',
      status: 'נמוכה',
      priority: 'בינונית',
      date: '29/01/2026',
      assignee: 'רון פרץ',
      department: 'תיעוד',
      selected: false
    },
    {
      id: 3,
      name: 'אינטגרציה עם API',
      hours: '24h',
      stage: 'שלב ד',
      topic: 'נושא תכנון ד',
      project: 'פרויקט ד',
      status: 'בינוניות',
      priority: 'בינונית',
      date: '30/01/2026',
      assignee: 'יוסי כהן',
      department: 'פיתוח',
      selected: false
    }
  ]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'פיתוח': 'bg-purple-100 text-purple-700 border-purple-300',
      'תיעוד': 'bg-green-100 text-green-700 border-green-300',
      'בינוניות': 'bg-orange-100 text-orange-700 border-orange-300',
      'נמוכה': 'bg-green-100 text-green-700 border-green-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'גבוהה': 'bg-red-100 text-red-700 border-red-300',
      'בינונית': 'bg-blue-100 text-blue-700 border-blue-300',
      'נמוכה': 'bg-green-100 text-green-700 border-green-300'
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-4">
      {/* Header with filters and search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Filter size={16} />
            <span>סינון</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <BarChart2 size={16} />
            <span>תצוגה</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="חפש משימות..."
              className="pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <BarChart2 size={16} />
            <span>גאנט</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-semibold">
            <List size={16} />
            <span>רשימה</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_80px_80px_1fr_100px_100px_100px_100px_100px_120px_100px] gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
          <div className="flex items-center">
            <input type="checkbox" className="w-4 h-4" />
          </div>
          <div className="text-right">שעות</div>
          <div className="text-right">תאריך</div>
          <div className="text-right">תיאור המשימה</div>
          <div className="text-right">שלב</div>
          <div className="text-right">נושא תכנון</div>
          <div className="text-right">פרויקט</div>
          <div className="text-right">סטטוס</div>
          <div className="text-right">דחיפות</div>
          <div className="text-right">שלח</div>
          <div className="text-right">שעות</div>
        </div>

        {/* Table Body */}
        <div>
          {tasks.map((task, index) => (
            <div 
              key={task.id}
              className={`grid grid-cols-[40px_80px_80px_1fr_100px_100px_100px_100px_100px_120px_100px] gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }`}
            >
              {/* Checkbox */}
              <div className="flex items-center">
                <input type="checkbox" checked={task.selected} onChange={() => {}} className="w-4 h-4" />
              </div>

              {/* Hours */}
              <div className="flex items-center">
                <span className="text-sm font-semibold text-blue-600">{task.hours}</span>
              </div>

              {/* Date */}
              <div className="flex items-center">
                <span className="text-xs text-gray-600">{task.date}</span>
              </div>

              {/* Task Name */}
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-800">{task.name}</span>
              </div>

              {/* Stage */}
              <div className="flex items-center justify-end">
                <span className="text-xs text-gray-600">{task.stage}</span>
              </div>

              {/* Topic */}
              <div className="flex items-center justify-end">
                <span className="text-xs text-gray-600">{task.topic}</span>
              </div>

              {/* Project */}
              <div className="flex items-center justify-end">
                <span className="text-xs text-gray-600">{task.project}</span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-end">
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                  ● {task.status}
                </span>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-end">
                <button className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                  <span>▼</span>
                  <span>{task.priority}</span>
                </button>
              </div>

              {/* Assignee */}
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-gray-600">{task.assignee}</span>
                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">
                  {task.assignee.charAt(0)}
                </div>
              </div>

              {/* Hours (duplicate) */}
              <div className="flex items-center justify-end">
                <span className="text-xs text-gray-600">{task.hours}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>מציג {tasks.length} משימות</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">הקודם</button>
          <span>עמוד 1 מתוך 1</span>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">הבא</button>
        </div>
      </div>
    </div>
  );
}