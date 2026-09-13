# PROGRAM PEMBACA REKAPITULASI KAS & OMSET BENGKEL (Shop & Drive & Bima Motor)

Program cerdas, modern, dan otomatis untuk **membaca, merekapitulasi, memvisualisasikan, dan menganalisis data pembukuan kas harian & omset bengkel** yang bersumber dari folder **`UANG TUNAI`**.

---

## 🎯 Tujuan & Kemampuan Program

Program ini dirancang khusus untuk membaca pembukuan kas kecil bengkel Shop & Drive dan Bima Motor secara instan, baik melalui antarmuka **Visual Web Dashboard** maupun **CLI / Terminal Cepat**.

1. **Auto-Discovery Folder UANG TUNAI**:
   - Secara otomatis mendeteksi dan membaca file database JSON (`database_kas_bengkel.json`), template CSV (`Template_Kas_Shop_And_Drive.csv`), maupun file ekspor CSV lainnya di folder `../UANG TUNAI`.
2. **Live Backend Sync**:
   - Jika server backend `UANG TUNAI` sedang menyala di `http://localhost:3000`, program ini langsung tersambung dan menyinkronkan data secara realtime.
3. **Analitik Keuangan & Visualisasi Interaktif**:
   - **Metrik Eksekutif (KPIs)**: Total Omset, Breakdown Penjualan Shop & Drive vs Bima Motor (% porsi), Total Non-Tunai (Bank Mandiri / EDC Card / Trade In), Total Biaya Bon Operasional, Total Sisa Kas Kecil, Fisik Riil Laci, serta Status Akurasi Kasir (Pas / Kurang / Lebih).
   - **Grafik Interaktif (Chart.js)**:
     - Tren Omset Harian (Shop & Drive vs Bima Motor vs Total).
     - Donut Chart Komposisi Metode Pembayaran & Pengeluaran.
     - Bar Chart Top Kategori Pengeluaran Bon Kasir (Bensin, Konsumsi, ATK, Sparepart).
4. **Filter & Pencarian Dinamis**:
   - Filter rentang waktu cepat: *Semua Waktu, Hari Ini, 7 Hari Terakhir, Bulan Ini, Bulan Lalu, atau Rentang Tanggal Khusus*.
   - Filter per Kasir / Shift.
   - Filter berdasarkan Status Selisih Fisik Kas (*Pas, Surplus, Defisit*).
   - Kotak pencarian langsung untuk mencari tanggal, nama bon, kasir, atau nomor struk.
5. **Detail Berita Acara & Rincian Bon**:
   - Klik pada baris rekap untuk membuka modal Berita Acara Kasir lengkap dengan rincian bon pengeluaran operasional per tanggal.
6. **Ekspor & Cetak Laporan**:
   - **Ekspor Excel (CSV)** dengan formula baku dan pembagian kolom yang rapi.
   - **Unduh Dokumen PDF** (format A4 landscape resolusi tinggi via `html2pdf`).
   - **Cetak Laporan Resmi**.
7. **Universal File Importer (Drag & Drop)**:
   - Pengguna dapat menarik & melepas (drag & drop) file database `.json` atau file rekap `.csv` kapan saja untuk langsung dianalisis.

---

## 🚀 Cara Menjalankan Program

### Cara 1: Menggunakan File Batch (Paling Mudah)
Cukup klik ganda (double-click) file:
```text
start.bat
```
*Program akan menampilkan ringkasan data di terminal dan langsung membuka Web Dashboard di browser Anda (`http://localhost:3500`)*.

---

### Cara 2: Menggunakan Node.js / NPM (Web Dashboard)
1. Buka Terminal / PowerShell di folder ini (`REPO TUNAI`).
2. Jalankan perintah:
   ```bash
   npm start
   ```
3. Buka browser di alamat:
   ```text
   http://localhost:3500
   ```

---

### Cara 3: Membaca Cepat via Terminal / CLI
Jika Anda hanya ingin melihat ringkasan rekapitulasi data kas di terminal/command prompt:
```bash
npm run baca
```
atau:
```bash
node baca-rekap.js
```

#### Opsi Parameter Perintah CLI:
- **Filter per Bulan**:
  ```bash
  node baca-rekap.js --bulan 2026-09
  ```
- **Filter per Nama Kasir**:
  ```bash
  node baca-rekap.js --kasir Ahmad
  ```
- **Format Output JSON**:
  ```bash
  node baca-rekap.js --json
  ```
- **Tentukan Lokasi Folder UANG TUNAI Khusus**:
  ```bash
  node baca-rekap.js --path "C:\Users\Swanto\OneDrive\Desktop\UANG TUNAI"
  ```

---

## 📁 Struktur File Proyek

```text
REPO TUNAI/
├── baca-rekap.js       # Script CLI pembaca & agregator data dari folder UANG TUNAI
├── server.js           # Server Node.js lokal & REST API (/api/rekap)
├── index.html          # Dashboard Web Visual & Interaktif
├── js/
│   └── app.js          # Core logic (Chart.js, filter, detail modal, excel export)
├── css/
│   └── style.css       # Styling kustom, glassmorphism, media print PDF
├── package.json        # Konfigurasi proyek & skrip npm
├── start.bat           # 1-Click launcher Windows
└── README.md           # Dokumentasi & panduan penggunaan
```

---

## 🧮 Rumus Baku & Logika Keuangan yang Diterapkan

1. **Total Pemasukan (Omset)** = Penjualan Shop & Drive + Penjualan Bima Motor
2. **Total Pengeluaran Kas** = Transfer Bank Mandiri + Pembayaran Card/EDC + Penghematan/Trade In + Pengeluaran Biaya Operasional
3. **Sisa Uang di Kas Kecil** = (Saldo Awal + Total Pemasukan) - Total Pengeluaran Kas
4. **Selisih Kasir** = Uang Fisik Riil Laci - Sisa Uang di Kas Kecil
   - `Selisih = 0` : **PAS (Sesuai)**
   - `Selisih > 0` : **LEBIH (Surplus)**
   - `Selisih < 0` : **KURANG (Defisit)**

---

*Dikembangkan untuk efisiensi monitoring dan audit kasir Shop & Drive dan Bima Motor.*
