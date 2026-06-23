import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Edit2, Trash2, Check } from 'lucide-react';
import type { TaskChatMessage, TaskReview } from '../../Data/projectsData';
import { getEmployees, type EmployeeBasic } from '../../services/templatesSettingServices';
import authService from '../../services/authService';
import { deletePlanningChat, getChatData, insertChatAsync, updatePlanningChat, updateNotificationReadState } from '../../services/chatService';

interface ChatModalProps {
  task: TaskReview;
  setTask: React.Dispatch<React.SetStateAction<TaskReview | null>>;
  onClose: () => void;
  initialMessages?: TaskChatMessage[];
  readOnly?: boolean;
}

export default function ChatModal({ task, onClose, setTask, initialMessages, readOnly = false }: ChatModalProps) {
  const [messages, setMessages] = useState<TaskChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // ─── Mention state ─────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<EmployeeBasic[]>([]);
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [selectedReceivers, setSelectedReceivers] = useState<EmployeeBasic[]>([]);
  const [atPosition, setAtPosition] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const currentUserId = authService.getCurrentUser()?.id ?? 0;

  // ─── Mark notification read when opening chat ──────────────────────────────
  useEffect(() => {
    // Same behavior as `Header.tsx` when opening a notification: mark as read.
    // Backend expects `taskChatId`; in our UI we consistently pass the entity id.
    // If the API treats this differently, it will no-op and we'll keep logging.
    (async () => {
      try {
        await updateNotificationReadState(task.id, !task.isPlanningSte, true, task.id);
      } catch (e) {
        console.error('Error updating notification read state on chat open:', e);
      }
    })();
  }, []);

  // ─── Load chat ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const loadChat = async () => {
      try {
        setLoading(true);
        if (initialMessages && initialMessages.length > 0) {
          if (isMounted) {
            setMessages(initialMessages);
            setError(null);
          }
          return;
        }
        if (task.hasChat === false) { setMessages([]); return; }
        const data = await getChatData(task.id, !task.isPlanningSte);
        if (isMounted) { setMessages(data ?? []); setError(null); }
      } catch {
        if (isMounted) { setError('שגיאה בטעינת הודעות'); setMessages([]); }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadChat();
    return () => { isMounted = false; };
  }, [task.id, initialMessages]);

  useEffect(() => {
    if (!loading && !readOnly) setTimeout(() => inputRef.current?.focus(), 50);
  }, [loading, readOnly]);

  // ─── Load employees lazily ─────────────────────────────────────────────────
  const ensureEmployeesLoaded = async () => {
    if (employees.length > 0) return;
    try {
      const list = await getEmployees();
      setEmployees(list);
    } catch {
      console.error('Failed to load employees');
    }
  };

  // ─── Input change — detect @ ───────────────────────────────────────────────
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setChatMessage(val);

    const textBeforeCursor = val.slice(0, cursor);
    const atIdx = textBeforeCursor.lastIndexOf('@');

    if (atIdx !== -1) {
      const query = textBeforeCursor.slice(atIdx + 1);
      if (!query.includes(' ')) {
        await ensureEmployeesLoaded();
        setAtPosition(atIdx);
        setMentionQuery(query);
        setMentionIndex(0);
        setShowMention(true);
        return;
      }
    }

    setShowMention(false);
    setMentionQuery('');
  };

  // ─── Filter employees — hide already selected ─────────────────────────────
  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(mentionQuery.toLowerCase()) &&
    !selectedReceivers.find(r => r.id === e.id)
  );

  // ─── Select employee — add to receivers list ───────────────────────────────
  const selectEmployee = (emp: EmployeeBasic) => {
    const before = chatMessage.slice(0, atPosition);
    const after = chatMessage.slice(atPosition + 1 + mentionQuery.length);
    setChatMessage(`${before}@${emp.name} ${after}`);
    setSelectedReceivers(prev => [...prev, emp]);
    setShowMention(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  // ─── Remove receiver ───────────────────────────────────────────────────────
  const removeReceiver = (emp: EmployeeBasic) => {
    setChatMessage(prev => prev.replace(`@${emp.name}`, '').replace(/\s+/g, ' ').trim());
    setSelectedReceivers(prev => prev.filter(r => r.id !== emp.id));
  };

  // ─── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMention && filteredEmployees.length > 0) {
      if (e.key === 'ArrowDown')  { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, filteredEmployees.length - 1)); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter')      { e.preventDefault(); selectEmployee(filteredEmployees[mentionIndex]); return; }
      if (e.key === 'Escape')     { setShowMention(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !showMention) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ─── Auto-clear receivers removed from text ───────────────────────────────
  useEffect(() => {
    setSelectedReceivers(prev =>
      prev.filter(r => chatMessage.includes(`@${r.name}`))
    );
  }, [chatMessage]);

  // ─── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    try {
      setLoading(true);

      // הסר את כל ה-@שמות מהטקסט — רק הטקסט הנקי נשלח ל-API
      let cleanMessage = chatMessage;
      selectedReceivers.forEach(r => {
        cleanMessage = cleanMessage.replace(`@${r.name}`, '');
      });
      cleanMessage = cleanMessage.replace(/\s+/g, ' ').trim();
  
      if (!cleanMessage) {
        setError('נא להזין טקסט הודעה');
        setLoading(false);
        return;
      }

      await insertChatAsync(
        task.id,
        cleanMessage,                                                              // טקסט נקי בלי @שמות
        !task.isPlanningSte,
        selectedReceivers.length > 0 ? selectedReceivers.map(r => r.id) : undefined  // IDs של נמענים
      );

      setTask(prev => (prev ? { ...prev, hasChat: true } : prev));
      setChatMessage('');
      setSelectedReceivers([]);
      const data = await getChatData(task.id, !task.isPlanningSte);
      setMessages(data ?? []);
      setError(null);
    } catch {
      setError('שגיאה בשליחת הודעה');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    try {
      await deletePlanningChat(msgId, !task.isPlanningSte);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {
      setError('שגיאה במחיקת הודעה');
    }
  };

  const handleEditSave = async (msgId: number) => {
    const nextMessage = editingText.trim();
    if (!nextMessage) return;
    try {
      await updatePlanningChat(msgId, !task.isPlanningSte, nextMessage);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, message: nextMessage } : m));
      setEditingId(null);
      setEditingText('');
    } catch {
      setError('שגיאה בעדכון הודעה');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="modal-shell dark-surface bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare size={26} className="text-white" />
            <div>
              <h3 className="text-xl font-bold text-white">צ'אט משימה</h3>
              <p className="text-sm text-blue-100">{task.subject}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 w-9 h-9 flex items-center justify-center font-bold text-xl transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="space-y-4">

            <div className="dark-surface bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">💬 אזור הצ'אט של המשימה</p>
              <div className="bright-surface text-xs text-gray-500 bg-blue-50 p-3 rounded">
                <strong>שם פרויקט:</strong> {task.projectName}
              </div>
            </div>

            {loading && <div className="text-center text-gray-400 text-sm py-4">טוען הודעות...</div>}
            {!loading && error && <div className="text-center text-red-500 text-sm py-4">{error}</div>}
            {!loading && !error && messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">ההודעות יופיעו כאן</div>
            )}

            {!loading && !error && messages.length > 0 && (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className="dark-surface bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {msg.senderName?.[0] ?? '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{msg.senderName}</span>
                            <span className="text-sm text-gray-500">{new Date(msg.createDate).toLocaleString('he-IL')}</span>
                          </div>
                          {!readOnly && msg.senderID === currentUserId && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setEditingId(msg.id); setEditingText(msg.message); }} className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all" title="ערוך הודעה">
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all" title="מחק הודעה">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                        {editingId === msg.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingText}
                              onChange={e => setEditingText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleEditSave(msg.id); if (e.key === 'Escape') { setEditingId(null); setEditingText(''); } }}
                              autoFocus
                              className="flex-1 px-3 py-1.5 border-2 border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                            <button onClick={() => handleEditSave(msg.id)} className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><Check size={14} /></button>
                            <button onClick={() => { setEditingId(null); setEditingText(''); }} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"><X size={14} /></button>
                          </div>
                        ) : (
                          <p className="text-gray-700 text-sm">{msg.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        {!readOnly && <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 rounded-b-xl">

          {/* Selected receivers badges */}
          {selectedReceivers.length > 0 && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-gray-500">נשלח ל:</span>
              {selectedReceivers.map(r => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200"
                >
                  @{r.name}
                  <button onClick={() => removeReceiver(r)} className="hover:text-blue-900 ml-0.5">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Mention dropdown + input */}
          <div className="relative">
            {showMention && filteredEmployees.length > 0 && (
              <div className="absolute bottom-full mb-1 right-0 w-64 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-600">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-300">בחר עובד לשליחה פרטית</span>
                </div>
                <ul className="max-h-48 overflow-y-auto py-1">
                  {filteredEmployees.map((emp, idx) => (
                    <li
                      key={emp.id}
                      onClick={() => selectEmployee(emp)}
                      className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                        idx === mentionIndex ? 'bg-blue-50 dark:bg-blue-900/40' : 'hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {emp.name[0]}
                      </div>
                      <span className={`text-sm ${idx === mentionIndex ? 'text-blue-700 dark:text-blue-200 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
                        {emp.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={chatMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="כתוב הודעה... (@ לשליחה לעובד ספציפי)"
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatMessage.trim() || loading}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                שלח
              </button>
            </div>
          </div>
        </div>}

      </div>
    </div>
  );
}