import { useState, useRef, useCallback } from 'react';
import {
  X, Trash2, ExternalLink, Link, Save,
  Paperclip, Upload, FileText, Image, Table,
  File, Package, Edit2, Check, AlertCircle,
} from 'lucide-react';
import type { PlanningAttachment } from '../../Data/projectsData';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface AttachmentEmployee {
  id: number;
  name: string;
}

interface Props {
  entityType: 'step' | 'task';
  entityId: number;
  entityName: string;
  initialAttachments: PlanningAttachment[];
  employees: AttachmentEmployee[];
  /** Called with full updated list (including soft-deleted) on save */
  onSave: (attachments: PlanningAttachment[]) => void;
  onClose: () => void;
}

type TabId = 'all' | 'upload' | 'link';

// ── Helpers ────────────────────────────────────────────────────────────────────
const isTempId = (id: number) => id < 0;

const isValidUrl = (v: string) => {
  try { new URL(v); return true; } catch { return false; }
};

const ICON_MAP: Record<string, React.ReactNode> = {
  pdf:  <FileText  size={16} className="text-red-500"    />,
  png:  <Image     size={16} className="text-green-600"  />,
  jpg:  <Image     size={16} className="text-green-600"  />,
  jpeg: <Image     size={16} className="text-green-600"  />,
  gif:  <Image     size={16} className="text-green-600"  />,
  webp: <Image     size={16} className="text-green-600"  />,
  xlsx: <Table     size={16} className="text-emerald-600"/>,
  xls:  <Table     size={16} className="text-emerald-600"/>,
  csv:  <Table     size={16} className="text-emerald-600"/>,
  docx: <FileText  size={16} className="text-blue-500"   />,
  doc:  <FileText  size={16} className="text-blue-500"   />,
  zip:  <Package   size={16} className="text-amber-500"  />,
  rar:  <Package   size={16} className="text-amber-500"  />,
};

function FileIcon({ url, isLink }: { url: string; isLink: boolean }) {
  if (isLink) return <Link size={16} className="text-indigo-500" />;
  const ext = url.split('.').pop()?.toLowerCase() ?? '';
  return <>{ICON_MAP[ext] ?? <File size={16} className="text-gray-400" />}</>;
}

const emptyLinkForm = () => ({ fileLink: '', description: '', employeeId: '' });
const emptyUploadForm = () => ({
  description: '',
  employeeId: '',
  fullPath: '',          // מה שהמשתמש מדביק — נתיב מלא כולל שם קובץ
  pickedFileName: '',    // שם קובץ מבחירת קובץ (משלים אם חסר בנתיב)
  file: null as globalThis.File | null,
});

/**
 * Given what the user typed/pasted and an optional picked file name,
 * compute the final full path to store.
 *
 * Cases:
 *  - User pasted full path WITH file name → use as-is
 *  - User pasted folder only + picked file  → append file name
 *  - Only picked file                       → just file name
 */
