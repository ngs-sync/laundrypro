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
    errorMessage.value = 'Silakan isi alamat email dan kata sandi Anda.'
    return
  }

  isLoading.value = true
  try {
    await authStore.loginOwnerOrSuperadmin(email.value, password.value)
    router.push('/owner')
  } catch (err) {
    console.error('Owner login error:', err)
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
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 lg:p-8">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-md border border-slate-100 p-6 sm:p-8 space-y-6">

      <!-- Header -->
      <div class="text-center space-y-2">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 mb-2 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 fill-current" viewBox="0 0 24 24">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 2.84L18 11v7h-3v-6H9v6H6v-7l6-5.16z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Portal Pemilik Toko</h1>
        <p class="text-sm font-medium text-slate-500">Kelola cabang dan laporan keuangan Anda</p>
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
        <!-- Email -->
        <div>
          <label for="email" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Alamat Email
          </label>
          <input
            id="email"
            type="email"
            v-model="email"
            placeholder="owner@laundrypro.app"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            required
          />
        </div>

        <!-- Password -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label for="password" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Kata Sandi
            </label>
            <a
              href="mailto:support@laundrypro.app?subject=Lupa%20Password%20Pemilik"
              class="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Lupa password? Hubungi Superadmin
            </a>
          </div>
          <input
            id="password"
            type="password"
            v-model="password"
            placeholder="••••••••"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            required
          />
        </div>

        <!-- Tombol Masuk Pemilik -->
        <div class="pt-2">
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full min-h-[52px] py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:translate-y-[2px] text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span v-if="isLoading" class="flex items-center space-x-2">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Memproses...</span>
            </span>
            <span v-else>Masuk ke Dasbor Pemilik</span>
          </button>
        </div>
      </form>

      <!-- Navigasi Tambahan -->
      <div class="text-center pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <router-link
          to="/login"
          class="font-semibold text-slate-600 hover:text-slate-800 transition-colors py-1"
        >
          &larr; Login Kasir
        </router-link>
        <router-link
          to="/superadmin/login"
          class="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors py-1"
        >
          Portal Superadmin &rarr;
        </router-link>
      </div>

    </div>
  </div>
</template>
