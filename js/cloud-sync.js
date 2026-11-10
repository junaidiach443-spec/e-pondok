/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Cloud Synchronization Module (GAS)
 * Integrasi Multi-Perangkat dengan Google Apps Script & Google Sheets
 * 
 * Arsitektur: Offline-First & Resilient Background Sync (Permanen & Stabil)
 * 1. Data disimpan instan di memori & LocalStorage (0 ms, anti lag).
 * 2. Perubahan dikirim secara tenang (silent) ke Google Sheets di latar belakang.
 * 3. Kendala jaringan sementara tidak memunculkan pesan error menakutkan / terputus.
 * 4. Sistem otomatis mengantre (queue) dan mencoba ulang saat internet aktif.
 * ==========================================================================
 */

const CLOUD_CONFIG_KEY = 'epondok_cloud_config';

// Konfigurasi Cloud Sync
let cloudConfig = {
    webAppUrl: 'https://script.google.com/macros/s/AKfycbwc0IXb6KyLxUCw2nv85ia0UicFQP9i94_dDLl2G2o9jfbv5IyuZXgTECrJ0xQRdg8N/exec',
    autoSync: true,
    autoPullOnStart: true,
    lastSyncTime: null,
    lastStatus: 'online', // 'online' | 'error'
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1lribAIT31hljGj9UX1lsVymxg14Szv2x-69RJLFa0OU/edit',
    spreadsheetName: 'e-pondok'
};

// State Sinkronisasi Internal
let isSyncingActive = false;
let syncDebounceTimer = null;
let hasPendingPush = false;
let retryPushTimer = null;
let lastSuccessfulPullTimestamp = 0;

/**
 * Inisialisasi Cloud Sync saat aplikasi pertama dibuka
 */
function initCloudSync() {
    loadCloudConfig();
    renderCloudStatusIndicator();
    renderCloudSettingsForm();

    // Listener status koneksi browser (Online / Offline)
    window.addEventListener('online', () => {
        console.log('[Cloud Sync] Perangkat kembali online.');
        renderCloudStatusIndicator();
        renderCloudSettingsForm();

        // Segera kirim data antrean jika ada, atau tarik data terbaru
        if (hasPendingPush) {
            pushToCloud({ silent: true });
        } else if (cloudConfig.webAppUrl && cloudConfig.autoSync) {
            pullFromCloud({ silent: true });
        }
    });

    window.addEventListener('offline', () => {
        console.log('[Cloud Sync] Perangkat dalam mode offline.');
        renderCloudStatusIndicator();
        renderCloudSettingsForm();
    });

    // Heartbeat auto-pull setiap 6 detik saat online dan tab aktif (Sinkronisasi Multi-Perangkat Live)
    setInterval(() => {
        if (!navigator.onLine || isSyncingActive || !cloudConfig.webAppUrl || !cloudConfig.autoSync) {
            return;
        }
        if (document.visibilityState === 'hidden') {
            return;
        }
        pullFromCloud({ silent: true });
    }, 6000);

    const triggerInstantPull = () => {
        const now = Date.now();
        if (cloudConfig.webAppUrl && cloudConfig.autoSync && !isSyncingActive && (now - lastSuccessfulPullTimestamp > 2000)) {
            pullFromCloud({ silent: true });
        }
    };

    // Listener saat pengguna kembali membuka tab browser atau membuka kunci layar HP
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            triggerInstantPull();
        }
    });

    window.addEventListener('focus', () => {
        triggerInstantPull();
    });

    // Pengecekan antrean pengiriman tertunda secara berkala
    setInterval(() => {
        if (hasPendingPush && navigator.onLine && !isSyncingActive && cloudConfig.webAppUrl) {
            console.log('[Cloud Sync] Mencoba mengirim ulang antrean data...');
            pushToCloud({ silent: true });
        }
    }, 20000);

    // Auto pull saat pertama kali dibuka (jika URL valid)
    if (cloudConfig.webAppUrl && cloudConfig.autoPullOnStart) {
        setTimeout(() => {
            pullFromCloud({ silent: true, isInitial: true });
        }, 200);
    }
}

/**
 * Muat konfigurasi dari LocalStorage
 */
function loadCloudConfig() {
    try {
        const saved = localStorage.getItem(CLOUD_CONFIG_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            cloudConfig = { ...cloudConfig, ...parsed };
        }
        if (!cloudConfig.webAppUrl) {
            cloudConfig.webAppUrl = 'https://script.google.com/macros/s/AKfycbwc0IXb6KyLxUCw2nv85ia0UicFQP9i94_dDLl2G2o9jfbv5IyuZXgTECrJ0xQRdg8N/exec';
            cloudConfig.spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1lribAIT31hljGj9UX1lsVymxg14Szv2x-69RJLFa0OU/edit';
            cloudConfig.spreadsheetName = 'e-pondok';
        }
        // Jangan biarkan status 'error' tersimpan permanen agar pengalaman pengguna tetap tenang
        cloudConfig.lastStatus = 'online';
    } catch (e) {
        console.error("Gagal membaca epondok_cloud_config:", e);
    }
}

/**
 * Simpan konfigurasi ke LocalStorage
 */
function saveCloudConfig() {
    try {
        localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cloudConfig));
        renderCloudStatusIndicator();
        renderCloudSettingsForm();
    } catch (e) {
        console.error("Gagal menyimpan epondok_cloud_config:", e);
    }
}

/**
 * Helper HTTP Client ke Google Apps Script
 * Menggunakan POST + text/plain untuk melewati batasan CORS dan preflight OPTIONS
 */
async function callGASApi(action, payloadData = null, timeoutMs = 30000) {
    const url = cloudConfig.webAppUrl;
    if (!url) throw new Error("URL Google Apps Script belum diatur");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        // PERHATIAN: Google Apps Script Web App menangani getAllData dan ping pada doGet(e)
        // sedangkan saveAllData pada doPost(e).
        if (action === 'getAllData' || action === 'ping' || action === 'pull') {
            const sep = url.includes('?') ? '&' : '?';
            const getUrl = `${url}${sep}action=${action}&_t=${Date.now()}`;
            const response = await fetch(getUrl, {
                method: 'GET',
                mode: 'cors',
                redirect: 'follow',
                signal: controller.signal
            });
            clearTimeout(timer);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const json = await response.json();
            if (json && json.status === 'error') {
                throw new Error(json.message || 'Respon error dari Google Apps Script');
            }
            return json;
        }

        // Untuk aksi simpan data (saveAllData / push / sync) menggunakan POST
        const postPayload = {
            action: action
        };
        if (payloadData !== null && payloadData !== undefined) {
            postPayload.data = payloadData;
        }

        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(postPayload),
            signal: controller.signal
        });
        clearTimeout(timer);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        if (json && json.status === 'error') {
            throw new Error(json.message || 'Respon error dari Google Apps Script');
        }
        return json;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

/**
 * Render Indikator Status di Header Utama
 */
