<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "../stores/useAuthStore"
import { useSuperadminStore } from "../stores/useSuperadminStore"

const router = useRouter()
const authStore = useAuthStore()
const superadminStore = useSuperadminStore()

// Tab Navigation State: "directory" | "plans"
const activeTab = ref("directory")

// Search and Filter state
const searchQuery = ref("")
const statusFilter = ref("all")

// Modals State
const showCreateModal = ref(false)
const showSuccessModal = ref(false)
const showEditModal = ref(false)
const showEditPlanModal = ref(false)
const showInvoiceModal = ref(false)

// Registration Form State
const newTenant = ref({
  business_name: "",
  tenant_code: "",
  phone_number: "",
  plan_id: "",
  subscription_status: "active",
  billing_type: "monthly",
  wallet_balance: 0,
  owner_name: "",
  owner_username: "",
  owner_password: ""
})

// Registration Success Data State
const registeredSuccessData = ref(null)

// Edit Tenant Form State
const editingTenant = ref({
  id: "",
  business_name: "",
  tenant_code: "",
  phone_number: "",
  plan_id: "",
  subscription_status: "active",
  wallet_balance: 0
})

// Edit Plan Form State
const editingPlan = ref({
  id: "",
  name: "",
  plan_code: "",
  price: 0,
  price_per_order: 0,
  order_quota: 0,
  billing_type: "monthly"
})

// Invoice Modal State
const selectedInvoiceTenantId = ref("")
const selectedInvoicePackage = ref("Growth")
const invoiceAmount = ref(300000)
const today = new Date()
const defaultDueDate = new Date(today.setDate(today.getDate() + 7)).toISOString().split("T")[0]
const dueDate = ref(defaultDueDate)

// Computeds
const totalActiveStores = computed(() => {
  return superadminStore.tenants.filter(t => t.subscription_status === "active" || t.subscription_status === "trial").length
})

const totalTenantsCount = computed(() => superadminStore.tenants.length)

// Monthly Recurring Revenue calculation
const estimatedMRR = computed(() => {
  return superadminStore.tenants.reduce((acc, t) => {
    if (t.subscription_status === "active") {
      const planPrice = t.subscription_plans?.price || 0
      return acc + Number(planPrice)
    }
    return acc
  }, 0)
})

