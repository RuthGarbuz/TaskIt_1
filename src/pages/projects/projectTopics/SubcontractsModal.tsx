import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import SearchInput from '../../shared/SearchInput';
import type { SubContract, SubContractLink } from '../../../Data/projectsData';
import { BRIGHT_SURFACE, MODAL_CLOSE_BTN, MODAL_FOOTER, MODAL_HEADER, MODAL_TITLE, TASK_TABLE_HEAD } from '../projectsTheme';

interface SubcontractsModalProps {
  subjectId: number;
  subjectName: string;
  linkedIds: SubContractLink[];
  onSave: (ids: SubContractLink[]) => void;
  onClose: () => void;
  subContractsOptions: SubContract[];
  // ✅ IDs that are already linked to OTHER subjects (not this one)
  usedSubContractIds?: Set<number>;
}

export default function SubcontractsModal({
  subjectId,
  subjectName,
  linkedIds,
  onSave,
  onClose,
  subContractsOptions,
  usedSubContractIds = new Set(),
}: SubcontractsModalProps) {
  const [selected, setSelected] = useState<SubContractLink[]>(linkedIds);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSelected(linkedIds);
  }, [linkedIds]);

  const isSelected = (id: number) => selected.some(x => x.id === id);

  // A subcontract is disabled if it's linked to another subject (not this one)
  const isDisabled = (id: number) => usedSubContractIds.has(id);

  const toggle = (id: number) => {
    if (isDisabled(id)) return; // blocked — already used elsewhere
    setSelected(prev =>
      prev.some(x => x.id === id)
        ? prev.filter(x => x.id !== id)
        : [...prev, { id, name: '', subjectId }]
    );
  };

  const filtered = subContractsOptions.filter(sc =>
    !search.trim() ||
    sc.contractName.includes(search) ||
    sc.subcontractName.includes(search)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>

        {/* Header */}
        <div className={`flex-shrink-0 ${MODAL_HEADER} px-6 py-4 rounded-t-2xl`}>
          <div>
            <h2 className={`text-lg ${MODAL_TITLE}`}>קישור לתתי חוזים</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subjectName}</p>
          </div>
          <button onClick={onClose} className={MODAL_CLOSE_BTN}>
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="חיפוש לפי שם חוזה או תת חוזה..."
            iconSize={14}
            className="text-sm focus:ring-indigo-400"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead className={`${TASK_TABLE_HEAD} sticky top-0`}>
              <tr>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 w-10">בחר</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">שם חוזה</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">שם תת חוזה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">לא נמצאו תוצאות</td>
                </tr>
              ) : (
                filtered.map(sc => {
                  const disabled = isDisabled(sc.id);
                  const checked  = isSelected(sc.id);
                  return (
                    <tr
                      key={sc.id}
                      onClick={() => toggle(sc.id)}
                      className={`transition-colors ${
                        disabled
                          ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50'
                          : checked
                            ? 'bg-indigo-50 dark:bg-indigo-950/30 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                            : 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(sc.id)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 accent-indigo-500 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${BRIGHT_SURFACE} text-gray-700 bg-gray-100 px-2 py-1 rounded-lg`}>
                          {sc.contractName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${checked ? 'text-indigo-700 dark:text-indigo-300 font-semibold' : disabled ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                            {sc.subcontractName}
                          </span>
                          {disabled && (
                            <span className={`text-[10px] ${BRIGHT_SURFACE} bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap`}>
                              מקושר לנושא אחר
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className={`flex-shrink-0 ${MODAL_FOOTER} px-6 py-4 flex gap-3 rounded-b-2xl`}>
          <button onClick={onClose}
            className="flex-1 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
            ביטול
          </button>
          <button
            onClick={() => { onSave(selected); onClose(); }}
            className="flex-1 bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-600"
          >
            שמור קישור ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}