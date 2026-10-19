<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../lib/supabase'

const router = useRouter()
const authStore = useAuthStore()

// Sample / Initial Tenants Data
const tenants = ref([
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Laundry Sparkle Express',
    phone: '081234567890',
    status: 'Active',
    trialDays: 30,
    quotaUsed: 124,
    quotaLimit: 500
  },
  {
    id: 'tenant-002',
    name: 'Clean & Fresh Laundry',
    phone: '081987654321',
    status: 'Trial',
    trialDays: 7,
    quotaUsed: 45,
    quotaLimit: 300
  },
  {
    id: 'tenant-003',
    name: 'SuperWash Koin Pasteur',
    phone: '082112233445',
    status: 'Active',
    trialDays: 14,
    quotaUsed: 210,
    quotaLimit: 1000
  },
  {
    id: 'tenant-004',
    name: 'Berkah Eco Laundry',
    phone: '085678901234',
    status: 'Expired',
    trialDays: 0,
    quotaUsed: 150,
    quotaLimit: 150
  }
])

// Metrics Summary
const totalActiveStores = computed(() => {
  return tenants.value.filter(t => t.status === 'Active' || t.status === 'Trial').length
})

const totalTransactionsCount = ref(1480)
const unpaidInvoicesCount = ref(2)

// Invoice Modal State
const showInvoiceModal = ref(false)
const selectedTenantId = ref('00000000-0000-0000-0000-000000000001')
const selectedPackage = ref('Growth')
const invoiceAmount = ref(300000)

const today = new Date()
const defaultDueDate = new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0]
const dueDate = ref(defaultDueDate)

const packagesInfo = {
  Starter: { name: 'Starter', price: 150000, desc: '500 Nota / Bulan' },
  Growth: { name: 'Growth', price: 300000, desc: '1,500 Nota / Bulan' },
  Unlimited: { name: 'Unlimited', price: 500000, desc: 'Tanpa Batas Nota' }
}

function handlePackageChange() {
  if (packagesInfo[selectedPackage.value]) {
    invoiceAmount.value = packagesInfo[selectedPackage.value].price
  }
}

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

