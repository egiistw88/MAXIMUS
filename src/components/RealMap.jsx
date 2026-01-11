
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom User Icon (Blue Dot)
const userIcon = new L.DivIcon({
    className: 'custom-user-icon',
    html: `<div style="
        width: 16px;
        height: 16px;
        background-color: #3b82f6;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

const BANDUNG_CENTER = [-6.9175, 107.6191];

const ZONES = [
    {
        id: 'pasteur',
        name: 'PASTEUR - TRAFFIC TRAP',
        coords: [-6.8944, 107.5900], // Approx Pasteur
        radius: 800,
        color: '#ef4444', // Red
        alert: {
            icon: 'warning',
            title: 'PASTEUR - MACET TOTAL',
            description: 'Hindari Pasteur. Macet parah di gerbang tol. Potensi order kilat tapi waktu tempuh lama.',
            color: 'red'
        }
    },
    {
        id: 'dago',
        name: 'DAGO ATAS - HILLY',
        coords: [-6.8700, 107.6300], // Approx Dago
        radius: 1000,
        color: '#eab308', // Yellow
        alert: {
            icon: 'terrain',
            title: 'DAGO ATAS - TANJAKAN',
            description: 'Area Dago Atas. Siapkan torsi mesin. Banyak order resto fancy. Tips biasanya besar.',
            color: 'yellow'
        }
    },
    {
        id: 'batununggal',
        name: 'BATUNUNGGAL - HIGH VALUE',
        coords: [-6.9500, 107.6400], // Approx Batununggal
        radius: 1200,
        color: '#22c55e', // Green
        alert: {
            icon: 'payments',
            title: 'BATUNUNGGAL - GACOR',
            description: 'Area perumahan elit. Order jarak jauh (Long Trip) sering muncul. Food & Shop ramai.',
            color: 'green'
        }
    }
];

export default function RealMap({ onZoneClick }) {
    const [userPos, setUserPos] = useState(BANDUNG_CENTER);

    // Simulate user movement slightly
    useEffect(() => {
        const interval = setInterval(() => {
            setUserPos(prev => [
                prev[0] + (Math.random() - 0.5) * 0.001,
                prev[1] + (Math.random() - 0.5) * 0.001
            ]);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-[320px] bg-black/90 border-t border-b border-primary/20 overflow-hidden group">
            <div className="absolute top-2 left-2 z-[400] bg-black/80 px-2 py-1 border border-primary/30 rounded">
                <p className="text-[10px] text-primary font-mono tracking-widest animate-pulse">GVA RADAR ACTIVE</p>
            </div>

            <MapContainer
                center={BANDUNG_CENTER}
                zoom={13}
                scrollWheelZoom={false}
                zoomControl={false}
                attributionControl={false}
                className="w-full h-full z-0"
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Simulated User Marker */}
                <Marker position={userPos} icon={userIcon}>
                    <Popup className="custom-popup">
                        <span className="text-xs font-bold font-mono">DRIVER STATUS: ACTIVE</span>
                    </Popup>
                </Marker>

                {/* Logic Zones */}
                {ZONES.map(zone => (
                    <Circle
                        key={zone.id}
                        center={zone.coords}
                        radius={zone.radius}
                        pathOptions={{
                            color: zone.color,
                            fillColor: zone.color,
                            fillOpacity: 0.3,
                            weight: 1
                        }}
                        eventHandlers={{
                            click: () => onZoneClick(zone.alert)
                        }}
                    >
                        <Popup>
                            <div className="text-center">
                                <h3 className="font-bold text-xs" style={{ color: zone.color }}>{zone.name}</h3>
                                <p className="text-[10px] text-gray-400">Tap to analyze</p>
                            </div>
                        </Popup>
                    </Circle>
                ))}
            </MapContainer>

            {/* Overlay Grid/Scanlines for aesthetic */}
            <div className="absolute inset-0 pointer-events-none z-[400] bg-[url('https://transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute inset-0 pointer-events-none border-x border-primary/10"></div>
        </div>
    );
}
