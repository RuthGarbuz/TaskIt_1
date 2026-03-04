// import { useState } from 'react';
// import { Plus, Trash2, Save, Star } from 'lucide-react';
// import { initialSystemTables } from '../Data/settingsData';
// import { useSystemTables } from '../hooks/useSettings';

// export default function SystemTablesSettings() {
//   const {
//     statuses,
//     priorities,
//     addStatus,
//     updateStatus,
//     deleteStatus,
//     addPriority,
//     updatePriority,
//     deletePriority
//   } = useSystemTables(initialSystemTables);

//   const [newStatus, setNewStatus] = useState({ name: '', color: '#6B7280' });
//   const [newPriority, setNewPriority] = useState({ name: '', color: '#10B981' });

//   const handleAddStatus = () => {
//     if (newStatus.name.trim()) {
//       addStatus(newStatus.name, newStatus.color);
//       setNewStatus({ name: '', color: '#6B7280' });
//     }
//   };

//   const handleDeleteStatus = (id: number) => {
//     if (window.confirm('האם אתה בטוח שברצונך למחוק סטטוס זה?\nמשימות עם סטטוס זה יושפעו.')) {
//       deleteStatus(id);
//     }
//   };

//   const handleAddPriority = () => {
//     if (newPriority.name.trim()) {
//       addPriority(newPriority.name, newPriority.color);
//       setNewPriority({ name: '', color: '#10B981' });
//     }
//   };

//   const handleDeletePriority = (id: number) => {
//     if (window.confirm('האם אתה בטוח שברצונך למחוק עדיפות זו?\nמשימות עם עדיפות זו יושפעו.')) {
//       deletePriority(id);
//     }
//   };

//   const handleSave = () => {
//     console.log('שמירת טבלאות מערכת:', { statuses, priorities });
//     alert('הטבלאות נשמרו בהצלחה!');
//   };

//   return (
//     <div className="space-y-4 max-w-4xl">
//       <div className="flex items-center justify-between">
//         <h3 className="text-lg font-bold text-gray-800">טבלאות מערכת</h3>
//         <button
//           onClick={handleSave}
//           className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold shadow-md text-sm"
//         >
//           <Save size={16} />
//           שמור
//         </button>
//       </div>

//       {/* סטטוס משימה */}
//       <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
//         <h4 className="text-base font-bold text-gray-800 mb-3">סטטוס משימה</h4>
        
//         <div className="space-y-2">
//           {/* כותרות */}
//           <div className="grid grid-cols-[1fr_80px_100px_80px_60px_60px] gap-2 px-2 text-xs font-semibold text-gray-600">
//             <div>שם הסטטוס</div>
//             <div className="text-center">צבע</div>
//             <div className="text-center">אחוז התקדמות</div>
//             <div className="text-center">ברירת מחדל</div>
//             <div className="text-center">פעיל</div>
//             <div></div>
//           </div>

//           {/* רשימת סטטוסים */}
//           {statuses.map((status) => (
//             <div key={status.id} className="grid grid-cols-[1fr_80px_100px_80px_60px_60px] gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
//               <input
//                 type="text"
//                 value={status.name}
//                 onChange={(e) => updateStatus(status.id, 'name', e.target.value)}
//                 className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
//               />
//               <div className="flex items-center gap-1 justify-center">
//                 <input
//                   type="color"
//                   value={status.color}
//                   onChange={(e) => updateStatus(status.id, 'color', e.target.value)}
//                   className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
//                 />
//                 <div
//                   className="w-8 h-8 rounded border border-gray-300"
//                   style={{ backgroundColor: status.color }}
//                 />
//               </div>
//               <div className="flex items-center gap-1 justify-center">
//                 <input
//                   type="number"
//                   min="0"
//                   max="100"
//                   value={status.progressPercentage}
//                   onChange={(e) => updateStatus(status.id, 'progressPercentage', e.target.value)}
//                   className="w-16 px-2 py-1.5 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
//                 />
//                 <span className="text-xs text-gray-600">%</span>
//               </div>
//               <div className="flex justify-center">
//                 <button
//                   onClick={() => updateStatus(status.id, 'isDefault', true)}
//                   className={`p-1.5 rounded transition-all ${
//                     status.isDefault 
//                       ? 'bg-yellow-100 text-yellow-600' 
//                       : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
//                   }`}
//                   title={status.isDefault ? 'ברירת מחדל' : 'קבע כברירת מחדל'}
//                 >
//                   <Star size={16} fill={status.isDefault ? 'currentColor' : 'none'} />
//                 </button>
//               </div>
//               <div className="flex justify-center">
//                 <input
//                   type="checkbox"
//                   checked={status.isActive}
//                   onChange={(e) => updateStatus(status.id, 'isActive', e.target.checked)}
//                   className="w-4 h-4 text-emerald-600 cursor-pointer"
//                 />
//               </div>
//               <button
//                 onClick={() => handleDeleteStatus(status.id)}
//                 className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-all"
//                 disabled={statuses.length === 1}
//                 title={statuses.length === 1 ? 'לא ניתן למחוק את הסטטוס האחרון' : 'מחק'}
//               >
//                 <Trash2 size={16} />
//               </button>
//             </div>
//           ))}

