/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Main Application Entry Point
 * Inisialisasi aplikasi, helper animasi modal, & event listeners global
 * ==========================================================================
 */

// Buka Modal Dialog dengan Animasi Fade & Scale
function bukaModal(id) {
    const m = document.getElementById(id);
    const c = document.getElementById(id + '-content') || (m ? m.querySelector('div') : null);
    if (m) {
        m.classList.remove('hidden');
        setTimeout(() => {
            m.classList.remove('opacity-0');
            if (c) c.classList.remove('scale-95');
        }, 10);
    }
}

// Tutup Modal Dialog dengan Animasi Halus
function tutupModal(id) {
    const m = document.getElementById(id);
    const c = document.getElementById(id + '-content') || (m ? m.querySelector('div') : null);
    if (m) {
        m.classList.add('opacity-0');
        if (c) c.classList.add('scale-95');
        setTimeout(() => m.classList.add('hidden'), 300);
    }
}

// Inisialisasi Seluruh Sistem Aplikasi
function initApp() {
    // 1. Memuat Data dari LocalStorage
    if (typeof loadDataFromStorage === 'function') {
        loadDataFromStorage();
    }

    // Inisialisasi Kunci Pengurus & Autentikasi
    if (typeof initAuth === 'function') {
        initAuth();
    }

    // 2. Tampilkan Tanggal Masehi & Hijriah
    if (typeof updateDateHeader === 'function') {
        updateDateHeader();
        setInterval(updateDateHeader, 1000 * 60 * 60); // Update tiap 1 jam
    }
    
    // 3. Set Nilai Form Pengaturan Tarif
    const elTarif = document.getElementById('setting-tarif');
    if (elTarif && appSettings) {
        elTarif.value = appSettings.tarifSyahriah;
    }

    // 4. Inisialisasi Data Master & Dropdown
    if (typeof updateFiltersAndDropdowns === 'function') updateFiltersAndDropdowns();
    if (typeof renderPengaturanTahunAjaran === 'function') renderPengaturanTahunAjaran();
    if (typeof renderPengaturanTagihan === 'function') renderPengaturanTagihan();
    if (typeof renderPengaturanPembayaranLain === 'function') renderPengaturanPembayaranLain();
    if (typeof renderPengaturanPJDivisi === 'function') renderPengaturanPJDivisi();
    if (typeof renderPengaturanKhususIkhtibar === 'function') renderPengaturanKhususIkhtibar();
    if (typeof renderPengaturanKamar === 'function') renderPengaturanKamar();
    if (typeof renderPengaturanAuth === 'function') renderPengaturanAuth();
    if (typeof renderPengeluaranMenu === 'function') renderPengeluaranMenu();
    if (typeof updateLiburanFiltersAndDropdowns === 'function') updateLiburanFiltersAndDropdowns();
    if (typeof updatePulangFiltersAndDropdowns === 'function') updatePulangFiltersAndDropdowns();

    // 5. Buka Halaman Awal (Dashboard)
    if (typeof navigate === 'function') {
        navigate('dashboard');
    }

    // 6. Inisialisasi Cloud Sync Google Apps Script
    if (typeof initCloudSync === 'function') {
        initCloudSync();
    }
}

// Expose fungsi modal ke global window
window.bukaModal = bukaModal;
window.tutupModal = tutupModal;
window.initApp = initApp;

// Jalankan saat browser selesai loading
window.onload = () => {
    initApp();

    // Registrasi Service Worker untuk PWA (Instalasi Aplikasi di HP)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // Global Click Listener untuk menutup dropdown combobox saat klik di luar
    document.addEventListener('click', (e) => {
        // Dropdown Bebas Syahriah
        const dropBebas = document.getElementById('dropdown-santri-bebas');
        const inputBebas = document.getElementById('bebas-syahriah-search-input');
        if (dropBebas && !dropBebas.classList.contains('hidden')) {
            if (!dropBebas.contains(e.target) && e.target !== inputBebas) {
                dropBebas.classList.add('hidden');
            }
        }

        // Dropdown Boyong Santri
        const dropBoyong = document.getElementById('dropdown-santri-boyong');
        const inputBoyong = document.getElementById('boyong-search-input');
        if (dropBoyong && !dropBoyong.classList.contains('hidden')) {
            if (!dropBoyong.contains(e.target) && e.target !== inputBoyong) {
                dropBoyong.classList.add('hidden');
            }
        }
    });
};

