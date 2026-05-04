import { X, FileText } from 'lucide-react';
import type { SubContractData, TaskReview } from '../../Data/projectsData';
import { useEffect, useState } from 'react';
import { getSubContractData } from '../../services/taskService';

interface SubContractsModalProps {
  task: TaskReview;
  onClose: () => void;
}
  
const SubContractsModal = ({ task, onClose }: SubContractsModalProps) => {
  const [subContracts, setSubContracts] = useState<SubContractData[]>([]);
  const formatFee = (value: number) =>
    new Intl.NumberFormat('he-IL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);

 useEffect(() => {
    if (!task) return;

    const fetchSubContracts = async () => {
      try {
        console.log("Fetching sub-contracts for task ID:", task.planningStepID,task.planningSubjectName,task.id);
         const response = await getSubContractData(task.planningStepID);
         setSubContracts(response);
      } catch (error) {
        console.error("Error fetching sub-contracts:", error);
      }
    };
    fetchSubContracts();
  }, [task]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-white" />
            <h2 className="text-white font-bold text-base">תתי חוזים משויכים</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Task info */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-700 font-medium">{task.subject}</p>
          {task.projectName && (
            <p className="text-xs text-amber-500 mt-0.5">{task.projectName}</p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">
              {subContracts.length} תתי חוזים משויכים
            </p>
            {subContracts.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {task.planningSubjectName || task.name}
              </span>
            )}
          </div>

          {subContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center">
              <FileText size={24} className="text-gray-300" />
              <p className="text-sm font-medium text-gray-500">לא נמצאו תתי חוזים לשלב זה</p>
            </div>
          ) : (
            <div className="max-h-[320px] space-y-3 overflow-y-auto pl-1">
              {subContracts.map((sc, index) => (
                <div
                  key={`${sc.stepName}-${sc.subContractName}-${sc.contractName}-${index}`}
                  className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-800">{sc.subContractName}</p>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {formatFee(sc.feeSum)} ש"ח
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-700">חוזה:</span> {sc.contractName || '—'}
                  </p>
                  {/* <p className="mt-1 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">שלב:</span> {sc.stepName || '—'}
                  </p> */}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
          >
            סגור
          </button>
        </div>

      </div>
    </div>
  );
};

export default SubContractsModal;