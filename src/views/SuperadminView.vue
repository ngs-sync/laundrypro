<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { useSuperadminStore } from '../stores/useSuperadminStore'

const router = useRouter()
const authStore = useAuthStore()
const superadminStore = useSuperadminStore()

// Tab Navigation State: 'directory' | 'plans'
const activeTab = ref('directory')

// Modals State
const showCreateModal = ref(false)
const showSuccessModal = ref(false)
const showEditModal = ref(false)
const showEditPlanModal = ref(false)
const showInvoiceModal = ref(false)

// Registration Form State
const newTenant = ref({
  business_name: '',
  tenant_code: '',
  phone_number: '',
  plan_id: '',
  subscription_status: 'active',
  billing_type: 'monthly',
  wallet_balance: 0,
  owner_name: '',
  owner_username: '',
  owner_password: ''
})

// Registration Success Data State
const registeredSuccessData = ref(null)

// Edit Tenant Form State
const editingTenant = ref({
  id: '',
  business_name: '',
  tenant_code: '',
  phone_number: '',
  plan_id: '',
  subscription_status: 'active',
  wallet_balance: 0
})

// Edit Plan Form State
const editingPlan = ref({
  id: '',
  name: '',
  plan_code: '',
  price: 0,
  price_per_order: 0,
  order_quota: 0,
  billing_type: 'monthly'
})

// Invoice Modal State
const selectedInvoiceTenantId = ref('')
const selectedInvoicePackage = ref('Growth')
const invoiceAmount = ref(300000)
const today = new Date()
const defaultDueDate = new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0]
const dueDate = ref(defaultDueDate)

const packagesInfo = {
  Starter: { name: 'Starter', price: 0, desc: '50 Nota / Bulan' },
  Growth: { name: 'Pro (Rame)', price: 50000, desc: 'Kuota Tanpa Batas' },
  Business: { name: 'Business (Multi)', price: 150000, desc: 'Multi Outlet & Staf' },
  PayAsYouGo: { name: 'Pay-as-You-Go', price: 250, desc: 'Rp 250 / order' }
}

// Computeds
const totalActiveStores = computed(() => {
  return superadminStore.tenants.filter(t => t.subscription_status === 'active' || t.subscription_status === 'trial').length
})

const totalTenantsCount = computed(() => superadminStore.tenants.length)

// Life Cycle
onMounted(async () => {
  await Promise.all([
    superadminStore.fetchPlans(),
    superadminStore.fetchTenants()
  ])
  if (superadminStore.plans.length > 0 && !newTenant.value.plan_id) {
    newTenant.value.plan_id = superadminStore.plans[0].id
  }
})

// Helper Functions
function formatCurrency(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val || 0)
}

function formatPhoneForWA(phone) {
  if (!phone) return ''
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  }
  return cleaned
}

function getStatusBadgeClass(status) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'active') {
    return 'bg-[#ECFDF5] text-[#00422B] border border-[#10B981]/30'
  } else if (normalized === 'trial') {
    return 'bg-[#FFFBEB] text-[#78350F] border border-[#F59E0B]/30'
  } else {
    return 'bg-[#FFF1F2] text-[#9F1239] border border-[#F43F5E]/30'
  }
}

function getStatusDotClass(status) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'active') return 'bg-[#10B981]'
  if (normalized === 'trial') return 'bg-[#F59E0B]'
  return 'bg-[#F43F5E]'
}

// Action Handlers
function openCreateModal() {
  if (superadminStore.plans.length > 0) {
    newTenant.value.plan_id = superadminStore.plans[0].id
  }
  const randomCode = 'LAUN' + Math.floor(100 + Math.random() * 900)
  newTenant.value.tenant_code = randomCode
  newTenant.value.owner_username = 'owner_' + randomCode.toLowerCase()
  showCreateModal.value = true
}

async function handleCreateTenant() {
  if (!newTenant.value.business_name || !newTenant.value.tenant_code) {
    alert('Nama toko dan kode toko wajib diisi!')
    return
  }

  try {
    const result = await superadminStore.createTenant(newTenant.value)
    registeredSuccessData.value = result
    showCreateModal.value = false
    showSuccessModal.value = true

    // Reset Form
    newTenant.value = {
      business_name: '',
      tenant_code: '',
      phone_number: '',
      plan_id: superadminStore.plans[0]?.id || '',
      subscription_status: 'active',
      billing_type: 'monthly',
      wallet_balance: 0,
      owner_name: '',
      owner_username: '',
      owner_password: ''
    }
  } catch (err) {
    alert('Gagal mendaftarkan toko: ' + (err.message || 'Terjadi kesalahan'))
  }
}

