import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'מחק',
  cancelText = 'ביטול'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 border-2 border-gray-200 animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-red-50">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
          <h3 className="text-base font-bold text-gray-800 flex-1">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/50 rounded transition-colors"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold text-sm transition-all shadow-md hover:shadow-lg"
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
