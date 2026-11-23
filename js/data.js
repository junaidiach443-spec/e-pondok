/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Data Store & State Management
 * Default Data, LocalStorage Persistence, & Status Akses Global
 * ==========================================================================
 */

const DATA_VERSION = '2026-11-23-empty-master-v1';

// Konfigurasi Pengaturan Sistem Awal
var appSettings = {
    tahunAjaranList: [
        { ta: '1446/1447', aktif: false },
        { ta: '1447/1448', aktif: true }
    ],
    tarifSyahriah: 250000,
    tarifKomponenBulanan: {
        pondok: 100000,
        madrasah: 50000,
        makan: 100000
    },
    santriKomponenBulanan: {},
    santriBebasSyahriah: [],
    tagihanKustom: [
        { nama: 'Ikhtibar PPU', nominal: 150000 }
    ],
    pembayaranLainList: [
        { id: 'PL-1', nama: 'Uang Pendaftaran / Formulir', nominal: 100000, keterangan: 'Biaya pendaftaran santri baru', targetTipe: 'semua', targetSantri: [] },
        { id: 'PL-2', nama: 'Seragam & Kitab', nominal: 350000, keterangan: 'Paket seragam dan kitab pembelajaran', targetTipe: 'semua', targetSantri: [] },
        { id: 'PL-3', nama: 'Infaq / Shadaqah Pesantren', nominal: 50000, keterangan: 'Infaq sukarela / pembangunan', targetTipe: 'semua', targetSantri: [] }
    ],
    tarifKhususPL: [],
    tarifKhususIkhtibar: [],
    kamarList: [
        { id: 'KMR-1', nama: 'A-01', kapasitas: 20, keterangan: 'Asrama Putra' },
        { id: 'KMR-2', nama: 'A-02', kapasitas: 20, keterangan: 'Asrama Putra' },
        { id: 'KMR-3', nama: 'A-03', kapasitas: 20, keterangan: 'Asrama Putra' },
        { id: 'KMR-4', nama: 'B-01', kapasitas: 20, keterangan: 'Asrama Putra' },
        { id: 'KMR-5', nama: 'B-02', kapasitas: 20, keterangan: 'Asrama Putra' },
        { id: 'KMR-6', nama: 'B-04', kapasitas: 20, keterangan: 'Asrama Putra' },
        { id: 'KMR-7', nama: 'B-05', kapasitas: 20, keterangan: 'Asrama Putra' }
    ],
    kepanitiaan: [
        { divisi: 'KONSUMSI', pj: 'UST. JUNAIDI' },
        { divisi: 'KESEKRETARIATAN', pj: 'UST. AHMAD' }
    ],
    adminAuth: {
        username: 'admin@ppu',
        password: '@juna123',
        nama: 'Administrator',
        role: 'Bendahara Utama'
    }
};

// Data Induk Master Santri (Data awal kosong / bersih, diinput pengguna lewat aplikasi atau diimpor)
var santriData = [];

// Data Awal Transaksi Keuangan (Bersih 0 pemasukan/transaksi awal, data riil disinkronkan dari Cloud)
var transactions = [];

// Variabel State Global
var currentKategoriPengeluaran = 'Syahriah';
window.currentKategoriPengeluaran = currentKategoriPengeluaran;
var currentKategoriLaporan = '';
var currentTagihanKustom = ''; // Menyimpan nama tagihan kustom yang sedang dibuka
var currentCetakType = 'Syahriah'; // Menentukan jenis struk yang dicetak (Syahriah, Kustom, PembayaranLain)
var currentPembayaranLainTrxId = null;
var currentSelectedJenisPL = 'Uang Pendaftaran / Formulir';
var currentDetailSantriId = null;
var mutasiKamarList = []; // Riwayat mutasi / perpindahan kamar santri
var liburanSantriList = []; // Perizinan & riwayat liburan masal santri
var pulangSantriList = [];  // Perizinan & riwayat pulang insidentil santri

// Palette Nuansa Biru Harmonis untuk Progress Bar Dashboard & Kartu
const colorPalette = [
    { bg: 'bg-blue-600', bar: 'bg-blue-500', hex: '#2563eb' }, 
    { bg: 'bg-indigo-600', bar: 'bg-indigo-500', hex: '#4f46e5' }, 
    { bg: 'bg-sky-600', bar: 'bg-sky-500', hex: '#0284c7' }, 
    { bg: 'bg-blue-700', bar: 'bg-blue-600', hex: '#1d4ed8' }, 
    { bg: 'bg-slate-700', bar: 'bg-slate-600', hex: '#334155' }  
];

// 12 Bulan Kalender Hijriah untuk Syahriah Pesantren
const bulanIslam = [
    'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir',
    'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syaban',
    'Ramadhan', 'Syawal', 'Dzulqaidah', 'Dzulhijjah'
];

