import { useState, useEffect } from 'react';
import Header from './components/Header';
import ProfitEngine from './components/ProfitEngine';
import RealMap from './components/RealMap';
import AlertCard from './components/AlertCard';
import StatusFooter from './components/StatusFooter';
import Toast from './components/Toast';

const MAP_IMAGE_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBJlsu2haSalp44BYCkhXHd-i4seT8hRRlUhSOGG315V0TUF6sRHgb0zH4kLB6I9qAC49RPK14LnmuaCLMUp1axTowodolLqtJ91zedxRjELToXN4BC1V88mwEdF3DtaUlPwPFPpdkMHonBv4xNdgA8hBSOuYU3UCA8oDdlx4mb8yHJ9NpXEtKIKLq9C2XgVsNFkJIVhP33N0XYQnS8MBwC48uBFMgFKPQ5dmkC8ZBdaoVUpx3aH0-iWNBhKVtZiXnABD6IGit8ATM';

const DEFAULT_ALERT = {
    icon: 'rainy',
    title: 'HUJAN DI LEMBANG',
    description: 'Potensi order Food&Shop naik 200%. Geser ke Utara?',
    color: 'blue'
};

function App() {
    // Ghost Mode state
    const [isGhostMode, setIsGhostMode] = useState(false);

    // Profit Engine state
    const [dailyGross] = useState(165000);
    const [fuelCost] = useState(15000);
    const [serviceCost] = useState(7500);

    // Alert state
    const [currentAlert, setCurrentAlert] = useState(DEFAULT_ALERT);

    // Driver status state
    const [oilLevel] = useState(75);
    const [driverEnergy, setDriverEnergy] = useState(30);

    // Toast state
    const [toast, setToast] = useState({ message: '', isVisible: false, type: 'success' });

    // PWA Install Prompt state
    const [installPrompt, setInstallPrompt] = useState(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    // Listen for beforeinstallprompt event
    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            setInstallPrompt(e);
            // Show the install button
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if app is already installed
        window.addEventListener('appinstalled', () => {
            setShowInstallButton(false);
            setInstallPrompt(null);
            setToast({
                message: '✅ MAXIMUS installed successfully!',
                isVisible: true,
                type: 'success'
            });
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!installPrompt) return;

        // Show the install prompt
        installPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await installPrompt.userChoice;

        if (outcome === 'accepted') {
            setToast({
                message: '📲 Installing MAXIMUS PILOT...',
                isVisible: true,
                type: 'success'
            });
        }

        // Clear the prompt
        setInstallPrompt(null);
    };

    const handleGhostToggle = () => {
        const newState = !isGhostMode;
        setIsGhostMode(newState);
        setToast({
            message: newState
                ? '👻 STEALTH MODE ACTIVATED: You are invisible to community groups.'
                : '👁️ STEALTH MODE DEACTIVATED: You are now visible.',
            isVisible: true,
            type: newState ? 'warning' : 'success'
        });
    };

    const handleZoneClick = (alert) => {
        setCurrentAlert(alert);
    };

    const handleDismissAlert = () => {
        setCurrentAlert(DEFAULT_ALERT);
    };

    const handleSetRoute = () => {
        setToast({
            message: `🗺️ ROUTE SET: Navigating to ${currentAlert.title.split(' - ')[0]}`,
            isVisible: true,
            type: 'success'
        });
    };

    const handleToastClose = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    return (
        <>
            {/* Main Container */}
            <div className="relative flex h-screen w-full flex-col max-w-md mx-auto border-x border-white/10 shadow-2xl overflow-y-auto hide-scrollbar">
                {/* Scanline Overlay for Texture */}
                <div className="scanline fixed inset-0 z-50 pointer-events-none opacity-20" />

                {/* Header with Ghost Mode */}
                <Header
                    isGhostMode={isGhostMode}
                    onGhostToggle={handleGhostToggle}
                    showInstallButton={showInstallButton}
                    onInstallClick={handleInstallClick}
                />

                {/* Profit Reality Engine */}
                <ProfitEngine
                    dailyGross={dailyGross}
                    fuelCost={fuelCost}
                    serviceCost={serviceCost}
                />

                {/* GVA Radar (Real Map) */}
                <RealMap onZoneClick={handleZoneClick} />

                {/* Contextual Alert Card */}
                <AlertCard
                    alert={currentAlert}
                    onDismiss={handleDismissAlert}
                    onSetRoute={handleSetRoute}
                />

                {/* Footer: Machine & Body Status */}
                <StatusFooter
                    oilLevel={oilLevel}
                    driverEnergy={driverEnergy}
                    setDriverEnergy={setDriverEnergy}
                />
            </div>

            {/* Toast Notification */}
            <Toast
                message={toast.message}
                isVisible={toast.isVisible}
                type={toast.type}
                onClose={handleToastClose}
            />
        </>
    );
}

export default App;
