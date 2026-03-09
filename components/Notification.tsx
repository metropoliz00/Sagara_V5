
import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface NotificationProps {
  notification: { message: string; type: 'success' | 'error' | 'warning' } | null;
  onClear: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClear }) => {
  if (!notification) {
    return null;
  }

  const config = {
    success: {
      icon: <CheckCircle size={20} />,
      style: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    },
    error: {
      icon: <AlertCircle size={20} />,
      style: 'bg-red-50 border-red-200 text-red-700',
    },
    warning: {
      icon: <AlertCircle size={20} />,
      style: 'bg-amber-50 border-amber-200 text-amber-700',
    },
  };

  const { icon, style } = config[notification.type];

  return (
    <div
      className={`fixed top-5 right-5 z-[9999] w-full max-w-sm p-4 rounded-xl shadow-2xl border flex items-start transition-all transform duration-300 translate-y-0 opacity-100 ${style}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-bold capitalize">{notification.type}</p>
        <p className="mt-1 text-sm font-medium">{notification.message}</p>
      </div>
      <button onClick={onClear} className="ml-4 p-1 rounded-full hover:bg-black/10 transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};

export default Notification;
