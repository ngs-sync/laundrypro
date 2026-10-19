<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  pricePerKg: {
    type: Number,
    default: 7000
  }
})

const emit = defineEmits(['update:modelValue', 'add-kiloan'])

function handleKeyPress(key) {
  let current = props.modelValue || ''

  if (key === 'C') {
    current = ''
  } else if (key === 'BACKSPACE') {
    current = current.slice(0, -1)
  } else if (key === '.') {
    if (!current.includes('.')) {
      current = current === '' ? '0.' : current + '.'
    }
  } else {
    if (current === '0') {
      current = key
    } else {
      const parts = current.split('.')
      if (parts[1] && parts[1].length >= 2) return
      current += key
    }
  }
  emit('update:modelValue', current)
}

function handleShortcut(addAmount) {
  const currentNum = parseFloat(props.modelValue) || 0
  const updated = (currentNum + addAmount).toFixed(2).replace(/\.00$/, '')
  emit('update:modelValue', updated)
}

function handleAddCart() {
  const val = parseFloat(props.modelValue)
  if (!isNaN(val) && val > 0) {
    emit('add-kiloan', val)
  }
}
</script>

<template>
  <div class="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col gap-3">
    <!-- Readout Display -->
    <div class="flex items-center justify-between bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
      <div>
        <span class="text-xs font-bold uppercase tracking-wider text-[#64748B] block">Input Berat Kiloan</span>
        <span class="text-xs font-mono text-[#64748B]">Rp {{ pricePerKg.toLocaleString('id-ID') }} / kg</span>
      </div>
      <div class="text-right">
        <span class="text-3xl font-bold text-[#0F172A] font-mono tabular-nums">
          {{ modelValue || '0' }} <span class="text-base font-normal text-[#64748B]">kg</span>
        </span>
      </div>
    </div>

    <!-- Quick Preset Chips -->
    <div class="grid grid-cols-3 gap-2">
      <button
        type="button"
        @click="handleShortcut(0.5)"
        class="h-12 bg-[#F1F5F9] text-[#0F172A] font-bold rounded-lg border border-[#CBD5E1] hover:bg-slate-200 active:translate-y-[2px] transition-all text-sm flex items-center justify-center gap-1 min-h-[48px]"
      >
        <span>+0.5 kg</span>
      </button>
      <button
        type="button"
        @click="handleShortcut(1.0)"
        class="h-12 bg-[#F1F5F9] text-[#0F172A] font-bold rounded-lg border border-[#CBD5E1] hover:bg-slate-200 active:translate-y-[2px] transition-all text-sm flex items-center justify-center gap-1 min-h-[48px]"
      >
        <span>+1.0 kg</span>
      </button>
      <button
        type="button"
        @click="handleShortcut(5.0)"
        class="h-12 bg-[#F1F5F9] text-[#0F172A] font-bold rounded-lg border border-[#CBD5E1] hover:bg-slate-200 active:translate-y-[2px] transition-all text-sm flex items-center justify-center gap-1 min-h-[48px]"
      >
        <span>+5.0 kg</span>
      </button>
    </div>

    <!-- Custom Numeric Keypad Matrix (3x4 grid, min height 64px) -->
    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="digit in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
        :key="digit"
        type="button"
        @click="handleKeyPress(digit)"
        class="h-16 text-2xl font-bold font-mono rounded-lg bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] border-b-2 hover:bg-slate-100 active:translate-y-[2px] transition-all flex items-center justify-center shadow-xs"
      >
        {{ digit }}
      </button>

      <button
        type="button"
        @click="handleKeyPress('C')"
        class="h-16 text-lg font-bold font-mono rounded-lg bg-[#FFF1F2] text-[#F43F5E] border border-[#FECDD3] border-b-2 hover:bg-rose-100 active:translate-y-[2px] transition-all flex items-center justify-center"
      >
        C
      </button>

      <button
        type="button"
        @click="handleKeyPress('0')"
        class="h-16 text-2xl font-bold font-mono rounded-lg bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] border-b-2 hover:bg-slate-100 active:translate-y-[2px] transition-all flex items-center justify-center"
      >
        0
      </button>

      <button
        type="button"
        @click="handleKeyPress('BACKSPACE')"
        class="h-16 text-lg font-bold font-mono rounded-lg bg-[#E2E8F0] text-[#0F172A] border border-[#CBD5E1] border-b-2 hover:bg-slate-300 active:translate-y-[2px] transition-all flex items-center justify-center"
      >
        ⌫
      </button>
    </div>

    <!-- Primary Add Button (Oversized, min 52px height) -->
    <button
      type="button"
      @click="handleAddCart"
      :disabled="!modelValue || parseFloat(modelValue) <= 0"
      class="w-full h-14 bg-[#10B981] disabled:bg-slate-200 disabled:text-slate-400 disabled:border-none text-white font-bold rounded-lg text-base border-b-2 border-[#059669] shadow-sm hover:bg-[#059669] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 min-h-[52px]"
    >
      <span>+ Tambahkan Kiloan</span>
    </button>
  </div>
</template>
