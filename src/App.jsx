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
            className="bg-ui-background text-ui-text font-sans"
            style={{
                '--bottom-nav-height': '64px',
                '--bottom-nav-offset': 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))',
                minHeight: 'calc(100dvh - var(--bottom-nav-offset))',
                paddingBottom: 'var(--bottom-nav-offset)'
            }}
        >
            <main className="relative z-0 min-h-[calc(100dvh-var(--bottom-nav-offset))]">
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
            <div className="flex items-center justify-center min-h-screen bg-ui-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ui-text"></div>
            </div>
        );
    }

    if (!isSupabaseConfigured) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-ui-background p-6">
                <div className="w-full max-w-lg rounded-ui-xl border border-ui-warning/40 bg-ui-warning/10 p-6 text-center text-ui-warning shadow-ui-sm">
                    <h1 className="text-xl font-semibold mb-2 text-ui-text">Konfigurasi Supabase belum lengkap</h1>
                    <p className="text-sm text-ui-warning">
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
