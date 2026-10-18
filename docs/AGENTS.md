# Instruksi Khusus untuk AI Agent (Jules)

Jules, saat mengembangkan aplikasi Vue 3 ini, patuhi aturan mutlak berikut:
1. **Gunakan Vue 3 Composition API**: Wajib menulis komponen dalam format Single File Component (SFC) menggunakan sintaks `<script setup>`.
2. **Gunakan Tailwind CSS**: Lakukan styling murni dengan utilitas kelas Tailwind. Dilarang keras menggunakan file CSS khusus (`scoped` block) kecuali untuk animasi yang tidak bisa diatasi Tailwind.
3. **Arsitektur Mobile-First**: Komponen antarmuka (UI) wajib dibuat responsif dengan prioritas rasio vertikal layar HP. Pastikan tombol berukuran besar untuk kemudahan jari.
4. **Keamanan Database Tenant**: Setiap kueri *fetch/insert* data ke Supabase harus mematuhi kebijakan `tenant_id`.
5. **Akses Hardware Natural**: Jangan menggunakan framework hybrid (Capacitor/Cordova). Gunakan Native Web API (misal: Web Bluetooth API) karena ini adalah aplikasi PWA murni.
