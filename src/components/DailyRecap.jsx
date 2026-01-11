
export default function DailyRecap({ orders, onClearHistory }) {
    if (!orders || orders.length === 0) return null;

    return (
        <div className="mt-4 px-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-primary/80 text-xs font-bold tracking-widest uppercase">Daily Log</h3>
                <button
                    onClick={onClearHistory}
                    className="text-[10px] text-red-500 hover:text-red-400 uppercase tracking-wider"
                >
                    Clear History
                </button>
            </div>

            <div className="bg-black/40 border border-primary/10 rounded overflow-hidden">
                <div className="grid grid-cols-3 gap-2 px-3 py-2 border-b border-primary/20 bg-primary/5">
                    <span className="text-[10px] text-primary/60 font-mono">TIME</span>
                    <span className="text-[10px] text-primary/60 font-mono text-center">NET</span>
                    <span className="text-[10px] text-primary/60 font-mono text-right">DIST</span>
                </div>

                <div className="max-h-[150px] overflow-y-auto">
                    {orders.map((order, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2 px-3 py-1.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                            <span className="text-[10px] text-gray-400 font-mono">{order.time}</span>
                            <span className={`text-[10px] font-mono font-bold text-center ${order.netProfit > 10000 ? 'text-[#06f906]' :
                                    order.netProfit < 4000 ? 'text-red-500' : 'text-primary'
                                }`}>
                                {(order.netProfit / 1000).toFixed(1)}k
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono text-right">{order.distance}km</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
