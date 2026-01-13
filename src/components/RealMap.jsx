import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { supabase } from '../lib/supabaseClient';
import { useSettings } from '../context/SettingsContext';

// --- Leaflet Icon Fix ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// --- Custom Icons ---

// 1. User Position (Blue Pulse)
const userIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="user-marker-pulse"></div><div class="user-marker-dot"></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -10]
});

// 2. Active Strategy Spot (Yellow Pulse + Glow)
const activeStrategyIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="active-strategy-ring"></div><div class="active-strategy-pin"></div>`,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -10]
});

// 3. Inactive/Normal Spot (Small Gray Dot)
const inactiveStrategyIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #94a3b8; width: 12px; height: 12px; border-radius: 50%; opacity: 0.6; border: 1px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -5]
});


const BANDUNG_CENTER = [-6.9175, 107.6191];

// --- Sub-components for Overlay UI ---

function RecenterFab({ userPos }) {
    const map = useMap();

    const handleRecenter = () => {
        if (userPos) {
            map.flyTo(userPos, 15, {
                animate: true,
                duration: 1.5
            });
        }
    };

    return (
        <button
            onClick={handleRecenter}
            className="absolute bottom-28 right-4 w-12 h-12 bg-white text-slate-900 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>
    );
}

function StrategyCard({ recommendation }) {
    if (!recommendation) return null;

    const navUrl = recommendation.lat != null && recommendation.lng != null
        ? `https://www.google.com/maps/dir/?api=1&destination=${recommendation.lat},${recommendation.lng}`
        : '#';

    return (
        <div className="absolute bottom-6 left-4 right-20 mx-auto max-w-sm pointer-events-auto">
            <div className="backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl p-4 border-l-4 border-l-yellow-400">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1 font-outfit">
                            {recommendation.title}
                        </h3>
                        <p className="text-sm text-slate-600 font-medium leading-snug">
                            {recommendation.subtitle}
                        </p>
                    </div>
                </div>

                {!recommendation.isFree && (
                    <a
                        href={navUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 block w-full bg-slate-900 text-white text-center py-2 rounded-lg font-bold text-sm active:scale-95 transition-transform"
                    >
                        🚀 NAVIGASI
                    </a>
                )}
            </div>
        </div>
    );
}

// --- Main Map Component ---

