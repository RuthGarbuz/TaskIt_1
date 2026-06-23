import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Settings as SettingsIcon, FileText, Table, Users } from 'lucide-react';
import GeneralSettings from './generalSetting/GeneralSettings';
import WorkCapacitySettings from './workCapacitySettings/WorkCapacitySettings';
import TemplatesSettings from './templatesSettings/TemplatesSettings';
import SystemTablesSettings from './systemTablesSettings/SystemTablesSettings';
import UsersSettings from './user/userSettings';
import type { SettingsTabHandle } from './settingsTabHandle';
import { useUnsavedChangesPrompt } from './useUnsavedChangesPrompt';
import { isSettingsTab, usePersistedSessionState } from '../../hooks/usePersistedSessionState';

type SettingsTab = 'general' | 'workCapacity' | 'templates' | 'tables' | 'users';

export interface SettingsRef {
	/** Returns false if user chose to stay on the current tab */
	confirmLeave: () => Promise<boolean>;
}

const Settings = forwardRef<SettingsRef>((_props, ref) => {
	const [activeTab, setActiveTab] = usePersistedSessionState<SettingsTab>(
		'taskit.ui.settings.activeTab',
		'general',
		isSettingsTab,
	);
	const { guardLeave, messageBoxNode } = useUnsavedChangesPrompt();

	const generalRef = useRef<SettingsTabHandle>(null);
	const workCapacityRef = useRef<SettingsTabHandle>(null);
	const templatesRef = useRef<SettingsTabHandle>(null);
	const tablesRef = useRef<SettingsTabHandle>(null);
	const usersRef = useRef<SettingsTabHandle>(null);

	const getHandleForTab = (tab: SettingsTab): SettingsTabHandle | null => {
		switch (tab) {
			case 'general':
				return generalRef.current;
			case 'workCapacity':
				return workCapacityRef.current;
			case 'templates':
				return templatesRef.current;
			case 'tables':
				return tablesRef.current;
			case 'users':
				return usersRef.current;
			default:
				return null;
		}
	};

	const getActiveHandle = () => getHandleForTab(activeTab);

	const tryChangeTab = async (next: SettingsTab) => {
		if (next === activeTab) return;
		const canLeave = await guardLeave(getActiveHandle());
		if (!canLeave) return;
		setActiveTab(next);
		await getHandleForTab(next)?.reload();
	};

	useImperativeHandle(ref, () => ({
		confirmLeave: () => guardLeave(getActiveHandle()),
	}));

	const tabs = [
		{ id: 'general' as SettingsTab, label: 'הגדרות כלליות', icon: SettingsIcon },
		{ id: 'workCapacity' as SettingsTab, label: 'הגדרת היקף משרה', icon: Users },
		{ id: 'templates' as SettingsTab, label: 'תבניות ונושאי תכנון', icon: FileText },
		{ id: 'tables' as SettingsTab, label: 'טבלאות מערכת', icon: Table },
		{ id: 'users' as SettingsTab, label: 'משתמשים', icon: Users },
	];

	return (
		<div className="w-full h-full text-xs" dir="rtl">
			<div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 py-2 sm:py-3">
				<div className="app-panel dark-surface bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
					<div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
						<nav className="flex gap-1 sm:gap-2 px-2 sm:px-4 min-w-max sm:min-w-0 text-sm">
							{tabs.map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => void tryChangeTab(tab.id)}
									className={`flex items-center gap-1.5 px-3 py-2 font-medium transition-all relative text-sm whitespace-nowrap ${
										activeTab === tab.id
											? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
											: 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
									}`}
								>
									<tab.icon size={16} className="flex-shrink-0" />
									<span>{tab.label}</span>
								</button>
							))}
						</nav>
					</div>

					<div className="p-3 sm:p-4 text-xs [&_h2]:text-base sm:[&_h2]:text-lg [&_h3]:text-sm sm:[&_h3]:text-base [&_h4]:text-xs [&_input]:text-xs [&_select]:text-xs [&_textarea]:text-xs [&_button]:text-xs [&_.settings-header-btn]:text-sm [&_th]:text-xs [&_td]:text-xs [&_label]:text-xs [&_.text-sm]:text-xs [&_.text-base]:text-xs [&_.text-lg]:text-sm [&_.settings-section-title]:text-base sm:[&_.settings-section-title]:text-lg">
						<div className={activeTab === 'general' ? '' : 'hidden'}>
							<GeneralSettings ref={generalRef} />
						</div>
						<div className={activeTab === 'workCapacity' ? '' : 'hidden'}>
							<WorkCapacitySettings ref={workCapacityRef} />
						</div>
						<div className={activeTab === 'templates' ? '' : 'hidden'}>
							<TemplatesSettings ref={templatesRef} />
						</div>
						<div className={activeTab === 'tables' ? '' : 'hidden'}>
							<SystemTablesSettings ref={tablesRef} />
						</div>
						<div className={activeTab === 'users' ? '' : 'hidden'}>
							<UsersSettings ref={usersRef} />
						</div>
					</div>
				</div>
			</div>
			{messageBoxNode}
		</div>
	);
});

Settings.displayName = 'Settings';

export default Settings;
