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
  <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
    <div class="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
      <div>
        <span class="text-xs font-semibold uppercase text-slate-400 block tracking-wider">Input Kiloan (Kg)</span>
        <span class="text-xs text-slate-500">Rp {{ pricePerKg.toLocaleString('id-ID') }} / kg</span>
      </div>
      <div class="text-right">
        <span class="text-3xl font-extrabold text-slate-800 font-mono">
          {{ modelValue || '0' }} <span class="text-sm font-normal text-slate-500">kg</span>
        </span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        @click="handleShortcut(0.5)"
        class="py-2 px-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all text-sm flex items-center justify-center gap-1"
      >
        <span>+0.5 kg</span>
      </button>
      <button
        type="button"
        @click="handleShortcut(1.0)"
        class="py-2 px-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all text-sm flex items-center justify-center gap-1"
      >
        <span>+1.0 kg</span>
      </button>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="digit in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
        :key="digit"
        type="button"
        @click="handleKeyPress(digit)"
        class="h-14 text-2xl font-bold rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95 active:bg-slate-300 transition-all flex items-center justify-center shadow-xs"
      >
        {{ digit }}
      </button>

      <button
        type="button"
        @click="handleKeyPress('C')"
        class="h-14 text-lg font-bold rounded-xl bg-rose-100 text-rose-600 hover:bg-rose-200 active:scale-95 transition-all flex items-center justify-center"
      >
        C
      </button>

      <button
        type="button"
        @click="handleKeyPress('0')"
        class="h-14 text-2xl font-bold rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center"
      >
        0
      </button>

      <button
        type="button"
        @click="handleKeyPress('BACKSPACE')"
        class="h-14 text-lg font-bold rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 active:scale-95 transition-all flex items-center justify-center"
      >
        ⌫
      </button>
    </div>

    <button
      type="button"
      @click="handleAddCart"
      :disabled="!modelValue || parseFloat(modelValue) <= 0"
      class="w-full py-3.5 bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-base shadow-sm hover:bg-emerald-600 active:scale-98 transition-all flex items-center justify-center gap-2"
    >
      <span>+ Tambahkan Kiloan</span>
    </button>
  </div>
</template>
