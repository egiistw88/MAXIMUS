import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import L from 'leaflet';
/*
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;
*/

const BANDUNG_CENTER = [-6.9175, 107.6191];

const ZONES = [
    {
        id: 'pasteur',
        name: 'Pasteur (Macet)',
        coords: [-6.8944, 107.5900],
        radius: 800,
        color: '#EF4444',
    },
    {
        id: 'dago',
        name: 'Dago Atas',
        coords: [-6.8700, 107.6300],
        radius: 1000,
        color: '#EAB308',
    },
    {
        id: 'batununggal',
        name: 'Batununggal',
        coords: [-6.9500, 107.6400],
        radius: 1200,
        color: '#22C55E',
    }
];

export default function RealMap() {
    const [userPos, setUserPos] = useState(BANDUNG_CENTER);

    useEffect(() => {
        const interval = setInterval(() => {
            setUserPos(prev => [
                prev[0] + (Math.random() - 0.5) * 0.0005,
                prev[1] + (Math.random() - 0.5) * 0.0005
            ]);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-[calc(100vh-64px)] z-0">
            {/* Info overlay */}
            <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lokasi Anda</p>
                <p className="text-sm font-semibold text-maxim-dark">Bandung Tengah</p>
            </div>

            <MapContainer
                center={BANDUNG_CENTER}
                zoom={13}
                zoomControl={false}
                scrollWheelZoom={true}
                className="w-full h-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={userPos}>
                    <Popup>
                        <span className="text-xs font-semibold">Posisi Anda</span>
                    </Popup>
                </Marker>

                {ZONES.map(zone => (
                    <Circle
                        key={zone.id}
                        center={zone.coords}
                        radius={zone.radius}
                        pathOptions={{
                            color: zone.color,
                            fillColor: zone.color,
                            fillOpacity: 0.2,
                            weight: 2
                        }}
                    >
                        <Popup>
                            <span className="text-xs font-semibold">{zone.name}</span>
                        </Popup>
                    </Circle>
                ))}
            </MapContainer>
        </div>
    );
}
