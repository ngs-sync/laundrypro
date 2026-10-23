<script setup>
import { ref, computed, watch } from 'vue'
import { useOwnerStore } from '../stores/useOwnerStore'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'success'])
const ownerStore = useOwnerStore()

// Form State
const form = ref({
  business_name: '',
  address: '',
  tenant_code: ''
})

const isCheckingCode = ref(false)
const isCodeUnique = ref(null) // null | true | false
const isSubmitting = ref(false)
const submitError = ref('')

// Quota Validation
const currentBranchCount = computed(() => ownerStore.branches.length)
const maxOutletsQuota = computed(() => ownerStore.maxOutlets)
const isQuotaExceeded = computed(() => currentBranchCount.value >= maxOutletsQuota.value)

// WhatsApp CTA Link for Upgrade
const waSuperadminUrl = computed(() => {
  const currentPlanName = ownerStore.activeBranch?.subscription_plans?.name || 'Starter/Pro'
  const text = encodeURIComponent(
    `Halo Superadmin LaundryPro, saya ingin upgrade paket langganan untuk tambah cabang baru.\n` +
    `Cabang Aktif: ${ownerStore.branches[0]?.business_name || 'Laundry'}\n` +
    `Paket Saat Ini: ${currentPlanName} (${currentBranchCount.value}/${maxOutletsQuota.value} cabang)`
  )
  return `https://wa.me/6281234567890?text=${text}`
})

// Sanitize & Format Code Input (Uppercase, No Spaces)
function handleCodeInput(event) {
  const rawValue = event.target.value || ''
  const formatted = rawValue.replace(/\s+/g, '').toUpperCase()
  form.value.tenant_code = formatted
  validateCodeLive(formatted)
}

let checkTimeout = null
function validateCodeLive(code) {
  if (checkTimeout) clearTimeout(checkTimeout)

  if (!code || code.length < 2) {
    isCodeUnique.value = null
    isCheckingCode.value = false
    return
  }

  isCheckingCode.value = true
  checkTimeout = setTimeout(async () => {
    try {
      const unique = await ownerStore.checkTenantCodeUnique(code)
      isCodeUnique.value = unique
    } catch (err) {
      console.warn('Live code check failed:', err)
      isCodeUnique.value = null
    } finally {
      isCheckingCode.value = false
    }
  }, 400)
}

// Reset form on open
watch(() => props.show, (val) => {
  if (val) {
    form.value = {
      business_name: '',
      address: '',
      tenant_code: ''
    }
    isCodeUnique.value = null
    isCheckingCode.value = false
    submitError.value = ''
  }
})

