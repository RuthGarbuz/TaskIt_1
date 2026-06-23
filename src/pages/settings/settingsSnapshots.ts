/** Shallow JSON snapshot compare for settings dirty detection */
export const snapshotChanged = <T>(current: T | null, saved: T | null): boolean => {
	if (current == null || saved == null) return false;
	return JSON.stringify(current) !== JSON.stringify(saved);
};