// Dapatkan Data Tarif Santri untuk Jenis Pembayaran Lain (Mengecek apakah dikhususkan atau kustom target)
function getTarifSantriPL(santriId, jenisNama) {
    const defaultItem = (appSettings.pembayaranLainList || []).find(p => p.nama === jenisNama);
    const standardNominal = defaultItem ? defaultItem.nominal : 0;
    
    // Cek apakah pos pembayaran lain ini dikhususkan hanya untuk santri-santri tertentu (kustom target)
    if (defaultItem && defaultItem.targetTipe === 'kustom') {
        const targets = Array.isArray(defaultItem.targetSantri) ? defaultItem.targetSantri : [];
        if (!targets.includes(santriId)) {
            return {
                isKhusus: true,
                bebas: true,
                nominal: 0,
                tidakDitargetkan: true,
                keterangan: 'Bukan Sasaran'
            };
        }
    }

    // Cek apakah pos pembayaran lain ini khusus santri baru / angkatan tertentu
    if (defaultItem && defaultItem.targetTipe === 'santri_baru') {
        const s = (typeof santriData !== 'undefined' && Array.isArray(santriData)) 
            ? santriData.find(x => x.id === santriId) 
            : null;
        const targetAngkatan = defaultItem.targetAngkatan || (typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '');
        const cleanTA = (str) => (str || '').replace(/[\/\-\s]/g, '').toLowerCase();

        const isBaru = s && (
            (s.tahunMasuk && cleanTA(s.tahunMasuk) === cleanTA(targetAngkatan)) ||
            (!s.tahunMasuk && s.isBaru)
        );

        if (!isBaru) {
            return {
                isKhusus: true,
                bebas: true,
                nominal: 0,
                tidakDitargetkan: true,
                keterangan: 'Khusus Santri Baru'
            };
        }
    }

    if (!appSettings.tarifKhususPL) appSettings.tarifKhususPL = [];
    const khusus = appSettings.tarifKhususPL.find(k => k.santriId === santriId && k.jenis === jenisNama);
    
    if (khusus) {
        return {
            isKhusus: true,
            bebas: Boolean(khusus.bebas),
            nominal: khusus.bebas ? 0 : (parseInt(khusus.nominal) || 0),
            keterangan: khusus.keterangan || 'Dikhususkan'
        };
    }
    return {
        isKhusus: false,
        bebas: false,
        nominal: standardNominal,
        keterangan: ''
    };
}

// Cek Apakah Santri Dibebaskan dari Tanggungan Syahriah (Dispensasi)
function isSantriBebasSyahriah(santriId) {
    if (!appSettings || !Array.isArray(appSettings.santriBebasSyahriah)) return false;
    return appSettings.santriBebasSyahriah.some(b => (typeof b === 'string' ? b === santriId : b.santriId === santriId));
}

// Ambil Informasi Detail Dispensasi Santri Bebas Syahriah
function getInfoBebasSyahriah(santriId) {
    if (!appSettings || !Array.isArray(appSettings.santriBebasSyahriah)) return null;
    return appSettings.santriBebasSyahriah.find(b => (typeof b === 'string' ? b === santriId : b.santriId === santriId)) || null;
}

// Dapatkan Data Tarif Santri untuk Tagihan Kustom / Ikhtibar (Mengecek apakah dibedakan)
function getTarifSantriKustom(santriId, tagihanNama) {
    const defaultTagihan = (appSettings.tagihanKustom || []).find(k => 
        k.nama === tagihanNama || 
        (tagihanNama && tagihanNama.toLowerCase().includes('ikhtibar') && k.nama.toLowerCase().includes('ikhtibar'))
    );
    const standardNominal = defaultTagihan ? defaultTagihan.nominal : 0;
    
    if (!appSettings.tarifKhususIkhtibar) appSettings.tarifKhususIkhtibar = [];
    const khusus = appSettings.tarifKhususIkhtibar.find(k => 
        k.santriId === santriId && 
        (k.tagihanNama === tagihanNama || !tagihanNama || (tagihanNama.toLowerCase().includes('ikhtibar') && (k.tagihanNama || '').toLowerCase().includes('ikhtibar')))
    );
    
    if (khusus) {
        return {
            isKhusus: true,
            bebas: Boolean(khusus.bebas),
            nominal: khusus.bebas ? 0 : (parseInt(khusus.nominal) || 0),
            keterangan: khusus.keterangan || 'Tarif Khusus / Dispensasi'
        };
    }
    return {
        isKhusus: false,
        bebas: false,
        nominal: standardNominal,
        keterangan: ''
    };
}

