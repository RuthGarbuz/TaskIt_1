import { useEffect, useState } from 'react';
import { MessageSquare, X, } from 'lucide-react';
import type { TaskChatMessage, TaskReview } from '../../Data/projectsData';
import { getChatData, insertChatAsync } from '../../services/taskService';

interface ChatModalProps {
  task: TaskReview;
  setTask: React.Dispatch<React.SetStateAction<TaskReview | null>>;
  onClose: () => void;
  
}

export default function ChatModal({ task, onClose ,setTask}: ChatModalProps) {
  const [messages, setMessages] = useState<TaskChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chatMessage, setChatMessage] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadChat = async () => {
      try {
        setLoading(true);
        if(task.hasChat === false) {
          setMessages([]);
          return;
        }
        const data = await getChatData(task.id, !task.isPlanningSte);
        if (isMounted) {
          setMessages(data ?? []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError('שגיאה בטעינת הודעות');
          setMessages([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadChat();
    return () => {
      isMounted = false;
    };
  }, [task.id]);
const handleSendMessage = async () => {
  if (!chatMessage.trim()) return;

  try {
    setLoading(true);
    await insertChatAsync(task.id, chatMessage.trim(), !task.isPlanningSte);
    setTask(prev => (prev ? { ...prev, hasChat: true } : prev));
    setChatMessage('');

    const data = await getChatData(task.id, !task.isPlanningSte);
    setMessages(data ?? []);
    setError(null);
  } catch (err) {
    setError('שגיאה בשליחת הודעה');
  } finally {
    setLoading(false);
  }
};
  // const handleSendMessage = () => {
  //   if (!chatMessage.trim()) return;
  //   // TODO: call send API here
  //   setChatMessage('');
  // };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    setChatMessage(prev => `${prev} ${linkUrl}`.trim());
    setLinkUrl('');
    setShowLinkInput(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare size={26} className="text-white" />
            <div>
              <h3 className="text-xl font-bold text-white">צ'אט משימה</h3>
              <p className="text-sm text-blue-100">{task.subject}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 w-9 h-9 flex items-center justify-center font-bold text-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">💬 אזור הצ'אט של המשימה</p>
              <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
                <strong>פרויקט:</strong> {task.projectName}
                <br />
                <strong>סטטוס פרויקט:</strong> {task.statusName}
              </div>
            </div>

            {loading && (
              <div className="text-center text-gray-400 text-sm py-4">טוען הודעות...</div>
            )}

            {!loading && error && (
              <div className="text-center text-red-500 text-sm py-4">{error}</div>
            )}

            {!loading && !error && messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                ההודעות יופיעו כאן
              </div>
            )}

            {!loading && !error && messages.length > 0 && (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {msg.senderName}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">{msg.senderName}</span>
                          <span className="text-sm text-gray-500">{new Date(msg.createDate).toLocaleString('he-IL')}</span>
                        </div>
                        <p className="text-gray-700 text-sm">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 bg-white rounded-b-xl">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder="כתוב הודעה..."
              autoFocus
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatMessage.trim()}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              שלח
            </button>
          </div>

          {showLinkInput && (
            <div className="mb-3 flex gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="הזן קישור (URL)..."
                className="flex-1 px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button onClick={handleAddLink} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-semibold">הוסף</button>
              <button onClick={() => setShowLinkInput(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">ביטול</button>
            </div>
          )}

          {/* <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="הזכר אנשים">@</button>
            <button onClick={() => setShowLinkInput(!showLinkInput)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="הוסף קישור"><LinkIcon size={18} /></button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="הוסף קובץ"><Paperclip size={18} /></button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="הוסף תמונה"><ImageIcon size={18} /></button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="אימוג'י"><Smile size={18} /></button>
          </div> */}
        </div>
      </div>
    </div>
  );
}