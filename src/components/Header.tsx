import { Bell, User } from 'lucide-react';
import type { CurrentView } from '../types';

interface HeaderProps {
  currentView: CurrentView;
  username?: string;
}

export default function Header({ currentView, username = 'משתמש' }: HeaderProps) {
  const getViewTitle = () => {
    switch (currentView) {
      case 'myTasks':
        return 'TaskIt - משימות שלי';
      case 'allTasks':
        return 'TaskIt - כל המשימות';
      case 'projects':
        return 'TaskIt - פרויקטים';
      case 'settings':
        return 'TaskIt - הגדרות';
      default:
        return 'TaskIt';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src="/TaskIt_Logo.png" 
            alt="TaskIt Logo" 
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {getViewTitle()}
            </h1>
            <p className="text-sm text-gray-500">ניהול יעיל של המשימות</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
            <User size={18} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{username}</span>
          </div>
        </div>
      </div>
    </header>
  );
}