import { useState, useRef } from 'react';
import { Save, X } from 'lucide-react';
import PlanningTopics, { type PlanningTopicsRef } from './PlanningTopics';
import MessageBox from '../../shared/MessageBox';

export default function TemplatesSettings() {
  const [activeTab, setActiveTab] = useState<'topics' | 'templates'>('topics');
  const planningTopicsRef = useRef<PlanningTopicsRef>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [messageBox, setMessageBox] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'success' | 'error' | 'warning';
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const closeMessageBox = () => {
    setMessageBox(prev => ({
      ...prev,
      isOpen: false,
      showCancel: false,
      onConfirm: undefined,
      onCancel: undefined
    }));
  };

  const openConfirm = (message: string, title: string = 'אישור'): Promise<boolean> =>
    new Promise(resolve => {
      setMessageBox({
        isOpen: true,
        title,
        message,
        type: 'warning',
        showCancel: true,
        confirmText: 'אישור',
        cancelText: 'ביטול',
        onConfirm: () => {
          resolve(true);
          closeMessageBox();
        },
        onCancel: () => {
          resolve(false);
          closeMessageBox();
        }
      });
    });

  const handleSave = async () => {
    if (activeTab === 'topics' && planningTopicsRef.current) {
      try {
        setIsSaving(true);
        await planningTopicsRef.current.save();
        setMessageBox({
          isOpen: true,
          title: 'שמירה הצליחה',
          message: 'ההגדרות נשמרו בהצלחה!',
          type: 'success'
        });
      } catch (error) {
        console.error('Failed to save:', error);
        setMessageBox({
          isOpen: true,
          title: 'שגיאה',
          message: 'שגיאה בשמירת השינויים',
          type: 'error'
        });
      } finally {
        setIsSaving(false);
      }
    } else {
      setMessageBox({
        isOpen: true,
        title: 'שמירה הצליחה',
        message: 'ההגדרות נשמרו בהצלחה!',
        type: 'success'
      });
    }
  };

  const handleCancel = async () => {
    const confirmed = await openConfirm('האם אתה בטוח שברצונך לבטל את השינויים?');
    if (confirmed) {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-gray-800">תבניות ונושאי תכנון</h2>
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm transition-all"
          >
            <X size={18} />
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold shadow-md text-sm w-full sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"

            //className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {isSaving ? 'שומר...' : 'שמור שינויים'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab('topics')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeTab === 'topics'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          נושאי תכנון
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`hidden px-4 py-2 font-semibold transition-all ${
            activeTab === 'templates'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          תבניות פרויקטים
        </button>
      </div>

      {/* Content */}
      {activeTab === 'topics' ? (
        <PlanningTopics ref={planningTopicsRef} />
      ) : (
        /* תבניות פרויקטים */
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg font-semibold">תבניות פרויקטים</p>
          <p className="text-gray-400 text-sm mt-2">תוכן זה יפותח בהמשך</p>
        </div>
      )}

      <MessageBox
        isOpen={messageBox.isOpen}
        onClose={closeMessageBox}
        title={messageBox.title}
        message={messageBox.message}
        type={messageBox.type}
        confirmText={messageBox.confirmText ?? 'אישור'}
        cancelText={messageBox.cancelText ?? 'ביטול'}
        showCancel={messageBox.showCancel}
        onConfirm={messageBox.onConfirm}
        onCancel={messageBox.onCancel}
      />
    </div>
  );
}