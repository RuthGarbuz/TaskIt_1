import { useState, useCallback, useRef } from 'react';
import MessageBox from '../shared/MessageBox';
import type { SettingsTabHandle } from './settingsTabHandle';

export type LeaveChoice = 'save' | 'discard' | 'stay';

export function useUnsavedChangesPrompt() {
	const leaveResolveRef = useRef<((choice: LeaveChoice) => void) | null>(null);
	const [messageBoxOpen, setMessageBoxOpen] = useState(false);

	const finishPrompt = useCallback((choice: LeaveChoice) => {
		setMessageBoxOpen(false);
		const resolve = leaveResolveRef.current;
		leaveResolveRef.current = null;
		resolve?.(choice);
	}, []);

	const promptSaveBeforeLeave = useCallback(
		(): Promise<LeaveChoice> =>
			new Promise((resolve) => {
				leaveResolveRef.current = resolve;
				setMessageBoxOpen(true);
			}),
		[]
	);

	const guardLeave = useCallback(
		async (handle: SettingsTabHandle | null | undefined): Promise<boolean> => {
			if (!handle?.hasUnsavedChanges()) return true;

			const choice = await promptSaveBeforeLeave();
			if (choice === 'stay') return false;
			if (choice === 'save') {
				try {
					await handle.save();
				} catch {
					return false;
				}
			}
			if (choice === 'save' || choice === 'discard') {
				await handle.reload();
			}
			return true;
		},
		[promptSaveBeforeLeave]
	);

	const messageBoxNode = (
		<MessageBox
			isOpen={messageBoxOpen}
			onClose={() => finishPrompt('stay')}
			title="שמירת שינויים"
			message="האם לשמור שינויים"
			type="warning"
			confirmText="שמור"
			cancelText="המשך בלי לשמור"
			showCancel
			onConfirm={() => finishPrompt('save')}
			onCancel={() => finishPrompt('discard')}
		/>
	);

	return { guardLeave, messageBoxNode };
}
