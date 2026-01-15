import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseConfigured, supabaseConfigError } from './lib/supabaseClient';
import Auth from './components/Auth';
import ProfitEngine from './components/ProfitEngine';
import RealMap from './components/RealMap';
import Riwayat from './pages/Riwayat';
import ProfileSettings from './components/ProfileSettings';
import BottomNavigation from './components/BottomNavigation';
import PageTransition from './components/PageTransition';
import ToastContainer from './components/ToastContainer';
import { ToastProvider, useToast } from './context/ToastContext';

function AnimatedRoutes({ showToast, session }) {
    const location = useLocation();

    return (
        <AnimatePresence mode="sync">
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

function AppShell({ showToast, session }) {
    return (
        <div
            className="bg-maxim-bg text-maxim-dark font-sans"
            style={{
                '--bottom-nav-height': '64px',
                minHeight: '100dvh',
                paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))'
            }}
        >
            <main className="relative z-0">
                <AnimatedRoutes showToast={showToast} session={session} />
            </main>

            <BottomNavigation />
        </div>
    );
}

function AppContent({ session, loading }) {
    const { showToast } = useToast();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-maxim-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maxim-dark"></div>
            </div>
        );
    }

    if (!isSupabaseConfigured) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-maxim-bg p-6">
                <div className="w-full max-w-lg rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-center text-yellow-900 shadow-sm">
                    <h1 className="text-xl font-semibold mb-2">Konfigurasi Supabase belum lengkap</h1>
                    <p className="text-sm text-yellow-800">
                        {supabaseConfigError ||
                            'Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env agar autentikasi aktif.'}
                    </p>
                </div>
            </div>
        );
    }

    if (!session) {
        return <Auth />;
    }

    return (
        <BrowserRouter>
            <AppShell showToast={showToast} session={session} />
        </BrowserRouter>
    );
}

function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

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

    return (
        <ToastProvider>
            <ToastContainer />
            <AppContent session={session} loading={loading} />
        </ToastProvider>
    );
}

export default App;