async function handleSubmit() {
  if (isQuotaExceeded.value) return
  if (!form.value.business_name.trim() || !form.value.tenant_code.trim()) {
    submitError.value = 'Mohon isi nama cabang dan kode cabang.'
    return
  }
  if (isCodeUnique.value === false) {
    submitError.value = 'Kode cabang sudah terpakai. Gunakan kode unik lain.'
    return
  }

  isSubmitting.value = true
  submitError.value = ''

  try {
    const newBranch = await ownerStore.createBranch(form.value)
    emit('success', newBranch)
    emit('close')
  } catch (err) {
    submitError.value = err.message || 'Gagal membuat cabang baru.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    @click.self="emit('close')"
  >
    <div class="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col gap-5 border border-[#E2E8F0] animate-slide-up">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">🏪</span>
            <h3 class="text-lg font-black text-[#0F172A]">Tambah Cabang Baru (Self-Service)</h3>
          </div>
          <p class="text-xs text-[#64748B] mt-0.5">
            Penggunaan kuota: <span class="font-bold text-[#0F172A]">{{ currentBranchCount }} dari {{ maxOutletsQuota }} cabang</span>
          </p>
        </div>
        <button
          @click="emit('close')"
          class="w-8 h-8 rounded-full bg-[#F8FAFC] text-[#0F172A] font-bold flex items-center justify-center hover:bg-slate-200 border border-[#E2E8F0]"
        >
          ✕
        </button>
      </div>

      <!-- PAYWALL UI (Jika Kuota Habis) -->
      <div v-if="isQuotaExceeded" class="bg-amber-50 p-5 rounded-xl border border-amber-200 flex flex-col items-center text-center gap-3">
        <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl shadow-inner">
          🔒
        </div>
        <div>
          <h4 class="text-base font-extrabold text-amber-900">Kuota Tambah Cabang Telah Habis</h4>
          <p class="text-xs text-amber-800 mt-1">
            Paket Anda saat ini membatasi hingga <span class="font-bold">{{ maxOutletsQuota }} cabang</span>.
            Silakan upgrade paket langganan Anda untuk membuka fitur multi-cabang tanpa batas.
          </p>
        </div>

        <a
          :href="waSuperadminUrl"
          target="_blank"
          class="w-full min-h-[52px] py-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold text-sm rounded-xl shadow-md transition-all active:translate-y-[2px] flex items-center justify-center gap-2 mt-2"
        >
          <span>💬</span>
          <span>Upgrade Paket via WA Superadmin</span>
        </a>
      </div>

      <!-- FORM UI (Jika Kuota Tersedia) -->
      <form v-else @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Nama Cabang -->
        <div>
          <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">
            Nama Cabang Baru <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="form.business_name"
            type="text"
            placeholder="Contoh: LaundryPro Cabang Melati"
            required
            class="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
          />
        </div>

        <!-- Alamat Cabang -->
        <div>
          <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">
            Alamat Cabang
          </label>
          <textarea
            v-model="form.address"
            rows="2"
            placeholder="Jl. Melati No. 45, Kebayoran Baru..."
            class="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
          ></textarea>
        </div>

        <!-- Kode Cabang Manual dengan Live Check -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-bold uppercase text-[#64748B]">
              Kode Unik Cabang <span class="text-rose-500">*</span>
            </label>
            <span class="text-[10px] text-[#64748B]">Otomatis Uppercase & Tanpa Spasi</span>
          </div>

          <div class="relative">
            <input
              :value="form.tenant_code"
              @input="handleCodeInput"
              type="text"
              placeholder="LAUN02"
              required
              class="w-full pl-3.5 pr-10 py-2.5 bg-[#F8FAFC] border rounded-xl text-sm font-mono font-extrabold uppercase text-[#0F172A] focus:outline-none"
              :class="[
                isCodeUnique === true
                  ? 'border-[#10B981] bg-emerald-50/30'
                  : (isCodeUnique === false
                    ? 'border-rose-500 bg-rose-50/30'
                    : 'border-[#E2E8F0] focus:border-[#10B981]')
              ]"
            />

            <!-- Indikator Live Check -->
            <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              <span v-if="isCheckingCode" class="animate-spin text-xs text-slate-400">🔄</span>
              <span v-else-if="isCodeUnique === true" class="text-base text-emerald-600 font-extrabold" title="Kode Unik & Tersedia">✅</span>
              <span v-else-if="isCodeUnique === false" class="text-base text-rose-500 font-extrabold" title="Kode Sudah Terpakai">❌</span>
            </div>
          </div>

          <!-- Helper / Status Text -->
          <div class="mt-1 flex items-center justify-between text-[11px]">
            <span v-if="isCodeUnique === true" class="text-emerald-600 font-bold">
              ✓ Kode cabang unik dan tersedia.
            </span>
            <span v-else-if="isCodeUnique === false" class="text-rose-600 font-bold">
              ✕ Kode cabang ini sudah digunakan oleh toko lain.
            </span>
            <span v-else class="text-[#64748B]">
              Kode ini digunakan staf untuk login ke cabang ini.
            </span>
          </div>
        </div>

        <div v-if="submitError" class="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200">
          {{ submitError }}
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs rounded-xl transition-all border border-slate-200 min-h-[44px]"
          >
            Batal
          </button>

          <button
            type="submit"
            :disabled="isSubmitting || isCodeUnique === false"
            class="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl border-b-2 border-[#059669] shadow-md transition-all active:translate-y-[2px] min-h-[44px] flex items-center gap-1.5"
          >
            <span v-if="isSubmitting" class="animate-spin">🔄</span>
            <span>+ Buat Cabang Sekarang</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