export default function RealMap() {
    const { settings } = useSettings();
    const [strategicSpots, setStrategicSpots] = useState([]);
    const [currentRecommendation, setCurrentRecommendation] = useState(null);
    const [userPos, setUserPos] = useState(null);
    const [geoStatus, setGeoStatus] = useState('idle');
    const [isLoading, setIsLoading] = useState(true);
    const simulationIntervalRef = useRef(null);
    const watchIdRef = useRef(null);
    const hasRealPositionRef = useRef(false);

    const stopSimulation = () => {
        if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
        }
    };

    const startSimulation = () => {
        if (simulationIntervalRef.current) return;

        setUserPos(prev => prev || BANDUNG_CENTER);

        simulationIntervalRef.current = setInterval(() => {
            setUserPos(prev => {
                if (!prev) return BANDUNG_CENTER;
                return [
                    prev[0] + (Math.random() - 0.5) * 0.0002,
                    prev[1] + (Math.random() - 0.5) * 0.0002
                ];
            });
        }, 5000);
    };

    // 1. Fetch Data
    useEffect(() => {
        const fetchSpots = async () => {
            try {
                const { data, error } = await supabase
                    .from('strategic_spots')
                    .select('*');

                if (error) {
                    console.error('Error fetching spots:', error);
                } else {
                    setStrategicSpots(data || []);
                }
            } catch (err) {
                console.error("Unexpected error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSpots();
    }, []);

    // 1b. Real Geolocation
    useEffect(() => {
        if (!navigator.geolocation) {
            setGeoStatus('unsupported');
            setUserPos(BANDUNG_CENTER);
            return;
        }

        setGeoStatus('requesting');
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setUserPos([position.coords.latitude, position.coords.longitude]);
                setGeoStatus('ready');
            },
            (error) => {
                console.error('Geolocation error:', error);
                setGeoStatus('error');
                setUserPos(BANDUNG_CENTER);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 10000
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    const toRad = (value) => (value * Math.PI) / 180;

    const getDistanceKm = (from, to) => {
        const [lat1, lng1] = from;
        const [lat2, lng2] = to;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2
            + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371 * c;
    };

    // 2. "The Brain" - Live Recommendation Logic
    useEffect(() => {
        // Run logic immediately when spots change or periodically
        const updateRecommendation = () => {
            // if (!strategicSpots.length) return; // Allow running even if empty to show "Free Mode"

            const currentHour = new Date().getHours();

            // Filter for ACTIVE spots
            const activeSpots = strategicSpots.filter(spot => {
                // Safety check for hours
                if (spot.start_hour === undefined || spot.end_hour === undefined) return false;
                return spot.start_hour <= currentHour && spot.end_hour > currentHour;
            });

            if (activeSpots.length > 0) {
                const spot = activeSpots
                    .map((candidate) => {
                        const lat = candidate.latitude ?? candidate.lat;
                        const lng = candidate.longitude ?? candidate.lng;
                        if (lat == null || lng == null || !userPos) return null;
                        return {
                            spot: candidate,
                            distanceKm: getDistanceKm(userPos, [lat, lng])
                        };
                    })
                    .filter(Boolean)
                    .sort((a, b) => a.distanceKm - b.distanceKm)[0]?.spot || activeSpots[0];

                // robustly get lat/lng
                const lat = spot.latitude ?? spot.lat;
                const lng = spot.longitude ?? spot.lng;

                setCurrentRecommendation({
                    isFree: false,
                    title: `🔥 HOT SPOT JAM ${currentHour}:00`,
                    subtitle: userPos
                        ? `Geser ke ${spot.name}. Strategi: ${spot.notes || 'Standby.'}`
                        : `Rekomendasi terdekat menunggu lokasi aktif.`,
                    lat,
                    lng
                });
            } else {
                setCurrentRecommendation({
                    isFree: true,
                    title: `☕ Mode Bebas / Ngetem Santai`,
                    subtitle: "Belum ada rotasi terjadwal. Cek area perumahan."
                });
            }
        };

        const timer = setInterval(updateRecommendation, 60000);
        if (!isLoading) updateRecommendation();

        return () => clearInterval(timer);
    }, [strategicSpots, isLoading, userPos]);

    if (isLoading) {
        return (
            <div
                className="flex items-center justify-center bg-slate-50"
                style={{ height: 'calc(100vh - 80px)', width: '100%', position: 'relative' }}
            >
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-t-blue-600 border-slate-200 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="font-outfit text-slate-600 font-bold animate-pulse">Memuat Peta Strategis...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="z-0"
            style={{ height: 'calc(100vh - 80px)', width: '100%', position: 'relative' }}
        >
            <div className="absolute inset-0 z-[1000] pointer-events-none">
                <StrategyCard recommendation={currentRecommendation} />
                <RecenterFab userPos={userPos} />
            </div>

            <MapContainer
                center={BANDUNG_CENTER}
                zoom={13}
                zoomControl={false}
                scrollWheelZoom={true}
                className="z-[1]"
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url={settings.darkMode
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    }
                />

                {/* User Position */}
                {userPos && (
                    <Marker position={userPos} icon={userIcon}>
                        <Popup>
                            <span className="font-bold text-blue-600">Posisi Anda</span>
                        </Popup>
                    </Marker>
                )}

                {/* Strategic Spots */}
                {strategicSpots.map((spot) => {
                    // 1. Safety Guard
                    const lat = spot.latitude ?? spot.lat;
                    const lng = spot.longitude ?? spot.lng;

                    if (lat == null || lng == null) return null;

                    // 2. Determine State (Active vs Inactive)
                    const currentHour = new Date().getHours();
                    const isActive = (spot.start_hour !== undefined && spot.end_hour !== undefined)
                        && (spot.start_hour <= currentHour && spot.end_hour > currentHour);

                    const icon = isActive ? activeStrategyIcon : inactiveStrategyIcon;

                    return (
                        <Marker
                            key={spot.id}
                            position={[lat, lng]}
                            icon={icon}
                            zIndexOffset={isActive ? 1000 : 0} // Active always on top
                        >
                            <Popup className="custom-popup" closeButton={false}>
                                <div className="p-1 min-w-[200px]">
                                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isActive ? 'text-yellow-600' : 'text-slate-400'}`}>
                                        {isActive ? '🔥 ACTIVE NOW' : 'INACTIVE'}
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-900 mb-1">{spot.name}</h3>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono font-bold text-slate-600 border border-slate-200">
                                            {spot.start_hour}:00 - {spot.end_hour}:00
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-snug bg-slate-50 p-2 rounded border border-slate-100 italic">
                                        "{spot.notes}"
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

            </MapContainer>
        </div>
    );
}
