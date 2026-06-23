import { useState } from 'react';
import { Bell, X, Search, Briefcase, List, CheckSquare } from 'lucide-react';
import type { EmployeeNotification } from '../Data/projectsData';

// interface Notification {
//   id: number;
//   taskId: number;
//   task: TaskReview;
//   senderName: string;
//   message: string;
//   createDate: string;
//   isRead: boolean;
// }

interface NotificationsPanelProps {
  notifications: EmployeeNotification[];
  onNotificationClick: (notification: EmployeeNotification) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return name.slice(0, 2);
};

const AVATAR_COLORS = [
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#e0f2fe', text: '#0369a1' },
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const formatRelativeDate = (dateStr: string): string => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'עכשיו';
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'אתמול';
  if (days < 7) return `לפני ${days} ימים`;
  const d = new Date(dateStr);
  const pad = (x: number) => x.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const isLastWeek = (dateStr: string): boolean => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff <= 7 * 24 * 60 * 60 * 1000;
};

export default function NotificationsPanel({
  notifications,
  onNotificationClick,
  onMarkAllAsRead,
  onClose,
}: NotificationsPanelProps) {
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [search, setSearch] = useState('');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filtered = notifications.filter(n => {
    if (unreadOnly && n.isRead) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        n.senderName.toLowerCase().includes(q) ||
        n.projectName.toLowerCase().includes(q) ||
        n.planningSubjectName.toLowerCase().includes(q) ||
        n.name.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const recent = filtered.filter(n => isLastWeek(n.createDate));
  const older = filtered.filter(n => !isLastWeek(n.createDate));

  const handleRowClick = (n: EmployeeNotification) => {
    onNotificationClick(n);
  };

  const renderCard = (n: EmployeeNotification) => {
    const color = getAvatarColor(n.senderName);
    return (
      <div
        key={n.id}
        onClick={() => handleRowClick(n)}
        className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
          !n.isRead ? 'bright-surface bg-blue-50 bg-opacity-40' : ''
        }`}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5"
          style={{ background: color.bg, color: color.text }}
        >
          {getInitials(n.senderName)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                {n.senderName}
              </span>
              <span className="text-xs text-gray-400">הזכיר אותך בעדכון</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-gray-400">{formatRelativeDate(n.createDate)}</span>
              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              )}
            </div>
          </div>

          {/* Message */}
          <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">
            {n.message}
          </p>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Project */}
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-medium"
              style={{ color: '#1d4ed8', background: '#dbeafe', borderColor: '#93c5fd' }}
            >
              <Briefcase size={9} />
              {n.projectName}
            </span>
            {/* Planning subject */}
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border"
              style={{ color: '#6d28d9', background: '#ede9fe', borderColor: '#c4b5fd' }}
            >
              <List size={9} />
              {n.planningSubjectName}
            </span>
            {/* Task name */}
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border"
              style={{ color: '#065f46', background: '#d1fae5', borderColor: '#6ee7b7' }}
            >
              <CheckSquare size={9} />
              {n.name}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700"
        style={{ width: '520px', maxHeight: '82vh' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-500 to-purple-500 px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-white" />
            <h2 className="text-white font-medium text-base">התראות</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-blue-100 hover:text-white underline transition-colors"
              >
                סמן הכל כנקרא
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Search + unread toggle */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2 flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-3 py-1.5">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חפש לפי שם, פרויקט, נושא..."
              className="flex-1 bg-transparent text-xs text-gray-600 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none border-none"
              style={{ minWidth: 0 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                title="נקה חיפוש"
                tabIndex={-1}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
            <span className="text-xs text-gray-500">לא נקראו</span>
            <div
              onClick={() => setUnreadOnly(v => !v)}
              className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                unreadOnly ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${
                  unreadOnly ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </div>
          </label>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Bell size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">אין התראות להצגה</p>
            </div>
          ) : (
            <>
              {recent.length > 0 && (
                <>
                  <div className="px-4 py-2 text-xs font-medium text-gray-400">7 ימים אחרונים</div>
                  {recent.map(renderCard)}
                </>
              )}
              {older.length > 0 && (
                <>
                  <div className="px-4 py-2 text-xs font-medium text-gray-400">התראות ישנות יותר</div>
                  {older.map(renderCard)}
                </>
              )}
            </>
          )}
        </div>
      </div>

    </>
  );
}