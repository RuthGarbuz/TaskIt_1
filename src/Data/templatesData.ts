// // Types for Templates System based on database schema

// // עובד (לקישור)
export interface Employee {
  id: number;
  name: string;
}

// // קישור עובד למשימה
// export interface PlanningTaskEmployeeLink {
//   id: number;
//   employeeId: number;
//   taskTemplateId: number;
// }

// // משימה בתבנית
// export interface PlanningTaskTemplate {
//   id: number;
//   stepTemplateId: number;
//   orderNum: number;           // מספר סידורי
//   taskName: string;           // שם משימה
//   taskPercentage: number;     // אחוז (0-100)
//   workHours: number;          // שעות עבודה
//   taskDuration: number;       // משך זמן המשימה
//   dependsOnTaskId: number | null;  // תלוי במשימה
//   isActive: boolean;          // פעיל/לא פעיל
//   employeeLinks: number[];    // רשימת IDs של עובדים
// }

// // קישור עובד לשלב
// export interface PlanningStepEmployeeLink {
//   id: number;
//   employeeId: number;
//   stepTemplateId: number;
// }

// // שלב בנושא תכנון
// export interface PlanningStepTemplate {
//   id: number;
//   planningSubjectTemplateId: number;
//   orderNum: number;           // מספר סידורי שלב
//   stepName: string;           // שם שלב
//   stepPercentage: number;     // אחוז שלב (0-100)
//   workHours: number;          // מספר שעות
//   stepDuration: number;       // משך השלב
//   dependsOnStepId: number | null;  // תלוי בשלב
//   isActive: boolean;          // פעיל/לא פעיל
//   employeeLinks: number[];    // רשימת IDs של עובדים
//   tasks: PlanningTaskTemplate[];
//   isExpanded?: boolean;       // UI state
// }

// // נושא תכנון
// export interface PlanningSubjectTemplate {
//   id: number;
//   name: string;               // שם נושא תכנון
//   isActive: boolean;          // פעיל/לא פעיל
//   steps: PlanningStepTemplate[];
//   isExpanded?: boolean;       // UI state
// }

// // קישור בין תבנית לנושא תכנון
// export interface PlanningTemplateLink {
//   id: number;
//   planningSubjectTemplateId: number;
//   planningTemplateId: number;
// }

// // תבנית לפרויקט
// export interface PlanningTemplate {
//   id: number;
//   name: string;               // שם התבנית
//   isActive: boolean;          // פעילה/לא פעילה
//   subjectIds: number[];       // רשימת IDs של נושאי תכנון
//   isExpanded?: boolean;       // UI state
// }

// Initial data
export const initialEmployees: Employee[] = [
  { id: 1, name: 'עובד 1' },
  { id: 2, name: 'עובד 2' },
  { id: 3, name: 'עובד 3' }
];

// export const initialPlanningSubjectTemplates: PlanningSubjectTemplate[] = [
//   {
//     id: 1,
//     name: 'נושא תכנון לדוגמה',
//     isActive: true,
//     isExpanded: true,
//     steps: [
//       {
//         id: 1,
//         planningSubjectTemplateId: 1,
//         orderNum: 1,
//         stepName: 'שלב 1',
//         stepPercentage: 30,
//         workHours: 40,
//         stepDuration: 5,
//         dependsOnStepId: null,
//         isActive: true,
//         employeeLinks: [1, 2],
//         isExpanded: false,
//         tasks: [
//           {
//             id: 1,
//             stepTemplateId: 1,
//             orderNum: 1,
//             taskName: 'משימה 1',
//             taskPercentage: 50,
//             workHours: 20,
//             taskDuration: 2.5,
//             dependsOnTaskId: null,
//             isActive: true,
//             employeeLinks: [1]
//           }
//         ]
//       }
//     ]
//   }
// ];

// export const initialPlanningTemplates: PlanningTemplate[] = [
//   {
//     id: 1,
//     name: 'תבנית בניין מגורים',
//     isActive: true,
//     subjectIds: [1],
//     isExpanded: true
//   }
// ];