import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // State: Data yang disimpan di store
  const systemStatus = ref('Inisialisasi...')
  const clickCount = ref(0)
  
  // Actions: Fungsi untuk mengubah state
  const setSystemActive = () => {
    systemStatus.value = 'Aktif (Pinia OK)'
    clickCount.value++
  }

  // Mengembalikan data dan fungsi agar bisa digunakan oleh komponen Vue
  return {
    systemStatus,
    clickCount,
    setSystemActive
  }
})
