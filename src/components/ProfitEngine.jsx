import { useState, useEffect } from 'react';

export default function ProfitEngine({ onAccept }) {
    // State initialization
    const [orderPrice, setOrderPrice] = useState('');
    const [distance, setDistance] = useState('');
    const [commissionRate, setCommissionRate] = useState(() => {
        const saved = localStorage.getItem('profit_engine_commission');
        return saved ? parseFloat(saved) : 0.15; // Default to 15% (Non-Priority)
    });

    // Save commission preference
    useEffect(() => {
        localStorage.setItem('profit_engine_commission', commissionRate);
    }, [commissionRate]);

    // Calculations
    const gross = parseFloat(orderPrice) || 0;
    const dist = parseFloat(distance) || 0;
    const appFee = gross * commissionRate;
    const fuelCost = dist * 300;
    const maintenance = 500;
    const netProfit = gross - appFee - fuelCost - maintenance;

    // Formatting helpers
    const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);
    const formatShort = (value) => {
        if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
        return value;
    };

    // Conditional styling
    const getProfitColor = () => {
        if (netProfit > 10000) return 'text-[#06f906] drop-shadow-[0_0_8px_rgba(6,249,6,0.5)]';
        if (netProfit < 4000) return 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
        return 'text-primary';
    };

    const handleAccept = () => {
        if (!orderPrice || !distance) return;

        const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const orderData = {
            time: timestamp,
            price: parseFloat(orderPrice),
            distance: parseFloat(distance),
            netProfit: netProfit,
            commissionRate: commissionRate
        };

        if (onAccept) {
            onAccept(orderData);
        }

        // Reset inputs
        setOrderPrice('');
        setDistance('');
    };

    return (
        <div className="flex flex-col gap-3 px-4 py-4 bg-background-dark relative">
            {/* Header */}
            <div className="flex justify-between items-end mb-1">
                <p className="text-primary/60 text-[10px] font-bold tracking-[0.2em] uppercase">
                    PROFIT REALITY ENGINE
                </p>
                <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    <span className={`w-1.5 h-1.5 rounded-full ${netProfit > 0 ? 'bg-primary' : 'bg-red-500'}`}></span>
                    <span className="text-primary text-[10px] font-bold tracking-wider">
                        NET: {commissionRate === 0.1 ? 'PRIO' : 'REG'}
                    </span>
                </div>
            </div>

            {/* Inputs Section */}
            <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="relative">
                    <label className="text-[10px] text-primary/60 uppercase tracking-wider block mb-1">Price (IDR)</label>
                    <input
                        type="number"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        placeholder="0"
                        className="w-full bg-black/40 border border-primary/20 rounded px-2 py-1 text-primary text-sm focus:outline-none focus:border-primary/60 placeholder-primary/20"
                    />
                </div>
                <div className="relative">
                    <label className="text-[10px] text-primary/60 uppercase tracking-wider block mb-1">Dist (KM)</label>
                    <input
                        type="number"
                        value={distance}
                        onChange={(e) => setDistance(e.target.value)}
                        placeholder="0"
                        className="w-full bg-black/40 border border-primary/20 rounded px-2 py-1 text-primary text-sm focus:outline-none focus:border-primary/60 placeholder-primary/20"
                    />
                </div>
            </div>

            {/* Commission Toggle */}
            <div className="flex justify-end mb-2">
                <button
                    onClick={() => setCommissionRate(commissionRate === 0.15 ? 0.10 : 0.15)}
                    className="text-[10px] text-primary/80 border border-primary/30 rounded px-2 py-1 hover:bg-primary/10 transition-colors"
                >
                    Mode: {commissionRate === 0.10 ? 'Priority (10%)' : 'Non-Priority (15%)'}
                </button>
            </div>

            {/* Main Display */}
            <div className="text-center py-2 border-y border-white/5 bg-black/20">
                <h1 className={`text-4xl font-bold tracking-tighter leading-none transition-colors duration-300 ${getProfitColor()}`}>
                    <span className="text-xl align-top opacity-50 font-normal mr-1 text-current">IDR</span>
                    {formatCurrency(Math.max(0, netProfit))}
                </h1>
                <p className="text-[10px] text-primary/40 mt-1 tracking-widest uppercase">Estimated Net Profit</p>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 text-center">
                <div>
                    <p className="text-[10px] text-gray-500 uppercase">App Fee</p>
                    <p className="text-xs text-red-400 font-mono">-{formatShort(appFee)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-500 uppercase">Fuel</p>
                    <p className="text-xs text-red-400 font-mono">-{formatShort(fuelCost)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-500 uppercase">Maint</p>
                    <p className="text-xs text-red-400 font-mono">-{maintenance}</p>
                </div>
            </div>

            {/* Accept Action */}
            <button
                onClick={handleAccept}
                disabled={!orderPrice || !distance}
                className={`w-full mt-4 py-3 font-bold tracking-widest uppercase transition-all duration-300 ${!orderPrice || !distance
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-primary text-black hover:bg-primary/90 shadow-[0_0_15px_rgba(6,249,6,0.3)]'
                    }`}
            >
                Accept Order
            </button>
        </div>
    );
}
