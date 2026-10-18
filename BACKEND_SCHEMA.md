# Backend Database Schema (Supabase)

Tabel utama di PostgreSQL:
1. `tenants`: Profil toko, status trial, kuota.
2. `users`: Data login staf & pemilik (Berelasi ke tenant_id).
3. `services`: Master tarif cuci.
4. `transactions`: Nota induk (URL PDF Struk ada di sini).
5. `transaction_items`: Detail isi layanan per nota.
6. `shift_reconciliations`: Catatan selisih kas fisik vs sistem.
7. `subscriptions_invoices`: Tagihan bulanan SaaS dari Superadmin.

*Catatan: Seluruh tabel wajib menggunakan Row Level Security (RLS) berdasarkan tenant_id untuk isolasi data SaaS.*
