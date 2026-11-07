# PANDUAN LENGKAP INTEGRASI GOOGLE APPS SCRIPT & GOOGLE SHEETS
## e-Pondok Keuangan PP. AL-USYMUNI — Multi-Perangkat (Cloud Database)

Panduan ini menjelaskan langkah demi langkah cara menghubungkan aplikasi web **e-Pondok** dengan **Google Sheets** menggunakan **Google Apps Script** sebagai backend database cloud gratis, aman, dan tanpa biaya langganan server.

Dengan integrasi ini:
- Seluruh data **Santri, Transaksi Syahriah, Pembayaran Lain, Tagihan Kustom, Pengeluaran Kas, dan Pengaturan Sistem** otomatis tersimpan di Google Spreadsheet.
- Aplikasi e-Pondok dapat diakses dan digunakan dari **banyak perangkat sekaligus** (Laptop Kantor, HP Android Bendahara, Tablet, Laptop Pengurus) dan datanya langsung tersinkronisasi!
- Tetap dapat berjalan secara offline jika internet terputus (data tersimpan di memori perangkat, lalu otomatis disinkronkan saat online).

---

### LANGKAH 1: Buat Google Spreadsheet Baru
1. Buka browser dan kunjungi [Google Sheets](https://sheets.new) atau buka Google Drive pesantren.
2. Buat Spreadsheet Baru.
3. Beri nama file, misalnya: **Database e-Pondok PP AL-USYMUNI**.
*(Catatan: Anda tidak perlu membuat lembar/kolom manual, karena skrip akan membuatnya secara otomatis).*

---

### LANGKAH 2: Buka Editor Google Apps Script
1. Pada menu atas Spreadsheet, klik menu **Ekstensi** (Extensions) -> pilih **Apps Script**.
2. Tab baru editor Google Apps Script akan terbuka.
3. Hapus seluruh isi kode bawaan (`function myFunction() { ... }`).
4. Buka file [`Code.gs`](Code.gs), salin (**Copy**) seluruh kodenya, dan tempelkan (**Paste**) ke editor Apps Script.
5. Klik ikon **Simpan** (ikon disket) atau tekan `Ctrl + S`.

---

### LANGKAH 3: Deploy (Terapkan) Sebagai Aplikasi Web (Web App)
> ⚠️ **SANGAT PENTING: Ikuti izin akses ini dengan teliti agar semua perangkat bisa terhubung!**

1. Di pojok kanan atas editor Apps Script, klik tombol biru **Terapkan** (Deploy) -> pilih **Penerapan Baru** (New deployment).
2. Di sebelah kiri tulisan *"Pilih jenis"*, klik ikon gerigi ⚙️ -> pilih **Aplikasi Web** (Web app).
3. Isi formulir konfigurasi berikut:
   - **Deskripsi**: `e-Pondok Cloud API v2`
   - **Jalankan sebagai (Execute as)**: `Saya (email_anda@gmail.com)` *(Pilih opsi akun Google Anda)*
   - **Siapa yang memiliki akses (Who has access)**: **`Siapa saja`** (*Anyone*) — *Ini wajib dipilih agar aplikasi web di browser HP/Laptop dapat mengirim dan mengambil data*.
4. Klik tombol **Terapkan** (Deploy).
5. Jika muncul jendela otorisasi izin:
   - Klik **Beri Akses** (Authorize access).
   - Pilih akun Google Anda.
   - Jika muncul peringatan *"Google hasn't verified this app"*, klik **Lanjutan** (Advanced) di bagian bawah -> klik **Buka Database e-Pondok (tidak aman)** / *Go to Database e-Pondok (unsafe)*.
   - Klik **Izinkan** (Allow).
6. Setelah selesai, Google akan menampilkan **URL Aplikasi Web** (Web App URL).
   - Format URL contoh: `https://script.google.com/macros/s/AKfycb.../exec`
   - Klik tombol **Salin** (Copy) pada URL Aplikasi Web tersebut!

---

### LANGKAH 4: Hubungkan ke Aplikasi e-Pondok
1. Buka aplikasi **e-Pondok** di browser Anda.
2. Klik menu **Pengaturan** (atau klik ikon Cloud di header atas, atau buka menu **Backup & Restore**).
3. Cari kartu **"Integrasi Google Apps Script (Cloud Database)"**.
4. Tempelkan (**Paste**) URL Web App yang telah disalin tadi ke kolom **URL Web App Google Apps Script**.
5. Klik tombol **"Tes Koneksi"** untuk memastikan koneksi berhasil (akan muncul notifikasi hijau *"Terhubung ke Spreadsheet"*).
6. Klik tombol **"Unggah Data Awal ke Cloud (Push)"** untuk mengirim data santri dan transaksi yang saat ini ada di aplikasi ke Google Sheets.
7. Buka tab Google Spreadsheet Anda, Anda akan melihat lembar **Santri**, **Transaksi**, **MutasiKamar**, dan **Pengaturan** sudah terisi rapi!

---

### LANGKAH 5: Cara Mengakses dari Perangkat Lain (HP / Laptop Lain)
Agar perangkat lain (misal HP Android bendahara atau laptop pengurus lain) dapat menggunakan database yang sama:
1. Buka aplikasi web **e-Pondok** di browser perangkat tersebut (Chrome / Safari / Firefox).
2. Buka menu **Pengaturan** -> bagian **Integrasi Google Apps Script**.
3. Masukkan **URL Web App Google Apps Script yang SAMA**.
4. Klik **"Tarik Data dari Cloud (Pull)"**.
5. Seluruh data santri dan transaksi seketika muncul di perangkat baru tersebut!
6. Setiap kali ada pencatatan pembayaran atau transaksi di perangkat mana pun, data otomatis tersimpan ke Google Sheets dan dapat disinkronkan ke seluruh perangkat.

---

### FITUR KESELAMATAN & KEUNGGULAN:
- **Offline-First Resilience**: Jika perangkat tidak tersambung internet, aplikasi tetap dapat digunakan secara normal untuk mencatat transaksi ke penyimpanan lokal, dan saat kembali online tinggal klik tombol **Sinkronkan Sekarang**.
- **Backup Terpadu**: Di Google Sheets, data tersimpan dalam bentuk tabel rapi yang bisa Anda cetak atau unduh ke file Excel (`.xlsx`) kapan saja melalui menu *File -> Download -> Microsoft Excel*.