function sendAccountToWA() {
  if (!registeredSuccessData.value) return

  const { tenant, owner, initialPassword } = registeredSuccessData.value
  const phone = formatPhoneForWA(tenant.phone_number)

  const msg = `Halo *${tenant.business_name}*,\n\nSelamat! Akun toko *LaundryPro SaaS* Anda telah berhasil didaftarkan.\n\nBerikut adalah kredensial login Anda:\n🏢 *Kode Toko:* ${tenant.tenant_code}\n👤 *Username:* ${owner.username}\n🔑 *Password:* ${initialPassword}\n\nSilakan login melalui portal:\n🌐 https://laundrypro.app/login\n\nSelamat mengelola operasional laundry Anda lebih efisien bersama *LaundryPro*! 🚀`

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank')
  showSuccessModal.value = false
}

function openEditModal(tenant) {
  editingTenant.value = {
    id: tenant.id,
    business_name: tenant.business_name,
    tenant_code: tenant.tenant_code,
    phone_number: tenant.phone_number,
    plan_id: tenant.plan_id,
    subscription_status: tenant.subscription_status || 'active',
    wallet_balance: tenant.wallet_balance || 0
  }
  showEditModal.value = true
}

async function handleUpdateTenant() {
  try {
    await superadminStore.updateTenant(editingTenant.value.id, {
      subscription_status: editingTenant.value.subscription_status,
      plan_id: editingTenant.value.plan_id,
      wallet_balance: editingTenant.value.wallet_balance
    })
    showEditModal.value = false
  } catch (err) {
    alert('Gagal memperbarui toko: ' + err.message)
  }
}

async function handleSoftDelete(tenant) {
  if (confirm(`Apakah Anda yakin ingin menonaktifkan (soft delete) toko "${tenant.business_name}"?`)) {
    try {
      await superadminStore.softDeleteTenant(tenant.id)
    } catch (err) {
      alert('Gagal menonaktifkan toko: ' + err.message)
    }
  }
}

function handleImpersonate(tenant) {
  const tenantForImpersonation = {
    id: tenant.id,
    name: tenant.business_name,
    phone: tenant.phone_number,
    status: tenant.subscription_status,
    quotaUsed: 0,
    quotaLimit: tenant.subscription_plans?.order_quota || 500
  }
  authStore.impersonateTenant(tenantForImpersonation, router)
}

function openEditPlanModal(plan) {
  editingPlan.value = {
    id: plan.id,
    name: plan.name,
    plan_code: plan.plan_code,
    price: plan.price,
    price_per_order: plan.price_per_order || 0,
    order_quota: plan.order_quota || 0,
    billing_type: plan.billing_type
  }
  showEditPlanModal.value = true
}

async function handleUpdatePlan() {
  try {
    await superadminStore.updatePlan(editingPlan.value.id, {
      price: editingPlan.value.price,
      price_per_order: editingPlan.value.price_per_order,
      order_quota: editingPlan.value.order_quota
    })
    showEditPlanModal.value = false
  } catch (err) {
    alert('Gagal memperbarui paket: ' + err.message)
  }
}

// Invoice Modal Handlers
function openInvoiceModal() {
  if (superadminStore.tenants.length > 0) {
    selectedInvoiceTenantId.value = superadminStore.tenants[0].id
  }
  showInvoiceModal.value = true
}

