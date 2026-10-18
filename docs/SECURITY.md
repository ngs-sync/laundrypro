# Security & Tenant Isolation

* **Isolasi Data SaaS (Multi-Tenant):** Sistem bersandar penuh pada Row Level Security (RLS) PostgreSQL. Kolom `tenant_id` bersifat wajib pada setiap entitas operasional.
* **Pencegahan Eksploitasi Trial 30 Hari:** 
  - Validasi ketat pengikatan 1 Nomor WhatsApp untuk 1 akun pengguna.
  - Implementasi Device fingerprinting atau LocalStorage flag untuk mencegah eksploitasi trial per perangkat.
* **Impersonation Superadmin:** Bypass keamanan RLS menggunakan fungsi khusus `is_superadmin()` dalam database untuk memudahkan penanganan keluhan pelanggan (customer support).
