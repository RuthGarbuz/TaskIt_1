import {
  BRIGHT_SURFACE,
  MODAL_FIELD,
  TASK_CTRL_BTN,
  TASK_TABLE_HEAD,
  TASK_TABLE_HEAD_CELL,
} from '../tasks/taskViewTheme';

/** Settings UI — matches AllTasks / MyTasks dark design */
export const SETTINGS_SECTION =
  'bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 border border-gray-200 dark:border-gray-700';
export const SETTINGS_SECTION_SM =
  'bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700';
export const SETTINGS_CARD =
  'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg';
export const SETTINGS_ROW_CARD =
  'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2';
export const SETTINGS_CHECKBOX_LABEL = `${SETTINGS_CARD} flex items-center gap-3 p-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 text-sm`;
export const SETTINGS_TITLE = 'font-bold text-gray-800 dark:text-white';
export const SETTINGS_SUBTITLE = 'text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200';
export const SETTINGS_LABEL = 'block text-xs text-gray-500 dark:text-gray-400';
export const SETTINGS_FIELD = MODAL_FIELD;
export const SETTINGS_FIELD_LG =
  'px-2 py-1.5 text-lg font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-white';
export const SETTINGS_BTN_SECONDARY = `${TASK_CTRL_BTN} settings-header-btn flex items-center gap-2 px-5 py-2.5 border-2 font-semibold text-sm transition-all`;
export const SETTINGS_FILTER_ACTIVE = 'bg-emerald-500 text-white';
export const SETTINGS_FILTER_INACTIVE =
  'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600';
export const SETTINGS_TABLE_WRAP = `${SETTINGS_SECTION_SM} overflow-x-auto`;
export const SETTINGS_TABLE_HEAD = TASK_TABLE_HEAD;
export const SETTINGS_TABLE_HEAD_CELL = TASK_TABLE_HEAD_CELL;
export const SETTINGS_TABLE_ROW = 'transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50';
export const SETTINGS_INFO_BLUE = `${BRIGHT_SURFACE} bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center`;
export const SETTINGS_INFO_EMERALD = `${BRIGHT_SURFACE} bg-emerald-50 border border-emerald-300 rounded-lg px-4 py-2`;
export const SETTINGS_INFO_YELLOW = `${BRIGHT_SURFACE} bg-yellow-50 border border-yellow-200 rounded-lg p-3`;
export const SETTINGS_HEADER_BLUE = `${BRIGHT_SURFACE} bg-blue-100 dark:bg-blue-900/40 text-gray-700 dark:text-blue-200 rounded-lg`;