function sendInvoiceViaWA() {
  const tenant = tenants.value.find(t => t.id === selectedTenantId.value) || tenants.value[0]
  const formattedPhone = formatPhoneForWA(tenant.phone)

  const formattedAmount = formatCurrency(invoiceAmount.value)
  const formattedDate = new Date(dueDate.value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const messageText = `Halo *${tenant.name}*,\n\nBerikut adalah Tagihan Langganan *LaundryPro SaaS* Anda:\n\n📦 *Paket:* ${selectedPackage.value}\n💵 *Total Tagihan:* ${formattedAmount}\n📅 *Jatuh Tempo:* ${formattedDate}\n\nSilakan lakukan pembayaran transfer ke:\n🏦 *Bank BCA:* 123-456-7890 a/n LaundryPro SaaS\n\nSetelah melakukan pembayaran, mohon konfirmasi balasan pesan ini dengan menyertakan bukti transfer.\n\nTerima kasih telah mempercayakan operasional toko Anda pada *LaundryPro*! 🚀`

  const encodedUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
  window.open(encodedUrl, '_blank')
  showInvoiceModal.value = false
}

function handleImpersonate(tenant) {
  authStore.impersonateTenant(tenant, router)
}

async function fetchTenantsFromSupabase() {
  try {
    const { data, error } = await supabase.from('tenants').select('*')
    if (!error && data && data.length > 0) {
      // Merge database tenants into initial list
      data.forEach(dbTenant => {
        const idx = tenants.value.findIndex(t => t.id === dbTenant.id)
        if (idx > -1) {
          tenants.value[idx] = {
            ...tenants.value[idx],
            name: dbTenant.name || tenants.value[idx].name,
            phone: dbTenant.phone || tenants.value[idx].phone,
            status: dbTenant.status || tenants.value[idx].status
          }
        } else {
          tenants.value.push({
            id: dbTenant.id,
            name: dbTenant.name || 'Toko Laundry',
            phone: dbTenant.phone || '081234567890',
            status: dbTenant.status || 'Active',
            trialDays: dbTenant.trial_days || 30,
            quotaUsed: dbTenant.quota_used || 0,
            quotaLimit: dbTenant.quota_limit || 500
          })
        }
      })
    }
  } catch (e) {
    console.warn('Could not fetch tenants from Supabase:', e)
  }
}

onMounted(() => {
  fetchTenantsFromSupabase()
})
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-20">
    <!-- Header Superadmin (Industrial Slate-900) -->
    <header class="bg-[#0F172A] text-white border-b border-slate-800 sticky top-0 z-10 px-4 py-3.5 shadow-md">
      <div class="max-w-4xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">⚡</span>
          <div>
            <h1 class="text-base font-black tracking-tight">Portal Superadmin SaaS</h1>
            <p class="text-xs text-slate-400">LaundryPro Multi-Tenant Platform Control</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="authStore.toggleSuperadmin()"
            :class="[
              'px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all active:translate-y-[1px]',
              authStore.isSuperadmin
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            ]"
          >
            {{ authStore.isSuperadmin ? 'Role: Superadmin' : 'Role: Kasir Staf' }}
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-4xl mx-auto p-4 flex flex-col gap-6">
      <!-- DEV MODE RESTRICTION WARNING -->
      <div v-if="!authStore.isSuperadmin" class="bg-[#FFFBEB] border border-[#F59E0B] text-[#78350F] p-5 rounded-lg shadow-xs text-center flex flex-col items-center gap-3">
        <span class="text-4xl">🔒</span>
        <h2 class="text-lg font-bold">Akses Dibatasi</h2>
        <p class="text-xs text-[#78350F] max-w-sm">
          Halaman ini khusus untuk pemilik platform (Superadmin). Silakan aktifkan mode Superadmin via toggle di atas.
        </p>
        <button
          @click="authStore.toggleSuperadmin()"
          class="px-5 py-2.5 bg-[#F59E0B] hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-xs transition-all active:translate-y-[1px]"
        >
          Aktifkan Mode Superadmin (Dev Mode)
        </button>
      </div>

      <div v-else class="flex flex-col gap-6">
        <!-- Kartu Metrik Ringkasan -->
        <section class="grid grid-cols-3 gap-3">
          <div class="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs flex flex-col gap-1">
            <div class="flex items-center justify-between text-[#64748B]">
              <span class="text-xs font-bold uppercase tracking-wider">Toko Aktif</span>
              <span class="text-base">🏪</span>
            </div>
            <span class="text-2xl font-black font-mono tabular-nums text-[#0F172A]">{{ totalActiveStores }}</span>
            <span class="text-[10px] text-[#10B981] font-bold">+2 Toko bulan ini</span>
          </div>

          <div class="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs flex flex-col gap-1">
            <div class="flex items-center justify-between text-[#64748B]">
              <span class="text-xs font-bold uppercase tracking-wider">Total Struk</span>
              <span class="text-base">🧾</span>
            </div>
            <span class="text-2xl font-black font-mono tabular-nums text-[#0F172A]">{{ totalTransactionsCount.toLocaleString('id-ID') }}</span>
            <span class="text-[10px] text-[#64748B] font-medium">Seluruh tenant</span>
          </div>

          <div class="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs flex flex-col gap-1">
            <div class="flex items-center justify-between text-[#64748B]">
              <span class="text-xs font-bold uppercase tracking-wider">Belum Lunas</span>
              <span class="text-base">💳</span>
            </div>
            <span class="text-2xl font-black font-mono tabular-nums text-[#F43F5E]">{{ unpaidInvoicesCount }}</span>
            <span class="text-[10px] text-[#F43F5E] font-bold">Tagihan SaaS</span>
          </div>
        </section>

        <!-- Header Direktori Toko & Action Invoice -->
        <section class="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs flex flex-col gap-4">
          <div class="flex items-center justify-between flex-wrap gap-2 border-b border-[#E2E8F0] pb-3">
            <div>
              <h2 class="text-base font-black text-[#0F172A] flex items-center gap-2">
                <span>🏢</span>
                <span>Direktori Tenant Toko</span>
              </h2>
              <p class="text-xs text-[#64748B]">Kelola status toko, kuota nota, dan impersonasi akun</p>
            </div>

            <button
              @click="showInvoiceModal = true"
              class="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-lg border-b-2 border-[#059669] shadow-sm transition-all flex items-center gap-1.5 active:translate-y-[1px] min-h-[44px]"
            >
              <span>+</span>
              <span>Buat Invoice Tagihan</span>
            </button>
          </div>

          <!-- Tabel Direktori Toko (Stitch Data Table Spec) -->
          <div class="overflow-x-auto rounded border border-[#E2E8F0]">
            <table class="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr class="bg-[#0F172A] text-white text-[12px] font-mono font-bold uppercase tracking-wider h-11">
                  <th class="p-3">Nama Toko</th>
                  <th class="p-3">WhatsApp</th>
                  <th class="p-3">Status / Trial</th>
                  <th class="p-3 text-right">Kuota Nota</th>
                  <th class="p-3 text-center">Aksi Impersonasi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] text-xs">
                <tr
                  v-for="(tenant, idx) in tenants"
                  :key="tenant.id"
                  :class="['transition-colors hover:bg-[#F1F5F9]', idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]']"
                >
                  <td class="p-3">
                    <div class="font-bold text-[#0F172A]">{{ tenant.name }}</div>
                    <div class="text-[10px] text-[#64748B] font-mono">ID: {{ tenant.id.slice(0, 12) }}...</div>
                  </td>

                  <td class="p-3 font-mono text-[#0F172A]">
                    <a
                      :href="`https://wa.me/${formatPhoneForWA(tenant.phone)}`"
                      target="_blank"
                      class="text-[#10B981] hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>💬</span>
                      <span>{{ tenant.phone }}</span>
                    </a>
                  </td>

                  <td class="p-3">
                    <span
                      :class="[
                        'px-2.5 py-1 rounded text-[11px] font-bold font-mono inline-flex items-center gap-1 uppercase',
                        tenant.status === 'Active'
                          ? 'bg-[#ECFDF5] text-[#00422B] border border-[#10B981]/30'
                          : tenant.status === 'Trial'
                          ? 'bg-[#FFFBEB] text-[#78350F] border border-[#F59E0B]/30'
                          : 'bg-[#FFF1F2] text-[#9F1239] border border-[#F43F5E]/30'
                      ]"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="tenant.status === 'Active' ? 'bg-[#10B981]' : tenant.status === 'Trial' ? 'bg-[#F59E0B]' : 'bg-[#F43F5E]'"></span>
                      <span>{{ tenant.status }}</span>
                      <span v-if="tenant.status === 'Trial'" class="text-[10px]">({{ tenant.trialDays }}h)</span>
                    </span>
                  </td>

                  <td class="p-3 text-right">
                    <div class="flex flex-col items-end gap-1">
                      <div class="text-[11px] font-mono tabular-nums">
                        <span class="font-bold text-[#0F172A]">{{ tenant.quotaUsed }}</span>
                        <span class="text-[#64748B]"> / {{ tenant.quotaLimit }}</span>
                      </div>
                      <div class="w-24 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          class="h-full bg-[#10B981] rounded-full"
                          :style="{ width: Math.min(100, (tenant.quotaUsed / tenant.quotaLimit) * 100) + '%' }"
                        ></div>
                      </div>
                    </div>
                  </td>

                  <td class="p-3 text-center">
                    <button
                      @click="handleImpersonate(tenant)"
                      class="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-[11px] rounded border-b-2 border-slate-700 active:translate-y-[1px] transition-all flex items-center justify-center gap-1 mx-auto shadow-xs min-h-[36px]"
                    >
                      <span>🔑</span>
                      <span>Masuk (Impersonate)</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>

    <!-- Modal Buat Invoice Tagihan Langganan -->
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
              v-model="selectedTenantId"
              class="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            >
              <option v-for="tenant in tenants" :key="tenant.id" :value="tenant.id">
                {{ tenant.name }} ({{ tenant.phone }})
              </option>
            </select>
          </div>

          <!-- Pilih Paket -->
          <div>
            <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">Nama Paket Langganan</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="(pkgInfo, key) in packagesInfo"
                :key="key"
                type="button"
                @click="selectedPackage = key; handlePackageChange()"
                :class="[
                  'p-3 rounded-lg border text-center flex flex-col items-center gap-0.5 transition-all',
                  selectedPackage === key
                    ? 'border-[#10B981] bg-[#ECFDF5] text-[#00422B] font-bold shadow-xs'
                    : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50'
                ]"
              >
                <span class="text-xs font-bold">{{ key }}</span>
                <span class="text-[10px] font-mono tabular-nums opacity-80">{{ formatCurrency(pkgInfo.price) }}</span>
              </button>
            </div>
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
