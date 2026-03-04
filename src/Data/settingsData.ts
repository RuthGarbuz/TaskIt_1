// Types for settings
export interface GeneralSettingsData {
  workHoursPerDay: number;
  displayMode: 'hours' | 'days';
  profitPercentage: number;
  hourlyRate: number;
}

export interface StatusItem {
  id: number;
  name: string;
  color: string;
  progressPercentage: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface PriorityItem {
  id: number;
  name: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface SystemTablesData {
  statuses: StatusItem[];
  priorities: PriorityItem[];
}
export interface UserListItem {
  id: number;
  username: string;
  email: string;
  permissionID: number;
  employeeID: number;
}
// Initial data
export const initialGeneralSettings: GeneralSettingsData = {
  workHoursPerDay: 8,
  displayMode: 'hours',
  profitPercentage: 20,
  hourlyRate: 150
};

export const initialSystemTables: SystemTablesData = {
  statuses: [
    { id: 1, name: 'לביצוע', color: '#6B7280', progressPercentage: 0, isDefault: true, isActive: true },
    { id: 2, name: 'בביצוע', color: '#3B82F6', progressPercentage: 50, isDefault: false, isActive: true },
    { id: 3, name: 'הושלם', color: '#10B981', progressPercentage: 100, isDefault: false, isActive: true }
  ],
  priorities: [
    { id: 1, name: 'נמוכה', color: '#10B981', isDefault: false, isActive: true },
    { id: 2, name: 'בינונית', color: '#F59E0B', isDefault: true, isActive: true },
    { id: 3, name: 'גבוהה', color: '#EF4444', isDefault: false, isActive: true }
  ]
};

export const initialTemplatesData = [
  {
    id: 1,
    name: 'תבנית בניין מגורים',
    isExpanded: true,
    stages: [
      {
        id: 1,
        name: 'תכנון ראשוני',
        isExpanded: false,
        subTasks: [
          { id: 1, name: 'סקר מדידות', completed: false },
          { id: 2, name: 'תכנון אדריכלי', completed: false }
        ]
      },
      {
        id: 2,
        name: 'היתרים ורישויים',
        isExpanded: false,
        subTasks: []
      }
    ]
  }
];

export const initialTopicsData = [
  {
    id: 1,
    name: 'נושא תכנון לדוגמה',
    isExpanded: true,
    stages: [
      {
        id: 1,
        name: 'שלב 1',
        isExpanded: false,
        subTasks: []
      }
    ]
  }
];

// Validation helpers
export const validateGeneralSettings = (settings: GeneralSettingsData): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (settings.workHoursPerDay <= 0) {
    errors.workHoursPerDay = 'שעות עבודה חייבות להיות גדולות מ-0';
  }

  if (settings.profitPercentage < 0 || settings.profitPercentage > 100) {
    errors.profitPercentage = 'אחוז רווח חייב להיות בין 0 ל-100';
  }

  if (settings.hourlyRate < 0) {
    errors.hourlyRate = 'עלות שעת עבודה לא יכולה להיות שלילית';
  }

  return errors;
};

// Helper functions
export const calculateCost = (
  hours: number,
  hourlyRate: number,
  profitPercentage: number
): number => {
  return hours * hourlyRate * (1 + profitPercentage / 100);
};

export const convertHoursToDays = (
  hours: number,
  workHoursPerDay: number
): number => {
  return hours / workHoursPerDay;
};