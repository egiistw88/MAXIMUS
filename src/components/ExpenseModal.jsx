import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, DollarSign } from 'lucide-react';

export default function ExpenseModal({ isOpen, onClose, onSave }) {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Bensin');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories = [
        { id: 'Bensin', label: 'Bensin', color: 'bg-red-100 text-red-600' },
        { id: 'Makan', label: 'Makan', color: 'bg-orange-100 text-orange-600' },
        { id: 'Service', label: 'Service', color: 'bg-blue-100 text-blue-600' },
        { id: 'Lainnya', label: 'Lainnya', color: 'bg-gray-100 text-gray-600' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSave({
                amount,
                category,
                note
            });
            setAmount('');
            setNote('');
            setCategory('Bensin');
            onClose();

        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Gagal menyimpan pengeluaran.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl pointer-events-auto relative z-10 max-h-[80vh] overflow-y-auto pb-32"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Catat Pengeluaran</h2>
                            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Amount Input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Jumlah (Rp)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-400 font-bold">Rp</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="pl-10 w-full p-4 text-2xl font-bold bg-gray-50 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder-gray-300"
                                        placeholder="0"
                                        autoFocus
                                        required
                                    />
                                </div>

                                {/* Gap Fix 2: Quick Chips */}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {[5000, 10000, 15000, 20000, 50000].map((val) => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setAmount(val.toString())}
                                            className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 active:bg-red-500 active:text-white transition-colors"
                                        >
                                            {val / 1000}k
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Categories */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Kategori</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${category === cat.id
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'
                                                }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Catatan (Opsional)</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm"
                                    placeholder="Contoh: Pertalite Full Tank"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={!amount || isSubmitting}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center space-x-2 transition-all ${!amount || isSubmitting
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    : 'bg-red-500 text-white shadow-red-200 hover:bg-red-600 active:scale-95'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={20} />
                                        <span>Simpan Pengeluaran</span>
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