function sendInvoiceViaWA() {
  const tenant = superadminStore.tenants.find(t => t.id === selectedInvoiceTenantId.value) || superadminStore.tenants[0]
  if (!tenant) return

  const formattedPhone = formatPhoneForWA(tenant.phone_number)
  const formattedAmount = formatCurrency(invoiceAmount.value)
  const formattedDate = new Date(dueDate.value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const messageText = `Halo *${tenant.business_name}*,\n\nBerikut adalah Tagihan Langganan *LaundryPro SaaS* Anda:\n\n📦 *Paket:* ${selectedInvoicePackage.value}\n💵 *Total Tagihan:* ${formattedAmount}\n📅 *Jatuh Tempo:* ${formattedDate}\n\nSilakan lakukan pembayaran transfer ke:\n🏦 *Bank BCA:* 123-456-7890 a/n LaundryPro SaaS\n\nSetelah melakukan pembayaran, mohon konfirmasi balasan pesan ini dengan menyertakan bukti transfer.\n\nTerima kasih telah mempercayakan operasional toko Anda pada *LaundryPro*! 🚀`

  const encodedUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
  window.open(encodedUrl, '_blank')
  showInvoiceModal.value = false
}
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-12">
    <!-- Header Superadmin -->
    <header class="bg-[#0F172A] text-white py-4 px-6 shadow-md border-b border-slate-800">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center font-black text-xl text-white shadow-sm">
            ⚡
          </div>
          <div>
            <h1 class="text-lg font-black tracking-tight">LaundryPro Superadmin</h1>
            <p class="text-[11px] text-slate-400">Portal Manajemen SaaS, Direktori Toko & Master Pricing</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="router.push('/')"
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 min-h-[36px]"
          >
            <span>🖥️</span>
            <span>Ke Kasir</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="max-w-6xl mx-auto px-4 mt-6 flex flex-col gap-6">

      <!-- Metrics Cards Summary -->
      <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-1">
          <div class="flex items-center justify-between text-[#64748B]">
            <span class="text-xs font-bold uppercase tracking-wider">Toko Aktif / Trial</span>
            <span class="text-base">🏬</span>
          </div>
          <span class="text-2xl font-black font-mono tabular-nums text-[#10B981]">{{ totalActiveStores }}</span>
          <span class="text-[10px] text-[#64748B] font-medium">Dari total {{ totalTenantsCount }} toko</span>
        </div>

        <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-1">
          <div class="flex items-center justify-between text-[#64748B]">
            <span class="text-xs font-bold uppercase tracking-wider">Total Paket Langganan</span>
            <span class="text-base">📦</span>
          </div>
          <span class="text-2xl font-black font-mono tabular-nums text-[#0F172A]">{{ superadminStore.plans.length }}</span>
          <span class="text-[10px] text-[#64748B] font-medium">Paket SaaS aktif</span>
        </div>

        <div class="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-1">
          <div class="flex items-center justify-between text-[#64748B]">
            <span class="text-xs font-bold uppercase tracking-wider">Aksi Cepat SaaS</span>
            <span class="text-base">💳</span>
          </div>
          <button
            @click="openInvoiceModal"
            class="mt-1 w-full py-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold rounded-lg border-b-2 border-[#059669] transition-all flex items-center justify-center gap-1 active:translate-y-[1px]"
          >
            <span>+</span>
            <span>Buat Invoice Tagihan</span>
          </button>
        </div>
      </section>

      <!-- Tab Switcher Navigation -->
      <div class="flex items-center border-b border-[#E2E8F0] bg-white rounded-xl p-1.5 shadow-xs border">
        <button
          @click="activeTab = 'directory'"
          :class="[
            'flex-1 py-2.5 px-4 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-2',
            activeTab === 'directory'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          ]"
        >
          <span>🏬</span>
          <span>[Direktori Toko]</span>
        </button>

        <button
          @click="activeTab = 'plans'"
          :class="[
            'flex-1 py-2.5 px-4 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-2',
            activeTab === 'plans'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          ]"
        >
          <span>🏷️</span>
          <span>[Master Paket Langganan]</span>
        </button>
      </div>

      <!-- TAB 1: DIREKTORI TOKO -->
      <div v-if="activeTab === 'directory'" class="flex flex-col gap-4">
        <section class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="flex items-center justify-between flex-wrap gap-3 border-b border-[#E2E8F0] pb-3">
            <div>
              <h2 class="text-base font-black text-[#0F172A] flex items-center gap-2">
                <span>🏢</span>
                <span>Direktori Tenant Toko</span>
              </h2>
              <p class="text-xs text-[#64748B]">Kelola status toko, paket, saldo wallet, dan impersonasi akun</p>
            </div>

            <button
              @click="openCreateModal"
              class="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-lg border-b-2 border-[#059669] shadow-sm transition-all flex items-center gap-1.5 active:translate-y-[2px] min-h-[44px]"
            >
              <span>+</span>
              <span>Daftarkan Toko Baru</span>
            </button>
          </div>

          <!-- Tabel Direktori Toko -->
          <div class="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table class="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr class="bg-[#0F172A] text-white text-[11px] font-mono font-bold uppercase tracking-wider h-11">
                  <th class="p-3">Nama & Kode Toko</th>
                  <th class="p-3">WhatsApp Kontak</th>
                  <th class="p-3">Paket & Saldo Wallet</th>
                  <th class="p-3">Status</th>
                  <th class="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-xs">
                <tr
                  v-for="(tenant, idx) in superadminStore.tenants"
                  :key="tenant.id"
                  :class="['transition-colors hover:bg-[#F1F5F9]', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]']"
                >
                  <!-- Nama & Kode Toko -->
                  <td class="p-3">
                    <div class="font-bold text-[#0F172A] text-sm">{{ tenant.business_name }}</div>
                    <div class="text-[11px] text-[#64748B] font-mono flex items-center gap-2 mt-0.5">
                      <span class="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">
                        {{ tenant.tenant_code }}
                      </span>
                      <span class="text-[10px]">ID: {{ tenant.id.slice(0, 8) }}...</span>
                    </div>
                  </td>

                  <!-- Kontak WA -->
                  <td class="p-3 font-mono text-[#0F172A]">
                    <a
                      :href="`https://wa.me/${formatPhoneForWA(tenant.phone_number)}`"
                      target="_blank"
                      class="text-[#10B981] hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>💬</span>
                      <span>{{ tenant.phone_number || '-' }}</span>
                    </a>
                  </td>

                  <!-- Paket & Saldo Wallet -->
                  <td class="p-3">
                    <div class="font-bold text-[#0F172A]">
                      {{ tenant.subscription_plans?.name || 'Starter (Gratis)' }}
                    </div>
                    <div class="text-[11px] text-[#64748B] font-mono tabular-nums">
                      Saldo Wallet: <span class="font-bold text-[#10B981]">{{ formatCurrency(tenant.wallet_balance) }}</span>
                    </div>
                  </td>

                  <!-- Status Badge -->
                  <td class="p-3">
                    <span
                      :class="[
                        'px-2.5 py-1 rounded text-[11px] font-bold font-mono inline-flex items-center gap-1 uppercase',
                        getStatusBadgeClass(tenant.subscription_status)
                      ]"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="getStatusDotClass(tenant.subscription_status)"></span>
                      <span>{{ tenant.subscription_status || 'active' }}</span>
                    </span>
                  </td>

                  <!-- Tombol Aksi (Edit, Impersonate, Soft Delete) -->
                  <td class="p-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <!-- Edit Button -->
                      <button
                        @click="openEditModal(tenant)"
                        title="Edit Tenant"
                        class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs rounded border border-slate-300 active:translate-y-[1px] transition-all flex items-center gap-1 min-h-[36px]"
                      >
                        <span>✏️</span>
                        <span>Edit</span>
                      </button>

                      <!-- Impersonate Button -->
                      <button
                        @click="handleImpersonate(tenant)"
                        title="Impersonate Toko"
                        class="px-2.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded border-b-2 border-slate-700 active:translate-y-[1px] transition-all flex items-center gap-1 min-h-[36px]"
                      >
                        <span>🔑</span>
                        <span>Masuk</span>
                      </button>

                      <!-- Soft Delete Button -->
                      <button
                        @click="handleSoftDelete(tenant)"
                        title="Nonaktifkan (Soft Delete)"
                        class="px-2.5 py-1.5 bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#F43F5E] font-bold text-xs rounded border border-[#F43F5E]/30 active:translate-y-[1px] transition-all flex items-center gap-1 min-h-[36px]"
                      >
                        <span>🗑️</span>
                        <span>Nonaktifkan</span>
                      </button>
                    </div>
                  </td>
                </tr>

                <tr v-if="superadminStore.tenants.length === 0">
                  <td colspan="5" class="p-8 text-center text-[#64748B]">
                    Belum ada data toko terdaftar. Klik "+ Daftarkan Toko Baru" untuk menambahkan.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- TAB 2: MASTER PAKET LANGGANAN -->
      <div v-if="activeTab === 'plans'" class="flex flex-col gap-4">
        <section class="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="border-b border-[#E2E8F0] pb-3">
            <h2 class="text-base font-black text-[#0F172A] flex items-center gap-2">
              <span>🏷️</span>
              <span>Master Paket Langganan & Pricing</span>
            </h2>
            <p class="text-xs text-[#64748B]">Atur nominal harga bulanan, kuota order, dan skema Pay-as-You-Go SaaS</p>
          </div>

          <!-- Grid 4 Kartu Paket -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              v-for="plan in superadminStore.plans"
              :key="plan.id"
              class="bg-white border-2 border-[#E2E8F0] hover:border-[#10B981] transition-all rounded-xl p-5 flex flex-col justify-between gap-4 shadow-xs relative group"
            >
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-mono font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    {{ plan.plan_code }}
                  </span>
                  <span class="w-2 h-2 rounded-full" :class="plan.is_active ? 'bg-[#10B981]' : 'bg-slate-300'"></span>
                </div>

                <h3 class="text-base font-black text-[#0F172A] mt-1">{{ plan.name }}</h3>

                <!-- Price display -->
                <div class="my-2">
                  <div v-if="plan.billing_type === 'pay_as_you_go'" class="flex flex-col">
                    <span class="text-2xl font-black text-[#10B981] font-mono tabular-nums">
                      {{ formatCurrency(plan.price_per_order) }}
                    </span>
                    <span class="text-[11px] text-[#64748B] font-bold">/ order transaksi</span>
                  </div>
                  <div v-else class="flex flex-col">
                    <span class="text-2xl font-black text-[#0F172A] font-mono tabular-nums">
                      {{ formatCurrency(plan.price) }}
                    </span>
                    <span class="text-[11px] text-[#64748B] font-bold">/ bulan</span>
                  </div>
                </div>

                <!-- Features Details -->
                <div class="text-xs text-[#64748B] flex flex-col gap-1 border-t border-slate-100 pt-3">
                  <div class="flex items-center justify-between">
                    <span>Kuota Nota:</span>
                    <span class="font-bold text-[#0F172A]">
                      {{ plan.order_quota > 0 ? plan.order_quota + ' /bln' : 'Tanpa Batas' }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span>Max Outlet:</span>
                    <span class="font-bold text-[#0F172A]">{{ plan.max_outlets }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span>Max Staf:</span>
                    <span class="font-bold text-[#0F172A]">{{ plan.max_staff }}</span>
                  </div>
                </div>
              </div>

              <!-- Action Edit Price -->
              <button
                @click="openEditPlanModal(plan)"
                class="w-full py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-lg border-b-2 border-slate-700 transition-all flex items-center justify-center gap-1.5 active:translate-y-[1px] min-h-[40px]"
              >
                <span>✏️</span>
                <span>Edit Nominal Harga</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- MODAL 1: DAFTARKAN TOKO BARU -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      @click.self="showCreateModal = false"
    >
      <div class="bg-white w-full max-w-lg rounded-xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 class="text-lg font-black text-[#0F172A]">Daftarkan Toko Baru</h3>
            <p class="text-xs text-[#64748B]">Buat tenant baru beserta akun owner pengelolanya</p>
          </div>
          <button
            @click="showCreateModal = false"
            class="w-8 h-8 rounded-full bg-[#F8FAFC] text-[#0F172A] font-bold flex items-center justify-center hover:bg-slate-200 border border-[#E2E8F0]"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleCreateTenant" class="flex flex-col gap-4">
          <!-- Nama Toko -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nama Toko *</label>
            <input
              v-model="newTenant.business_name"
              type="text"
              required
              placeholder="Contoh: Fresh Laundry Pasteur"
              class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <!-- Kode Toko Manual & No WA -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Kode Toko Manual *</label>
              <input
                v-model="newTenant.tenant_code"
                type="text"
                required
                placeholder="LAUN001"
                class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-mono font-bold uppercase text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">No WhatsApp Owner *</label>
              <input
                v-model="newTenant.phone_number"
                type="text"
                required
                placeholder="081234567890"
                class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          <!-- Pilihan Paket & Status Awal -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Pilihan Paket Langganan</label>
              <select
                v-model="newTenant.plan_id"
                class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              >
                <option v-for="plan in superadminStore.plans" :key="plan.id" :value="plan.id">
                  {{ plan.name }} ({{ formatCurrency(plan.price) }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Status Awal Toko</label>
              <select
                v-model="newTenant.subscription_status"
                class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <!-- Saldo Wallet Awal -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Saldo Wallet Awal (Rp)</label>
            <input
              v-model.number="newTenant.wallet_balance"
              type="number"
              min="0"
              step="10000"
              class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <!-- Data Akun Owner -->
          <div class="border-t border-[#E2E8F0] pt-3 mt-1">
            <h4 class="text-xs font-bold text-[#0F172A] uppercase mb-2">Akun Owner Pengelola</h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold uppercase text-[#64748B] mb-1">Nama Owner</label>
                <input
                  v-model="newTenant.owner_name"
                  type="text"
                  placeholder="Budi Santoso"
                  class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-[#64748B] mb-1">Username Owner</label>
                <input
                  v-model="newTenant.owner_username"
                  type="text"
                  placeholder="owner_laun001"
                  class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            :disabled="superadminStore.isLoading"
            class="w-full mt-2 py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold rounded-lg shadow-md transition-all text-sm flex items-center justify-center gap-2 active:translate-y-[2px] min-h-[48px]"
          >
            <span>✨</span>
            <span>{{ superadminStore.isLoading ? 'Mendaftarkan...' : 'Simpan & Daftarkan Toko' }}</span>
          </button>
        </form>
      </div>
    </div>

    <!-- MODAL 2: SUKSES PENDAFTARAN & KIRIM KE WA -->
    <div
      v-if="showSuccessModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div class="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up text-center">
        <div class="w-16 h-16 rounded-full bg-[#ECFDF5] border border-[#10B981]/30 flex items-center justify-center text-3xl mx-auto">
          🎉
        </div>

        <div>
          <h3 class="text-lg font-black text-[#0F172A]">Toko Berhasil Didaftarkan!</h3>
          <p class="text-xs text-[#64748B] mt-1">Akun owner dan profil toko telah tersimpan di sistem.</p>
        </div>

        <div v-if="registeredSuccessData" class="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0] text-left text-xs flex flex-col gap-2 font-mono">
          <div class="flex justify-between">
            <span class="text-[#64748B]">Toko:</span>
            <span class="font-bold text-[#0F172A]">{{ registeredSuccessData.tenant.business_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#64748B]">Kode Toko:</span>
            <span class="font-bold text-[#10B981]">{{ registeredSuccessData.tenant.tenant_code }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#64748B]">Username:</span>
            <span class="font-bold text-[#0F172A]">{{ registeredSuccessData.owner.username }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#64748B]">Password:</span>
            <span class="font-bold text-[#0F172A]">{{ registeredSuccessData.initialPassword }}</span>
          </div>
        </div>

        <!-- WA Action Button (#25D366 brand green) -->
        <div class="flex flex-col gap-2">
          <button
            @click="sendAccountToWA"
            class="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold rounded-lg shadow-md transition-all text-sm flex items-center justify-center gap-2 active:translate-y-[2px] min-h-[48px]"
          >
            <span>💬</span>
            <span>Kirim Akun ke WA Owner</span>
          </button>

          <button
            @click="showSuccessModal = false"
            class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs rounded-lg transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 3: EDIT TENANT -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      @click.self="showEditModal = false"
    >
      <div class="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 class="text-lg font-black text-[#0F172A]">Edit Status & Paket Tenant</h3>
            <p class="text-xs text-[#64748B]">{{ editingTenant.business_name }} ({{ editingTenant.tenant_code }})</p>
          </div>
          <button
            @click="showEditModal = false"
            class="w-8 h-8 rounded-full bg-[#F8FAFC] text-[#0F172A] font-bold flex items-center justify-center hover:bg-slate-200 border border-[#E2E8F0]"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleUpdateTenant" class="flex flex-col gap-4">
          <!-- Status Toko -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Status Toko</label>
            <select
              v-model="editingTenant.subscription_status"
              class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            >
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <!-- Paket Langganan -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Paket Langganan</label>
            <select
              v-model="editingTenant.plan_id"
              class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            >
              <option v-for="plan in superadminStore.plans" :key="plan.id" :value="plan.id">
                {{ plan.name }}
              </option>
            </select>
          </div>

          <!-- Saldo Wallet -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Saldo Wallet (Rp)</label>
            <input
              v-model.number="editingTenant.wallet_balance"
              type="number"
              step="10000"
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-base font-bold font-mono tabular-nums text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <button
            type="submit"
            class="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold rounded-lg shadow-md transition-all text-sm flex items-center justify-center gap-2 active:translate-y-[2px] min-h-[48px]"
          >
            <span>💾</span>
            <span>Simpan Perubahan</span>
          </button>
        </form>
      </div>
    </div>

    <!-- MODAL 4: EDIT NOMINAL HARGA PAKET -->
    <div
      v-if="showEditPlanModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      @click.self="showEditPlanModal = false"
    >
      <div class="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 class="text-lg font-black text-[#0F172A]">Edit Master Pricing Paket</h3>
            <p class="text-xs text-[#64748B]">{{ editingPlan.name }}</p>
          </div>
          <button
            @click="showEditPlanModal = false"
            class="w-8 h-8 rounded-full bg-[#F8FAFC] text-[#0F172A] font-bold flex items-center justify-center hover:bg-slate-200 border border-[#E2E8F0]"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleUpdatePlan" class="flex flex-col gap-4">
          <!-- Pricing depending on billing_type -->
          <div v-if="editingPlan.billing_type === 'pay_as_you_go'">
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Harga Per Order Transaksi (Rp)</label>
            <input
              v-model.number="editingPlan.price_per_order"
              type="number"
              step="10"
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-base font-bold font-mono tabular-nums text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <div v-else>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Harga Bulanan (Rp)</label>
            <input
              v-model.number="editingPlan.price"
              type="number"
              step="5000"
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-base font-bold font-mono tabular-nums text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <!-- Kuota Nota -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Kuota Order Transaksi / Bulan (0 = Tanpa Batas)</label>
            <input
              v-model.number="editingPlan.order_quota"
              type="number"
              step="10"
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <button
            type="submit"
            class="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold rounded-lg shadow-md transition-all text-sm flex items-center justify-center gap-2 active:translate-y-[2px] min-h-[48px]"
          >
            <span>💾</span>
            <span>Simpan Ke Supabase</span>
          </button>
        </form>
      </div>
    </div>

    <!-- MODAL 5: BUAT INVOICE TAGIHAN -->
    <div
      v-if="showInvoiceModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      @click.self="showInvoiceModal = false"
    >
      <div class="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 class="text-lg font-black text-[#0F172A]">Buat Invoice Tagihan SaaS</h3>
            <p class="text-xs text-[#64748B]">Kirim nota langganan bulanan ke pemilik toko</p>
          </div>
          <button
            @click="showInvoiceModal = false"
            class="w-8 h-8 rounded-full bg-[#F8FAFC] text-[#0F172A] font-bold flex items-center justify-center hover:bg-slate-200 border border-[#E2E8F0]"
          >
            ✕
          </button>
        </div>

        <div class="flex flex-col gap-4">
          <!-- Pilih Toko -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Pilih Toko / Tenant</label>
            <select
              v-model="selectedInvoiceTenantId"
              class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            >
              <option v-for="tenant in superadminStore.tenants" :key="tenant.id" :value="tenant.id">
                {{ tenant.business_name }} ({{ tenant.phone_number }})
              </option>
            </select>
          </div>

          <!-- Nominal Tagihan -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nominal Tagihan (Rp)</label>
            <input
              v-model.number="invoiceAmount"
              type="number"
              step="10000"
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-base font-bold font-mono tabular-nums text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <!-- Tanggal Jatuh Tempo -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Tanggal Jatuh Tempo</label>
            <input
              v-model="dueDate"
              type="date"
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>
        </div>

        <!-- WA Action Button (#25D366 brand green) -->
        <button
          @click="sendInvoiceViaWA"
          class="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold rounded-lg shadow-md transition-all text-base flex items-center justify-center gap-2 active:translate-y-[2px] min-h-[48px]"
        >
          <span>📲</span>
          <span>Kirim Invoice via WhatsApp</span>
        </button>
      </div>
    </div>
  </div>
</template>
