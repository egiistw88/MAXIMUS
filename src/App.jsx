import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabaseClient';
import Auth from './components/Auth';
import ProfitEngine from './components/ProfitEngine';
import RealMap from './components/RealMap';
import Riwayat from './pages/Riwayat';
import ProfileSettings from './components/ProfileSettings';
import BottomNavigation from './components/BottomNavigation';
import Toast from './components/Toast';
import PageTransition from './components/PageTransition';

function AnimatedRoutes({ showToast, session }) {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route
                    path="/"
                    element={
                        <PageTransition>
                            <ProfitEngine showToast={showToast} session={session} />
                        </PageTransition>
                    }
                />
                <Route
                    path="/map"
                    element={
                        <PageTransition>
                            <RealMap />
                        </PageTransition>
                    }
                />
                <Route
                    path="/history"
                    element={
                        <PageTransition>
                            <Riwayat showToast={showToast} session={session} />
                        </PageTransition>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <PageTransition>
                            <ProfileSettings showToast={showToast} session={session} />
                        </PageTransition>
                    }
                />
            </Routes>
        </AnimatePresence>
    );
}

function App() {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    // Toast State (Global UI state)
    const [toast, setToast] = useState({ message: '', isVisible: false, type: 'success' });

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const showToast = (message, type = 'success') => {
        setToast({ message, isVisible: true, type });
    };

    const handleToastClose = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-maxim-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maxim-dark"></div>
            </div>
        )
    }

    if (!session) {
        return <Auth />
    }

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-maxim-bg text-maxim-dark font-sans pb-20">
                <AnimatedRoutes showToast={showToast} session={session} />

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
