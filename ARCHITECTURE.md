# System Architecture

```text
[ Vue 3 PWA (Kasir) ] <--- Web Bluetooth ---> [ Printer Thermal (Label) ]
         |
         | (HTTPS / REST / Pinia State)
         v
[ Supabase (Backend) ] ---> [ PostgreSQL DB ]
         |             ---> [ Storage (PDF) ]
         |
[ Superadmin Vue Portal ]
```

* Frontend sepenuhnya dikendalikan oleh Vite + Vue 3 dan di-hosting di **Vercel**.
* Backend dan autentikasi sepenuhnya dikelola menggunakan BaaS **Supabase**.
