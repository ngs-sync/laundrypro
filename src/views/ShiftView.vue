<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../lib/supabase'

const router = useRouter()
const authStore = useAuthStore()

// Buka Shift Inputs
const openInitialCash = ref(100000)
const openInitialCoins = ref(50)

// Tutup Shift Physical Inputs
const actualCash = ref(100000)
const actualCoins = ref(50)
const notes = ref('')

// Calculated System Totals
const systemCash = ref(0)
const systemCoins = ref(0)
const isLoadingMetrics = ref(false)
const isSubmitting = ref(false)
const shiftClosedSummary = ref(null)

async function fetchShiftMetrics() {
  if (!authStore.activeShift) return
  isLoadingMetrics.value = true
  try {
    const openedAt = authStore.activeShift.openedAt
    const tenantId = authStore.activeTenant.id

    // Fetch transactions created after openedAt for active tenant
    const { data: txData, error } = await supabase
      .from('transactions')
      .select('id, total_amount, payment_method, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', openedAt)

    if (!error && txData) {
      // Sum total cash sales
      const cashSales = txData
        .filter(tx => tx.payment_method === 'cash')
        .reduce((sum, tx) => sum + Number(tx.total_amount || 0), 0)
      systemCash.value = cashSales

      // Fetch transaction items for coins count
      const txIds = txData.map(t => t.id)
      if (txIds.length > 0) {
        const { data: itemData } = await supabase
          .from('transaction_items')
          .select('service_name, qty')
          .in('transaction_id', txIds)

        if (itemData) {
          const coinsCount = itemData.reduce((acc, item) => {
            const name = (item.service_name || '').toLowerCase()
            if (name.includes('koin') || name.includes('cuci')) {
              return acc + Number(item.qty || 0)
            }
            return acc
          }, 0)
          systemCoins.value = coinsCount
        }
      }
    } else {
      systemCash.value = 0
      systemCoins.value = 0
    }
  } catch (err) {
    console.warn('Error fetching shift metrics from Supabase:', err)
  } finally {
    isLoadingMetrics.value = false
  }
}

function handleOpenShift() {
  const shift = authStore.openShift(openInitialCash.value, openInitialCoins.value)
  actualCash.value = shift.initialCash
  actualCoins.value = shift.initialCoins
  fetchShiftMetrics()
}

const expectedCash = computed(() => {
  const init = authStore.activeShift ? authStore.activeShift.initialCash : 0
  return init + systemCash.value
})

const expectedCoins = computed(() => {
  const init = authStore.activeShift ? authStore.activeShift.initialCoins : 0
  return Math.max(0, init - systemCoins.value)
})

const cashDifference = computed(() => {
  return Number(actualCash.value) - expectedCash.value
})

const coinDifference = computed(() => {
  return Number(actualCoins.value) - expectedCoins.value
})

function formatCurrency(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val || 0)
}

function formatDate(isoStr) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

async function handleCloseShift() {
  if (!authStore.activeShift) return
  isSubmitting.value = true

  const currentShift = authStore.activeShift
  const closedAt = new Date().toISOString()

  const reconciliationData = {
    tenant_id: authStore.activeTenant.id,
    user_id: authStore.currentUser.id,
    initial_cash: currentShift.initialCash,
    initial_coins: currentShift.initialCoins,
    system_cash: systemCash.value,
    system_coins: systemCoins.value,
    actual_cash: Number(actualCash.value) || 0,
    actual_coins: Number(actualCoins.value) || 0,
    cash_difference: cashDifference.value,
    coin_difference: coinDifference.value,
    notes: notes.value.trim(),
    opened_at: currentShift.openedAt,
    closed_at: closedAt,
    status: 'closed'
  }

  try {
    const { data, error } = await supabase
      .from('shift_reconciliations')
      .insert([reconciliationData])
      .select()

    if (error) {
      console.warn('Supabase insert shift_reconciliations warning:', error.message)
    }
  } catch (err) {
    console.warn('Error saving shift reconciliation:', err)
  } finally {
    shiftClosedSummary.value = {
      ...reconciliationData,
      tenant_name: authStore.activeTenant.name
    }
    authStore.clearActiveShift()
    isSubmitting.value = false
  }
}

function resetSummaryView() {
  shiftClosedSummary.value = null
  openInitialCash.value = 100000
  openInitialCoins.value = 50
  actualCash.value = 100000
  actualCoins.value = 50
  notes.value = ''
}

