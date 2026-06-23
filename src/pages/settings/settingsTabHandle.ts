/** Exposed by settings tab panels for leave-navigation guards */
export interface SettingsTabHandle {
	hasUnsavedChanges: () => boolean;
	save: () => Promise<void>;
	reload: () => Promise<void>;
}
