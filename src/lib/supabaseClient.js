import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missingKeys = []
if (!supabaseUrl) {
    missingKeys.push('VITE_SUPABASE_URL')
}
if (!supabaseAnonKey) {
    missingKeys.push('VITE_SUPABASE_ANON_KEY')
}

export const isSupabaseConfigured = missingKeys.length === 0
export const supabaseConfigError = isSupabaseConfigured
    ? null
    : `Supabase config missing: ${missingKeys.join(', ')}`

if (!isSupabaseConfigured) {
    console.error(`[supabase] ${supabaseConfigError}. Provide .env values to enable auth.`)
}

const createStubError = () => ({
    error: {
        message:
            supabaseConfigError ||
            'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    },
})

const createStubClient = () => ({
    auth: {
        getSession: async () => ({ data: { session: null }, ...createStubError() }),
        onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
            ...createStubError(),
        }),
        signInWithOtp: async () => createStubError(),
    },
})

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createStubClient()
