<script setup>
import { computed } from 'vue'
import { useAppStore } from './stores/useAppStore'
import { supabase } from './lib/supabase'

// 1. Mengambil store Pinia
const appStore = useAppStore()

// 2. Mengecek apakah Supabase client termuat (hanya untuk log visual)
const isSupabaseLoaded = computed(() => {
  return supabase.supabaseUrl !== undefined
})

const handlePiniaClick = () => {
  appStore.setSystemActive()
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center">
    <div class="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
      
      <h1 class="text-3xl font-bold text-slate-800 mb-2">LaundryPro POS</h1>
      <p class="text-slate-500 mb-6">Setup Vue 3, Tailwind, dan Pinia berhasil!</p>
      
      <!-- Kartu Status -->
      <div class="bg-slate-50 p-4 rounded-xl mb-6 text-left border border-slate-200">
        <h2 class="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wider">Status Sistem:</h2>
        
        <div class="flex items-center justify-between py-2 border-b border-slate-200">
          <span class="text-slate-700">Pinia State:</span>
          <span class="font-mono text-primary font-bold">{{ appStore.systemStatus }}</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-slate-200">
          <span class="text-slate-700">Total Klik (Store):</span>
          <span class="font-mono font-bold">{{ appStore.clickCount }}</span>
        </div>
        <div class="flex items-center justify-between py-2">
          <span class="text-slate-700">Supabase Client:</span>
          <span :class="isSupabaseLoaded ? 'text-primary' : 'text-danger'" class="font-medium">
            {{ isSupabaseLoaded ? 'Termuat ✅' : 'Gagal ❌' }}
          </span>
        </div>
      </div>

      <!-- Tombol Trigger Store -->
      <button 
        @click="handlePiniaClick"
        class="w-full bg-primary hover:bg-emerald-400 text-white font-semibold py-4 px-6 rounded-xl transition-colors active:scale-95 text-lg"
      >
        Tes Pinia Store
      </button>

    </div>
  </div>
</template>
