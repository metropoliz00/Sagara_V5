
import React from 'react';
import { AlertTriangle, CheckCircle, Info, X, HelpCircle } from 'lucide-react';

interface CustomModalProps {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'success' | 'error';
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const CustomModal: React.FC<CustomModalProps> = ({ 
  isOpen, type, title, message, onConfirm, onCancel 
}) => {
  if (!isOpen) return null;

  const getConfig = () => {
    switch (type) {
      case 'confirm':
        return {
          icon: <HelpCircle size={32} className="text-[#5AB2FF]" />,
          bgIcon: 'bg-[#CAF4FF]',
          btnConfirm: 'bg-[#5AB2FF] hover:bg-[#A0DEFF] text-white',
          title: title || 'Konfirmasi Tindakan'
        };
      case 'error':
        return {
          icon: <X size={32} className="text-red-500" />,
          bgIcon: 'bg-red-100',
          btnConfirm: 'bg-red-500 hover:bg-red-600 text-white',
          title: title || 'Terjadi Kesalahan'
        };
      case 'success':
        return {
          icon: <CheckCircle size={32} className="text-[#5AB2FF]" />,
          bgIcon: 'bg-[#FFF9D0]', // Yellow/Cream for warmth
          btnConfirm: 'bg-[#5AB2FF] hover:bg-[#A0DEFF] text-white',
          title: title || 'Berhasil'
        };
      default: // alert/info
        return {
          icon: <Info size={32} className="text-[#5AB2FF]" />,
          bgIcon: 'bg-[#CAF4FF]',
          btnConfirm: 'bg-[#5AB2FF] hover:bg-[#A0DEFF] text-white',
          title: title || 'Informasi'
        };
    }
  };

  const config = getConfig();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100 border border-[#CAF4FF]">
        <div className="p-6 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${config.bgIcon} shadow-sm`}>
            {config.icon}
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{config.title}</h3>
          <p className="text-gray-600 mb-6 leading-relaxed text-sm">{message}</p>
          
          <div className="flex gap-3 w-full">
            {type === 'confirm' && (
              <button 
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 bg-[#FFF9D0] text-gray-700 font-bold rounded-xl hover:bg-yellow-100 transition-colors"
              >
                Batal
              </button>
            )}
            <button 
              onClick={onConfirm}
              className={`flex-1 py-2.5 px-4 font-bold rounded-xl shadow-md transition-all transform active:scale-95 ${config.btnConfirm}`}
            >
              {type === 'confirm' ? 'Ya, Lanjutkan' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
