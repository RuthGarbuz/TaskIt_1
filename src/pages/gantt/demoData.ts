import type { Project } from './types';

export const DEMO_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'פלטפורמת לקוחות',
    color: '#7F77DD',
    departmentId: 1,
    departmentName: 'סטודיו מוצר',
    phases: [
      { name: 'גיבוש דרישות',   owner: 'דנה כ.',  status: 'הושלם', start: '2025-01-06', end: '2025-02-15', urgencyId: 1 },
      { name: 'עיצוב UX/UI',    owner: 'רון מ.',   status: 'הושלם', start: '2025-02-01', end: '2025-03-15', urgencyId: 2 },
      { name: 'פיתוח Frontend', owner: 'יוסי א.',  status: 'פעיל',  start: '2025-03-10', end: '2025-06-30', urgencyId: 2 },
      { name: 'פיתוח Backend',  owner: 'שירה ל.',  status: 'פעיל',  start: '2025-03-01', end: '2025-06-15' },
      { name: 'QA & בדיקות',    owner: 'מיה ר.',   status: 'עתידי', start: '2025-06-01', end: '2025-07-20' },
      { name: 'השקה',           owner: 'דנה כ.',   status: 'עתידי', start: '2025-07-21', end: '2025-08-01' },
    ],
  },
  {
    id: 2,
    name: 'מערכת BI פנימית',
    color: '#1D9E75',
    departmentId: 2,
    departmentName: 'מחלקת נתונים',
    phases: [
      { name: 'מיפוי מקורות נתונים', owner: 'עמית ג.', status: 'הושלם', start: '2025-02-01', end: '2025-03-01' },
      { name: 'בניית Data Lake',      owner: 'שירה ל.', status: 'פעיל',  start: '2025-03-01', end: '2025-05-31' },
      { name: 'דשבורדים',             owner: 'רון מ.',  status: 'עתידי', start: '2025-05-15', end: '2025-07-15' },
      { name: 'הדרכות',               owner: 'דנה כ.',  status: 'עתידי', start: '2025-07-15', end: '2025-08-15' },
    ],
  },
  {
    id: 3,
    name: 'אפליקציה מובייל',
    color: '#D85A30',
    departmentId: 1,
    departmentName: 'סטודיו מוצר',
    phases: [
      { name: 'מחקר משתמשים',  owner: 'מיה ר.',  status: 'הושלם', start: '2025-04-01', end: '2025-04-30' },
      { name: 'פרוטוטייפ',     owner: 'רון מ.',  status: 'פעיל',  start: '2025-05-01', end: '2025-06-15' },
      { name: 'פיתוח iOS',     owner: 'יוסי א.', status: 'עתידי', start: '2025-06-15', end: '2025-09-30' },
      { name: 'פיתוח Android', owner: 'עמית ג.', status: 'עתידי', start: '2025-06-15', end: '2025-09-30' },
      { name: 'בטא ומשוב',     owner: 'מיה ר.',  status: 'עתידי', start: '2025-09-01', end: '2025-10-15' },
    ],
  },
  {
    id: 4,
    name: 'תשתית DevOps',
    color: '#BA7517',
    departmentId: 3,
    departmentName: 'תשתיות',
    phases: [
      { name: 'ביקורת תשתית', owner: 'עמית ג.', status: 'הושלם', start: '2025-01-15', end: '2025-02-15' },
      { name: 'הגדרת CI/CD',  owner: 'שירה ל.', status: 'הושלם', start: '2025-02-15', end: '2025-04-01' },
      { name: 'מעבר לענן',    owner: 'עמית ג.', status: 'פעיל',  start: '2025-04-01', end: '2025-07-01' },
      { name: 'מוניטורינג',   owner: 'שירה ל.', status: 'עתידי', start: '2025-07-01', end: '2025-09-01' },
    ],
  },
];