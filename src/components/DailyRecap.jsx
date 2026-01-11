import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { supabase } from '../lib/supabaseClient';
import {
    BarChart,
    Bar,
    XAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, Minus, TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react';
import ExpenseModal from './ExpenseModal'; // New component
import { motion } from 'framer-motion';

export default function DailyRecap({ session }) {
    const { settings } = useSettings();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [chartData, setChartData] = useState([]);

    // Financial Metrics
    const [metrics, setMetrics] = useState({
        grossIncome: 0,
        marketingExpense: 0,
        netCash: 0,
        efficiencyScore: 0
    });

    useEffect(() => {
        fetchData();
    }, [session]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const now = new Date();
            const startMonth = startOfMonth(now).toISOString();
            const endMonth = endOfMonth(now).toISOString();

            // 1. Fetch Orders (Income)
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .gte('created_at', startMonth)
                .lte('created_at', endMonth)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            // 2. Fetch Expenses (Outcome)
            const { data: expensesData, error: expensesError } = await supabase
                .from('expenses')
                .select('*')
                .gte('created_at', startMonth)
                .lte('created_at', endMonth)
                .order('created_at', { ascending: false });

            if (expensesError) throw expensesError;

            processFinancials(ordersData || [], expensesData || []);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processFinancials = (orders, expenses) => {
        // --- 1. Top Cards Metrics (Month to Date) ---
        const totalIncome = orders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
        // "Real" expenses from the app inputs (fuel, service, etc) PLUS hidden fees if tracked? 
        // For now, let's stick to the prompt: Gross Income = orders.price sum. 
        // But Net Cash needs to consider order profit too? 
        // The prompt says: Net Cash = Gross Income - Actual Expenses. 
        // Note: order.net_profit calculation in ProfitEngine already subtracts an estimated fuel cost.
        // The prompt asks to track "Actual Expenses" via the new modal. 
        // Let's interpret: 
        // Gross Income (Omzet) = Sum of orders.price
        // Actual Expenses = Sum of expenses table (Manual Fuel/Food inputs)
        // Net Cash = Gross Income - Actual Expenses

        const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const cashBalance = totalIncome - totalExpenses;

        // Efficiency: (Net Cash / Gross Income) * 100
        let efficiency = 0;
        if (totalIncome > 0) {
            efficiency = (cashBalance / totalIncome) * 100;
        }

        setMetrics({
            grossIncome: totalIncome,
            actualExpenses: totalExpenses,
            netCash: cashBalance,
            efficiencyScore: efficiency
        });

        // --- 2. Chart Data (Last 7 Days) ---
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = subDays(new Date(), 6 - i);
            return {
                date: d,
                label: format(d, 'dd/MM', { locale: id }),
                net: 0
            };
        });

        // Map data to last 7 days
        // Net for chart = Income on that day - Expenses on that day
        const chart = last7Days.map(day => {
            const dayOrders = orders.filter(o => isSameDay(parseISO(o.created_at), day.date));
            const dayExpenses = expenses.filter(e => isSameDay(parseISO(e.created_at), day.date));

            const dailyIncome = dayOrders.reduce((s, o) => s + (o.price || 0), 0);
            const dailyExpense = dayExpenses.reduce((s, e) => s + (e.amount || 0), 0);

            return {
                ...day,
                net: dailyIncome - dailyExpense
            };
        });
        setChartData(chart);

        // --- 3. Transaction List (Merged) ---
        const combined = [
            ...orders.map(o => ({ ...o, type: 'income', displayAmount: o.price })),
            ...expenses.map(e => ({ ...e, type: 'expense', displayAmount: e.amount }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setTransactions(combined);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val);
    const formatTime = (iso) => format(parseISO(iso), 'HH:mm');

    // Insight Logic
    const getInsight = () => {
        const score = metrics.efficiencyScore;
        if (metrics.grossIncome === 0) return { text: "Belum ada tarikan. Gas cari orderan!", color: "text-gray-500" };

        if (score >= 70) return { text: "Mantap! Efisiensi keuangan sangat bagus.", color: "text-green-600" };
        if (score >= 50) return { text: "Not bad. Coba kurangi pengeluaran kecil.", color: "text-yellow-600" };
        return { text: "Boros banget hari ini! Kurangi jajan kopi.", color: "text-red-500" };
    };

    const handleDelete = async (id, type) => {
        if (!confirm('Hapus transaksi ini?')) return;

        try {
            const table = type === 'income' ? 'orders' : 'expenses';
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Refresh data immediately
            fetchData();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Gagal menghapus transaksi.');
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-maxim-bg pb-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maxim-dark dark:border-maxim-yellow"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-maxim-bg pb-24 relative">
            {/* Header */}
            <div className="px-5 pt-6 pb-2">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Financial Board</h1>
                <p className="text-xs text-gray-400">Liputan Keuangan Bulan Ini</p>
            </div>

            {/* Insight Banner */}
            <div className={`mx-5 mb-4 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-3`}>
                <div className={`p-2 rounded-full bg-opacity-10 ${insight.color.replace('text', 'bg')}`}>
                    <AlertCircle className={`w-5 h-5 ${insight.color}`} />
                </div>
                <p className={`text-sm font-medium ${insight.color}`}>
                    "{insight.text}"
                </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 space-y-6">

                {/* 1. Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Income */}
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-24">
                        <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg w-fit">
                            <TrendingUp size={16} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Omzet</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                                {formatCurrency(metrics.grossIncome)}
                            </p>
                        </div>
                    </div>

                    {/* Expense */}
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-24">
                        <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg w-fit">
                            <TrendingDown size={16} className="text-red-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Keluar</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                                {formatCurrency(metrics.actualExpenses)}
                            </p>
                        </div>
                    </div>

                    {/* Net Cash */}
                    <div className="bg-maxim-dark dark:bg-black p-3 rounded-2xl shadow-lg border border-gray-800 dark:border-gray-700 flex flex-col justify-between h-24 text-white">
                        <div className="p-1.5 bg-white/10 rounded-lg w-fit">
                            <Wallet size={16} className="text-maxim-yellow" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Sisa Uang</p>
                            <p className="text-sm font-bold text-maxim-yellow truncate">
                                {formatCurrency(metrics.netCash)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Efficiency Meter */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">Skor Efisiensi</span>
                        <span className={`text-lg font-bold ${metrics.efficiencyScore > 70 ? 'text-green-500' : metrics.efficiencyScore > 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {Math.round(metrics.efficiencyScore)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(0, metrics.efficiencyScore))}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full rounded-full ${metrics.efficiencyScore > 70 ? 'bg-green-500' : metrics.efficiencyScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        />
                    </div>
                </div>

                {/* 3. Performance Chart */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-64">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Grafik 7 Hari Terakhir</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                dy={10}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    backgroundColor: settings.darkMode ? '#1F2937' : '#FFFFFF',
                                    color: settings.darkMode ? '#F3F4F6' : '#374151'
                                }}
                                cursor={{ fill: settings.darkMode ? '#374151' : '#F3F4F6' }}
                            />
                            <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#16A34A' : '#EF4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 4. Transactions List */}
                <div className="pb-10">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Riwayat Transaksi</h3>
                    <div className="space-y-3">
                        {transactions.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-sm">Belum ada data transaksi.</div>
                        ) : (
                            transactions.map((t) => (
                                <motion.div
                                    key={`${t.type}-${t.id}`}
                                    whileTap={{ scale: 0.98 }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        handleDelete(t.id, t.type);
                                    }}
                                    className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-50 dark:border-gray-700 shadow-sm flex items-center justify-between group relative overflow-hidden"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                                            {t.type === 'income' ? (
                                                <Plus size={16} className="text-green-600" />
                                            ) : (
                                                <Minus size={16} className="text-red-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                                {t.type === 'income' ? 'Maxim Order' : t.category}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {formatTime(t.created_at)} • {t.type === 'income' ? `${t.distance} km` : t.note || ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                            {t.type === 'income' ? '+' : '-'} {formatCurrency(t.displayAmount)}
                                        </span>
                                        {/* Desktop Hover Delete or Touch Long Press Feedback */}
                                        <button
                                            onClick={() => handleDelete(t.id, t.type)}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Minus size={14} className="rotate-45" /> {/* Simple x for delete in list */}
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* FAB - Floating Action Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExpenseModal(true)}
                className="absolute bottom-24 right-6 w-14 h-14 bg-red-500 rounded-full shadow-xl shadow-red-200 flex items-center justify-center text-white z-20"
            >
                <Minus size={28} className="stroke-[3px]" />
            </motion.button>

            {/* Expenses Modal */}
            <ExpenseModal
                isOpen={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                onExpenseAdded={fetchData}
                session={session}
            />
        </div>
    );
}
