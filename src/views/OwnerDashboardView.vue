<script setup>
import { ref, onMounted } from 'vue'
import { useOwnerStore } from '../stores/useOwnerStore'
import { useAuthStore } from '../stores/useAuthStore'

const ownerStore = useOwnerStore()
const authStore = useAuthStore()

// Tab Active: 'financial' | 'expenses' | 'services' | 'promotions' | 'staff'
const activeTab = ref('financial')

// Form Expense
const newExpense = ref({
  category: 'Operasional',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  notes: ''
})
const expenseSuccessMsg = ref('')

// Form Service
const showServiceModal = ref(false)
const newService = ref({
  name: '',
  category: 'kiloan',
  price: '',
  unit: 'kg',
  is_active: true
})

// Form Loyalty
const loyaltyForm = ref({
  spend_per_point: 10000,
  point_redemption_value: 1000
})
const loyaltySuccessMsg = ref('')

// Form Promotion
const newPromo = ref({
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
})
const promoSuccessMsg = ref('')

// State Manajemen Staf (Tab 5)
const staffList = ref([
  { id: 1, name: 'Siti Rahma', username: 'siti_kasir', is_active: true },
  { id: 2, name: 'Budi Santoso', username: 'budi_kasir', is_active: true },
  { id: 3, name: 'Dewi Lestari', username: 'dewi_kasir', is_active: false }
])

const newStaff = ref({
  full_name: '',
  username: '',
  password: ''
})
const staffSuccessMsg = ref('')

const showResetModal = ref(false)
const selectedStaffForReset = ref(null)
const resetPasswordInput = ref('')
const resetSuccessMsg = ref('')

onMounted(async () => {
  await ownerStore.fetchAllOwnerData()
  loyaltyForm.value = {
    spend_per_point: ownerStore.tenantLoyalty.spend_per_point || 10000,
    point_redemption_value: ownerStore.tenantLoyalty.point_redemption_value || 1000
  }
})

// Format Currency
function formatCurrency(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val || 0)
}

// Handlers Expense, Service, Loyalty, Promo
async function handleAddExpense() {
  if (!newExpense.value.amount || Number(newExpense.value.amount) <= 0) {
    alert('Masukkan nominal pengeluaran yang valid.')
    return
  }
  await ownerStore.addExpense(newExpense.value)
  expenseSuccessMsg.value = 'Pengeluaran berhasil dicatat!'
  setTimeout(() => (expenseSuccessMsg.value = ''), 3000)
  newExpense.value = {
    category: 'Operasional',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: ''
  }
}

async function handleDeleteExpense(id) {
  if (confirm('Apakah Anda yakin ingin menghapus catatan pengeluaran ini?')) {
    await ownerStore.deleteExpense(id)
  }
}

async function handleAddService() {
  if (!newService.value.name.trim() || !newService.value.price || Number(newService.value.price) < 0) {
    alert('Lengkapi nama layanan dan harga yang valid.')
    return
  }
  await ownerStore.addService(newService.value)
  showServiceModal.value = false
  newService.value = {
    name: '',
    category: 'kiloan',
    price: '',
    unit: 'kg',
    is_active: true
  }
}

async function handleUpdateServicePrice(srv, newPrice) {
  const priceNum = Number(newPrice)
  if (isNaN(priceNum) || priceNum < 0) return
  await ownerStore.updateService(srv.id, { price: priceNum })
}

async function handleToggleService(srv) {
  await ownerStore.updateService(srv.id, { is_active: !srv.is_active })
}

async function handleSaveLoyalty() {
  await ownerStore.updateTenantLoyalty(loyaltyForm.value)
  loyaltySuccessMsg.value = 'Aturan poin loyalitas berhasil diperbarui!'
  setTimeout(() => (loyaltySuccessMsg.value = ''), 3000)
}

async function handleAddPromo() {
  if (!newPromo.value.code.trim() || !newPromo.value.discount_value || Number(newPromo.value.discount_value) <= 0) {
    alert('Lengkapi kode promo dan nilai diskon yang valid.')
    return
  }
  await ownerStore.addPromotion(newPromo.value)
  promoSuccessMsg.value = 'Voucher promo berhasil dibuat!'
  setTimeout(() => (promoSuccessMsg.value = ''), 3000)
  newPromo.value = {
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  }
}

