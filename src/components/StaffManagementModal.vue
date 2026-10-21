<script setup>
import { ref, computed, watch } from 'vue'
import { useOwnerStore } from '../stores/useOwnerStore'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  staffToEdit: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'success'])
const ownerStore = useOwnerStore()

// Form State
const form = ref({
  full_name: '',
  username: '',
  password: '',
  tenant_id: ''
})

const isSubmitting = ref(false)
const submitError = ref('')

const isEditing = computed(() => !!props.staffToEdit)

// Owner's Branches Options
const branchOptions = computed(() => ownerStore.branches)

// Auto-fill form when editing or opening
watch([() => props.show, () => props.staffToEdit], ([showVal, staffVal]) => {
  if (showVal) {
    if (staffVal) {
      form.value = {
        full_name: staffVal.full_name || staffVal.name || '',
        username: staffVal.username || '',
        password: '', // Leave empty unless changing
        tenant_id: staffVal.tenant_id || ownerStore.activeBranchId || (ownerStore.branches[0]?.id || '')
      }
    } else {
      form.value = {
        full_name: '',
        username: '',
        password: '',
        tenant_id: ownerStore.activeBranchId || (ownerStore.branches[0]?.id || '')
      }
    }
    submitError.value = ''
  }
})

async function handleSubmit() {
  if (!form.value.full_name.trim() || !form.value.username.trim() || !form.value.tenant_id) {
    submitError.value = 'Mohon lengkapi Nama Lengkap, Username, dan Cabang.'
    return
  }

  if (!isEditing.value && !form.value.password) {
    submitError.value = 'Password/PIN wajib diisi untuk staf baru.'
    return
  }

  isSubmitting.value = true
  submitError.value = ''

  try {
    if (isEditing.value) {
      await ownerStore.updateStaff(props.staffToEdit.id, {
        full_name: form.value.full_name,
        username: form.value.username,
        tenant_id: form.value.tenant_id,
        ...(form.value.password ? { password: form.value.password } : {})
      })
    } else {
      await ownerStore.createStaff({
        full_name: form.value.full_name,
        username: form.value.username,
        password: form.value.password,
        tenant_id: form.value.tenant_id
      })
    }

    emit('success')
    emit('close')
  } catch (err) {
    submitError.value = err.message || 'Gagal menyimpan data staf.'
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
            <span class="text-xl">👥</span>
            <h3 class="text-lg font-black text-[#0F172A]">
              {{ isEditing ? 'Edit Data Staf Kasir' : 'Tambah Staf Kasir Baru' }}
            </h3>
          </div>
          <p class="text-xs text-[#64748B] mt-0.5">
            Atur kredensial login dan penugasan cabang untuk staf kasir
          </p>
        </div>
        <button
          @click="emit('close')"
          class="w-8 h-8 rounded-full bg-[#F8FAFC] text-[#0F172A] font-bold flex items-center justify-center hover:bg-slate-200 border border-[#E2E8F0]"
        >
          ✕
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Penugasan Ke Cabang -->
        <div>
          <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">
            Tugaskan ke Cabang <span class="text-rose-500">*</span>
          </label>
          <select
            v-model="form.tenant_id"
            required
            class="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
          >
            <option
              v-for="b in branchOptions"
              :key="b.id"
              :value="b.id"
            >
              🏪 {{ b.business_name || b.name }} (Kode: {{ b.tenant_code || 'LAUN' }})
            </option>
          </select>
        </div>

        <!-- Nama Lengkap -->
        <div>
          <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">
            Nama Lengkap Staf <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="form.full_name"
            type="text"
            placeholder="Contoh: Siti Rahmawati"
            required
            class="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
          />
        </div>

        <!-- Username -->
        <div>
          <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">
            Username Staf <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <input
              v-model="form.username"
              type="text"
              placeholder="siti_kasir"
              required
              class="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            />
          </div>
          <p class="text-[11px] text-[#64748B] mt-1">
            Format email virtual otomatis: <span class="font-mono text-[#10B981] font-bold">{{ (form.username || 'username').toLowerCase() }}.[tenant_code]@laundrypro.app</span>
          </p>
        </div>

        <!-- Password / PIN -->
        <div>
          <label class="block text-xs font-bold uppercase text-[#64748B] mb-1">
            Password / PIN Login
            <span v-if="!isEditing" class="text-rose-500">*</span>
            <span v-else class="text-[10px] text-[#64748B] lowercase">(Kosongkan jika tidak diubah)</span>
          </label>
          <input
            v-model="form.password"
            type="password"
            placeholder="******"
            :required="!isEditing"
            class="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
          />
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
            :disabled="isSubmitting"
            class="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl border-b-2 border-[#059669] shadow-md transition-all active:translate-y-[2px] min-h-[44px] flex items-center gap-1.5"
          >
            <span v-if="isSubmitting" class="animate-spin">🔄</span>
            <span>{{ isEditing ? 'Simpan Perubahan' : '+ Tambah Staf Baru' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
