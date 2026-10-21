<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  errorMessage.value = ''

  if (!email.value.trim() || !password.value) {
    errorMessage.value = 'Silakan isi email dan kata sandi Anda.'
    return
  }

  isLoading.value = true
  try {
    await authStore.loginOwnerOrSuperadmin(email.value, password.value, 'superadmin')
    router.push('/superadmin')
  } catch (err) {
    console.error('Superadmin login error:', err)
    if (err.message) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = 'Gagal masuk. Periksa kembali email dan kata sandi Anda.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 lg:p-8">
    <div class="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/60 p-6 sm:p-8 space-y-6 text-slate-100">

      <!-- Header -->
      <div class="text-center space-y-2">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-2 border border-indigo-500/20 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 fill-current" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white tracking-tight">SaaS Superadmin Portal</h1>
        <p class="text-sm font-medium text-slate-400">Manajemen Pusat Platform & Multi-Tenant LaundryPro</p>
      </div>

      <!-- Alert Error -->
      <div
        v-if="errorMessage"
        class="bg-rose-950/50 border border-rose-800/80 text-rose-300 text-sm rounded-xl p-3.5 flex items-start space-x-2.5 animate-fadeIn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-rose-400 shrink-0 mt-0.5 fill-current" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <span class="font-medium leading-snug">{{ errorMessage }}</span>
      </div>

      <!-- Form Login -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <!-- Email -->
        <div>
          <label for="superadmin-email" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Email Administrator
          </label>
          <input
            id="superadmin-email"
            type="email"
            v-model="email"
            placeholder="superadmin@laundrypro.app"
            class="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            required
          />
        </div>

        <!-- Password -->
        <div>
          <label for="superadmin-password" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Kata Sandi
          </label>
          <input
            id="superadmin-password"
            type="password"
            v-model="password"
            placeholder="••••••••"
            class="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            required
          />
        </div>

        <!-- Tombol Masuk Superadmin -->
        <div class="pt-2">
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full min-h-[52px] py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:translate-y-[2px] text-white font-bold text-base rounded-xl shadow-lg hover:shadow-indigo-500/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span v-if="isLoading" class="flex items-center space-x-2">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Memproses...</span>
            </span>
            <span v-else>Masuk ke Portal Superadmin</span>
          </button>
        </div>
      </form>

      <!-- Navigasi Bawah -->
      <div class="text-center pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
        <router-link
          to="/owner/login"
          class="font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1"
        >
          &larr; Portal Pemilik Toko
        </router-link>
        <router-link
          to="/login"
          class="font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1"
        >
          Portal Kasir &rarr;
        </router-link>
      </div>

    </div>
  </div>
</template>
