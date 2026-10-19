<script setup>
import { ref, watch, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/useAuthStore'

const props = defineProps({
  isGuest: {
    type: Boolean,
    default: true
  },
  selectedCustomer: {
    type: Object,
    default: null
  },
  customerName: {
    type: String,
    default: ''
  },
  customerPhone: {
    type: String,
    default: ''
  },
  cartTotal: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits([
  'update:isGuest',
  'update:selectedCustomer',
  'update:customerName',
  'update:customerPhone'
])

const authStore = useAuthStore()
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const showDropdown = ref(false)
const searchDebounceTimer = ref(null)

const expectedPoints = computed(() => {
  return Math.floor(props.cartTotal / 10000)
})

function toggleGuest(value) {
  emit('update:isGuest', value)
  if (value) {
    emit('update:selectedCustomer', null)
    emit('update:customerName', '')
    emit('update:customerPhone', '')
    searchQuery.value = ''
    searchResults.value = []
    showDropdown.value = false
  }
}

async function searchCustomers(query) {
  if (!query || query.trim().length < 2) {
    searchResults.value = []
    showDropdown.value = false
    return
  }

  isSearching.value = true
  const tenantId = authStore.activeTenant?.id

  try {
    const cleanQuery = query.trim()
    let dbQuery = supabase
      .from('customers')
      .select('id, name, phone, points_balance, tenant_id')

    if (tenantId) {
      dbQuery = dbQuery.eq('tenant_id', tenantId)
    }

    const { data, error } = await dbQuery.or(
      `name.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`
    ).limit(5)

    if (error) {
      console.error('Error searching customers:', error)
      searchResults.value = []
    } else {
      searchResults.value = data || []
      showDropdown.value = true
    }
  } catch (err) {
    console.error('Exception searching customers:', err)
  } finally {
    isSearching.value = false
  }
}

function handleSearchInput() {
  if (searchDebounceTimer.value) clearTimeout(searchDebounceTimer.value)

  const val = searchQuery.value.trim()
  if (!props.selectedCustomer) {
    if (/^\d+$/.test(val)) {
      emit('update:customerPhone', val)
    } else {
      emit('update:customerName', val)
    }
  }

  searchDebounceTimer.value = setTimeout(() => {
    searchCustomers(searchQuery.value)
  }, 300)
}

function selectCustomer(cust) {
  emit('update:selectedCustomer', cust)
  emit('update:customerName', cust.name)
  emit('update:customerPhone', cust.phone || '')
  emit('update:isGuest', false)
  searchQuery.value = `${cust.name} (${cust.phone || 'No WA'})`
  showDropdown.value = false
}

function clearSelection() {
  emit('update:selectedCustomer', null)
  emit('update:customerName', '')
  emit('update:customerPhone', '')
  searchQuery.value = ''
  searchResults.value = []
  showDropdown.value = false
}

function handleNameInput(e) {
  emit('update:customerName', e.target.value)
}

function handlePhoneInput(e) {
  emit('update:customerPhone', e.target.value)
}

// Watchers
watch(
  () => props.selectedCustomer,
  (newCust) => {
    if (newCust) {
      searchQuery.value = `${newCust.name} (${newCust.phone || 'No WA'})`
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-bold uppercase text-[#64748B] tracking-wider">
        Pelanggan & Loyalty
      </h3>

      <!-- Guest Toggle Switch -->
      <div class="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg border border-[#CBD5E1]">
        <button
          type="button"
          @click="toggleGuest(false)"
          :class="[
            'px-3 py-1.5 rounded-md text-xs font-bold transition-all min-h-[36px]',
            !isGuest
              ? 'bg-[#10B981] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          ]"
        >
          👤 Member / Cari
        </button>

        <button
          type="button"
          @click="toggleGuest(true)"
          :class="[
            'px-3 py-1.5 rounded-md text-xs font-bold transition-all min-h-[36px]',
            isGuest
              ? 'bg-[#10B981] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          ]"
        >
          🌐 Guest (Anonim)
        </button>
      </div>
    </div>

    <!-- Mode Guest Active -->
    <div
      v-if="isGuest"
      class="bg-[#F8FAFC] p-3 rounded-lg border border-dashed border-[#CBD5E1] text-xs text-[#64748B] flex items-center gap-2"
    >
      <span class="text-lg">ℹ️</span>
      <div>
        <p class="font-bold text-[#0F172A]">Transaksi Pelanggan Umum</p>
        <p>Tanpa catatan kontak & poin loyalitas. Klik "Member / Cari" untuk mencatat poin.</p>
      </div>
    </div>

    <!-- Mode Member / Customer Search Active -->
    <div v-else class="flex flex-col gap-3">
      <!-- Selected Customer Card -->
      <div
        v-if="selectedCustomer"
        class="bg-[#ECFDF5] p-3.5 rounded-lg border border-[#10B981]/40 flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            👤
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-sm text-[#00422B]">{{ selectedCustomer.name }}</h4>
              <span class="bg-[#10B981] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                ⭐ {{ selectedCustomer.points_balance || 0 }} Poin
              </span>
            </div>
            <p class="text-xs text-[#059669] font-mono mt-0.5">
              📱 {{ selectedCustomer.phone || 'Tanpa nomor telepon' }}
            </p>
            <p v-if="cartTotal > 0" class="text-[11px] font-bold text-[#00422B] mt-1">
              🎉 Potensi Poin Baru: +{{ expectedPoints }} Poin
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="clearSelection"
          class="text-xs font-bold text-[#F43F5E] hover:text-rose-700 bg-white px-2.5 py-1.5 rounded border border-rose-200 shadow-2xs active:translate-y-[1px]"
        >
          Ganti
        </button>
      </div>

      <!-- Autocomplete Search Input -->
      <div v-else class="relative flex flex-col gap-2">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari Nama / No. WA (Contoh: Budi / 0812...)"
            @input="handleSearchInput"
            @focus="handleSearchInput"
            class="w-full pl-9 pr-8 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-sm font-medium focus:outline-none focus:border-[#10B981]"
          />
          <span class="absolute left-3 top-3 text-xs text-[#64748B]">🔍</span>
          <button
            v-if="searchQuery"
            @click="clearSelection"
            class="absolute right-3 top-2.5 text-xs text-[#64748B] hover:text-[#0F172A] font-bold"
          >
            ✕
          </button>
        </div>

        <!-- Autocomplete Dropdown List -->
        <div
          v-if="showDropdown && searchResults.length > 0"
          class="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-[#E2E8F0] shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-[#F1F5F9]"
        >
          <button
            v-for="cust in searchResults"
            :key="cust.id"
            type="button"
            @click="selectCustomer(cust)"
            class="w-full text-left p-3 hover:bg-[#ECFDF5] transition-colors flex items-center justify-between gap-2"
          >
            <div>
              <p class="text-sm font-bold text-[#0F172A]">{{ cust.name }}</p>
              <p class="text-xs text-[#64748B] font-mono">{{ cust.phone || 'Tanpa No. WA' }}</p>
            </div>
            <div class="text-right">
              <span class="bg-emerald-100 text-[#00422B] text-xs font-extrabold px-2 py-1 rounded font-mono border border-emerald-300">
                ⭐ {{ cust.points_balance || 0 }} Pts
              </span>
            </div>
          </button>
        </div>

        <!-- No search results note -->
        <div
          v-if="showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching"
          class="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] text-xs text-[#64748B]"
        >
          <p class="font-bold text-[#0F172A]">Pelanggan tidak ditemukan</p>
          <p class="mt-0.5">Isi nama & nomor WA di bawah. Pelanggan baru akan otomatis dibuat saat checkout!</p>
        </div>

        <!-- Manual Input fallback for new customer creation -->
        <div class="grid grid-cols-1 gap-2 pt-1">
          <input
            :value="customerName"
            type="text"
            placeholder="Nama Pelanggan Baru"
            @input="handleNameInput"
            class="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs font-medium focus:outline-none focus:border-[#10B981]"
          />
          <input
            :value="customerPhone"
            type="tel"
            placeholder="Nomor WA / Telepon (Contoh: 081234567890)"
            @input="handlePhoneInput"
            class="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs font-mono focus:outline-none focus:border-[#10B981]"
          />
        </div>

        <div v-if="cartTotal > 0 && (customerName || customerPhone)" class="text-xs font-bold text-[#10B981] bg-[#ECFDF5] p-2 rounded border border-[#10B981]/30">
          ✨ Transaksi ini akan mendapatkan +{{ expectedPoints }} Poin Loyalitas!
        </div>
      </div>
    </div>
  </div>
</template>
