import { useState, useEffect } from 'react';

export default function Header({ isGhostMode, onGhostToggle, showInstallButton, onInstallClick, dailyTotal }) {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Format time for the "Realtime" clock in HUD
    const formatTime = (date) => {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex items-center justify-between p-4 pt-6 bg-background-dark/90 backdrop-blur-md sticky top-0 z-40 border-b border-white/10">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl animate-pulse">radar</span>
                <h2 className="text-white text-base font-bold tracking-[0.15em] leading-none">
                    MAXIMUS <span className="text-primary font-normal text-xs align-top">PILOT v2.4</span>
                </h2>
            </div>
            <div className="flex items-center gap-2">
                {/* Daily Total Display */}
                <div className="text-right mr-1">
                    <p className="text-[10px] text-gray-400 font-mono">DAILY NET</p>
                    <p className="text-xl font-bold text-primary leading-none tracking-tighter">
                        {(dailyTotal / 1000).toFixed(1)}k
                    </p>
                </div>

                {/* PWA Install Button - only shows when installable */}
                {showInstallButton && (
                    <button
                        onClick={onInstallClick}
                        className="relative group flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/30 active:bg-primary/20 transition-all hover:scale-105"
                        title="Install MAXIMUS"
                    >
                        <span
                            className="material-symbols-outlined text-primary transition-colors"
                            style={{ fontSize: '20px' }}
                        >
                            download
                        </span>
                        {/* Pulsing indicator */}
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping"></div>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></div>
                    </button>
                )}

                {/* Ghost Mode Button */}
                <button
                    onClick={onGhostToggle}
                    className="relative group flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
                >
                    <span
                        className={`material-symbols-outlined transition-colors ${isGhostMode ? 'text-hud-red' : 'text-white/50 group-hover:text-white'
                            }`}
                        style={{ fontSize: '20px' }}
                    >
                        skull
                    </span>
                    <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${isGhostMode ? 'bg-hud-red' : 'bg-primary'
                        } animate-ping`}></div>
                    <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${isGhostMode ? 'bg-hud-red' : 'bg-primary'
                        }`}></div>
                </button>
            </div>
        </div>
    );
}
