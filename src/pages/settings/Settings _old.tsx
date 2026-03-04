import { useState } from 'react';
import { Settings as SettingsIcon, FileText, Table, Users } from 'lucide-react';
import GeneralSettings from './generalSetting/GeneralSettings';
import WorkCapacitySettings from './workCapacitySettings/WorkCapacitySettings';
import TemplatesSettings from './templatesSettings/TemplatesSettings';
import SystemTablesSettings from './systemTablesSettings/SystemTablesSettings';

type SettingsTab = 'general' | 'workCapacity' | 'templates' | 'tables';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabs = [
    { id: 'general' as SettingsTab, label: 'הגדרות כלליות', icon: SettingsIcon },
    { id: 'workCapacity' as SettingsTab, label: 'היקף משרה', icon: Users },
    { id: 'templates' as SettingsTab, label: 'תבניות ונושאי תכנון', icon: FileText },
    { id: 'tables' as SettingsTab, label: 'טבלאות מערכת', icon: Table }
  ];

  return (
    <div className="p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-gray-800">הגדרות</h1>
          <p className="text-xs text-gray-600">ניהול הגדרות המערכת</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex gap-2 px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-all relative text-sm ${
                    activeTab === tab.id
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-4">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'workCapacity' && <WorkCapacitySettings />}
            {activeTab === 'templates' && <TemplatesSettings />}
            {activeTab === 'tables' && <SystemTablesSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}