import { AnimatePresence, motion } from 'framer-motion';

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isDestructive = false
}) {
    const confirmLabel = isDestructive ? 'Ya, Hapus' : 'Ya';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        onClick={(event) => event.stopPropagation()}
                        className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-gray-100 dark:border-slate-700 dark:bg-slate-800"
                    >
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                {message}
                            </p>
                        </div>
                        <div className="mt-6 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] ${
                                    isDestructive
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : 'bg-maxim-dark hover:bg-black dark:bg-maxim-yellow dark:text-black dark:hover:bg-yellow-400'
                                }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
