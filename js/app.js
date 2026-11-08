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
        try { loadDataFromStorage(); } catch (e) { console.error("Error loadDataFromStorage:", e); }
    }

    // Segera perbarui Dashboard santri KPI agar tidak pernah kosong / 0
    if (typeof updateDashboard === 'function') {
        try { updateDashboard(); } catch (e) { console.error("Error updateDashboard awal:", e); }
    }

    // Inisialisasi Kunci Pengurus & Autentikasi
    if (typeof initAuth === 'function') {
        try { initAuth(); } catch (e) { console.error("Error initAuth:", e); }
    }

    // 2. Tampilkan Tanggal Masehi & Hijriah
    if (typeof updateDateHeader === 'function') {
        try {
            updateDateHeader();
            setInterval(updateDateHeader, 1000 * 60 * 60); // Update tiap 1 jam
        } catch (e) { console.error("Error updateDateHeader:", e); }
    }
    
    // 3. Set Nilai Form Pengaturan Tarif
    try {
        const elTarif = document.getElementById('setting-tarif');
        if (elTarif && appSettings) {
            elTarif.value = appSettings.tarifSyahriah;
        }
    } catch (e) { console.error("Error setting tarif:", e); }

    // 4. Inisialisasi Data Master & Dropdown
    const safeExec = (fnName) => {
        if (typeof window[fnName] === 'function') {
            try { window[fnName](); } catch (e) { console.warn(`Peringatan init ${fnName}:`, e); }
        }
    };

    safeExec('updateFiltersAndDropdowns');
    safeExec('renderPengaturanTahunAjaran');
    safeExec('renderPengaturanTagihan');
    safeExec('renderPengaturanPembayaranLain');
    safeExec('renderPengaturanPJDivisi');
    safeExec('renderPengaturanKhususIkhtibar');
    safeExec('renderPengaturanKamar');
    safeExec('renderPengaturanAuth');
    safeExec('renderPengeluaranMenu');
    safeExec('updateLiburanFiltersAndDropdowns');
    safeExec('updatePulangFiltersAndDropdowns');

    // 5. Buka Halaman Awal (Dashboard)
    if (typeof navigate === 'function') {
        try { navigate('dashboard'); } catch (e) { console.error("Error navigate dashboard:", e); }
    }

    // 6. Inisialisasi Cloud Sync Google Apps Script
    if (typeof initCloudSync === 'function') {
        try { initCloudSync(); } catch (e) { console.error("Error initCloudSync:", e); }
    }
}

// Expose fungsi modal ke global window
window.bukaModal = bukaModal;
window.tutupModal = tutupModal;
window.initApp = initApp;

let appInitialized = false;
function startAppOnce() {
    if (appInitialized) return;
    appInitialized = true;
    initApp();

    // Registrasi Service Worker untuk PWA (Instalasi Aplikasi di HP & Auto-Update)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            // Segera cek pembaruan file di hosting setiap kali aplikasi dibuka
            if (reg) {
                reg.update().catch(() => {});
            }
        }).catch(() => {});
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAppOnce);
} else {
    startAppOnce();
}

window.addEventListener('load', () => {
    startAppOnce();

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
});

