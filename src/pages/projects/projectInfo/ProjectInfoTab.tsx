import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';

import {

  Save, CheckCircle, AlertCircle,

  Calendar, User, Building2, Hash,

  Briefcase, Users, Clock, Percent, DollarSign,

} from 'lucide-react';

import type { ProjectInfo } from '../../../Data/projectInfoData';

import { getProjectInfo, updateProjectFinancials } from '../../../services/projectInfoService';

import NumberInput from '../../shared/NumberInput';

import type { SettingsTabHandle } from '../../settings/settingsTabHandle';
import { BRIGHT_SURFACE, PROJECT_CARD, PROJECT_CARD_HEADER, PROJECT_LABEL, PROJECT_READ_FIELD, PROJECT_SAVE_BAR, PROJECT_TITLE } from '../projectsTheme';



// ─── Lookup data ──────────────────────────────────────────────────────────────

// const STATUS_OPTIONS = [

//   { id: 1, name: 'בתכנון'  },

//   { id: 2, name: 'בביצוע'  },

//   { id: 3, name: 'הושלם'   },

//   { id: 4, name: 'מושהה'   },

//   { id: 5, name: 'בוטל'    },

// ];



const STATUS_COLORS: Record<number, string> = {

  1: `${BRIGHT_SURFACE} bg-blue-100 text-blue-700`,

  2: `${BRIGHT_SURFACE} bg-emerald-100 text-emerald-700`,

  3: `${BRIGHT_SURFACE} bg-gray-100 text-gray-600`,

  4: `${BRIGHT_SURFACE} bg-yellow-100 text-yellow-700`,

  5: `${BRIGHT_SURFACE} bg-red-100 text-red-700`,

};



// ─── Read-only field ──────────────────────────────────────────────────────────

function ReadField({ label, value, icon: Icon, colSpan }: {

  label: string;

  value: string | number;

  icon?: React.ElementType;

  colSpan?: boolean;

}) {

  return (

    <div className={`space-y-1 ${colSpan ? 'col-span-2' : ''}`}>

      <label className={`${PROJECT_LABEL} flex items-center gap-1.5`}>

        {Icon && <Icon size={13} className="text-gray-400 dark:text-gray-500" />}

        {label}

      </label>

      <div className={PROJECT_READ_FIELD}>

        {value !== '' && value !== undefined

          ? value

          : <span className="text-gray-300 italic text-xs">—</span>

        }

      </div>

    </div>

  );

}



// ─── Main ─────────────────────────────────────────────────────────────────────

interface ProjectInfoTabProps {

  projectId: number;

  permissionId?: number;

}



