import { useEffect, useMemo, useState } from 'react';
import { X, Search, CheckCircle, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { getSubjectTemplates } from '../../../services/projectPlanningService';
import type { SubjectTemplate } from '../../../Data/projectsData';

// ─── Types ────────────────────────────────────────────────────────────────────


// ─── Demo Templates ───────────────────────────────────────────────────────────
// const TEMPLATES: SubjectTemplate[] = [
//   {
//     id: 1, name: 'תכנון אדריכלי', category: 'תכנון',
//     totalHours: 120, totalDays: 15, stepsCount: 3, tasksCount: 7,
//     steps: [
//       { id: 10, name: 'שלב תכנון ראשוני', workHours: 40, workDays: 5, duration: 5,
//         tasks: [
//           { id: 100, name: 'סקיצות ראשוניות', workHours: 16, workDays: 2, duration: 2 },
//           { id: 101, name: 'תוכנית קונספט', workHours: 24, workDays: 3, duration: 3 },
//         ]},
//       { id: 11, name: 'פיתוח תכנון', workHours: 56, workDays: 7, duration: 7,
//         tasks: [
//           { id: 102, name: 'תוכניות מפורטות', workHours: 32, workDays: 4, duration: 4 },
//           { id: 103, name: 'חישובים סטטיים', workHours: 24, workDays: 3, duration: 3 },
//         ]},
//       { id: 12, name: 'הגשה לרשויות', workHours: 24, workDays: 3, duration: 10,
//         tasks: [
//           { id: 104, name: 'הכנת חבילת הגשה', workHours: 16, workDays: 2, duration: 5 },
//           { id: 105, name: 'מעקב אישורים', workHours: 8, workDays: 1, duration: 10 },
//         ]},
//     ],
//   },
//   {
//     id: 2, name: 'עבודות בנייה — שלד', category: 'ביצוע',
//     totalHours: 200, totalDays: 25, stepsCount: 4, tasksCount: 10,
//     steps: [
//       { id: 20, name: 'יסודות', workHours: 60, workDays: 7, duration: 7,
//         tasks: [
//           { id: 200, name: 'חפירה', workHours: 24, workDays: 3, duration: 3 },
//           { id: 201, name: 'יציקת יסודות', workHours: 36, workDays: 4, duration: 4 },
//         ]},
//       { id: 21, name: 'עמודים וקורות', workHours: 80, workDays: 10, duration: 10,
//         tasks: [
//           { id: 202, name: 'קינון ברזל', workHours: 40, workDays: 5, duration: 5 },
//           { id: 203, name: 'תבניות', workHours: 20, workDays: 2.5, duration: 3 },
//           { id: 204, name: 'יציקה', workHours: 20, workDays: 2.5, duration: 2 },
//         ]},
//       { id: 22, name: 'גגות ותקרות', workHours: 40, workDays: 5, duration: 5,
//         tasks: [
//           { id: 205, name: 'תבניות תקרה', workHours: 20, workDays: 2.5, duration: 3 },
//           { id: 206, name: 'יציקת תקרה', workHours: 20, workDays: 2.5, duration: 2 },
//         ]},
//       { id: 23, name: 'בדיקות ופיקוח', workHours: 20, workDays: 3, duration: 5,
//         tasks: [
//           { id: 207, name: 'בדיקות שלד', workHours: 12, workDays: 1.5, duration: 3 },
//           { id: 208, name: 'דוח מפקח', workHours: 8, workDays: 1, duration: 2 },
//         ]},
//     ],
//   },
//   {
//     id: 3, name: 'גמרים פנימיים', category: 'ביצוע',
//     totalHours: 160, totalDays: 20, stepsCount: 3, tasksCount: 6,
//     steps: [
//       { id: 30, name: 'טיח ופיני', workHours: 60, workDays: 7, duration: 7,
//         tasks: [
//           { id: 300, name: 'טיח פנים', workHours: 40, workDays: 5, duration: 5 },
//           { id: 301, name: 'פינוי פסולת', workHours: 20, workDays: 2, duration: 2 },
//         ]},
//       { id: 31, name: 'ריצוף וחיפוי', workHours: 64, workDays: 8, duration: 8,
//         tasks: [
//           { id: 302, name: 'הכנת משטח', workHours: 16, workDays: 2, duration: 2 },
//           { id: 303, name: 'הנחת אריחים', workHours: 48, workDays: 6, duration: 6 },
//         ]},
//       { id: 32, name: 'צבע ועיבוד', workHours: 36, workDays: 5, duration: 5,
//         tasks: [
//           { id: 304, name: 'שפכטל ועיבוד', workHours: 16, workDays: 2, duration: 2 },
//           { id: 305, name: 'צביעה סופית', workHours: 20, workDays: 3, duration: 3 },
//         ]},
//     ],
//   },
//   {
//     id: 4, name: 'מערכות חשמל', category: 'מערכות',
//     totalHours: 80, totalDays: 10, stepsCount: 2, tasksCount: 4,
//     steps: [
//       { id: 40, name: 'תשתיות חשמל', workHours: 48, workDays: 6, duration: 6,
//         tasks: [
//           { id: 400, name: 'הנחת צינורות', workHours: 24, workDays: 3, duration: 3 },
//           { id: 401, name: 'משיכת כבלים', workHours: 24, workDays: 3, duration: 3 },
//         ]},
//       { id: 41, name: 'לוחות וחיבורים', workHours: 32, workDays: 4, duration: 4,
//         tasks: [
//           { id: 402, name: 'התקנת לוח חשמל', workHours: 16, workDays: 2, duration: 2 },
//           { id: 403, name: 'בדיקות חשמל', workHours: 16, workDays: 2, duration: 2 },
//         ]},
//     ],
//   },
//   {
//     id: 5, name: 'מערכות אינסטלציה', category: 'מערכות',
//     totalHours: 72, totalDays: 9, stepsCount: 2, tasksCount: 4,
//     steps: [
//       { id: 50, name: 'צנרת מים וביוב', workHours: 48, workDays: 6, duration: 6,
//         tasks: [
//           { id: 500, name: 'הנחת צנרת', workHours: 32, workDays: 4, duration: 4 },
//           { id: 501, name: 'בדיקות לחץ', workHours: 16, workDays: 2, duration: 2 },
//         ]},
//       { id: 51, name: 'כלים סניטריים', workHours: 24, workDays: 3, duration: 3,
//         tasks: [
//           { id: 502, name: 'התקנת כלים', workHours: 16, workDays: 2, duration: 2 },
//           { id: 503, name: 'בדיקה סופית', workHours: 8, workDays: 1, duration: 1 },
//         ]},
//     ],
//   },
//   {
//     id: 6, name: 'ניהול פרויקט', category: 'ניהול',
//     totalHours: 60, totalDays: 30, stepsCount: 2, tasksCount: 4,
//     steps: [
//       { id: 60, name: 'תכנון ותיאום', workHours: 32, workDays: 16, duration: 30,
//         tasks: [
//           { id: 600, name: 'ישיבות תיאום שבועיות', workHours: 16, workDays: 8, duration: 30 },
//           { id: 601, name: 'עדכון לוחות זמנים', workHours: 16, workDays: 8, duration: 30 },
//         ]},
//       { id: 61, name: 'דיווח ובקרה', workHours: 28, workDays: 14, duration: 30,
//         tasks: [
//           { id: 602, name: 'דוחות התקדמות', workHours: 16, workDays: 8, duration: 30 },
//           { id: 603, name: 'בקרת תקציב', workHours: 12, workDays: 6, duration: 30 },
//         ]},
//     ],
//   },
// ];

    //const CATEGORIES = ['הכל', ...Array.from(new Set(TEMPLATES.map(t => t.category)))];

const todayIso = () => new Date().toISOString().split('T')[0];

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({
  template, selected, expanded, importStartDate, onImportStartDateChange,
  onToggleSelect, onToggleExpand,
}: {
  template: SubjectTemplate;
  selected: boolean;
  expanded: boolean;
  importStartDate: string;
  onImportStartDateChange: (iso: string) => void;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <div className={`rounded-xl border-2 transition-all ${selected ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
      {/* Card header — dir rtl: last column sits visually on the left */}
      <div className="flex items-center gap-3 px-4 py-3" dir="rtl">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-5 h-5 accent-emerald-500 shrink-0 cursor-pointer"
        />

        {/* Info */}
        <div className="flex-1 min-w-0" onClick={onToggleSelect} style={{ cursor: 'pointer' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-800">{template.name}</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">{template.category}</span>
            {selected && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><CheckCircle size={11}/>נבחר</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            <span>{template.stepsCount} שלבים</span>
            <span>•</span>
            <span>{template.tasksCount} משימות</span>
            <span>•</span>
            <span>{template.totalHours}ש׳</span>
            <span>•</span>
            <span>{template.totalDays} ימים</span>
          </div>
        </div>
 {selected && (
          <div
            className="shrink-0 flex flex-col gap-0.5 min-w-[9.5rem]"
            onClick={e => e.stopPropagation()}
          >
            <label className="text-[10px] font-semibold text-gray-600 whitespace-nowrap">תאריך התחלה</label>
            <input
              type="date"
              value={importStartDate}
              onChange={e => onImportStartDateChange(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-md px-1.5 py-1 bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500"
            />
          </div>
        )}
        {/* Expand toggle */}
        <button
          onClick={onToggleExpand}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 shrink-0 transition-colors"
          title="הצג שלבים"
        >
          
          {expanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
        </button>

       
      </div>

      {/* Expanded steps preview */}
      {expanded && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-2 bg-gray-50 rounded-b-xl">
          {template.steps.map(step => (
            <div key={step.id}>
              <div className="flex items-center gap-2 py-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-blue-800">{step.name}</span>
                <span className="text-[10px] text-gray-400 mr-auto">{step.workHours}ש׳ • {step.workDays} ימים</span>
              </div>
              {step.tasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 py-0.5 pr-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-300 shrink-0" />
                  <span className="text-[11px] text-gray-600">{task.name}</span>
                  <span className="text-[10px] text-gray-400 mr-auto">{task.workHours}ש׳</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export type ImportPlanningSubjectsPayload = {
  templates: SubjectTemplate[];
  startDateByTemplateId: Record<number, string>;
};

interface ImportSubjectTemplatesModalProps {
  onImport: (payload: ImportPlanningSubjectsPayload) => void;
  onClose: () => void;
  projectId: number;
}

export default function ImportSubjectTemplatesModal({ onImport, onClose, projectId }: ImportSubjectTemplatesModalProps) {
  const [search, setSearch]             = useState('');
  const [activeCategory, setActiveCategory] = useState('הכל');
  const [selectedIds, setSelectedIds]   = useState<number[]>([]);
  const [expandedIds, setExpandedIds]   = useState<number[]>([]);
  const [startDateByTemplateId, setStartDateByTemplateId] = useState<Record<number, string>>({});
  const [importBlockMsg, setImportBlockMsg] = useState('');
  const [templates, setTemplates] = useState<SubjectTemplate[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadTemplates = async () => {
      try {
        const data = await getSubjectTemplates(projectId);
        if (isMounted) {
          setTemplates(data ?? []);
        }
      } catch (error) {
        console.error('Error loading subject templates:', error);
        if (isMounted) {
          setTemplates([]);
        }
      }
    };

    loadTemplates();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(
    () => ['הכל', ...Array.from(new Set((templates ?? []).map(t => t.category)))],
    [templates]
  );

  const filtered = useMemo(() =>
    (templates ?? []).filter(t => {
      const matchCat    = activeCategory === 'הכל' || t.category === activeCategory;
      const matchSearch = !search.trim() ||
        t.name.includes(search) ||
        t.category.includes(search) ||
        t.steps.some(s => s.name.includes(search) || s.tasks.some(tk => tk.name.includes(search)));
      return matchCat && matchSearch;
    }),
    [search, activeCategory, templates]
  );

  const toggleSelect = (id: number) => {
    setImportBlockMsg('');
    setSelectedIds(prev => {
      const adding = !prev.includes(id);
      setStartDateByTemplateId(d => {
        if (adding) return d[id] ? d : { ...d, [id]: todayIso() };
        const { [id]: _removed, ...rest } = d;
        return rest;
      });
      return adding ? [...prev, id] : prev.filter(x => x !== id);
    });
  };
  const toggleExpand  = (id: number) => setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll     = () => {
    setImportBlockMsg('');
    const ids = filtered.map(t => t.id);
    setSelectedIds(ids);
    setStartDateByTemplateId(prev => {
      const next = { ...prev };
      const st = todayIso();
      for (const id of ids) {
        if (!next[id]) next[id] = st;
      }
      return next;
    });
  };
  const clearAll      = () => {
    setImportBlockMsg('');
    setSelectedIds([]);
    setStartDateByTemplateId({});
  };

  const setTemplateStartDate = (id: number, iso: string) => {
    setImportBlockMsg('');
    setStartDateByTemplateId(prev => ({ ...prev, [id]: iso }));
  };

  const handleImport  = () => {
    setImportBlockMsg('');
    const toImport = (templates ?? []).filter(t => selectedIds.includes(t.id));
    if (!toImport.length) return;
    for (const t of toImport) {
      const d = startDateByTemplateId[t.id];
      if (!d?.trim()) {
        setImportBlockMsg('נא לבחור תאריך התחלה לכל תבנית שנבחרה.');
        return;
      }
    }
    const startDateByTemplateIdSlice: Record<number, string> = {};
    for (const t of toImport) startDateByTemplateIdSlice[t.id] = startDateByTemplateId[t.id]!;
    onImport({ templates: toImport, startDateByTemplateId: startDateByTemplateIdSlice });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '88vh' }}>

        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <Download size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">ייבוא נושא מתבניות</h2>
              <p className="text-emerald-100 text-xs">{templates?.length ?? 0} תבניות זמינות</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all">
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Search + category filter */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם, קטגוריה, שלב או משימה..."
              className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  activeCategory === cat
                    ? 'bg-emerald-500 text-white border-emerald-600'
                    : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Select all / clear + count */}
        <div className="flex-shrink-0 px-6 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-xs text-emerald-600 font-semibold hover:underline">בחר הכל</button>
            <span className="text-gray-300">|</span>
            <button onClick={clearAll} className="text-xs text-gray-500 font-semibold hover:underline">נקה בחירה</button>
          </div>
          <span className="text-xs text-gray-500">
            {filtered.length} תבניות • {selectedIds.length} נבחרו
          </span>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Search size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">לא נמצאו תבניות מתאימות</p>
            </div>
          ) : (
            filtered.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedIds.includes(template.id)}
                expanded={expandedIds.includes(template.id)}
                importStartDate={startDateByTemplateId[template.id] ?? ''}
                onImportStartDateChange={iso => setTemplateStartDate(template.id, iso)}
                onToggleSelect={() => toggleSelect(template.id)}
                onToggleExpand={() => toggleExpand(template.id)}
              />
            ))
          )}
        </div>

        {importBlockMsg && (
          <div className="flex-shrink-0 px-6 pt-2 text-xs text-red-600 font-medium" dir="rtl">
            {importBlockMsg}
          </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 flex gap-3 bg-white rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50">
            ביטול
          </button>
          <button
            onClick={handleImport}
            disabled={selectedIds.length === 0}
            className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download size={15} />
            ייבא {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

//export type { SubjectTemplate, TemplateStep, TemplateTask };