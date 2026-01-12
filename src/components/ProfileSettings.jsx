import React, { useEffect, useState, useCallback, useRef } from 'react';
import { User, Car, Settings as SettingsIcon, Moon, Sun, ChevronDown, Cloud } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { supabase } from '../lib/supabaseClient';

// Simple debounce helper
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

export default function ProfileSettings({ session, showToast }) {
    const { settings, updateSettings } = useSettings();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const settingsRef = useRef(settings);

    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    // Fetch profile from Supabase on mount
    useEffect(() => {
        const fetchProfile = async () => {
            if (!session?.user) return;

            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (error && error.code !== 'PGRST116') { // PGRST116: JSON object requested, multiple (or no) rows returned
                    console.error('Error fetching profile:', error);
                }

                if (data) {
                    // Update local context with cloud data
                    updateSettings({
                        vehicleType: data.vehicle_type || settings.vehicleType,
                        dailyTarget: data.daily_target || settings.dailyTarget,
                        driverName: data.full_name || settings.driverName,
                        // Note: fuelEfficiency is derived from vehicleType usually, but we have a preset override.
                        // We might want to save fuelEfficiency to DB too if we want it persistent custom.
                        // For now sticking to requested fields.
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [session, updateSettings]); // Careful: updateSettings should be stable

    // Debounced save to Supabase
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const saveToCloud = useCallback(
        debounce(async (newSettings) => {
            if (!session?.user) return;
            setSaving(true);
            try {
                const { error } = await supabase.from('profiles').upsert({
                    id: session.user.id,
                    updated_at: new Date().toISOString(),
                    vehicle_type: newSettings.vehicleType,
                    daily_target: newSettings.dailyTarget,
                    full_name: newSettings.driverName,
                    // username: '...', // We don't have username input yet
                });

                if (error) throw error;
                if (showToast) showToast('Profil tersimpan di Cloud', 'success');
            } catch (error) {
                console.error('Error saving profile:', error);
                if (showToast) showToast('Gagal menyimpan profil', 'error');
            } finally {
                setSaving(false);
            }
        }, 1000),
        [session, showToast]
    );

    // Wrapper to update both Local Context and Cloud
    const handleUpdate = (updates) => {
        const nextSettings = { ...settingsRef.current, ...updates };
        updateSettings(updates);
        // Merge current settings with updates for the cloud save
        saveToCloud(nextSettings);
    };

    // Vehicle presets to auto-fill efficiency
    const vehiclePresets = {
        'matic_kecil': { label: 'Matic Kecil (Beat/Mio)', efficiency: 200 },
        'matic_besar': { label: 'Matic Besar (NMAX/PCX)', efficiency: 350 },
        'bebek': { label: 'Motor Bebek', efficiency: 250 },
        'sport': { label: 'Motor Sport', efficiency: 400 },
    };

    // Handler for vehicle type change to auto-update efficiency
    const handleVehicleChange = (e) => {
        const type = e.target.value;
        const preset = vehiclePresets[type];

        handleUpdate({
            vehicleType: type,
            fuelEfficiency: preset ? preset.efficiency : settings.fuelEfficiency
        });
    };

    const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

    return (
        <div className="flex flex-col h-full bg-maxim-bg p-4 space-y-4 pb-24 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                    <div className="bg-maxim-yellow p-2 rounded-xl">
                        <User className="w-6 h-6 text-maxim-dark" />
                    </div>
                    <h1 className="text-2xl font-bold text-maxim-dark">Profil Saya</h1>
                </div>
                {saving && (
                    <span className="text-xs text-gray-400 flex items-center animate-pulse">
                        <Cloud className="w-3 h-3 mr-1" /> Menyimpan...
                    </span>
                )}
            </div>

            {/* A. Driver Profile */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2" /> Data Driver
                </h2>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nama Panggilan</label>
                    <input
                        type="text"
                        value={settings.driverName}
                        onChange={(e) => handleUpdate({ driverName: e.target.value })}
                        placeholder="Contoh: Bang Jago"
                        className="w-full text-base p-3 rounded-xl border border-gray-200 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Target Pendapatan Harian (Rp)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400">Rp</span>
                        <input
                            type="number"
                            value={settings.dailyTarget}
                            onChange={(e) => handleUpdate({ dailyTarget: parseInt(e.target.value) || 0 })}
                            placeholder="200000"
                            className="w-full text-base p-3 pl-10 rounded-xl border border-gray-200 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow outline-none transition-all"
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 text-right">
                        Target saat ini: <span className="font-semibold text-maxim-dark">Rp {formatCurrency(settings.dailyTarget)}</span>
                    </p>
                </div>
            </section>

            {/* B. Vehicle Config */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                    <Car className="w-4 h-4 mr-2" /> Kendaraan
                </h2>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Jenis Motor</label>
                    <div className="relative">
                        <select
                            value={settings.vehicleType}
                            onChange={handleVehicleChange}
                            className="w-full text-base p-3 pr-10 rounded-xl border border-gray-200 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow outline-none transition-all appearance-none bg-white"
                        >
                            {Object.entries(vehiclePresets).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Konsumsi BBM (Rp/KM)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400">Rp</span>
                        <input
                            type="number"
                            value={settings.fuelEfficiency}
                            onChange={(e) => handleUpdate({ fuelEfficiency: parseInt(e.target.value) || 0 })}
                            placeholder="200"
                            className="w-full text-base p-3 pl-10 rounded-xl border border-gray-200 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow outline-none transition-all"
                        />
                        <span className="absolute right-3 top-3 text-gray-400 text-sm">/ km</span>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Prediksi Biaya Service (Rp/Order)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400">Rp</span>
                        <input
                            type="number"
                            value={settings.maintenanceFee || 500}
                            onChange={(e) => handleUpdate({ maintenanceFee: parseInt(e.target.value) || 0 })}
                            placeholder="500"
                            className="w-full text-base p-3 pl-10 rounded-xl border border-gray-200 focus:border-maxim-yellow focus:ring-1 focus:ring-maxim-yellow outline-none transition-all"
                        />
                        <span className="absolute right-3 top-3 text-gray-400 text-sm">/ order</span>
                    </div>
                </div>
            </section>

            {/* C. App Preferences */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                    <SettingsIcon className="w-4 h-4 mr-2" /> Preferensi
                </h2>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-bold text-gray-700">Potongan Default</div>
                        <div className="text-xs text-gray-400">Otomatis terpilih saat buka aplikasi</div>
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => updateSettings({ defaultCommission: 0.10 })}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${settings.defaultCommission === 0.10 ? 'bg-white shadow-sm text-maxim-dark' : 'text-gray-400'}`}
                        >
                            10%
                        </button>
                        <button
                            onClick={() => updateSettings({ defaultCommission: 0.15 })}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${settings.defaultCommission === 0.15 ? 'bg-white shadow-sm text-maxim-dark' : 'text-gray-400'}`}
                        >
                            15%
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div>
                        <div className="text-sm font-bold text-gray-700">Mode Gelap</div>
                        <div className="text-xs text-gray-400">Tampilan ramah mata malam hari</div>
                    </div>
                    <button
                        onClick={() => updateSettings({ darkMode: !settings.darkMode })}
                        className={`w-12 h-7 rounded-full transition-colors relative ${settings.darkMode ? 'bg-maxim-dark' : 'bg-gray-200'}`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform transform flex items-center justify-center ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'}`}>
                            {settings.darkMode ? <Moon className="w-3 h-3 text-maxim-dark" /> : <Sun className="w-3 h-3 text-yellow-500" />}
                        </div>
                    </button>
                </div>
            </section>

            <div className="text-center mt-4">
                <p className="text-[10px] text-gray-300">Maximus Driver (Cloud Sync) v1.3</p>
                <button className="mt-2 text-xs text-red-400 hover:text-red-500" onClick={() => supabase.auth.signOut()}>
                    Keluar (Sign Out)
                </button>
            </div>
        </div>
    );
}
