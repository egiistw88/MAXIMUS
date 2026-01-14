import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calculator, Map, History, User } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNavigation = () => {
    const navItems = [
        { path: '/', label: 'Hitung', icon: Calculator },
        { path: '/map', label: 'Peta', icon: Map },
        { path: '/history', label: 'Riwayat', icon: History },
        { path: '/profile', label: 'Profil', icon: User },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-[9999] pointer-events-auto isolate">
            <div className="flex justify-around items-center h-16 relative">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 group relative ${isActive ? 'text-maxim-dark' : 'text-gray-400 hover:text-gray-600'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute -top-[1px] left-0 right-0 h-[2px] bg-maxim-yellow w-1/2 mx-auto rounded-full"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <div className={`p-1.5 rounded-xl transition-colors duration-200 ${isActive ? 'bg-maxim-yellow' : 'bg-transparent group-hover:bg-gray-50'}`}>
                                    <item.icon className={`w-6 h-6 ${isActive ? 'text-maxim-dark' : 'currentColor'}`} strokeWidth={2} />
                                </div>
                                <span className={`text-xs font-medium transition-all duration-200 ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomNavigation;
