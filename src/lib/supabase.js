import { createClient } from '@supabase/supabase-js'

// Mengambil variabel lingkungan dari Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fallback aman untuk mencegah crash saat proses awal (smoke test)
const finalUrl = supabaseUrl || 'https://dummy-project.supabase.co'
const finalKey = supabaseAnonKey || 'dummy-anon-key'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Peringatan: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan di file .env. Menggunakan kredensial dummy. Transaksi database akan gagal.'
  )
}

// Inisialisasi client Supabase
export const supabase = createClient(finalUrl, finalKey)