function renderCloudStatusIndicator() {
    const elHeaderPill = document.getElementById('header-cloud-pill');
    const elHeaderIcon = document.getElementById('header-cloud-icon');
    const elHeaderText = document.getElementById('header-cloud-text');
    const elHeaderDot = document.getElementById('header-cloud-dot');

    if (!elHeaderPill) return;

    if (!cloudConfig.webAppUrl) {
        // Mode Lokal (Belum Terhubung)
        elHeaderPill.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all cursor-pointer border border-gray-200 shadow-2xs";
        elHeaderPill.title = "Cloud belum dihubungkan. Klik untuk menghubungkan ke Google Sheets.";
        if (elHeaderIcon) elHeaderIcon.className = "fas fa-cloud text-gray-400 text-xs";
        if (elHeaderText) elHeaderText.innerText = "Mode Lokal";
        if (elHeaderDot) elHeaderDot.className = "w-2 h-2 rounded-full bg-gray-400";
        return;
    }

    if (!navigator.onLine) {
        // Perangkat Offline
        elHeaderPill.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 transition-all cursor-pointer border border-amber-200 shadow-2xs";
        elHeaderPill.title = "Perangkat sedang offline. Seluruh data Anda tersimpan aman di perangkat dan akan otomatis disinkronkan saat online.";
        if (elHeaderIcon) elHeaderIcon.className = "fas fa-cloud-slash text-amber-600 text-xs";
        if (elHeaderText) elHeaderText.innerText = "Tersimpan Lokal (Offline)";
        if (elHeaderDot) elHeaderDot.className = "w-2 h-2 rounded-full bg-amber-500";
        return;
    }

    if (isSyncingActive) {
        // Sedang Menyimpan / Menyinkronkan
        elHeaderPill.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 transition-all cursor-pointer border border-blue-300 shadow-2xs";
        elHeaderPill.title = "Sedang menyinkronkan data dengan Google Sheets...";
        if (elHeaderIcon) elHeaderIcon.className = "fas fa-arrows-rotate fa-spin text-blue-600 text-xs";
        if (elHeaderText) elHeaderText.innerText = "Menyimpan ke Cloud...";
        if (elHeaderDot) elHeaderDot.className = "w-2 h-2 rounded-full bg-blue-500 animate-ping";
        return;
    }

    if (cloudConfig.lastStatus === 'error') {
        // Hanya jika pengguna melakukan uji manual dan gagal
        elHeaderPill.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 transition-all cursor-pointer border border-amber-300 shadow-2xs";
        elHeaderPill.title = "Koneksi Cloud perlu dicek. Klik untuk melihat opsi.";
        if (elHeaderIcon) elHeaderIcon.className = "fas fa-triangle-exclamation text-amber-600 text-xs";
        if (elHeaderText) elHeaderText.innerText = "Periksa Koneksi";
        if (elHeaderDot) elHeaderDot.className = "w-2 h-2 rounded-full bg-amber-500";
        return;
    }

    // Default: Terhubung & Sinkron Permanen (Sama seperti Google Docs / Notion)
    elHeaderPill.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all cursor-pointer border border-blue-200 shadow-2xs";
    let timeDesc = "Baru saja";
    if (cloudConfig.lastSyncTime) {
        const d = new Date(cloudConfig.lastSyncTime);
        timeDesc = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }
    elHeaderPill.title = `Cloud Aktif & Tersinkron Permanen (${timeDesc}). Klik untuk opsi sinkronisasi.`;
    if (elHeaderIcon) elHeaderIcon.className = "fas fa-cloud-check text-blue-600 text-xs";
    if (elHeaderText) elHeaderText.innerText = "Tersinkron ke Cloud";
    if (elHeaderDot) elHeaderDot.className = "w-2 h-2 rounded-full bg-blue-500";
}

/**
 * Render Nilai Pengaturan di Halaman Pengaturan & Backup
 */
function renderCloudSettingsForm() {
    const inputs = ['input-cloud-url', 'input-cloud-url-setting', 'input-cloud-url-modal'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = cloudConfig.webAppUrl || '';
    });

    const chkAutoSync = document.getElementById('chk-cloud-autosync');
    if (chkAutoSync) chkAutoSync.checked = Boolean(cloudConfig.autoSync);

    const chkAutoPull = document.getElementById('chk-cloud-autopull');
    if (chkAutoPull) chkAutoPull.checked = Boolean(cloudConfig.autoPullOnStart);

    const txtLastSync = document.getElementById('text-cloud-last-sync');
    const modalLastSync = document.getElementById('modal-cloud-last-sync');
    let formattedSyncTime = 'Belum pernah disinkronkan';
    if (cloudConfig.lastSyncTime) {
        const d = new Date(cloudConfig.lastSyncTime);
        formattedSyncTime = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' pk ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }
    if (txtLastSync) txtLastSync.innerText = formattedSyncTime;
    if (modalLastSync) modalLastSync.innerText = formattedSyncTime;

    const modalStatusText = document.getElementById('modal-cloud-status-text');
    if (modalStatusText) {
        if (!cloudConfig.webAppUrl) {
            modalStatusText.innerHTML = '<span class="text-gray-500"><i class="fas fa-circle text-xs text-gray-400 mr-1.5"></i> Mode Lokal (Belum Terhubung ke Google Sheets)</span>';
        } else if (!navigator.onLine) {
            modalStatusText.innerHTML = '<span class="text-amber-700 font-bold"><i class="fas fa-wifi text-xs text-amber-500 mr-1.5"></i> Perangkat Offline (Data Aman di Penyimpanan Lokal)</span>';
        } else if (cloudConfig.lastStatus === 'error') {
            modalStatusText.innerHTML = '<span class="text-amber-700 font-bold"><i class="fas fa-triangle-exclamation text-xs text-amber-500 mr-1.5"></i> Periksa URL Web App / Izin Akses Anyone</span>';
        } else {
            const ssName = cloudConfig.spreadsheetName ? ` ("${cloudConfig.spreadsheetName}")` : '';
            modalStatusText.innerHTML = `<span class="text-blue-700 font-bold"><i class="fas fa-circle-check text-xs text-blue-500 mr-1.5 animate-pulse"></i> Cloud Aktif & Terhubung Permanen ke Spreadsheet${ssName}</span>`;
        }
    }

    const btnOpenSheet = document.getElementById('btn-open-spreadsheet');
    if (btnOpenSheet) {
        if (cloudConfig.spreadsheetUrl) {
            btnOpenSheet.href = cloudConfig.spreadsheetUrl;
            btnOpenSheet.classList.remove('hidden');
        } else {
            btnOpenSheet.classList.add('hidden');
        }
    }
}

/**
 * Simpan Perubahan Form Pengaturan Cloud
 */
function simpanFormPengaturanCloud(sourceInputId) {
    const el = document.getElementById(sourceInputId || 'input-cloud-url');
    let url = el ? el.value.trim() : '';

    if (url && !url.startsWith('https://script.google.com/macros/s/')) {
        if (typeof showToast === 'function') {
            showToast('URL harus diawali https://script.google.com/macros/s/...', 'error');
        }
        return;
    }

    cloudConfig.webAppUrl = url;

    const chkAutoSync = document.getElementById('chk-cloud-autosync');
    if (chkAutoSync) cloudConfig.autoSync = chkAutoSync.checked;

    const chkAutoPull = document.getElementById('chk-cloud-autopull');
    if (chkAutoPull) cloudConfig.autoPullOnStart = chkAutoPull.checked;

    saveCloudConfig();

    if (typeof showToast === 'function') {
        showToast('Pengaturan Cloud Google Apps Script disimpan!');
    }

    // Uji koneksi jika URL diisi baru
    if (url) {
        testCloudConnection(false);
    }
}

/**
 * Uji Koneksi ke Google Apps Script (Ping)
 */
