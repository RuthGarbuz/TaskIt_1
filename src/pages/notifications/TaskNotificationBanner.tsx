import { useState, useEffect, useCallback } from 'react';
import { X, Folder, User } from 'lucide-react';
import {
  getUnreadNotificationsTasksCount,
  getEmployeeTasksNotifications,
  deletePlanningNotification,
  type EmployeeTasksNotification,
} from '../../services/chatService';

export default function TaskNotificationBanner() {
  const [notificationsCount, setNotificationsCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<EmployeeTasksNotification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchNotificationsCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationsTasksCount();
      setNotificationsCount(count);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getEmployeeTasksNotifications();
      setNotifications(data.filter((n) => !n.isRead));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleClose = async () => {
    setPanelOpen(false);
    try {
      let items = notifications;
      if (items.length === 0) {
        items = (await getEmployeeTasksNotifications()).filter((n) => !n.isRead);
      }
      await Promise.all(
        items.map((n) => deletePlanningNotification(n.id, n.isTask))
      );
      setNotifications([]);
      await fetchNotificationsCount();
    } catch (err) {
      console.error(err);
      await fetchNotificationsCount();
    }
  };

  useEffect(() => {
    fetchNotificationsCount();
    const interval = setInterval(fetchNotificationsCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotificationsCount]);

  useEffect(() => {
    if (panelOpen) {
      void fetchNotifications();
    }
  }, [panelOpen, fetchNotifications]);

  if (notificationsCount === 0) return null;

  return (
    <>
      {/* Banner */}
      <div
        onClick={() => setPanelOpen(true)}
        className="fixed top-0 left-0 right-0 z-40 bg-emerald-800 text-white px-5 py-3 flex items-center justify-between cursor-pointer animate-slide-down hover:bg-emerald-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">✓</span>
          <div>
            <span className="font-medium text-sm">
              יש לך {notificationsCount} משימות חדשות
            </span>
            <span className="text-xs opacity-75 mr-2">לחץ לצפייה ברשימה</span>
          </div>
        </div>
        <span className="text-sm opacity-80">◂</span>
      </div>

      {/* Overlay */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={handleClose}
        />
      )}

      {/* Side Panel */}
      {panelOpen && (
        <div className="fixed top-0 right-0 h-full w-80 z-50 bg-white shadow-xl flex flex-col animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div>
              <p className="font-semibold text-gray-800">משימות חדשות</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {notificationsCount} משימות ממתינות לך
              </p>
            </div>
            <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-6">אין משימות חדשות להצגה</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={`${n.id}`}
                  className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                >
                  <p className="font-medium text-sm text-gray-800">{n.name ?? '—'}</p>
                  {n.projectName && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Folder size={11} />
                      <span>{n.projectName}</span>
                    </div>
                  )}
                  {n.senderName && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <User size={11} />
                      <span>הוקצה ע"י {n.senderName}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="w-full py-2 text-sm rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
            >
              סמן הכל כנקרא וסגור
            </button>
          </div>
        </div>
      )}
    </>
  );
}
