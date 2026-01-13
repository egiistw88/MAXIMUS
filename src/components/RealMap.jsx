import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';

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

export default function RealMap() {
    const { settings } = useSettings();
    const [strategicSpots, setStrategicSpots] = useState([]);
    const [currentRecommendation, setCurrentRecommendation] = useState(null);
    const [userPos, setUserPos] = useState(null);

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
                console.error('Unexpected error:', err);
            }
        };

        fetchSpots();
    }, []);

    // 1b. Real Geolocation
    useEffect(() => {
        if (!navigator.geolocation) {
            setUserPos(BANDUNG_CENTER);
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setUserPos([position.coords.latitude, position.coords.longitude]);
            },
            (error) => {
                console.error('Geolocation error:', error);
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
        const updateRecommendation = () => {
            const currentHour = new Date().getHours();

            const activeSpots = strategicSpots.filter(spot => {
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

                const lat = spot.latitude ?? spot.lat;
                const lng = spot.longitude ?? spot.lng;

                setCurrentRecommendation({
                    isFree: false,
                    title: `🔥 HOT SPOT JAM ${currentHour}:00`,
                    subtitle: userPos
                        ? `Geser ke ${spot.name}. Strategi: ${spot.notes || 'Standby.'}`
                        : 'Rekomendasi terdekat menunggu lokasi aktif.',
                    lat,
                    lng
                });
            } else {
                setCurrentRecommendation({
                    isFree: true,
                    title: '☕ Mode Bebas / Ngetem Santai',
                    subtitle: 'Belum ada rotasi terjadwal. Cek area perumahan.'
                });
            }
        };

        const timer = setInterval(updateRecommendation, 60000);
        updateRecommendation();

        return () => clearInterval(timer);
    }, [strategicSpots, userPos]);

    return (
        <div
            className="z-0"
            style={{ height: 'calc(100vh - 80px)', width: '100%', position: 'relative' }}
        >
            {/* UI Overlay di luar MapContainer */}
            <div className="absolute inset-0 z-[1000] pointer-events-none">
                <StrategyCard recommendation={currentRecommendation} />
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
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                    }
                />

                {/* RecenterFab WAJIB DI SINI (Di dalam MapContainer) */}
                <RecenterFab userPos={userPos} />

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
                    const lat = spot.latitude ?? spot.lat;
                    const lng = spot.longitude ?? spot.lng;

                    if (lat == null || lng == null) return null;

                    const currentHour = new Date().getHours();
                    const isActive = (spot.start_hour !== undefined && spot.end_hour !== undefined)
                        && (spot.start_hour <= currentHour && spot.end_hour > currentHour);

                    const icon = isActive ? activeStrategyIcon : inactiveStrategyIcon;

                    return (
                        <Marker
                            key={spot.id}
                            position={[lat, lng]}
                            icon={icon}
                            zIndexOffset={isActive ? 1000 : 0}
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