function resolveFullPath(typed: string, pickedFileName: string): string {
  const t = typed.trim();
  const f = pickedFileName.trim();
  if (!t && !f) return '';

  // Does the typed string already end with a file-like segment (has an extension)?
  const lastSegment = t.split(/[/\\]/).pop() ?? '';
  const hasExtension = /\.[^./\\]{1,6}$/.test(lastSegment);

  if (hasExtension || !f) return t || f;

  // Typed is a folder path — append the picked file name
  if (!t) return f;
  const sep = t.includes('/') ? '/' : '\\';
  return `${t.replace(/[/\\]+$/, '')}${sep}${f}`;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function AttachmentsModal({
  entityType, entityId, entityName,
  initialAttachments, employees,
  onSave, onClose,
}: Props) {
  const [attachments, setAttachments] = useState<PlanningAttachment[]>(initialAttachments);
  const [activeTab,   setActiveTab]   = useState<TabId>('all');
  const [editingId,   setEditingId]   = useState<number | null>(null);

  // link form
  const [linkForm,    setLinkForm]    = useState(emptyLinkForm());
  const [linkError,   setLinkError]   = useState('');
  const [showLink,    setShowLink]    = useState(false);

  // upload form
  const [uploadForm,  setUploadForm]  = useState(emptyUploadForm());
  const [uploadError, setUploadError] = useState('');
  const [showUpload,  setShowUpload]  = useState(false);

  const linkRef   = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const dropRef   = useRef<HTMLDivElement>(null);
  const [dragging, setDragging]       = useState(false);

  // ── Filtered view ────────────────────────────────────────────────────────────
  const visible = attachments.filter(a => !a.isDeleted);
  const isLinkAttachment = (a: PlanningAttachment) => a.isLink === true;
  const filtered = activeTab === 'all'    ? visible
                 : activeTab === 'upload' ? visible.filter(a => !isLinkAttachment(a))
                 :                          visible.filter(a => isLinkAttachment(a));

  // ── Shared helpers ────────────────────────────────────────────────────────────
  const closeAllForms = () => {
    setShowLink(false); setShowUpload(false); setEditingId(null);
    setLinkForm(emptyLinkForm()); setLinkError('');
    setUploadForm(emptyUploadForm()); setUploadError('');
  };

  const deleteAttachment = (id: number) => {
    setAttachments(prev => prev.flatMap(a => {
      if (a.id !== id) return [a];
      if (isTempId(a.id) || a.isNew) return [];
      return [{ ...a, isDeleted: true }];
    }));
    if (editingId === id) closeAllForms();
  };

  // ── Link form ────────────────────────────────────────────────────────────────
  const openAddLink = () => {
    closeAllForms();
    setLinkForm(emptyLinkForm()); setLinkError('');
    setShowLink(true);
    setTimeout(() => linkRef.current?.focus(), 40);
  };

  const openEditLink = (a: PlanningAttachment) => {
    closeAllForms();
    setEditingId(a.id);
    setLinkForm({ fileLink: a.fileLink, description: a.description, employeeId: a.employeeId ? String(a.employeeId) : '' });
    setLinkError('');
    setShowLink(true);
  };

  const submitLink = () => {
    const url = linkForm.fileLink.trim();
    if (!url)            { setLinkError('יש להזין כתובת URL'); return; }
    if (!isValidUrl(url)){ setLinkError('הכתובת אינה תקינה — יש להתחיל ב-https://'); return; }
    setLinkError('');
    const empId = linkForm.employeeId ? Number(linkForm.employeeId) : null;

    if (editingId !== null) {
      setAttachments(prev => prev.map(a => a.id !== editingId ? a : {
        ...a, fileLink: url, description: linkForm.description.trim(),
        employeeId: empId,
        employeeName: employees.find(e => e.id === empId)?.name,
        isLink: true, attachmentType: 'link',
        isModified: !a.isNew,
      }));
    } else {
      setAttachments(prev => [...prev, {
        id: 0, entityType, entityId,
        isLink: true, attachmentType: 'link', fileLink: url,
        description: linkForm.description.trim(),
        employeeId: empId,
        employeeName: employees.find(e => e.id === empId)?.name,
        isNew: true,
      }]);
    }
    closeAllForms();
  };
 
  // ── Upload form ───────────────────────────────────────────────────────────────
  const openAddUpload = () => {
    closeAllForms();
    setUploadForm(emptyUploadForm());
    setUploadError('');
    setShowUpload(true);
  };

  const handleFilePick = (file: globalThis.File | null) => {
    if (!file) return;
    setUploadForm(f => ({
      ...f,
      file,
      pickedFileName: file.name,
      description: f.description || file.name,
    }));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFilePick(file);
  }, []);

  const submitUpload = () => {
    const savedPath = resolveFullPath(uploadForm.fullPath, uploadForm.pickedFileName);
    if (!savedPath) {
      setUploadError('יש להזין נתיב או לבחור קובץ');
      return;
    }
    setUploadError('');

    const fileName = savedPath.split(/[/\\]/).pop() || savedPath;
    const empId = uploadForm.employeeId ? Number(uploadForm.employeeId) : null;

    setAttachments(prev => [...prev, {
      id: 0, entityType, entityId,
      isLink: false, attachmentType: 'upload',
      fileLink: savedPath,   // ← הנתיב המלא
      fileName,
      description: uploadForm.description.trim() || fileName,
      employeeId: empId,
      employeeName: employees.find(e => e.id === empId)?.name,
      isNew: true,
    }]);
    closeAllForms();
  };

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = () => { onSave(attachments); onClose(); };

  // ── Counts for tabs ───────────────────────────────────────────────────────────
  const uploadCount = visible.filter(a => !isLinkAttachment(a)).length;
  const linkCount   = visible.filter(a => isLinkAttachment(a)).length;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      dir="rtl"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl mx-4 flex flex-col max-h-[88vh] overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip size={15} className="text-indigo-600 shrink-0" />
            <span className="text-sm font-bold text-gray-800">קבצים וקישורים</span>
            <span className="text-xs text-gray-500 font-normal truncate">
              — {entityType === 'step' ? 'שלב' : 'משימה'}: {entityName}
            </span>
            {visible.length > 0 && (
              <span className="shrink-0 text-[11px] bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 font-semibold">
                {visible.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-indigo-100 text-gray-500 hover:text-gray-700 shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0 border-b border-gray-100">
          {([
            { id: 'all'    as TabId, label: 'הכל',     count: visible.length },
            { id: 'upload' as TabId, label: 'קבצים',   count: uploadCount    },
            { id: 'link'   as TabId, label: 'קישורים', count: linkCount      },
          ]).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === t.id
                  ? 'border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === t.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">

          {/* ── Link form ─────────────────────────────────────────────────────── */}
          {showLink && (
            <div className="border border-indigo-200 rounded-lg bg-indigo-50 p-3 space-y-2.5">
              <p className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                <Link size={12}/>{editingId !== null ? 'עריכת קישור' : 'הוספת קישור חיצוני'}
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-500">כתובת URL <span className="text-red-500">*</span></label>
                <input
                  ref={linkRef} type="url" value={linkForm.fileLink}
                  onChange={e => setLinkForm(f => ({ ...f, fileLink: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitLink(); if (e.key === 'Escape') closeAllForms(); }}
                  placeholder="https://sharepoint.com/..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 bg-white"
                />
                {linkError && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle size={11}/>{linkError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">תיאור / שם תצוגה</label>
                  <input type="text" value={linkForm.description}
                    onChange={e => setLinkForm(f => ({ ...f, description: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') submitLink(); if (e.key === 'Escape') closeAllForms(); }}
                    placeholder="לדוגמה: תוכנית קומה א׳"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 bg-white"
                  />
                </div>
                {employees.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">משויך לעובד</label>
                    <select value={linkForm.employeeId}
                      onChange={e => setLinkForm(f => ({ ...f, employeeId: e.target.value }))}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 bg-white">
                      <option value="">— ללא שיוך —</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={closeAllForms} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">ביטול</button>
                <button onClick={submitLink} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1 transition-colors">
                  <Check size={11}/>{editingId !== null ? 'עדכן' : 'הוסף קישור'}
                </button>
              </div>
            </div>
          )}

          {/* ── Upload form ───────────────────────────────────────────────────── */}
          {showUpload && (
            <div className="border border-blue-200 rounded-lg bg-blue-50 p-3 space-y-2.5">
              <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                <Upload size={12}/>שמור נתיב קובץ
              </p>

              {/* Main: full path input */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-600 font-medium">
                  נתיב מלא של הקובץ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadForm.fullPath}
                  onChange={e => setUploadForm(f => ({ ...f, fullPath: e.target.value }))}
                  placeholder="C:\Users\ruth\OneDrive\ציורים\תוכנית_קומה_א.pdf"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-300 bg-white font-mono"
                  dir="ltr"
                  autoFocus
                />
                <p className="text-[10px] text-blue-600/80">
                  העתיקו מסרגל הכתובות ב-Windows Explorer — לחצו על הסרגל, Ctrl+C, והדביקו כאן.
                  אם הנתיב הוא לתיקייה בלבד, בחרו קובץ למטה ושמו יצורף אוטומטית.
                </p>
              </div>

              {/* Preview */}
              {resolveFullPath(uploadForm.fullPath, uploadForm.pickedFileName) && (
                <div className="rounded-lg border border-blue-300 bg-white px-2.5 py-2 space-y-0.5">
                  <p className="text-[10px] text-blue-500 font-semibold">✓ נתיב שיישמר:</p>
                  <p className="text-xs font-mono text-gray-800 break-all" dir="ltr">
                    {resolveFullPath(uploadForm.fullPath, uploadForm.pickedFileName)}
                  </p>
                </div>
              )}

              {/* Optional file picker — only for file name */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">
                  בחירת קובץ (אופציונלי — ממלאת שם קובץ אם חסר בנתיב)
                </label>
                <div
                  ref={dropRef}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-2.5 text-center cursor-pointer transition-colors ${
                    dragging ? 'border-blue-400 bg-blue-100' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-100'
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={e => handleFilePick(e.target.files?.[0] ?? null)}
                  />
                  {uploadForm.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <File size={14} className="text-blue-600"/>
                      <span className="text-xs font-semibold text-blue-700">{uploadForm.file.name}</span>
                      <span className="text-[11px] text-blue-400">({(uploadForm.file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ) : (
                    <p className="text-xs text-blue-400">גרור קובץ לכאן, או לחץ לבחירה</p>
                  )}
                </div>
              </div>

              {uploadError && (
                <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle size={11}/>{uploadError}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-500">תיאור / שם תצוגה</label>
                  <input type="text" value={uploadForm.description}
                    onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="לדוגמה: תוכנית ביוב"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-300 bg-white"
                  />
                </div>
                {employees.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">משויך לעובד</label>
                    <select value={uploadForm.employeeId}
                      onChange={e => setUploadForm(f => ({ ...f, employeeId: e.target.value }))}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-300 bg-white">
                      <option value="">— ללא שיוך —</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={closeAllForms} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">ביטול</button>
                <button
                  onClick={submitUpload}
                  disabled={!resolveFullPath(uploadForm.fullPath, uploadForm.pickedFileName)}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Check size={11}/>שמור נתיב
                </button>
              </div>
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────────────────── */}
          {filtered.length === 0 && !showLink && !showUpload && (
            <div className="text-center py-10 text-gray-400">
              <Paperclip size={28} className="mx-auto mb-2 opacity-30"/>
              <p className="text-xs">
                {activeTab === 'all'    ? 'אין קבצים או קישורים מצורפים' :
                 activeTab === 'upload' ? 'אין קבצים מועלים'              :
                                          'אין קישורים חיצוניים'}
              </p>
            </div>
          )}

          {/* ── Attachment list ───────────────────────────────────────────────── */}
          {filtered.map(a => {
            const isEditing = editingId === a.id && showLink;
            return (
              <div key={a.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors ${
                  isEditing
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}>
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isLinkAttachment(a) ? 'bg-indigo-100' : 'bg-gray-100'
                }`}>
                  <FileIcon url={a.fileLink} isLink={isLinkAttachment(a)}/>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {a.description || a.fileName || a.fileLink}
                  </p>
                  {isLinkAttachment(a) ? (
                    <a href={a.fileLink} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-indigo-500 hover:text-indigo-700 hover:underline truncate block">
                      {a.fileLink}
                    </a>
                  ) : (
                    <p className="text-[11px] text-gray-500 truncate font-mono" dir="ltr">
                      {a.fileLink}
                    </p>
                  )}
                  {a.employeeName && (
                    <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                      👤 {a.employeeName}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-0.5 mt-0.5 mr-1 text-[10px] rounded-full px-2 py-0.5 font-medium ${
                    isLinkAttachment(a)
                      ? 'bg-indigo-50 text-indigo-500'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isLinkAttachment(a) ? '🔗 קישור' : '📁 קובץ'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {isLinkAttachment(a) && (
                    <a href={a.fileLink} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="פתח בחלון חדש">
                      <ExternalLink size={13}/>
                    </a>
                  )}
                  {isLinkAttachment(a) && (
                    <button onClick={() => openEditLink(a)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="ערוך">
                      <Edit2 size={13}/>
                    </button>
                  )}
                  <button onClick={() => deleteAttachment(a.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="מחק">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <button onClick={openAddUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <Upload size={12}/> הוסף קובץ
            </button>
            <button onClick={openAddLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
              <Link size={12}/> הוסף קישור
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
              ביטול
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors">
              <Save size={13}/> שמור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}