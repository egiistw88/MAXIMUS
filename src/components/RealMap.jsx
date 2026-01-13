import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';

// --- Leaflet Icon Fix ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const BANDUNG_CENTER = [-6.9175, 107.6191];

export default function RealMap() {
    return (
        <div
            className="z-0"
            style={{
                height: 'calc(100vh - 80px)',
                width: '100%',
                position: 'relative',
                border: '5px solid red',
                background: 'pink'
            }}
        >
            <h1>TESTING MAP RENDER</h1>

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
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
            </MapContainer>
        </div>
    );
}
