import { NavLink } from 'react-router-dom';
import { Calculator, History, Map, Menu, User, X } from 'lucide-react';

const navItems = [
    { path: '/', label: 'Hitung', icon: Calculator },
    { path: '/map', label: 'Peta', icon: Map },
    { path: '/history', label: 'Riwayat', icon: History },
    { path: '/profile', label: 'Profil', icon: User }
];

const MapNavigationDrawer = ({ isOpen, onToggle, onClose }) => {
    return (
        <>
            <button
                type="button"
                onClick={onToggle}
                className="fixed right-4 top-4 z-[11000] inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg transition hover:bg-white"
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            >
                {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                Menu
            </button>

            <div
                className={`fixed inset-0 z-[10900] bg-black/30 transition-opacity ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                onClick={onClose}
                aria-hidden={!isOpen}
            />

            <aside
                className={`fixed right-0 top-0 z-[10950] h-full w-72 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
                aria-hidden={!isOpen}
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <span className="text-sm font-semibold text-slate-700">Navigasi</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                        aria-label="Tutup menu"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <nav className="flex flex-col gap-1 px-3 py-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                                    isActive
                                        ? 'bg-ui-primary text-ui-text'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`
                            }
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
};

export default MapNavigationDrawer;