// Load Data dari LocalStorage
function loadDataFromStorage() {
    const savedVersion = localStorage.getItem('santriDataVersion');
    const isNewVersion = savedVersion === DATA_VERSION;

    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
        try {
            let parsed = JSON.parse(savedSettings);
            if (parsed && typeof parsed === 'object') {
                if (!parsed.kepanitiaan) {
                    parsed.kepanitiaan = appSettings.kepanitiaan;
                }
                if (!parsed.pembayaranLainList || !Array.isArray(parsed.pembayaranLainList)) {
                    parsed.pembayaranLainList = appSettings.pembayaranLainList;
                }
                if (!parsed.tarifKhususPL || !Array.isArray(parsed.tarifKhususPL)) {
                    parsed.tarifKhususPL = [];
                }
                if (!parsed.tarifKhususIkhtibar || !Array.isArray(parsed.tarifKhususIkhtibar)) {
                    parsed.tarifKhususIkhtibar = [];
                }
                if (!parsed.santriBebasSyahriah || !Array.isArray(parsed.santriBebasSyahriah)) {
                    parsed.santriBebasSyahriah = [];
                }
                if (!parsed.kamarList || !Array.isArray(parsed.kamarList) || parsed.kamarList.length === 0) {
                    parsed.kamarList = appSettings.kamarList;
                }
                if (!parsed.adminAuth || !parsed.adminAuth.username || (parsed.adminAuth.username === 'admin' && parsed.adminAuth.password === '123')) {
                    parsed.adminAuth = appSettings.adminAuth;
                }
                appSettings = parsed;
            }
        } catch (e) {
            console.error('Gagal parse appSettings', e);
        }
    } else {
        localStorage.setItem('appSettings', JSON.stringify(appSettings));
    }

    // Satu kali pembersihan master santri awal (74 santri dummy) & transaksi percobaan untuk mulai baru
    const MASTER_CLEAN_VERSION = '2026-11-23-clean-master-v1';
    if (localStorage.getItem('epondok_master_clean_version') !== MASTER_CLEAN_VERSION) {
        santriData = [];
        transactions = [];
        mutasiKamarList = [];
        liburanSantriList = [];
        pulangSantriList = [];
        localStorage.setItem('santriData', JSON.stringify([]));
        localStorage.setItem('transactions', JSON.stringify([]));
        localStorage.setItem('mutasiKamarList', JSON.stringify([]));
        localStorage.setItem('liburanSantriList', JSON.stringify([]));
        localStorage.setItem('pulangSantriList', JSON.stringify([]));
        const nowTs = Date.now();
        localStorage.setItem('epondok_santri_reset_ts', String(nowTs));
        localStorage.setItem('epondok_last_trx_reset_ts', String(nowTs));
        if (appSettings && typeof appSettings === 'object') {
            appSettings.santriResetTimestamp = nowTs;
            appSettings.trxResetTimestamp = nowTs;
            localStorage.setItem('appSettings', JSON.stringify(appSettings));
        }
        localStorage.setItem('epondok_master_clean_version', MASTER_CLEAN_VERSION);
    }

    const savedSantri = localStorage.getItem('santriData');
    if (savedSantri) {
        try {
            let parsed = JSON.parse(savedSantri);
            if (Array.isArray(parsed) && parsed.length > 0) {
                parsed = parsed.map(s => ({
                    ...s,
                    status: s.status || 'Aktif',
                    kamarTerakhir: s.kamarTerakhir || s.kamar || '-',
                    tahunMasuk: s.tahunMasuk || '1442/1443',
                    alasanBoyong: (s.alasanBoyong || '').replace(/Gantung/gi, 'Guru Tugas / Non-Mukim')
                }));
                santriData = sortSantriData(parsed);
            } else {
                santriData = [];
            }
        } catch (e) {
            console.error('Gagal parse santriData', e);
            santriData = [];
        }
    } else {
        santriData = [];
        localStorage.setItem('santriData', JSON.stringify([]));
        localStorage.setItem('santriDataVersion', DATA_VERSION);
    }

    const savedTrx = localStorage.getItem('transactions');
    if (savedTrx) {
        try {
            let parsed = JSON.parse(savedTrx);
            if (Array.isArray(parsed)) transactions = parsed;
        } catch (e) {
            console.error('Gagal parse transactions', e);
            transactions = [];
        }
    } else {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    const savedMutasi = localStorage.getItem('mutasiKamarList');
    if (savedMutasi) {
        try {
            let parsed = JSON.parse(savedMutasi);
            if (Array.isArray(parsed)) mutasiKamarList = parsed;
        } catch (e) {
            console.error('Gagal parse mutasiKamarList', e);
            mutasiKamarList = [];
        }
    } else {
        mutasiKamarList = [];
        localStorage.setItem('mutasiKamarList', JSON.stringify([]));
    }

    const savedLiburan = localStorage.getItem('liburanSantriList');
    if (savedLiburan) {
        try {
            let parsed = JSON.parse(savedLiburan);
            if (Array.isArray(parsed)) liburanSantriList = parsed;
        } catch (e) {
            console.error('Gagal parse liburanSantriList', e);
            liburanSantriList = [];
        }
    } else {
        liburanSantriList = [];
        localStorage.setItem('liburanSantriList', JSON.stringify([]));
    }

    const savedPulang = localStorage.getItem('pulangSantriList');
    if (savedPulang) {
        try {
            let parsed = JSON.parse(savedPulang);
            if (Array.isArray(parsed)) pulangSantriList = parsed;
        } catch (e) {
            console.error('Gagal parse pulangSantriList', e);
            pulangSantriList = [];
        }
    } else {
        pulangSantriList = [];
        localStorage.setItem('pulangSantriList', JSON.stringify([]));
    }

    window.appSettings = appSettings;
    window.santriData = santriData;
    window.transactions = transactions;
    window.mutasiKamarList = mutasiKamarList;
    window.liburanSantriList = liburanSantriList;
    window.pulangSantriList = pulangSantriList;
}