const filteredTenants = computed(() => {
  return superadminStore.tenants.filter(t => {
    const matchesSearch = !searchQuery.value ||
      (t.business_name && t.business_name.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (t.tenant_code && t.tenant_code.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (t.phone_number && t.phone_number.includes(searchQuery.value))

    const matchesStatus = statusFilter.value === "all" || t.subscription_status === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

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
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(val || 0)
}

function formatPhoneForWA(phone) {
  if (!phone) return ""
  let cleaned = phone.replace(/\D/g, "")
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1)
  }
  return cleaned
}

function getStatusBadgeClass(status) {
  const normalized = (status || "").toLowerCase()
  if (normalized === "active") {
    return "bg-[#ECFDF5] text-[#00422B] border border-[#10B981]/30"
  } else if (normalized === "trial") {
    return "bg-[#FFFBEB] text-[#78350F] border border-[#F59E0B]/30"
  } else {
    return "bg-[#FFF1F2] text-[#9F1239] border border-[#F43F5E]/30"
  }
}

function getStatusDotClass(status) {
  const normalized = (status || "").toLowerCase()
  if (normalized === "active") return "bg-[#10B981]"
  if (normalized === "trial") return "bg-[#F59E0B]"
  return "bg-[#F43F5E]"
}

// Action Handlers
function openCreateModal() {
  if (superadminStore.plans.length > 0) {
    newTenant.value.plan_id = superadminStore.plans[0].id
  }
  const randomCode = "LAUN" + Math.floor(100 + Math.random() * 900)
  newTenant.value.tenant_code = randomCode
  newTenant.value.owner_username = "owner_" + randomCode.toLowerCase()
  showCreateModal.value = true
}

async function handleCreateTenant() {
  if (!newTenant.value.business_name || !newTenant.value.tenant_code) {
    alert("Nama toko dan kode toko wajib diisi!")
    return
  }

  try {
    const payload = {
      username: newTenant.value.owner_username || `owner_${newTenant.value.tenant_code.toLowerCase()}`,
      password: newTenant.value.owner_password || "123456",
      owner_name: newTenant.value.owner_name || `Owner ${newTenant.value.business_name}`,
      name: newTenant.value.business_name,
      tenant_code: newTenant.value.tenant_code,
      plan_id: newTenant.value.plan_id,
      address: newTenant.value.address || "",
      phone: newTenant.value.phone_number || ""
    }

    const result = await superadminStore.createTenant(payload)
    registeredSuccessData.value = result
    showCreateModal.value = false
    showSuccessModal.value = true

    // Reset Form
    newTenant.value = {
      business_name: "",
      tenant_code: "",
      phone_number: "",
      plan_id: superadminStore.plans[0]?.id || "",
      subscription_status: "active",
      billing_type: "monthly",
      wallet_balance: 0,
      owner_name: "",
      owner_username: "",
      owner_password: ""
    }
  } catch (err) {
    alert("Gagal mendaftarkan toko: " + (err.message || "Terjadi kesalahan"))
  }
}

function sendAccountToWA() {
  if (!registeredSuccessData.value) return

  const { tenant, owner, initialPassword } = registeredSuccessData.value
  const phone = formatPhoneForWA(tenant.phone_number)

  const msg = `Halo *${tenant.business_name}*,

Selamat! Akun toko *LaundryPro SaaS* Anda telah berhasil didaftarkan.

Berikut adalah kredensial login Anda:
🏢 *Kode Toko:* ${tenant.tenant_code}
👤 *Username:* ${owner.username}
🔑 *Password:* ${initialPassword}

Silakan login melalui portal:
🌐 https://laundrypro.app/login

Selamat mengelola operasional laundry Anda lebih efisien bersama *LaundryPro*! 🚀`

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  window.open(url, "_blank")
  showSuccessModal.value = false
}

function openEditModal(tenant) {
  editingTenant.value = {
    id: tenant.id,
    business_name: tenant.business_name,
    tenant_code: tenant.tenant_code,
    phone_number: tenant.phone_number,
    plan_id: tenant.plan_id,
    subscription_status: tenant.subscription_status || "active",
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
    alert("Gagal memperbarui toko: " + err.message)
  }
}

async function handleSoftDelete(tenant) {
  if (confirm(`Apakah Anda yakin ingin menonaktifkan (soft delete) toko "${tenant.business_name}"?`)) {
    try {
      await superadminStore.softDeleteTenant(tenant.id)
    } catch (err) {
      alert("Gagal menonaktifkan toko: " + err.message)
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
    alert("Gagal memperbarui paket: " + err.message)
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
  const formattedDate = new Date(dueDate.value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })

  const messageText = `Halo *${tenant.business_name}*,

Berikut adalah Tagihan Langganan *LaundryPro SaaS* Anda:

📦 *Paket:* ${selectedInvoicePackage.value}
💵 *Total Tagihan:* ${formattedAmount}
📅 *Jatuh Tempo:* ${formattedDate}

Silakan lakukan pembayaran transfer ke:
🏦 *Bank BCA:* 123-456-7890 a/n LaundryPro SaaS

Setelah melakukan pembayaran, mohon konfirmasi balasan pesan ini dengan menyertakan bukti transfer.

Terima kasih telah mempercayakan operasional toko Anda pada *LaundryPro*! 🚀`

  const encodedUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
  window.open(encodedUrl, "_blank")
  showInvoiceModal.value = false
}
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans">
    <!-- 1. Top Banner Oranye -->
    <div class="fixed top-0 left-0 right-0 h-10 bg-tertiary-container bg-amber-500 text-amber-950 font-bold px-4 text-xs flex items-center justify-between z-40 shadow-xs border-b border-amber-600/20">
      <div class="flex items-center gap-2">
        <span class="animate-pulse">🔥</span>
        <span>SUPERADMIN SaaS MODE — LaundryPro HQ Control Center</span>
      </div>
      <div class="flex items-center gap-4">
        <span class="hidden sm:inline-block text-[11px] opacity-80">Server Status: Normal | Supabase Realtime Connected</span>
        <button
          @click="openInvoiceModal"
          class="bg-amber-900 text-amber-100 hover:bg-amber-950 px-2.5 py-1 rounded text-[11px] font-extrabold transition-all active:translate-y-[1px]"
        >
          + Terbitkan Invoice
        </button>
      </div>
    </div>

    <!-- 2. Sidebar Kiri -->
    <aside class="fixed left-0 top-10 bottom-0 w-72 bg-inverse-surface bg-slate-900 text-white z-30 flex flex-col justify-between border-r border-slate-800 shadow-xl">
      <div>
        <!-- Brand / Identity -->
        <div class="p-6 border-b border-slate-800 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center font-black text-xl text-white shadow-md">
            ⚡
          </div>
          <div>
            <h1 class="text-base font-black tracking-tight text-white">LaundryPro</h1>
            <p class="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Superadmin SaaS</p>
          </div>
        </div>

        <!-- Navigation Menu -->
        <nav class="p-4 flex flex-col gap-1">
          <div class="text-[10px] uppercase font-bold text-slate-500 px-3 py-2 tracking-wider">
            Menu Utama
          </div>

          <button
            @click="activeTab = 'directory'"
            :class="[
              'w-full text-left px-3.5 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-between',
              activeTab === 'directory'
                ? 'bg-[#10B981] text-white shadow-lg shadow-[#10B981]/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            ]"
          >
            <div class="flex items-center gap-2.5">
              <span class="text-base">🏢</span>
              <span>Direktori Tenant</span>
            </div>
            <span
              :class="[
                'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold',
                activeTab === 'directory' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400'
              ]"
            >
              {{ superadminStore.tenants.length }}
            </span>
          </button>

          <button
            @click="activeTab = 'plans'"
            :class="[
              'w-full text-left px-3.5 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-between',
              activeTab === 'plans'
                ? 'bg-[#10B981] text-white shadow-lg shadow-[#10B981]/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            ]"
          >
            <div class="flex items-center gap-2.5">
              <span class="text-base">🏷️</span>
              <span>Master Paket Langganan</span>
            </div>
            <span
              :class="[
                'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold',
                activeTab === 'plans' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400'
              ]"
            >
              {{ superadminStore.plans.length }}
            </span>
          </button>

          <div class="text-[10px] uppercase font-bold text-slate-500 px-3 py-2 mt-4 tracking-wider">
            Portal Aplikasi
          </div>

          <router-link
            to="/"
            class="w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2.5"
          >
            <span class="text-base">🖥️</span>
            <span>Kasir / POS</span>
          </router-link>

          <router-link
            to="/shift"
            class="w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2.5"
          >
            <span class="text-base">📋</span>
            <span>Rekap Shift</span>
          </router-link>

          <router-link
            to="/owner"
            class="w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2.5"
          >
            <span class="text-base">📊</span>
            <span>Dasbor Owner</span>
          </router-link>
        </nav>
      </div>

      <!-- Quick Actions / User Info -->
      <div class="p-4 border-t border-slate-800 flex flex-col gap-3">
        <button
          @click="openCreateModal"
          class="w-full py-3 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 active:translate-y-[2px] min-h-[44px]"
        >
          <span>+</span>
          <span>Daftarkan Toko Baru</span>
        </button>

        <div class="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="font-bold text-slate-200">Superadmin Logged In</span>
          </div>
          <button
            @click="authStore.logout(router)"
            class="text-rose-400 hover:text-rose-300 font-bold hover:underline"
          >
            Keluar
          </button>
        </div>
      </div>
    </aside>

    <!-- 3. Header Atas & Filter Area -->
    <header class="fixed top-10 left-72 right-0 h-16 bg-white border-b border-[#E2E8F0] z-20 flex items-center justify-between px-6 shadow-2xs">
      <div class="flex items-center gap-4 flex-1 max-w-xl">
        <div class="relative w-full">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama toko, kode tenant, atau nomor telepon..."
            class="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#10B981] transition-all"
          />
        </div>

        <select
          v-model="statusFilter"
          class="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
        >
          <option value="all">Semua Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="openInvoiceModal"
          class="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:translate-y-[1px]"
        >
          <span>💳</span>
          <span>Terbitkan Invoice</span>
        </button>

        <button
          @click="openCreateModal"
          class="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:translate-y-[1px]"
        >
          <span>+</span>
          <span>Tambah Tenant</span>
        </button>
      </div>
    </header>

    <!-- 4. Area Konten Utama (Grid KPI & Content) -->
    <main class="ml-72 pt-26 px-6 pb-12 min-h-screen">
      <!-- Grid KPI -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- KPI 1: Estimated MRR -->
        <div class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div class="flex items-center justify-between text-[#64748B] mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Est. MRR SaaS</span>
            <span class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">💰</span>
          </div>
          <div>
            <div class="text-2xl font-black font-mono tabular-nums text-[#10B981]">
              {{ formatCurrency(estimatedMRR) }}
            </div>
            <p class="text-[11px] text-[#64748B] font-medium mt-1">Estimasi pendapatan bulanan</p>
          </div>
        </div>

        <!-- KPI 2: Active Outlets / Tenants -->
        <div class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div class="flex items-center justify-between text-[#64748B] mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Toko Aktif & Trial</span>
            <span class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-base">🏬</span>
          </div>
          <div>
            <div class="text-2xl font-black font-mono tabular-nums text-[#0F172A]">
              {{ totalActiveStores }}
            </div>
            <p class="text-[11px] text-[#64748B] font-medium mt-1">Dari total {{ totalTenantsCount }} toko terdaftar</p>
          </div>
        </div>

        <!-- KPI 3: Total Tenants -->
        <div class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div class="flex items-center justify-between text-[#64748B] mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Total Tenant</span>
            <span class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-base">🏢</span>
          </div>
          <div>
            <div class="text-2xl font-black font-mono tabular-nums text-[#0F172A]">
              {{ superadminStore.tenants.length }}
            </div>
            <p class="text-[11px] text-[#64748B] font-medium mt-1">Tenant di Supabase Database</p>
          </div>
        </div>

        <!-- KPI 4: Active Plans -->
        <div class="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div class="flex items-center justify-between text-[#64748B] mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Paket Langganan</span>
            <span class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-base">📦</span>
          </div>
          <div>
            <div class="text-2xl font-black font-mono tabular-nums text-[#0F172A]">
              {{ superadminStore.plans.length }}
            </div>
            <p class="text-[11px] text-[#64748B] font-medium mt-1">Master pricing di database</p>
          </div>
        </div>
      </div>

      <!-- Content Sections depending on activeTab -->

      <!-- 5. TAB 1: Tabel Direktori Tenant -->
      <section v-if="activeTab === 'directory'" class="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div class="p-5 border-b border-[#E2E8F0] flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 class="text-lg font-black text-[#0F172A] flex items-center gap-2">
              <span>🏢</span>
              <span>Direktori Tenant Toko</span>
            </h2>
            <p class="text-xs text-[#64748B] mt-0.5">Kelola status toko, paket langganan, wallet, dan akses impersonasi</p>
          </div>

          <div class="flex items-center gap-3">
            <button
              @click="openCreateModal"
              class="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:translate-y-[1px] min-h-[40px]"
            >
              <span>+</span>
              <span>Daftarkan Toko Baru</span>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr class="bg-[#0F172A] text-white text-[11px] font-mono font-bold uppercase tracking-wider h-11">
                <th class="p-4">Nama & Kode Toko</th>
                <th class="p-4">WhatsApp Kontak</th>
                <th class="p-4">Paket & Saldo Wallet</th>
                <th class="p-4">Status</th>
                <th class="p-4 text-center">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E2E8F0] text-xs">
              <tr
                v-for="(tenant, idx) in filteredTenants"
                :key="tenant.id"
                :class="['transition-colors hover:bg-slate-50', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]']"
              >
                <!-- Nama & Kode Toko -->
                <td class="p-4">
                  <div class="font-black text-[#0F172A] text-sm">{{ tenant.business_name }}</div>
                  <div class="text-[11px] text-[#64748B] font-mono flex items-center gap-2 mt-1">
                    <span class="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-bold">
                      {{ tenant.tenant_code }}
                    </span>
                    <span class="text-[10px] text-slate-400">ID: {{ tenant.id.slice(0, 8) }}...</span>
                  </div>
                </td>

                <!-- Kontak WA -->
                <td class="p-4 font-mono text-[#0F172A]">
                  <a
                    :href="`https://wa.me/${formatPhoneForWA(tenant.phone_number)}`"
                    target="_blank"
                    class="text-[#10B981] hover:underline flex items-center gap-1.5 font-bold"
                  >
                    <span>💬</span>
                    <span>{{ tenant.phone_number || "-" }}</span>
                  </a>
                </td>

                <!-- Paket & Saldo Wallet -->
                <td class="p-4">
                  <div class="font-bold text-[#0F172A]">
                    {{ tenant.subscription_plans?.name || "Standard" }}
                  </div>
                  <div class="text-[11px] text-[#64748B] font-mono mt-0.5">
                    Saldo Wallet: <span class="font-bold text-[#10B981]">{{ formatCurrency(tenant.wallet_balance) }}</span>
                  </div>
                </td>

                <!-- Status -->
                <td class="p-4">
                  <span
                    :class="[
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold capitalize tracking-wide',
                      getStatusBadgeClass(tenant.subscription_status)
                    ]"
                  >
                    <span :class="['w-2 h-2 rounded-full', getStatusDotClass(tenant.subscription_status)]"></span>
                    {{ tenant.subscription_status || "active" }}
                  </span>
                </td>

                <!-- Tombol Aksi & Impersonation -->
                <td class="p-4">
                  <div class="flex items-center justify-center gap-2">
                    <!-- Tombol Impersonate (Switch) -->
                    <button
                      @click="handleImpersonate(tenant)"
                      title="Switch / Impersonate Akses Toko"
                      class="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-[11px] rounded-lg shadow-2xs transition-all flex items-center gap-1 active:translate-y-[1px]"
                    >
                      <span>🔄</span>
                      <span>Switch</span>
                    </button>

                    <!-- Edit Tenant -->
                    <button
                      @click="openEditModal(tenant)"
                      title="Edit Status / Paket"
                      class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-[11px] rounded-lg border border-slate-300 transition-all flex items-center gap-1"
                    >
                      <span>✏️</span>
                      <span>Edit</span>
                    </button>

                    <!-- Soft Delete -->
                    <button
                      @click="handleSoftDelete(tenant)"
                      title="Nonaktifkan Toko"
                      class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-[#F43F5E] font-bold text-[11px] rounded-lg border border-rose-200 transition-all"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredTenants.length === 0">
                <td colspan="5" class="p-8 text-center text-slate-500 text-xs font-medium">
                  Belum ada data toko / tenant.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 2: MASTER PAKET LANGGANAN -->
      <section v-if="activeTab === 'plans'" class="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div class="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 class="text-lg font-black text-[#0F172A] flex items-center gap-2">
              <span>🏷️</span>
              <span>Master Paket Langganan & Pricing</span>
            </h2>
            <p class="text-xs text-[#64748B] mt-0.5">Atur tarif bulanan, tarif per order, dan kuota transaksi untuk setiap paket SaaS</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
          <div v-if="superadminStore.plans.length === 0" class="col-span-full p-8 text-center text-slate-500 text-xs font-medium">
            Belum ada data paket langganan.
          </div>
          <div
            v-for="plan in superadminStore.plans"
            :key="plan.id"
            class="border border-[#E2E8F0] rounded-2xl p-5 bg-[#F8FAFC] flex flex-col justify-between gap-4 hover:border-[#10B981] transition-all hover:shadow-xs"
          >
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-mono font-bold uppercase text-slate-500">{{ plan.plan_code }}</span>
                <span
                  :class="[
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    plan.billing_type === 'pay_as_you_go' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  ]"
                >
                  {{ plan.billing_type }}
                </span>
              </div>

              <h3 class="text-lg font-black text-[#0F172A]">{{ plan.name }}</h3>

              <div class="my-2">
                <div v-if="plan.billing_type === 'pay_as_you_go'" class="text-2xl font-black font-mono text-[#10B981]">
                  {{ formatCurrency(plan.price_per_order) }} <span class="text-xs font-normal text-slate-500">/ order</span>
                </div>
                <div v-else class="text-2xl font-black font-mono text-[#10B981]">
                  {{ formatCurrency(plan.price) }} <span class="text-xs font-normal text-slate-500">/ bulan</span>
                </div>
              </div>

              <div class="flex flex-col gap-1 text-xs text-slate-600 border-t border-slate-200 pt-3">
                <div class="flex items-center justify-between">
                  <span>Kuota Transaksi:</span>
                  <span class="font-bold font-mono">{{ plan.order_quota ? plan.order_quota + " /bln" : "Unlimitted" }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Max Outlets:</span>
                  <span class="font-bold font-mono">{{ plan.max_outlets || 1 }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Max Staff:</span>
                  <span class="font-bold font-mono">{{ plan.max_staff || 1 }}</span>
                </div>
              </div>
            </div>

            <button
              @click="openEditPlanModal(plan)"
              class="w-full py-2.5 bg-white hover:bg-slate-100 text-[#0F172A] font-extrabold text-xs rounded-xl border border-slate-300 shadow-2xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>✏️</span>
              <span>Edit Pricing</span>
            </button>
          </div>
        </div>
      </section>
    </main>

    <!-- MODAL 1: DAFTARKAN TOKO BARU -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      @click.self="showCreateModal = false"
    >
      <div class="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 class="text-lg font-black text-[#0F172A]">Daftarkan Tenant Toko Baru</h3>
            <p class="text-xs text-[#64748B]">Buat toko dan akun owner dalam sekali langkah</p>
          </div>
          <button
            @click="showCreateModal = false"
            class="w-8 h-8 rounded-full bg-[#F8FAFC] text-[#0F172A] font-bold flex items-center justify-center hover:bg-slate-200 border border-[#E2E8F0]"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleCreateTenant" class="flex flex-col gap-4">
          <!-- Nama Toko & Kode -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nama Toko Laundry *</label>
              <input
                v-model="newTenant.business_name"
                type="text"
                required
                placeholder="Contoh: Super Clean Wash"
                class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Kode Toko *</label>
              <input
                v-model="newTenant.tenant_code"
                type="text"
                required
                placeholder="LAUN001"
                class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          <!-- Nomor WA -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nomor WA Owner *</label>
            <input
              v-model="newTenant.phone_number"
              type="text"
              required
              placeholder="081234567890"
              class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <!-- Paket Langganan & Status -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Paket SaaS</label>
              <select
                v-model="newTenant.plan_id"
                class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              >
                <option v-for="plan in superadminStore.plans" :key="plan.id" :value="plan.id">
                  {{ plan.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Status Toko</label>
              <select
                v-model="newTenant.subscription_status"
                class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <!-- Akun Owner Login -->
          <div class="border-t border-slate-200 pt-3 flex flex-col gap-3">
            <span class="text-xs font-black uppercase tracking-wider text-slate-800">Kredensial Owner</span>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nama Owner</label>
                <input
                  v-model="newTenant.owner_name"
                  type="text"
                  placeholder="Pak Budi"
                  class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Username Login</label>
                <input
                  v-model="newTenant.owner_username"
                  type="text"
                  placeholder="owner_laun001"
                  class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Password Default</label>
              <input
                v-model="newTenant.owner_password"
                type="text"
                placeholder="123456"
                class="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          <button
            type="submit"
            class="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 active:translate-y-[2px] min-h-[48px] mt-2"
          >
            <span>✨</span>
            <span>Simpan Tenant & Buat Akun Owner</span>
          </button>
        </form>
      </div>
    </div>

    <!-- MODAL 2: SUCCESS REGISTRATION MODAL WITH WA ACTION -->
    <div
      v-if="showSuccessModal && registeredSuccessData"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div class="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up">
        <div class="text-center flex flex-col items-center gap-2">
          <div class="w-12 h-12 rounded-full bg-emerald-100 text-[#10B981] flex items-center justify-center text-2xl font-bold">
            ✓
          </div>
          <h3 class="text-lg font-black text-[#0F172A]">Toko Berhasil Didaftarkan!</h3>
          <p class="text-xs text-[#64748B]">
            Data tenant dan kredensial login owner telah berhasil disimpan ke Supabase Database.
          </p>
        </div>

        <div class="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex flex-col gap-2 font-mono text-xs">
          <div class="flex justify-between">
            <span class="text-slate-500">Nama Toko:</span>
            <span class="font-bold text-slate-800">{{ registeredSuccessData.tenant.business_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Kode Toko:</span>
            <span class="font-bold text-slate-800">{{ registeredSuccessData.tenant.tenant_code }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Username:</span>
            <span class="font-bold text-slate-800">{{ registeredSuccessData.owner.username }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Password:</span>
            <span class="font-bold text-slate-800">{{ registeredSuccessData.initialPassword }}</span>
          </div>
        </div>

        <!-- WA Action Button (#25D366 brand green) -->
        <div class="flex flex-col gap-2">
          <button
            @click="sendAccountToWA"
            class="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 active:translate-y-[2px] min-h-[48px]"
          >
            <span>💬</span>
            <span>Kirim Akun ke WA Owner</span>
          </button>

          <button
            @click="showSuccessModal = false"
            class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs rounded-xl transition-all"
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
      <div class="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up">
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
              class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
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
              class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
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
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-base font-bold font-mono tabular-nums text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <button
            type="submit"
            class="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 active:translate-y-[2px] min-h-[48px]"
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
      <div class="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up">
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
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-base font-bold font-mono tabular-nums text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <div v-else>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Harga Bulanan (Rp)</label>
            <input
              v-model.number="editingPlan.price"
              type="number"
              step="5000"
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-base font-bold font-mono tabular-nums text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <!-- Kuota Nota -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Kuota Order Transaksi / Bulan (0 = Tanpa Batas)</label>
            <input
              v-model.number="editingPlan.order_quota"
              type="number"
              step="10"
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold font-mono text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <button
            type="submit"
            class="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-extrabold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 active:translate-y-[2px] min-h-[48px]"
          >
            <span>💾</span>
            <span>Simpan Ke Supabase</span>
          </button>
        </form>
      </div>
    </div>

    <!-- MODAL 6: BUAT INVOICE TAGIHAN TENANT -->
    <div
      v-if="showInvoiceModal"
      id="modal-invoice"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      @click.self="showInvoiceModal = false"
    >
      <div class="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 class="text-lg font-black text-[#0F172A]">Terbitkan Invoice Langganan Tenant</h3>
            <p class="text-xs text-[#64748B]">Kirim nota tagihan langganan bulanan ke pemilik toko</p>
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
              class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
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
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-base font-bold font-mono tabular-nums text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <!-- Tanggal Jatuh Tempo -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Tanggal Jatuh Tempo</label>
            <input
              v-model="dueDate"
              type="date"
              class="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>
        </div>

        <!-- WA Action Button (#25D366 brand green) -->
        <button
          @click="sendInvoiceViaWA"
          class="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold rounded-xl shadow-md transition-all text-base flex items-center justify-center gap-2 active:translate-y-[2px] min-h-[48px]"
        >
          <span>📲</span>
          <span>Kirim Invoice via WhatsApp</span>
        </button>
      </div>
    </div>
  </div>
</template>
