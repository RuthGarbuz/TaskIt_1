import { useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import type { SubContract, SubContractLink } from '../../../Data/projectsData';

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>

        {/* Header */}
        <div className="flex-shrink-0 border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-800">קישור לתתי חוזים</h2>
            <p className="text-xs text-gray-500 mt-0.5">{subjectName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 px-6 py-3 border-b">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם חוזה או תת חוזה..."
              className="w-full pr-9 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-10">בחר</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">שם חוזה</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">שם תת חוזה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">לא נמצאו תוצאות</td>
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
                          ? 'bg-gray-50 cursor-not-allowed opacity-50'
                          : checked
                            ? 'bg-indigo-50 cursor-pointer hover:bg-indigo-100'
                            : 'cursor-pointer hover:bg-indigo-50'
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
                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                          {sc.contractName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${checked ? 'text-indigo-700 font-semibold' : disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                            {sc.subcontractName}
                          </span>
                          {disabled && (
                            <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
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
        <div className="flex-shrink-0 border-t px-6 py-4 flex gap-3 rounded-b-2xl bg-white">
          <button onClick={onClose}
            className="flex-1 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50">
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