//           {/* הוספת סטטוס חדש */}
//           <div className="grid grid-cols-[1fr_80px_100px_80px_60px_60px] gap-2 items-center bg-blue-50 p-2 rounded-lg border border-blue-200">
//             <input
//               type="text"
//               value={newStatus.name}
//               onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
//               onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
//               placeholder="סטטוס חדש..."
//               className="px-2 py-1.5 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
//             />
//             <div className="flex items-center gap-1 justify-center">
//               <input
//                 type="color"
//                 value={newStatus.color}
//                 onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
//                 className="w-8 h-8 rounded border border-blue-300 cursor-pointer"
//               />
//               <div
//                 className="w-8 h-8 rounded border border-blue-300"
//                 style={{ backgroundColor: newStatus.color }}
//               />
//             </div>
//             <div className="text-center text-xs text-gray-500">0%</div>
//             <div></div>
//             <div></div>
//             <button
//               onClick={handleAddStatus}
//               className="p-1.5 bg-blue-500 text-white hover:bg-blue-600 rounded transition-all"
//             >
//               <Plus size={16} />
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* עדיפות */}
//       <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
//         <h4 className="text-base font-bold text-gray-800 mb-3">עדיפות</h4>
        
//         <div className="space-y-2">
//           {/* כותרות */}
//           <div className="grid grid-cols-[1fr_100px_80px_60px_60px] gap-2 px-2 text-xs font-semibold text-gray-600">
//             <div>שם העדיפות</div>
//             <div className="text-center">צבע</div>
//             <div className="text-center">ברירת מחדל</div>
//             <div className="text-center">פעיל</div>
//             <div></div>
//           </div>

//           {/* רשימת עדיפויות */}
//           {priorities.map((priority) => (
//             <div key={priority.id} className="grid grid-cols-[1fr_100px_80px_60px_60px] gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
//               <input
//                 type="text"
//                 value={priority.name}
//                 onChange={(e) => updatePriority(priority.id, 'name', e.target.value)}
//                 className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
//               />
//               <div className="flex items-center gap-1 justify-center">
//                 <input
//                   type="color"
//                   value={priority.color}
//                   onChange={(e) => updatePriority(priority.id, 'color', e.target.value)}
//                   className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
//                 />
//                 <div
//                   className="w-8 h-8 rounded border border-gray-300"
//                   style={{ backgroundColor: priority.color }}
//                 />
//               </div>
//               <div className="flex justify-center">
//                 <button
//                   onClick={() => updatePriority(priority.id, 'isDefault', true)}
//                   className={`p-1.5 rounded transition-all ${
//                     priority.isDefault 
//                       ? 'bg-yellow-100 text-yellow-600' 
//                       : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
//                   }`}
//                   title={priority.isDefault ? 'ברירת מחדל' : 'קבע כברירת מחדל'}
//                 >
//                   <Star size={16} fill={priority.isDefault ? 'currentColor' : 'none'} />
//                 </button>
//               </div>
//               <div className="flex justify-center">
//                 <input
//                   type="checkbox"
//                   checked={priority.isActive}
//                   onChange={(e) => updatePriority(priority.id, 'isActive', e.target.checked)}
//                   className="w-4 h-4 text-emerald-600 cursor-pointer"
//                 />
//               </div>
//               <button
//                 onClick={() => handleDeletePriority(priority.id)}
//                 className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-all"
//                 disabled={priorities.length === 1}
//                 title={priorities.length === 1 ? 'לא ניתן למחוק את העדיפות האחרונה' : 'מחק'}
//               >
//                 <Trash2 size={16} />
//               </button>
//             </div>
//           ))}

//           {/* הוספת עדיפות חדשה */}
//           <div className="grid grid-cols-[1fr_100px_80px_60px_60px] gap-2 items-center bg-orange-50 p-2 rounded-lg border border-orange-200">
//             <input
//               type="text"
//               value={newPriority.name}
//               onChange={(e) => setNewPriority({ ...newPriority, name: e.target.value })}
//               onKeyDown={(e) => e.key === 'Enter' && handleAddPriority()}
//               placeholder="עדיפות חדשה..."
//               className="px-2 py-1.5 text-sm border border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
//             />
//             <div className="flex items-center gap-1 justify-center">
//               <input
//                 type="color"
//                 value={newPriority.color}
//                 onChange={(e) => setNewPriority({ ...newPriority, color: e.target.value })}
//                 className="w-8 h-8 rounded border border-orange-300 cursor-pointer"
//               />
//               <div
//                 className="w-8 h-8 rounded border border-orange-300"
//                 style={{ backgroundColor: newPriority.color }}
//               />
//             </div>
//             <div></div>
//             <div></div>
//             <button
//               onClick={handleAddPriority}
//               className="p-1.5 bg-orange-500 text-white hover:bg-orange-600 rounded transition-all"
//             >
//               <Plus size={16} />
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }