import { useState, useEffect } from 'react';
import { Save, X, Search, Shield, User as UserIcon } from 'lucide-react';
import { getUsersList, saveUsersPermissions } from '../../../services/userService';
import type { UserListItem } from '../../../Data/settingsData';
import MessageBox from '../../shared/MessageBox';

const ROLE_OPTIONS: { value: number; label: string; color: string }[] = [
  { value: 1,      label: 'Admin',      color: 'bg-red-100 text-red-700 border-red-200'        },
  { value: 2,   label: 'עסקי',       color: 'bg-blue-100 text-blue-700 border-blue-200'     },
  { value: 3,   label: 'ראש צוות',   color: 'bg-purple-100 text-purple-700 border-purple-200'},
  { value: 4,   label: 'עובד',        color: 'bg-gray-100 text-gray-700 border-gray-200'    },
];

const getRoleOption = (role: number) => ROLE_OPTIONS.find(r => r.value === role)!;

const DEMO_USERS: UserListItem[] = [];

export default function UsersSettings() {
  const [users, setUsers] = useState<UserListItem[]>(DEMO_USERS);
  const [originalUsers, setOriginalUsers] = useState<UserListItem[]>(DEMO_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [messageBox, setMessageBox] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'success' | 'error' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'alert' });
    const loadUsers = async () => {
      try {
        const data = await getUsersList();
        setUsers(data);
        setOriginalUsers(data);
      } catch (error) {
        console.error('Failed to load users list:', error);
      }
    };

  useEffect(() => {
    
    loadUsers();
  }, []);

  const filtered = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });


  const handleUpdate = (id: number, field: keyof UserListItem, value: string | number) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, [field]: value } : u
    ));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const originalMap = new Map(originalUsers.map(u => [u.id, u]));
      const changedUsers = users.filter(u => {
        const original = originalMap.get(u.id);
        if (!original) return true;
        return original.permissionID !== u.permissionID;
      });

//       const deletedUsers = originalUsers.filter(u => !users.some(curr => curr.id === u.id));
// || deletedUsers.length > 0
      if (changedUsers.length > 0) {
        const save = await saveUsersPermissions(
          changedUsers.map(u => ({ id: u.id, permissionID: u.permissionID }))
        );
        if (save) {
          setMessageBox({
            isOpen: true,
            title: 'שמירה הצליחה',
            message: 'ההגדרות נשמרו בהצלחה!',
            type: 'success'
          });
        }
      }

      setOriginalUsers(users);
    } catch (error) {
      console.error('Failed to save users:', error);
      setMessageBox({
        isOpen: true,
        title: 'שגיאה',
        message: 'שגיאה בשמירת השינויים',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setUsers(originalUsers);
  };


  return (
    <div className="space-y-5" dir="rtl">

      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center">
            <UserIcon size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">ניהול משתמשים</h2>
            <p className="text-sm text-gray-500">{users.length} משתמשים במערכת</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold transition-all"
          >
            <X size={18} />
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {isSaving ? 'שומר...' : 'שמור שינויים'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="חיפוש לפי שם או שם משתמש..."
          className="w-full pr-10 pl-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* Role legend */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">הרשאות:</span>
        {ROLE_OPTIONS.map(r => (
          <span key={r.value} className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${r.color}`}>
            {r.label}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 w-14">#</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 min-w-[160px]">שם עובד</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 min-w-[160px]">שם משתמש</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 w-44">הרשאות</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((user, idx) => {
              const roleOpt = getRoleOption(user.permissionID);

              return (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  {/* # */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500 font-medium">{idx + 1}</span>
                  </td>

                  {/* שם עובד */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={user.username}
                      readOnly
                      placeholder="הזן שם עובד..."
                      className="w-full px-3 py-1.5 text-sm rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 border-transparent bg-transparent"
                    />
                  </td>

                  {/* שם משתמש */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={user.email}
                      readOnly
                      placeholder="user.name"
                      dir="ltr"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono border-transparent bg-transparent"
                    />
                  </td>

                  {/* הרשאות */}
                  <td className="px-4 py-3">
                    <div className="relative">
                      <select
                        value={user.permissionID}
                        onChange={e => handleUpdate(user.id, 'permissionID', Number(e.target.value))}
                        className={`w-full appearance-none px-3 py-1.5 text-xs font-semibold rounded-lg border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${roleOpt.color}`}
                      >
                        {ROLE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Shield size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                    </div>
                  </td>

                  {/* פעולות */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {/* Delete */}
                      {/* {deleteConfirmId === user.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600 transition-all"
                          >
                            מחק
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300 transition-all"
                          >
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(user.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="מחק משתמש"
                        >
                          <Trash2 size={14} />
                        </button>
                      )} */}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <UserIcon size={32} className="text-gray-300 mx-auto mb-2" />
                  <div className="text-gray-400 text-sm">לא נמצאו משתמשים</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="flex items-center gap-4 text-sm text-gray-500 px-1">
        <span>{users.length} משתמשים סה"כ</span>
        {ROLE_OPTIONS.map(r => {
          const count = users.filter(u => u.permissionID === r.value).length;
          if (!count) return null;
          return (
            <span key={r.value} className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${r.color}`}>
              {r.label}: {count}
            </span>
          );
        })}
      </div>

      <MessageBox
        isOpen={messageBox.isOpen}
        onClose={() => setMessageBox({ ...messageBox, isOpen: false })}
        title={messageBox.title}
        message={messageBox.message}
        type={messageBox.type}
        confirmText="אישור"
      />

    </div>
  );
}