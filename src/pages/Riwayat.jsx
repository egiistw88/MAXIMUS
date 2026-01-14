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
import { Plus, Minus, TrendingUp, TrendingDown, Wallet, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import ExpenseModal from '../components/ExpenseModal';
import EditOrderModal from '../components/EditOrderModal';
import { motion } from 'framer-motion';

export default function Riwayat({ session }) {
    const { settings } = useSettings();
    const user = session?.user;
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [activeRecap, setActiveRecap] = useState('omzet');
    const [editingOrder, setEditingOrder] = useState(null);
    
    // State untuk Rekap Harian (Setoran)
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
        if(session) fetchData();
    }, [session, settings.defaultCommission, settings.fuelEfficiency]);

    useEffect(() => {
        if(session) fetchTodayRecap();
    }, [session]);

    // --- FITUR BARU: Hitung Setoran Hari Ini ---
    const fetchTodayRecap = async () => {
        try {
            const now = new Date();
            const startToday = startOfDay(now).toISOString();
            const endToday = endOfDay(now).toISOString();

            // FIX: Menggunakan 'created_at' bukan 'date' agar aman
            const { data: expensesData, error: expensesError } = await supabase
                .from('expenses')
                .select('*')
                .gte('created_at', startToday)
                .lte('created_at', endToday);

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
            // Mengambil range bulan ini untuk statistik
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
        
        // Kalkulasi Estimasi (Bensin & Potongan)
        const commissionRate = settings.defaultCommission ?? 0;
        const totalAppFee = orders.reduce((sum, order) => {
            const netValue = parseFloat(order.price) || 0;
            if (commissionRate <= 0 || commissionRate >= 1) return sum;
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

        // Data Chart 7 Hari Terakhir
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
            fetchTodayRecap(); // Refresh juga rekap harian
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Gagal menghapus transaksi.');
        }
    };

    const handleUpdateOrder = async (updatedOrder) => {
        if (!updatedOrder.id) {
            alert("Error: ID Order tidak ditemukan.");
            return;
        }

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    price: updatedOrder.price,
                    distance: updatedOrder.distance,
                    origin: updatedOrder.origin,
                    destination: updatedOrder.destination,
                    created_at: updatedOrder.created_at
                })
                .eq('id', updatedOrder.id)
                .select();

            if (error) throw error;

            await fetchData();
            await fetchTodayRecap();

            setEditingOrder(null);
            alert('✅ Data berhasil diperbarui!');
        } catch (error) {
            console.error('Gagal update:', error);
            alert('Gagal update: ' + (error.message || "Terjadi kesalahan sistem"));
        }
    };

    const handleSaveExpense = async (expenseData) => {
        if (!user) {
            alert("Sesi habis. Silakan login ulang.");
            return;
        }

        try {
            console.log("Mengirim data pengeluaran:", expenseData);

            const { error } = await supabase
                .from('expenses')
                .insert([{
                    user_id: user.id,
                    amount: parseFloat(expenseData.amount || expenseData.price || 0),
                    category: expenseData.category || 'Lainnya',
                    description: expenseData.description || expenseData.note || '',
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;

            await fetchData();
            await fetchTodayRecap();

            setShowExpenseModal(false);
            alert('✅ Pengeluaran berhasil disimpan!');
        } catch (error) {
            console.error('Gagal simpan pengeluaran:', error);
            alert('Gagal menyimpan: ' + (error.message || JSON.stringify(error)));
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

            {/* Insight Harian */}
            <div className={`mx-5 mb-4 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-3`}>
                <div className={`p-2 rounded-full bg-opacity-10 ${insight.color.replace('text', 'bg')}`}>
                    <AlertCircle className={`w-5 h-5 ${insight.color}`} />
                </div>
                <p className={`text-sm font-medium ${insight.color}`}>
                    "{insight.text}"
                </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 space-y-6">
                
                {/* --- KARTU REKAP HARIAN (SETORAN) --- */}
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
                            <span className="text-xs uppercase tracking-wide text-emerald-100">Siap Setor / Sisa Hari Ini</span>
                            <span className="text-3xl font-extrabold tracking-tight">
                                Rp {formatCurrency(todayRecap.net)}
                            </span>
                            {todayRecap.net < 0 && (
                                <span className="inline-block bg-red-600/30 px-2 py-1 rounded text-xs font-bold text-white border border-red-400/50 w-fit">
                                    ⚠️ Minus (Pakai Modal)
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- TOMBOL TAB STATISTIK --- */}
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
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Potongan</p>
                            <p className="text-sm font-bold text-maxim-yellow truncate">
                                {formatCurrency(metrics.appFeeTotal + metrics.fuelCostTotal)}
                            </p>
                        </div>
                    </button>
                </div>

                {/* --- DETAIL STATISTIK --- */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    {activeRecap === 'omzet' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Total Omzet Bulan Ini</span>
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
                            <div className="flex items-center justify-between text-sm border-t pt-2 dark:border-gray-700">
                                <span className="text-gray-500">Sisa Uang (Cashflow)</span>
                                <span className="font-bold text-green-600">
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
                                <span className="text-gray-500">Estimasi Potongan Aplikasi</span>
                                <span className="font-semibold text-red-500">
                                    -{formatCurrency(metrics.appFeeTotal)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Estimasi Bensin</span>
                                <span className="font-semibold text-red-500">
                                    -{formatCurrency(metrics.fuelCostTotal)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- CHART 7 HARI --- */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                   <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Tren 7 Hari Terakhir</h3>
                   <div className="h-40 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                           <XAxis 
                              dataKey="label" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 10, fill: '#9ca3af'}} 
                           />
                           <Tooltip 
                              cursor={{fill: 'transparent'}}
                              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                           />
                           <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#10b981' : '#ef4444'} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                {/* --- DAFTAR TRANSAKSI --- */}
                <div className="pb-10">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 px-1">Riwayat Transaksi</h3>
                    <div className="space-y-3">
                        {transactions.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                Belum ada data hari ini.
                            </div>
                        ) : (
                            transactions.map((t) => (
                                <div key={`${t.type}-${t.id}`} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${
                                            t.type === 'income' 
                                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30' 
                                            : 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                        }`}>
                                            {t.type === 'income' ? <Plus size={18} /> : <Minus size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                                                {t.type === 'income' ? 'Order Masuk' : (t.category || 'Pengeluaran')}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {formatTime(t.created_at)} • {t.type === 'income' ? `${t.distance || 0} km` : t.description || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.displayAmount)}
                                        </p>
                                        <div className="mt-1 flex items-center justify-end gap-2">
                                            {t.type === 'income' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingOrder(t)}
                                                    className="text-xs text-gray-300 hover:text-maxim-yellow flex items-center gap-1"
                                                >
                                                    <Edit2 size={12} /> Edit
                                                </button>
                                            )}
                                            <button 
                                                type="button"
                                                onClick={() => handleDelete(t.id, t.type)}
                                                className="text-xs text-gray-300 hover:text-red-400 flex items-center gap-1"
                                            >
                                               <Trash2 size={12} /> Hapus
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Tombol Tambah Pengeluaran */}
            <div className="absolute bottom-6 right-5 z-20">
                <button
                    onClick={() => setShowExpenseModal(true)}
                    className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg shadow-red-500/30 transition-all active:scale-95 flex items-center gap-2"
                >
                    <Minus size={24} />
                </button>
            </div>

            <ExpenseModal
                isOpen={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                onSave={handleSaveExpense}
            />

            <EditOrderModal
                isOpen={Boolean(editingOrder)}
                onClose={() => setEditingOrder(null)}
                order={editingOrder}
                onSave={handleUpdateOrder}
            />
        </div>
    );
}
