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
import { Plus, Minus, TrendingUp, TrendingDown, Wallet, AlertCircle, Trash2, Edit2, RotateCcw } from 'lucide-react';
import ExpenseModal from '../components/ExpenseModal';
import ConfirmationModal from '../components/ConfirmationModal';
import EditOrderModal from '../components/EditOrderModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';

export default function Riwayat({ session }) {
    const { settings } = useSettings();
    const { showToast } = useToast();
    const user = session?.user;
    const [transactions, setTransactions] = useState([]);
    const [visibleCount, setVisibleCount] = useState(20);
    const [loading, setLoading] = useState(true);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [dailyRecapData, setDailyRecapData] = useState([]);
    const [activeRecap, setActiveRecap] = useState('omzet');
    const [editingOrder, setEditingOrder] = useState(null);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [deleteTargetType, setDeleteTargetType] = useState(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [dailyResetDate, setDailyResetDate] = useState(null);
    const pageSize = 20;
    
    // State untuk Rekap Harian (Setoran)
    const [todayRecap, setTodayRecap] = useState({
        income: 0,
        expense: 0,
        net: 0,
        appFee: 0,
        expenseRaw: 0
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
        if (session) fetchData();
    }, [session, settings.defaultCommission, settings.fuelEfficiency, dailyResetDate]);

    useEffect(() => {
        if (!user?.id || typeof window === 'undefined') return;
        const storageKey = `dailyRecapReset:${user.id}`;
        const stored = window.localStorage.getItem(storageKey);
        setDailyResetDate(stored);
    }, [user?.id]);

    const parseDate = (value) => {
        if (!value) return null;
        const parsed = parseISO(value);
        return isValid(parsed) ? parsed : null;
    };

    const toUtcIsoString = (date) => {
        if (!date) return null;
        const utcTime = date.getTime() - date.getTimezoneOffset() * 60000;
        return new Date(utcTime).toISOString();
    };

    const getLocalDateRanges = (date = new Date()) => {
        const startToday = startOfDay(date);
        const endToday = endOfDay(date);
        const startMonth = startOfMonth(date);
        const endMonth = endOfMonth(date);
        return {
            startToday,
            endToday,
            startMonth,
            endMonth
        };
    };

    const isWithinLocalRange = (value, start, end) => {
        const parsed = parseDate(value);
        return parsed ? parsed >= start && parsed <= end : false;
    };

    const getGrossPrice = (order) =>
        parseFloat(order.gross_price ?? order.price ?? 0) || 0;

    const getAppFee = (order, commissionRate) => {
        if (order.app_fee !== null && order.app_fee !== undefined) {
            return parseFloat(order.app_fee) || 0;
        }
        return getGrossPrice(order) * commissionRate;
    };

    const calculateFinancials = (orders, expenses) => {
        const { startToday, endToday } = getLocalDateRanges();
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const isResetToday = dailyResetDate === todayKey;
        const todayOrders = orders.filter((order) =>
            isWithinLocalRange(order.created_at, startToday, endToday)
        );
        const todayExpenses = expenses.filter((expense) =>
            isWithinLocalRange(expense.created_at, startToday, endToday)
        );
        const monthOrders = orders;
        const monthExpenses = expenses;
        const commissionRate = parseFloat(settings.defaultCommission) || 0;

        const sumValues = (items, key) =>
            items.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0);

        let todayIncome = todayOrders.reduce((sum, order) => sum + getGrossPrice(order), 0);
        const todayExpenseRaw = sumValues(todayExpenses, 'amount');
        const monthlyIncome = monthOrders.reduce((sum, order) => sum + getGrossPrice(order), 0);
        const monthlyExpense = sumValues(monthExpenses, 'amount');
        let todayPotongan = todayOrders.reduce(
            (sum, order) => sum + getAppFee(order, commissionRate),
            0
        );
        const monthlyPotongan = monthOrders.reduce(
            (sum, order) => sum + getAppFee(order, commissionRate),
            0
        );

        let todayExpense = todayExpenseRaw + todayPotongan;
        if (isResetToday) {
            todayIncome = 0;
            todayPotongan = 0;
            todayExpense = 0;
        }

        return {
            todayIncome,
            todayExpense,
            todayNet: todayIncome - todayExpense,
            monthlyIncome,
            monthlyExpense,
            monthlyNet: monthlyIncome - monthlyExpense - monthlyPotongan,
            monthlyPotongan,
            todayPotongan,
            todayExpenseRaw,
            monthOrders,
            monthExpenses
        };
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            if (!session?.user) {
                setLoading(false);
                return;
            }
            const userIdColumn = 'user_id';
            const { startMonth, endMonth } = getLocalDateRanges();
            const startMonthIso = toUtcIsoString(startMonth);
            const endMonthIso = toUtcIsoString(endMonth);

            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq(userIdColumn, session.user.id)
                .gte('created_at', startMonthIso)
                .lte('created_at', endMonthIso)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            console.log('Total Orders Fetched:', ordersData?.length ?? 0);

            const { data: expensesData, error: expensesError } = await supabase
                .from('expenses')
                .select('*')
                .eq(userIdColumn, session.user.id)
                .gte('created_at', startMonthIso)
                .lte('created_at', endMonthIso)
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
        const commissionRate = parseFloat(settings.defaultCommission) || 0;
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const isResetToday = dailyResetDate === todayKey;
        const {
            todayIncome,
            todayExpense,
            todayNet,
            monthlyIncome,
            monthlyExpense,
            monthlyNet,
            monthlyPotongan,
            todayPotongan,
            todayExpenseRaw,
            monthOrders,
            monthExpenses
        } = calculateFinancials(orders, expenses);

        setTodayRecap({
            income: todayIncome,
            expense: todayExpense,
            net: todayNet,
            appFee: todayPotongan,
            expenseRaw: todayExpenseRaw
        });
        
        // Kalkulasi Estimasi (Bensin & Potongan)
        const totalFuelCost = monthOrders.reduce((sum, order) => {
            const distance = parseFloat(order.distance) || 0;
            return sum + distance * (settings.fuelEfficiency || 0);
        }, 0);

        let efficiency = 0;
        if (monthlyIncome > 0) {
            efficiency = (monthlyNet / monthlyIncome) * 100;
        }

        setMetrics({
            grossIncome: monthlyIncome,
            actualExpenses: monthlyExpense,
            netCash: monthlyNet,
            efficiencyScore: efficiency,
            appFeeTotal: monthlyPotongan,
            fuelCostTotal: totalFuelCost,
            ordersCount: monthOrders.length,
            expensesCount: monthExpenses.length
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

        const chart = last7Days.map(day => {
            const dayOrders = monthOrders.filter((o) => {
                const orderDate = parseDate(o.created_at);
                return orderDate ? isSameDay(orderDate, day.date) : false;
            });
            const dayExpenses = monthExpenses.filter((e) => {
                const expenseDate = parseDate(e.created_at);
                return expenseDate ? isSameDay(expenseDate, day.date) : false;
            });
            const dailyIncome = dayOrders.reduce((s, o) => s + getGrossPrice(o), 0);
            const dailyAppFee = dayOrders.reduce(
                (s, o) => s + getAppFee(o, commissionRate),
                0
            );
            const dailyExpense = dayExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
            return { ...day, net: dailyIncome - dailyExpense - dailyAppFee };
        });
        const normalizedChart = chart.map((entry) =>
            isResetToday && isSameDay(entry.date, new Date()) ? { ...entry, net: 0 } : entry
        );
        setChartData(normalizedChart);

        const dailyRecap = monthOrders.reduce((acc, order) => {
            const orderDate = parseDate(order.created_at);
            if (!orderDate) return acc;
            const key = format(orderDate, 'yyyy-MM-dd');
            if (!acc[key]) {
                acc[key] = {
                    date: orderDate,
                    income: 0,
                    expense: 0
                };
            }
            acc[key].income += getGrossPrice(order);
            acc[key].expense += getAppFee(order, commissionRate);
            return acc;
        }, {});

        monthExpenses.forEach((expense) => {
            const expenseDate = parseDate(expense.created_at);
            if (!expenseDate) return;
            const key = format(expenseDate, 'yyyy-MM-dd');
            if (!dailyRecap[key]) {
                dailyRecap[key] = {
                    date: expenseDate,
                    income: 0,
                    expense: 0
                };
            }
            dailyRecap[key].expense += parseFloat(expense.amount) || 0;
        });
        if (isResetToday) {
            if (!dailyRecap[todayKey]) {
                dailyRecap[todayKey] = {
                    date: startOfDay(new Date()),
                    income: 0,
                    expense: 0
                };
            } else {
                dailyRecap[todayKey].income = 0;
                dailyRecap[todayKey].expense = 0;
            }
        }

        const dailyRecapList = Object.values(dailyRecap)
            .sort((a, b) => b.date - a.date)
            .map((item) => ({
                ...item,
                net: item.income - item.expense
            }));

        setDailyRecapData(dailyRecapList);

        const combined = [
            ...monthOrders.map(o => ({ ...o, type: 'income', displayAmount: getGrossPrice(o) })),
            ...monthExpenses.map(e => ({ ...e, type: 'expense', displayAmount: e.amount }))
        ].sort((a, b) => {
            const dateA = parseDate(a.created_at);
            const dateB = parseDate(b.created_at);
            return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
        });

        setTransactions(combined);
        setVisibleCount(pageSize);
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

    const requestDelete = (id, type) => {
        setDeleteTargetId(id);
        setDeleteTargetType(type);
    };

    const closeDeleteModal = () => {
        setDeleteTargetId(null);
        setDeleteTargetType(null);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId || !deleteTargetType) return;
        try {
            const table = deleteTargetType === 'income' ? 'orders' : 'expenses';
            const { error } = await supabase.from(table).delete().eq('id', deleteTargetId);
            if (error) throw error;
            await fetchData();
            closeDeleteModal();
            showToast('Data berhasil dihapus!', 'success');
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showToast('Terjadi kesalahan: ' + (error.message || 'Gagal menghapus transaksi.'), 'error');
        }
    };

    const handleUpdateOrder = async (updatedOrder) => {
        if (!updatedOrder.id) {
            showToast('Terjadi kesalahan: ID Order tidak ditemukan.', 'error');
            return;
        }

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    price: updatedOrder.price,
                    gross_price: updatedOrder.gross_price,
                    app_fee: updatedOrder.app_fee,
                    distance: updatedOrder.distance,
                    net_profit: updatedOrder.net_profit,
                    origin: updatedOrder.origin,
                    destination: updatedOrder.destination,
                    created_at: updatedOrder.created_at
                })
                .eq('id', updatedOrder.id)
                .select();

            if (error) throw error;

            await fetchData();

            setEditingOrder(null);
            showToast('Data berhasil disimpan!', 'success');
        } catch (error) {
            console.error('Gagal update:', error);
            showToast('Terjadi kesalahan: ' + (error.message || 'Terjadi kesalahan sistem'), 'error');
        }
    };

    const openResetModal = () => {
        setShowResetModal(true);
    };

    const closeResetModal = () => {
        setShowResetModal(false);
    };

    const confirmResetToday = async () => {
        if (!user?.id || typeof window === 'undefined') return;
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const storageKey = `dailyRecapReset:${user.id}`;
        window.localStorage.setItem(storageKey, todayKey);
        setDailyResetDate(todayKey);
        await fetchData();
        closeResetModal();
        showToast('Rekap harian hari ini sudah direset.', 'success');
    };

    const handleSaveExpense = async (expenseData) => {
        if (!user) {
            showToast('Terjadi kesalahan: Sesi habis. Silakan login ulang.', 'error');
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

            setShowExpenseModal(false);
            showToast('Data berhasil disimpan!', 'success');
        } catch (error) {
            console.error('Gagal simpan pengeluaran:', error);
            showToast('Terjadi kesalahan: ' + (error.message || JSON.stringify(error)), 'error');
        }
    };

    const insight = getInsight();
    const visibleTransactions = transactions.slice(0, visibleCount);
    const canLoadMore = visibleCount < transactions.length;
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const isResetToday = dailyResetDate === todayKey;
    const resetInsight = todayRecap.net >= 0
        ? 'Hari ini kamu masih positif. Pertahankan konsistensi!'
        : 'Hari ini masih minus. Evaluasi biaya dan target besok.';

    const handleLoadMore = () => {
        setVisibleCount((prev) => Math.min(prev + pageSize, transactions.length));
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
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-widest text-emerald-100 font-semibold">Rekap Hari Ini</span>
                        <button
                            type="button"
                            onClick={openResetModal}
                            disabled={isResetToday}
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                                isResetToday
                                    ? 'bg-white/20 text-white/60 cursor-not-allowed'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                        >
                            <RotateCcw size={12} />
                            {isResetToday ? 'Sudah direset' : 'Reset harian'}
                        </button>
                    </div>
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

                {/* --- REKAP HARIAN --- */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Rekap Harian Bulan Ini</h3>
                        <span className="text-xs text-gray-400">Arus kas per hari</span>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {dailyRecapData.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-sm">
                                Belum ada rekap harian.
                            </div>
                        ) : (
                            dailyRecapData.map((recap) => (
                                <div
                                    key={format(recap.date, 'yyyy-MM-dd')}
                                    className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3"
                                >
                                    <div>
                                        <p className="text-xs text-gray-400">
                                            {format(recap.date, 'EEEE, dd MMM', { locale: id })}
                                        </p>
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                            {format(recap.date, 'dd/MM/yyyy')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">
                                            Masuk: <span className="text-green-600">+{formatCurrency(recap.income)}</span>
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Keluar: <span className="text-red-500">-{formatCurrency(recap.expense)}</span>
                                        </p>
                                        <p className={`text-sm font-bold ${recap.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {recap.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(recap.net))}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
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
                        {visibleTransactions.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                Belum ada data hari ini.
                            </div>
                        ) : (
                            visibleTransactions.map((t) => (
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
                                                onClick={() => requestDelete(t.id, t.type)}
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
                    {canLoadMore && (
                        <div className="flex justify-center pt-4">
                            <button
                                type="button"
                                onClick={handleLoadMore}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                Muat lebih banyak
                            </button>
                        </div>
                    )}
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

            <AnimatePresence>
                {showResetModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeResetModal}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            onClick={(event) => event.stopPropagation()}
                            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100 dark:border-slate-700 dark:bg-slate-800"
                        >
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reset Rekap Hari Ini?</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {resetInsight}
                                </p>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                                    <p className="text-xs text-gray-400">Pemasukan</p>
                                    <p className="font-semibold text-green-600">Rp {formatCurrency(todayRecap.income)}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                                    <p className="text-xs text-gray-400">Potongan Aplikasi</p>
                                    <p className="font-semibold text-red-500">-Rp {formatCurrency(todayRecap.appFee)}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                                    <p className="text-xs text-gray-400">Pengeluaran Lain</p>
                                    <p className="font-semibold text-red-500">-Rp {formatCurrency(todayRecap.expenseRaw)}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                                    <p className="text-xs text-gray-400">Sisa Hari Ini</p>
                                    <p className={`font-semibold ${todayRecap.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        Rp {formatCurrency(todayRecap.net)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-xl bg-gray-50 dark:bg-slate-700/50 px-3 py-2 text-xs text-gray-500 dark:text-gray-300">
                                Reset hanya mengosongkan tampilan rekap harian. Data transaksi tetap aman.
                            </div>

                            <div className="mt-6 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={closeResetModal}
                                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmResetToday}
                                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
                                >
                                    Reset Rekap
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmationModal
                isOpen={Boolean(deleteTargetId)}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                title="Hapus Transaksi?"
                message="Apakah Anda yakin ingin menghapus data ini? Data tidak dapat dikembalikan."
                isDestructive={true}
            />
        </div>
    );
}
