import { useEffect } from 'react';

export default function Toast({ message, isVisible, type = 'success', onClose }) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg border flex items-center gap-2 transition-all duration-300 ${type === 'success' ? 'bg-black text-white border-white/10' :
                type === 'warning' ? 'bg-yellow-400 text-black border-yellow-500' :
                    'bg-red-500 text-white border-red-600'
            }`}>
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
}
