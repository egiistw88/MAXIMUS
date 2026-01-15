import { useState } from 'react'
import { supabase, isSupabaseConfigured, supabaseConfigError } from '../lib/supabaseClient'
import { useToast } from '../context/ToastContext'

export default function Auth() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    //   const [password, setPassword] = useState('') // Removed password for magic link only, or re-add if needed. 
    //   Let's stick to Magic Link for simplicity as per instructions "Magic Link OR Email/Password"
    //   Actually, "Magic Link" is simpler for users (no password management), but testing can be tricky without a real email.
    //   Let's implements standard Magic Link first.
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const { showToast } = useToast()

    const handleLogin = async (event) => {
        event.preventDefault()

        setLoading(true)
        setErrorMessage('')
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        })

        if (error) {
            const errorText = error.error_description || error.message
            setErrorMessage(errorText)
            showToast(errorText, 'error')
        } else {
            setMessage('Check your email for the login link!')
            setErrorMessage('')
        }
        setLoading(false)
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-maxim-bg p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-maxim-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-maxim-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.131A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.85.577-4.147" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-maxim-dark mb-1">Maximus Driver</h1>
                    <p className="text-gray-500 text-sm">Masuk untuk menyimpan riwayat order</p>
                </div>

                {!isSupabaseConfigured && (
                    <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 px-4 py-3 rounded relative mb-4" role="alert">
                        <p className="text-sm font-semibold">Konfigurasi Supabase belum lengkap.</p>
                        <p className="text-sm">
                            {supabaseConfigError ||
                                'Lengkapi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env untuk melanjutkan.'}
                        </p>
                    </div>
                )}

                {message ? (
                    <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <span className="block sm:inline">{message}</span>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                        {errorMessage ? (
                            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                                <span className="block sm:inline">{errorMessage}</span>
                            </div>
                        ) : null}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                id="email"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maxim-primary focus:border-transparent outline-none transition-all"
                                type="email"
                                placeholder="nama@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            className="w-full bg-maxim-primary hover:bg-yellow-400 text-maxim-dark font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            disabled={loading || !isSupabaseConfigured}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-maxim-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Mengirim Link...
                                </span>
                            ) : (
                                <span>Kirim Magic Link</span>
                            )}
                        </button>
                    </form>
                )}

                <p className="mt-8 text-center text-xs text-gray-400">
                    Powered by Supabase
                </p>
            </div>
        </div>
    )
}
