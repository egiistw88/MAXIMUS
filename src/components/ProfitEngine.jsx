import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

import { supabase } from '../lib/supabaseClient';
import Card from './Card';
import PrimaryButton from './PrimaryButton';
import SectionTitle from './SectionTitle';

const MotionPrimaryButton = motion(PrimaryButton);

export default function ProfitEngine({ showToast, session }) {
    const { settings } = useSettings();
    const [orderPrice, setOrderPrice] = useState('');
    const [distance, setDistance] = useState('');
    const [isPriority, setIsPriority] = useState(settings.defaultCommission === 0.10);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const timeoutRef = useRef(null);
    const isMountedRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

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

        if (isMountedRef.current) {
            setIsSubmitting(true);
        }

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
                        price: estimatedNetProfit,
                        gross_price: priceValue,
                        commission_rate: currentCommissionRate,
                        app_fee: appFee,
                        net_profit: estimatedNetProfit,
                        distance: distanceValue,
                        fuel_cost: fuelCost,
                        fuel_efficiency_at_time: settings.fuelEfficiency,
                        // created_at is default now() in DB
                    },
                ]);

            if (error) throw error;

            if (isMountedRef.current) {
                setShowSuccess(true);
            }

            // Show toast using the prop passed from App
            if (showToast) {
                showToast(`Order Saved: +${formatCurrency(estimatedNetProfit)}`);
            }

            // Delay clearing inputs to show the success animation
            timeoutRef.current = setTimeout(() => {
                if (!isMountedRef.current) {
                    return;
                }
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
            if (isMountedRef.current) {
                setIsSubmitting(false);
            }
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
                        className="fixed inset-0 z-50 flex items-center justify-center bg-ui-overlay backdrop-blur-sm cursor-pointer"
                    >
                        <div className="text-center">
                            <motion.div
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            >
                            <CheckCircle className="w-24 h-24 text-ui-primary mx-auto mb-4" />
                            </motion.div>
                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-3xl font-bold text-ui-primary font-display"
                            >
                                ORDER MASUK!
                            </motion.h2>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col h-full bg-ui-background p-4 space-y-4">
                {/* Header Card */}
                <Card className="p-6 flex flex-col items-center justify-center space-y-2 text-center">
                    <SectionTitle>Estimasi Bersih</SectionTitle>
                    <div className={`text-4xl font-bold ${estimatedNetProfit > 0 ? 'text-ui-text' : 'text-ui-danger'}`}>
                        <span className="text-lg text-ui-muted font-normal mr-1">Rp</span>
                        {formatCurrency(Math.max(0, estimatedNetProfit))}
                    </div>
                </Card>

                {/* Input Section */}
                <Card className="p-6 space-y-4">
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <SectionTitle className="text-[10px] tracking-[0.3em]">Omzet Order (Rp)</SectionTitle>
                            {orderPrice && (
                                <span className="text-[10px] font-bold text-ui-success bg-ui-success/10 px-2 py-0.5 rounded-ui-sm">
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
                            className="w-full text-lg p-3 rounded-ui-lg border border-ui-border focus:border-ui-primary focus:ring-1 focus:ring-ui-primary outline-none transition-all bg-ui-surface text-ui-text"
                            inputMode="numeric"
                        />

                        {/* Gap Fix 2: Quick Chips */}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {quickValues.map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setOrderPrice(val.toString())}
                                    className="px-3 py-1.5 bg-ui-surface-muted border border-ui-border rounded-ui-sm text-xs font-bold text-ui-muted active:bg-ui-primary active:text-ui-text transition-colors"
                                >
                                    {val / 1000}k
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <SectionTitle className="text-[10px] tracking-[0.3em] mb-1">Jarak (KM)</SectionTitle>
                        <input
                            type="number"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            placeholder="0"
                            min="0"
                            step="0.1"
                            className="w-full text-lg p-3 rounded-ui-lg border border-ui-border focus:border-ui-primary focus:ring-1 focus:ring-ui-primary outline-none transition-all bg-ui-surface text-ui-text"
                            inputMode="decimal"
                        />
                    </div>

                    {/* Gap Fix 1: Toggle Switch "Prioritas?" */}
                    <div className="flex items-center justify-between pt-2 border-t border-ui-border/60">
                        <div>
                            <span className="text-sm font-bold text-ui-text">Prioritas?</span>
                            <p className="text-[10px] text-ui-muted">{isPriority ? 'Potongan 10%' : 'Potongan 15%'}</p>
                        </div>
                        <button
                            onClick={() => setIsPriority(!isPriority)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isPriority ? 'bg-ui-primary' : 'bg-ui-surface-muted'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-ui-surface absolute top-1 transition-transform transform ${isPriority ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </Card>

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="p-3 text-center">
                        <SectionTitle className="text-[9px]">Potongan</SectionTitle>
                        <div className="text-sm font-semibold text-ui-danger">-{formatCurrency(appFee)}</div>
                    </Card>
                    <Card className="p-3 text-center">
                        <SectionTitle className="text-[9px]">Bensin</SectionTitle>
                        <div className="text-sm font-semibold text-ui-danger">-{formatCurrency(fuelCost)}</div>
                    </Card>
                    <Card className="p-3 text-center">
                        <SectionTitle className="text-[9px]">Servis</SectionTitle>
                        <div className="text-sm font-semibold text-ui-danger">-{formatCurrency(maintenance)}</div>
                    </Card>
                </div>

                {/* Action Button */}
                <MotionPrimaryButton
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAccept}
                    disabled={!orderPrice || !distance || isSubmitting}
                    className="w-full py-4 mt-auto text-lg font-bold shadow-ui-md disabled:bg-ui-surface-muted disabled:text-ui-muted"
                >
                    TERIMA ORDER
                </MotionPrimaryButton>
            </div>
        </>

    );
}
