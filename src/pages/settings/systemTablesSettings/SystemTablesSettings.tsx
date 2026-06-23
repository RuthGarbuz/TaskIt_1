import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Plus, Trash2, Save, Star } from 'lucide-react';
import { useSystemTables } from '../../../hooks/useSettings';
import { initialSystemTables } from '../../../Data/settingsData';
import { 
  getStatuses, 
  getPriorities, 
  insertStatus, 
  updateStatus, 
  deleteStatus as deleteStatusApi,
  insertPriority, 
  updatePriority, 
  deletePriority as deletePriorityApi 
} from '../../../services/settingService';
import type { StatusItem, PriorityItem } from '../../../types/settings';
import MessageBox from '../../shared/MessageBox';
import NumberInput from '../../shared/NumberInput';
import ConfirmDialog from '../../../components/ConfirmDialog';
import type { SettingsTabHandle } from '../settingsTabHandle';
import {
  SETTINGS_FIELD,
  SETTINGS_ROW_CARD,
  SETTINGS_SECTION_SM,
  SETTINGS_TITLE,
} from '../settingsTheme';

const SystemTablesSettings = forwardRef<SettingsTabHandle>((_props, ref) => {
  const {
    statuses,
    priorities,
    updateStatus: updateStatusState,
    updatePriority: updatePriorityState,
    setStatuses,
    setPriorities
  } = useSystemTables(initialSystemTables);

  const [isSaving, setIsSaving] = useState(false);
  const [originalStatuses, setOriginalStatuses] = useState<StatusItem[]>([]);
  const [originalPriorities, setOriginalPriorities] = useState<PriorityItem[]>([]);
  const [newStatus, setNewStatus] = useState({ name: '', color: '#6B7280', progressPercentage: 0 });
  const [newPriority, setNewPriority] = useState({ name: '', color: '#10B981' });
  
  const [messageBox, setMessageBox] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'success' | 'error' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const loadData = async () => {
    try {
      const [fetchedStatuses, fetchedPriorities] = await Promise.all([
        getStatuses(),
        getPriorities()
      ]);
      setStatuses(fetchedStatuses);
      setPriorities(fetchedPriorities);
      setOriginalStatuses(JSON.parse(JSON.stringify(fetchedStatuses)));
      setOriginalPriorities(JSON.parse(JSON.stringify(fetchedPriorities)));
    } catch (error) {
      console.error('Failed to load system tables:', error);
      setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה בטעינת טבלאות מערכת', type: 'error' });
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleAddStatus = async () => {
    if (newStatus.name.trim()) {
      try {
        const response = await insertStatus({
          name: newStatus.name,
          color: newStatus.color,
          progressPercentage: newStatus.progressPercentage,
          isDefault: false,
          isActive: true
        });
        const newId = typeof response === 'object' && response !== null && 'id' in response
          ? (response as any).id
          : response;
        const newStatusItem: StatusItem = {
          id: newId,
          name: newStatus.name,
          color: newStatus.color,
          progressPercentage: newStatus.progressPercentage,
          isDefault: false,
          isActive: true
        };
        const updatedStatuses = [...statuses, newStatusItem];
        setStatuses(updatedStatuses);
        setOriginalStatuses(JSON.parse(JSON.stringify(updatedStatuses)));
        setNewStatus({ name: '', color: '#6B7280', progressPercentage: 0 });
        setMessageBox({ isOpen: true, title: 'הצלחה', message: 'הסטטוס נוסף בהצלחה!', type: 'success' });
      } catch (error) {
        console.error('Failed to add status:', error);
        setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה בהוספת סטטוס', type: 'error' });
      }
    }
  };

  const handleDeleteStatus = async (id: number) => {
    const isDefault = statuses.find(s => s.id === id)?.isDefault;

    if (isDefault) {
      const others = statuses.filter(s => s.id !== id);
      if (others.length === 0) {
        setMessageBox({ isOpen: true, title: 'שגיאה', message: 'לא ניתן למחוק את הסטטוס היחיד', type: 'error' });
        return;
      }
      setConfirmDialog({
        isOpen: true,
        title: 'אישור מחיקה',
        message: `סטטוס זה הוא ברירת המחדל. "${others[0].name}" יהפוך לברירת המחדל החדשה. להמשיך?`,
        onConfirm: async () => {
          try {
            const success = await deleteStatusApi(id);
            if (success) {
              const updatedStatuses = others.map((s, i) => i === 0 ? { ...s, isDefault: true } : s);
              await updateStatus({ ...others[0], isDefault: true });
              setStatuses(updatedStatuses);
              setOriginalStatuses(JSON.parse(JSON.stringify(updatedStatuses)));
              setMessageBox({ isOpen: true, title: 'הצלחה', message: 'הסטטוס נמחק ובחירת ברירת המחדל עודכנה', type: 'success' });
            }
          } catch (error) {
            setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה במחיקת סטטוס', type: 'error' });
          }
        }
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'אישור מחיקה',
      message: 'האם אתה בטוח שברצונך למחוק סטטוס זה?\nמשימות עם סטטוס זה יושפעו.',
      onConfirm: async () => {
        try {
          const success = await deleteStatusApi(id);
          if (success) {
            const updatedStatuses = statuses.filter(s => s.id !== id);
            setStatuses(updatedStatuses);
            setOriginalStatuses(JSON.parse(JSON.stringify(updatedStatuses)));
            setMessageBox({ isOpen: true, title: 'הצלחה', message: 'הסטטוס נמחק בהצלחה!', type: 'success' });
          }
        } catch (error) {
          setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה במחיקת סטטוס', type: 'error' });
        }
      }
    });
  };

  const handleAddPriority = async () => {
    if (newPriority.name.trim()) {
      try {
        const response = await insertPriority({
          name: newPriority.name,
          color: newPriority.color,
          isDefault: false,
          isActive: true
        });
        const newId = typeof response === 'object' && response !== null && 'id' in response
          ? (response as any).id
          : response;
        const newPriorityItem: PriorityItem = {
          id: newId,
          name: newPriority.name,
          color: newPriority.color,
          isDefault: false,
          isActive: true
        };
        const updatedPriorities = [...priorities, newPriorityItem];
        setPriorities(updatedPriorities);
        setOriginalPriorities(JSON.parse(JSON.stringify(updatedPriorities)));
        setNewPriority({ name: '', color: '#10B981' });
        setMessageBox({ isOpen: true, title: 'הצלחה', message: 'העדיפות נוספה בהצלחה!', type: 'success' });
      } catch (error) {
        console.error('Failed to add priority:', error);
        setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה בהוספת עדיפות', type: 'error' });
      }
    }
  };

  const handleDeletePriority = async (id: number) => {
    const isDefault = priorities.find(p => p.id === id)?.isDefault;

    if (isDefault) {
      const others = priorities.filter(p => p.id !== id);
      if (others.length === 0) {
        setMessageBox({ isOpen: true, title: 'שגיאה', message: 'לא ניתן למחוק את העדיפות היחידה', type: 'error' });
        return;
      }
      setConfirmDialog({
        isOpen: true,
        title: 'אישור מחיקה',
        message: `עדיפות זו היא ברירת המחדל. "${others[0].name}" תהפוך לברירת המחדל החדשה. להמשיך?`,
        onConfirm: async () => {
          try {
            const success = await deletePriorityApi(id);
            if (success) {
              const updatedPriorities = others.map((p, i) => i === 0 ? { ...p, isDefault: true } : p);
              await updatePriority({ ...others[0], isDefault: true });
              setPriorities(updatedPriorities);
              setOriginalPriorities(JSON.parse(JSON.stringify(updatedPriorities)));
              setMessageBox({ isOpen: true, title: 'הצלחה', message: 'העדיפות נמחקה ובחירת ברירת המחדל עודכנה', type: 'success' });
            }
          } catch (error) {
            setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה במחיקת עדיפות', type: 'error' });
          }
        }
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'אישור מחיקה',
      message: 'האם אתה בטוח שברצונך למחוק עדיפות זו?\nמשימות עם עדיפות זו יושפעו.',
      onConfirm: async () => {
        try {
          const success = await deletePriorityApi(id);
          if (success) {
            const updatedPriorities = priorities.filter(p => p.id !== id);
            setPriorities(updatedPriorities);
            setOriginalPriorities(JSON.parse(JSON.stringify(updatedPriorities)));
            setMessageBox({ isOpen: true, title: 'הצלחה', message: 'העדיפות נמחקה בהצלחה!', type: 'success' });
          }
        } catch (error) {
          setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה במחיקת עדיפות', type: 'error' });
        }
      }
    });
  };

  const getChangedStatuses = () =>
    statuses.filter(status => {
      const original = originalStatuses.find(orig => orig.id === status.id);
      if (!original) return false;
      return (
        original.name !== status.name ||
        original.color !== status.color ||
        original.progressPercentage !== status.progressPercentage ||
        original.isDefault !== status.isDefault ||
        original.isActive !== status.isActive
      );
    });

  const getChangedPriorities = () =>
    priorities.filter(priority => {
      const original = originalPriorities.find(orig => orig.id === priority.id);
      if (!original) return false;
      return (
        original.name !== priority.name ||
        original.color !== priority.color ||
        original.isDefault !== priority.isDefault ||
        original.isActive !== priority.isActive
      );
    });

  const persistSave = async (showFeedback: boolean) => {
    const changedStatuses = getChangedStatuses();
    const changedPriorities = getChangedPriorities();

    if (changedStatuses.length === 0 && changedPriorities.length === 0) {
      if (showFeedback) {
        setMessageBox({ isOpen: true, title: 'אין שינויים', message: 'אין שינויים לשמירה', type: 'warning' });
      }
      return;
    }

    try {
      setIsSaving(true);
      const statusPromises = changedStatuses.map(status => {
        if (status.name === '') {
          if (showFeedback) {
            setMessageBox({
              isOpen: true,
              title: 'אין שם לסטטוס',
              message: 'אנא הזן שם לסטטוס לפני השמירה',
              type: 'warning',
            });
          }
          const origionalStatuse = originalStatuses.find(s => s.id === status.id);
          status.name = origionalStatuse ? origionalStatuse.name : status.name;
          throw new Error('Status name required');
        }
        return updateStatus(status);
      });
      const priorityPromises = changedPriorities.map(priority => updatePriority(priority));
      await Promise.all([...statusPromises, ...priorityPromises]);
      setOriginalStatuses(JSON.parse(JSON.stringify(statuses)));
      setOriginalPriorities(JSON.parse(JSON.stringify(priorities)));
      if (showFeedback) {
        setMessageBox({ isOpen: true, title: 'הצלחה', message: 'הטבלאות נשמרו בהצלחה!', type: 'success' });
      }
    } catch (error) {
      console.error('Failed to save system tables:', error);
      if (showFeedback) {
        setMessageBox({ isOpen: true, title: 'שגיאה', message: 'שגיאה בשמירת הטבלאות', type: 'error' });
      }
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    hasUnsavedChanges: () =>
      getChangedStatuses().length > 0 || getChangedPriorities().length > 0,
    save: () => persistSave(false),
    reload: loadData,
  }));

  const handleSave = () => void persistSave(true);

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <h3 className={`!text-lg sm:!text-xl ${SETTINGS_TITLE}`}>טבלאות מערכת</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="settings-header-btn flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold shadow-md text-sm w-full sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {isSaving ? 'שומר...' : 'שמור'}
        </button>
      </div>

      {/* סטטוס שלב / משימה */}
      <div className={SETTINGS_SECTION_SM}>
        <h4 className={`text-sm sm:text-base ${SETTINGS_TITLE} mb-3`}>סטטוס שלב / משימה</h4>
        <div className="overflow-x-auto">
          <div className="min-w-[650px] space-y-2">
            {/* Headers */}
            <div className="grid grid-cols-[1fr_80px_100px_80px_60px_60px] gap-2 px-2 text-xs font-semibold text-gray-600">
              <div>שם הסטטוס</div>
              <div className="text-center">צבע</div>
              <div className="text-center">אחוז התקדמות</div>
              <div className="text-center">ברירת מחדל</div>
              <div className="text-center">פעיל</div>
              <div></div>
            </div>

            {/* Status List */}
            {statuses.map((status) => (
              <div key={status.id} className={`grid grid-cols-[1fr_80px_100px_80px_60px_60px] gap-2 items-center ${SETTINGS_ROW_CARD} p-2`}>
                <input
                  type="text"
                  value={status.name}
                  onChange={(e) => updateStatusState(status.id, 'name', e.target.value)}
                  disabled={status.name === 'הושלם'}
                  className={`${SETTINGS_FIELD} text-xs sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed`}
                />
                <div className="flex items-center gap-1 justify-center">
                  <input
                    type="color"
                    value={status.color}
                    onChange={(e) => updateStatusState(status.id, 'color', e.target.value)}
                    disabled={status.name === 'הושלם'}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center justify-center gap-1">
                  <NumberInput
                    integerOnly
                    min={0}
                    max={100}
                    value={status.progressPercentage}
                    onChange={v => updateStatusState(status.id, 'progressPercentage', v)}
                    disabled={status.name === 'הושלם'}
                    className={`w-full ${SETTINGS_FIELD} text-xs sm:text-sm text-center disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed`}
                    style={{ backgroundColor: status.color, color: 'white', fontWeight: 'bold' }}
                  />
                  <span className="text-xs text-gray-600">%</span>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      if (status.name !== 'הושלם' && !status.isDefault) {
                        const updated = statuses.map(s => ({ ...s, isDefault: s.id === status.id }));
                        setStatuses(updated);
                      }
                    }}
                    className={`p-1.5 rounded transition-colors ${
                      status.name === 'הושלם'
                        ? 'text-gray-300 cursor-not-allowed'
                        : status.isDefault
                          ? 'text-yellow-500 cursor-default'
                          : 'text-gray-300 hover:text-yellow-400'
                    }`}
                    title={status.name === 'הושלם' ? 'לא ניתן לערוך סטטוס הושלם' : (status.isDefault ? 'ברירת מחדל נוכחית' : 'הגדר כברירת מחדל')}
                    disabled={status.name === 'הושלם'}
                  >
                    <Star size={18} className={status.isDefault ? 'fill-yellow-500' : ''} />
                  </button>
                </div>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={status.isActive}
                    onChange={(e) => updateStatusState(status.id, 'isActive', e.target.checked)}
                    disabled={status.name === 'הושלם'}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <button
                  onClick={() => status.name !== 'הושלם' && handleDeleteStatus(status.id)}
                  disabled={status.name === 'הושלם'}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {/* Add New Status */}
            <div className="grid grid-cols-[1fr_80px_100px_80px_60px_60px] gap-2 items-center bg-emerald-50 p-2 rounded-lg border-2 border-emerald-300">
              <input
                type="text"
                value={newStatus.name}
                onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
                placeholder="סטטוס חדש..."
                className="px-2 py-1.5 text-xs sm:text-sm border-2 border-emerald-400 rounded focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-1 justify-center">
                <input
                  type="color"
                  value={newStatus.color}
                  onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded border-2 border-emerald-400 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1">
                <NumberInput
                  integerOnly
                  min={0}
                  max={100}
                  value={newStatus.progressPercentage}
                  onChange={v => setNewStatus({ ...newStatus, progressPercentage: v })}
                  className="w-full px-2 py-1.5 text-xs sm:text-sm text-center border-2 border-emerald-400 rounded focus:ring-2 focus:ring-emerald-500"
                  style={{ backgroundColor: newStatus.color, color: 'white', fontWeight: 'bold' }}
                />
                <span className="text-xs text-emerald-700">%</span>
              </div>
              <div></div>
              <div></div>
              <button
                onClick={handleAddStatus}
                disabled={!newStatus.name.trim()}
                className="p-1.5 bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* עדיפות שלב / משימה */}
      <div className={SETTINGS_SECTION_SM}>
        <h4 className={`text-sm sm:text-base ${SETTINGS_TITLE} mb-3`}>עדיפות שלב / משימה</h4>
        <div className="overflow-x-auto">
          <div className="min-w-[550px] space-y-2">
            {/* Headers */}
            <div className="grid grid-cols-[1fr_80px_80px_60px_60px] gap-2 px-2 text-xs font-semibold text-gray-600">
              <div>שם העדיפות</div>
              <div className="text-center">צבע</div>
              <div className="text-center">ברירת מחדל</div>
              <div className="text-center">פעיל</div>
              <div></div>
            </div>

            {/* Priority List */}
            {priorities.map((priority) => (
              <div key={priority.id} className={`grid grid-cols-[1fr_80px_80px_60px_60px] gap-2 items-center ${SETTINGS_ROW_CARD} p-2`}>
                <input
                  type="text"
                  value={priority.name}
                  onChange={(e) => updatePriorityState(priority.id, 'name', e.target.value)}
                  className={`${SETTINGS_FIELD} text-xs sm:text-sm`}
                />
                <div className="flex items-center gap-1 justify-center">
                  <input
                    type="color"
                    value={priority.color}
                    onChange={(e) => updatePriorityState(priority.id, 'color', e.target.value)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded border border-gray-300 cursor-pointer"
                  />
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      if (!priority.isDefault) {
                        const updated = priorities.map(p => ({ ...p, isDefault: p.id === priority.id }));
                        setPriorities(updated);
                      }
                    }}
                    className={`p-1.5 rounded transition-colors ${
                      priority.isDefault ? 'text-yellow-500 cursor-default' : 'text-gray-300 hover:text-yellow-400'
                    }`}
                    title={priority.isDefault ? 'ברירת מחדל נוכחית' : 'הגדר כברירת מחדל'}
                  >
                    <Star size={18} className={priority.isDefault ? 'fill-yellow-500' : ''} />
                  </button>
                </div>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={priority.isActive}
                    onChange={(e) => updatePriorityState(priority.id, 'isActive', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => handleDeletePriority(priority.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {/* Add New Priority */}
            <div className="grid grid-cols-[1fr_80px_80px_60px_60px] gap-2 items-center bg-emerald-50 p-2 rounded-lg border-2 border-emerald-300">
              <input
                type="text"
                value={newPriority.name}
                onChange={(e) => setNewPriority({ ...newPriority, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPriority()}
                placeholder="עדיפות חדשה..."
                className="px-2 py-1.5 text-xs sm:text-sm border-2 border-emerald-400 rounded focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-1 justify-center">
                <input
                  type="color"
                  value={newPriority.color}
                  onChange={(e) => setNewPriority({ ...newPriority, color: e.target.value })}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded border-2 border-emerald-400 cursor-pointer"
                />
              </div>
              <div></div>
              <div></div>
              <button
                onClick={handleAddPriority}
                disabled={!newPriority.name.trim()}
                className="p-1.5 bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Box */}
      <MessageBox
        isOpen={messageBox.isOpen}
        onClose={() => setMessageBox({ ...messageBox, isOpen: false })}
        title={messageBox.title}
        message={messageBox.message}
        type={messageBox.type}
        confirmText="אישור"
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="מחק"
        cancelText="ביטול"
      />
    </div>
  );
});

SystemTablesSettings.displayName = 'SystemTablesSettings';

export default SystemTablesSettings;