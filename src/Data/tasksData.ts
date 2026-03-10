import type { Task } from '../types/index';

export const initialTasks: Task[] = [
  { id: 1, subject: 'עיצוב ממשק משתמש חדש', stage: 'פיתוח', planning: 'Q1 2026', project: 'פרויקט א', status: 'inProgress', urgency: 'high', sender: 'יוסי כהן', receivers: ['מיכל'], date: '28/01/2026', hoursEstimate: 40, dependsOnStage: true, completed: true },
  { id: 2, subject: 'בדיקת באגים במערכת', stage: 'QA', planning: 'ינואר 2026', project: 'פרויקט ב', status: 'todo', urgency: 'medium', sender: 'שרה לוי', receivers: ['רון', 'דני'], date: '28/01/2026', hoursEstimate: 16, dependsOnStage: false , completed: true},
  { id: 3, subject: 'פגישה עם לקוח', stage: 'אנליזה', planning: 'פברואר 2026', project: 'פרויקט א', status: 'done', urgency: 'low', sender: 'דני אבני', receivers: ['יוסי', 'שרה', 'מיכל'], date: '29/01/2026', hoursEstimate: 4, dependsOnStage: false, completed: true },
  { id: 4, subject: 'סקירת קוד פרונט', stage: 'פיתוח', planning: 'Q1 2026', project: 'פרויקט ב', status: 'inProgress', urgency: 'medium', sender: 'מיכל דהן', receivers: ['Itzik'], date: '28/01/2026', hoursEstimate: 8, dependsOnStage: false , completed: true},
  { id: 5, subject: 'עדכון דוקומנטציה', stage: 'תיעוד', planning: 'פברואר 2026', project: 'פרויקט ג', status: 'todo', urgency: 'low', sender: 'רון פרץ', receivers: ['Itzik'], date: '29/01/2026', hoursEstimate: 12, dependsOnStage: true, completed: true },
  { id: 6, subject: 'אינטגרציה עם API', stage: 'פיתוח', planning: 'Q1 2026', project: 'פרויקט ד', status: 'todo', urgency: 'high', sender: 'יוסי כהן', receivers: ['Itzik', 'מיכל'], date: '30/01/2026', hoursEstimate: 24, dependsOnStage: false, completed: true },
  { id: 7, subject: 'בדיקות אבטחה', stage: 'QA', planning: 'פברואר 2026', project: 'פרויקט ה', status: 'inProgress', urgency: 'high', sender: 'שרה לוי', receivers: ['רון'], date: '31/01/2026', hoursEstimate: 20, dependsOnStage: true, completed: true },
];

// Helper functions
export const parseDate = (dateStr: string) => {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'done': return 'bg-green-100 text-green-700 border-green-200';
    case 'inProgress': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case 'done': return 'הושלם';
    case 'inProgress': return 'בביצוע';
    default: return 'לביצוע';
  }
};

export const getUrgencyColor = (urgency: number) => {
  switch (urgency) {
    case 1: return 'text-red-600';
    case 2: return 'text-yellow-600';
    default: return 'text-green-600';
  }
};

// export const getUrgencyText = (urgency: number) => {
//   switch (urgency) {
//     case 'high': return 'גבוהה';
//     case 'medium': return 'בינונית';
//     default: return 'נמוכה';
//   }
// };

export const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

export const getAvatarColor = (name: string) => {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
  return colors[name.charCodeAt(0) % colors.length];
};