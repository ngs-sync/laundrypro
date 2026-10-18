# Coding Guidelines (Vue 3 Edition)

* **Paradigma:** Vue 3 Composition API menggunakan `<script setup>`.
* **Bahasa:** JavaScript murni. Hindari TypeScript untuk mempercepat proses setup MVP.
* **File Structure:** 
  - `/src/components` (Komponen UI fungsional seperti BaseButton.vue, Modal.vue).
  - `/src/views` atau `/src/pages` (Halaman utama seperti CashierView.vue, ShiftView.vue).
  - `/src/store` (Pinia store untuk state management: misal `useCartStore.js`).
  - `/src/lib` (Inisialisasi pihak ketiga: `supabase.js`).
* **Penamaan File:** PascalCase untuk Single File Components Vue (misal `TransactionCard.vue`), camelCase untuk file utilitas dan *store* (misal `formatCurrency.js`).
