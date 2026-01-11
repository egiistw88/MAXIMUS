import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProfitEngine from './components/ProfitEngine';
import RealMap from './components/RealMap';
import DailyRecap from './components/DailyRecap';
import BottomNavigation from './components/BottomNavigation';
import Toast from './components/Toast';

function App() {
    // Order History State
    const [orders, setOrders] = useState(() => {
        const saved = localStorage.getItem('maximus_orders');
        try {
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Toast State
    const [toast, setToast] = useState({ message: '', isVisible: false, type: 'success' });

    useEffect(() => {
        localStorage.setItem('maximus_orders', JSON.stringify(orders));
    }, [orders]);

    const handleAddOrder = (order) => {
        setOrders(prev => [order, ...prev]);
        setToast({
            message: `Order Saved: +${(order.netProfit).toLocaleString('id-ID')}`,
            isVisible: true,
            type: 'success'
        });
    };

    const handleClearHistory = () => {
        if (window.confirm('Hapus semua riwayat hari ini?')) {
            setOrders([]);
            setToast({
                message: 'Riwayat dibersihkan',
                isVisible: true,
                type: 'success'
            });
        }
    };

    const handleToastClose = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-maxim-bg text-maxim-dark font-sans pb-20">
                <Routes>
                    <Route
                        path="/"
                        element={<ProfitEngine onAccept={handleAddOrder} />}
                    />
                    <Route
                        path="/map"
                        element={<RealMap />}
                    />
                    <Route
                        path="/history"
                        element={<DailyRecap orders={orders} onClearHistory={handleClearHistory} />}
                    />
                </Routes>

                <BottomNavigation />

                <Toast
                    message={toast.message}
                    isVisible={toast.isVisible}
                    type={toast.type}
                    onClose={handleToastClose}
                />
            </div>
        </BrowserRouter>
    );
}

export default App;
