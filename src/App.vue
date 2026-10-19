<script setup>
import { ref } from 'vue'

const isClicked = ref(false)

const handleClick = () => {
  isClicked.value = !isClicked.value
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center">
    <div class="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
      
      <h1 class="text-3xl font-bold text-slate-800 mb-2">LaundryPro POS</h1>
      <p class="text-slate-500 mb-8">Setup Vue 3 dan Tailwind berhasil!</p>
      
      <!-- Tombol Emerald Green -->
      <button 
        @click="handleClick"
        class="w-full bg-primary hover:bg-emerald-400 text-white font-semibold py-4 px-6 rounded-xl transition-colors active:scale-95 text-lg"
      >
        {{ isClicked ? 'Sistem Aktif 🚀' : 'Mulai Uji Coba' }}
      </button>

      <!-- Contoh Warna Danger -->
      <p v-if="isClicked" class="mt-6 text-sm font-medium text-danger">
        (Ini contoh penggunaan warna peringatan / Danger)
      </p>

    </div>
  </div>
</template>
