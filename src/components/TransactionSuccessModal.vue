<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  transaction: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const formattedTotal = computed(() => {
  if (!props.transaction || !props.transaction.total_amount) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(props.transaction.total_amount)
})

function handleClose() {
  emit('close')
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 max-w-md mx-auto animate-fade-in"
  >
    <div class="bg-white rounded-3xl p-6 w-full text-center flex flex-col items-center gap-4 shadow-2xl border border-slate-100">
      <!-- Success Icon -->
      <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-black shadow-inner">
        ✓
      </div>

      <!-- Title & Status Badge -->
      <div>
        <h2 class="text-xl font-bold text-slate-800">Transaksi Berhasil!</h2>
        <div class="mt-1 flex items-center justify-center gap-2">
          <span class="text-xs text-slate-500">Status Pembayaran:</span>
          <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
            {{ transaction?.status || 'LUNAS' }}
          </span>
        </div>
      </div>

      <!-- Transaction Details Card -->
      <div v-if="transaction" class="w-full bg-slate-50 p-4 rounded-2xl text-left text-xs flex flex-col gap-2.5 border border-slate-200">
        <div class="flex justify-between border-b border-slate-200 pb-2">
          <span class="text-slate-500 font-medium">No. Nota:</span>
          <span class="font-bold text-slate-800 font-mono">{{ transaction.receipt_number || '-' }}</span>
        </div>

        <div class="flex justify-between border-b border-slate-200 pb-2">
          <span class="text-slate-500 font-medium">Nama Pelanggan:</span>
          <span class="font-semibold text-slate-800">{{ transaction.customer_name || 'Pelanggan Umum' }}</span>
        </div>

        <div v-if="transaction.customer_phone" class="flex justify-between border-b border-slate-200 pb-2">
          <span class="text-slate-500 font-medium">No. WA / Telepon:</span>
          <span class="font-mono text-slate-700">{{ transaction.customer_phone }}</span>
        </div>

        <div class="flex justify-between border-b border-slate-200 pb-2">
          <span class="text-slate-500 font-medium">Metode Bayar:</span>
          <span class="font-bold text-slate-700 uppercase">{{ transaction.payment_method || 'CASH' }}</span>
        </div>

        <div v-if="transaction.created_at" class="flex justify-between border-b border-slate-200 pb-2">
          <span class="text-slate-500 font-medium">Waktu Transaksi:</span>
          <span class="text-slate-600 font-mono">{{ transaction.created_at }}</span>
        </div>

        <div class="flex justify-between items-center pt-1">
          <span class="text-slate-700 font-extrabold text-sm">Total Bayar:</span>
          <span class="font-black text-emerald-600 font-mono text-lg">{{ formattedTotal }}</span>
        </div>
      </div>

      <!-- Itemized summary list -->
      <div v-if="transaction?.items?.length" class="w-full bg-slate-50/60 p-3 rounded-xl text-left text-xs border border-slate-200 max-h-36 overflow-y-auto flex flex-col gap-1.5">
        <span class="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1 block">Rincian Item:</span>
        <div
          v-for="(item, idx) in transaction.items"
          :key="idx"
          class="flex justify-between items-center text-slate-700 text-[11px]"
        >
          <span class="truncate font-medium pr-2">{{ item.name || item.service_name }}</span>
          <span class="font-mono whitespace-nowrap text-slate-600">
            {{ item.qty }} {{ item.unit || 'x' }} @ {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price) }}
          </span>
        </div>
      </div>

      <!-- Close / New Transaction Button -->
      <button
        @click="handleClose"
        class="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600 active:scale-95 transition-all text-base mt-1"
      >
        Selesai / Transaksi Baru
      </button>
    </div>
  </div>
</template>
