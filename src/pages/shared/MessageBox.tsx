import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface MessageBoxProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'alert' | 'success' | 'error' | 'warning';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function MessageBox({
  isOpen,
  onClose,
  title,
  message,
  type = 'alert',
  confirmText = 'אישור',
  cancelText = 'ביטול',
  showCancel = false,
  onConfirm,
  onCancel
}: MessageBoxProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-emerald-500" size={48} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={48} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={48} />;
      default:
        return <Info className="text-blue-500" size={48} />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-500 hover:bg-red-600';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'success':
        return 'bg-emerald-500 hover:bg-emerald-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  }

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 animate-scale-in">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <div className="flex flex-col items-center gap-4">
                            {getIcon()}
                            <p className="text-center text-gray-700 whitespace-pre-line leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 p-4 border-t border-gray-200">
                      {showCancel && (
                        <button
                          onClick={onCancel ?? onClose}
                          className="w-full px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold transition-colors hover:bg-gray-100"
                        >
                          {cancelText}
                        </button>
                      )}
                      <button
                        onClick={onConfirm ?? onClose}
                        className={`w-full px-4 py-2 text-white rounded-lg font-semibold transition-colors shadow-md ${getButtonColor()}`}
                      >
                        {confirmText}
                      </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes scale-in {
                    from {
                        transform: scale(0.95);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                .animate-scale-in {
                    animation: scale-in 0.2s ease-out;
                }
            `}</style>
        </>
    
  );
}
