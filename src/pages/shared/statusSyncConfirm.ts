export const STEP_STATUS_CHILDREN_SYNC_MSG =
  'שינוי הסטטוס של השלב ישפיע על המשימות הבנות.\n\nהאם לשנות גם את הסטטוס של המשימות לאותו סטטוס של השלב?';

export type StepStatusSyncConfirmResult =
  | { ok: true; includeEmployees: boolean }
  | { ok: false };

export type StepStatusSyncConfirmFn = (
  message?: string,
  title?: string,
) => Promise<StepStatusSyncConfirmResult>;

export type StatusMessageBoxState = {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'success' | 'error' | 'warning';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  checkboxLabel?: string;
  checkboxDefaultChecked?: boolean;
  onConfirm?: (checkboxChecked?: boolean) => void;
  onCancel?: () => void;
};

export function clearStatusMessageBoxFields<T extends StatusMessageBoxState>(prev: T): T {
  return {
    ...prev,
    isOpen: false,
    showCancel: false,
    checkboxLabel: undefined,
    checkboxDefaultChecked: undefined,
    onConfirm: undefined,
    onCancel: undefined,
  };
}

export function createOpenConfirm(
  setMessageBox: (state: StatusMessageBoxState) => void,
  closeMessageBox: () => void,
): (message: string, title?: string) => Promise<boolean> {
  return (message, title = 'אישור') =>
    new Promise(resolve => {
      setMessageBox({
        isOpen: true,
        title,
        message,
        type: 'warning',
        showCancel: true,
        confirmText: 'אישור',
        cancelText: 'לא',
        onConfirm: () => {
          resolve(true);
          closeMessageBox();
        },
        onCancel: () => {
          resolve(false);
          closeMessageBox();
        },
      });
    });
}

export function createStepStatusSyncConfirm(
  setMessageBox: (state: StatusMessageBoxState) => void,
  closeMessageBox: () => void,
): StepStatusSyncConfirmFn {
  return (message = STEP_STATUS_CHILDREN_SYNC_MSG, title = 'שינוי סטטוס') =>
    new Promise(resolve => {
      setMessageBox({
        isOpen: true,
        title,
        message,
        type: 'warning',
        showCancel: true,
        confirmText: 'אישור',
        cancelText: 'לא',
        checkboxLabel: 'כולל עובדים',
        checkboxDefaultChecked: true,
        onConfirm: includeEmployees => {
          resolve({ ok: true, includeEmployees: Boolean(includeEmployees) });
          closeMessageBox();
        },
        onCancel: () => {
          resolve({ ok: false });
          closeMessageBox();
        },
      });
    });
}