async function testCloudConnection(silent = false) {
    const url = cloudConfig.webAppUrl;
    if (!url) {
        if (!silent && typeof showToast === 'function') {
            showToast('Masukkan URL Web App Google Apps Script terlebih dahulu!', 'error');
        }
        return false;
    }

    try {
        if (!silent && typeof showToast === 'function') {
            showToast('Menguji koneksi ke Google Spreadsheet...', 'info');
        }

        const result = await callGASApi('ping', null, 20000);

        if (result && result.status === 'success') {
            cloudConfig.lastStatus = 'online';
            if (result.spreadsheetUrl) cloudConfig.spreadsheetUrl = result.spreadsheetUrl;
            if (result.spreadsheetName) cloudConfig.spreadsheetName = result.spreadsheetName;
            saveCloudConfig();

            if (!silent && typeof showToast === 'function') {
                showToast(`Koneksi Sukses! Terhubung ke "${result.spreadsheetName || 'Spreadsheet'}"`, 'success');
            }
            return true;
        } else {
            throw new Error((result && result.message) || 'Respon Google Apps Script tidak valid');
        }
    } catch (err) {
        if (!silent) {
            cloudConfig.lastStatus = 'error';
            saveCloudConfig();
            console.error("Gagal uji koneksi Cloud:", err);
            if (typeof showToast === 'function') {
                showToast('Gagal terhubung: ' + err.message, 'error');
            }
        }
        return false;
    }
}

/**
 * Pelacakan ID transaksi yang dihapus secara lokal & sinkronisasi dengan Cloud
 */
function trackDeletedTransactionId(trxId) {
    if (!trxId) return;
    try {
        let deleted = JSON.parse(localStorage.getItem('epondok_deleted_trx_ids') || '[]');
        if (!deleted.includes(trxId)) {
            deleted.push(trxId);
            if (deleted.length > 1000) deleted = deleted.slice(-1000);
            localStorage.setItem('epondok_deleted_trx_ids', JSON.stringify(deleted));
        }

        // Simpan juga di appSettings.deletedTrxIds agar dikirim dan disimpan di Google Sheets Tab Pengaturan!
        let settings = window.appSettings || (typeof appSettings !== 'undefined' ? appSettings : null);
        if (settings && typeof settings === 'object') {
            if (!Array.isArray(settings.deletedTrxIds)) {
                settings.deletedTrxIds = [];
            }
            if (!settings.deletedTrxIds.includes(trxId)) {
                settings.deletedTrxIds.push(trxId);
                if (settings.deletedTrxIds.length > 1000) {
                    settings.deletedTrxIds = settings.deletedTrxIds.slice(-1000);
                }
            }
            window.appSettings = settings;
            if (typeof appSettings !== 'undefined') appSettings = settings;
            localStorage.setItem('appSettings', JSON.stringify(settings));
        }
    } catch (e) {
        console.warn('Gagal melacak ID transaksi dihapus:', e);
    }
}

function getDeletedTransactionIds() {
    try {
        const local = JSON.parse(localStorage.getItem('epondok_deleted_trx_ids') || '[]');
        const settings = window.appSettings || (typeof appSettings !== 'undefined' ? appSettings : null);
        const fromSettings = (settings && Array.isArray(settings.deletedTrxIds)) ? settings.deletedTrxIds : [];
        const combined = Array.from(new Set([...local, ...fromSettings]));
        return combined;
    } catch (e) {
        return [];
    }
}

/**
 * Generator ID Transaksi Unik Global (Anti-Tabrakan Antar-Perangkat)
 */
function generateTrxId(prefix = 'TRX') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}
window.generateTrxId = generateTrxId;

/**
 * Normalisasi format tanggal agar seragam YYYY-MM-DD
 */
function normalizeDateStr(dateVal) {
    if (!dateVal) return new Date().toLocaleDateString('en-CA');
    const str = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-CA');
    }
    return str;
}

/**
 * Penggabungan Dua Arah Cerdas untuk Transaksi (Multi-Perangkat Anti-Hilang)
 */
function mergeTransactionsFromCloud(cloudTransactions) {
    if (!Array.isArray(cloudTransactions)) return { hasNewFromCloud: false, hasLocalUnpushed: false };

    const deletedIds = new Set(getDeletedTransactionIds());
    const localMap = new Map();
    (window.transactions || transactions || []).forEach(t => {
        if (t && t.id && !deletedIds.has(t.id)) {
            localMap.set(t.id, t);
        }
    });

    let hasNewFromCloud = false;
    let hasLocalUnpushed = false;

    cloudTransactions.forEach(c => {
        if (!c || !c.id || deletedIds.has(c.id)) return;

        const normalizedDate = normalizeDateStr(c.date);
        const cleanCloudTrx = {
            ...c,
            amount: Number(c.amount) || 0,
            date: normalizedDate,
            metode: c.metode || 'Tunai',
            type: c.type || 'in',
            ta: c.ta || (typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448')
        };

        if (!localMap.has(c.id)) {
            // Transaksi dari perangkat lain yang belum ada di HP ini!
            localMap.set(c.id, cleanCloudTrx);
            hasNewFromCloud = true;
        } else {
            // Update jika ada perubahan data
            const existing = localMap.get(c.id);
            localMap.set(c.id, { ...existing, ...cleanCloudTrx });
        }
    });

    // Cek apakah ada transaksi lokal yang belum ada di cloud (DAN BUKAN YANG DIHAPUS)
    const cloudIds = new Set(cloudTransactions.map(c => c && c.id));
    for (const [id, t] of localMap.entries()) {
        if (!cloudIds.has(id) && !deletedIds.has(id)) {
            hasLocalUnpushed = true;
        }
    }

    const mergedList = Array.from(localMap.values());
    window.transactions = mergedList;
    transactions = mergedList;
    localStorage.setItem('transactions', JSON.stringify(mergedList));

    return { hasNewFromCloud, hasLocalUnpushed };
}

/**
 * Penggabungan Dua Arah Cerdas untuk Master Santri
 */
function mergeSantriFromCloud(cloudSantriList) {
    if (!Array.isArray(cloudSantriList) || cloudSantriList.length === 0) return false;

    const currentList = (Array.isArray(window.santriData) && window.santriData.length > 0)
        ? window.santriData
        : (santriData || []);

    const localMap = new Map();
    currentList.forEach(s => {
        if (s && s.id) localMap.set(s.id, s);
    });

    let hasChanges = false;
    cloudSantriList.forEach(cs => {
        if (!cs || !cs.id) return;
        if (!localMap.has(cs.id)) {
            localMap.set(cs.id, cs);
            hasChanges = true;
        } else {
            const loc = localMap.get(cs.id);
            if (loc.status !== cs.status || loc.kamar !== cs.kamar || loc.kamarTerakhir !== cs.kamarTerakhir || loc.alasanBoyong !== cs.alasanBoyong) {
                localMap.set(cs.id, { ...loc, ...cs });
                hasChanges = true;
            }
        }
    });

    let merged = Array.from(localMap.values());
    if (typeof sortSantriData === 'function') {
        merged = sortSantriData(merged);
    }
    window.santriData = merged;
    santriData = merged;
    localStorage.setItem('santriData', JSON.stringify(merged));
    return hasChanges;
}

/**
 * Penggabungan Cerdas List Berdasarkan ID (Mutasi, Liburan, Pulang)
 */
function mergeListById(localList, cloudList, storageKey) {
    if (!Array.isArray(cloudList)) return localList || [];
    const map = new Map();
    (localList || []).forEach(item => { if (item && item.id) map.set(item.id, item); });
    cloudList.forEach(item => { if (item && item.id) map.set(item.id, { ...(map.get(item.id) || {}), ...item }); });
    const merged = Array.from(map.values());
    if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(merged));
    }
    return merged;
}

/**
 * Tarik Seluruh Data dari Google Sheets (Pull / Download)
 */
