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
import ConfirmationModal from '../components/ConfirmationModal';
import EditOrderModal from '../components/EditOrderModal';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import SectionTitle from '../components/SectionTitle';

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
    const pageSize = 20;
    
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
        let isMounted = true;
        const fetchDataWithMountCheck = async () => {
            await fetchData(() => isMounted);
        };
        if (session) fetchDataWithMountCheck();
        return () => {
            isMounted = false;
        };
    }, [session, settings.defaultCommission, settings.fuelEfficiency]);

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

    const parseNumber = (value) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const getCommissionRate = (order) => {
        const storedRate = parseFloat(order.commission_rate);
        if (Number.isFinite(storedRate)) return storedRate;
        return parseFloat(settings.defaultCommission) || 0;
    };

    const getGrossPrice = (order) => {
        const storedGross = parseFloat(order.gross_price);
        if (Number.isFinite(storedGross)) return storedGross;
        const fallbackPrice = parseFloat(order.price);
        if (!Number.isFinite(fallbackPrice) || fallbackPrice <= 0) return 0;
        const rate = getCommissionRate(order);
        if (rate >= 0 && rate < 1) return fallbackPrice / (1 - rate);
        return fallbackPrice;
    };

    const getNetProfit = (order) => {
        const storedNet = parseFloat(order.net_profit);
        if (Number.isFinite(storedNet)) return storedNet;
        const fallbackPrice = parseFloat(order.price);
        if (Number.isFinite(fallbackPrice)) return fallbackPrice;
        const gross = getGrossPrice(order);
        const rate = getCommissionRate(order);
        return gross * (1 - rate);
    };

    const getAppFee = (order) => {
        const storedFee = parseFloat(order.app_fee);
        if (Number.isFinite(storedFee)) return storedFee;
        const legacyFee = parseFloat(order.fee);
        if (Number.isFinite(legacyFee)) return legacyFee;
        const gross = getGrossPrice(order);
        const rate = getCommissionRate(order);
        return gross * rate;
    };

    const getFuelCost = (order) => {
        const storedFuelCost = parseFloat(order.fuel_cost);
        if (Number.isFinite(storedFuelCost)) return storedFuelCost;
        const distance = parseFloat(order.distance);
        if (!Number.isFinite(distance)) return 0;
        const storedEfficiency = parseFloat(order.fuel_efficiency_at_time);
        const efficiency = Number.isFinite(storedEfficiency)
            ? storedEfficiency
            : parseFloat(settings.fuelEfficiency) || 0;
        return distance * efficiency;
    };

    const getUpdatedFinancials = (order) => {
        const grossFromOrder = parseFloat(order.gross_price);
        const fallbackGross = parseFloat(order.price);
        const grossPrice = Number.isFinite(grossFromOrder)
            ? grossFromOrder
            : Number.isFinite(fallbackGross)
                ? fallbackGross
                : 0;
        const commissionRate = Number.isFinite(parseFloat(order.commission_rate))
            ? parseFloat(order.commission_rate)
            : parseFloat(settings.defaultCommission) || 0;
        const appFee = grossPrice * commissionRate;
        const netProfit = grossPrice - appFee;

        return {
            grossPrice,
            commissionRate,
            appFee,
            netProfit
        };
    };

    const calculateFinancials = (orders, expenses) => {
        const { startToday, endToday } = getLocalDateRanges();
        const todayOrders = orders.filter((order) =>
            isWithinLocalRange(order.created_at, startToday, endToday)
        );
        const todayExpenses = expenses.filter((expense) =>
            isWithinLocalRange(expense.created_at, startToday, endToday)
        );
        const monthOrders = orders;
        const monthExpenses = expenses;
        const sumValues = (items, key) =>
            items.reduce((sum, item) => sum + parseNumber(item[key]), 0);
        const sumBy = (items, getter) =>
            items.reduce((sum, item) => sum + getter(item), 0);

        const todayNetProfit = sumBy(todayOrders, getNetProfit);
        const todayExpense = sumValues(todayExpenses, 'amount');
        const monthlyGross = sumBy(monthOrders, getGrossPrice);
        const monthlyNetProfit = sumBy(monthOrders, getNetProfit);
        const monthlyExpense = sumValues(monthExpenses, 'amount');
        const monthlyPotongan = sumBy(monthOrders, getAppFee);

        return {
            todayNetProfit,
            todayExpense,
            todayNet: todayNetProfit - todayExpense,
            monthlyGross,
            monthlyNetProfit,
            monthlyExpense,
            monthlyNet: monthlyNetProfit - monthlyExpense,
            monthlyPotongan,
            monthOrders,
            monthExpenses
        };
    };

    const fetchData = async (shouldUpdate = () => true) => {
        try {
            if (shouldUpdate()) setLoading(true);
            if (!session?.user) {
                if (shouldUpdate()) setLoading(false);
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

            processFinancials(ordersData || [], expensesData || [], shouldUpdate);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            if (shouldUpdate()) setLoading(false);
        }
    };

    const processFinancials = (orders, expenses, shouldUpdate = () => true) => {
        if (!shouldUpdate()) return;
        const {
            todayNetProfit,
            todayExpense,
            todayNet,
            monthlyGross,
            monthlyNetProfit,
            monthlyExpense,
            monthlyNet,
            monthlyPotongan,
            monthOrders,
            monthExpenses
        } = calculateFinancials(orders, expenses);

        if (shouldUpdate()) {
            setTodayRecap({
            income: todayNetProfit,
            expense: todayExpense,
            net: todayNet
            });
        }
        
        // Kalkulasi Estimasi (Bensin & Potongan)
        const totalFuelCost = monthOrders.reduce((sum, order) => sum + getFuelCost(order), 0);

        let efficiency = 0;
        if (monthlyGross > 0) {
            efficiency = (monthlyNetProfit / monthlyGross) * 100;
        }

        if (shouldUpdate()) {
            setMetrics({
            grossIncome: monthlyGross,
            actualExpenses: monthlyExpense,
            netCash: monthlyNet,
            efficiencyScore: efficiency,
            appFeeTotal: monthlyPotongan,
            fuelCostTotal: totalFuelCost,
            ordersCount: monthOrders.length,
            expensesCount: monthExpenses.length
            });
        }

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
            const dailyIncome = dayOrders.reduce((s, o) => s + getNetProfit(o), 0);
            const dailyExpense = dayExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
            return { ...day, net: dailyIncome - dailyExpense };
        });
        if (shouldUpdate()) setChartData(chart);

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
            acc[key].income += getNetProfit(order);
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

        const dailyRecapList = Object.values(dailyRecap)
            .sort((a, b) => b.date - a.date)
            .map((item) => ({
                ...item,
                net: item.income - item.expense
            }));

        if (shouldUpdate()) setDailyRecapData(dailyRecapList);

        const combined = [
            ...monthOrders.map(o => ({ ...o, type: 'income', displayAmount: getNetProfit(o) })),
            ...monthExpenses.map(e => ({ ...e, type: 'expense', displayAmount: e.amount }))
        ].sort((a, b) => {
            const dateA = parseDate(a.created_at);
            const dateB = parseDate(b.created_at);
            return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
        });

        if (shouldUpdate()) {
            setTransactions(combined);
            setVisibleCount(pageSize);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val);
    const formatTime = (iso) => {
        const parsed = iso ? parseISO(iso) : null;
        if (!parsed || !isValid(parsed)) return '--:--';
        return format(parsed, 'HH:mm');
    };

    const getInsight = () => {
        const score = metrics.efficiencyScore;
        if (metrics.grossIncome === 0) return { text: "Belum ada tarikan. Gas cari orderan!", color: "text-ui-muted" };
        if (score >= 70) return { text: "Mantap! Efisiensi keuangan sangat bagus.", color: "text-ui-success" };
        if (score >= 50) return { text: "Not bad. Coba kurangi pengeluaran kecil.", color: "text-ui-warning" };
        return { text: "Boros banget hari ini! Kurangi jajan kopi.", color: "text-ui-danger" };
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

        if (!updatedOrder.created_at) {
            showToast('Tanggal & waktu order tidak boleh kosong.', 'error');
            return;
        }

        const { grossPrice, commissionRate, appFee, netProfit } = getUpdatedFinancials(updatedOrder);

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    price: netProfit,
                    gross_price: grossPrice,
                    commission_rate: commissionRate,
                    app_fee: appFee,
                    net_profit: netProfit,
                    distance: updatedOrder.distance,
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
                    note: expenseData.note || '',
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

    const handleLoadMore = () => {
        setVisibleCount((prev) => Math.min(prev + pageSize, transactions.length));
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-ui-background pb-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ui-text"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-ui-background pb-24 relative">
            <div className="px-5 pt-6 pb-2">
                <h1 className="text-2xl font-bold text-ui-text font-display">Financial Board</h1>
                <SectionTitle className="text-[10px] tracking-[0.3em]">Liputan Keuangan Bulan Ini</SectionTitle>
            </div>

            {/* Insight Harian */}
            <Card className="mx-5 mb-4 p-3 flex items-center space-x-3">
                <div className={`p-2 rounded-full bg-opacity-10 ${insight.color.replace('text', 'bg')}`}>
                    <AlertCircle className={`w-5 h-5 ${insight.color}`} />
                </div>
                <p className={`text-sm font-medium ${insight.color}`}>
                    "{insight.text}"
                </p>
            </Card>

            <div className="flex-1 overflow-y-auto px-5 space-y-6">
                
                {/* --- KARTU REKAP HARIAN (SETORAN) --- */}
                <Card className="bg-gradient-to-br from-ui-success via-ui-primary to-ui-info p-5 text-ui-inverse border-ui-success/40 shadow-ui-lg">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap justify-between gap-4 text-sm font-semibold">
                            <span className="text-ui-inverse/80">
                                Pemasukan: <span className="text-ui-inverse">Rp {formatCurrency(todayRecap.income)}</span>
                            </span>
                            <span className="text-ui-inverse/70">
                                Pengeluaran: <span className="text-ui-inverse">Rp {formatCurrency(todayRecap.expense)}</span>
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <SectionTitle className="text-ui-inverse/70">Siap Setor / Sisa Hari Ini</SectionTitle>
                            <span className="text-3xl font-extrabold tracking-tight">
                                Rp {formatCurrency(todayRecap.net)}
                            </span>
                            {todayRecap.net < 0 && (
                                <span className="inline-block bg-ui-danger/20 px-2 py-1 rounded-ui-sm text-xs font-bold text-ui-inverse border border-ui-danger/40 w-fit">
                                    ⚠️ Minus (Pakai Modal)
                                </span>
                            )}
                        </div>
                    </div>
                </Card>

                {/* --- TOMBOL TAB STATISTIK --- */}
                <div className="grid grid-cols-3 gap-3">
                    <Card
                        className={`p-0 ${activeRecap === 'omzet'
                            ? 'border-ui-success/40 ring-1 ring-ui-success/20'
                            : ''}`}
                    >
                        <button
                            type="button"
                            onClick={() => setActiveRecap('omzet')}
                            className="flex h-full w-full flex-col justify-between p-3 text-left"
                        >
                            <div className="p-1.5 bg-ui-success/10 rounded-ui-sm w-fit">
                                <TrendingUp size={16} className="text-ui-success" />
                            </div>
                            <div>
                                <SectionTitle className="text-[10px] tracking-[0.25em]">Omzet (Gross)</SectionTitle>
                                <p className="text-sm font-bold text-ui-text truncate">
                                    {formatCurrency(metrics.grossIncome)}
                                </p>
                            </div>
                        </button>
                    </Card>

                    <Card
                        className={`p-0 ${activeRecap === 'pengeluaran'
                            ? 'border-ui-danger/40 ring-1 ring-ui-danger/20'
                            : ''}`}
                    >
                        <button
                            type="button"
                            onClick={() => setActiveRecap('pengeluaran')}
                            className="flex h-full w-full flex-col justify-between p-3 text-left"
                        >
                            <div className="p-1.5 bg-ui-danger/10 rounded-ui-sm w-fit">
                                <TrendingDown size={16} className="text-ui-danger" />
                            </div>
                            <div>
                                <SectionTitle className="text-[10px] tracking-[0.25em]">Pengeluaran</SectionTitle>
                                <p className="text-sm font-bold text-ui-text truncate">
                                    {formatCurrency(metrics.actualExpenses)}
                                </p>
                            </div>
                        </button>
                    </Card>

                    <Card
                        className={`p-0 bg-ui-inverse ${activeRecap === 'potongan'
                            ? 'border-ui-primary ring-1 ring-ui-primary/30'
                            : ''}`}
                    >
                        <button
                            type="button"
                            onClick={() => setActiveRecap('potongan')}
                            className="flex h-full w-full flex-col justify-between p-3 text-left text-ui-inverse"
                        >
                            <div className="p-1.5 bg-ui-primary/10 rounded-ui-sm w-fit">
                                <Wallet size={16} className="text-ui-primary" />
                            </div>
                            <div>
                                <SectionTitle className="text-[10px] tracking-[0.25em] text-ui-inverse/70">Potongan</SectionTitle>
                                <p className="text-sm font-bold text-ui-primary truncate">
                                    {formatCurrency(metrics.appFeeTotal + metrics.fuelCostTotal)}
                                </p>
                            </div>
                        </button>
                    </Card>
                </div>

                {/* --- DETAIL STATISTIK --- */}
                <Card className="p-4">
                    {activeRecap === 'omzet' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-ui-muted">Total Omzet (Gross) Bulan Ini</span>
                                <span className="font-bold text-ui-text">
                                    {formatCurrency(metrics.grossIncome)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-ui-muted">Jumlah Order</span>
                                <span className="font-semibold text-ui-text">
                                    {metrics.ordersCount} trip
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm border-t pt-2 border-ui-border/70">
                                <span className="text-ui-muted">Net Profit</span>
                                <span className="font-bold text-ui-success">
                                    {formatCurrency(metrics.netCash)}
                                </span>
                            </div>
                        </div>
                    )}

                    {activeRecap === 'pengeluaran' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-ui-muted">Total Pengeluaran</span>
                                <span className="font-bold text-ui-text">
                                    {formatCurrency(metrics.actualExpenses)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-ui-muted">Jumlah Transaksi</span>
                                <span className="font-semibold text-ui-text">
                                    {metrics.expensesCount} item
                                </span>
                            </div>
                        </div>
                    )}

                    {activeRecap === 'potongan' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-ui-muted">Estimasi Potongan Aplikasi</span>
                                <span className="font-semibold text-ui-danger">
                                    -{formatCurrency(metrics.appFeeTotal)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-ui-muted">Estimasi Bensin</span>
                                <span className="font-semibold text-ui-danger">
                                    -{formatCurrency(metrics.fuelCostTotal)}
                                </span>
                            </div>
                        </div>
                    )}
                </Card>

                {/* --- REKAP HARIAN --- */}
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <SectionTitle className="text-[10px] tracking-[0.25em]">Rekap Harian Bulan Ini</SectionTitle>
                        <span className="text-xs text-ui-muted">Arus kas per hari</span>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {dailyRecapData.length === 0 ? (
                            <div className="text-center py-6 text-ui-muted text-sm">
                                Belum ada rekap harian.
                            </div>
                        ) : (
                            dailyRecapData.map((recap) => (
                                <div
                                    key={format(recap.date, 'yyyy-MM-dd')}
                                    className="flex items-center justify-between rounded-ui-lg border border-ui-border px-4 py-3"
                                >
                                    <div>
                                        <p className="text-xs text-ui-muted">
                                            {format(recap.date, 'EEEE, dd MMM', { locale: id })}
                                        </p>
                                        <p className="text-sm font-semibold text-ui-text">
                                            {format(recap.date, 'dd/MM/yyyy')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-ui-muted">
                                            Masuk: <span className="text-ui-success">+{formatCurrency(recap.income)}</span>
                                        </p>
                                        <p className="text-xs text-ui-muted">
                                            Keluar: <span className="text-ui-danger">-{formatCurrency(recap.expense)}</span>
                                        </p>
                                        <p className={`text-sm font-bold ${recap.net >= 0 ? 'text-ui-success' : 'text-ui-danger'}`}>
                                            {recap.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(recap.net))}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* --- CHART 7 HARI --- */}
                <Card className="p-4">
                   <SectionTitle className="mb-4 text-[10px] tracking-[0.25em]">Tren 7 Hari Terakhir</SectionTitle>
                   <div className="h-40 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                           <XAxis 
                              dataKey="label" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 10, fill: 'var(--ui-color-muted)'}} 
                           />
                           <Tooltip 
                              cursor={{fill: 'transparent'}}
                              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                           />
                           <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.net >= 0 ? 'var(--ui-color-success)' : 'var(--ui-color-danger)'} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                   </div>
                </Card>

                {/* --- DAFTAR TRANSAKSI --- */}
                <div className="pb-10">
                    <SectionTitle className="mb-3 px-1 text-[10px] tracking-[0.25em]">Riwayat Transaksi</SectionTitle>
                    <div className="space-y-3">
                        {visibleTransactions.length === 0 ? (
                            <div className="text-center py-8 text-ui-muted text-sm">
                                Belum ada data hari ini.
                            </div>
                        ) : (
                            visibleTransactions.map((t) => (
                                <Card key={`${t.type}-${t.id}`} className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${
                                            t.type === 'income' 
                                            ? 'bg-ui-success/10 text-ui-success' 
                                            : 'bg-ui-danger/10 text-ui-danger'
                                        }`}>
                                            {t.type === 'income' ? <Plus size={18} /> : <Minus size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-ui-text text-sm">
                                                {t.type === 'income' ? 'Order Masuk' : (t.category || 'Pengeluaran')}
                                            </p>
                                            <p className="text-xs text-ui-muted">
                                                {formatTime(t.created_at)} • {t.type === 'income' ? `${t.distance || 0} km` : t.note || t.description || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold text-sm ${t.type === 'income' ? 'text-ui-success' : 'text-ui-danger'}`}>
                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.displayAmount)}
                                        </p>
                                        <div className="mt-1 flex items-center justify-end gap-2">
                                            {t.type === 'income' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingOrder(t)}
                                                    className="text-xs text-ui-muted hover:text-ui-primary flex items-center gap-1"
                                                >
                                                    <Edit2 size={12} /> Edit
                                                </button>
                                            )}
                                            <button 
                                                type="button"
                                                onClick={() => requestDelete(t.id, t.type)}
                                                className="text-xs text-ui-muted hover:text-ui-danger flex items-center gap-1"
                                            >
                                               <Trash2 size={12} /> Hapus
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                    {canLoadMore && (
                        <div className="flex justify-center pt-4">
                            <PrimaryButton
                                type="button"
                                onClick={handleLoadMore}
                                className="rounded-full bg-ui-surface px-4 py-2 text-sm font-semibold text-ui-text border border-ui-border shadow-none hover:bg-ui-surface-muted"
                            >
                                Muat lebih banyak
                            </PrimaryButton>
                        </div>
                    )}
                </div>
            </div>

            {/* Tombol Tambah Pengeluaran */}
            <div className="absolute bottom-6 right-5 z-20">
                <PrimaryButton
                    type="button"
                    onClick={() => setShowExpenseModal(true)}
                    className="bg-ui-danger hover:bg-ui-danger/90 text-ui-inverse p-4 rounded-full shadow-ui-lg transition-all active:scale-95 flex items-center gap-2"
                    aria-label="Tambah pengeluaran"
                >
                    <Minus size={24} />
                </PrimaryButton>
            </div>

            <ExpenseModal
                isOpen={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                onSave={handleSaveExpense}
                showToast={showToast}
            />

            <EditOrderModal
                isOpen={Boolean(editingOrder)}
                onClose={() => setEditingOrder(null)}
                order={editingOrder}
                onSave={handleUpdateOrder}
                showToast={showToast}
            />

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