// Urutkan Santri Berdasarkan Abjad Nama (A - Z)
function sortSantriData(list) {
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
}

// Simpan Data ke LocalStorage & Sinkronkan ke Cloud
function saveDataToStorage() {
    sortSantriData(santriData);
    if (window.liburanSantriList) liburanSantriList = window.liburanSantriList;
    if (window.pulangSantriList) pulangSantriList = window.pulangSantriList;
    if (window.currentKategoriPengeluaran) currentKategoriPengeluaran = window.currentKategoriPengeluaran;
    window.appSettings = appSettings;
    window.santriData = santriData;
    window.transactions = transactions;
    window.currentKategoriPengeluaran = currentKategoriPengeluaran;
    window.mutasiKamarList = mutasiKamarList;
    window.liburanSantriList = liburanSantriList;
    window.pulangSantriList = pulangSantriList;
    localStorage.setItem('santriDataVersion', DATA_VERSION);
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
    localStorage.setItem('santriData', JSON.stringify(santriData));
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('mutasiKamarList', JSON.stringify(mutasiKamarList));
    localStorage.setItem('liburanSantriList', JSON.stringify(liburanSantriList));
    localStorage.setItem('pulangSantriList', JSON.stringify(pulangSantriList));

    // Sinkronisasi otomatis ke Google Apps Script / Cloud
    if (typeof triggerAutoSyncToCloud === 'function') {
        triggerAutoSyncToCloud();
    }
}

// Ambil Nama Tahun Ajaran yang sedang Aktif
function getTahunAjaranAktif() {
    const active = appSettings.tahunAjaranList.find(t => t.aktif);
    return active ? active.ta : 'Belum Diatur';
}

// Dapatkan Semua Daftar Nama Kamar (Gabungan Master Kamar & Santri Aktif)
function getAllNamaKamar() {
    const fromMaster = (appSettings.kamarList || []).map(k => (typeof k === 'string' ? k : k.nama).trim()).filter(Boolean);
    const fromSantri = (santriData || [])
        .filter(s => s.status === 'Aktif')
        .map(s => (s.kamar || '').trim())
        .filter(Boolean);
    return [...new Set([...fromMaster, ...fromSantri])].sort();
}

// Seed Data Awal Liburan Santri
function getInitialLiburanData() {
    return [];
}

// Seed Data Awal Pulang Santri
function getInitialPulangData() {
    return [];
}

// Expose ke global window
window.appSettings = appSettings;
window.santriData = santriData;
window.transactions = transactions;
window.currentKategoriPengeluaran = currentKategoriPengeluaran;
window.currentTagihanKustom = currentTagihanKustom;
window.mutasiKamarList = mutasiKamarList;
window.liburanSantriList = liburanSantriList;
window.pulangSantriList = pulangSantriList;
window.currentPembayaranLainTrxId = currentPembayaranLainTrxId;
window.currentSelectedJenisPL = currentSelectedJenisPL;
window.getTarifSantriPL = getTarifSantriPL;
window.getTarifSantriKustom = getTarifSantriKustom;
window.isSantriBebasSyahriah = isSantriBebasSyahriah;
window.getInfoBebasSyahriah = getInfoBebasSyahriah;
window.colorPalette = colorPalette;
window.bulanIslam = bulanIslam;
window.loadDataFromStorage = loadDataFromStorage;
window.saveDataToStorage = saveDataToStorage;
window.getTahunAjaranAktif = getTahunAjaranAktif;
window.getAllNamaKamar = getAllNamaKamar;
window.getInitialLiburanData = getInitialLiburanData;
window.getInitialPulangData = getInitialPulangData;
window.sortSantriData = sortSantriData;
