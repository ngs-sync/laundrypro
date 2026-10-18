# Testing & QA Scenarios

## 1. RLS (Row Level Security) Test
* Login sebagai Toko A, pastikan TIDAK BISA melihat transaksi Toko B.
* Login sebagai Superadmin, pastikan BISA melihat semua toko.

## 2. PWA & State (Pinia) Test
* Test mematikan koneksi internet (Airplane mode), pastikan keranjang form tidak hilang (Pinia persist/LocalStorage).
* Test tampilan layar di mode simulasi Mobile Chrome.

## 3. Bluetooth Hardware Test
* Test Bluetooth pairing ke printer Eppos 58mm via Web Bluetooth API.
