import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

import { supabase } from '../lib/supabaseClient';

export default function ProfitEngine({ showToast, session }) {
    const { settings } = useSettings();
    const [orderPrice, setOrderPrice] = useState('');
    const [distance, setDistance] = useState('');
    const [isPriority, setIsPriority] = useState(settings.defaultCommission === 0.10);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Update local priority state if default changes in settings
    useEffect(() => {
        setIsPriority(settings.defaultCommission === 0.10);
    }, [settings.defaultCommission]);

    const quickValues = [5000, 10000, 15000, 20000, 50000];

    const gross = parseFloat(orderPrice) || 0;
    const dist = parseFloat(distance) || 0;
    const currentCommissionRate = isPriority ? 0.10 : 0.15;

    // Gap Fix 1: Real Net Logic
    const realNet = gross * (1 - currentCommissionRate);

    // Financial Breakdown
    const appFee = gross * currentCommissionRate;
    const fuelCost = dist * settings.fuelEfficiency;
    const maintenance = settings.maintenanceFee ?? 500;
    const estimatedNetProfit = realNet - fuelCost - maintenance;

    const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

    const handleAccept = async () => {
        if (!orderPrice || !distance || isSubmitting) return;

        const priceValue = parseFloat(orderPrice);
        const distanceValue = parseFloat(distance);

        if (Number.isNaN(priceValue) || priceValue < 0) {
            if (showToast) {
                showToast('Harga order tidak valid.', 'error');
            }
            return;
        }

        if (Number.isNaN(distanceValue) || distanceValue < 0) {
            if (showToast) {
                showToast('Jarak tidak valid.', 'error');
            }
            return;
        }

        setIsSubmitting(true);

        // Haptic Feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        try {
            const { error } = await supabase
                .from('orders')
                .insert([
                    {
                        user_id: session.user.id,
                        price: realNet, // Gap Fix 1: Save Real Net, not raw price
                        distance: dist,
                        net_profit: estimatedNetProfit,
                        // created_at is default now() in DB
                    },
                ]);

            if (error) throw error;

            setShowSuccess(true);

            // Show toast using the prop passed from App
            if (showToast) {
                showToast(`Order Saved: +${formatCurrency(estimatedNetProfit)}`);
            }

            // Delay clearing inputs to show the success animation
            setTimeout(() => {
                setOrderPrice('');
                setDistance('');
                setShowSuccess(false);
                setIsSubmitting(false);
            }, 1500);

        } catch (error) {
            console.error('Error saving order:', error);
            if (showToast) {
                showToast(`Gagal menyimpan order: ${error.message}`, 'error');
            }
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSuccess(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
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
                    <div className={`text-4xl font-bold ${estimatedNetProfit > 0 ? 'text-maxim-dark' : 'text-red-500'}`}>
                        <span className="text-lg text-gray-400 font-normal mr-1">Rp</span>
                        {formatCurrency(Math.max(0, estimatedNetProfit))}
                    </div>
                </div>

                {/* Input Section */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-xs font-medium text-gray-500 uppercase">Harga Order (Rp)</label>
                            {orderPrice && (
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                    Bersih: Rp {formatCurrency(realNet)}
                                </span>
                            )}
                        </div>
                        <input
                            type="number"
                            value={orderPrice}
                            onChange={(e) => setOrderPrice(e.target.value)}
                            placeholder="0"
                            min="0"
                            step="1000"
                            className="w-full text-lg p-3 rounded-xl border border-gray-200 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow outline-none transition-all"
                            inputMode="numeric"
                        />

                        {/* Gap Fix 2: Quick Chips */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {quickValues.map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setOrderPrice(val.toString())}
                                    className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600 active:bg-maxim-yellow active:text-maxim-dark transition-colors"
                                >
                                    {val / 1000}k
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Jarak (KM)</label>
                        <input
                            type="number"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            placeholder="0"
                            min="0"
                            step="0.1"
                            className="w-full text-lg p-3 rounded-xl border border-gray-200 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow outline-none transition-all"
                            inputMode="decimal"
                        />
                    </div>

                    {/* Gap Fix 1: Toggle Switch "Prioritas?" */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <div>
                            <span className="text-sm font-bold text-gray-700">Prioritas?</span>
                            <p className="text-[10px] text-gray-400">{isPriority ? 'Potongan 10%' : 'Potongan 15%'}</p>
                        </div>
                        <button
                            onClick={() => setIsPriority(!isPriority)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isPriority ? 'bg-maxim-yellow' : 'bg-gray-200'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform transform ${isPriority ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
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
                    disabled={!orderPrice || !distance || isSubmitting}
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
