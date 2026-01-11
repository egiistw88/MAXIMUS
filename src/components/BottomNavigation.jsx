import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calculator, Map, History } from 'lucide-react';

const BottomNavigation = () => {
    const navItems = [
        { path: '/', label: 'Hitung', icon: Calculator },
        { path: '/map', label: 'Peta', icon: Map },
        { path: '/history', label: 'Riwayat', icon: History },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${isActive ? 'text-maxim-dark' : 'text-gray-400 hover:text-gray-600'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-1.5 rounded-xl ${isActive ? 'bg-maxim-yellow' : 'bg-transparent'}`}>
                                    <item.icon className={`w-6 h-6 ${isActive ? 'text-maxim-dark' : 'currentColor'}`} strokeWidth={2} />
                                </div>
                                <span className="text-xs font-medium">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomNavigation;
