<script setup>
import { ref, onMounted, computed } from 'vue'
import { useOwnerStore } from '../stores/useOwnerStore'
import { useAuthStore } from '../stores/useAuthStore'

const ownerStore = useOwnerStore()
const authStore = useAuthStore()

// Tab Active: 'transactions' | 'financial' | 'expenses' | 'services' | 'promotions' | 'staff'
const activeTab = ref('transactions')

// Modal Status Produksi
const showStatusModal = ref(false)
const selectedTxForStatus = ref(null)
const selectedProductionStatus = ref('diproses')

// Modal Void Transaksi
const showVoidModal = ref(false)
const selectedTxForVoid = ref(null)
const voidReasonInput = ref('')

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

// State Manajemen Staf
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

// Format Helpers
function formatCurrency(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

// Handlers Transaksi
function openStatusModal(tx) {
  selectedTxForStatus.value = tx
  selectedProductionStatus.value = tx.production_status || 'diproses'
  showStatusModal.value = true
}

async function handleUpdateStatusSubmit() {
  if (!selectedTxForStatus.value) return
  await ownerStore.updateProductionStatus(selectedTxForStatus.value.id, selectedProductionStatus.value)
  showStatusModal.value = false
  selectedTxForStatus.value = null
}

async function handleMarkAsPaid(tx) {
  if (confirm(`Tandai transaksi #${tx.receipt_number || tx.id} sebagai LUNAS?`)) {
    await ownerStore.markAsPaid(tx.id)
  }
}

function openVoidModal(tx) {
  selectedTxForVoid.value = tx
  voidReasonInput.value = ''
  showVoidModal.value = true
}

async function handleVoidSubmit() {
  if (!voidReasonInput.value.trim()) {
    alert('Harap masukkan alasan pembatalan nota.')
    return
  }
  await ownerStore.voidTransaction(selectedTxForVoid.value.id, voidReasonInput.value.trim())
  showVoidModal.value = false
  selectedTxForVoid.value = null
  voidReasonInput.value = ''
}

function handleSendWA(tx) {
  ownerStore.sendWhatsAppReceipt(tx)
}

// Handlers Branch Switcher
function handleBranchChange(event) {
  const branchId = event.target.value
  ownerStore.setActiveBranch(branchId)
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
      <div class="max-w-6xl mx-auto flex flex-col gap-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">👑</span>
              <h1 class="text-xl font-extrabold tracking-tight">Portal Pemilik (Owner Dashboard)</h1>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              Kelola cabang, transaksi, finansial, beban operasional, dan staf
            </p>
          </div>

          <!-- Branch Switcher & Manual Refresh Button -->
          <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <!-- Branch Switcher Dropdown -->
            <div class="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold w-full sm:w-auto">
              <span class="text-slate-400">🏪 Cabang:</span>
              <select
                :value="ownerStore.activeBranchId"
                @change="handleBranchChange"
                class="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-2"
              >
                <option
                  v-for="branch in ownerStore.branches"
                  :key="branch.id"
                  :value="branch.id"
                  class="bg-[#0F172A] text-white"
                >
                  {{ branch.business_name || branch.name }}
                </option>
              </select>
            </div>

            <!-- Manual Refresh Button -->
            <button
              @click="ownerStore.fetchAllOwnerData"
              :disabled="ownerStore.isLoading"
              class="px-3 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-extrabold border border-[#10B981] transition-all flex items-center gap-1.5 active:translate-y-[1px] shadow-sm ml-auto sm:ml-0"
              title="Muat Ulang Data"
            >
              <span :class="{ 'animate-spin': ownerStore.isLoading }">🔄</span>
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        <!-- Navigasi Tab Utama -->
        <div class="grid grid-cols-2 sm:grid-cols-6 gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 text-xs font-bold mt-1">
          <button
            @click="activeTab = 'transactions'"
            :class="[
              'py-2.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
              activeTab === 'transactions'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            ]"
          >
            <span>📄</span>
            <span>Daftar Transaksi</span>
          </button>

          <button
            @click="activeTab = 'financial'"
            :class="[
              'py-2.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
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
              'py-2.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
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
              'py-2.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
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
              'py-2.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
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
              'py-2.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
              activeTab === 'staff'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            ]"
          >
            <span>👥</span>
            <span>Staf</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Content Body -->
    <main class="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6">

      <!-- ================= TAB 0: DAFTAR TRANSAKSI & KONTROL CABANG ================= -->
      <div v-if="activeTab === 'transactions'" class="flex flex-col gap-6">
        <!-- Filter Bar: Status Chips & Date Range -->
        <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <!-- Filter Status Chips -->
          <div class="flex flex-col gap-1.5 w-full lg:w-auto">
            <span class="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Status Transaksi:</span>
            <div class="flex flex-wrap items-center gap-1.5">
              <button
                @click="ownerStore.statusFilter = 'all'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border',
                  ownerStore.statusFilter === 'all'
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                    : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-slate-100'
                ]"
              >
                Semua
              </button>

              <button
                @click="ownerStore.statusFilter = 'diproses'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border',
                  ownerStore.statusFilter === 'diproses'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                ]"
              >
                🔄 Diproses
              </button>

              <button
                @click="ownerStore.statusFilter = 'siap_diambil'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border',
                  ownerStore.statusFilter === 'siap_diambil'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                ]"
              >
                🧺 Siap Diambil
              </button>

              <button
                @click="ownerStore.statusFilter = 'selesai'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border',
                  ownerStore.statusFilter === 'selesai'
                    ? 'bg-[#10B981] text-white border-[#10B981] shadow-xs'
                    : 'bg-[#ECFDF5] text-[#00422B] border-[#10B981]/30 hover:bg-emerald-100'
                ]"
              >
                ✅ Selesai
              </button>

              <button
                @click="ownerStore.statusFilter = 'void'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border',
                  ownerStore.statusFilter === 'void'
                    ? 'bg-[#F43F5E] text-white border-[#F43F5E] shadow-xs'
                    : 'bg-[#FFF1F2] text-[#9F1239] border-[#F43F5E]/30 hover:bg-rose-100'
                ]"
              >
                🚫 Dibatalkan (Void)
              </button>
            </div>
          </div>

          <!-- Filter Rentang Tanggal -->
          <div class="flex flex-col gap-1.5 w-full lg:w-auto">
            <span class="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Rentang Tanggal:</span>
            <div class="flex flex-wrap items-center gap-1.5">
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
                @click="ownerStore.dateFilter = '7_days'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                  ownerStore.dateFilter === '7_days'
                    ? 'bg-[#10B981] text-white border-[#10B981]'
                    : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-slate-100'
                ]"
              >
                7 Hari
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
        </div>

        <!-- Custom Date Range Inputs -->
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

        <!-- Tabel Transaksi -->
        <div class="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
          <div class="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h3 class="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">Tabel Transaksi Cabang</h3>
              <p class="text-xs text-[#64748B]">Menampilkan {{ ownerStore.filteredTransactions.length }} nota transaksi</p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr class="bg-[#0F172A] text-white text-[11px] font-mono font-bold uppercase tracking-wider h-10">
                  <th class="p-3">No. Nota</th>
                  <th class="p-3">Waktu / Tanggal</th>
                  <th class="p-3">Pelanggan</th>
                  <th class="p-3">Layanan & Jumlah</th>
                  <th class="p-3 text-right">Total Tagihan</th>
                  <th class="p-3 text-center">Metode Bayar</th>
                  <th class="p-3 text-center">Status</th>
                  <th class="p-3 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-xs">
                <tr
                  v-for="(tx, idx) in ownerStore.filteredTransactions"
                  :key="tx.id"
                  :class="[
                    'transition-colors hover:bg-slate-50',
                    tx.is_void ? 'bg-rose-50/50' : (idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]')
                  ]"
                >
                  <!-- No. Nota -->
                  <td class="p-3 font-mono font-bold">
                    <span :class="tx.is_void ? 'line-through text-rose-600' : 'text-[#0F172A]'">
                      {{ tx.receipt_number || tx.id }}
                    </span>
                  </td>

                  <!-- Waktu / Tanggal -->
                  <td class="p-3 text-[#64748B] font-mono text-[11px]">
                    {{ formatDate(tx.created_at || tx.date) }}
                  </td>

                  <!-- Pelanggan -->
                  <td class="p-3">
                    <div class="flex flex-col">
                      <span :class="['font-bold', tx.is_void ? 'line-through text-rose-700' : 'text-[#0F172A]']">
                        {{ tx.customer_name || 'Pelanggan Umum' }}
                      </span>
                      <span class="text-[11px] text-[#64748B] font-mono">
                        {{ tx.customer_phone || '-' }}
                      </span>
                    </div>
                  </td>

                  <!-- Layanan & Jumlah -->
                  <td class="p-3">
                    <div class="flex flex-col gap-0.5">
                      <div v-if="tx.items && tx.items.length > 0">
                        <span v-for="(it, i) in tx.items" :key="i" class="block font-medium text-[#0F172A]">
                          • {{ it.name || it.service_name || 'Layanan' }} ({{ it.qty || it.quantity || 1 }} {{ it.unit || 'kg' }})
                        </span>
                      </div>
                      <div v-else class="text-[#64748B] capitalize">
                        {{ tx.service_type || 'Kiloan' }} ({{ tx.total_kg ? `${tx.total_kg} kg` : (tx.total_coins ? `${tx.total_coins} coin` : '-') }})
                      </div>
                    </div>
                  </td>

                  <!-- Total Tagihan -->
                  <td class="p-3 text-right font-mono font-extrabold text-[#0F172A]">
                    <span :class="{ 'line-through text-rose-600': tx.is_void }">
                      {{ formatCurrency(tx.total_amount) }}
                    </span>
                  </td>

                  <!-- Metode Bayar -->
                  <td class="p-3 text-center">
                    <span class="uppercase font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {{ tx.payment_method || 'CASH' }}
                    </span>
                  </td>

                  <!-- Lencana Status Bayar & Produksi -->
                  <td class="p-3 text-center">
                    <div class="flex flex-col items-center gap-1">
                      <!-- Badge VOID -->
                      <span
                        v-if="tx.is_void"
                        class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFF1F2] text-[#9F1239] border border-[#F43F5E]/40"
                        :title="`Dibatalkan: ${tx.void_reason || 'Tanpa alasan'}`"
                      >
                        🚫 DIBATALKAN
                      </span>

                      <!-- Status Bayar -->
                      <span
                        v-else-if="tx.payment_status === 'paid' || tx.payment_status === 'lunas'"
                        class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#ECFDF5] text-[#00422B] border border-[#10B981]/30"
                      >
                        LUNAS
                      </span>
                      <span
                        v-else
                        class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-300"
                      >
                        BELUM LUNAS
                      </span>

                      <!-- Status Produksi -->
                      <span
                        v-if="!tx.is_void"
                        :class="[
                          'px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-tight',
                          tx.production_status === 'selesai'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : (tx.production_status === 'siap_diambil' || tx.production_status === 'siap')
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                        ]"
                      >
                        {{ tx.production_status || 'Diproses' }}
                      </span>
                    </div>
                  </td>

                  <!-- Kolom Aksi (Action Buttons) -->
                  <td class="p-3 text-center">
                    <div v-if="!tx.is_void" class="flex items-center justify-center gap-1.5 flex-wrap">
                      <!-- Ubah Status Produksi -->
                      <button
                        @click="openStatusModal(tx)"
                        class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-[11px] rounded transition-all border border-slate-300 active:translate-y-[1px]"
                        title="Ubah Status Produksi"
                      >
                        ⚙️ Status
                      </button>

                      <!-- Tandai Lunas -->
                      <button
                        v-if="tx.payment_status !== 'paid' && tx.payment_status !== 'lunas'"
                        @click="handleMarkAsPaid(tx)"
                        class="px-2 py-1 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-[11px] rounded transition-all border border-[#10B981] active:translate-y-[1px]"
                        title="Tandai Nota Lunas"
                      >
                        💵 Lunas
                      </button>

                      <!-- Kirim Struk WA -->
                      <button
                        @click="handleSendWA(tx)"
                        class="px-2 py-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-[11px] rounded transition-all active:translate-y-[1px]"
                        title="Kirim Struk via WhatsApp"
                      >
                        💬 WA
                      </button>

                      <!-- Batalkan Nota (Void) -->
                      <button
                        @click="openVoidModal(tx)"
                        class="px-2 py-1 bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#9F1239] font-bold text-[11px] rounded transition-all border border-[#F43F5E]/30 active:translate-y-[1px]"
                        title="Batalkan Nota (Void)"
                      >
                        🚫 Void
                      </button>
                    </div>

                    <!-- Void Reason detail if voided -->
                    <div v-else class="text-[10px] text-rose-700 italic max-w-[150px] mx-auto text-center">
                      Alasan: {{ tx.void_reason || '-' }}
                    </div>
                  </td>
                </tr>

                <tr v-if="ownerStore.filteredTransactions.length === 0">
                  <td colspan="8" class="p-8 text-center text-xs text-[#64748B]">
                    Tidak ada transaksi ditemukan untuk filter ini.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB 1: RINGKASAN FINANSIAL & LABA BERSIH ================= -->
      <div v-if="activeTab === 'financial'" class="flex flex-col gap-6">
        <!-- Filter Tanggal -->
        <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">Periode Laporan Finansial</h2>
            <p class="text-xs text-[#64748B]">Pilih rentang tanggal untuk analisa performa toko (Dihitung tanpa transaksi Void)</p>
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
              @click="ownerStore.dateFilter = '7_days'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                ownerStore.dateFilter === '7_days'
                  ? 'bg-[#10B981] text-white border-[#10B981]'
                  : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-slate-100'
              ]"
            >
              7 Hari
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Total Omzet -->
          <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between border-l-4 border-l-[#10B981]">
            <div>
              <span class="text-xs font-extrabold uppercase text-[#64748B] tracking-wider">Total Omzet Kotor</span>
              <h3 class="text-2xl font-black font-mono text-[#0F172A] mt-1">
                {{ formatCurrency(ownerStore.totalOmzet) }}
              </h3>
            </div>
            <p class="text-[11px] text-[#64748B] mt-3">Total pemasukan dari transaksi yang sah</p>
          </div>

          <!-- Total Pengeluaran -->
          <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between border-l-4 border-l-[#F43F5E]">
            <div>
              <span class="text-xs font-extrabold uppercase text-[#64748B] tracking-wider">Total Beban Operasional</span>
              <h3 class="text-2xl font-black font-mono text-[#9F1239] mt-1">
                {{ formatCurrency(ownerStore.totalPengeluaran) }}
              </h3>
            </div>
            <p class="text-[11px] text-[#64748B] mt-3">Catatan pengeluaran operasional toko</p>
          </div>

          <!-- Laba Bersih -->
          <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between border-l-4 border-l-blue-500">
            <div>
              <span class="text-xs font-extrabold uppercase text-[#64748B] tracking-wider">Estimasi Laba Bersih</span>
              <h3 class="text-2xl font-black font-mono text-[#0F172A] mt-1">
                {{ formatCurrency(ownerStore.labaBersih) }}
              </h3>
            </div>
            <p class="text-[11px] text-[#64748B] mt-3">Omzet Bersih = Total Omzet - Pengeluaran</p>
          </div>
        </div>

        <!-- Ringkasan Operasional & Metode Bayar -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-3">
            <h3 class="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-2">
              📊 Metrik Volume Operasional
            </h3>
            <div class="grid grid-cols-2 gap-3 pt-1">
              <div class="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                <span class="text-xs text-[#64748B] font-bold block">Total Cuci Kiloan</span>
                <span class="text-xl font-black text-[#0F172A] font-mono">{{ ownerStore.totalKgProcessed }} kg</span>
              </div>

              <div class="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                <span class="text-xs text-[#64748B] font-bold block">Total Koin Terpakai</span>
                <span class="text-xl font-black text-[#0F172A] font-mono">{{ ownerStore.totalCoinsUsed }} paket</span>
              </div>
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-3">
            <h3 class="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-2">
              💳 Breakdown Metode Pembayaran
            </h3>
            <div class="grid grid-cols-2 gap-3 pt-1">
              <div class="bg-[#ECFDF5] p-3 rounded-lg border border-[#10B981]/30">
                <span class="text-xs text-[#00422B] font-bold block">Cash / Tunai</span>
                <span class="text-lg font-black text-[#0F172A] font-mono">{{ formatCurrency(ownerStore.paymentMethodBreakdown.cash) }}</span>
                <span class="text-[11px] text-[#64748B] block mt-0.5">({{ ownerStore.paymentMethodBreakdown.cashCount }} transaksi)</span>
              </div>

              <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <span class="text-xs text-blue-900 font-bold block">QRIS / Non-Tunai</span>
                <span class="text-lg font-black text-[#0F172A] font-mono">{{ formatCurrency(ownerStore.paymentMethodBreakdown.qris) }}</span>
                <span class="text-[11px] text-[#64748B] block mt-0.5">({{ ownerStore.paymentMethodBreakdown.qrisCount }} transaksi)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= TAB 2: CATATAN PENGELUARAN ================= -->
      <div v-if="activeTab === 'expenses'" class="flex flex-col gap-6">
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h2 class="text-base font-extrabold text-[#0F172A] uppercase tracking-wider">Pencatatan Beban Operasional</h2>
              <p class="text-xs text-[#64748B]">Catat pengeluaran toko seperti listrik, air, deterjen, dan gaji staf</p>
            </div>
          </div>

          <!-- Form Tambah Pengeluaran -->
          <form @submit.prevent="handleAddExpense" class="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Kategori</label>
              <select
                v-model="newExpense.category"
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A]"
              >
                <option value="Listrik">⚡ Listrik PLN</option>
                <option value="Air">💧 Air PDAM</option>
                <option value="Operasional">🧼 Operasional & Deterjen</option>
                <option value="Gaji">👥 Gaji Staf</option>
                <option value="Lainnya">📦 Lainnya</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nominal (Rp)</label>
              <input
                v-model.number="newExpense.amount"
                type="number"
                placeholder="0"
                required
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold font-mono text-[#0F172A]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Catatan</label>
              <input
                v-model="newExpense.notes"
                type="text"
                placeholder="Detail pengeluaran..."
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A]"
              />
            </div>

            <div class="flex items-end">
              <button
                type="submit"
                :disabled="ownerStore.isLoading"
                class="w-full py-2 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-lg border-b-2 border-[#059669] shadow-xs transition-all active:translate-y-[1px] min-h-[38px]"
              >
                + Tambah Pengeluaran
              </button>
            </div>
          </form>

          <div v-if="expenseSuccessMsg" class="p-3 bg-[#ECFDF5] text-[#00422B] text-xs font-bold rounded-lg border border-[#10B981]/30">
            {{ expenseSuccessMsg }}
          </div>

          <!-- Tabel Pengeluaran -->
          <div class="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table class="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr class="bg-[#0F172A] text-white text-[11px] font-mono font-bold uppercase tracking-wider h-10">
                  <th class="p-3">Tanggal</th>
                  <th class="p-3">Kategori</th>
                  <th class="p-3">Catatan</th>
                  <th class="p-3 text-right">Jumlah</th>
                  <th class="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-xs">
                <tr
                  v-for="(exp, idx) in ownerStore.filteredExpenses"
                  :key="exp.id"
                  :class="['transition-colors hover:bg-slate-50', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]']"
                >
                  <td class="p-3 font-mono text-[#64748B]">{{ exp.date || exp.created_at?.slice(0, 10) }}</td>
                  <td class="p-3 font-bold text-[#0F172A]">{{ exp.category }}</td>
                  <td class="p-3 text-[#64748B]">{{ exp.notes || '-' }}</td>
                  <td class="p-3 text-right font-mono font-extrabold text-[#9F1239]">
                    {{ formatCurrency(exp.amount) }}
                  </td>
                  <td class="p-3 text-center">
                    <button
                      @click="handleDeleteExpense(exp.id)"
                      class="px-2 py-1 bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#9F1239] font-bold text-[10px] rounded border border-[#F43F5E]/30"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>

                <tr v-if="ownerStore.filteredExpenses.length === 0">
                  <td colspan="5" class="p-6 text-center text-xs text-[#64748B]">
                    Belum ada data pengeluaran pada periode ini.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB 3: TARIF LAYANAN ================= -->
      <div v-if="activeTab === 'services'" class="flex flex-col gap-6">
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h2 class="text-base font-extrabold text-[#0F172A] uppercase tracking-wider">Master Layanan & Tarif</h2>
              <p class="text-xs text-[#64748B]">Atur jenis layanan, harga per kg/paket/pcs, dan status aktif layanan</p>
            </div>
            <button
              @click="showServiceModal = true"
              class="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-extrabold rounded-lg border-b-2 border-[#059669] transition-all active:translate-y-[1px]"
            >
              + Tambah Layanan
            </button>
          </div>

          <!-- Tabel Layanan -->
          <div class="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table class="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr class="bg-[#0F172A] text-white text-[11px] font-mono font-bold uppercase tracking-wider h-10">
                  <th class="p-3">Nama Layanan</th>
                  <th class="p-3">Kategori</th>
                  <th class="p-3">Satuan</th>
                  <th class="p-3 text-right">Harga (Rp)</th>
                  <th class="p-3 text-center">Status</th>
                  <th class="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-xs">
                <tr
                  v-for="(srv, idx) in ownerStore.services"
                  :key="srv.id"
                  :class="['transition-colors hover:bg-slate-50', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]']"
                >
                  <td class="p-3 font-extrabold text-[#0F172A]">{{ srv.name }}</td>
                  <td class="p-3 uppercase font-mono text-[11px] text-[#64748B]">{{ srv.category }}</td>
                  <td class="p-3 font-mono text-[#64748B]">{{ srv.unit }}</td>
                  <td class="p-3 text-right">
                    <input
                      :value="srv.price"
                      @change="e => handleUpdateServicePrice(srv, e.target.value)"
                      type="number"
                      step="500"
                      class="w-28 px-2 py-1 bg-white border border-[#E2E8F0] rounded text-right font-mono font-extrabold text-[#0F172A]"
                    />
                  </td>
                  <td class="p-3 text-center">
                    <span
                      :class="[
                        'px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase',
                        srv.is_active
                          ? 'bg-[#ECFDF5] text-[#00422B] border border-[#10B981]/30'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      ]"
                    >
                      {{ srv.is_active ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <button
                      @click="handleToggleService(srv)"
                      :class="[
                        'px-2.5 py-1 rounded text-[10px] font-bold border transition-all active:translate-y-[1px]',
                        srv.is_active
                          ? 'bg-[#FFF1F2] text-[#9F1239] border-[#F43F5E]/30 hover:bg-[#FFE4E6]'
                          : 'bg-[#ECFDF5] text-[#00422B] border-[#10B981]/30 hover:bg-[#D1FAE5]'
                      ]"
                    >
                      {{ srv.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB 4: PROMO & POIN LOYALITAS ================= -->
      <div v-if="activeTab === 'promotions'" class="flex flex-col gap-6">
        <!-- Pengaturan Poin Loyalitas -->
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <h2 class="text-base font-extrabold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-2">
            ⭐ Pengaturan Aturan Poin Loyalitas
          </h2>

          <form @submit.prevent="handleSaveLoyalty" class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nominal Transaksi / 1 Poin</label>
              <input
                v-model.number="loyaltyForm.spend_per_point"
                type="number"
                step="1000"
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold font-mono text-[#0F172A]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nilai Tukar 1 Poin (Rp)</label>
              <input
                v-model.number="loyaltyForm.point_redemption_value"
                type="number"
                step="100"
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold font-mono text-[#0F172A]"
              />
            </div>

            <div class="flex items-end">
              <button
                type="submit"
                :disabled="ownerStore.isLoading"
                class="w-full py-2 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-lg border-b-2 border-[#059669] shadow-xs transition-all active:translate-y-[1px] min-h-[38px]"
              >
                Simpan Aturan Poin
              </button>
            </div>
          </form>

          <div v-if="loyaltySuccessMsg" class="p-3 bg-[#ECFDF5] text-[#00422B] text-xs font-bold rounded-lg border border-[#10B981]/30">
            {{ loyaltySuccessMsg }}
          </div>
        </div>

        <!-- Manajemen Voucher Promo -->
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <h2 class="text-base font-extrabold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-2">
            🎁 Buat Voucher Promo
          </h2>

          <form @submit.prevent="handleAddPromo" class="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Kode Voucher</label>
              <input
                v-model="newPromo.code"
                type="text"
                placeholder="BERSIH10"
                required
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold uppercase text-[#0F172A]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Tipe Diskon</label>
              <select
                v-model="newPromo.discount_type"
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A]"
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
                placeholder="10"
                required
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold font-mono text-[#0F172A]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Berlaku s/d</label>
              <input
                v-model="newPromo.end_date"
                type="date"
                required
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A]"
              />
            </div>

            <div class="flex items-end">
              <button
                type="submit"
                :disabled="ownerStore.isLoading"
                class="w-full py-2 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-lg border-b-2 border-[#059669] shadow-xs transition-all active:translate-y-[1px] min-h-[38px]"
              >
                + Buat Voucher
              </button>
            </div>
          </form>

          <div v-if="promoSuccessMsg" class="p-3 bg-[#ECFDF5] text-[#00422B] text-xs font-bold rounded-lg border border-[#10B981]/30">
            {{ promoSuccessMsg }}
          </div>

          <!-- Tabel Voucher -->
          <div class="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table class="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr class="bg-[#0F172A] text-white text-[11px] font-mono font-bold uppercase tracking-wider h-10">
                  <th class="p-3">Kode Promo</th>
                  <th class="p-3">Nilai Diskon</th>
                  <th class="p-3">Berlaku Sampai</th>
                  <th class="p-3 text-center">Status</th>
                  <th class="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-xs">
                <tr
                  v-for="(p, idx) in ownerStore.promotions"
                  :key="p.id"
                  :class="['transition-colors hover:bg-slate-50', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]']"
                >
                  <td class="p-3 font-mono font-black text-[#0F172A]">{{ p.code }}</td>
                  <td class="p-3 font-bold text-[#0F172A]">
                    {{ p.discount_type === 'percentage' ? `${p.discount_value}%` : formatCurrency(p.discount_value) }}
                  </td>
                  <td class="p-3 font-mono text-[#64748B]">{{ p.end_date }}</td>
                  <td class="p-3 text-center">
                    <span
                      :class="[
                        'px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase',
                        p.is_active
                          ? 'bg-[#ECFDF5] text-[#00422B] border border-[#10B981]/30'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      ]"
                    >
                      {{ p.is_active ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <button
                      @click="ownerStore.togglePromotionActive(p.id)"
                      class="px-2.5 py-1 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 transition-all active:translate-y-[1px]"
                    >
                      Toggle Status
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
        <div class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-5">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h2 class="text-base font-extrabold text-[#0F172A] uppercase tracking-wider">Manajemen Staf Kasir</h2>
              <p class="text-xs text-[#64748B]">Kelola hak akses, tambah staf kasir baru, dan reset password staf</p>
            </div>
          </div>

          <!-- Form Tambah Staf -->
          <form @submit.prevent="handleAddStaff" class="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nama Lengkap</label>
              <input
                v-model="newStaff.full_name"
                type="text"
                placeholder="Contoh: Siti Rahma"
                required
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Username Staf</label>
              <input
                v-model="newStaff.username"
                type="text"
                placeholder="siti_kasir"
                required
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold font-mono text-[#0F172A]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">PIN / Password Awal</label>
              <input
                v-model="newStaff.password"
                type="password"
                placeholder="******"
                required
                class="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A]"
              />
            </div>

            <div class="flex items-end">
              <button
                type="submit"
                class="w-full py-2 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-lg border-b-2 border-[#059669] shadow-xs transition-all active:translate-y-[1px] min-h-[38px]"
              >
                + Tambah Staf Baru
              </button>
            </div>
          </form>

          <div v-if="staffSuccessMsg" class="p-3 bg-[#ECFDF5] text-[#00422B] text-xs font-bold rounded-lg border border-[#10B981]/30">
            {{ staffSuccessMsg }}
          </div>

          <!-- Tabel Staf Kasir -->
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
                        🔑 Reset Password
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

    <!-- Modal Status Produksi -->
    <div
      v-if="showStatusModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      @click.self="showStatusModal = false"
    >
      <div class="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl flex flex-col gap-4 border border-[#E2E8F0]">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <h3 class="text-base font-black text-[#0F172A]">Ubah Status Produksi</h3>
          <button @click="showStatusModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        <div v-if="selectedTxForStatus" class="flex flex-col gap-3">
          <p class="text-xs text-[#64748B]">
            Pilih status pengerjaan untuk Nota <span class="font-mono font-bold text-[#0F172A]">#{{ selectedTxForStatus.receipt_number || selectedTxForStatus.id }}</span>:
          </p>

          <select
            v-model="selectedProductionStatus"
            class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-extrabold text-[#0F172A]"
          >
            <option value="diproses">🔄 Diproses (Pencucian/Pengeringan)</option>
            <option value="siap_diambil">🧺 Siap Diambil</option>
            <option value="selesai">✅ Selesai (Sudah Diambil)</option>
          </select>

          <div class="flex justify-end gap-2 pt-2">
            <button
              @click="showStatusModal = false"
              class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200"
            >
              Batal
            </button>
            <button
              @click="handleUpdateStatusSubmit"
              class="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-lg border-b-2 border-[#059669]"
            >
              Simpan Status
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Batalkan Transaksi (Soft Void) -->
    <div
      v-if="showVoidModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      @click.self="showVoidModal = false"
    >
      <div class="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl flex flex-col gap-4 border border-[#E2E8F0]">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">🚫</span>
            <h3 class="text-base font-black text-[#9F1239]">Batalkan Nota (Void)</h3>
          </div>
          <button @click="showVoidModal = false" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        <div v-if="selectedTxForVoid" class="flex flex-col gap-4">
          <div class="bg-rose-50 p-3 rounded-lg border border-rose-200 text-xs text-rose-900">
            Anda akan membatalkan Nota <span class="font-mono font-bold">#{{ selectedTxForVoid.receipt_number || selectedTxForVoid.id }}</span> senilai <span class="font-mono font-bold">{{ formatCurrency(selectedTxForVoid.total_amount) }}</span>.
            Nilai nota ini akan dikeluarkan dari perhitungan omzet dan laba bersih.
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Alasan Pembatalan <span class="text-rose-500">*</span></label>
            <textarea
              v-model="voidReasonInput"
              rows="3"
              placeholder="Contoh: Salah input berat pakaian, pelanggan membatalkan pesanan..."
              required
              class="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A] focus:outline-none focus:border-rose-500"
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-1">
            <button
              @click="showVoidModal = false"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200"
            >
              Batal
            </button>
            <button
              @click="handleVoidSubmit"
              class="px-4 py-2 bg-[#F43F5E] hover:bg-[#E11D48] text-white font-extrabold text-xs rounded-lg border-b-2 border-[#9F1239]"
            >
              Konfirmasi Void Nota
            </button>
          </div>
        </div>
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
