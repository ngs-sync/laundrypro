# Technical Requirements Document (TRD)

## 1. Lingkungan Pengembangan
* **Framework Utama:** Vue 3 (Composition API dengan `<script setup>`).
* **Build Tool:** Vite.
* **Bahasa:** JavaScript.

## 2. Tech Stack Ecosystem
* **Frontend UI:** Tailwind CSS.
* **State Management:** Pinia (Standar resmi Vue).
* **Routing:** Vue Router.
* **Ikon:** Lucide Vue Next.
* **PWA:** vite-plugin-pwa (Aplikasi web progresif).
* **Backend & Auth:** Supabase (PostgreSQL, Supabase Auth, Storage).
* **Deployment:** Vercel (Terhubung ke GitHub utama).

## 3. Integrasi Hardware (Browser-based)
* **Printer Thermal:** navigator.bluetooth (Web Bluetooth API) menggunakan standar ESC/POS.
* **PDF Generator:** jspdf / html2pdf (Client-side rendering).