// Handlers Manajemen Staf
function handleAddStaff() {
  if (!newStaff.value.full_name.trim() || !newStaff.value.username.trim() || !newStaff.value.password) {
    alert('Mohon isi semua bidang input staf baru.')
    return
  }

  const staffData = {
    id: Date.now(),
    name: newStaff.value.full_name.trim(),
    username: newStaff.value.username.trim().toLowerCase(),
    is_active: true
  }

  staffList.value.push(staffData)
  console.log('Penambahan staf baru (MVP Local):', {
    ...staffData,
    initialPassword: newStaff.value.password
  })

  staffSuccessMsg.value = `Staf ${staffData.name} berhasil ditambahkan!`
  setTimeout(() => (staffSuccessMsg.value = ''), 3000)

  newStaff.value = {
    full_name: '',
    username: '',
    password: ''
  }
}

function handleToggleStaffStatus(staff) {
  staff.is_active = !staff.is_active
  console.log(`Status staf '${staff.username}' diubah menjadi:`, staff.is_active ? 'Aktif' : 'Nonaktif')
}

function openResetPasswordModal(staff) {
  selectedStaffForReset.value = staff
  resetPasswordInput.value = ''
  showResetModal.value = true
}

function handleResetPasswordSubmit() {
  if (!resetPasswordInput.value) {
    alert('Masukkan password/PIN baru.')
    return
  }

  console.log(`Reset password/PIN untuk staf '${selectedStaffForReset.value.username}':`, resetPasswordInput.value)

  resetSuccessMsg.value = `Password untuk ${selectedStaffForReset.value.name} berhasil direset!`
  setTimeout(() => (resetSuccessMsg.value = ''), 3000)

  showResetModal.value = false
  selectedStaffForReset.value = null
  resetPasswordInput.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] pb-12">
    <!-- Header Dasbor Pemilik -->
    <header class="bg-[#0F172A] text-white pt-6 pb-5 px-4 shadow-md">
      <div class="max-w-4xl mx-auto flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">👑</span>
              <h1 class="text-xl font-extrabold tracking-tight">Portal Pemilik (Owner Dashboard)</h1>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              Kelola finansial, beban operasional, tarif layanan, dan promo toko
              <span class="text-[#10B981] font-bold">({{ authStore.activeTenant?.name }})</span>
            </p>
          </div>
          <button
            @click="ownerStore.fetchAllOwnerData"
            :disabled="ownerStore.isLoading"
            class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition-all flex items-center gap-1 active:translate-y-[1px]"
            title="Muat Ulang Data"
          >
            <span :class="{ 'animate-spin': ownerStore.isLoading }">🔄</span>
            <span class="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <!-- Navigasi Tab Utama -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 text-xs font-bold mt-2">
          <button
            @click="activeTab = 'financial'"
            :class="[
              'py-2 px-1 rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1',
              activeTab === 'financial'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            ]"
          >
            <span>📊</span>
            <span>Finansial</span>
          </button>

          <button
            @click="activeTab = 'expenses'"
            :class="[
              'py-2 px-1 rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1',
              activeTab === 'expenses'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            ]"
          >
            <span>💸</span>
            <span>Pengeluaran</span>
          </button>

          <button
            @click="activeTab = 'services'"
            :class="[
              'py-2 px-1 rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1',
              activeTab === 'services'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            ]"
          >
            <span>🏷️</span>
            <span>Layanan</span>
          </button>

          <button
            @click="activeTab = 'promotions'"
            :class="[
              'py-2 px-1 rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1',
              activeTab === 'promotions'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            ]"
          >
            <span>🎁</span>
            <span>Promo & Poin</span>
          </button>

          <button
            @click="activeTab = 'staff'"
            :class="[
              'py-2 px-1 rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 col-span-2 sm:col-span-1',
              activeTab === 'staff'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            ]"
          >
            <span>👥</span>
            <span>Manajemen Staf</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Content Body -->
    <main class="max-w-4xl mx-auto p-4 sm:p-6 flex flex-col gap-6">

      <!-- ================= TAB 1: RINGKASAN FINANSIAL & LABA BERSIH ================= -->
      <div v-if="activeTab === 'financial'" class="flex flex-col gap-6">
        <!-- Filter Tanggal -->
        <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">Periode Laporan</h2>
            <p class="text-xs text-[#64748B]">Pilih rentang tanggal untuk analisa performa toko</p>
          </div>

          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              @click="ownerStore.dateFilter = 'today'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                ownerStore.dateFilter === 'today'
                  ? 'bg-[#10B981] text-white border-[#10B981]'
                  : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-slate-100'
              ]"
            >
              Hari Ini
            </button>
            <button
              @click="ownerStore.dateFilter = 'this_month'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                ownerStore.dateFilter === 'this_month'
                  ? 'bg-[#10B981] text-white border-[#10B981]'
                  : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-slate-100'
              ]"
            >
              Bulan Ini
            </button>
            <button
              @click="ownerStore.dateFilter = 'custom'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                ownerStore.dateFilter === 'custom'
                  ? 'bg-[#10B981] text-white border-[#10B981]'
                  : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-slate-100'
              ]"
            >
              Kustom
            </button>
          </div>
        </div>

        <!-- Custom Date Input Range -->
        <div v-if="ownerStore.dateFilter === 'custom'" class="bg-[#ECFDF5] p-4 rounded-xl border border-[#10B981]/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#00422B] mb-1">Dari Tanggal</label>
            <input
              v-model="ownerStore.customStartDate"
              type="date"
              class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A]"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-[#00422B] mb-1">Sampai Tanggal</label>
            <input
              v-model="ownerStore.customEndDate"
              type="date"
              class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A]"
            />
          </div>
        </div>

        <!-- Kartu Metrik Finansial -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Total Omzet -->
          <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-2">
            <div class="flex items-center justify-between text-[#64748B]">
              <span class="text-xs font-bold uppercase tracking-wider">Total Omzet</span>
              <span class="text-xl">💰</span>
            </div>
            <span class="text-2xl font-black font-mono tabular-nums text-[#10B981]">
              {{ formatCurrency(ownerStore.totalOmzet) }}
            </span>
            <span class="text-[10px] text-[#64748B]">Total penerimaan kotor</span>
          </div>

          <!-- Total Pengeluaran -->
          <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-2">
            <div class="flex items-center justify-between text-[#64748B]">
              <span class="text-xs font-bold uppercase tracking-wider">Total Pengeluaran</span>
              <span class="text-xl">💸</span>
            </div>
            <span class="text-2xl font-black font-mono tabular-nums text-[#F43F5E]">
              {{ formatCurrency(ownerStore.totalPengeluaran) }}
            </span>
            <span class="text-[10px] text-[#64748B]">Beban operasional toko</span>
          </div>

          <!-- Laba Bersih -->
          <div class="bg-[#0F172A] text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-col gap-2">
            <div class="flex items-center justify-between text-slate-400">
              <span class="text-xs font-bold uppercase tracking-wider">Laba Bersih</span>
              <span class="text-xl">📈</span>
            </div>
            <span
              :class="[
                'text-2xl font-black font-mono tabular-nums',
                ownerStore.labaBersih >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'
              ]"
            >
              {{ formatCurrency(ownerStore.labaBersih) }}
            </span>
            <span class="text-[10px] text-slate-400">Omzet - Pengeluaran</span>
          </div>
        </div>

        <!-- Metrik Operasional & Metode Bayar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Metrik Operasional -->
          <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0] pb-2">
              Volum Operasional Produksi
            </h3>

            <div class="grid grid-cols-2 gap-3">
              <div class="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
                <span class="text-xs text-[#64748B] block font-bold">Total Berat Kg</span>
                <span class="text-2xl font-black text-[#0F172A] font-mono tabular-nums">
                  {{ ownerStore.totalKgProcessed }} <span class="text-xs font-sans text-[#64748B]">Kg</span>
                </span>
              </div>

              <div class="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
                <span class="text-xs text-[#64748B] block font-bold">Total Koin Terpakai</span>
                <span class="text-2xl font-black text-[#0F172A] font-mono tabular-nums">
                  {{ ownerStore.totalCoinsUsed }} <span class="text-xs font-sans text-[#64748B]">Koin</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Rincian Metode Pembayaran -->
          <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0] pb-2">
              Breakdown Metode Pembayaran
            </h3>

            <div class="flex flex-col gap-3">
              <!-- Tunai -->
              <div class="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <div class="flex items-center gap-2">
                  <span class="text-xl">💵</span>
                  <div>
                    <span class="text-xs font-bold text-[#0F172A] block">Tunai (Cash)</span>
                    <span class="text-[10px] text-[#64748B] font-mono">{{ ownerStore.paymentMethodBreakdown.cashCount }} transaksi</span>
                  </div>
                </div>
                <span class="text-sm font-extrabold text-[#0F172A] font-mono tabular-nums">
                  {{ formatCurrency(ownerStore.paymentMethodBreakdown.cash) }}
                </span>
              </div>

              <!-- QRIS -->
              <div class="flex items-center justify-between p-3 bg-[#ECFDF5] rounded-lg border border-[#10B981]/30">
                <div class="flex items-center gap-2">
                  <span class="text-xl">📱</span>
                  <div>
                    <span class="text-xs font-bold text-[#00422B] block">QRIS Non-Tunai</span>
                    <span class="text-[10px] text-[#00422B]/70 font-mono">{{ ownerStore.paymentMethodBreakdown.qrisCount }} transaksi</span>
                  </div>
                </div>
                <span class="text-sm font-extrabold text-[#10B981] font-mono tabular-nums">
                  {{ formatCurrency(ownerStore.paymentMethodBreakdown.qris) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= TAB 2: PENCATATAN BIAYA OPERASIONAL ================= -->
      <div v-if="activeTab === 'expenses'" class="flex flex-col gap-6">
        <!-- Form Input Pengeluaran -->
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="border-b border-[#E2E8F0] pb-3">
            <h2 class="text-base font-extrabold text-[#0F172A]">Catat Pengeluaran Operasional</h2>
            <p class="text-xs text-[#64748B]">Masukkan rincian pengeluaran rutin toko untuk perhitungan laba bersih</p>
          </div>

          <div v-if="expenseSuccessMsg" class="bg-[#ECFDF5] text-[#00422B] p-3 rounded-lg text-xs font-bold border border-[#10B981]">
            {{ expenseSuccessMsg }}
          </div>

          <form @submit.prevent="handleAddExpense" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Kategori Expense</label>
              <select
                v-model="newExpense.category"
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              >
                <option value="Listrik">⚡ Listrik</option>
                <option value="Air">💧 Air / PDAM</option>
                <option value="Gaji">👨‍💼 Gaji Karyawan</option>
                <option value="Operasional">🧼 Operasional (Deterjen, Plastik, dll)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nominal (Rp)</label>
              <input
                v-model.number="newExpense.amount"
                type="number"
                placeholder="Contoh: 150000"
                required
                min="1"
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Tanggal</label>
              <input
                v-model="newExpense.date"
                type="date"
                required
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Catatan Keterangan</label>
              <input
                v-model="newExpense.notes"
                type="text"
                placeholder="Contoh: Pembelian token PLN 100rb"
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div class="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                :disabled="ownerStore.isLoading"
                class="px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm rounded-lg border-b-2 border-[#059669] shadow-md transition-all active:translate-y-[1px] min-h-[48px]"
              >
                + Simpan Pengeluaran
              </button>
            </div>
          </form>
        </div>

        <!-- Tabel Riwayat Pengeluaran -->
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h3 class="text-base font-extrabold text-[#0F172A]">Riwayat Pengeluaran</h3>
            <span class="text-xs text-[#64748B] font-mono">{{ ownerStore.expenses.length }} Record</span>
          </div>

          <div class="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table class="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr class="bg-[#0F172A] text-white text-[11px] font-mono font-bold uppercase tracking-wider h-10">
                  <th class="p-3">Tanggal</th>
                  <th class="p-3">Kategori</th>
                  <th class="p-3">Catatan</th>
                  <th class="p-3 text-right">Nominal</th>
                  <th class="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-xs">
                <tr
                  v-for="(exp, idx) in ownerStore.expenses"
                  :key="exp.id"
                  :class="['transition-colors hover:bg-[#F1F5F9]', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]']"
                >
                  <td class="p-3 font-mono text-[#0F172A] whitespace-nowrap">{{ exp.date }}</td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 bg-slate-100 font-bold rounded text-[11px] text-[#0F172A]">
                      {{ exp.category }}
                    </span>
                  </td>
                  <td class="p-3 text-[#64748B] max-w-[200px] truncate">{{ exp.notes || '-' }}</td>
                  <td class="p-3 text-right font-bold font-mono text-[#F43F5E] tabular-nums whitespace-nowrap">
                    {{ formatCurrency(exp.amount) }}
                  </td>
                  <td class="p-3 text-center">
                    <button
                      @click="handleDeleteExpense(exp.id)"
                      class="text-xs text-[#F43F5E] hover:underline font-bold"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>

                <tr v-if="ownerStore.expenses.length === 0">
                  <td colspan="5" class="p-6 text-center text-xs text-[#64748B]">
                    Belum ada catatan pengeluaran.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB 3: MASTER LAYANAN & HARGA REAL-TIME ================= -->
      <div v-if="activeTab === 'services'" class="flex flex-col gap-6">
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3 flex-wrap gap-2">
            <div>
              <h2 class="text-base font-extrabold text-[#0F172A]">Master Layanan & Harga Real-Time</h2>
              <p class="text-xs text-[#64748B]">
                Perubahan harga berlaku seketika di kasir.
              </p>
            </div>

            <button
              @click="showServiceModal = true"
              class="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-lg border-b-2 border-[#059669] shadow-sm transition-all flex items-center gap-1 active:translate-y-[1px] min-h-[44px]"
            >
              <span>+ Tambah Layanan</span>
            </button>
          </div>

          <!-- Tabel Master Layanan -->
          <div class="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table class="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr class="bg-[#0F172A] text-white text-[11px] font-mono font-bold uppercase tracking-wider h-10">
                  <th class="p-3">Nama Layanan</th>
                  <th class="p-3">Satuan</th>
                  <th class="p-3">Harga Saat Ini</th>
                  <th class="p-3 text-center">Status Aktif</th>
                  <th class="p-3 text-right">Edit Harga</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-xs">
                <tr
                  v-for="(srv, idx) in ownerStore.services"
                  :key="srv.id"
                  :class="['transition-colors hover:bg-[#F1F5F9]', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]']"
                >
                  <td class="p-3">
                    <span class="font-bold text-[#0F172A]">{{ srv.name }}</span>
                  </td>

                  <td class="p-3 font-mono text-[#64748B]">{{ srv.unit }}</td>

                  <td class="p-3 font-bold font-mono text-[#10B981] tabular-nums">
                    {{ formatCurrency(srv.price) }}
                  </td>

                  <td class="p-3 text-center">
                    <button
                      @click="handleToggleService(srv)"
                      :class="[
                        'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all',
                        srv.is_active
                          ? 'bg-[#ECFDF5] text-[#00422B] border border-[#10B981]/30'
                          : 'bg-[#FFF1F2] text-[#9F1239] border border-[#F43F5E]/30'
                      ]"
                    >
                      {{ srv.is_active ? 'Aktif' : 'Non-Aktif' }}
                    </button>
                  </td>

                  <td class="p-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <span class="text-xs text-[#64748B] font-mono">Rp</span>
                      <input
                        :value="srv.price"
                        @change="e => handleUpdateServicePrice(srv, e.target.value)"
                        type="number"
                        step="500"
                        class="w-28 px-2 py-1 bg-white border border-[#CBD5E1] rounded text-xs font-mono font-bold text-right text-[#0F172A] focus:outline-none focus:border-[#10B981]"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB 4: PROMO & PENGATURAN LOYALITAS ================= -->
      <div v-if="activeTab === 'promotions'" class="flex flex-col gap-6">
        <!-- Form Aturan Poin Loyalitas -->
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="border-b border-[#E2E8F0] pb-3">
            <h2 class="text-base font-extrabold text-[#0F172A]">Pengaturan Aturan Poin Loyalitas</h2>
            <p class="text-xs text-[#64748B]">Tentukan rasio transaksi per perolehan poin dan nilai tukar voucher</p>
          </div>

          <div v-if="loyaltySuccessMsg" class="bg-[#ECFDF5] text-[#00422B] p-3 rounded-lg text-xs font-bold border border-[#10B981]">
            {{ loyaltySuccessMsg }}
          </div>

          <form @submit.prevent="handleSaveLoyalty" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nominal per 1 Poin (Rp)</label>
              <input
                v-model.number="loyaltyForm.spend_per_point"
                type="number"
                step="1000"
                required
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
              <span class="text-[10px] text-[#64748B] mt-1 block">Contoh: 10000 (Pelanggan dapat 1 poin tiap kelipatan Rp 10.000)</span>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nilai Tukar 1 Poin (Rp)</label>
              <input
                v-model.number="loyaltyForm.point_redemption_value"
                type="number"
                step="100"
                required
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
              <span class="text-[10px] text-[#64748B] mt-1 block">Contoh: 1000 (1 poin setara potongan Rp 1.000 saat ditukar)</span>
            </div>

            <div class="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                :disabled="ownerStore.isLoading"
                class="px-6 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-lg border-b-2 border-[#059669] shadow-sm transition-all active:translate-y-[1px] min-h-[44px]"
              >
                Simpan Aturan Poin
              </button>
            </div>
          </form>
        </div>

        <!-- Form Pembuatan Voucher Promo -->
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="border-b border-[#E2E8F0] pb-3">
            <h2 class="text-base font-extrabold text-[#0F172A]">Buat Voucher Promo Baru</h2>
            <p class="text-xs text-[#64748B]">Buat kode voucher diskon berperiode untuk meningkatkan penjualan</p>
          </div>

          <div v-if="promoSuccessMsg" class="bg-[#ECFDF5] text-[#00422B] p-3 rounded-lg text-xs font-bold border border-[#10B981]">
            {{ promoSuccessMsg }}
          </div>

          <form @submit.prevent="handleAddPromo" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Kode Voucher</label>
              <input
                v-model="newPromo.code"
                type="text"
                placeholder="Contoh: HEMAT10"
                required
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold uppercase font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Tipe Diskon</label>
              <select
                v-model="newPromo.discount_type"
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              >
                <option value="percentage">Persentase (%)</option>
                <option value="fixed">Nominal Tetap (Rp)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nilai Diskon</label>
              <input
                v-model.number="newPromo.discount_value"
                type="number"
                placeholder="Misal: 10 atau 10000"
                required
                min="1"
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Tanggal Mulai</label>
                <input
                  v-model="newPromo.start_date"
                  type="date"
                  required
                  class="w-full px-2 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A]"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Tanggal Selesai</label>
                <input
                  v-model="newPromo.end_date"
                  type="date"
                  required
                  class="w-full px-2 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A]"
                />
              </div>
            </div>

            <div class="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                :disabled="ownerStore.isLoading"
                class="px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm rounded-lg border-b-2 border-[#059669] shadow-md transition-all active:translate-y-[1px] min-h-[48px]"
              >
                + Buat Voucher Promo
              </button>
            </div>
          </form>
        </div>

        <!-- Tabel Daftar Promo -->
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h3 class="text-base font-extrabold text-[#0F172A]">Daftar Voucher Promo</h3>
            <span class="text-xs text-[#64748B] font-mono">{{ ownerStore.promotions.length }} Promo</span>
          </div>

          <div class="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table class="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr class="bg-[#0F172A] text-white text-[11px] font-mono font-bold uppercase tracking-wider h-10">
                  <th class="p-3">Kode Voucher</th>
                  <th class="p-3">Nilai Diskon</th>
                  <th class="p-3">Periode Berlaku</th>
                  <th class="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-xs">
                <tr
                  v-for="(promo, idx) in ownerStore.promotions"
                  :key="promo.id"
                  :class="['transition-colors hover:bg-[#F1F5F9]', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]']"
                >
                  <td class="p-3 font-mono font-bold text-[#00422B]">
                    <span class="bg-[#ECFDF5] px-2 py-1 rounded border border-[#10B981]/30">
                      🎟️ {{ promo.code }}
                    </span>
                  </td>

                  <td class="p-3 font-bold font-mono text-[#0F172A]">
                    <span v-if="promo.discount_type === 'percentage'">{{ promo.discount_value }}%</span>
                    <span v-else>{{ formatCurrency(promo.discount_value) }}</span>
                  </td>

                  <td class="p-3 text-[#64748B] font-mono text-[11px]">
                    {{ promo.start_date }} s/d {{ promo.end_date }}
                  </td>

                  <td class="p-3 text-center">
                    <button
                      @click="ownerStore.togglePromotionActive(promo.id)"
                      :class="[
                        'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all',
                        promo.is_active
                          ? 'bg-[#ECFDF5] text-[#00422B] border border-[#10B981]/30'
                          : 'bg-[#FFF1F2] text-[#9F1239] border border-[#F43F5E]/30'
                      ]"
                    >
                      {{ promo.is_active ? 'Aktif' : 'Non-Aktif' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB 5: MANAJEMEN STAF ================= -->
      <div v-if="activeTab === 'staff'" class="flex flex-col gap-6">
        <!-- Toast Notifikasi Global Staf -->
        <div v-if="resetSuccessMsg" class="bg-[#ECFDF5] text-[#00422B] p-3.5 rounded-xl text-xs font-bold border border-[#10B981] shadow-xs flex items-center gap-2">
          <span>✅</span>
          <span>{{ resetSuccessMsg }}</span>
        </div>

        <!-- Form Tambah Staf Baru -->
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="border-b border-[#E2E8F0] pb-3">
            <h2 class="text-base font-extrabold text-[#0F172A]">Tambah Staf Kasir Baru</h2>
            <p class="text-xs text-[#64748B]">Buat akun kasir baru untuk mengakses portal kasir toko Anda</p>
          </div>

          <div v-if="staffSuccessMsg" class="bg-[#ECFDF5] text-[#00422B] p-3 rounded-lg text-xs font-bold border border-[#10B981]">
            {{ staffSuccessMsg }}
          </div>

          <form @submit.prevent="handleAddStaff" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nama Lengkap</label>
              <input
                v-model="newStaff.full_name"
                type="text"
                placeholder="Contoh: Andi Wijaya"
                required
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Username</label>
              <input
                v-model="newStaff.username"
                type="text"
                placeholder="Contoh: andi_kasir"
                required
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">PIN / Password Awal</label>
              <input
                v-model="newStaff.password"
                type="password"
                placeholder="••••••••"
                required
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div class="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                class="px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm rounded-lg border-b-2 border-[#059669] shadow-md transition-all active:translate-y-[1px] min-h-[48px]"
              >
                + Tambah Staf Kasir
              </button>
            </div>
          </form>
        </div>

        <!-- Tabel Daftar Staf -->
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 class="text-base font-extrabold text-[#0F172A]">Daftar Staf Kasir</h3>
              <p class="text-xs text-[#64748B]">Kelola hak akses dan status keaktifan akun staf</p>
            </div>
            <span class="text-xs text-[#64748B] font-mono font-bold">{{ staffList.length }} Staf</span>
          </div>

          <div class="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table class="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr class="bg-[#0F172A] text-white text-[11px] font-mono font-bold uppercase tracking-wider h-10">
                  <th class="p-3">Nama Staf</th>
                  <th class="p-3">Username</th>
                  <th class="p-3 text-center">Status</th>
                  <th class="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-xs">
                <tr
                  v-for="(staff, idx) in staffList"
                  :key="staff.id"
                  :class="['transition-colors hover:bg-[#F1F5F9]', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]']"
                >
                  <td class="p-3">
                    <span class="font-bold text-[#0F172A]">{{ staff.name }}</span>
                  </td>

                  <td class="p-3 font-mono text-[#64748B]">
                    <span class="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-[#0F172A]">
                      @{{ staff.username }}
                    </span>
                  </td>

                  <td class="p-3 text-center">
                    <span
                      :class="[
                        'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block',
                        staff.is_active
                          ? 'bg-[#ECFDF5] text-[#00422B] border border-[#10B981]/30'
                          : 'bg-[#FFF1F2] text-[#9F1239] border border-[#F43F5E]/30'
                      ]"
                    >
                      {{ staff.is_active ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </td>

                  <td class="p-3 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="openResetPasswordModal(staff)"
                        class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs rounded-lg transition-all border border-slate-200 active:translate-y-[1px]"
                      >
                        🔑 Edit/Reset Password
                      </button>

                      <button
                        @click="handleToggleStaffStatus(staff)"
                        :class="[
                          'px-2.5 py-1.5 font-bold text-xs rounded-lg transition-all border active:translate-y-[1px]',
                          staff.is_active
                            ? 'bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#9F1239] border-[#F43F5E]/30'
                            : 'bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#00422B] border-[#10B981]/30'
                        ]"
                      >
                        {{ staff.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                      </button>
                    </div>
                  </td>
                </tr>

                <tr v-if="staffList.length === 0">
                  <td colspan="4" class="p-6 text-center text-xs text-[#64748B]">
                    Belum ada data staf kasir.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </main>

    <!-- Modal Form Tambah Layanan Baru -->
    <div
      v-if="showServiceModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      @click.self="showServiceModal = false"
    >
      <div class="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 class="text-lg font-black text-[#0F172A]">Tambah Master Layanan</h3>
            <p class="text-xs text-[#64748B]">Layanan baru akan langsung tersedia di menu kasir</p>
          </div>
          <button
            @click="showServiceModal = false"
            class="w-8 h-8 rounded-full bg-[#F8FAFC] text-[#0F172A] font-bold flex items-center justify-center hover:bg-slate-200 border border-[#E2E8F0]"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleAddService" class="flex flex-col gap-4">
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nama Layanan</label>
            <input
              v-model="newService.name"
              type="text"
              placeholder="Contoh: Cuci Karpet Heavy"
              required
              class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Kategori</label>
              <select
                v-model="newService.category"
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              >
                <option value="kiloan">Kiloan</option>
                <option value="koin">Koin Paket</option>
                <option value="satuan">Satuan</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Satuan</label>
              <select
                v-model="newService.unit"
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              >
                <option value="kg">kg</option>
                <option value="paket">paket</option>
                <option value="pcs">pcs</option>
                <option value="pasang">pasang</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Harga (Rp)</label>
            <input
              v-model.number="newService.price"
              type="number"
              step="500"
              placeholder="Contoh: 15000"
              required
              class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <button
            type="submit"
            :disabled="ownerStore.isLoading"
            class="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-base rounded-lg border-b-2 border-[#059669] shadow-md transition-all active:translate-y-[1px] min-h-[48px]"
          >
            + Simpan Layanan Baru
          </button>
        </form>
      </div>
    </div>

    <!-- Modal Reset Password Staf -->
    <div
      v-if="showResetModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      @click.self="showResetModal = false"
    >
      <div class="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 class="text-lg font-black text-[#0F172A]">Edit / Reset Password Staf</h3>
            <p class="text-xs text-[#64748B]">Atur ulang kata sandi atau PIN untuk akun staf kasir</p>
          </div>
          <button
            @click="showResetModal = false"
            class="w-8 h-8 rounded-full bg-[#F8FAFC] text-[#0F172A] font-bold flex items-center justify-center hover:bg-slate-200 border border-[#E2E8F0]"
          >
            ✕
          </button>
        </div>

        <div v-if="selectedStaffForReset" class="flex flex-col gap-4">
          <div class="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] flex flex-col gap-1">
            <span class="text-xs text-[#64748B] font-bold">Detail Staf:</span>
            <span class="text-sm font-extrabold text-[#0F172A]">{{ selectedStaffForReset.name }}</span>
            <span class="text-xs font-mono text-[#10B981] font-bold">@{{ selectedStaffForReset.username }}</span>
          </div>

          <form @submit.prevent="handleResetPasswordSubmit" class="flex flex-col gap-4">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">PIN / Password Baru</label>
              <input
                v-model="resetPasswordInput"
                type="password"
                placeholder="Masukkan password / PIN baru"
                required
                class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                @click="showResetModal = false"
                class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs rounded-lg border border-slate-200 transition-all min-h-[44px]"
              >
                Batal
              </button>

              <button
                type="submit"
                class="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-lg border-b-2 border-[#059669] shadow-sm transition-all active:translate-y-[1px] min-h-[44px]"
              >
                Simpan Password Baru
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