async function pullFromCloud(options = {}) {
    const { silent = false, isInitial = false } = options;
    const url = cloudConfig.webAppUrl;

    if (!url) {
        if (!silent && typeof showToast === 'function') {
            showToast('URL Google Apps Script belum diatur!', 'error');
        }
        return false;
    }

    if (!navigator.onLine) {
        if (!silent && typeof showToast === 'function') {
            showToast('Perangkat sedang offline. Menggunakan data lokal.', 'warning');
        }
        return false;
    }

    if (isSyncingActive) return false;

    isSyncingActive = true;
    renderCloudStatusIndicator();

    try {
        if (!silent && typeof showToast === 'function') {
            showToast('Mengambil data dari Google Sheets...', 'info');
        }

        const res = await callGASApi('getAllData', null, 35000);

        if (!res || res.status !== 'success' || !res.data) {
            throw new Error((res && res.message) || 'Data cloud tidak ditemukan atau format tidak sesuai');
        }

        const cloudData = res.data;
        let dataUpdated = false;

        // 0. SINKRONKAN DAFTAR TRANSAKSI YANG DIHAPUS DARI CLOUD TERLEBIH DAHULU
        if (cloudData.appSettings && Array.isArray(cloudData.appSettings.deletedTrxIds)) {
            cloudData.appSettings.deletedTrxIds.forEach(id => trackDeletedTransactionId(id));
        }
        if (Array.isArray(cloudData.deletedTrxIds)) {
            cloudData.deletedTrxIds.forEach(id => trackDeletedTransactionId(id));
        }

        // Hapus transaksi lokal yang masuk dalam daftar deletedIds
        const activeDeletedIds = new Set(getDeletedTransactionIds());
        if (activeDeletedIds.size > 0) {
            const curTrx = window.transactions || transactions || [];
            const beforeCount = curTrx.length;
            const filtered = curTrx.filter(t => t && t.id && !activeDeletedIds.has(t.id));
            if (filtered.length !== beforeCount) {
                transactions = filtered;
                window.transactions = filtered;
                localStorage.setItem('transactions', JSON.stringify(filtered));
                dataUpdated = true;
            }
        }

        // 1. SMART MERGE TRANSAKSI (Sinkronisasi Pembayaran Multi-Perangkat)
        const trxMerge = mergeTransactionsFromCloud(cloudData.transactions);
        if (trxMerge.hasNewFromCloud) {
            dataUpdated = true;
        }

        // 2. SMART MERGE SANTRI DATA
        if (Array.isArray(cloudData.santriData) && cloudData.santriData.length > 0) {
            const santriChanged = mergeSantriFromCloud(cloudData.santriData);
            if (santriChanged) dataUpdated = true;
        }

        // 3. SMART MERGE MUTASI KAMAR
        if (Array.isArray(cloudData.mutasiKamarList)) {
            const mutasiMerged = mergeListById(window.mutasiKamarList || mutasiKamarList, cloudData.mutasiKamarList, 'mutasiKamarList');
            window.mutasiKamarList = mutasiMerged;
            mutasiKamarList = mutasiMerged;
            dataUpdated = true;
        }

        // 4. SMART MERGE LIBURAN SANTRI
        if (Array.isArray(cloudData.liburanSantriList)) {
            const liburanMerged = mergeListById(window.liburanSantriList || liburanSantriList, cloudData.liburanSantriList, 'liburanSantriList');
            window.liburanSantriList = liburanMerged;
            liburanSantriList = liburanMerged;
            dataUpdated = true;
        }

        // 5. SMART MERGE PULANG SANTRI
        if (Array.isArray(cloudData.pulangSantriList)) {
            const pulangMerged = mergeListById(window.pulangSantriList || pulangSantriList, cloudData.pulangSantriList, 'pulangSantriList');
            window.pulangSantriList = pulangMerged;
            pulangSantriList = pulangMerged;
            dataUpdated = true;
        }

        // 6. MERGE APP SETTINGS
        if (cloudData.appSettings && typeof cloudData.appSettings === 'object' && Object.keys(cloudData.appSettings).length > 0) {
            window.appSettings = { ...window.appSettings, ...cloudData.appSettings };
            appSettings = window.appSettings;
            localStorage.setItem('appSettings', JSON.stringify(appSettings));
            dataUpdated = true;
        }

        // Simpan ke storage lokal tanpa memicu sync-loop
        window._isCloudUpdating = true;
        if (typeof saveDataToStorage === 'function') {
            saveDataToStorage();
        }
        window._isCloudUpdating = false;

        // Segarkan seluruh tampilan aktif aplikasi
        refreshAllApplicationViews();

        cloudConfig.lastStatus = 'online';
        cloudConfig.lastSyncTime = new Date().toISOString();
        lastSuccessfulPullTimestamp = Date.now();
        saveCloudConfig();

        if (!silent && typeof showToast === 'function') {
            const countS = (santriData || []).length;
            const countT = (transactions || []).length;
            showToast(`Data Cloud berhasil disinkronkan! (${countS} Santri, ${countT} Transaksi)`, 'success');
        }

        // Jika ada transaksi lokal yang belum ada di Cloud, segera kirim ke Google Sheets
        if (trxMerge.hasLocalUnpushed) {
            setTimeout(() => {
                pushToCloud({ silent: true });
            }, 500);
        }

        return true;
    } catch (err) {
        console.warn("[Cloud Sync] Info pull data:", err.message);
        if (!silent) {
            cloudConfig.lastStatus = 'error';
            saveCloudConfig();
            if (typeof showToast === 'function') {
                showToast('Gagal menarik data cloud: ' + err.message, 'error');
            }
        }
        return false;
    } finally {
        isSyncingActive = false;
        renderCloudStatusIndicator();
    }
}

/**
 * Unggah Seluruh Data Aplikasi ke Google Sheets (Push / Upload)
 */