const ProjectInfoTab = forwardRef<SettingsTabHandle, ProjectInfoTabProps>(function ProjectInfoTab(

  { projectId, permissionId },

  ref,

) {



  // ── Editable: כספים only ─────────────────────────────────────────────────

  const [hourlyRate,    setHourlyRate]    = useState(250);

  const [profitPercent, setProfitPercent] = useState(20);

  const [isDirty,       setIsDirty]       = useState(false);

  const [saving,        setSaving]        = useState(false);

  const [saveSuccess,   setSaveSuccess]   = useState(false);

  const [saveError,     setSaveError]     = useState<string | null>(null);

  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);

  // ── Read-only data (from API in real app) ───────────────────────────────

  // const project = projectInfo ?? {

  //   name:            projectName,

  //   projectNum,

  //   statusId:        2,

  //   projectType:     'בנייה רגילה',

  //   startDate:       '15/01/2025',

  //   endDate:         '31/12/2025',

  //   isActive:        true,

  //   customerName:    'לקוח א׳',

  //   officeName:      'משרד תל אביב',

  //   departmentName:  'אדריכלות',

  //   teamLeadName:    'רון כהן',

  //   responsibleName: 'מיכל לוי',

  //   cityName:        'תל אביב',

  //   budgetedHours:   480,

  //   description:     'פרויקט בנייה רב-קומתי במרכז העיר',

  //   folderPath:      'C:\\Projects\\P-0003',

  //   profitPercentage: profitPercent,

  //   workingHourCost: hourlyRate,

  //   isDefault: false,

  // };



  //const statusName  = STATUS_OPTIONS.find(s => s.id === project.statusId)?.name ?? '';

  const statusColor = STATUS_COLORS[projectInfo?.statusId ?? 0] ?? 'bg-gray-100 text-gray-600';



  const updateRate = (v: number) => {

    if (v < 0) return;

    setHourlyRate(v);

    setIsDirty(true);

  };



  const updateProfit = (v: number) => {

    if (v < 0 || v > 100) return;

    setProfitPercent(v);

    setIsDirty(true);

  };



  const loadProjectInfo = useCallback(async () => {

    const data = await getProjectInfo(projectId);

    if (data) {

      setProjectInfo(data);

      setHourlyRate(Number(data.workingHourCost) || 0);

      setProfitPercent(Number(data.profitPercentage) || 0);

    }

    setIsDirty(false);

    setSaveError(null);

  }, [projectId]);



  const handleSave = async (showUiFeedback = true) => {

    setSaving(true);

    setSaveError(null);

    try {

      const success = await updateProjectFinancials(projectId, hourlyRate, profitPercent);

      if (!success) {

        throw new Error('Update failed');

      }

      if (showUiFeedback) {

        setSaveSuccess(true);

        setTimeout(() => setSaveSuccess(false), 3000);

      }

      setIsDirty(false);

    } catch {

      setSaveError('שגיאה בשמירה');

      throw new Error('Failed to save project info');

    } finally {

      setSaving(false);

    }

  };



  useImperativeHandle(ref, () => ({

    hasUnsavedChanges: () => isDirty,

    save: () => handleSave(false),

    reload: loadProjectInfo,

  }), [isDirty, loadProjectInfo, hourlyRate, profitPercent, projectId]);



  useEffect(() => {

    void loadProjectInfo().catch(error => {

      console.error('Failed to load project info:', error);

    });

  }, [loadProjectInfo]);



  return (

    <div className="space-y-5" dir="rtl">



      {/* ── Save bar ────────────────────────────────────────────────────── */}

      <div className={PROJECT_SAVE_BAR}>

        <div className="flex items-center gap-2 flex-wrap">

          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor}`}>{projectInfo?.statusName}</span>

          {isDirty && (

            <span className={`bright-surface text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold`}>

              יש שינויים בעלות / רווח שלא נשמרו

            </span>

          )}

        </div>

        <div className="flex items-center gap-3">

          {saveError && (

            <span className="flex items-center gap-1 text-red-600 text-sm">

              <AlertCircle size={14} />{saveError}

            </span>

          )}

          {saveSuccess && (

            <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">

              <CheckCircle size={14} /> נשמר בהצלחה!

            </span>

          )}

          <button

            onClick={() => void handleSave()}

            disabled={saving || !isDirty}

            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${

              saving        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'

              : saveSuccess ? 'bg-emerald-400 text-white'

              : !isDirty    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'

              : 'bg-emerald-500 hover:bg-emerald-600 text-white'

            }`}

          >

            {saving ? (

              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />שומר...</>

            ) : saveSuccess ? (

              <><CheckCircle size={15} />נשמר!</>

            ) : (

              <><Save size={15} />שמור</>

            )}

          </button>

        </div>

      </div>



     

