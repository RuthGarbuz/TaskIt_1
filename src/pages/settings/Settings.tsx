import { useState } from 'react';
import { Settings as SettingsIcon, FileText, Table, Users } from 'lucide-react';
import GeneralSettings from './generalSetting/GeneralSettings';
import WorkCapacitySettings from './workCapacitySettings/WorkCapacitySettings';
import TemplatesSettings from './templatesSettings/TemplatesSettings';
import SystemTablesSettings from './systemTablesSettings/SystemTablesSettings';
import UsersSettings from './user/userSettings';

type SettingsTab = 'general' | 'workCapacity' | 'templates' | 'tables' | 'users';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabs = [
    { id: 'general' as SettingsTab, label: 'הגדרות כלליות', icon: SettingsIcon },
    { id: 'workCapacity' as SettingsTab, label: 'היקף משרה', icon: Users },
    { id: 'templates' as SettingsTab, label: 'תבניות ונושאי תכנון', icon: FileText },
    { id: 'tables' as SettingsTab, label: 'טבלאות מערכת', icon: Table },
     { id: 'users'  as SettingsTab, label: 'משתמשים',  icon: Users        },
  ];

  return (
    <div className="w-full h-full" dir="rtl">
      {/* Responsive container */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">הגדרות</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">ניהול הגדרות המערכת</p>
        </div>

        {/* Tabs Container */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 sm:border-2">
          {/* Tabs - Responsive with horizontal scroll */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex gap-1 sm:gap-2 px-2 sm:px-4 min-w-max sm:min-w-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 font-medium transition-all relative text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <tab.icon size={16} className="flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content - Responsive padding */}
          <div className="p-3 sm:p-4 lg:p-6">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'workCapacity' && <WorkCapacitySettings />}
            {activeTab === 'templates' && <TemplatesSettings />}
            {activeTab === 'tables' && <SystemTablesSettings />}
              {activeTab === 'users'     && <UsersSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}