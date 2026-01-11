# MAXIMUS 🚀
**Asisten Finansial & Strategis Cerdas untuk Driver Maxim Modern.**

MAXIMUS adalah aplikasi Progressive Web App (PWA) yang dirancang khusus untuk membantu pengemudi Maxim mengelola keuangan, mengoptimalkan pendapatan, dan memantau performa harian secara profesional. Dengan antarmuka yang modern dan fitur berbasis data, MAXIMUS menjadi partner setia di jalanan.

---

## ✨ Fitur Utama

-   **📈 Profit Engine**: Kalkulator pendapatan cerdas yang membantu Anda menghitung hasil bersih setelah komisi dan biaya operasional secara *real-time*.
-   **🗺️ Smart Strategy Map**: Peta interaktif yang menunjukkan titik-titik strategis untuk mendapatkan orderan lebih optimal menggunakan teknologi Leaflet.
-   **📊 Financial Dashboard**: Visualisasi data pendapatan, pengeluaran, dan efisiensi harian melalui grafik interaktif yang ditenagai oleh Recharts.
-   **💸 Expense Tracking**: Catat pengeluaran operasional maupun pribadi dengan mudah untuk mendapatkan laporan laba rugi yang akurat.
-   **⚡ High Performance PWA**: Instal aplikasi langsung di layar utama smartphone Anda. Ringan, cepat, dan didesain khusus untuk layar OLED agar hemat baterai.
-   **🔐 Secure Authentication**: Keamanan data terjamin dengan integrasi Supabase Auth menggunakan metode Magic Link yang praktis.

---

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun dengan teknologi mutakhir untuk menjamin kecepatan dan keandalan:

-   **Frontend**: [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Database & Auth**: [Supabase](https://supabase.com/)
-   **Motion & Animasi**: [Framer Motion](https://www.framer.com/motion/)
-   **Mapping**: [React Leaflet](https://react-leaflet.js.org/)
-   **Charts**: [Recharts](https://recharts.org/)
-   **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Memulai (Local Setup)

Ikuti langkah-langkah berikut untuk menjalankan MAXIMUS di perangkat lokal Anda:

### 1. Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) (versi terbaru direkomendasikan).

### 2. Instalasi
Clone repositori ini atau download source codenya, lalu jalankan perintah berikut di terminal:

```bash
# Masuk ke direktori projek
cd MAXIMUS

# Instal dependensi
npm install
```

### 3. Konfigurasi Environment
Buat file `.env` di direktori utama dan isi dengan kredensial Supabase Anda:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Menjalankan Aplikasi
Jalankan server pengembangan:

```bash
npm run dev
```
Buka browser dan akses alamat yang tertera (biasanya `http://localhost:5173`).

---

## 📦 Deployment

Aplikasi ini siap dideploy ke platform cloud seperti **Netlify** atau **Vercel**. Pastikan untuk mengatur *Environment Variables* di dashboard hosting Anda sesuai dengan file `.env`.

---

## 🤝 Kontribusi

Kami sangat terbuka untuk segala bentuk kontribusi! Jika Anda memiliki ide fitur atau menemukan bug, silakan buat *Issue* atau kirimkan *Pull Request*.

---

## 📜 Lisensi & Harapan
Dibuat dengan ❤️ untuk mendukung komunitas pengemudi di Indonesia agar lebih melek finansial dan efisien dalam bekerja.

**MAXIMUS - Maximizing Your Result.**