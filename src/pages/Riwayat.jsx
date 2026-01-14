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
import {
    format,
    subDays,
    startOfMonth,
    endOfMonth,
    isSameDay,
    parseISO,
    isValid,
    startOfDay,
    endOfDay
} from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, Minus, TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react';
import ExpenseModal from '../components/ExpenseModal';
import { motion } from 'framer-motion';

export default function Riwayat({ session }) {
    const { settings } = useSettings();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [activeRecap, setActiveRecap] = useState('omzet');
    const [todayRecap, setTodayRecap] = useState({
        income: 0,
        expense: 0,
        net: 0
    });

    const [metrics, setMetrics] = useState({
        grossIncome: 0,
        actualExpenses: 0,
        netCash: 0,
        efficiencyScore: 0,
        appFeeTotal: 0,
        fuelCostTotal: 0,
        ordersCount: 0,
        expensesCount: 0
    });

    useEffect(() => {
        fetchData();
    }, [session, settings.defaultCommission, settings.fuelEfficiency]);

    useEffect(() => {
        fetchTodayRecap();
    }, [session]);

    const fetchTodayRecap = async () => {
        try {
            const now = new Date();
            const startToday = startOfDay(now).toISOString();
            const endToday = endOfDay(now).toISOString();

            const { data: expensesData, error: expensesError } = await supabase
                .from('expenses')
                .select('*')
                .gte('date', startToday)
                .lte('date', endToday);

            if (expensesError) throw expensesError;

            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .gte('created_at', startToday)
                .lte('created_at', endToday);

            if (ordersError) throw ordersError;

            const totalIncome = (ordersData || []).reduce(
                (sum, order) => sum + (parseFloat(order.price) || 0),
                0
            );
            const totalExpense = (expensesData || []).reduce(
                (sum, expense) => sum + (parseFloat(expense.amount) || 0),
                0
            );
            setTodayRecap({
                income: totalIncome,
                expense: totalExpense,
                net: totalIncome - totalExpense
            });
        } catch (error) {
            console.error('Error fetching today recap:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const now = new Date();
            const startMonth = startOfMonth(now).toISOString();
            const endMonth = endOfMonth(now).toISOString();

            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .gte('created_at', startMonth)
                .lte('created_at', endMonth)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

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
        const totalIncome = orders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const cashBalance = totalIncome - totalExpenses;
        const commissionRate = settings.defaultCommission ?? 0;
        const totalAppFee = orders.reduce((sum, order) => {
            const netValue = parseFloat(order.price) || 0;
            if (commissionRate <= 0 || commissionRate >= 1) {
                return sum;
            }
            const estimatedGross = netValue / (1 - commissionRate);
            return sum + (estimatedGross - netValue);
        }, 0);
        const totalFuelCost = orders.reduce((sum, order) => {
            const distance = parseFloat(order.distance) || 0;
            return sum + distance * (settings.fuelEfficiency || 0);
        }, 0);

        let efficiency = 0;
        if (totalIncome > 0) {
            efficiency = (cashBalance / totalIncome) * 100;
        }

        setMetrics({
            grossIncome: totalIncome,
            actualExpenses: totalExpenses,
            netCash: cashBalance,
            efficiencyScore: efficiency,
            appFeeTotal: totalAppFee,
            fuelCostTotal: totalFuelCost,
            ordersCount: orders.length,
            expensesCount: expenses.length
        });

        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = subDays(new Date(), 6 - i);
            return {
                date: d,
                label: format(d, 'dd/MM', { locale: id }),
                net: 0
            };
        });

        const parseDate = (value) => {
            if (!value) return null;
            const parsed = parseISO(value);
            return isValid(parsed) ? parsed : null;
        };

        const chart = last7Days.map(day => {
            const dayOrders = orders.filter((o) => {
                const orderDate = parseDate(o.created_at);
                return orderDate ? isSameDay(orderDate, day.date) : false;
            });
            const dayExpenses = expenses.filter((e) => {
                const expenseDate = parseDate(e.created_at);
                return expenseDate ? isSameDay(expenseDate, day.date) : false;
            });
            const dailyIncome = dayOrders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
            const dailyExpense = dayExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
            return { ...day, net: dailyIncome - dailyExpense };
        });
        setChartData(chart);

        const combined = [
            ...orders.map(o => ({ ...o, type: 'income', displayAmount: o.price })),
            ...expenses.map(e => ({ ...e, type: 'expense', displayAmount: e.amount }))
        ].sort((a, b) => {
            const dateA = parseDate(a.created_at);
            const dateB = parseDate(b.created_at);
            return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
        });

        setTransactions(combined);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val);
    const formatTime = (iso) => {
        const parsed = iso ? parseISO(iso) : null;
        if (!parsed || !isValid(parsed)) return '--:--';
        return format(parsed, 'HH:mm');
    };

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
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Gagal menghapus transaksi.');
        }
    };

    const insight = getInsight();

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-maxim-bg pb-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maxim-dark dark:border-maxim-yellow"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-maxim-bg pb-24 relative">
            <div className="px-5 pt-6 pb-2">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Financial Board</h1>
                <p className="text-xs text-gray-400">Liputan Keuangan Bulan Ini</p>
            </div>

            <div className={`mx-5 mb-4 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-3`}>
                <div className={`p-2 rounded-full bg-opacity-10 ${insight.color.replace('text', 'bg')}`}>
                    <AlertCircle className={`w-5 h-5 ${insight.color}`} />
                </div>
                <p className={`text-sm font-medium ${insight.color}`}>
                    "{insight.text}"
                </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 space-y-6">
                <div className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-5 rounded-2xl shadow-lg border border-emerald-400/40 text-white">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap justify-between gap-4 text-sm font-semibold">
                            <span className="text-green-100">
                                Pemasukan: <span className="text-white">Rp {formatCurrency(todayRecap.income)}</span>
                            </span>
                            <span className="text-red-200">
                                Pengeluaran: <span className="text-white">Rp {formatCurrency(todayRecap.expense)}</span>
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs uppercase tracking-wide text-emerald-100">Siap Setor / Sisa</span>
                            <span className="text-2xl font-extrabold">
                                Rp {formatCurrency(todayRecap.net)}
                            </span>
                            {todayRecap.net < 0 && (
                                <span className="text-xs font-semibold text-yellow-100">⚠️ Minus (Pakai Modal)</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => setActiveRecap('omzet')}
                        className={`bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border flex flex-col justify-between h-24 text-left transition ${
                            activeRecap === 'omzet'
                                ? 'border-green-400 ring-1 ring-green-200 dark:ring-green-500/40'
                                : 'border-gray-100 dark:border-gray-700'
                        }`}
                    >
                        <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg w-fit">
                            <TrendingUp size={16} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Omzet</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                                {formatCurrency(metrics.grossIncome)}
                            </p>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveRecap('pengeluaran')}
                        className={`bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border flex flex-col justify-between h-24 text-left transition ${
                            activeRecap === 'pengeluaran'
                                ? 'border-red-400 ring-1 ring-red-200 dark:ring-red-500/40'
                                : 'border-gray-100 dark:border-gray-700'
                        }`}
                    >
                        <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg w-fit">
                            <TrendingDown size={16} className="text-red-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Pengeluaran</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                                {formatCurrency(metrics.actualExpenses)}
                            </p>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveRecap('potongan')}
                        className={`bg-maxim-dark dark:bg-black p-3 rounded-2xl shadow-lg border flex flex-col justify-between h-24 text-left transition ${
                            activeRecap === 'potongan'
                                ? 'border-maxim-yellow ring-1 ring-yellow-200 dark:ring-maxim-yellow/40'
                                : 'border-gray-800 dark:border-gray-700'
                        }`}
                    >
                        <div className="p-1.5 bg-white/10 rounded-lg w-fit">
                            <Wallet size={16} className="text-maxim-yellow" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Rekap Potongan</p>
                            <p className="text-sm font-bold text-maxim-yellow truncate">
                                {formatCurrency(metrics.appFeeTotal + metrics.fuelCostTotal)}
                            </p>
                        </div>
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    {activeRecap === 'omzet' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Total Omzet</span>
                                <span className="font-bold text-gray-800 dark:text-gray-100">
                                    {formatCurrency(metrics.grossIncome)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Jumlah Order</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                    {metrics.ordersCount} trip
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Sisa Uang</span>
                                <span className="font-semibold text-green-600">
                                    {formatCurrency(metrics.netCash)}
                                </span>
                            </div>
                        </div>
                    )}

                    {activeRecap === 'pengeluaran' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Total Pengeluaran</span>
                                <span className="font-bold text-gray-800 dark:text-gray-100">
                                    {formatCurrency(metrics.actualExpenses)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Jumlah Transaksi</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                    {metrics.expensesCount} item
                                </span>
                            </div>
                        </div>
                    )}

                    {activeRecap === 'potongan' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Potongan Aplikasi</span>
                                <span className="font-semibold text-red-500">
                                    -{formatCurrency(metrics.appFeeTotal)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Potongan Bensin</span>
                                <span className="font-semibold text-red-500">
                                    -{formatCurrency(metrics.fuelCostTotal)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Total Potongan</span>
                                <span className="font-bold text-gray-800 dark:text-gray-100">
                                    {formatCurrency(metrics.appFeeTotal + metrics.fuelCostTotal)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

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
                                        <button
                                            onClick={() => handleDelete(t.id, t.type)}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Minus size={14} className="rotate-45" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExpenseModal(true)}
                className="absolute bottom-24 right-6 w-14 h-14 bg-red-500 rounded-full shadow-xl shadow-red-200 flex items-center justify-center text-white z-20"
            >
                <Minus size={28} className="stroke-[3px]" />
            </motion.button>

            <ExpenseModal
                isOpen={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                onExpenseAdded={fetchData}
                session={session}
            />
        </div>
    );
}
