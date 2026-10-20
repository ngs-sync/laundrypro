<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

const tenantCode = ref('')
const username = ref('')
const password = ref('')
const rememberTenantCode = ref(true)
const errorMessage = ref('')
const isLoading = ref(false)

onMounted(() => {
  // Isi otomatis dari store atau localStorage jika ada
  const savedTenantCode = authStore.tenantCode || localStorage.getItem('tenantCode') || ''
  if (savedTenantCode) {
    tenantCode.value = savedTenantCode.toUpperCase()
    rememberTenantCode.value = true
  }
})

const handleTenantCodeInput = (e) => {
  tenantCode.value = e.target.value.toUpperCase()
}

const handleLogin = async () => {
  errorMessage.value = ''

  if (!tenantCode.value.trim() || !username.value.trim() || !password.value) {
    errorMessage.value = 'Silakan isi semua bidang input.'
    return
  }

  isLoading.value = true
  try {
    await authStore.loginStaff(
      tenantCode.value,
      username.value,
      password.value,
      rememberTenantCode.value
    )
    router.push('/')
  } catch (err) {
    console.error('Login error:', err)
    if (err.message) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = 'Gagal masuk. Periksa kembali Kode Toko, Username, atau Password Anda.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-md border border-slate-100 p-6 sm:p-8 space-y-6">

      <!-- Header -->
      <div class="text-center space-y-2">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 text-primary mb-2 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 fill-current" viewBox="0 0 24 24">
            <path d="M18.75 3H5.25C4.00736 3 3 4.00736 3 5.25V18.75C3 19.9926 4.00736 21 5.25 21H18.75C19.9926 21 21 19.9926 21 18.75V5.25C21 4.00736 19.9926 3 18.75 3ZM18.75 4.5C19.1642 4.5 19.5 4.83579 19.5 5.25V6.75H4.5V5.25C4.5 4.83579 4.83579 4.5 5.25 4.5H18.75ZM12 8.25C14.8995 8.25 17.25 10.6005 17.25 13.5C17.25 16.3995 14.8995 18.75 12 18.75C9.10051 18.75 6.75 16.3995 6.75 13.5C6.75 10.6005 9.10051 8.25 12 8.25ZM12 9.75C9.92893 9.75 8.25 11.4289 8.25 13.5C8.25 15.5711 9.92893 17.25 12 17.25C14.0711 17.25 15.75 15.5711 15.75 13.5C15.75 11.4289 14.0711 9.75 12 9.75ZM8.25 5.25H9.75V6H8.25V5.25ZM11.25 5.25H12.75V6H11.25V5.25Z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">LaundryPro</h1>
        <p class="text-sm font-medium text-slate-500">Masuk Kasir Cabang</p>
      </div>

      <!-- Alert Error -->
      <div
        v-if="errorMessage"
        class="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-3.5 flex items-start space-x-2.5 animate-fadeIn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-rose-500 shrink-0 mt-0.5 fill-current" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <span class="font-medium leading-snug">{{ errorMessage }}</span>
      </div>

      <!-- Form Login -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <!-- Kode Toko -->
        <div>
          <label for="tenantCode" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Kode Toko
          </label>
          <input
            id="tenantCode"
            type="text"
            v-model="tenantCode"
            @input="handleTenantCodeInput"
            placeholder="BERKAH01"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            required
          />
        </div>

        <!-- Username Staf -->
        <div>
          <label for="username" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Username Staf
          </label>
          <input
            id="username"
            type="text"
            v-model="username"
            placeholder="misal: kasir1"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            required
          />
        </div>

        <!-- Password / PIN -->
        <div>
          <label for="password" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Password / PIN
          </label>
          <input
            id="password"
            type="password"
            v-model="password"
            placeholder="••••••••"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            required
          />
        </div>

        <!-- Checkbox Remember Store Code -->
        <div class="flex items-center space-x-2 pt-1">
          <input
            id="rememberTenantCode"
            type="checkbox"
            v-model="rememberTenantCode"
            class="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary focus:ring-2 cursor-pointer accent-primary"
          />
          <label for="rememberTenantCode" class="text-xs font-medium text-slate-600 cursor-pointer select-none">
            Ingat Kode Toko di Perangkat Ini
          </label>
        </div>

        <!-- Tombol Masuk Kasir -->
        <div class="pt-2">
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full min-h-[52px] py-3.5 px-4 bg-primary hover:bg-emerald-600 active:translate-y-[2px] text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span v-if="isLoading" class="flex items-center space-x-2">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Memproses...</span>
            </span>
            <span v-else>Masuk Kasir</span>
          </button>
        </div>
      </form>

      <!-- Link Bawah -->
      <div class="text-center pt-2 border-t border-slate-100">
        <router-link
          to="/owner/login"
          class="text-xs font-semibold text-primary hover:text-emerald-700 transition-colors inline-block py-1"
        >
          Login sebagai Pemilik Toko &rarr;
        </router-link>
      </div>

    </div>
  </div>
</template>