onMounted(() => {
  if (authStore.activeShift) {
    actualCash.value = authStore.activeShift.initialCash
    actualCoins.value = authStore.activeShift.initialCoins
    fetchShiftMetrics()
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 pb-20">
    <!-- Header Page -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 shadow-xs">
      <div class="max-w-md mx-auto flex items-center justify-between">
        <div>
          <h1 class="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>⚖️</span>
            <span>Rekonsiliasi Shift</span>
          </h1>
          <p class="text-xs text-slate-500">
            {{ authStore.activeTenant?.name || 'Toko Laundry' }}
          </p>
        </div>
        <div v-if="authStore.activeShift" class="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 text-xs font-bold">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Shift Aktif</span>
        </div>
        <div v-else class="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 text-xs font-bold">
          <span>Shift Ditutup</span>
        </div>
      </div>
    </header>

    <main class="max-w-md mx-auto p-4 flex flex-col gap-5">
      <!-- SUMMARY MODAL AFTER CLOSE SHIFT -->
      <div v-if="shiftClosedSummary" class="bg-white rounded-2xl p-5 border border-emerald-200 shadow-lg flex flex-col gap-4 animate-fade-in">
        <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-black">
            ✅
          </div>
          <div>
            <h2 class="text-base font-extrabold text-slate-900">Rekonsiliasi Shift Selesai</h2>
            <p class="text-xs text-slate-500">{{ formatDate(shiftClosedSummary.closed_at) }}</p>
          </div>
        </div>

        <div class="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div class="flex justify-between">
            <span class="text-slate-500">Toko:</span>
            <span class="font-bold text-slate-800">{{ shiftClosedSummary.tenant_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Waktu Buka:</span>
            <span class="font-bold text-slate-800">{{ formatDate(shiftClosedSummary.opened_at) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Uang Fisik Kasir:</span>
            <span class="font-bold font-mono text-slate-900">{{ formatCurrency(shiftClosedSummary.actual_cash) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Selisih Uang Tunai:</span>
            <span :class="['font-bold font-mono', shiftClosedSummary.cash_difference >= 0 ? 'text-emerald-600' : 'text-rose-600']">
              {{ shiftClosedSummary.cash_difference >= 0 ? '+' : '' }}{{ formatCurrency(shiftClosedSummary.cash_difference) }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Selisih Koin Fisik:</span>
            <span :class="['font-bold font-mono', shiftClosedSummary.coin_difference >= 0 ? 'text-emerald-600' : 'text-rose-600']">
              {{ shiftClosedSummary.coin_difference >= 0 ? '+' : '' }}{{ shiftClosedSummary.coin_difference }} koin
            </span>
          </div>
          <div v-if="shiftClosedSummary.notes" class="pt-2 border-t border-slate-200">
            <span class="text-slate-500 block mb-0.5">Catatan:</span>
            <p class="text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200">{{ shiftClosedSummary.notes }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-2">
          <button
            @click="resetSummaryView"
            class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
          >
            Buka Shift Baru
          </button>
          <button
            @click="router.push('/')"
            class="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-md"
          >
            Kembali ke Kasir
          </button>
        </div>
      </div>

      <!-- STATE 1: Buka Shift Form (if activeShift is null) -->
      <section v-else-if="!authStore.activeShift" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
        <div class="border-b border-slate-100 pb-3">
          <h2 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>🔓</span>
            <span>Form Buka Shift Kasir</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">Masukkan modal uang tunai dan stok koin awal sebelum memulai transaksi kasir.</p>
        </div>

        <div class="flex flex-col gap-3">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Modal Uang Tunai Awal (Rp)
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">Rp</span>
              <input
                v-model.number="openInitialCash"
                type="number"
                min="0"
                step="5000"
                class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold font-mono focus:outline-none focus:border-emerald-500"
                placeholder="100000"
              />
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Uang kembalian yang disiapkan di laci kasir.</p>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Stok Koin Fisik Awal (pcs)
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">🪙</span>
              <input
                v-model.number="openInitialCoins"
                type="number"
                min="0"
                class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold font-mono focus:outline-none focus:border-emerald-500"
                placeholder="50"
              />
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Jumlah token/koin fisik awal di tempat koin.</p>
          </div>
        </div>

        <button
          @click="handleOpenShift"
          class="w-full mt-2 py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-extrabold rounded-xl shadow-lg transition-all text-base flex items-center justify-center gap-2"
        >
          <span>🚀</span>
          <span>Buka Shift Sekarang</span>
        </button>
      </section>

      <!-- STATE 2: Tutup Shift & Audit Selisih (if activeShift is set) -->
      <div v-else class="flex flex-col gap-5">
        <!-- Info Active Shift -->
        <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <span class="text-xs text-slate-400 block font-medium">Shift Dibatasi Oleh</span>
            <span class="text-sm font-bold text-emerald-400 block">{{ authStore.currentUser?.name || 'Kasir Staf' }}</span>
            <span class="text-[11px] text-slate-400 mt-1 block">Buka: {{ formatDate(authStore.activeShift.openedAt) }}</span>
          </div>
          <button
            @click="fetchShiftMetrics"
            :disabled="isLoadingMetrics"
            class="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-1 border border-slate-600"
          >
            <span :class="{'animate-spin': isLoadingMetrics}">🔄</span>
            <span>Refresh</span>
          </button>
        </div>

        <!-- Kalkulasi Sistem -->
        <section class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-3">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 class="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <span>🖥️</span>
              <span>Kalkulasi Sistem</span>
            </h2>
            <span class="text-[11px] text-slate-400">Otomatis dari Transaksi</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span class="text-[11px] text-slate-500 block">Modal Awal Tunai</span>
              <span class="text-sm font-bold font-mono text-slate-800">{{ formatCurrency(authStore.activeShift.initialCash) }}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span class="text-[11px] text-slate-500 block">Penjualan Tunai</span>
              <span class="text-sm font-bold font-mono text-emerald-600">+ {{ formatCurrency(systemCash) }}</span>
            </div>
          </div>

          <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-emerald-900 block">Ekspektasi Kas Tunai Sistem</span>
              <span class="text-xs text-emerald-700">(Modal Awal + Omzet Tunai)</span>
            </div>
            <span class="text-base font-black font-mono text-emerald-800">{{ formatCurrency(expectedCash) }}</span>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-1">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span class="text-[11px] text-slate-500 block">Stok Koin Awal</span>
              <span class="text-sm font-bold font-mono text-slate-800">{{ authStore.activeShift.initialCoins }} koin</span>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span class="text-[11px] text-slate-500 block">Koin Keluar (Terpakai)</span>
              <span class="text-sm font-bold font-mono text-amber-600">- {{ systemCoins }} koin</span>
            </div>
          </div>

          <div class="bg-teal-50 border border-teal-200 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-teal-900 block">Ekspektasi Stok Koin Fisik</span>
              <span class="text-xs text-teal-700">(Sisa koin seharusnya)</span>
            </div>
            <span class="text-base font-black font-mono text-teal-800">{{ expectedCoins }} koin</span>
          </div>
        </section>

        <!-- Audit Uang Fisik Riil & Selisih -->
        <section class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
          <div class="border-b border-slate-100 pb-2">
            <h2 class="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <span>🔍</span>
              <span>Audit Uang Fisik & Selisih</span>
            </h2>
            <p class="text-[11px] text-slate-400">Hitung total uang fisik dan koin riil yang ada di meja kasir saat ini.</p>
          </div>

          <!-- Input Uang Fisik -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Uang Fisik Riil di Laci Kasir (Rp)
            </label>
            <input
              v-model.number="actualCash"
              type="number"
              step="1000"
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <!-- Diff Badge Cash -->
          <div :class="[
            'p-3 rounded-xl border flex items-center justify-between transition-all',
            cashDifference >= 0
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          ]">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ cashDifference >= 0 ? '🟢' : '🔴' }}</span>
              <div>
                <span class="text-xs font-bold block">Selisih Uang Tunai</span>
                <span class="text-[11px] opacity-80">
                  {{ cashDifference >= 0 ? 'Kasir Seimbang / Lebih' : 'Kasir Defisit / Minus' }}
                </span>
              </div>
            </div>
            <span class="text-base font-black font-mono">
              {{ cashDifference >= 0 ? '+' : '' }}{{ formatCurrency(cashDifference) }}
            </span>
          </div>

          <!-- Input Koin Fisik -->
          <div class="pt-1">
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Koin Fisik Riil (pcs)
            </label>
            <input
              v-model.number="actualCoins"
              type="number"
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <!-- Diff Badge Coin -->
          <div :class="[
            'p-3 rounded-xl border flex items-center justify-between transition-all',
            coinDifference >= 0
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          ]">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ coinDifference >= 0 ? '🟢' : '🔴' }}</span>
              <div>
                <span class="text-xs font-bold block">Selisih Koin Fisik</span>
                <span class="text-[11px] opacity-80">
                  {{ coinDifference >= 0 ? 'Stok Koin Cocok' : 'Stok Koin Defisit' }}
                </span>
              </div>
            </div>
            <span class="text-base font-black font-mono">
              {{ coinDifference >= 0 ? '+' : '' }}{{ coinDifference }} koin
            </span>
          </div>

          <!-- Catatan Audit -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Catatan Rekonsiliasi (Opsional)
            </label>
            <textarea
              v-model="notes"
              rows="2"
              placeholder="Contoh: Selisih Rp 2.000 karena tidak ada kembalian koin pecahan kecil"
              class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 resize-none"
            ></textarea>
          </div>

          <!-- Action Button Close Shift -->
          <button
            @click="handleCloseShift"
            :disabled="isSubmitting"
            class="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-extrabold rounded-2xl text-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-75"
          >
            <span v-if="isSubmitting" class="flex items-center gap-2">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Menyimpan Rekonsiliasi...</span>
            </span>
            <span v-else>🔒 Simpan & Tutup Shift Kasir</span>
          </button>
        </section>
      </div>
    </main>
  </div>
</template>
