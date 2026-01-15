import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Save, X } from 'lucide-react';
import { format } from 'date-fns';

const parseLocalDateTime = (value) => {
    if (!value) return null;
    const [datePart, timePart] = value.split('T');
    if (!datePart || !timePart) return null;
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    if ([year, month, day, hour, minute].some((part) => Number.isNaN(part))) return null;
    return new Date(year, month - 1, day, hour, minute);
};

const formatLocalDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return format(date, "yyyy-MM-dd'T'HH:mm");
};

const formatUtcDateTime = (value) => {
    const date = parseLocalDateTime(value);
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toISOString();
};

export default function EditOrderModal({ isOpen, onClose, order, onSave, showToast }) {
    const [price, setPrice] = useState('');
    const [distance, setDistance] = useState('');
    const [createdAt, setCreatedAt] = useState('');
    const [createdAtError, setCreatedAtError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const title = useMemo(() => (order ? `Edit Order #${order.id}` : 'Edit Order'), [order]);

    useEffect(() => {
        if (!isOpen || !order) return;
        setPrice(order.net_profit?.toString() ?? order.price?.toString() ?? '');
        setDistance(order.distance?.toString() ?? '');
        setCreatedAt(formatLocalDateTime(order.created_at));
        setCreatedAtError(false);
    }, [isOpen, order]);

    const handleCreatedAtChange = (event) => {
        const { value } = event.target;
        setCreatedAt(value);
        if (createdAtError && formatUtcDateTime(value)) {
            setCreatedAtError(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!order || isSubmitting) return;

        const formattedCreatedAt = formatUtcDateTime(createdAt);
        if (!formattedCreatedAt) {
            setCreatedAtError(true);
            if (showToast) {
                showToast('Tanggal & waktu wajib diisi dengan benar.', 'error');
            }
            return;
        }

        setIsSubmitting(true);
        try {
            const updatedOrder = {
                ...order,
                price: price ? parseFloat(price) : 0,
                net_profit: price ? parseFloat(price) : 0,
                distance: distance ? parseFloat(distance) : 0,
                created_at: formattedCreatedAt
            };

            await onSave(updatedOrder);
        } catch (error) {
            console.error('Error updating order:', error);
            if (showToast) {
                showToast('Gagal menyimpan perubahan order.', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl pointer-events-auto relative z-10 max-h-[80vh] overflow-y-auto pb-32"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
                                <p className="text-xs text-gray-400">Time travel untuk edit tanggal transaksi.</p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Harga (Rp)</label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(event) => setPrice(event.target.value)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow outline-none text-sm dark:text-gray-100"
                                    placeholder="Masukkan nominal"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Jarak (Km)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={distance}
                                    onChange={(event) => setDistance(event.target.value)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow outline-none text-sm dark:text-gray-100"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tanggal & Waktu</label>
                                <div className="relative">
                                    <Clock size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="datetime-local"
                                        value={createdAt}
                                        onChange={handleCreatedAtChange}
                                        className={`w-full pl-9 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border outline-none text-sm dark:text-gray-100 ${
                                            createdAtError
                                                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-400'
                                                : 'border-gray-200 dark:border-gray-700 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow'
                                        }`}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2 transition-all ${
                                    isSubmitting
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                        : 'bg-maxim-dark text-maxim-yellow shadow-maxim-dark/20 hover:bg-black active:scale-95'
                                }`}
                            >
                                {isSubmitting ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={20} />
                                        <span>Simpan Perubahan</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
