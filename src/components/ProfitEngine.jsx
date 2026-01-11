import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export default function ProfitEngine({ onAccept }) {
    const { settings } = useSettings();
    const [orderPrice, setOrderPrice] = useState('');
    const [distance, setDistance] = useState('');
    const [commissionRate, setCommissionRate] = useState(settings.defaultCommission);
    const [showSuccess, setShowSuccess] = useState(false);

    // Update local commission state if default changes in settings
    useEffect(() => {
        setCommissionRate(settings.defaultCommission);
    }, [settings.defaultCommission]);

    const gross = parseFloat(orderPrice) || 0;
    const dist = parseFloat(distance) || 0;
    const appFee = gross * commissionRate;
    // Use fuel efficiency from settings
    const fuelCost = dist * settings.fuelEfficiency;
    const maintenance = 500;
    const netProfit = gross - appFee - fuelCost - maintenance;

    const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

    const handleAccept = () => {
        if (!orderPrice || !distance) return;

        // Haptic Feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        setShowSuccess(true);

        const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        // Delay updating the list to show the success animation
        setTimeout(() => {
            onAccept({
                time: timestamp,
                price: parseFloat(orderPrice),
                distance: parseFloat(distance),
                netProfit: netProfit,
                commissionRate: commissionRate
            });

            setOrderPrice('');
            setDistance('');
            setShowSuccess(false);
        }, 1500);
    };

    return (
        <>
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    >
                        <div className="text-center">
                            <motion.div
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            >
                                <CheckCircle className="w-24 h-24 text-maxim-yellow mx-auto mb-4" />
                            </motion.div>
                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-3xl font-bold text-maxim-yellow"
                            >
                                ORDER MASUK!
                            </motion.h2>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col h-full bg-maxim-bg p-4 space-y-4">
                {/* Header Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Estimasi Bersih</span>
                    <div className={`text-4xl font-bold ${netProfit > 0 ? 'text-maxim-dark' : 'text-red-500'}`}>
                        <span className="text-lg text-gray-400 font-normal mr-1">Rp</span>
                        {formatCurrency(Math.max(0, netProfit))}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${commissionRate === 0.1 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                            {commissionRate === 0.1 ? 'PRIORITAS' : 'NON-PRIORITAS'}
                        </span>
                    </div>
                </div>

                {/* Input Section */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Harga Order (Rp)</label>
                        <input
                            type="number"
                            value={orderPrice}
                            onChange={(e) => setOrderPrice(e.target.value)}
                            placeholder="0"
                            className="w-full text-lg p-3 rounded-xl border border-gray-200 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow outline-none transition-all"
                            inputMode="numeric"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Jarak (KM)</label>
                        <input
                            type="number"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            placeholder="0"
                            className="w-full text-lg p-3 rounded-xl border border-gray-200 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow outline-none transition-all"
                            inputMode="decimal"
                        />
                    </div>

                    {/* Commission Toggle */}
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-sm font-medium text-gray-600">Potongan Aplikasi</span>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setCommissionRate(0.10)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${commissionRate === 0.10 ? 'bg-white shadow-sm text-maxim-dark' : 'text-gray-400'}`}
                            >
                                10%
                            </button>
                            <button
                                onClick={() => setCommissionRate(0.15)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${commissionRate === 0.15 ? 'bg-white shadow-sm text-maxim-dark' : 'text-gray-400'}`}
                            >
                                15%
                            </button>
                        </div>
                    </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                        <div className="text-[10px] text-gray-400 uppercase">Potongan</div>
                        <div className="text-sm font-semibold text-red-500">-{formatCurrency(appFee)}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                        <div className="text-[10px] text-gray-400 uppercase">Bensin</div>
                        <div className="text-sm font-semibold text-red-500">-{formatCurrency(fuelCost)}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                        <div className="text-[10px] text-gray-400 uppercase">Servis</div>
                        <div className="text-sm font-semibold text-red-500">-{maintenance}</div>
                    </div>
                </div>

                {/* Action Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAccept}
                    disabled={!orderPrice || !distance}
                    className={`w-full py-4 mt-auto rounded-xl font-bold text-lg shadow-lg ${!orderPrice || !distance
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-maxim-yellow text-maxim-dark shadow-yellow-200'
                        }`}
                >
                    TERIMA ORDER
                </motion.button>
            </div>
        </>
    );
}