<div className={`grid gap-5 ${permissionId && permissionId > 2 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>

        {/* ── פרטי פרויקט + אנשים ומשרד — קריאה בלבד (מאוחד) ─────────────── */}

        <div className={PROJECT_CARD}>

          <div className={PROJECT_CARD_HEADER}>

            <Briefcase size={15} className="text-gray-400 dark:text-gray-500" />

            <span className={`${PROJECT_TITLE} text-sm`}>פרטי פרויקט</span>

            {/* פעיל / לא פעיל badge */}

            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${

              projectInfo?.isActive ? `${BRIGHT_SURFACE} bg-emerald-100 text-emerald-700` : `${BRIGHT_SURFACE} bg-gray-100 text-gray-500`

            }`}>

              {projectInfo?.isActive ? 'פעיל' : 'לא פעיל'}

            </span>

            <span className="mr-auto text-[11px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">קריאה בלבד</span>

          </div>

            <div className="p-5 grid grid-cols-2 gap-4">

            <ReadField label="סוג פרויקט"    value={projectInfo?.projectType ?? ''}   icon={Briefcase} />

            <ReadField label="סטטוס"          value={projectInfo?.statusName ?? ''}            icon={Hash}      />

            <ReadField

              label="תאריך התחלה"

              value={projectInfo?.startDate ? new Date(projectInfo.startDate).toLocaleDateString('en-GB') : ''}

              icon={Calendar}

            />

            <ReadField

              label="תאריך סיום"

              value={projectInfo?.endDate ? new Date(projectInfo.endDate).toLocaleDateString('en-GB') : ''}

              icon={Calendar}

            />

            <ReadField label="שעות מתוקצבות" value={`${projectInfo?.budgetedHours ?? 0} ש׳`} icon={Clock} />

            {/* אנשים ומשרד — מאוחד */}

            <ReadField label="לקוח ראשי"     value={projectInfo?.customerName ?? ''}  icon={User}      />

            <ReadField label="משרד"           value={projectInfo?.officeName ?? ''}    icon={Building2} />

            <ReadField label="מחלקה"          value={projectInfo?.departmentName ?? ''} icon={Briefcase} />

            <ReadField label="ראש צוות"       value={projectInfo?.teamLeadName ?? ''}  icon={Users}     />

            <ReadField label="עובד אחראי"     value={projectInfo?.responsibleName ?? ''} icon={User}    />

            </div>

        </div>



        {/* ── עלות שעת עבודה ממוצעת — ניתן לעריכה ────────────────────────── */}

        {permissionId && permissionId <2&& (

          <div className={`${PROJECT_CARD} border-2 border-amber-300 dark:border-amber-700`}>

            <div className={`${BRIGHT_SURFACE} px-5 py-3 bg-amber-50 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2`}>

              <DollarSign size={15} className="text-amber-500" />

              <span className="font-bold text-amber-800 text-sm">עלות שעת עבודה ממוצעת (₪)</span>

              <span className="mr-auto text-[11px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded font-semibold">

          ✏️ ניתן לעריכה

              </span>

            </div>



            <div className="p-6 space-y-6">



              {/* עלות שעת עבודה */}

              <div className="space-y-3">

          <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">

            <Clock size={15} className="text-amber-500" />

            עלות שעת עבודה לפרויקט

            <span className="text-xs text-gray-400 font-normal mr-1">ניתן לשינוי</span>

          </label>

            <div className="relative flex items-center">

              <span className="absolute left-4 text-base font-bold text-gray-400 pointer-events-none">₪</span>

              <NumberInput min={0} step={10}

                dir="ltr"

                value={hourlyRate}

                onChange={v => updateRate(v)}

                className={`w-full pl-8 pr-4 py-3 text-2xl font-bold text-left border-2 border-amber-300 dark:border-amber-600 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 ${BRIGHT_SURFACE} bg-amber-50 transition-all`}

              />

            </div>

          <input

            type="range" min={0} max={2000} step={10}

            value={hourlyRate}

            onChange={e => updateRate(Number(e.target.value))}

          

            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500"

          />

          <div className="flex justify-between text-xs text-gray-400">

            <span>₪0</span><span>₪1,000</span><span>₪2,000</span>

          </div>

              </div>



              {/* אחוז רווח */}

              <div className="space-y-3">

          <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">

            <Percent size={15} className="text-amber-500" />

            אחוז רווח רצוי לפרויקט

            <span className="text-xs text-gray-400 font-normal mr-1">ניתן לשינוי · 0%–100%</span>

          </label>

          <div className="relative flex items-center">

            <NumberInput integerOnly min={0} max={100} step={1}

            dir="ltr"

              value={profitPercent}

              onChange={v => updateProfit(v)}

              className={`w-full pr-4 pl-8 py-3 text-2xl font-bold border-2 border-amber-300 dark:border-amber-600 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 ${BRIGHT_SURFACE} bg-amber-50 transition-all`}

            />

            <span className="absolute left-3 text-base font-bold text-gray-400 pointer-events-none">%</span>

          </div>

          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">

            <div

              className={`h-4 rounded-full transition-all duration-300 ${

                profitPercent >= 20 ? 'bg-emerald-500'

                : profitPercent >= 10 ? 'bg-yellow-400'

                : 'bg-red-400'

              }`}

              style={{ width: `${profitPercent}%` }}

            />

          </div>

          <p className={`text-xs font-semibold ${

            profitPercent >= 20 ? 'text-emerald-600'

            : profitPercent >= 10 ? 'text-yellow-600'

            : 'text-red-500'

          }`}>

            {profitPercent >= 20 ? '✓ יעד רווח תקין'

             : profitPercent >= 10 ? '⚠ רווח נמוך'

             : '✗ רווח נמוך מאוד'}

          </p>

              </div>



          </div>

        </div>

        )}

      </div>

    </div>

  );

});



export default ProjectInfoTab;


