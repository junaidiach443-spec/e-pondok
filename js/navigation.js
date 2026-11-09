/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Navigation & View Routing
 * Pengelolaan sidebar, menu collapsible, header title, & navigasi halaman
 * ==========================================================================
 */

// Toggle Buka/Tutup Sidebar Mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('mobile-backdrop');
    if (!sidebar || !backdrop) return;

    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
        setTimeout(() => backdrop.classList.remove('opacity-0'), 10);
    } else {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('opacity-0');
        setTimeout(() => backdrop.classList.add('hidden'), 300);
    }
}

// Toggle Sub-menu Dropdown (Pemasukan / Pengeluaran)
function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    const icon = document.getElementById('icon-' + menuId);
    if (!menu) return;

    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        if (icon) icon.classList.add('rotate-180');
    } else {
        menu.classList.add('hidden');
        if (icon) icon.classList.remove('rotate-180');
    }
}

// Update Judul Halaman di Top Header
function updateHeaderTitle(title) {
    const el = document.getElementById('header-page-title');
    if (el) el.innerText = title;
}

// Navigasi Utama Halaman
function navigate(pageId) {
    // Auto-sync real-time dari cloud setiap kali berpindah halaman
    if (typeof pullFromCloud === 'function' && typeof cloudConfig !== 'undefined' && cloudConfig.webAppUrl) {
        const now = Date.now();
        if (!window._lastNavPull || (now - window._lastNavPull > 2500)) {
            window._lastNavPull = now;
            pullFromCloud({ silent: true });
        }
    }

    // Pastikan action panel syahriah tertutup & pilihan dikosongkan jika berpindah halaman
    if (typeof selectedBulanPay !== 'undefined') {
        selectedBulanPay = [];
    }
    const panelBayar = document.getElementById('action-panel-bayar');
    if (panelBayar) {
        panelBayar.classList.add('translate-y-full', 'hidden');
    }

    // Sembunyikan semua section halaman
    document.querySelectorAll('main > div > div[id^="page-"]').forEach(el => el.classList.add('hidden'));
    
    // Logika untuk halaman yang memiliki sub-halaman
    let targetPageId = pageId;
    if (pageId.startsWith('pembayaran-kustom')) {
        targetPageId = 'pembayaran-kustom';
    }
    
    const targetPage = document.getElementById('page-' + targetPageId);
    if (targetPage) targetPage.classList.remove('hidden');

    // Reset dan atur highlight link sidebar aktif
    document.querySelectorAll('nav a').forEach(el => {
        el.classList.remove('bg-emerald-50', 'text-emerald-800', 'font-bold', 'border-l-4', 'border-emerald-600', 'shadow-2xs', 'bg-indigo-50', 'text-indigo-700', 'text-[#3b28cc]', 'border-[#4d38f5]', 'shadow-xs');
        el.classList.add('text-gray-600');
    });

    const activeNav = document.getElementById('nav-' + (targetPageId === 'pembayaran-kustom' ? 'syahriah' : targetPageId));
    if (activeNav && targetPageId !== 'pembayaran-kustom') {
        activeNav.classList.remove('text-gray-600');
        activeNav.classList.add('bg-emerald-50', 'text-emerald-800', 'font-bold', 'border-l-4', 'border-emerald-600', 'shadow-2xs');
    }

    // Pastikan menu izin keluar terbuka jika membuka subhalaman izin keluar
    if (targetPageId === 'liburan-santri' || targetPageId === 'pulang-santri') {
        const menuIzin = document.getElementById('menu-izin-keluar');
        const iconIzin = document.getElementById('icon-menu-izin-keluar');
        if (menuIzin) menuIzin.classList.remove('hidden');
        if (iconIzin) iconIzin.classList.add('rotate-180');
    }

    const titles = {
        'dashboard': 'Dashboard',
        'master-santri': 'Master Data Santri',
        'santri': 'Data Santri Kamar', 
        'mutasi-kamar': 'Mutasi Kamar Santri',
        'boyong-santri': 'Boyong & GT Santri',
        'liburan-santri': 'Izin Keluar - Liburan Santri',
        'pulang-santri': 'Izin Keluar - Pulang Santri',
        'syahriah': 'Pembayaran Syahriah',
        'pembayaran-lain': 'Pembayaran Lain-Lain',
        'pengeluaran': 'Pengeluaran',
        'tahun-ajaran': 'Tahun Ajaran',
        'laporan': 'Laporan & Rekap',
        'riwayat': 'Riwayat Transaksi',
        'pengaturan': 'Pengaturan Sistem',
        'backup-restore': 'Backup & Restore Database',
        'pembayaran-kustom': 'Pembayaran ' + (window.currentTagihanKustom || '')
    };
    updateHeaderTitle(titles[targetPageId] || 'e-Pondok');

    // Auto-tutup sidebar mobile setelah navigasi
    if (window.innerWidth < 1024 && document.getElementById('sidebar') && !document.getElementById('sidebar').classList.contains('-translate-x-full')) {
        toggleSidebar();
    }

    // Trigger render spesifik halaman
    if (targetPageId === 'master-santri') {
        if (typeof updateMasterFiltersAndDropdowns === 'function') updateMasterFiltersAndDropdowns();
        if (typeof renderMasterSantriTable === 'function') renderMasterSantriTable();
    } else if (targetPageId === 'boyong-santri') {
        if (typeof updateBoyongFiltersAndDropdowns === 'function') updateBoyongFiltersAndDropdowns();
        if (typeof renderBoyongSantriTable === 'function') renderBoyongSantriTable();
    } else if (targetPageId === 'liburan-santri') {
        if (typeof updateLiburanFiltersAndDropdowns === 'function') updateLiburanFiltersAndDropdowns();
        if (typeof renderLiburanSantriPage === 'function') renderLiburanSantriPage();
    } else if (targetPageId === 'pulang-santri') {
        if (typeof updatePulangFiltersAndDropdowns === 'function') updatePulangFiltersAndDropdowns();
        if (typeof renderPulangSantriPage === 'function') renderPulangSantriPage();
    } else if (targetPageId === 'santri') {
        if (typeof updateFiltersAndDropdowns === 'function') updateFiltersAndDropdowns();
        if (typeof renderSemuaTabel === 'function') renderSemuaTabel();
        if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();
    } else if (targetPageId === 'mutasi-kamar') {
        if (typeof updateFiltersAndDropdowns === 'function') updateFiltersAndDropdowns();
        if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();
    } else if (targetPageId === 'dashboard' && typeof updateDashboard === 'function') {
        updateDashboard();
    } else if (targetPageId === 'pengeluaran') {
        if (!window.currentKategoriPengeluaran) {
            window.currentKategoriPengeluaran = 'Syahriah';
        }
        if (typeof renderPengeluaranMenu === 'function') renderPengeluaranMenu();
        if (typeof renderPengeluaran === 'function') renderPengeluaran();
    } else if (targetPageId === 'pembayaran-lain' && typeof renderPembayaranLainPage === 'function') {
        renderPembayaranLainPage();
    } else if (targetPageId === 'syahriah') {
        const vList = document.getElementById('view-syahriah-list');
        const vDetail = document.getElementById('view-syahriah-detail');
        const hList = document.getElementById('header-syahriah-list');
        if (vList) vList.classList.remove('hidden');
        if (vDetail) vDetail.classList.add('hidden');
        if (hList) hList.classList.remove('hidden');
        if (typeof updateFiltersAndDropdowns === 'function') updateFiltersAndDropdowns();
        if (typeof renderSyahriah === 'function') renderSyahriah();
        if (typeof hideActionPanel === 'function') hideActionPanel(true);
    } else if (targetPageId === 'pembayaran-kustom') {
        const vList = document.getElementById('view-kustom-list');
        const vDetail = document.getElementById('view-kustom-detail');
        const hList = document.getElementById('header-kustom-list');
        if (vList) vList.classList.remove('hidden');
        if (vDetail) vDetail.classList.add('hidden');
        if (hList) hList.classList.remove('hidden');
        if (typeof renderPembayaranKustomList === 'function') renderPembayaranKustomList();
    } else if (targetPageId === 'laporan') {
        const pLap = document.getElementById('page-laporan');
        const pLapDetail = document.getElementById('page-laporan-detail');
        if (pLap) pLap.classList.remove('hidden');
        if (pLapDetail) pLapDetail.classList.add('hidden');
        if (typeof renderLaporanRekap === 'function') renderLaporanRekap();
    } else if (targetPageId === 'riwayat' && typeof renderLaporan === 'function') {
        renderLaporan();
    } else if (targetPageId === 'pengaturan') {
        if (typeof renderPengaturanTahunAjaran === 'function') renderPengaturanTahunAjaran();
        if (typeof renderPengaturanTagihan === 'function') renderPengaturanTagihan();
        if (typeof renderPengaturanPembayaranLain === 'function') renderPengaturanPembayaranLain();
        if (typeof renderPengaturanPJDivisi === 'function') renderPengaturanPJDivisi();
        if (typeof renderPengaturanKhususIkhtibar === 'function') renderPengaturanKhususIkhtibar();
        if (typeof renderPengaturanKamar === 'function') renderPengaturanKamar();
        if (typeof renderPengaturanAuth === 'function') renderPengaturanAuth();
    } else if (targetPageId === 'backup-restore') {
        if (typeof renderBackupRestorePage === 'function') renderBackupRestorePage();
    }
}

// Expose ke global window
window.toggleSidebar = toggleSidebar;
window.toggleMenu = toggleMenu;
window.updateHeaderTitle = updateHeaderTitle;
window.navigate = navigate;
window.navigateToPage = navigate;