async function pushToCloud(options = {}) {
    const { silent = false } = options;
    const url = cloudConfig.webAppUrl;

    if (!url) {
        if (!silent && typeof showToast === 'function') {
            showToast('URL Google Apps Script belum diatur!', 'error');
        }
        return false;
    }

    if (!navigator.onLine) {
        hasPendingPush = true;
        renderCloudStatusIndicator();
        if (!silent && typeof showToast === 'function') {
            showToast('Perangkat offline. Data Anda aman tersimpan dan akan otomatis dikirim saat online.', 'info');
        }
        return false;
    }

    if (isSyncingActive) {
        hasPendingPush = true;
        return true;
    }

    isSyncingActive = true;
    renderCloudStatusIndicator();

    try {
        if (!silent && typeof showToast === 'function') {
            showToast('Mengunggah data ke Google Sheets...', 'info');
        }

        // 1. PRE-PULL & MERGE sebelum push ke Google Sheets
        // Langkah ini menjamin bahwa pembayaran yang baru saja dicatat di perangkat lain
        // TIDAK AKAN PERNAH tertimpa atau terhapus oleh pengiriman dari perangkat ini!
        try {
            const prePullRes = await callGASApi('getAllData', null, 25000);
            if (prePullRes && prePullRes.status === 'success' && prePullRes.data) {
                const cloudData = prePullRes.data;

                // A. Sinkronkan deletedTrxIds dari cloud
                if (cloudData.appSettings && Array.isArray(cloudData.appSettings.deletedTrxIds)) {
                    cloudData.appSettings.deletedTrxIds.forEach(id => trackDeletedTransactionId(id));
                }
                if (Array.isArray(cloudData.deletedTrxIds)) {
                    cloudData.deletedTrxIds.forEach(id => trackDeletedTransactionId(id));
                }

                // B. Bersihkan data lokal dari transaksi yang telah dihapus
                const activeDeleted = new Set(getDeletedTransactionIds());
                if (activeDeleted.size > 0) {
                    transactions = (transactions || []).filter(t => t && t.id && !activeDeleted.has(t.id));
                    window.transactions = transactions;
                }

                // C. Merge transaksi dari Cloud ke Lokal
                mergeTransactionsFromCloud(cloudData.transactions);

                // D. Merge santriData
                if (Array.isArray(cloudData.santriData) && cloudData.santriData.length > 0) {
                    mergeSantriFromCloud(cloudData.santriData);
                }

                // E. Merge mutasi, liburan, pulang
                if (Array.isArray(cloudData.mutasiKamarList)) {
                    const mergedMutasi = mergeListById(window.mutasiKamarList || mutasiKamarList, cloudData.mutasiKamarList, 'mutasiKamarList');
                    window.mutasiKamarList = mergedMutasi;
                    mutasiKamarList = mergedMutasi;
                }
                if (Array.isArray(cloudData.liburanSantriList)) {
                    const mergedLiburan = mergeListById(window.liburanSantriList || liburanSantriList, cloudData.liburanSantriList, 'liburanSantriList');
                    window.liburanSantriList = mergedLiburan;
                    liburanSantriList = mergedLiburan;
                }
                if (Array.isArray(cloudData.pulangSantriList)) {
                    const mergedPulang = mergeListById(window.pulangSantriList || pulangSantriList, cloudData.pulangSantriList, 'pulangSantriList');
                    window.pulangSantriList = mergedPulang;
                    pulangSantriList = mergedPulang;
                }
            }
        } catch (prePullErr) {
            console.warn('[Cloud Sync] Pre-pull sebelum push dilewati/gagal:', prePullErr.message);
        }

        // Pastikan appSettings.deletedTrxIds selalu up-to-date di payload
        let currentSettings = window.appSettings || appSettings || {};
        if (!Array.isArray(currentSettings.deletedTrxIds)) {
            currentSettings.deletedTrxIds = [];
        }
        getDeletedTransactionIds().forEach(id => {
            if (!currentSettings.deletedTrxIds.includes(id)) {
                currentSettings.deletedTrxIds.push(id);
            }
        });
        window.appSettings = currentSettings;
        if (typeof appSettings !== 'undefined') appSettings = currentSettings;
        localStorage.setItem('appSettings', JSON.stringify(currentSettings));

        // Siapkan Payload Lengkap beserta daftar ID yang dihapus
        const payloadData = {
            santriData: window.santriData || santriData || [],
            transactions: window.transactions || transactions || [],
            appSettings: currentSettings,
            mutasiKamarList: window.mutasiKamarList || mutasiKamarList || [],
            liburanSantriList: window.liburanSantriList || liburanSantriList || [],
            pulangSantriList: window.pulangSantriList || pulangSantriList || [],
            deletedTrxIds: getDeletedTransactionIds()
        };

        const res = await callGASApi('saveAllData', payloadData, 40000);

        if (res && res.status === 'success') {
            hasPendingPush = false;
            cloudConfig.lastStatus = 'online';
            cloudConfig.lastSyncTime = new Date().toISOString();
            saveCloudConfig();

            // Segarkan tampilan lokal setelah push sukses
            refreshAllApplicationViews();

            if (!silent && typeof showToast === 'function') {
                showToast('Semua data berhasil disinkronkan ke Google Spreadsheet!', 'success');
            }
            return true;
        } else {
            throw new Error((res && res.message) || 'Respon gagal dari Google Apps Script');
        }

    } catch (err) {
        console.warn("[Cloud Sync] Info push data:", err.message);
        if (!silent) {
            cloudConfig.lastStatus = 'error';
            saveCloudConfig();
            if (typeof showToast === 'function') {
                showToast('Gagal sinkronisasi ke cloud: ' + err.message, 'error');
            }
        } else {
            // Dalam mode silent di latar belakang, jadwalkan coba ulang
            hasPendingPush = true;
            if (!retryPushTimer) {
                retryPushTimer = setTimeout(() => {
                    retryPushTimer = null;
                    if (hasPendingPush && navigator.onLine) {
                        pushToCloud({ silent: true });
                    }
                }, 10000);
            }
        }
        return false;
    } finally {
        isSyncingActive = false;
        renderCloudStatusIndicator();
    }
}

/**
 * Trigger Auto-Sync saat data lokal diubah
 * Dipanggil secara otomatis dari saveDataToStorage() atau aksi bayar langsung
 */
function triggerAutoSyncToCloud(immediate = false) {
    if (window._isCloudUpdating) return; // Mencegah looping saat pull
    if (!cloudConfig.webAppUrl || !cloudConfig.autoSync) return;

    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = null;
    }

    if (immediate) {
        pushToCloud({ silent: true });
    } else {
        syncDebounceTimer = setTimeout(() => {
            pushToCloud({ silent: true });
        }, 500);
    }
}

/**
 * Handler klik pill indikator cloud di header
 */
function handleHeaderCloudClick() {
    if (isSyncingActive) {
        if (typeof showToast === 'function') {
            showToast("Sedang menyinkronkan data dengan Google Sheets...", "info");
        }
        return;
    }
    pullFromCloud({ silent: false });
}

/**
 * Segarkan seluruh tampilan aktif aplikasi secara real-time
 */
function refreshAllApplicationViews() {
    try {
        if (typeof updateDateHeader === 'function') updateDateHeader();
        if (typeof updateFiltersAndDropdowns === 'function') updateFiltersAndDropdowns();
        if (typeof updateDashboard === 'function') updateDashboard();

        // Refresh Halaman Syahriah (Tabel & Detail Santri jika sedang dibuka)
        if (typeof renderSyahriah === 'function') renderSyahriah();
        if (typeof currentDetailSantriId !== 'undefined' && currentDetailSantriId) {
            const vd = document.getElementById('view-syahriah-detail');
            if (vd && !vd.classList.contains('hidden')) {
                if (typeof bukaDetailSyahriah === 'function') {
                    bukaDetailSyahriah(currentDetailSantriId);
                } else if (typeof renderBulanSyahriah === 'function') {
                    renderBulanSyahriah();
                }
                if (typeof updateActionPanel === 'function') updateActionPanel();
            }
        }

        // Refresh Halaman Pembayaran Lain
        if (typeof renderPembayaranLainPage === 'function') renderPembayaranLainPage();
        if (typeof renderSantriPLTable === 'function') renderSantriPLTable();

        // Refresh Tagihan Kustom
        if (typeof renderDetailPembayaranKustomData === 'function' && typeof currentTagihanKustom !== 'undefined') {
            renderDetailPembayaranKustomData();
        }
        if (typeof renderPembayaranKustomList === 'function') renderPembayaranKustomList();

        // Refresh Pengeluaran & Laporan
        if (typeof renderPengeluaran === 'function') renderPengeluaran();
        if (typeof renderPengeluaranMenu === 'function') renderPengeluaranMenu();
        if (typeof renderLaporan === 'function') renderLaporan();
        if (typeof renderRiwayat === 'function') renderRiwayat();

        // Refresh Data Santri & Mutasi
        if (typeof renderMasterSantriTable === 'function') renderMasterSantriTable();
        if (typeof renderBoyongSantriTable === 'function') renderBoyongSantriTable();
        if (typeof renderSemuaTabel === 'function') renderSemuaTabel();
        if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();
        if (typeof renderLiburanSantriPage === 'function') renderLiburanSantriPage();
        if (typeof renderPulangSantriPage === 'function') renderPulangSantriPage();

        // Refresh Pengaturan
        if (typeof renderPengaturanTahunAjaran === 'function') renderPengaturanTahunAjaran();
        if (typeof renderPengaturanTagihan === 'function') renderPengaturanTagihan();
        if (typeof renderPengaturanPembayaranLain === 'function') renderPengaturanPembayaranLain();
        if (typeof renderPengaturanPJDivisi === 'function') renderPengaturanPJDivisi();
        if (typeof renderPengaturanKhususIkhtibar === 'function') renderPengaturanKhususIkhtibar();
        if (typeof renderPengaturanKamar === 'function') renderPengaturanKamar();
    } catch (e) {
        console.warn("Sebagian view belum siap di-refresh:", e);
    }
}

