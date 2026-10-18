# Product Requirements Document (PRD): LaundryPro SaaS

## 1. Visi & Model Bisnis
* **Nama Produk:** LaundryPro
* **Model Produk:** Multi-Tenant B2B SaaS (Software as a Service)
* **Target Pengguna:** Pemilik bisnis laundry mandiri, waralaba UMKM, dan staf operasional lapangan.
* **Proposisi Nilai:** UI zero-typing, paperless (Struk WA), dan kontrol bisnis berbasis rekonsiliasi kas (tanpa timer IoT).

## 2. Fitur Inti
* **Modul Kasir Koin:** 3 tombol besar (Cuci Saja, Cuci Kering Mandiri, Cuci Kering Drop-Off).
* **Modul Kiloan & Satuan:** Numpad angka besar untuk input berat manual.
* **Modul Struk Digital:** Generate PDF & kirim via wa.me (Tanpa API WhatsApp berbayar).
* **Label Internal:** Cetak tiket keranjang via Printer Thermal Bluetooth (Web Bluetooth API).
* **Rekonsiliasi Shift:** Buka/tutup laci kasir, audit uang tunai dan koin fisik vs sistem.

## 3. Hak Akses (RBAC)
* **Superadmin:** Manajemen tenant, impersonasi toko, penagihan.
* **Tenant Owner:** Laporan omzet, harga master, kontrol cabang.
* **Staf All-Rounder:** Kasir & update status produksi (Terkunci dari fitur hapus nota).
