import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, User } from 'lucide-react';
import type { CurrentView } from '../types';
import NotificationsPanel from "./NotificationsPanel";
import type { EmployeeNotification, TaskChatMessage, TaskReview } from '../Data/projectsData';
import ChatModal from '../pages/tasks/ChatModal';
import { getEmployeeNotifications, getUnreadNotificationsCount, updateNotificationReadState } from '../services/chatService';

// interface Notification {
//   id: number;
//   taskId: number;
//   task: TaskReview;
//   senderName: string;
//   message: string;
//   createDate: string;
//   isRead: boolean;
// }

interface HeaderProps {
  currentView: CurrentView;
  username?: string;
  notifications?: EmployeeNotification[];
}

export default function Header({
  currentView,
  username = 'משתמש',
  notifications: initialNotifications = [],
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<EmployeeNotification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialNotifications.filter((n) => !n.isRead).length);
  const [chatTask, setChatTask] = useState<TaskReview | null>(null);
  const [chatInitialMessages, setChatInitialMessages] = useState<TaskChatMessage[]>([]);
  const bellRef = useRef<HTMLButtonElement>(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationsCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing unread notifications count:', error);
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
    const intervalId = window.setInterval(() => {
      void refreshUnreadCount();
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!showNotifications) return;
    let isMounted = true;

    const loadNotificationsOnOpen = async () => {
      try {
        const data = await getEmployeeNotifications();
        if (isMounted) {
          setNotifications(data);
        }
      } catch (error) {
        console.error('Error loading notifications on open:', error);
      }
    };

    void loadNotificationsOnOpen();

    return () => {
      isMounted = false;
    };
  }, [showNotifications]);

  const toChatTask = (n: EmployeeNotification): TaskReview => ({
    id: n.taskId ?? 0,
    planningStepID: 0,
    name: n.name ?? '',
    subject:  n.message ?? '',
    planningSubjectName: n.planningSubjectName ?? '',
    percentage: 0,
    workHours: 0,
    workDays: 0,
    duration: 0,
    isActive: true,
    dependsOnStepID: false,
    dependsOnTaskID: false,
    startDate: '',
    endDate: '',
    senderID: 0,
    receivers: [],
    senderName: n.senderName ?? '',
    statuID: 0,
    statusName: '',
    urgencyID: 0,
    urgencyName: '',
    note: null,
    creatDate: n.createDate ?? new Date().toISOString(),
    lastUpdate: n.createDate ?? new Date().toISOString(),
    updateBy: 0,
    isClosed: false,
    orderNum: 0,
    hourReport: 0,
    projectName: n.projectName ?? '',
    projectId: 0,
    utilizationPercentage: 0,
    hasChat: true,
    isPlanningSte: !n.isTask,
    projectType: '',
    studioDepartment: ''
  });

  const handleNotificationClick = async (notification: EmployeeNotification) => {
    if (!notification.isRead) {
      try {
        await updateNotificationReadState(notification.id, notification.isTask, true);
      } catch (error) {
        console.error('Error updating notification read state:', error);
      }
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    }

    setShowNotifications(false);
    setChatInitialMessages([
      {
        id: notification.id,
        senderID: 0,
        senderName: notification.senderName ?? '',
        createDate: notification.createDate ?? new Date().toISOString(),
        message: notification.message ?? ''
      }
    ]);
    setChatTask(toChatTask(notification));
    await refreshUnreadCount();
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);

    await Promise.all(
      unreadNotifications.map(async (notification) => {
        try {
          await updateNotificationReadState(notification.id, notification.isTask, true);
        } catch (error) {
          console.error('Error updating notification read state:', error);
        }
      })
    );

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await refreshUnreadCount();
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'myTasks':     return 'TaskIt - משימות שלי';
      case 'allTasks':    return 'TaskIt - כל המשימות';
      case 'projects':    return 'TaskIt - פרויקטים';
      case 'settings':    return 'TaskIt - הגדרות';
      case 'hoursReport': return 'TaskIt - דיווח שעות';
      case 'workload':    return 'TaskIt - עומס עבודה';
      case 'billTasks':   return 'TaskIt - חשבונות להגשה';
      default:            return 'TaskIt';
    }
  };

  const getBellPosition = () => {
    if (!bellRef.current) return { top: 70, left: 16 };
    const rect = bellRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: Math.max(8, rect.left - 640 + rect.width),
    };
  };

  const bellPos = getBellPosition();

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/TaskIt_Logo.png" alt="TaskIt Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">{getViewTitle()}</h1>
              <p className="text-sm text-gray-500">ניהול יעיל של המשימות</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* כפתור התראות */}
            <button
              ref={bellRef}
              onClick={() => setShowNotifications(prev => !prev)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="התראות"
            >
              <Bell size={20} className={showNotifications ? 'text-blue-600' : 'text-gray-600'} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* משתמש */}
            <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
              <User size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{username}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Popup */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div
            className="fixed z-50"
            style={{
              top: bellPos.top,
              left: bellPos.left,
            }}
          >
            <NotificationsPanel
              notifications={notifications}
              onNotificationClick={handleNotificationClick}
              onMarkAllAsRead={handleMarkAllAsRead}
              onClose={() => setShowNotifications(false)}
            />
          </div>
        </>
      )}
      {chatTask && (
        <ChatModal
          task={chatTask}
          setTask={setChatTask}
          //initialMessages={chatInitialMessages}
          onClose={() => {
            setChatTask(null);
            setChatInitialMessages([]);
          }}
        />
      )}
    </>
  );
}