const APPS_SCRIPT_CODE = `/**
 * =======================================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Google Apps Script Cloud Backend & Multi-Device Sync
 * =======================================================================================
 * 
 * Skrip ini dipasang di Google Apps Script yang terhubung ke Google Spreadsheet.
 * Berfungsi sebagai REST API Web App untuk sinkronisasi data e-Pondok secara real-time
 * di semua perangkat (Laptop Pengurus, HP Android/iOS, Komputer Kantor, Tablet).
 */

var SHEET_NAMES = {
  SANTRI: 'Santri',
  TRANSAKSI: 'Transaksi',
  PENGATURAN: 'Pengaturan',
  MUTASI: 'MutasiKamar',
  LIBURAN: 'LiburanSantri',
  PULANG: 'PulangSantri',
  METADATA: '_METADATA_'
};

function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = (params && params.action) ? params.action : 'getAllData';

    if (action === 'ping') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      return createJsonResponse({
        status: 'success',
        message: 'Koneksi Google Apps Script e-Pondok Berhasil!',
        appName: 'e-Pondok PP. AL-USYMUNI Cloud Sync',
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        sheets: ss.getSheets().map(function(s) { return s.getName(); }),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getAllData' || action === 'pull') {
      var fullData = readAllDataFromSpreadsheet();
      return createJsonResponse({
        status: 'success',
        message: 'Data berhasil diambil dari Google Sheets',
        data: fullData,
        timestamp: new Date().toISOString()
      });
    }

    return createJsonResponse({
      status: 'error',
      message: 'Aksi GET tidak dikenali: ' + action
    });
  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: 'Gagal memproses permintaan GET: ' + err.toString(),
      stack: err.stack
    });
  }
}

function doPost(e) {
  try {
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        if (e.parameter && e.parameter.data) {
          requestData = JSON.parse(e.parameter.data);
        } else {
          throw new Error('Format data POST tidak valid (harus JSON): ' + parseErr.toString());
        }
      }
    } else if (e && e.parameter && e.parameter.data) {
      requestData = JSON.parse(e.parameter.data);
    } else {
      throw new Error('Tidak ada data yang dikirim dalam POST body.');
    }

    var action = requestData.action || (e.parameter ? e.parameter.action : 'saveAllData');

    if (action === 'saveAllData' || action === 'sync' || action === 'push') {
      var payload = requestData.data || requestData;
      var syncResult = writeAllDataToSpreadsheet(payload);

      return createJsonResponse({
        status: 'success',
        message: 'Data berhasil disinkronkan ke Google Spreadsheet!',
        summary: syncResult,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'ping') {
      return createJsonResponse({
        status: 'success',
        message: 'Ping POST berhasil!',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getAllData' || action === 'pull') {
      var fullData = readAllDataFromSpreadsheet();
      return createJsonResponse({
        status: 'success',
        message: 'Data berhasil diambil dari Google Sheets',
        data: fullData,
        timestamp: new Date().toISOString()
      });
    }

    return createJsonResponse({
      status: 'error',
      message: 'Aksi POST tidak dikenali: ' + action
    });
  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: 'Gagal memproses permintaan POST: ' + err.toString(),
      stack: err.stack
    });
  }
}

function formatDateIso(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, "GMT+7", "yyyy-MM-dd");
  }
  var str = String(val).trim();
  if (str.length > 10 && !str.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
    var d = new Date(str);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd");
    }
  }
  return str;
}

function readAllDataFromSpreadsheet() {
  ensureAllSheetsExist();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var santriSheet = ss.getSheetByName(SHEET_NAMES.SANTRI);
  var santriRows = getRowsAsObjects(santriSheet);
  var santriData = santriRows.map(function(r) {
    return {
      id: String(r.id || ''),
      nis: String(r.nis || ''),
      nama: String(r.nama || ''),
      kamar: String(r.kamar || ''),
      status: String(r.status || 'Aktif'),
      tahunMasuk: String(r.tahunMasuk || ''),
      kamarTerakhir: String(r.kamarTerakhir || ''),
      tanggalBoyong: String(r.tanggalBoyong || ''),
      tahunBoyong: String(r.tahunBoyong || ''),
      alasanBoyong: String(r.alasanBoyong || '')
    };
  });

  var trxSheet = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
  var trxRows = getRowsAsObjects(trxSheet);
  var transactions = trxRows.map(function(r) {
    var t = {
      id: String(r.id || ''),
      ta: String(r.ta || ''),
      kategori: String(r.kategori || ''),
      type: String(r.type || 'in'),
      amount: Number(r.amount) || 0,
      desc: String(r.desc || ''),
      date: formatDateIso(r.date),
      metode: String(r.metode || 'Tunai'),
      kasir: String(r.kasir || '')
    };
    if (r.santriId) t.santriId = String(r.santriId);
    if (r.santriNama) t.santriNama = String(r.santriNama);
    if (r.pj) t.pj = String(r.pj);
    if (r.divisi) t.divisi = String(r.divisi);
    if (r.bulan) {
      try { t.bulan = JSON.parse(r.bulan); } catch (e) { t.bulan = [r.bulan]; }
    }
    return t;
  });

  var mutasiSheet = ss.getSheetByName(SHEET_NAMES.MUTASI);
  var mutasiRows = getRowsAsObjects(mutasiSheet);
  var mutasiKamarList = mutasiRows.map(function(r) {
    return {
      id: String(r.id || ''),
      santriId: String(r.santriId || ''),
      dariKamar: String(r.dariKamar || ''),
      keKamar: String(r.keKamar || ''),
      tanggal: String(r.tanggal || ''),
      alasan: String(r.alasan || ''),
      dicatatOleh: String(r.dicatatOleh || 'Pengurus')
    };
  });

  var liburanSheet = ss.getSheetByName(SHEET_NAMES.LIBURAN);
  var liburanRows = getRowsAsObjects(liburanSheet);
  var liburanSantriList = liburanRows.map(function(r) {
    return {
      id: String(r.id || ''),
      santriId: String(r.santriId || ''),
      namaLiburan: String(r.namaLiburan || ''),
      tahunAjaran: String(r.tahunAjaran || ''),
      tglMulai: String(r.tglMulai || ''),
      tglKembali: String(r.tglKembali || ''),
      tglKembaliRealisasi: r.tglKembaliRealisasi ? String(r.tglKembaliRealisasi) : null,
      status: String(r.status || 'Sedang Libur'),
      penjemput: String(r.penjemput || ''),
      tujuan: String(r.tujuan || ''),
      statusTanggungan: String(r.statusTanggungan || 'Lunas'),
      catatan: String(r.catatan || ''),
      petugasIzin: String(r.petugasIzin || ''),
      waktuInput: String(r.waktuInput || '')
    };
  });

  var pulangSheet = ss.getSheetByName(SHEET_NAMES.PULANG);
  var pulangRows = getRowsAsObjects(pulangSheet);
  var pulangSantriList = pulangRows.map(function(r) {
    return {
      id: String(r.id || ''),
      santriId: String(r.santriId || ''),
      tahunAjaran: String(r.tahunAjaran || ''),
      jenisIzin: String(r.jenisIzin || ''),
      tglMulai: String(r.tglMulai || ''),
      jamMulai: String(r.jamMulai || ''),
      tglKembaliTarget: String(r.tglKembaliTarget || ''),
      tglKembaliRealisasi: r.tglKembaliRealisasi ? String(r.tglKembaliRealisasi) : null,
      status: String(r.status || 'Sedang Pulang'),
      namaPenjemput: String(r.namaPenjemput || ''),
      hubunganPenjemput: String(r.hubunganPenjemput || ''),
      noHpPenjemput: String(r.noHpPenjemput || ''),
      tujuan: String(r.tujuan || ''),
      keterangan: String(r.keterangan || ''),
      statusTanggungan: String(r.statusTanggungan || 'Lunas'),
      catatanKembali: String(r.catatanKembali || ''),
      petugasIzin: String(r.petugasIzin || ''),
      waktuInput: String(r.waktuInput || '')
    };
  });

  var settingsSheet = ss.getSheetByName(SHEET_NAMES.PENGATURAN);
  var appSettings = null;
  if (settingsSheet) {
    var data = settingsSheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === 'FULL_SETTINGS_JSON' && data[i][1]) {
        try { appSettings = JSON.parse(data[i][1]); } catch (e) { appSettings = null; }
        break;
      }
    }
  }

  return {
    santriData: santriData,
    transactions: transactions,
    appSettings: appSettings,
    mutasiKamarList: mutasiKamarList,
    liburanSantriList: liburanSantriList,
    pulangSantriList: pulangSantriList
  };
}

function writeAllDataToSpreadsheet(payload) {
  ensureAllSheetsExist();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var santriData = payload.santriData || [];
  var transactions = payload.transactions || [];
  var appSettings = payload.appSettings || {};
  var mutasiKamarList = payload.mutasiKamarList || [];

  var santriSheet = ss.getSheetByName(SHEET_NAMES.SANTRI);
  santriSheet.clearContents();
  var santriHeaders = ['id', 'nis', 'nama', 'kamar', 'status', 'tahunMasuk', 'kamarTerakhir', 'tanggalBoyong', 'tahunBoyong', 'alasanBoyong', 'updatedAt'];
  var santriRows = [santriHeaders];
  var nowStr = new Date().toISOString();

  santriData.forEach(function(s) {
    santriRows.push([
      String(s.id || ''),
      String(s.nis || ''),
      String(s.nama || ''),
      String(s.kamar || ''),
      String(s.status || 'Aktif'),
      String(s.tahunMasuk || ''),
      String(s.kamarTerakhir || ''),
      String(s.tanggalBoyong || ''),
      String(s.tahunBoyong || ''),
      String(s.alasanBoyong || ''),
      nowStr
    ]);
  });
  if (santriRows.length > 0) {
    santriSheet.getRange(1, 1, santriRows.length, santriHeaders.length).setValues(santriRows);
    formatHeaderRow(santriSheet, '#1d4ed8');
  }

  var trxSheet = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
  var existingTrxRows = getRowsAsObjects(trxSheet);
  var trxMap = {};
  existingTrxRows.forEach(function(r) {
    if (r.id) {
      trxMap[r.id] = r;
    }
  });

  // Hapus ID yang ada di daftar deletedTrxIds
  var deletedIds = payload.deletedTrxIds || [];
  if (Array.isArray(deletedIds)) {
    deletedIds.forEach(function(did) {
      delete trxMap[did];
    });
  }

  // Gabungkan transaksi dari payload
  transactions.forEach(function(t) {
    if (t && t.id && (!deletedIds.includes(t.id))) {
      trxMap[t.id] = t;
    }
  });

  var mergedTrxList = Object.keys(trxMap).map(function(k) { return trxMap[k]; });
  trxSheet.clearContents();
  var trxHeaders = ['id', 'santriId', 'ta', 'kategori', 'type', 'amount', 'desc', 'date', 'pj', 'divisi', 'bulan', 'metode', 'kasir', 'updatedAt'];
  var trxRows = [trxHeaders];

  mergedTrxList.forEach(function(t) {
    trxRows.push([
      String(t.id || ''),
      String(t.santriId || ''),
      String(t.ta || ''),
      String(t.kategori || ''),
      String(t.type || 'in'),
      Number(t.amount) || 0,
      String(t.desc || ''),
      formatDateIso(t.date),
      String(t.pj || ''),
      String(t.divisi || ''),
      t.bulan ? (typeof t.bulan === 'object' ? JSON.stringify(t.bulan) : String(t.bulan)) : '',
      String(t.metode || 'Tunai'),
      String(t.kasir || ''),
      nowStr
    ]);
  });
  if (trxRows.length > 0) {
    trxSheet.getRange(1, 1, trxRows.length, trxHeaders.length).setValues(trxRows);
    formatHeaderRow(trxSheet, '#2563eb');
  }

  var mutasiSheet = ss.getSheetByName(SHEET_NAMES.MUTASI);
  mutasiSheet.clearContents();
  var mutasiHeaders = ['id', 'santriId', 'dariKamar', 'keKamar', 'tanggal', 'alasan', 'dicatatOleh', 'updatedAt'];
  var mutasiRows = [mutasiHeaders];

  mutasiKamarList.forEach(function(m) {
    mutasiRows.push([
      String(m.id || ''),
      String(m.santriId || ''),
      String(m.dariKamar || ''),
      String(m.keKamar || ''),
      String(m.tanggal || ''),
      String(m.alasan || ''),
      String(m.dicatatOleh || ''),
      nowStr
    ]);
  });
  if (mutasiRows.length > 0) {
    mutasiSheet.getRange(1, 1, mutasiRows.length, mutasiHeaders.length).setValues(mutasiRows);
    formatHeaderRow(mutasiSheet, '#7c3aed');
  }

  var libSheet = ss.getSheetByName(SHEET_NAMES.LIBURAN);
  libSheet.clearContents();
  var libHeaders = ['id', 'santriId', 'namaLiburan', 'tahunAjaran', 'tglMulai', 'tglKembali', 'tglKembaliRealisasi', 'status', 'penjemput', 'tujuan', 'statusTanggungan', 'catatan', 'petugasIzin', 'waktuInput', 'updatedAt'];
  var libRows = [libHeaders];
  (payload.liburanSantriList || []).forEach(function(l) {
    libRows.push([
      String(l.id || ''),
      String(l.santriId || ''),
      String(l.namaLiburan || ''),
      String(l.tahunAjaran || ''),
      String(l.tglMulai || ''),
      String(l.tglKembali || ''),
      l.tglKembaliRealisasi ? String(l.tglKembaliRealisasi) : '',
      String(l.status || ''),
      String(l.penjemput || ''),
      String(l.tujuan || ''),
      String(l.statusTanggungan || ''),
      String(l.catatan || ''),
      String(l.petugasIzin || ''),
      String(l.waktuInput || ''),
      nowStr
    ]);
  });
  if (libRows.length > 0) {
    libSheet.getRange(1, 1, libRows.length, libHeaders.length).setValues(libRows);
    formatHeaderRow(libSheet, '#f59e0b');
  }

  var plgSheet = ss.getSheetByName(SHEET_NAMES.PULANG);
  plgSheet.clearContents();
  var plgHeaders = ['id', 'santriId', 'tahunAjaran', 'jenisIzin', 'tglMulai', 'jamMulai', 'tglKembaliTarget', 'tglKembaliRealisasi', 'status', 'namaPenjemput', 'hubunganPenjemput', 'noHpPenjemput', 'tujuan', 'keterangan', 'statusTanggungan', 'catatanKembali', 'petugasIzin', 'waktuInput', 'updatedAt'];
  var plgRows = [plgHeaders];
  (payload.pulangSantriList || []).forEach(function(p) {
    plgRows.push([
      String(p.id || ''),
      String(p.santriId || ''),
      String(p.tahunAjaran || ''),
      String(p.jenisIzin || ''),
      String(p.tglMulai || ''),
      String(p.jamMulai || ''),
      String(p.tglKembaliTarget || ''),
      p.tglKembaliRealisasi ? String(p.tglKembaliRealisasi) : '',
      String(p.status || ''),
      String(p.namaPenjemput || ''),
      String(p.hubunganPenjemput || ''),
      String(p.noHpPenjemput || ''),
      String(p.tujuan || ''),
      String(p.keterangan || ''),
      String(p.statusTanggungan || ''),
      String(p.catatanKembali || ''),
      String(p.petugasIzin || ''),
      String(p.waktuInput || ''),
      nowStr
    ]);
  });
  if (plgRows.length > 0) {
    plgSheet.getRange(1, 1, plgRows.length, plgHeaders.length).setValues(plgRows);
    formatHeaderRow(plgSheet, '#0284c7');
  }

  var settingsSheet = ss.getSheetByName(SHEET_NAMES.PENGATURAN);
  settingsSheet.clearContents();
  var settingsRows = [
    ['Key', 'Value', 'Keterangan'],
    ['FULL_SETTINGS_JSON', JSON.stringify(appSettings), 'Cadangan utuh format JSON Pengaturan Sistem'],
    ['TarifSyahriah', appSettings.tarifSyahriah || 0, 'Nominal Syahriah Bulanan'],
    ['TahunAjaranAktif', (function() {
      var active = (appSettings.tahunAjaranList || []).find(function(t) { return t.aktif; });
      return active ? active.ta : '-';
    })(), 'Tahun Ajaran Aktif Saat Ini'],
    ['TotalPosPembayaranLain', (appSettings.pembayaranLainList || []).length, 'Jumlah Pos Pembayaran Lain'],
    ['TotalMasterKamar', (appSettings.kamarList || []).length, 'Jumlah Master Kamar'],
    ['LastSyncTime', nowStr, 'Waktu Sinkronisasi Terakhir']
  ];
  settingsSheet.getRange(1, 1, settingsRows.length, 3).setValues(settingsRows);
  formatHeaderRow(settingsSheet, '#d97706');

  var metaSheet = ss.getSheetByName(SHEET_NAMES.METADATA);
  metaSheet.clearContents();
  var metaRows = [
    ['Property', 'Value'],
    ['Sistem', 'e-Pondok Keuangan PP. AL-USYMUNI'],
    ['Versi Skrip', '2.0.0 Cloud Sync'],
    ['Terakhir Diperbarui', nowStr],
    ['Total Santri', santriData.length],
    ['Total Transaksi', transactions.length],
    ['Total Mutasi Kamar', mutasiKamarList.length]
  ];
  metaSheet.getRange(1, 1, metaRows.length, 2).setValues(metaRows);
  formatHeaderRow(metaSheet, '#475569');

  return {
    totalSantri: santriData.length,
    totalTransaksi: transactions.length,
    totalMutasi: mutasiKamarList.length,
    timestamp: nowStr
  };
}

function ensureAllSheetsExist() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsToCreate = [
    SHEET_NAMES.SANTRI,
    SHEET_NAMES.TRANSAKSI,
    SHEET_NAMES.MUTASI,
    SHEET_NAMES.LIBURAN,
    SHEET_NAMES.PULANG,
    SHEET_NAMES.PENGATURAN,
    SHEET_NAMES.METADATA
  ];

  sheetsToCreate.forEach(function(name) {
    var s = ss.getSheetByName(name);
    if (!s) { ss.insertSheet(name); }
  });

  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      if (defaultSheet.getLastRow() === 0) { ss.deleteSheet(defaultSheet); }
    } catch (e) {}
  }
}

function getRowsAsObjects(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    var hasContent = false;
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      obj[headers[j]] = val;
      if (val !== '' && val !== null && val !== undefined) {
        hasContent = true;
      }
    }
    if (hasContent && (obj.id || obj.nis || obj.nama || obj.desc)) {
      results.push(obj);
    }
  }
  return results;
}

function formatHeaderRow(sheet, hexColor) {
  try {
    var lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      var headerRange = sheet.getRange(1, 1, 1, lastCol);
      headerRange.setBackground(hexColor || '#1d4ed8');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setFontFamily('Arial');
      sheet.setFrozenRows(1);
    }
  } catch (e) {}
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * Dialog Buka Modal Cloud Sync
 */
function bukaModalCloudSync() {
    renderCloudSettingsForm();
    const codeEl = document.getElementById('text-code-apps-script');
    if (codeEl && (!codeEl.innerText || codeEl.innerText.length < 50)) {
        codeEl.innerText = APPS_SCRIPT_CODE;
    }
    if (typeof bukaModal === 'function') {
        bukaModal('modal-cloud-sync');
    }
}

/**
 * Salin Kode Apps Script ke Clipboard pengguna
 */
function salinKodeAppsScript() {
    const codeEl = document.getElementById('text-code-apps-script');
    if (!codeEl) return;

    navigator.clipboard.writeText(codeEl.innerText).then(() => {
        if (typeof showToast === 'function') {
            showToast('Kode Google Apps Script (Code.gs) berhasil disalin ke Clipboard!', 'success');
        }
    }).catch(err => {
        if (typeof showToast === 'function') {
            showToast('Gagal menyalin otomatis, silakan salin manual.', 'error');
        }
    });
}

/**
 * Ganti Tab di Modal Cloud Sync
 */
function switchCloudTab(tabName) {
    const tabs = ['pengaturan', 'panduan', 'code', 'multi'];
    tabs.forEach(t => {
        const pane = document.getElementById(`cloud-pane-${t}`);
        const btn = document.getElementById(`cloud-tab-btn-${t}`);
        if (pane) {
            if (t === tabName) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        }
        if (btn) {
            if (t === tabName) {
                btn.className = "px-3.5 py-2 font-bold text-xs rounded-xl bg-blue-600 text-white shadow-xs transition-all flex items-center gap-1.5";
            } else {
                btn.className = "px-3.5 py-2 font-semibold text-xs rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all flex items-center gap-1.5";
            }
        }
    });
}

// Expose ke global window
window.cloudConfig = cloudConfig;
window.initCloudSync = initCloudSync;
window.loadCloudConfig = loadCloudConfig;
window.saveCloudConfig = saveCloudConfig;
window.renderCloudStatusIndicator = renderCloudStatusIndicator;
window.renderCloudSettingsForm = renderCloudSettingsForm;
window.simpanFormPengaturanCloud = simpanFormPengaturanCloud;
window.testCloudConnection = testCloudConnection;
window.pullFromCloud = pullFromCloud;
window.pushToCloud = pushToCloud;
window.triggerAutoSyncToCloud = triggerAutoSyncToCloud;
window.handleHeaderCloudClick = handleHeaderCloudClick;
window.trackDeletedTransactionId = trackDeletedTransactionId;
window.getDeletedTransactionIds = getDeletedTransactionIds;
window.mergeTransactionsFromCloud = mergeTransactionsFromCloud;
window.mergeSantriFromCloud = mergeSantriFromCloud;
window.refreshAllApplicationViews = refreshAllApplicationViews;
window.bukaModalCloudSync = bukaModalCloudSync;
window.salinKodeAppsScript = salinKodeAppsScript;
window.switchCloudTab = switchCloudTab;
