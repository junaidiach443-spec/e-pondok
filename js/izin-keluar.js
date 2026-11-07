/**
 * ==========================================================================
 * e-Pondok Keuangan & Ketertiban PP. AL-USYMUNI - Modul Izin Keluar
 * 1. Liburan Santri (Perizinan Liburan Masal / Semester / Idul Fitri)
 * 2. Pulang Santri (Perizinan Pulang Insidentil / Sakit / Hajat Keluarga)
 * ==========================================================================
 */

// State Filter Halaman Liburan Santri
let filterLiburanState = {
    search: '',
    status: 'all',
    periode: 'all',
    kamar: 'all'
};

// State Filter Halaman Pulang Santri
let filterPulangState = {
    search: '',
    status: 'all',
    jenis: 'all',
    kamar: 'all'
};

// State Konfirmasi Kembali
let activeKonfirmasiKembali = {
    type: '', // 'liburan' | 'pulang'
    id: ''
};

// State Barcode Scanner Kedatangan / Balek Pondok
let html5QrScannerInstance = null;
let activeScanRekapTab = 'sudah'; // 'sudah' | 'belum'

// Helper: Generator Barcode Code 128 (Format Vektor SVG Ringan & Offline)
function generateCode128SVG(text, height = 40, barWidth = 1.3, color = '#15803d') {
    if (!text) return '';
    const patterns = [
        "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
        "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
        "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
        "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
        "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
        "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
        "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
        "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
        "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
        "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
        "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
    ];

    let codes = [104]; // Start B
    let checksum = 104;

    for (let i = 0; i < text.length; i++) {
        let code = text.charCodeAt(i) - 32;
        if (code < 0 || code > 95) code = 0;
        codes.push(code);
        checksum += code * (i + 1);
    }

    codes.push(checksum % 103);
    codes.push(106); // Stop code

    let modules = "";
    for (let c of codes) {
        let pattern = patterns[c];
        if (!pattern) continue;
        for (let j = 0; j < pattern.length; j++) {
            let width = parseInt(pattern[j], 10);
            let isBar = (j % 2 === 0);
            modules += (isBar ? "1" : "0").repeat(width);
        }
    }

    let totalWidth = Math.ceil(modules.length * barWidth);
    let rects = "";
    let x = 0;
    for (let i = 0; i < modules.length; i++) {
        if (modules[i] === "1") {
            rects += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="${color}" />`;
        }
        x += barWidth;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="${totalWidth}" height="${height}" style="max-width: 100%; height: ${height}px; display: block; margin: 0 auto;">${rects}</svg>`;
}

// Helper: Synthesizer Audio Beep Scanner
function playBeepSound(type = 'success') {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'success') {
            // Positif chime melodi dua nada (880Hz -> 1320Hz)
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.22);
        } else if (type === 'warning') {
            // Warning nada agak rendah (440Hz -> 330Hz)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(330, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
        } else {
            // Error nada rendah buzz (220Hz)
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.25);
        }
    } catch (e) {
        console.warn("Audio Context scanner:", e);
    }
}

// ==========================================================================
// 1. MODUL LIBURAN SANTRI (Perizinan Masal / Semester / Hari Raya)
// ==========================================================================

// Update Filter Dropdown untuk Halaman Liburan
function updateLiburanFiltersAndDropdowns() {
    // Populate Dropdown Kamar Filter
    const selKmr = document.getElementById('filter-liburan-kamar');
    if (selKmr) {
        const currentVal = selKmr.value;
        const kamars = (typeof getAllNamaKamar === 'function') ? getAllNamaKamar() : ['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'B-04', 'B-05'];
        let html = '<option value="all">Semua Kamar</option>';
        kamars.forEach(k => {
            html += `<option value="${k}">Kamar ${k}</option>`;
        });
        selKmr.innerHTML = html;
        if (currentVal) selKmr.value = currentVal;
    }

    // Populate Dropdown Periode Liburan Filter
    const selPeriode = document.getElementById('filter-liburan-periode');
    if (selPeriode) {
        const currentVal = selPeriode.value;
        const periodes = [...new Set((window.liburanSantriList || []).map(x => x.namaLiburan).filter(Boolean))];
        let html = '<option value="all">Semua Periode Liburan</option>';
        periodes.forEach(p => {
            html += `<option value="${p}">${p}</option>`;
        });
        selPeriode.innerHTML = html;
        if (currentVal) selPeriode.value = currentVal;
    }

    // Update Status Santri Terpilih di Modal Liburan
    const hidSantriLib = document.getElementById('liburan-santri-id');
    const inputSearchLib = document.getElementById('liburan-search-input');
    if (hidSantriLib && hidSantriLib.value) {
        const s = (window.santriData || []).find(x => x.id === hidSantriLib.value);
        if (s && inputSearchLib) {
            inputSearchLib.value = `${s.nama} (${s.nis || '-'})`;
        }
    }

    // Populate Kamar Filter di Modal Liburan (Untuk Pilih Massal per Kamar)
    const modalKmrBulk = document.getElementById('liburan-bulk-kamar');
    if (modalKmrBulk) {
        const kamars = (typeof getAllNamaKamar === 'function') ? getAllNamaKamar() : [];
        let html = '<option value="">-- Pilih Kamar untuk Isi Otomatis --</option>';
        kamars.forEach(k => {
            html += `<option value="${k}">Seluruh Santri Kamar ${k}</option>`;
        });
        modalKmrBulk.innerHTML = html;
    }
}

// Render Halaman Liburan Santri
function renderLiburanSantriPage(resetPage = false) {
    if (resetPage && typeof paginationState !== 'undefined') {
        paginationState.liburanSantri.page = 1;
    }

    const list = window.liburanSantriList || [];
    const santriMap = new Map((window.santriData || []).map(s => [s.id, s]));

    // Ambil input filter
    const search = (document.getElementById('search-liburan-santri')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('filter-liburan-status')?.value || 'all';
    const periodeFilter = document.getElementById('filter-liburan-periode')?.value || 'all';
    const kamarFilter = document.getElementById('filter-liburan-kamar')?.value || 'all';

    const activeTA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '';
    const activeList = list.filter(item => !activeTA || !item.tahunAjaran || item.tahunAjaran === activeTA);

    // Cek status keterlambatan dinamis berdasarkan tanggal hari ini
    const todayStr = new Date().toLocaleDateString('en-CA');
    activeList.forEach(item => {
        if (!item.tglKembaliRealisasi && item.tglKembali && item.tglKembali < todayStr && item.status !== 'Kembali Tepat Waktu') {
            item.status = 'Terlambat Kembali';
        }
    });

    // Hitung KPI
    const totalTerdaftar = activeList.length;
    const sedangLibur = activeList.filter(x => x.status === 'Sedang Libur' || x.status === 'Izin/Belum Pulang').length;
    const kembaliTepat = activeList.filter(x => x.status === 'Kembali Tepat Waktu').length;
    const terlambat = activeList.filter(x => x.status === 'Terlambat Kembali').length;

    const elKpiTotal = document.getElementById('liburan-kpi-total');
    const elKpiSedang = document.getElementById('liburan-kpi-sedang');
    const elKpiKembali = document.getElementById('liburan-kpi-kembali');
    const elKpiTerlambat = document.getElementById('liburan-kpi-terlambat');

    if (elKpiTotal) elKpiTotal.innerText = totalTerdaftar;
    if (elKpiSedang) elKpiSedang.innerText = sedangLibur;
    if (elKpiKembali) elKpiKembali.innerText = kembaliTepat;
    if (elKpiTerlambat) elKpiTerlambat.innerText = terlambat;

    // Filter Data
    let filtered = activeList.filter(item => {
        const s = santriMap.get(item.santriId) || {};
        const nama = (s.nama || '').toLowerCase();
        const nis = (s.nis || '').toLowerCase();
        const kamar = (s.kamar || s.kamarTerakhir || '').toLowerCase();
        const tujuan = (item.tujuan || '').toLowerCase();
        const penjemput = (item.penjemput || '').toLowerCase();
        const periode = (item.namaLiburan || '').toLowerCase();

        const matchSearch = !search || nama.includes(search) || nis.includes(search) || kamar.includes(search) || tujuan.includes(search) || penjemput.includes(search) || periode.includes(search);
        const matchStatus = (statusFilter === 'all') 
            || (statusFilter === 'belum-kembali' ? !item.tglKembaliRealisasi : item.status === statusFilter);
        const matchPeriode = (periodeFilter === 'all') || (item.namaLiburan === periodeFilter);
        const matchKamar = (kamarFilter === 'all') || ((s.kamar || s.kamarTerakhir || '') === kamarFilter);

        return matchSearch && matchStatus && matchPeriode && matchKamar;
    });

    // Urutkan berdasarkan waktu input terbaru
    filtered.sort((a, b) => new Date(b.waktuInput || b.tglMulai) - new Date(a.waktuInput || a.tglMulai));

    // Pagination
    const pageObj = (typeof paginationState !== 'undefined') ? paginationState.liburanSantri : { page: 1, pageSize: 20 };
    const pData = (typeof paginateArray === 'function') 
        ? paginateArray(filtered, pageObj.page, pageObj.pageSize)
        : { items: filtered, total: filtered.length, totalPages: 1, currentPage: 1, startIndex: 0, endIndex: filtered.length };

    const tbody = document.getElementById('liburan-santri-tbody');
    const infoCount = document.getElementById('liburan-santri-count-info');

    if (infoCount) {
        infoCount.innerText = `Menampilkan ${pData.items.length > 0 ? (pData.startIndex + 1) : 0} - ${pData.endIndex} dari ${pData.total} perizinan libur`;
    }

    if (!tbody) return;

    if (pData.items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12 text-gray-400">
                    <div class="flex flex-col items-center justify-center gap-2">
                        <i class="fas fa-umbrella-beach text-4xl text-gray-300"></i>
                        <p class="font-bold text-gray-500 text-sm">Tidak ada data perizinan liburan yang sesuai filter</p>
                        <p class="text-xs text-gray-400">Klik tombol "+ Tambah Izin Liburan" untuk membuat data izin baru.</p>
                    </div>
                </td>
            </tr>
        `;
        renderLiburanPaginationControls(pData);
        return;
    }

    let rowsHtml = '';
    pData.items.forEach((item, idx) => {
        const s = santriMap.get(item.santriId) || { nama: 'Santri Tidak Ditemukan', nis: '-', kamar: '-' };
        const rowNum = pData.startIndex + idx + 1;

        // Badge Status Kepulangan Libur
        let statusBadge = '';
        if (item.status === 'Kembali Tepat Waktu') {
            statusBadge = `<span class="px-2.5 py-1 text-[11px] border rounded-lg font-bold bg-emerald-50 text-emerald-700 border-emerald-300 inline-flex items-center gap-1.5"><i class="fas fa-check-circle text-[10px]"></i> Kembali di Pondok</span>`;
        } else if (item.status === 'Terlambat Kembali') {
            statusBadge = `<span class="px-2.5 py-1 text-[11px] border rounded-lg font-bold bg-rose-50 text-rose-700 border-rose-300 inline-flex items-center gap-1.5 animate-pulse"><i class="fas fa-triangle-exclamation text-[10px]"></i> Terlambat Kembali</span>`;
        } else if (item.status === 'Sedang Libur') {
            statusBadge = `<span class="px-2.5 py-1 text-[11px] border rounded-lg font-bold bg-amber-50 text-amber-800 border-amber-300 inline-flex items-center gap-1.5"><i class="fas fa-suitcase-rolling text-[10px]"></i> Sedang Libur</span>`;
        } else {
            statusBadge = `<span class="px-2.5 py-1 text-[11px] border rounded-lg font-bold bg-blue-50 text-blue-700 border-blue-300 inline-flex items-center gap-1.5"><i class="fas fa-clock text-[10px]"></i> Terdaftar / Siap</span>`;
        }

        // Status Tanggungan Keuangan
        let tanggunganBadge = '';
        const financialInfo = (typeof hitungRincianTunggakanSantri === 'function') ? hitungRincianTunggakanSantri(item.santriId) : { totalTunggakan: 0 };
        if (financialInfo.totalTunggakan > 0) {
            tanggunganBadge = `<span class="px-2 py-0.5 text-[10px] rounded-md font-bold bg-rose-100 text-rose-800 font-mono" title="Ada tanggungan ${formatRupiah(financialInfo.totalTunggakan)}">⚠️ Tunggakan ${formatRupiah(financialInfo.totalTunggakan)}</span>`;
        } else {
            tanggunganBadge = `<span class="px-2 py-0.5 text-[10px] rounded-md font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1"><i class="fas fa-check text-[9px]"></i> Lunas</span>`;
        }

        const tglMulaiFmt = formatTanggalIndo(item.tglMulai);
        const tglKembaliFmt = formatTanggalIndo(item.tglKembali);
        const tglRealisasiFmt = item.tglKembaliRealisasi ? formatTanggalIndo(item.tglKembaliRealisasi) : '-';

        rowsHtml += `
            <tr class="hover:bg-amber-50/30 transition-colors border-b border-gray-100 text-xs">
                <td class="py-3 px-3 text-center text-gray-500 font-mono font-medium">${rowNum}</td>
                <td class="py-3 px-3">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                            ${s.nama ? s.nama.charAt(0) : '?'}
                        </div>
                        <div>
                            <div class="font-extrabold text-gray-900">${s.nama}</div>
                            <div class="flex items-center gap-2 text-[11px] text-gray-500 font-mono mt-0.5">
                                <span>NIS: ${s.nis || '-'}</span>
                                <span>•</span>
                                <span class="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold border border-indigo-200">Kamar ${s.kamar || s.kamarTerakhir || '-'}</span>
                            </div>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-3">
                    <div class="font-bold text-gray-800">${item.namaLiburan}</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">TA: ${item.tahunAjaran || '-'}</div>
                </td>
                <td class="py-3 px-3">
                    <div class="space-y-0.5">
                        <div class="flex items-center gap-1 text-gray-700 font-medium">
                            <i class="far fa-calendar-check text-emerald-600 text-[11px] w-4"></i> Mulai: <b>${tglMulaiFmt}</b>
                        </div>
                        <div class="flex items-center gap-1 text-gray-700 font-medium">
                            <i class="far fa-calendar-times text-rose-600 text-[11px] w-4"></i> Wajib: <b>${tglKembaliFmt}</b>
                        </div>
                        ${item.tglKembaliRealisasi ? `
                            <div class="flex items-center gap-1 text-blue-700 text-[11px] font-bold">
                                <i class="fas fa-door-open text-[10px] w-4"></i> Tiba: ${tglRealisasiFmt}
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="py-3 px-3">
                    <div class="font-medium text-gray-800">${item.tujuan || s.asalKota || '-'}</div>
                    <div class="text-[11px] text-gray-500 mt-0.5">Penjemput: <b>${item.penjemput || s.namaWali || '-'}</b></div>
                </td>
                <td class="py-3 px-3 text-center">
                    ${tanggunganBadge}
                </td>
                <td class="py-3 px-3 text-center">
                    ${statusBadge}
                </td>
                <td class="py-3 px-3 text-center">
                    <div class="flex items-center justify-center gap-1">
                        ${!item.tglKembaliRealisasi ? `
                            <button type="button" onclick="bukaModalKonfirmasiKembali('liburan', '${item.id}')" title="Konfirmasi Santri Kembali ke Pondok" class="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        ${financialInfo.totalTunggakan > 0 ? `
                            <button type="button" onclick="peringatanTunggakanLiburan('${item.santriId}')" title="Cetak Surat Diblokir (Ada Tanggungan ${formatRupiah(financialInfo.totalTunggakan)})" class="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-2xs cursor-pointer">
                                <i class="fas fa-lock"></i>
                            </button>
                        ` : `
                            <button type="button" onclick="cetakSuratIzinLiburan('${item.id}')" title="Cetak Surat Jalan / Izin Liburan (Bebas Tanggungan)" class="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs">
                                <i class="fas fa-print"></i>
                            </button>
                        `}
                        <button type="button" onclick="bukaModalLiburanSantri('${item.id}')" title="Edit Data Izin Liburan" class="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-all shadow-2xs">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" onclick="hapusIzinLiburan('${item.id}')" title="Hapus Data Izin" class="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-all shadow-2xs">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
    renderLiburanPaginationControls(pData);
}

// Render Kontrol Pagination Liburan
function renderLiburanPaginationControls(pData) {
    const container = document.getElementById('liburan-pagination-container');
    if (!container) return;

    if (pData.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let buttonsHtml = '';
    const cur = pData.currentPage;
    const tot = pData.totalPages;

    buttonsHtml += `
        <button onclick="pindahHalamanLiburan(${cur - 1})" ${cur === 1 ? 'disabled class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-300 cursor-not-allowed"' : 'class="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"'}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    for (let i = 1; i <= tot; i++) {
        if (i === 1 || i === tot || (i >= cur - 1 && i <= cur + 1)) {
            const isAct = i === cur;
            buttonsHtml += `
                <button onclick="pindahHalamanLiburan(${i})" class="px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${isAct ? 'bg-amber-600 text-white shadow-xs' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'}">
                    ${i}
                </button>
            `;
        } else if (i === cur - 2 || i === cur + 2) {
            buttonsHtml += `<span class="text-gray-400 text-xs px-1">...</span>`;
        }
    }

    buttonsHtml += `
        <button onclick="pindahHalamanLiburan(${cur + 1})" ${cur === tot ? 'disabled class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-300 cursor-not-allowed"' : 'class="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"'}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    container.innerHTML = `
        <div class="flex items-center gap-1.5">
            ${buttonsHtml}
        </div>
    `;
}

function pindahHalamanLiburan(target) {
    if (typeof paginationState !== 'undefined') {
        paginationState.liburanSantri.page = target;
        renderLiburanSantriPage(false);
    }
}

// Handler Perubahan Scope Target Liburan (Seluruh Santri / Kamar / Perorangan)
function onLiburanScopeChanged() {
    const scope = document.querySelector('input[name="liburan-scope"]:checked')?.value || 'all';
    const boxKamar = document.getElementById('liburan-scope-kamar-box');
    const boxSingle = document.getElementById('liburan-scope-single-box');
    const personalSec = document.getElementById('liburan-personal-section');

    const labelAll = document.getElementById('label-scope-all');
    const labelKmr = document.getElementById('label-scope-kamar');
    const labelSgl = document.getElementById('label-scope-single');

    if (labelAll) {
        if (scope === 'all') {
            labelAll.className = 'border-2 border-amber-400 bg-amber-50/60 p-2.5 rounded-xl cursor-pointer flex flex-col items-center text-center gap-1 shadow-xs transition-all';
        } else {
            labelAll.className = 'border border-gray-200 bg-white p-2.5 rounded-xl cursor-pointer flex flex-col items-center text-center gap-1 hover:border-amber-400 transition-all';
        }
    }
    if (labelKmr) {
        if (scope === 'kamar') {
            labelKmr.className = 'border-2 border-amber-400 bg-amber-50/60 p-2.5 rounded-xl cursor-pointer flex flex-col items-center text-center gap-1 shadow-xs transition-all';
        } else {
            labelKmr.className = 'border border-gray-200 bg-white p-2.5 rounded-xl cursor-pointer flex flex-col items-center text-center gap-1 hover:border-amber-400 transition-all';
        }
    }
    if (labelSgl) {
        if (scope === 'single') {
            labelSgl.className = 'border-2 border-amber-400 bg-amber-50/60 p-2.5 rounded-xl cursor-pointer flex flex-col items-center text-center gap-1 shadow-xs transition-all';
        } else {
            labelSgl.className = 'border border-gray-200 bg-white p-2.5 rounded-xl cursor-pointer flex flex-col items-center text-center gap-1 hover:border-amber-400 transition-all';
        }
    }

    if (boxKamar) {
        if (scope === 'kamar') boxKamar.classList.remove('hidden');
        else boxKamar.classList.add('hidden');
    }
    if (boxSingle) {
        if (scope === 'single') {
            boxSingle.classList.remove('hidden');
            onLiburanSantriChanged();
        } else {
            boxSingle.classList.add('hidden');
        }
    }
    if (personalSec) {
        if (scope === 'single') personalSec.classList.remove('hidden');
        else personalSec.classList.add('hidden');
    }
}

// Buka Modal Tambah/Edit Izin Liburan (Liburan Bersama)
function bukaModalLiburanSantri(idToEdit = null, isEditBersama = false) {
    updateLiburanFiltersAndDropdowns();
    const modal = document.getElementById('modal-liburan-santri');
    const modalTitle = document.getElementById('modal-liburan-title');
    const modalDesc = document.getElementById('modal-liburan-desc');
    const inputId = document.getElementById('liburan-edit-id');
    const inputOldNama = document.getElementById('liburan-old-nama');
    const selSantri = document.getElementById('liburan-santri-id');
    const inputNamaLib = document.getElementById('liburan-nama');
    const inputTa = document.getElementById('liburan-ta');
    const inputMulai = document.getElementById('liburan-tgl-mulai');
    const inputKembali = document.getElementById('liburan-tgl-kembali');
    const inputTujuan = document.getElementById('liburan-tujuan');
    const inputPenjemput = document.getElementById('liburan-penjemput');
    const inputCatatan = document.getElementById('liburan-catatan');
    const targetSection = document.getElementById('liburan-target-section');
    const personalSection = document.getElementById('liburan-personal-section');
    const editBanner = document.getElementById('liburan-edit-bersama-banner');
    const editSantriCount = document.getElementById('liburan-edit-santri-count');
    const btnHapusBersama = document.getElementById('btn-hapus-liburan-bersama');
    const btnSimpan = document.getElementById('btn-simpan-liburan');

    const defaultTA = (typeof getTahunAjaranAktif === 'function') ? getTahunAjaranAktif() : '1447/1448';
    if (inputTa) inputTa.value = defaultTA;

    if (idToEdit) {
        // Mode Edit: Liburan Bersama untuk Seluruh Santri
        const item = (window.liburanSantriList || []).find(x => x.id === idToEdit);
        if (!item) return showToast("Data izin liburan tidak ditemukan!", "error");

        const santriEnrolled = (window.liburanSantriList || []).filter(x => x.namaLiburan === item.namaLiburan);
        const count = santriEnrolled.length;

        if (modalTitle) modalTitle.innerText = "Edit Jadwal Liburan Bersama";
        if (modalDesc) modalDesc.innerText = "Perubahan jadwal otomatis diperbarui untuk seluruh santri yang berlibur bersama.";
        if (inputId) inputId.value = item.id;
        if (inputOldNama) inputOldNama.value = item.namaLiburan;
        if (inputNamaLib) inputNamaLib.value = item.namaLiburan;
        if (inputTa) inputTa.value = item.tahunAjaran || defaultTA;
        if (inputMulai) inputMulai.value = item.tglMulai;
        if (inputKembali) inputKembali.value = item.tglKembali;
        if (inputCatatan) inputCatatan.value = item.catatan || '';

        // Tampilkan Banner Edit Bersama & Sembunyikan Input Perorangan
        if (editBanner) editBanner.classList.remove('hidden');
        if (editSantriCount) editSantriCount.innerText = count;
        if (targetSection) targetSection.classList.add('hidden');
        if (personalSection) personalSection.classList.add('hidden');
        if (btnHapusBersama) btnHapusBersama.classList.remove('hidden');
        if (btnSimpan) btnSimpan.innerHTML = '<i class="fas fa-check-double"></i> Simpan Perubahan (Seluruh Santri)';
    } else {
        // Mode Tambah Baru
        if (modalTitle) modalTitle.innerText = "Tambah Izin Liburan Bersama";
        if (modalDesc) modalDesc.innerText = "Pencatatan perizinan libur masal & penerbitan surat jalan resmi.";
        if (inputId) inputId.value = '';
        if (inputOldNama) inputOldNama.value = '';

        // Reset radio ke Seluruh Santri
        const radioAll = document.querySelector('input[name="liburan-scope"][value="all"]');
        if (radioAll) radioAll.checked = true;

        if (inputNamaLib) inputNamaLib.value = 'Liburan Akhir Sanah & Idul Fitri 1447 H';
        const today = new Date().toLocaleDateString('en-CA');
        if (inputMulai) inputMulai.value = today;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 14);
        if (inputKembali) inputKembali.value = targetDate.toLocaleDateString('en-CA');
        if (inputTujuan) inputTujuan.value = '';
        if (inputPenjemput) inputPenjemput.value = '';
        if (inputCatatan) inputCatatan.value = '';

        // Sembunyikan Banner Edit Bersama & Tampilkan Target Section
        if (editBanner) editBanner.classList.add('hidden');
        if (targetSection) targetSection.classList.remove('hidden');
        if (btnHapusBersama) btnHapusBersama.classList.add('hidden');
        if (btnSimpan) btnSimpan.innerHTML = '<i class="fas fa-check"></i> Simpan Data Izin Liburan';

        onLiburanScopeChanged();

        const infoBox = document.getElementById('liburan-santri-finance-info');
        if (infoBox) infoBox.innerHTML = '';
    }

    bukaModal('modal-liburan-santri');
}

// Buka Modal Edit Liburan Bersama dari Tombol Header
function bukaModalEditLiburanBersama(targetPeriodeNama = null) {
    const list = window.liburanSantriList || [];
    if (list.length === 0) {
        return showToast("Belum ada data izin liburan santri yang terdaftar!", "info");
    }

    let periode = targetPeriodeNama;
    if (!periode) {
        const filterVal = document.getElementById('filter-liburan-periode')?.value;
        if (filterVal && filterVal !== 'all') {
            periode = filterVal;
        } else {
            periode = list[0]?.namaLiburan;
        }
    }

    const item = list.find(x => x.namaLiburan === periode) || list[0];
    if (item) {
        bukaModalLiburanSantri(item.id, true);
    }
}

// Searchable Combobox Santri di Modal Liburan
function onSearchSantriLiburan(query) {
    const dropdown = document.getElementById('dropdown-santri-liburan');
    const btnClear = document.getElementById('btn-clear-santri-liburan');
    if (!dropdown) return;

    if (btnClear) {
        if (query) btnClear.classList.remove('hidden');
        else btnClear.classList.add('hidden');
    }

    const q = (query || '').toLowerCase().trim();
    const candidates = (window.santriData || [])
        .filter(s => s.status === 'Aktif')
        .filter(s => {
            if (!q) return true;
            const nama = (s.nama || '').toLowerCase();
            const nis = (s.nis || '').toLowerCase();
            const kamar = (s.kamar || '').toLowerCase();
            return nama.includes(q) || nis.includes(q) || kamar.includes(q);
        })
        .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }))
        .slice(0, 30);

    if (candidates.length === 0) {
        dropdown.innerHTML = `
            <div class="p-4 text-center text-xs text-gray-400">
                <i class="fas fa-search mb-1 text-sm block text-gray-300"></i>
                Tidak ada santri aktif yang cocok dengan "<b>${escapeHtml(query)}</b>"
            </div>
        `;
        dropdown.classList.remove('hidden');
        return;
    }

    let html = '';
    candidates.forEach(s => {
        const inisial = (s.nama || '?').charAt(0).toUpperCase();
        html += `
            <div onclick="selectSantriForLiburan('${s.id}')" class="p-3 hover:bg-amber-50/70 cursor-pointer transition-colors flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs shrink-0">
                    ${inisial}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-gray-800 text-xs truncate">${s.nama}</div>
                    <div class="text-[11px] text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>NIS: ${s.nis || '-'}</span>
                        <span>•</span>
                        <span class="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">Kamar: ${s.kamar || '-'}</span>
                    </div>
                </div>
                <div class="text-xs text-amber-600 font-bold shrink-0">
                    Pilih <i class="fas fa-chevron-right text-[10px]"></i>
                </div>
            </div>
        `;
    });

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
}

function onFocusSantriLiburan() {
    const input = document.getElementById('liburan-search-input');
    onSearchSantriLiburan(input ? input.value : '');
}

function selectSantriForLiburan(santriId) {
    const s = (window.santriData || []).find(x => x.id === santriId);
    if (!s) return;

    const inputHidden = document.getElementById('liburan-santri-id');
    const inputSearch = document.getElementById('liburan-search-input');
    const dropdown = document.getElementById('dropdown-santri-liburan');
    const btnClear = document.getElementById('btn-clear-santri-liburan');

    if (inputHidden) inputHidden.value = s.id;
    if (inputSearch) inputSearch.value = `${s.nama} (${s.nis || '-'})`;
    if (dropdown) dropdown.classList.add('hidden');
    if (btnClear) btnClear.classList.remove('hidden');

    onLiburanSantriChanged();
}

function clearSelectedSantriLiburan() {
    const inputHidden = document.getElementById('liburan-santri-id');
    const inputSearch = document.getElementById('liburan-search-input');
    const dropdown = document.getElementById('dropdown-santri-liburan');
    const btnClear = document.getElementById('btn-clear-santri-liburan');

    if (inputHidden) inputHidden.value = '';
    if (inputSearch) {
        inputSearch.value = '';
        inputSearch.focus();
    }
    if (dropdown) dropdown.classList.add('hidden');
    if (btnClear) btnClear.classList.add('hidden');

    onLiburanSantriChanged();
}

// Handler Saat Santri Terpilih di Modal Liburan
function onLiburanSantriChanged() {
    const sId = document.getElementById('liburan-santri-id')?.value;
    const inputTujuan = document.getElementById('liburan-tujuan');
    const inputPenjemput = document.getElementById('liburan-penjemput');
    const infoBox = document.getElementById('liburan-santri-finance-info');

    if (!sId) {
        if (infoBox) infoBox.innerHTML = '';
        return;
    }

    const s = (window.santriData || []).find(x => x.id === sId);
    if (!s) return;

    if (inputTujuan && !inputTujuan.value) {
        inputTujuan.value = s.desa ? `${s.desa}, ${s.kecamatan || ''}, ${s.asalKota || 'Sumenep'}` : (s.asalKota || '');
    }
    if (inputPenjemput && !inputPenjemput.value) {
        inputPenjemput.value = s.namaWali || s.ayah || 'Wali Santri';
    }

    // Tampilkan Informasi Keuangan / Tanggungan Santri
    if (infoBox) {
        const financialInfo = (typeof hitungRincianTunggakanSantri === 'function') ? hitungRincianTunggakanSantri(sId) : { totalTunggakan: 0 };
        if (financialInfo.totalTunggakan > 0) {
            infoBox.innerHTML = `
                <div class="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-2 text-amber-800">
                        <i class="fas fa-exclamation-circle text-amber-600 text-sm"></i>
                        <span>Santri ini masih memiliki tanggungan tagihan sebesar <b>${formatRupiah(financialInfo.totalTunggakan)}</b>.</span>
                    </div>
                    <button type="button" onclick="lunasiSemuaTanggunganSantri('${sId}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shrink-0">
                        Lunasi Sekarang
                    </button>
                </div>
            `;
        } else {
            infoBox.innerHTML = `
                <div class="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
                    <i class="fas fa-check-circle text-emerald-600 text-sm"></i>
                    <span>Administrasi Keuangan Santri: <b>Bebas Tanggungan (Lunas)</b></span>
                </div>
            `;
        }
    }
}

// Isi Massal Izin Liburan Berdasarkan Kamar
function onBulkKamarLiburanChanged() {
    const kmr = document.getElementById('liburan-bulk-kamar')?.value;
    if (!kmr) return;

    const santriInRoom = (window.santriData || []).filter(s => s.status === 'Aktif' && (s.kamar || '') === kmr);
    if (santriInRoom.length === 0) {
        return showToast(`Tidak ada santri aktif di kamar ${kmr}`, "info");
    }

    showToast(`Ditemukan ${santriInRoom.length} santri aktif di Kamar ${kmr}. Klik simpan untuk mendaftarkan izin liburan secara massal.`, "info");
}

// Simpan Data Izin Liburan (Tambah / Edit Liburan Bersama)
function simpanIzinLiburan() {
    const editId = document.getElementById('liburan-edit-id')?.value;
    const oldNama = document.getElementById('liburan-old-nama')?.value;
    const scope = document.querySelector('input[name="liburan-scope"]:checked')?.value || 'all';
    const sId = document.getElementById('liburan-santri-id')?.value;
    const bulkKmr = document.getElementById('liburan-bulk-kamar')?.value;
    const namaLiburan = document.getElementById('liburan-nama')?.value.trim();
    const ta = document.getElementById('liburan-ta')?.value.trim();
    const tglMulai = document.getElementById('liburan-tgl-mulai')?.value;
    const tglKembali = document.getElementById('liburan-tgl-kembali')?.value;
    const tujuan = document.getElementById('liburan-tujuan')?.value.trim();
    const penjemput = document.getElementById('liburan-penjemput')?.value.trim();
    const catatan = document.getElementById('liburan-catatan')?.value.trim();

    if (!namaLiburan) return showToast("Nama periode liburan wajib diisi!", "error");
    if (!tglMulai) return showToast("Tanggal mulai libur wajib diisi!", "error");
    if (!tglKembali) return showToast("Batas tanggal wajib kembali wajib diisi!", "error");

    if (tglKembali < tglMulai) {
        return showToast("Batas tanggal kembali tidak boleh mendahului tanggal mulai libur!", "error");
    }

    const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    const petugas = currentUser ? (currentUser.nama || currentUser.username) : 'Bagian Keamanan / Pengurus';

    if (editId) {
        // Mode Edit: Liburan Bersama untuk Seluruh Santri
        const oldTarget = oldNama || ((window.liburanSantriList || []).find(x => x.id === editId)?.namaLiburan);
        const matchingItems = (window.liburanSantriList || []).filter(x => x.namaLiburan === oldTarget || x.id === editId);

        if (matchingItems.length === 0) return showToast("Data izin liburan tidak ditemukan!", "error");

        const todayStr = new Date().toLocaleDateString('en-CA');

        matchingItems.forEach(item => {
            item.namaLiburan = namaLiburan;
            item.tahunAjaran = ta;
            item.tglMulai = tglMulai;
            item.tglKembali = tglKembali;
            if (catatan) item.catatan = catatan;

            // Update status otomatis jika belum kembali
            if (!item.tglKembaliRealisasi) {
                if (tglKembali < todayStr) {
                    item.status = 'Terlambat Kembali';
                } else if (item.status === 'Terlambat Kembali' && tglKembali >= todayStr) {
                    item.status = 'Sedang Libur';
                }
            }
        });

        saveDataToStorage();
        updateLiburanFiltersAndDropdowns();
        renderLiburanSantriPage();
        tutupModal('modal-liburan-santri');
        showToast(`Jadwal liburan bersama "${namaLiburan}" berhasil diperbarui otomatis untuk seluruh ${matchingItems.length} santri!`, "success");
    } else if (scope === 'all') {
        // Mode Tambah Baru: Liburan Bersama Seluruh Santri Aktif
        const santriAktif = (window.santriData || []).filter(s => s.status === 'Aktif');
        if (santriAktif.length === 0) return showToast("Tidak ada data santri aktif!", "error");

        let addedCount = 0;
        santriAktif.forEach(s => {
            const exist = (window.liburanSantriList || []).find(x => x.santriId === s.id && x.namaLiburan === namaLiburan);
            if (!exist) {
                const newId = 'LIB-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
                window.liburanSantriList.push({
                    id: newId,
                    santriId: s.id,
                    namaLiburan,
                    tahunAjaran: ta,
                    tglMulai,
                    tglKembali,
                    tglKembaliRealisasi: null,
                    status: 'Sedang Libur',
                    penjemput: s.namaWali || s.ayah || 'Wali Santri',
                    tujuan: s.desa ? `${s.desa}, ${s.kecamatan || ''}, ${s.asalKota || 'Sumenep'}` : (s.asalKota || 'Rumah Santri'),
                    statusTanggungan: 'Lunas',
                    catatan: catatan || 'Liburan bersama seluruh santri',
                    petugasIzin: petugas,
                    waktuInput: new Date().toISOString()
                });
                addedCount++;
            }
        });

        saveDataToStorage();
        updateLiburanFiltersAndDropdowns();
        renderLiburanSantriPage(true);
        tutupModal('modal-liburan-santri');
        showToast(`Berhasil menerbitkan izin liburan bersama untuk seluruh ${addedCount} santri aktif!`, "success");
    } else if (scope === 'kamar') {
        // Mode Massal Berdasarkan Kamar
        if (!bulkKmr) return showToast("Pilih kamar santri terlebih dahulu!", "error");
        const santriInRoom = (window.santriData || []).filter(s => s.status === 'Aktif' && (s.kamar || '') === bulkKmr);
        if (santriInRoom.length === 0) return showToast("Tidak ada santri aktif di kamar tersebut!", "error");

        let addedCount = 0;
        santriInRoom.forEach(s => {
            const exist = (window.liburanSantriList || []).find(x => x.santriId === s.id && x.namaLiburan === namaLiburan);
            if (!exist) {
                const newId = 'LIB-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
                window.liburanSantriList.push({
                    id: newId,
                    santriId: s.id,
                    namaLiburan,
                    tahunAjaran: ta,
                    tglMulai,
                    tglKembali,
                    tglKembaliRealisasi: null,
                    status: 'Sedang Libur',
                    penjemput: s.namaWali || penjemput || 'Wali Santri',
                    tujuan: s.asalKota ? `${s.desa || ''}, ${s.asalKota}` : tujuan,
                    statusTanggungan: 'Lunas',
                    catatan: catatan || 'Izin liburan massal kamar ' + bulkKmr,
                    petugasIzin: petugas,
                    waktuInput: new Date().toISOString()
                });
                addedCount++;
            }
        });

        saveDataToStorage();
        updateLiburanFiltersAndDropdowns();
        renderLiburanSantriPage(true);
        tutupModal('modal-liburan-santri');
        showToast(`Berhasil menerbitkan izin liburan untuk ${addedCount} santri Kamar ${bulkKmr}!`, "success");
    } else {
        // Mode Perorangan / 1 Santri
        if (!sId) return showToast("Pilih santri yang akan diberikan izin liburan!", "error");

        const newId = 'LIB-' + Date.now().toString().slice(-6);
        window.liburanSantriList.push({
            id: newId,
            santriId: sId,
            namaLiburan,
            tahunAjaran: ta,
            tglMulai,
            tglKembali,
            tglKembaliRealisasi: null,
            status: 'Sedang Libur',
            penjemput: penjemput || 'Wali Santri',
            tujuan: tujuan || '-',
            statusTanggungan: 'Lunas',
            catatan,
            petugasIzin: petugas,
            waktuInput: new Date().toISOString()
        });

        saveDataToStorage();
        updateLiburanFiltersAndDropdowns();
        renderLiburanSantriPage(true);
        tutupModal('modal-liburan-santri');
        showToast("Izin liburan santri berhasil ditambahkan!", "success");
    }
}

// Hapus Seluruh Hasil Liburan Bersama yang sedang diedit di modal
function hapusHasilPengeditanLiburan() {
    const editId = document.getElementById('liburan-edit-id')?.value;
    const oldNama = document.getElementById('liburan-old-nama')?.value;
    const oldItem = (window.liburanSantriList || []).find(x => x.id === editId);
    const namaLiburan = oldNama || (oldItem ? oldItem.namaLiburan : document.getElementById('liburan-nama')?.value.trim());

    if (!namaLiburan) return showToast("Periode liburan tidak valid!", "error");

    hapusSeluruhLiburanPeriode(namaLiburan, () => {
        tutupModal('modal-liburan-santri');
    });
}

// Helper: Hapus Seluruh Data Santri di Satu Periode Liburan Bersama
function hapusSeluruhLiburanPeriode(namaLiburan, onAfterDelete = null) {
    const count = (window.liburanSantriList || []).filter(x => x.namaLiburan === namaLiburan).length;
    if (count === 0) return showToast("Tidak ada data santri pada periode liburan ini!", "info");

    showConfirm(
        "Hapus Hasil Liburan Bersama?",
        `Yakin ingin menghapus seluruh data hasil izin liburan bersama <b>"${namaLiburan}"</b> untuk <b>seluruh ${count} santri</b>?<br><br><span class="text-rose-600 font-medium">Tindakan ini akan menghapus riwayat izin liburan periode ini dari sistem.</span>`,
        () => {
            window.liburanSantriList = (window.liburanSantriList || []).filter(x => x.namaLiburan !== namaLiburan);
            saveDataToStorage();
            updateLiburanFiltersAndDropdowns();
            renderLiburanSantriPage(true);
            if (typeof onAfterDelete === 'function') onAfterDelete();
            showToast(`Seluruh data liburan bersama "${namaLiburan}" (${count} santri) berhasil dihapus!`, "success");
        },
        true
    );
}

// Hapus Izin Liburan dari Baris Tabel
function hapusIzinLiburan(id) {
    const item = (window.liburanSantriList || []).find(x => x.id === id);
    if (!item) return;

    const s = (window.santriData || []).find(x => x.id === item.santriId);
    const namaSantri = s ? s.nama : 'Santri';
    const totalSantriDiPeriode = (window.liburanSantriList || []).filter(x => x.namaLiburan === item.namaLiburan).length;

    if (totalSantriDiPeriode > 1 && typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Hapus Izin Liburan Bersama?',
            html: `Izin liburan ananda <b>${namaSantri}</b> adalah bagian dari liburan bersama <b>"${item.namaLiburan}"</b> yang diikuti oleh <b>${totalSantriDiPeriode} santri</b>.<br><br>Pilih opsi penghapusan yang Anda inginkan:`,
            icon: 'warning',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            denyButtonColor: '#f59e0b',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: `<i class="fas fa-trash-can"></i> Hapus Seluruh Santri (${totalSantriDiPeriode})`,
            denyButtonText: `<i class="fas fa-user-minus"></i> Hapus Santri Ini Saja`,
            cancelButtonText: 'Batal',
            customClass: { popup: 'rounded-2xl' }
        }).then((res) => {
            if (res.isConfirmed) {
                hapusSeluruhLiburanPeriode(item.namaLiburan);
            } else if (res.isDenied) {
                window.liburanSantriList = (window.liburanSantriList || []).filter(x => x.id !== id);
                saveDataToStorage();
                updateLiburanFiltersAndDropdowns();
                renderLiburanSantriPage();
                showToast(`Data izin liburan ananda ${namaSantri} berhasil dihapus!`);
            }
        });
    } else {
        showConfirm(
            "Hapus Izin Liburan?",
            `Yakin ingin menghapus data izin liburan ananda ${namaSantri} (${item.namaLiburan})?`,
            () => {
                window.liburanSantriList = (window.liburanSantriList || []).filter(x => x.id !== id);
                saveDataToStorage();
                updateLiburanFiltersAndDropdowns();
                renderLiburanSantriPage();
                showToast("Data izin liburan berhasil dihapus!");
            }
        );
    }
}

// ==========================================================================
// 2. MODUL PULANG SANTRI (Perizinan Pulang Insidentil / Sakit / Hajat)
// ==========================================================================

// Update Filter Dropdown untuk Halaman Pulang
function updatePulangFiltersAndDropdowns() {
    // Populate Dropdown Kamar Filter
    const selKmr = document.getElementById('filter-pulang-kamar');
    if (selKmr) {
        const currentVal = selKmr.value;
        const kamars = (typeof getAllNamaKamar === 'function') ? getAllNamaKamar() : ['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'B-04', 'B-05'];
        let html = '<option value="all">Semua Kamar</option>';
        kamars.forEach(k => {
            html += `<option value="${k}">Kamar ${k}</option>`;
        });
        selKmr.innerHTML = html;
        if (currentVal) selKmr.value = currentVal;
    }

    // Populate Santri Select di Modal Pulang
    const modalSantriSel = document.getElementById('pulang-santri-id');
    if (modalSantriSel) {
        const santriList = (window.santriData || []).filter(s => s.status === 'Aktif');
        let html = '<option value="">-- Pilih Santri Aktif --</option>';
        santriList.forEach(s => {
            html += `<option value="${s.id}">Kamar ${s.kamar || '-'} • ${s.nama} (${s.nis || 'Tanpa NIS'})</option>`;
        });
        modalSantriSel.innerHTML = html;
    }
}

// Render Halaman Pulang Santri
function renderPulangSantriPage(resetPage = false) {
    if (resetPage && typeof paginationState !== 'undefined') {
        paginationState.pulangSantri.page = 1;
    }

    const list = window.pulangSantriList || [];
    const santriMap = new Map((window.santriData || []).map(s => [s.id, s]));

    // Input filter
    const search = (document.getElementById('search-pulang-santri')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('filter-pulang-status')?.value || 'all';
    const jenisFilter = document.getElementById('filter-pulang-jenis')?.value || 'all';
    const kamarFilter = document.getElementById('filter-pulang-kamar')?.value || 'all';

    const activeTA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '';
    const activeList = list.filter(item => !activeTA || !item.tahunAjaran || item.tahunAjaran === activeTA);

    // Cek keterlambatan otomatis
    const todayStr = new Date().toLocaleDateString('en-CA');
    activeList.forEach(item => {
        if (!item.tglKembaliRealisasi && item.tglKembaliTarget && item.tglKembaliTarget < todayStr && item.status !== 'Kembali Tepat Waktu') {
            item.status = 'Terlambat Kembali';
        }
    });

    // Hitung KPI
    const sedangPulang = activeList.filter(x => x.status === 'Sedang Pulang').length;
    const izinHariIni = activeList.filter(x => x.tglMulai === todayStr).length;
    const sudahKembali = activeList.filter(x => x.status === 'Kembali Tepat Waktu').length;
    const terlambat = activeList.filter(x => x.status === 'Terlambat Kembali').length;

    const elKpiSedang = document.getElementById('pulang-kpi-sedang');
    const elKpiHariIni = document.getElementById('pulang-kpi-hari-ini');
    const elKpiKembali = document.getElementById('pulang-kpi-kembali');
    const elKpiTerlambat = document.getElementById('pulang-kpi-terlambat');

    if (elKpiSedang) elKpiSedang.innerText = sedangPulang;
    if (elKpiHariIni) elKpiHariIni.innerText = izinHariIni;
    if (elKpiKembali) elKpiKembali.innerText = sudahKembali;
    if (elKpiTerlambat) elKpiTerlambat.innerText = terlambat;

    // Filter data
    let filtered = activeList.filter(item => {
        const s = santriMap.get(item.santriId) || {};
        const nama = (s.nama || '').toLowerCase();
        const nis = (s.nis || '').toLowerCase();
        const kamar = (s.kamar || s.kamarTerakhir || '').toLowerCase();
        const tujuan = (item.tujuan || '').toLowerCase();
        const penjemput = (item.namaPenjemput || '').toLowerCase();
        const jenis = (item.jenisIzin || '').toLowerCase();
        const keterangan = (item.keterangan || '').toLowerCase();

        const matchSearch = !search || nama.includes(search) || nis.includes(search) || kamar.includes(search) || tujuan.includes(search) || penjemput.includes(search) || jenis.includes(search) || keterangan.includes(search);
        const matchStatus = (statusFilter === 'all') || (item.status === statusFilter);
        const matchJenis = (jenisFilter === 'all') || (item.jenisIzin === jenisFilter);
        const matchKamar = (kamarFilter === 'all') || ((s.kamar || s.kamarTerakhir || '') === kamarFilter);

        return matchSearch && matchStatus && matchJenis && matchKamar;
    });

    // Urutkan input terbaru di atas
    filtered.sort((a, b) => new Date(b.waktuInput || b.tglMulai) - new Date(a.waktuInput || a.tglMulai));

    // Pagination
    const pageObj = (typeof paginationState !== 'undefined') ? paginationState.pulangSantri : { page: 1, pageSize: 20 };
    const pData = (typeof paginateArray === 'function') 
        ? paginateArray(filtered, pageObj.page, pageObj.pageSize)
        : { items: filtered, total: filtered.length, totalPages: 1, currentPage: 1, startIndex: 0, endIndex: filtered.length };

    const tbody = document.getElementById('pulang-santri-tbody');
    const infoCount = document.getElementById('pulang-santri-count-info');

    if (infoCount) {
        infoCount.innerText = `Menampilkan ${pData.items.length > 0 ? (pData.startIndex + 1) : 0} - ${pData.endIndex} dari ${pData.total} perizinan pulang`;
    }

    if (!tbody) return;

    if (pData.items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-12 text-gray-400">
                    <div class="flex flex-col items-center justify-center gap-2">
                        <i class="fas fa-house-user text-4xl text-gray-300"></i>
                        <p class="font-bold text-gray-500 text-sm">Tidak ada data izin pulang santri yang sesuai filter</p>
                        <p class="text-xs text-gray-400">Klik tombol "+ Buat Izin Pulang" untuk mencatat kepulangan santri.</p>
                    </div>
                </td>
            </tr>
        `;
        renderPulangPaginationControls(pData);
        return;
    }

    let rowsHtml = '';
    pData.items.forEach((item, idx) => {
        const s = santriMap.get(item.santriId) || { nama: 'Santri Tidak Ditemukan', nis: '-', kamar: '-' };
        const rowNum = pData.startIndex + idx + 1;

        // Badge Status Pulang
        let statusBadge = '';
        if (item.status === 'Kembali Tepat Waktu') {
            statusBadge = `<span class="px-2.5 py-1 text-[11px] border rounded-lg font-bold bg-emerald-50 text-emerald-700 border-emerald-300 inline-flex items-center gap-1.5"><i class="fas fa-check-circle text-[10px]"></i> Sudah Kembali</span>`;
        } else if (item.status === 'Terlambat Kembali') {
            statusBadge = `<span class="px-2.5 py-1 text-[11px] border rounded-lg font-bold bg-rose-50 text-rose-700 border-rose-300 inline-flex items-center gap-1.5 animate-pulse"><i class="fas fa-triangle-exclamation text-[10px]"></i> Terlambat</span>`;
        } else {
            statusBadge = `<span class="px-2.5 py-1 text-[11px] border rounded-lg font-bold bg-amber-50 text-amber-800 border-amber-300 inline-flex items-center gap-1.5"><i class="fas fa-person-walking-arrow-right text-[10px]"></i> Sedang Pulang</span>`;
        }

        const tglMulaiFmt = formatTanggalIndo(item.tglMulai);
        const tglKembaliFmt = formatTanggalIndo(item.tglKembaliTarget);
        const tglRealisasiFmt = item.tglKembaliRealisasi ? formatTanggalIndo(item.tglKembaliRealisasi) : '-';

        // Hubungan & Kontak Penjemput
        const cleanPhone = (item.noHpPenjemput || '').replace(/\D/g, '').replace(/^0/, '62');

        rowsHtml += `
            <tr class="hover:bg-emerald-50/20 transition-colors border-b border-gray-100 text-xs">
                <td class="py-3 px-3 text-center text-gray-500 font-mono font-medium">${rowNum}</td>
                <td class="py-3 px-3">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                            ${s.nama ? s.nama.charAt(0) : '?'}
                        </div>
                        <div>
                            <div class="font-extrabold text-gray-900">${s.nama}</div>
                            <div class="flex items-center gap-2 text-[11px] text-gray-500 font-mono mt-0.5">
                                <span>NIS: ${s.nis || '-'}</span>
                                <span>•</span>
                                <span class="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold border border-indigo-200">Kamar ${s.kamar || s.kamarTerakhir || '-'}</span>
                            </div>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-3">
                    <div class="font-bold text-gray-800 flex items-center gap-1">
                        <i class="fas fa-tag text-[10px] text-indigo-500"></i> ${item.jenisIzin}
                    </div>
                    <div class="text-[11px] text-gray-600 mt-0.5 line-clamp-1" title="${item.keterangan || ''}">
                        ${item.keterangan || '-'}
                    </div>
                </td>
                <td class="py-3 px-3">
                    <div class="space-y-0.5">
                        <div class="flex items-center gap-1 text-gray-700 font-medium">
                            <i class="far fa-calendar-check text-emerald-600 text-[11px] w-4"></i> Keluar: <b>${tglMulaiFmt}</b> ${item.jamMulai ? `(${item.jamMulai})` : ''}
                        </div>
                        <div class="flex items-center gap-1 text-gray-700 font-medium">
                            <i class="far fa-calendar-times text-rose-600 text-[11px] w-4"></i> Batas: <b>${tglKembaliFmt}</b>
                        </div>
                        ${item.tglKembaliRealisasi ? `
                            <div class="flex items-center gap-1 text-blue-700 text-[11px] font-bold">
                                <i class="fas fa-door-open text-[10px] w-4"></i> Tiba: ${tglRealisasiFmt}
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="py-3 px-3">
                    <div class="font-bold text-gray-800">${item.namaPenjemput || '-'} <span class="text-gray-400 font-normal">(${item.hubunganPenjemput || 'Wali'})</span></div>
                    <div class="mt-0.5">
                        ${cleanPhone ? `
                            <a href="https://wa.me/${cleanPhone}" target="_blank" class="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-mono text-[11px] font-bold">
                                <i class="fab fa-whatsapp"></i> ${item.noHpPenjemput}
                            </a>
                        ` : `<span class="text-gray-400 text-[11px] font-mono">-</span>`}
                    </div>
                </td>
                <td class="py-3 px-3 text-center">
                    ${statusBadge}
                </td>
                <td class="py-3 px-3 text-center">
                    <div class="flex items-center justify-center gap-1">
                        ${!item.tglKembaliRealisasi ? `
                            <button type="button" onclick="bukaModalKonfirmasiKembali('pulang', '${item.id}')" title="Konfirmasi Santri Tiba Kembali di Pondok" class="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button type="button" onclick="cetakSuratIzinPulang('${item.id}')" title="Cetak Surat Izin Pulang Santri" class="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs">
                            <i class="fas fa-print"></i>
                        </button>
                        <button type="button" onclick="bukaModalPulangSantri('${item.id}')" title="Edit Data Izin Pulang" class="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-all shadow-2xs">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" onclick="hapusIzinPulang('${item.id}')" title="Hapus Data Izin" class="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-all shadow-2xs">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
    renderPulangPaginationControls(pData);
}

// Render Kontrol Pagination Pulang
function renderPulangPaginationControls(pData) {
    const container = document.getElementById('pulang-pagination-container');
    if (!container) return;

    if (pData.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let buttonsHtml = '';
    const cur = pData.currentPage;
    const tot = pData.totalPages;

    buttonsHtml += `
        <button onclick="pindahHalamanPulang(${cur - 1})" ${cur === 1 ? 'disabled class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-300 cursor-not-allowed"' : 'class="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"'}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    for (let i = 1; i <= tot; i++) {
        if (i === 1 || i === tot || (i >= cur - 1 && i <= cur + 1)) {
            const isAct = i === cur;
            buttonsHtml += `
                <button onclick="pindahHalamanPulang(${i})" class="px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${isAct ? 'bg-emerald-600 text-white shadow-xs' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'}">
                    ${i}
                </button>
            `;
        } else if (i === cur - 2 || i === cur + 2) {
            buttonsHtml += `<span class="text-gray-400 text-xs px-1">...</span>`;
        }
    }

    buttonsHtml += `
        <button onclick="pindahHalamanPulang(${cur + 1})" ${cur === tot ? 'disabled class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-300 cursor-not-allowed"' : 'class="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"'}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    container.innerHTML = `
        <div class="flex items-center gap-1.5">
            ${buttonsHtml}
        </div>
    `;
}

function pindahHalamanPulang(target) {
    if (typeof paginationState !== 'undefined') {
        paginationState.pulangSantri.page = target;
        renderPulangSantriPage(false);
    }
}

// Buka Modal Tambah/Edit Izin Pulang
function bukaModalPulangSantri(idToEdit = null) {
    updatePulangFiltersAndDropdowns();
    const modal = document.getElementById('modal-pulang-santri');
    const modalTitle = document.getElementById('modal-pulang-title');
    const inputId = document.getElementById('pulang-edit-id');
    const selSantri = document.getElementById('pulang-santri-id');
    const selJenis = document.getElementById('pulang-jenis');
    const inputMulai = document.getElementById('pulang-tgl-mulai');
    const inputJamMulai = document.getElementById('pulang-jam-mulai');
    const inputKembaliTarget = document.getElementById('pulang-tgl-kembali');
    const inputPenjemput = document.getElementById('pulang-nama-penjemput');
    const selHubungan = document.getElementById('pulang-hubungan-penjemput');
    const inputHp = document.getElementById('pulang-hp-penjemput');
    const inputTujuan = document.getElementById('pulang-tujuan');
    const inputKeterangan = document.getElementById('pulang-keterangan');

    if (idToEdit) {
        // Edit Mode
        const item = (window.pulangSantriList || []).find(x => x.id === idToEdit);
        if (!item) return showToast("Data izin pulang tidak ditemukan!", "error");

        if (modalTitle) modalTitle.innerText = "Edit Perizinan Pulang Santri";
        if (inputId) inputId.value = item.id;
        if (selSantri) {
            selSantri.value = item.santriId;
            selSantri.disabled = true;
        }
        if (selJenis) selJenis.value = item.jenisIzin;
        if (inputMulai) inputMulai.value = item.tglMulai;
        if (inputJamMulai) inputJamMulai.value = item.jamMulai || '08:00';
        if (inputKembaliTarget) inputKembaliTarget.value = item.tglKembaliTarget;
        if (inputPenjemput) inputPenjemput.value = item.namaPenjemput || '';
        if (selHubungan) selHubungan.value = item.hubunganPenjemput || 'Orang Tua / Wali';
        if (inputHp) inputHp.value = item.noHpPenjemput || '';
        if (inputTujuan) inputTujuan.value = item.tujuan || '';
        if (inputKeterangan) inputKeterangan.value = item.keterangan || '';
        onPulangSantriChanged();
    } else {
        // Tambah Baru
        if (modalTitle) modalTitle.innerText = "Buat Izin Pulang Santri";
        if (inputId) inputId.value = '';
        if (selSantri) {
            selSantri.value = '';
            selSantri.disabled = false;
        }
        if (selJenis) selJenis.value = 'Sakit / Rawat Jalan / Periksa Dokter';
        const today = new Date().toLocaleDateString('en-CA');
        if (inputMulai) inputMulai.value = today;
        if (inputJamMulai) {
            const now = new Date();
            inputJamMulai.value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        }
        // Target kembali default 3 hari ke depan
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 3);
        if (inputKembaliTarget) inputKembaliTarget.value = targetDate.toLocaleDateString('en-CA');
        if (inputPenjemput) inputPenjemput.value = '';
        if (selHubungan) selHubungan.value = 'Orang Tua / Wali';
        if (inputHp) inputHp.value = '';
        if (inputTujuan) inputTujuan.value = '';
        if (inputKeterangan) inputKeterangan.value = '';
    }

    bukaModal('modal-pulang-santri');
}

// Handler Saat Santri Terpilih di Modal Pulang (Tidak ada cek/notifikasi tanggungan)
function onPulangSantriChanged() {
    const sId = document.getElementById('pulang-santri-id')?.value;
    const inputTujuan = document.getElementById('pulang-tujuan');
    const inputPenjemput = document.getElementById('pulang-nama-penjemput');
    const inputHp = document.getElementById('pulang-hp-penjemput');

    if (!sId) return;

    const s = (window.santriData || []).find(x => x.id === sId);
    if (!s) return;

    if (inputTujuan && !inputTujuan.value) {
        inputTujuan.value = s.desa ? `${s.desa}, ${s.kecamatan || ''}, ${s.asalKota || 'Sumenep'}` : (s.asalKota || '');
    }
    if (inputPenjemput && !inputPenjemput.value) {
        inputPenjemput.value = s.namaWali || s.ayah || '';
    }
    if (inputHp && !inputHp.value) {
        inputHp.value = s.noHpWali || s.hp || '';
    }
}

// Simpan Data Izin Pulang
function simpanIzinPulang() {
    const editId = document.getElementById('pulang-edit-id')?.value;
    const sId = document.getElementById('pulang-santri-id')?.value;
    const jenisIzin = document.getElementById('pulang-jenis')?.value;
    const tglMulai = document.getElementById('pulang-tgl-mulai')?.value;
    const jamMulai = document.getElementById('pulang-jam-mulai')?.value || '08:00';
    const tglKembaliTarget = document.getElementById('pulang-tgl-kembali')?.value;
    const namaPenjemput = document.getElementById('pulang-nama-penjemput')?.value.trim();
    const hubunganPenjemput = document.getElementById('pulang-hubungan-penjemput')?.value;
    const noHpPenjemput = document.getElementById('pulang-hp-penjemput')?.value.trim();
    const tujuan = document.getElementById('pulang-tujuan')?.value.trim();
    const keterangan = document.getElementById('pulang-keterangan')?.value.trim();

    if (!editId && !sId) return showToast("Pilih santri terlebih dahulu!", "error");
    if (!tglMulai) return showToast("Tanggal mulai izin pulang wajib diisi!", "error");
    if (!tglKembaliTarget) return showToast("Batas tanggal kembali wajib diisi!", "error");
    if (!namaPenjemput) return showToast("Nama penjemput / wali penjemput wajib diisi!", "error");
    if (!keterangan) return showToast("Keterangan atau alasan izin pulang wajib diisi!", "error");

    if (tglKembaliTarget < tglMulai) {
        return showToast("Batas tanggal kembali tidak boleh mendahului tanggal mulai pulang!", "error");
    }

    const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    const petugas = currentUser ? (currentUser.nama || currentUser.username) : 'Bagian Ketertiban / Pengurus';

    if (editId) {
        // Mode Edit
        const item = (window.pulangSantriList || []).find(x => x.id === editId);
        if (!item) return showToast("Data tidak ditemukan!", "error");

        item.jenisIzin = jenisIzin;
        item.tglMulai = tglMulai;
        item.jamMulai = jamMulai;
        item.tglKembaliTarget = tglKembaliTarget;
        item.namaPenjemput = namaPenjemput;
        item.hubunganPenjemput = hubunganPenjemput;
        item.noHpPenjemput = noHpPenjemput;
        item.tujuan = tujuan;
        item.keterangan = keterangan;

        saveDataToStorage();
        renderPulangSantriPage();
        tutupModal('modal-pulang-santri');
        showToast("Data perizinan pulang berhasil diperbarui!");
    } else {
        // Mode Tambah Baru
        const newId = 'PLG-' + Date.now().toString().slice(-6);
        const taAktif = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448';
        window.pulangSantriList.push({
            id: newId,
            santriId: sId,
            tahunAjaran: taAktif,
            jenisIzin,
            tglMulai,
            jamMulai,
            tglKembaliTarget,
            tglKembaliRealisasi: null,
            status: 'Sedang Pulang',
            namaPenjemput,
            hubunganPenjemput,
            noHpPenjemput,
            tujuan,
            keterangan,
            statusTanggungan: 'Lunas',
            catatanKembali: '',
            petugasIzin: petugas,
            waktuInput: new Date().toISOString()
        });

        saveDataToStorage();
        updatePulangFiltersAndDropdowns();
        renderPulangSantriPage(true);
        tutupModal('modal-pulang-santri');
        showToast("Izin pulang santri berhasil dibuat!");
    }
}

// Hapus Izin Pulang
function hapusIzinPulang(id) {
    const item = (window.pulangSantriList || []).find(x => x.id === id);
    if (!item) return;

    const s = (window.santriData || []).find(x => x.id === item.santriId);
    const namaSantri = s ? s.nama : 'Santri';

    showConfirm(
        "Hapus Izin Pulang?",
        `Yakin ingin menghapus data izin pulang ananda ${namaSantri}?`,
        () => {
            window.pulangSantriList = (window.pulangSantriList || []).filter(x => x.id !== id);
            saveDataToStorage();
            renderPulangSantriPage();
            showToast("Data izin pulang berhasil dihapus!");
        }
    );
}

// ==========================================================================
// 3. MODAL KONFIRMASI KEMBALI DI PONDOK (Shared Liburan & Pulang)
// ==========================================================================

function bukaModalKonfirmasiKembali(type, id) {
    activeKonfirmasiKembali = { type, id };
    const modal = document.getElementById('modal-konfirmasi-kembali');
    const headerTitle = document.getElementById('konfirmasi-kembali-title');
    const santriInfo = document.getElementById('konfirmasi-kembali-santri-info');
    const inputTgl = document.getElementById('konfirmasi-kembali-tgl');
    const inputCatatan = document.getElementById('konfirmasi-kembali-catatan');

    let item = null;
    let targetKembali = '';

    if (type === 'liburan') {
        item = (window.liburanSantriList || []).find(x => x.id === id);
        targetKembali = item ? item.tglKembali : '';
        if (headerTitle) headerTitle.innerText = "Konfirmasi Santri Kembali dari Liburan";
    } else {
        item = (window.pulangSantriList || []).find(x => x.id === id);
        targetKembali = item ? item.tglKembaliTarget : '';
        if (headerTitle) headerTitle.innerText = "Konfirmasi Santri Kembali dari Izin Pulang";
    }

    if (!item) return showToast("Data perizinan tidak ditemukan!", "error");

    const s = (window.santriData || []).find(x => x.id === item.santriId) || { nama: 'Santri', kamar: '-' };
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (inputTgl) inputTgl.value = todayStr;
    if (inputCatatan) inputCatatan.value = '';

    if (santriInfo) {
        const isLate = todayStr > targetKembali;
        santriInfo.innerHTML = `
            <div class="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 text-xs">
                <div class="flex items-center justify-between">
                    <span class="font-extrabold text-gray-800 text-sm">${s.nama}</span>
                    <span class="px-2 py-0.5 rounded font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">Kamar ${s.kamar || s.kamarTerakhir || '-'}</span>
                </div>
                <div class="text-gray-500">
                    Batas Wajib Kembali: <b class="text-gray-800 font-mono">${formatTanggalIndo(targetKembali)}</b>
                </div>
                ${isLate ? `
                    <div class="text-rose-600 font-bold text-[11px] pt-1 border-t border-rose-100 flex items-center gap-1">
                        <i class="fas fa-triangle-exclamation"></i> Melewati batas waktu target (Terlambat). Masukkan catatan pembinaan/takzir jika ada.
                    </div>
                ` : `
                    <div class="text-emerald-700 font-bold text-[11px] pt-1 border-t border-emerald-100 flex items-center gap-1">
                        <i class="fas fa-check-circle"></i> Tiba kembali tepat waktu (Sesuai jadwal).
                    </div>
                `}
            </div>
        `;
    }

    bukaModal('modal-konfirmasi-kembali');
}

function simpanKonfirmasiKembali() {
    const { type, id } = activeKonfirmasiKembali;
    const tglRealisasi = document.getElementById('konfirmasi-kembali-tgl')?.value;
    const catatan = document.getElementById('konfirmasi-kembali-catatan')?.value.trim();

    if (!tglRealisasi) return showToast("Tanggal kembali wajib diisi!", "error");

    if (type === 'liburan') {
        const item = (window.liburanSantriList || []).find(x => x.id === id);
        if (!item) return;

        item.tglKembaliRealisasi = tglRealisasi;
        if (catatan) item.catatan = (item.catatan ? item.catatan + ' | ' : '') + 'Catatan Kedatangan: ' + catatan;

        if (tglRealisasi > item.tglKembali) {
            item.status = 'Terlambat Kembali';
        } else {
            item.status = 'Kembali Tepat Waktu';
        }

        saveDataToStorage();
        renderLiburanSantriPage();
        tutupModal('modal-konfirmasi-kembali');
        showToast("Kedatangan santri dari liburan berhasil dicatat!");
    } else {
        const item = (window.pulangSantriList || []).find(x => x.id === id);
        if (!item) return;

        item.tglKembaliRealisasi = tglRealisasi;
        if (catatan) item.catatanKembali = catatan;

        if (tglRealisasi > item.tglKembaliTarget) {
            item.status = 'Terlambat Kembali';
        } else {
            item.status = 'Kembali Tepat Waktu';
        }

        saveDataToStorage();
        renderPulangSantriPage();
        tutupModal('modal-konfirmasi-kembali');
        showToast("Kedatangan santri dari izin pulang berhasil dicatat!");
    }
}

// ==========================================================================
// 4. CETAK SURAT IZIN RESMI PP. AL-USYMUNI (Print & PDF)
// ==========================================================================

// Peringatan Santri Masih Memiliki Tanggungan (Cetak Diblokir)
function peringatanTunggakanLiburan(santriId) {
    const s = (window.santriData || []).find(x => x.id === santriId);
    if (!s) return;
    const info = (typeof hitungRincianTunggakanSantri === 'function') 
        ? hitungRincianTunggakanSantri(santriId) 
        : { totalTunggakan: 0, items: [] };

    let itemsHtml = '';
    (info.items || []).forEach(it => {
        itemsHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px dashed #fecaca; font-size:12px; text-align:left;">
                <div>
                    <div style="font-weight:bold; color:#1f2937;">${it.nama || it.kategori}</div>
                    <div style="color:#6b7280; font-size:11px;">${it.keterangan || ''}</div>
                </div>
                <div style="color:#b91c1c; font-weight:bold; font-family:monospace; margin-left:12px;">
                    ${formatRupiah(it.tunggakan)}
                </div>
            </div>
        `;
    });

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: 'Cetak Surat Liburan Diblokir!',
            html: `
                <div style="text-align: left; font-size: 13px; color: #374151;">
                    <div style="background: #fef2f2; border: 1.5px solid #f87171; border-radius: 12px; padding: 12px 14px; margin-bottom: 12px;">
                        <p style="margin: 0; font-weight: bold; color: #991b1b; font-size: 13px;">
                            Santri <span style="text-decoration: underline;">${s.nama}</span> (NIS: ${s.nis || '-'}, Kamar ${s.kamar || s.kamarTerakhir || '-'}) masih memiliki tanggungan tagihan sebesar:
                        </p>
                        <h3 style="margin: 6px 0 0; font-size: 22px; font-weight: 800; color: #dc2626; font-family: monospace;">
                            ${formatRupiah(info.totalTunggakan)}
                        </h3>
                    </div>
                    <div style="margin-bottom: 6px; font-weight: bold; font-size: 11px; text-transform: uppercase; color: #6b7280;">
                        Rincian Tanggungan yang Belum Dilunasi:
                    </div>
                    <div style="max-height: 180px; overflow-y: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 12px; margin-bottom: 12px;">
                        ${itemsHtml || '<p style="color:#6b7280; margin:4px 0;">Tidak ada rincian tercatat.</p>'}
                    </div>
                    <p style="margin: 0; font-size: 11.5px; color: #4b5563; line-height: 1.5;">
                        <i class="fas fa-shield-alt text-rose-500"></i> Sesuai ketertiban & administrasi pesantren, <b>Surat Jalan Liburan TIDAK DAPAT DICETAK</b> sebelum seluruh kewajiban administrasi dilunasi di bagian keuangan.
                    </p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-wallet mr-1"></i> Buka Menu Pembayaran',
            confirmButtonColor: '#059669',
            cancelButtonText: 'Tutup',
            cancelButtonColor: '#6b7280'
        }).then((result) => {
            if (result.isConfirmed) {
                if (typeof navigate === 'function') {
                    navigate('syahriah');
                }
            }
        });
    } else {
        alert(`CETAK DIBLOKIR: Santri ${s.nama} masih memiliki tunggakan sebesar ${formatRupiah(info.totalTunggakan)}. Surat jalan liburan tidak dapat dicetak!`);
    }
}

// Helper format tanggal lengkap Masehi & Hijriah
function formatTglHijriMasehi(dateInput) {
    let d;
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
        const parts = dateInput.split('T')[0].split('-');
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
        d = new Date(dateInput);
    }
    if (isNaN(d.getTime())) return { hari: '-', hijriStr: '-', masehiStr: '-', fullCombined: '-' };

    const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jum\'at', 'Sabtu'];
    const monthsMasehi = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const hari = days[d.getDay()];
    const masehiStr = `${String(d.getDate()).padStart(2, '0')} ${monthsMasehi[d.getMonth()]} ${d.getFullYear()} M.`;

    let hijriStr = '';
    try {
        const hijriParts = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).formatToParts(d);

        let hDay = '', hMonth = '', hYear = '';
        for (const p of hijriParts) {
            if (p.type === 'day') hDay = p.value;
            if (p.type === 'month') hMonth = p.value;
            if (p.type === 'year') hYear = p.value;
        }

        const hijriMonthMap = {
            'Muharam': 'Muharram',
            'Safar': 'Safar',
            'Rabiulawal': 'Rabi\'ul Awwal',
            'Rabiulakhir': 'Rabi\'ul Akhir',
            'Jumadilawal': 'Jumadil Ula',
            'Jumadilakhir': 'Jumadil Akhir',
            'Rajab': 'Rajab',
            'Syakban': 'Sya\'ban',
            'Ramadan': 'Ramadhan',
            'Syawal': 'Syawal',
            'Zulkaidah': 'Dzulqa\'dah',
            'Zulhijah': 'Dzulhijjah'
        };
        const hMonthNorm = hijriMonthMap[hMonth] || hMonth;
        hijriStr = `${hDay} ${hMonthNorm} ${hYear} H.`;
    } catch (e) {
        hijriStr = '- H.';
    }

    return {
        hari,
        hijriStr,
        masehiStr,
        fullCombined: `${hari}, ${hijriStr} / ${masehiStr}`
    };
}

// Hitung Lama Hari Libur
function hitungLamaHariLibur(tglMulai, tglKembali) {
    if (!tglMulai || !tglKembali) return 0;
    const d1 = new Date(tglMulai.includes('T') ? tglMulai : tglMulai + 'T00:00:00');
    const d2 = new Date(tglKembali.includes('T') ? tglKembali : tglKembali + 'T00:00:00');
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
}

// CSS Style Standar Resmi A4 Landscape (2 Surat Berdampingan)
function getSuratLiburPrintStyles() {
    return `
        @page {
            size: A4 landscape;
            margin: 5mm 6mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            margin: 0;
            padding: 8px;
            font-family: Arial, 'Segoe UI', Helvetica, sans-serif;
            color: #15803d;
            background: #f8fafc;
        }
        .page-sheet {
            width: 283mm;
            height: 194mm;
            margin: 0 auto 16px auto;
            background: #fff;
            padding: 4mm 7mm;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12mm;
            position: relative;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            page-break-after: always;
            break-after: page;
            overflow: hidden;
        }
        .page-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
        }
        .cut-line {
            position: absolute;
            left: 50%;
            top: 4mm;
            bottom: 4mm;
            border-left: 1px dashed #cbd5e1;
            transform: translateX(-50%);
            pointer-events: none;
        }
        .cut-marker {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            padding: 2px 4px;
            color: #94a3b8;
            font-size: 13px;
        }
        .surat-card {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 0 2px;
            position: relative;
            overflow: hidden;
        }
        /* WATERMARK BACKGROUND (LAMBANG AL-USYMUNI) */
        .surat-card::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 195px;
            height: 195px;
            background-image: url('assets/surat_libur_watermark_clean.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: 0.16;
            pointer-events: none;
            z-index: 0;
        }
        .surat-card > * {
            position: relative;
            z-index: 1;
        }
        /* KOP */
        .kop-wrapper {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 2px;
        }
        .kop-brand {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .kop-logo {
            width: 52px;
            height: 52px;
            object-fit: contain;
            flex-shrink: 0;
        }
        .kop-text {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
        }
        .kop-arabic {
            height: 28px;
            object-fit: contain;
            margin-bottom: 1px;
        }
        .kop-latin {
            color: #15803d;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin: 0;
            font-family: Arial, sans-serif;
            line-height: 1.15;
        }
        /* BARCODE KOP KEDATANGAN */
        .kop-barcode {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid #15803d;
            background: #f0fdf4;
            border-radius: 4px;
            padding: 2px 6px;
            width: 130px;
            flex-shrink: 0;
            box-sizing: border-box;
        }
        .bc-title {
            font-size: 7px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #15803d;
            margin-bottom: 1px;
            line-height: 1;
        }
        .bc-svg {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 20px;
            width: 100%;
        }
        .bc-nis {
            font-family: Arial, monospace, sans-serif;
            font-size: 7.5px;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #15803d;
            margin-top: 1px;
            line-height: 1;
        }
        /* TITLE */
        .surat-title {
            text-align: center;
            margin: 2px 0 4px 0;
        }
        .surat-title h3 {
            margin: 0;
            font-size: 13.5px;
            font-weight: 800;
            color: #15803d;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            line-height: 1.25;
        }
        /* DATA TABLE */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
            line-height: 1.34;
            color: #15803d;
            margin-bottom: 2px;
        }
        .data-table td {
            vertical-align: top;
            padding: 1.5px 0;
        }
        .data-table td.col-label {
            width: 105px;
            font-weight: 700;
            color: #15803d;
        }
        .data-table td.col-colon {
            width: 12px;
            text-align: left;
            font-weight: 700;
            color: #15803d;
        }
        .data-table td.col-val {
            color: #15803d;
            font-weight: 600;
        }
        .data-table td.col-val b {
            font-weight: 800;
        }
        /* TITIMANGSA */
        .titimangsa-box {
            color: #15803d;
            font-weight: 800;
            font-size: 10.5px;
            margin: 2px 0 1px 0;
            text-align: left;
        }
        /* TTD */
        .ttd-section {
            width: 100%;
            text-align: center;
            margin-top: 1px;
        }
        .ttd-header {
            font-size: 10.5px;
            font-weight: 700;
            line-height: 1.25;
            color: #15803d;
            margin-bottom: 1px;
        }
        .ttd-grid {
            width: 100%;
            border-collapse: collapse;
        }
        .ttd-grid td {
            width: 50%;
            vertical-align: top;
            text-align: center;
            padding: 0 4px;
            position: relative;
        }
        .ttd-jabatan {
            font-size: 10.5px;
            font-weight: 700;
            color: #15803d;
            margin-bottom: 1px;
            position: relative;
            z-index: 1;
        }
        .ttd-sign-box {
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .ttd-img-ketua {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-40%, -35%);
            height: 84px;
            max-height: none;
            max-width: none;
            object-fit: contain;
            z-index: 10;
            pointer-events: none;
        }
        .ttd-img-sekre {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-45%, -38%);
            height: 92px;
            max-height: none;
            max-width: none;
            object-fit: contain;
            z-index: 10;
            pointer-events: none;
        }
        .ttd-nama {
            color: #15803d;
            font-weight: 800;
            font-size: 10px;
            text-decoration: underline;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-top: 1px;
            position: relative;
            z-index: 1;
        }
        /* GARIS PEMISAH & PERHATIAN */
        .perhatian-divider {
            border-top: 1.5px solid #15803d;
            margin: 4px 0 3px 0;
        }
        .perhatian-box {
            padding: 0;
            margin: 0 0 3px 0;
            font-size: 8px;
            line-height: 1.34;
            color: #15803d;
        }
        .perhatian-row {
            display: flex;
            align-items: flex-start;
        }
        .perhatian-title {
            font-weight: 800;
            white-space: nowrap;
            margin-right: 4px;
            color: #15803d;
        }
        .perhatian-items {
            flex: 1;
            font-weight: 600;
            color: #15803d;
        }
        .perhatian-items div {
            margin-bottom: 0.5px;
        }
        /* FOOTER */
        .footer-info {
            font-size: 7.2px;
            line-height: 1.32;
            color: #15803d;
            padding-top: 2px;
            margin-top: 1px;
        }
        .footer-info p {
            margin: 0;
        }
        .footer-info b {
            font-weight: 800;
        }
        .footer-info a {
            color: #0284c7;
            text-decoration: underline;
        }
        /* PRINT BUTTON */
        .no-print-bar {
            position: sticky;
            top: 0;
            background: #1e293b;
            color: #fff;
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            margin-bottom: 12px;
            border-radius: 8px;
        }
        .btn-print-action {
            background: #16a34a;
            color: white;
            padding: 8px 18px;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .btn-print-action:hover {
            background: #15803d;
        }
        @media print {
            body {
                background: #fff;
                padding: 0;
            }
            .no-print-bar {
                display: none !important;
            }
            .page-sheet {
                box-shadow: none;
                margin: 0;
                padding: 4mm 7mm;
                width: 100%;
                height: 100vh;
            }
        }
    `;
}

// Generate 1 Surat Card HTML sesuai template resmi PP. Al-Usymuni
function buildSuratLiburCardHtml(s, item, copyType, tglCetakFmt) {
    const tglMulaiFmt = formatTglHijriMasehi(item.tglMulai);
    const tglKembaliFmt = formatTglHijriMasehi(item.tglKembali);
    const lamaHari = hitungLamaHariLibur(item.tglMulai, item.tglKembali);
    const cetakFmt = tglCetakFmt || formatTglHijriMasehi(new Date());

    let rawLiburan = (item.namaLiburan || '').trim();
    let cleanLiburan = rawLiburan.replace(/^(liburan|libur)\s+/i, '').trim();
    let namaLiburanTitle = cleanLiburan ? `LIBURAN ${cleanLiburan.toUpperCase()}` : 'LIBUR ........';

    const kamarDaerahStr = (s.kamar || s.kamarTerakhir || '-') + ' / ' + (s.asalKota || s.alamat || item.tujuan || '-');

    return `
    <div class="surat-card">
        <!-- Kop Surat -->
        <div class="kop-wrapper">
            <div class="kop-brand">
                <img src="assets/surat_libur_logo_clean.png" alt="Logo" class="kop-logo">
                <div class="kop-text">
                    <img src="assets/surat_libur_kaligrafi_clean.png" alt="Kaligrafi" class="kop-arabic">
                    <div class="kop-latin">Pondok Pesantren Al-Usymuni</div>
                </div>
            </div>
            <div class="kop-barcode">
                <div class="bc-title">SCAN KEDATANGAN</div>
                <div class="bc-svg">${generateCode128SVG(s.nis || '1441-00-000', 20, 0.85)}</div>
                <div class="bc-nis">NIS: ${s.nis || '-'}</div>
            </div>
        </div>

        <!-- Judul Surat -->
        <div class="surat-title">
            <h3>SURAT IZIN ${namaLiburanTitle}</h3>
        </div>

        <!-- Data Santri -->
        <table class="data-table">
            <tr>
                <td class="col-label">Nama</td>
                <td class="col-colon">:</td>
                <td class="col-val"><b>${s.nama || '..................................................................................'}</b></td>
            </tr>
            <tr>
                <td class="col-label">Kamar/Daerah</td>
                <td class="col-colon">:</td>
                <td class="col-val">${kamarDaerahStr}</td>
            </tr>
            <tr>
                <td class="col-label">Keperluan</td>
                <td class="col-colon">:</td>
                <td class="col-val">${item.namaLiburan || 'Libur Ramadhan'}</td>
            </tr>
            <tr>
                <td class="col-label">Lama Izin</td>
                <td class="col-colon">:</td>
                <td class="col-val">${lamaHari ? lamaHari + ' Hari' : '- Hari'}</td>
            </tr>
            <tr>
                <td class="col-label">Surat ini berlaku</td>
                <td class="col-colon">:</td>
                <td class="col-val">
                    ${tglMulaiFmt.fullCombined} s/d<br>
                    ${tglKembaliFmt.fullCombined}
                </td>
            </tr>
        </table>

        <!-- Titimangsa & Tanda Tangan -->
        <div>
            <div class="titimangsa-box">
                Tarate, ${cetakFmt.hijriStr} | ${cetakFmt.masehiStr}
            </div>
            <div class="ttd-section">
                <div class="ttd-header">
                    Pengurus,<br>
                    Pondok Pesantren Al-Usymuni
                </div>
                <table class="ttd-grid">
                    <tr>
                        <td>
                            <div class="ttd-jabatan">Ketua Umum</div>
                            <div class="ttd-sign-box">
                                <img src="assets/surat_libur_ttd_ketua_clean.png" alt="TTD Ketua" class="ttd-img-ketua">
                            </div>
                            <div class="ttd-nama">K. AHMAD ROBEITH AL FAROH, M.H.</div>
                        </td>
                        <td>
                            <div class="ttd-jabatan">Sekretaris Umum</div>
                            <div class="ttd-sign-box">
                                <img src="assets/surat_libur_ttd_sekretaris_clean.png" alt="TTD Sekretaris + Stempel" class="ttd-img-sekre">
                            </div>
                            <div class="ttd-nama">LUTFI NURULLAH, M.H.</div>
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Garis Pemisah & Perhatian -->
        <div>
            <div class="perhatian-divider"></div>
            <div class="perhatian-box">
                <div class="perhatian-row">
                    <span class="perhatian-title">Perhatian :</span>
                    <div class="perhatian-items">
                        <div>* Jaga Nama Baik Pondok Pesantren Al-Usymuni.</div>
                        <div>* Memakai seragam Santri (Kopyah Putih, Baju Putih & Sarung Hijau)</div>
                        <div>* Kembali ke Pesantren Sesuai dengan waktu yang sudah ditentukan</div>
                        <div>* Surat Izin dikembalikan setelah kembali Ke Pondok Pesantren.</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer Alamat -->
        <div class="footer-info">
            <p><b>Alamat :</b> Jl. Pesantren No. 11 Tarate Pandian Sumenep Jatim, <b>Kode Pos :</b> 69414</p>
            <p><b>Telp.</b> (0328) 662261- 662326 &nbsp;&bull;&nbsp; <b>Email :</b> <a href="mailto:sekretariat.ppu@gmail.com">sekretariat.ppu@gmail.com</a> &nbsp;&bull;&nbsp; <b>Hp :</b> 087850119090</p>
        </div>
    </div>
    `;
}

// Cetak Surat Izin Liburan Santri (Perorangan: Langsung 2 Surat dalam 1 Lembar A4 Landscape)
function cetakSuratIzinLiburan(id) {
    const item = (window.liburanSantriList || []).find(x => x.id === id);
    if (!item) return showToast("Data izin liburan tidak ditemukan!", "error");

    // VALIDASI KETAT KEUANGAN: Jika ada tanggungan, surat jalan TIDAK BISA dicetak!
    const financialInfo = (typeof hitungRincianTunggakanSantri === 'function') 
        ? hitungRincianTunggakanSantri(item.santriId) 
        : { totalTunggakan: 0 };
    if (financialInfo.totalTunggakan > 0) {
        peringatanTunggakanLiburan(item.santriId);
        return;
    }

    const s = (window.santriData || []).find(x => x.id === item.santriId) || { nama: '-', nis: '-', kamar: '-' };
    const tglCetakFmt = formatTglHijriMasehi(new Date());
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);

    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) return showToast("Popup diblokir browser! Izinkan popup untuk mencetak surat.", "error");

    const leftCardHtml = buildSuratLiburCardHtml(s, item, 'Lembar Santri / Wali', tglCetakFmt);
    const rightCardHtml = buildSuratLiburCardHtml(s, item, 'Lembar Arsip Pesantren', tglCetakFmt);

    w.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <base href="${baseUrl}">
        <title>Surat Izin Libur - ${s.nama}</title>
        <style>
            ${getSuratLiburPrintStyles()}
        </style>
    </head>
    <body>
        <div class="no-print-bar">
            <div>
                <b>🖨️ Surat Izin Libur - ${s.nama}</b>
                <span style="font-size: 12px; color: #94a3b8; margin-left: 10px;">(1 Lembar A4 Landscape = 2 Surat: Lembar Santri & Lembar Arsip)</span>
            </div>
            <button class="btn-print-action" onclick="window.print()">
                <span>🖨️</span> Cetak Sekarang (PDF)
            </button>
        </div>

        <div class="page-sheet">
            <div class="cut-line"></div>
            <div class="cut-marker">✂</div>
            ${leftCardHtml}
            ${rightCardHtml}
        </div>
    </body>
    </html>
    `);
    w.document.close();
}

// Buka Modal Cetak Massal Per-Kamar
function bukaModalCetakMassalLiburan() {
    const selKamar = document.getElementById('cetak-massal-kamar');
    const selPeriode = document.getElementById('cetak-massal-periode');

    if (selKamar) {
        const kamars = (typeof getAllNamaKamar === 'function') 
            ? getAllNamaKamar() 
            : [...new Set((window.santriData || []).map(s => s.kamar || s.kamarTerakhir).filter(Boolean))].sort();
        
        let html = '<option value="">-- Pilih Kamar Asrama --</option>';
        kamars.forEach(k => {
            const count = (window.santriData || []).filter(s => (s.kamar === k || s.kamarTerakhir === k) && s.status === 'Aktif').length;
            html += `<option value="${k}">Kamar ${k} (${count} Santri Aktif)</option>`;
        });
        selKamar.innerHTML = html;
    }

    if (selPeriode) {
        const periodes = [...new Set((window.liburanSantriList || []).map(x => x.namaLiburan).filter(Boolean))];
        if (periodes.length === 0) periodes.push('Liburan Akhir Sanah & Idul Fitri 1447 H');
        let html = '<option value="all">Semua / Periode Aktif</option>';
        periodes.forEach(p => {
            html += `<option value="${p}">${p}</option>`;
        });
        selPeriode.innerHTML = html;
    }

    onKamarMassalChanged();
    bukaModal('modal-cetak-massal-liburan');
}

// Handler Saat Pilihan Kamar / Periode Massal Berubah
function onKamarMassalChanged() {
    const kamar = document.getElementById('cetak-massal-kamar')?.value;
    const periode = document.getElementById('cetak-massal-periode')?.value;
    const tbody = document.getElementById('cetak-massal-preview-tbody');
    const elSiap = document.getElementById('cetak-massal-count-siap');
    const elTahan = document.getElementById('cetak-massal-count-tahan');
    const elInfo = document.getElementById('cetak-massal-footer-info');
    const btnPrint = document.getElementById('btn-eksekusi-cetak-massal');

    if (!kamar) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-gray-400">Silakan pilih kamar asrama di atas untuk melihat santri.</td></tr>`;
        if (elSiap) elSiap.innerText = '0 Santri';
        if (elTahan) elTahan.innerText = '0 Santri';
        if (elInfo) elInfo.innerText = 'Pilih kamar untuk memuat daftar santri';
        if (btnPrint) btnPrint.disabled = true;
        return;
    }

    const santriInRoom = (window.santriData || []).filter(s => 
        (s.kamar === kamar || s.kamarTerakhir === kamar) && s.status === 'Aktif'
    );

    if (santriInRoom.length === 0) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-gray-400">Tidak ada santri aktif di Kamar ${kamar}.</td></tr>`;
        if (elSiap) elSiap.innerText = '0 Santri';
        if (elTahan) elTahan.innerText = '0 Santri';
        if (elInfo) elInfo.innerText = `Kamar ${kamar} tidak memiliki santri aktif`;
        if (btnPrint) btnPrint.disabled = true;
        return;
    }

    let siapCount = 0;
    let tahanCount = 0;
    let rowsHtml = '';

    santriInRoom.forEach(s => {
        const info = (typeof hitungRincianTunggakanSantri === 'function')
            ? hitungRincianTunggakanSantri(s.id)
            : { totalTunggakan: 0, items: [] };

        const isLunas = info.totalTunggakan === 0;
        if (isLunas) siapCount++;
        else tahanCount++;

        let tanggunganHtml = '';
        if (isLunas) {
            tanggunganHtml = `<span class="text-emerald-700 font-bold flex items-center justify-center gap-1"><i class="fas fa-check-circle text-emerald-500"></i> Bebas Tanggungan</span>`;
        } else {
            const itemsText = (info.items || []).map(i => i.nama || i.kategori).join(', ');
            tanggunganHtml = `
                <div class="text-rose-700 font-bold font-mono text-[11px]">${formatRupiah(info.totalTunggakan)}</div>
                <div class="text-[10px] text-gray-400 truncate max-w-[180px]" title="${itemsText}">${itemsText}</div>
            `;
        }

        let statusHtml = '';
        if (isLunas) {
            statusHtml = `<span class="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1"><i class="fas fa-print"></i> Siap Dicetak</span>`;
        } else {
            statusHtml = `<button type="button" onclick="peringatanTunggakanLiburan('${s.id}')" title="Lihat Rincian Tanggungan" class="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 transition-colors inline-flex items-center gap-1 cursor-pointer"><i class="fas fa-lock"></i> DITAHAN</button>`;
        }

        rowsHtml += `
            <tr class="hover:bg-gray-50/80 transition-colors">
                <td class="py-2.5 px-3">
                    <div class="font-bold text-gray-800">${s.nama}</div>
                    <div class="text-[10px] text-gray-500 font-mono">NIS: ${s.nis || '-'}</div>
                </td>
                <td class="py-2.5 px-3 text-center">
                    ${tanggunganHtml}
                </td>
                <td class="py-2.5 px-3 text-center">
                    ${statusHtml}
                </td>
            </tr>
        `;
    });

    if (tbody) tbody.innerHTML = rowsHtml;
    if (elSiap) elSiap.innerText = `${siapCount} Santri`;
    if (elTahan) elTahan.innerText = `${tahanCount} Santri`;
    if (elInfo) elInfo.innerText = `${siapCount} dari ${santriInRoom.length} santri siap dicetak. ${tahanCount} ditahan.`;
    if (btnPrint) {
        btnPrint.disabled = (siapCount === 0);
        btnPrint.className = (siapCount === 0) 
            ? "px-5 py-2.5 rounded-lg bg-gray-300 text-gray-500 font-bold text-xs cursor-not-allowed"
            : "px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold shadow-md transition-all text-xs flex items-center gap-2 cursor-pointer";
    }
}

// Eksekusi Cetak Massal Surat Liburan Per-Kamar (Hanya yang Lunas, 2 Surat per Lembar A4 Landscape)
function prosesCetakMassalLiburan() {
    const kamar = document.getElementById('cetak-massal-kamar')?.value;
    const periode = document.getElementById('cetak-massal-periode')?.value;
    const mode = document.getElementById('cetak-massal-mode')?.value || 'pair';

    if (!kamar) return showToast("Pilih kamar terlebih dahulu!", "warning");

    const santriInRoom = (window.santriData || []).filter(s => 
        (s.kamar === kamar || s.kamarTerakhir === kamar) && s.status === 'Aktif'
    );

    if (santriInRoom.length === 0) {
        return showToast(`Tidak ada santri aktif di Kamar ${kamar}!`, "warning");
    }

    // Filter santri yang LUNAS (Bebas Tanggungan)
    const santriSiapCetak = [];
    santriInRoom.forEach(s => {
        const info = (typeof hitungRincianTunggakanSantri === 'function') 
            ? hitungRincianTunggakanSantri(s.id) 
            : { totalTunggakan: 0 };
        if (info.totalTunggakan === 0) {
            let libItem = (window.liburanSantriList || []).find(l => 
                l.santriId === s.id && (!periode || periode === 'all' || l.namaLiburan === periode)
            );
            if (!libItem) {
                const latestLib = (window.liburanSantriList || [])[0] || {};
                libItem = {
                    santriId: s.id,
                    namaLiburan: (periode && periode !== 'all') ? periode : (latestLib.namaLiburan || 'Libur Ramadhan'),
                    tahunAjaran: latestLib.tahunAjaran || '1447/1448',
                    tglMulai: latestLib.tglMulai || new Date().toLocaleDateString('en-CA'),
                    tglKembali: latestLib.tglKembali || new Date(Date.now() + 14*86400000).toLocaleDateString('en-CA'),
                    tujuan: s.asalKota || '-',
                    penjemput: s.namaWali || '-'
                };
            }
            santriSiapCetak.push({ santri: s, liburan: libItem });
        }
    });

    if (santriSiapCetak.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Tidak Ada Surat yang Dapat Dicetak!',
                text: `Seluruh santri di Kamar ${kamar} masih memiliki tanggungan tagihan. Sesuai ketentuan pesantren, santri dengan tanggungan tidak dapat dicetak surat jalan liburannya.`
            });
        } else {
            alert(`Tidak ada santri bebas tanggungan di Kamar ${kamar}!`);
        }
        return;
    }

    const tglCetakFmt = formatTglHijriMasehi(new Date());
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    let sheetsHtml = '';

    if (mode === 'pair') {
        // Mode Hemat Kertas: 2 Santri Berbeda per Lembar A4 Landscape
        for (let i = 0; i < santriSiapCetak.length; i += 2) {
            const itemA = santriSiapCetak[i];
            const itemB = santriSiapCetak[i + 1];

            const leftCard = buildSuratLiburCardHtml(itemA.santri, itemA.liburan, 'Lembar Santri', tglCetakFmt);
            const rightCard = itemB 
                ? buildSuratLiburCardHtml(itemB.santri, itemB.liburan, 'Lembar Santri', tglCetakFmt)
                : buildSuratLiburCardHtml(itemA.santri, itemA.liburan, 'Lembar Arsip Pesantren', tglCetakFmt);

            sheetsHtml += `
            <div class="page-sheet">
                <div class="cut-line"></div>
                <div class="cut-marker">✂</div>
                ${leftCard}
                ${rightCard}
            </div>
            `;
        }
    } else {
        // Mode 2 Salinan per Santri: Kiri Santri, Kanan Arsip per Lembar A4
        santriSiapCetak.forEach(({ santri: s, liburan: item }) => {
            const leftCard = buildSuratLiburCardHtml(s, item, 'Lembar Santri / Wali', tglCetakFmt);
            const rightCard = buildSuratLiburCardHtml(s, item, 'Lembar Arsip Pesantren', tglCetakFmt);

            sheetsHtml += `
            <div class="page-sheet">
                <div class="cut-line"></div>
                <div class="cut-marker">✂</div>
                ${leftCard}
                ${rightCard}
            </div>
            `;
        });
    }

    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) return showToast("Popup diblokir browser! Izinkan popup untuk mencetak.", "error");

    const totalLembar = (mode === 'pair') ? Math.ceil(santriSiapCetak.length / 2) : santriSiapCetak.length;

    w.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <base href="${baseUrl}">
        <title>Surat Izin Libur Massal Kamar ${kamar} (${santriSiapCetak.length} Santri)</title>
        <style>
            ${getSuratLiburPrintStyles()}
        </style>
    </head>
    <body>
        <div class="no-print-bar">
            <div>
                <b>🖨️ Cetak Massal Surat Liburan - Kamar ${kamar}</b>
                <span style="font-size: 12px; color: #94a3b8; margin-left: 10px;">
                    (${santriSiapCetak.length} Santri Bebas Tanggungan • ${totalLembar} Lembar A4 Landscape • Langsung 2 Surat per Lembar)
                </span>
            </div>
            <button class="btn-print-action" onclick="window.print()">
                <span>🖨️</span> Cetak Semua Lembar (${totalLembar} Lembar A4)
            </button>
        </div>
        ${sheetsHtml}
    </body>
    </html>
    `);
    w.document.close();
    showToast(`Membuka cetak massal ${santriSiapCetak.length} santri Kamar ${kamar} (${totalLembar} Lembar A4)...`);
}

// ==========================================================================
// 4B. SISTEM SCAN BARCODE BALEK PONDOK (Pos Keamanan / Kedatangan)
// ==========================================================================

function bukaModalScanBalekPondok() {
    bukaModal('modal-scan-barcode-liburan');
    switchScanTab('gun');
    switchRekapTab('sudah');
    renderScanBalekLists();
    
    // Auto fokus input scanner gun
    setTimeout(() => {
        const input = document.getElementById('scan-barcode-input');
        if (input) {
            input.value = '';
            input.focus();
        }
    }, 150);
}

function tutupModalScanBalekPondok() {
    stopCameraScanner();
    tutupModal('modal-scan-barcode-liburan');
}

function switchScanTab(tab) {
    const tabGun = document.getElementById('tab-scan-gun');
    const tabCam = document.getElementById('tab-scan-cam');
    const paneGun = document.getElementById('scan-pane-gun');
    const paneCam = document.getElementById('scan-pane-cam');

    if (tab === 'gun') {
        stopCameraScanner();
        if (paneGun) paneGun.classList.remove('hidden');
        if (paneCam) paneCam.classList.add('hidden');
        if (tabGun) {
            tabGun.className = "px-3.5 py-1.5 font-bold text-xs rounded-xl bg-emerald-600 text-white shadow-xs transition-all flex items-center gap-1.5";
        }
        if (tabCam) {
            tabCam.className = "px-3.5 py-1.5 font-semibold text-xs rounded-xl text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-1.5";
        }
        const input = document.getElementById('scan-barcode-input');
        if (input) input.focus();
    } else {
        if (paneGun) paneGun.classList.add('hidden');
        if (paneCam) paneCam.classList.remove('hidden');
        if (tabGun) {
            tabGun.className = "px-3.5 py-1.5 font-semibold text-xs rounded-xl text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-1.5";
        }
        if (tabCam) {
            tabCam.className = "px-3.5 py-1.5 font-bold text-xs rounded-xl bg-emerald-600 text-white shadow-xs transition-all flex items-center gap-1.5";
        }
    }
}

function onScanBarcodeKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitInputBarcodeManual();
    }
}

function submitInputBarcodeManual() {
    const input = document.getElementById('scan-barcode-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    prosesScanBarcodeBalek(val);
    input.value = '';
    input.focus();
}

function prosesScanBarcodeBalek(scannedCode) {
    if (!scannedCode) return;
    const cleanCode = scannedCode.trim();

    // 1. Cari Santri berdasarkan NIS (atau ID, atau Nama)
    const santri = (window.santriData || []).find(s => 
        (s.nis && s.nis.toLowerCase() === cleanCode.toLowerCase()) ||
        s.id === cleanCode ||
        (s.nama && s.nama.toLowerCase() === cleanCode.toLowerCase())
    );

    const resultCard = document.getElementById('scan-result-card');

    if (!santri) {
        playBeepSound('error');
        if (resultCard) {
            resultCard.classList.remove('hidden');
            resultCard.innerHTML = `
                <div class="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl flex items-center gap-3.5">
                    <div class="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-md">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold uppercase text-rose-600">Barcode / NIS Tidak Dikenali</div>
                        <h4 class="text-sm font-extrabold text-rose-950 font-mono mt-0.5">"${cleanCode}"</h4>
                        <p class="text-xs text-rose-700 mt-0.5">Data santri dengan NIS tersebut tidak ditemukan di master data PP. AL-USYMUNI.</p>
                    </div>
                </div>
            `;
        }
        return;
    }

    // 2. Cari Catatan Liburan Santri
    const libList = (window.liburanSantriList || []).filter(l => l.santriId === santri.id);
    libList.sort((a, b) => new Date(b.waktuInput || b.tglMulai) - new Date(a.waktuInput || a.tglMulai));

    let libItem = libList.find(l => !l.tglKembaliRealisasi) || libList[0];

    if (!libItem) {
        playBeepSound('warning');
        if (resultCard) {
            resultCard.classList.remove('hidden');
            resultCard.innerHTML = `
                <div class="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-center gap-3.5">
                    <div class="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-md">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold uppercase text-amber-700">Santri Ditemukan, Namun Belum Ada Izin Liburan</div>
                        <h4 class="text-sm font-extrabold text-amber-950">${santri.nama} (NIS: ${santri.nis || '-'})</h4>
                        <p class="text-xs text-amber-700 mt-0.5">Santri ini belum terdaftar di daftar izin liburan periode manapun.</p>
                    </div>
                </div>
            `;
        }
        return;
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    // Cek apakah sudah pernah tercatat kembali
    const alreadyReturned = Boolean(libItem.tglKembaliRealisasi);

    if (alreadyReturned) {
        playBeepSound('success');
        if (resultCard) {
            resultCard.classList.remove('hidden');
            resultCard.innerHTML = `
                <div class="p-4 bg-blue-50 border-2 border-blue-400 rounded-2xl flex items-center gap-3.5">
                    <div class="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-md">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold uppercase text-blue-700 flex items-center gap-1.5">
                            <span>Santri Sudah Tercatat Kembali Sebelumnya</span>
                            <span class="bg-blue-200 text-blue-800 px-2 py-0.2 rounded text-[10px] font-mono">${formatTanggalIndo(libItem.tglKembaliRealisasi)}</span>
                        </div>
                        <h4 class="text-base font-extrabold text-blue-950 mt-0.5">${santri.nama}</h4>
                        <div class="flex items-center gap-2 text-xs text-blue-800 mt-1 font-mono">
                            <span>NIS: <b>${santri.nis || '-'}</b></span>
                            <span>•</span>
                            <span>Kamar: <b>${santri.kamar || santri.kamarTerakhir || '-'}</b></span>
                            <span>•</span>
                            <span>Status: <b>${libItem.status}</b></span>
                        </div>
                    </div>
                </div>
            `;
        }
        return;
    }

    // Hitung status tepat waktu vs terlambat
    const isLate = todayStr > libItem.tglKembali;
    let lateDays = 0;
    if (isLate) {
        const diffMs = new Date(todayStr) - new Date(libItem.tglKembali);
        lateDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Update data liburan
    libItem.tglKembaliRealisasi = todayStr;
    libItem.jamKembaliRealisasi = nowTimeStr;
    libItem.status = isLate ? 'Terlambat Kembali' : 'Kembali Tepat Waktu';
    if (isLate) libItem.hariTerlambat = lateDays;
    libItem.catatanKembali = `Kedatangan tercatat otomatis via Scan Barcode NIS (${nowTimeStr})`;

    // Simpan ke storage
    if (typeof saveToStorage === 'function') {
        saveToStorage('liburanSantri', window.liburanSantriList);
    } else {
        localStorage.setItem('liburanSantriList', JSON.stringify(window.liburanSantriList));
    }

    // Mainkan audio beep
    playBeepSound(isLate ? 'warning' : 'success');

    // Tampilkan Card Hasil Scan
    if (resultCard) {
        resultCard.classList.remove('hidden');
        if (!isLate) {
            resultCard.innerHTML = `
                <div class="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/15 border-2 border-emerald-500 rounded-2xl flex items-center gap-4 shadow-sm animate-fade-in">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-emerald-500/20">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-600 text-white tracking-wider flex items-center gap-1">
                                <i class="fas fa-badge-check"></i> KEMBALI TEPAT WAKTU
                            </span>
                            <span class="text-xs text-emerald-800 font-mono font-bold">${nowTimeStr}</span>
                        </div>
                        <h4 class="text-base sm:text-lg font-black text-gray-900 mt-1 truncate">${santri.nama}</h4>
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mt-1 font-mono">
                            <span>NIS: <b class="text-emerald-800">${santri.nis || '-'}</b></span>
                            <span>•</span>
                            <span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-200">Kamar ${santri.kamar || santri.kamarTerakhir || '-'}</span>
                            <span>•</span>
                            <span>Periode: <b>${libItem.namaLiburan}</b></span>
                        </div>
                        <p class="text-[11px] text-emerald-700 mt-1">Alhamdulillah, santri tiba sesuai batas waktu (${formatTanggalIndo(libItem.tglKembali)}).</p>
                    </div>
                </div>
            `;
        } else {
            resultCard.innerHTML = `
                <div class="p-4 bg-gradient-to-r from-rose-500/10 to-orange-500/15 border-2 border-rose-500 rounded-2xl flex items-center gap-4 shadow-sm animate-fade-in">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-rose-500/20">
                        <i class="fas fa-triangle-exclamation"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-rose-600 text-white tracking-wider flex items-center gap-1 animate-pulse">
                                <i class="fas fa-clock-rotate-left"></i> TERLAMBAT ${lateDays} HARI
                            </span>
                            <span class="text-xs text-rose-800 font-mono font-bold">${nowTimeStr}</span>
                        </div>
                        <h4 class="text-base sm:text-lg font-black text-gray-900 mt-1 truncate">${santri.nama}</h4>
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mt-1 font-mono">
                            <span>NIS: <b class="text-rose-800">${santri.nis || '-'}</b></span>
                            <span>•</span>
                            <span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-200">Kamar ${santri.kamar || santri.kamarTerakhir || '-'}</span>
                            <span>•</span>
                            <span>Batas: <b class="text-rose-700">${formatTanggalIndo(libItem.tglKembali)}</b></span>
                        </div>
                        <p class="text-[11px] text-rose-700 mt-1 font-bold">Harap diarahkan ke Pos Keamanan untuk konfirmasi alasan keterlambatan & pembinaan.</p>
                    </div>
                </div>
            `;
        }
    }

    // Refresh Live Rekap & Tabel Halaman
    renderScanBalekLists();
    renderLiburanSantriPage();
}

function toggleCameraScanner() {
    const btn = document.getElementById('btn-toggle-cam');
    const readerDiv = document.getElementById('reader-barcode-cam');

    if (html5QrScannerInstance) {
        stopCameraScanner();
        return;
    }

    if (typeof Html5Qrcode === 'undefined') {
        return showToast("Pustaka kamera Html5Qrcode belum siap. Gunakan Scanner Gun / Input NIS.", "warning");
    }

    if (btn) {
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menghubungkan Kamera...`;
        btn.disabled = true;
    }

    html5QrScannerInstance = new Html5Qrcode("reader-barcode-cam");

    html5QrScannerInstance.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 260, height: 160 }
        },
        (decodedText, decodedResult) => {
            console.log("Barcode Kamera Terdeteksi:", decodedText);
            prosesScanBarcodeBalek(decodedText);
            if (btn) btn.innerHTML = `<i class="fas fa-check text-emerald-300"></i> Terbaca: ${decodedText}`;
            setTimeout(() => {
                if (btn && html5QrScannerInstance) {
                    btn.innerHTML = `<i class="fas fa-stop"></i> Matikan Kamera`;
                }
            }, 1200);
        },
        (errorMessage) => {
            // loop
        }
    ).then(() => {
        if (btn) {
            btn.innerHTML = `<i class="fas fa-stop"></i> Matikan Kamera`;
            btn.disabled = false;
            btn.className = "px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all";
        }
    }).catch(err => {
        console.error("Gagal memulai kamera scanner:", err);
        showToast("Tidak dapat mengakses kamera perangkat! Periksa izin browser.", "error");
        if (btn) {
            btn.innerHTML = `<i class="fas fa-video"></i> Aktifkan Kamera`;
            btn.disabled = false;
            btn.className = "px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all";
        }
        if (readerDiv) {
            readerDiv.innerHTML = `<span class="text-rose-400 p-4 text-center">Gagal mengakses kamera. Pastikan izin kamera aktif atau gunakan mode Scanner Gun / NIS.</span>`;
        }
        html5QrScannerInstance = null;
    });
}

function stopCameraScanner() {
    const btn = document.getElementById('btn-toggle-cam');
    const readerDiv = document.getElementById('reader-barcode-cam');

    if (html5QrScannerInstance) {
        html5QrScannerInstance.stop().then(() => {
            html5QrScannerInstance.clear();
            html5QrScannerInstance = null;
        }).catch(err => {
            console.warn("Error stopping scanner:", err);
            html5QrScannerInstance = null;
        });
    }

    if (btn) {
        btn.innerHTML = `<i class="fas fa-video"></i> Aktifkan Kamera`;
        btn.disabled = false;
        btn.className = "px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all";
    }
    if (readerDiv) {
        readerDiv.innerHTML = `<span>Kamera non-aktif. Klik "Aktifkan Kamera" di atas.</span>`;
    }
}

function switchRekapTab(tab) {
    activeScanRekapTab = tab;
    const tabSudah = document.getElementById('tab-rekap-sudah');
    const tabBelum = document.getElementById('tab-rekap-belum');

    if (tab === 'sudah') {
        if (tabSudah) tabSudah.className = "px-3 py-1 rounded-lg text-xs font-bold bg-white text-emerald-800 shadow-xs border border-emerald-300";
        if (tabBelum) tabBelum.className = "px-3 py-1 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900";
    } else {
        if (tabSudah) tabSudah.className = "px-3 py-1 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900";
        if (tabBelum) tabBelum.className = "px-3 py-1 rounded-lg text-xs font-bold bg-white text-rose-800 shadow-xs border border-rose-300";
    }

    renderScanBalekLists();
}

function renderScanBalekLists() {
    const list = window.liburanSantriList || [];
    const santriMap = new Map((window.santriData || []).map(s => [s.id, s]));
    const container = document.getElementById('scan-rekap-list');
    const countSudahEl = document.getElementById('scan-rekap-count-sudah');
    const countBelumEl = document.getElementById('scan-rekap-count-belum');

    const sudahList = list.filter(x => x.tglKembaliRealisasi);
    const belumList = list.filter(x => !x.tglKembaliRealisasi);

    if (countSudahEl) countSudahEl.innerText = sudahList.length;
    if (countBelumEl) countBelumEl.innerText = belumList.length;

    if (!container) return;

    const todayStr = new Date().toLocaleDateString('en-CA');

    if (activeScanRekapTab === 'sudah') {
        if (sudahList.length === 0) {
            container.innerHTML = `<div class="py-6 text-center text-gray-400">Belum ada santri yang di-scan balek ke pondok hari ini.</div>`;
            return;
        }

        const sorted = [...sudahList].sort((a, b) => new Date(b.tglKembaliRealisasi) - new Date(a.tglKembaliRealisasi));
        let html = '';
        sorted.forEach(item => {
            const s = santriMap.get(item.santriId) || { nama: 'Santri', nis: '-', kamar: '-' };
            const isLate = item.status === 'Terlambat Kembali';

            html += `
                <div class="p-2.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between gap-2 hover:border-emerald-300 transition-colors">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-8 h-8 rounded-lg ${isLate ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'} flex items-center justify-center font-bold text-xs shrink-0">
                            <i class="fas ${isLate ? 'fa-clock' : 'fa-check'}"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="font-bold text-gray-900 truncate">${s.nama}</div>
                            <div class="text-[10px] text-gray-500 font-mono">
                                <span>NIS: ${s.nis || '-'}</span> • <span>Kamar ${s.kamar || s.kamarTerakhir || '-'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isLate ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
                            ${isLate ? `Terlambat ${item.hariTerlambat ? `${item.hariTerlambat}h` : ''}` : 'Tepat Waktu'}
                        </span>
                        <div class="text-[10px] text-gray-400 mt-0.5 font-mono">${item.jamKembaliRealisasi || formatTanggalIndo(item.tglKembaliRealisasi)}</div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } else {
        if (belumList.length === 0) {
            container.innerHTML = `<div class="py-6 text-center text-emerald-600 font-bold"><i class="fas fa-check-circle mr-1"></i> Seluruh santri sudah kembali ke pondok!</div>`;
            return;
        }

        let html = '';
        belumList.forEach(item => {
            const s = santriMap.get(item.santriId) || { nama: 'Santri', nis: '-', kamar: '-' };
            const isOverdue = item.tglKembali && item.tglKembali < todayStr;

            html += `
                <div class="p-2.5 bg-white border ${isOverdue ? 'border-rose-300 bg-rose-50/30' : 'border-gray-200'} rounded-xl flex items-center justify-between gap-2 hover:border-amber-300 transition-colors">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-8 h-8 rounded-lg ${isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'} flex items-center justify-center font-bold text-xs shrink-0">
                            <i class="fas ${isOverdue ? 'fa-triangle-exclamation' : 'fa-clock'}"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="font-bold text-gray-900 truncate">${s.nama}</div>
                            <div class="text-[10px] text-gray-500 font-mono">
                                <span>NIS: ${s.nis || '-'}</span> • <span>Kamar ${s.kamar || s.kamarTerakhir || '-'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right shrink-0 flex items-center gap-2">
                        <div>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isOverdue ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-amber-100 text-amber-800'}">
                                ${isOverdue ? 'Lewat Batas!' : 'Masih Libur'}
                            </span>
                            <div class="text-[10px] text-gray-500 mt-0.5 font-mono">Batas: ${formatTanggalIndo(item.tglKembali)}</div>
                        </div>
                        <button type="button" onclick="prosesScanBarcodeBalek('${s.nis}')" title="Catat Kembali Cepat" class="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all text-xs cursor-pointer">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }
}

// Cetak Surat Izin Pulang Santri (Insidentil)
function cetakSuratIzinPulang(id) {
    const item = (window.pulangSantriList || []).find(x => x.id === id);
    if (!item) return showToast("Data izin pulang tidak ditemukan!", "error");

    const s = (window.santriData || []).find(x => x.id === item.santriId) || { nama: '-', nis: '-', kamar: '-' };
    const tglMulaiStr = formatTanggalIndo(item.tglMulai);
    const tglKembaliStr = formatTanggalIndo(item.tglKembaliTarget);
    const tglCetakStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return showToast("Popup diblokir browser! Izinkan popup untuk mencetak surat.", "error");

    w.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>Surat Izin Pulang - ${s.nama}</title>
        <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.6; padding: 20px; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h2 { margin: 0; font-size: 20px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; }
            .header h3 { margin: 3px 0 0; font-size: 15px; font-weight: bold; }
            .header p { margin: 3px 0 0; font-size: 12px; color: #333; }
            .title { text-align: center; margin-bottom: 20px; }
            .title h4 { margin: 0; font-size: 16px; text-decoration: underline; text-transform: uppercase; font-weight: bold; }
            .title p { margin: 2px 0 0; font-size: 12px; font-style: italic; }
            .content { font-size: 14px; margin-bottom: 18px; text-align: justify; }
            .table-bio { width: 100%; margin: 12px 0; border-collapse: collapse; font-size: 14px; }
            .table-bio td { padding: 4px 8px; vertical-align: top; }
            .table-bio td:first-child { width: 220px; font-weight: bold; }
            .table-bio td:nth-child(2) { width: 15px; }
            .reason-box { background: #f8fafc; border: 1.5px solid #cbd5e1; padding: 10px 14px; border-radius: 6px; margin: 14px 0; font-size: 13px; }
            .rule-box { background: #fff1f2; border: 1.5px solid #f43f5e; padding: 10px 14px; border-radius: 6px; margin: 14px 0; font-size: 12px; color: #9f1239; }
            .footer-sign { width: 100%; margin-top: 40px; font-size: 14px; border-collapse: collapse; }
            .footer-sign td { width: 33.3%; text-align: center; vertical-align: top; }
            .space-sign { height: 70px; }
            .btn-print { position: fixed; top: 15px; right: 15px; background: #059669; color: white; padding: 10px 18px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
            @media print {
                .btn-print { display: none; }
                body { padding: 0; }
            }
        </style>
    </head>
    <body>
        <button class="btn-print" onclick="window.print()">🖨️ Cetak Surat Izin Pulang (PDF)</button>

        <div class="header-container" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 18px;">
            <div style="flex: 1; text-align: center; padding-right: 15px;">
                <h2 style="margin: 0; font-size: 19px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">PONDOK PESANTREN AL-USYMUNI</h2>
                <h3 style="margin: 3px 0 0; font-size: 14px; font-weight: bold;">BAGIAN KETERTIBAN & KEAMANAN ASRAMA PUTRA</h3>
                <p style="margin: 3px 0 0; font-size: 11px; color: #333;">Alamat: PP. Al-Usymuni, Tarate, Sumenep, Madura, Jawa Timur • Telp: (0328) 662888</p>
            </div>
            <div style="border: 1.5px solid #000; border-radius: 6px; padding: 5px 8px; text-align: center; background: #fff; width: 170px; shrink: 0;">
                <div style="font-size: 8px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px; color: #111;">BARCODE KEPULANGAN</div>
                <div style="display: flex; justify-content: center; margin: 1px 0;">
                    ${generateCode128SVG(s.nis || '1441-00-000', 34, 1.2)}
                </div>
                <div style="font-family: monospace; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; color: #000; margin-top: 1px;">NIS: ${s.nis || '-'}</div>
                <div style="font-size: 7.5px; color: #555;">Scan saat kembali ke asrama</div>
            </div>
        </div>

        <div class="title">
            <h4>SURAT KETERANGAN IZIN PULANG SANTRI</h4>
            <p>Nomor: SIP/${s.nis || 'PP'}/${new Date().getFullYear()}</p>
        </div>

        <div class="content">
            <p>Yang bertanda tangan di bawah ini Pengurus Bagian Keamanan & Ketertiban Pondok Pesantren AL-USYMUNI memberikan izin keluar/pulang sementara kepada:</p>

            <table class="table-bio">
                <tr><td>Nama Santri</td><td>:</td><td><b>${s.nama}</b></td></tr>
                <tr><td>Nomor Induk Santri (NIS)</td><td>:</td><td>${s.nis || '-'}</td></tr>
                <tr><td>Kamar Asrama</td><td>:</td><td>Kamar ${s.kamar || s.kamarTerakhir || '-'}</td></tr>
                <tr><td>Keperluan / Jenis Izin</td><td>:</td><td><b>${item.jenisIzin}</b></td></tr>
                <tr><td>Tanggal & Waktu Berangkat</td><td>:</td><td>${tglMulaiStr} ${item.jamMulai ? `pukul ${item.jamMulai} WIB` : ''}</td></tr>
                <tr><td>Batas Wajib Tiba di Pondok</td><td>:</td><td><b style="color: #e11d48;">${tglKembaliStr}</b></td></tr>
                <tr><td>Alamat Tujuan</td><td>:</td><td>${item.tujuan || s.asalKota || '-'}</td></tr>
                <tr><td>Wali / Penjemput</td><td>:</td><td><b>${item.namaPenjemput}</b> (${item.hubunganPenjemput || 'Keluarga'})</td></tr>
                <tr><td>Nomor Kontak Penjemput</td><td>:</td><td>${item.noHpPenjemput || '-'}</td></tr>
            </table>

            <div class="reason-box">
                <b>KETERANGAN / ALASAN KELUAR:</b><br>
                ${item.keterangan || 'Telah diverifikasi oleh pengurus asrama.'}
            </div>

            <div class="rule-box">
                <b>KETENTUAN KEMBALI SANTRI:</b><br>
                1. Izin ini berlaku sementara sampai dengan batas tanggal <b>${tglKembaliStr}</b>.<br>
                2. Begitu tiba kembali di pesantren, santri <b>wajib melapor langsung ke kantor keamanan</b> dengan menyerahkan surat izin ini untuk dicatat kepulangannya.<br>
                3. Keterlambatan tanpa konfirmasi resmi dari wali santri akan dikenakan sanksi kedisiplinan.
            </div>
        </div>

        <table class="footer-sign">
            <tr>
                <td>
                    Wali Penjemput,
                    <div class="space-sign"></div>
                    <b>( ${item.namaPenjemput} )</b>
                </td>
                <td>
                    Santri yang Bersangkutan,
                    <div class="space-sign"></div>
                    <b>( ${s.nama} )</b>
                </td>
                <td>
                    Sumenep, ${tglCetakStr}<br>
                    <b>Petugas Bagian Keamanan</b>
                    <div class="space-sign"></div>
                    <b>( ${item.petugasIzin || 'Pengurus Keamanan'} )</b>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `);
    w.document.close();
}

// ==========================================================================
// 5. EXPORT EXCEL (Liburan & Pulang)
// ==========================================================================

function exportLiburanSantriExcel() {
    const list = window.liburanSantriList || [];
    if (list.length === 0) return showToast("Tidak ada data izin liburan untuk diekspor!", "info");

    const santriMap = new Map((window.santriData || []).map(s => [s.id, s]));

    let tableHtml = `
        <table border="1">
            <thead>
                <tr style="background-color: #f59e0b; color: white;">
                    <th>No</th>
                    <th>Nama Santri</th>
                    <th>NIS</th>
                    <th>Kamar</th>
                    <th>Periode Liburan</th>
                    <th>Tahun Ajaran</th>
                    <th>Tgl Mulai</th>
                    <th>Batas Wajib Kembali</th>
                    <th>Tgl Tiba Realisasi</th>
                    <th>Status</th>
                    <th>Tujuan</th>
                    <th>Penjemput</th>
                    <th>Catatan</th>
                </tr>
            </thead>
            <tbody>
    `;

    list.forEach((item, idx) => {
        const s = santriMap.get(item.santriId) || {};
        tableHtml += `
            <tr>
                <td>${idx + 1}</td>
                <td>${s.nama || '-'}</td>
                <td>${s.nis || '-'}</td>
                <td>${s.kamar || s.kamarTerakhir || '-'}</td>
                <td>${item.namaLiburan}</td>
                <td>${item.tahunAjaran || '-'}</td>
                <td>${item.tglMulai}</td>
                <td>${item.tglKembali}</td>
                <td>${item.tglKembaliRealisasi || '-'}</td>
                <td>${item.status}</td>
                <td>${item.tujuan || '-'}</td>
                <td>${item.penjemput || '-'}</td>
                <td>${item.catatan || '-'}</td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;

    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    const dateStr = new Date().toLocaleDateString('en-CA');
    link.href = URL.createObjectURL(blob);
    link.download = `Rekap_Liburan_Santri_PP_ALUSYMUNI_${dateStr}.xls`;
    link.click();
    showToast("Data izin liburan berhasil diekspor ke Excel!");
}

function exportPulangSantriExcel() {
    const list = window.pulangSantriList || [];
    if (list.length === 0) return showToast("Tidak ada data izin pulang untuk diekspor!", "info");

    const santriMap = new Map((window.santriData || []).map(s => [s.id, s]));

    let tableHtml = `
        <table border="1">
            <thead>
                <tr style="background-color: #10b981; color: white;">
                    <th>No</th>
                    <th>Nama Santri</th>
                    <th>NIS</th>
                    <th>Kamar</th>
                    <th>Jenis Izin</th>
                    <th>Tgl Mulai</th>
                    <th>Jam Mulai</th>
                    <th>Batas Wajib Kembali</th>
                    <th>Tgl Tiba Realisasi</th>
                    <th>Status</th>
                    <th>Wali Penjemput</th>
                    <th>Hubungan</th>
                    <th>No. HP</th>
                    <th>Tujuan</th>
                    <th>Keterangan</th>
                    <th>Catatan Kembali</th>
                </tr>
            </thead>
            <tbody>
    `;

    list.forEach((item, idx) => {
        const s = santriMap.get(item.santriId) || {};
        tableHtml += `
            <tr>
                <td>${idx + 1}</td>
                <td>${s.nama || '-'}</td>
                <td>${s.nis || '-'}</td>
                <td>${s.kamar || s.kamarTerakhir || '-'}</td>
                <td>${item.jenisIzin}</td>
                <td>${item.tglMulai}</td>
                <td>${item.jamMulai || '-'}</td>
                <td>${item.tglKembaliTarget}</td>
                <td>${item.tglKembaliRealisasi || '-'}</td>
                <td>${item.status}</td>
                <td>${item.namaPenjemput || '-'}</td>
                <td>${item.hubunganPenjemput || '-'}</td>
                <td>${item.noHpPenjemput || '-'}</td>
                <td>${item.tujuan || '-'}</td>
                <td>${item.keterangan || '-'}</td>
                <td>${item.catatanKembali || '-'}</td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;

    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    const dateStr = new Date().toLocaleDateString('en-CA');
    link.href = URL.createObjectURL(blob);
    link.download = `Rekap_Izin_Pulang_Santri_PP_ALUSYMUNI_${dateStr}.xls`;
    link.click();
    showToast("Data izin pulang santri berhasil diekspor ke Excel!");
}

// Helper Format Tanggal Indonesia
function formatTanggalIndo(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

// Expose ke global window
window.updateLiburanFiltersAndDropdowns = updateLiburanFiltersAndDropdowns;
window.renderLiburanSantriPage = renderLiburanSantriPage;
window.pindahHalamanLiburan = pindahHalamanLiburan;
window.bukaModalLiburanSantri = bukaModalLiburanSantri;
window.bukaModalEditLiburanBersama = bukaModalEditLiburanBersama;
window.onLiburanScopeChanged = onLiburanScopeChanged;
window.onLiburanSantriChanged = onLiburanSantriChanged;
window.onBulkKamarLiburanChanged = onBulkKamarLiburanChanged;
window.simpanIzinLiburan = simpanIzinLiburan;
window.hapusHasilPengeditanLiburan = hapusHasilPengeditanLiburan;
window.hapusSeluruhLiburanPeriode = hapusSeluruhLiburanPeriode;
window.hapusIzinLiburan = hapusIzinLiburan;

window.updatePulangFiltersAndDropdowns = updatePulangFiltersAndDropdowns;
window.renderPulangSantriPage = renderPulangSantriPage;
window.pindahHalamanPulang = pindahHalamanPulang;
window.bukaModalPulangSantri = bukaModalPulangSantri;
window.onPulangSantriChanged = onPulangSantriChanged;
window.simpanIzinPulang = simpanIzinPulang;
window.hapusIzinPulang = hapusIzinPulang;

window.bukaModalKonfirmasiKembali = bukaModalKonfirmasiKembali;
window.simpanKonfirmasiKembali = simpanKonfirmasiKembali;
window.generateCode128SVG = generateCode128SVG;
window.playBeepSound = playBeepSound;
window.peringatanTunggakanLiburan = peringatanTunggakanLiburan;
window.cetakSuratIzinLiburan = cetakSuratIzinLiburan;
window.bukaModalCetakMassalLiburan = bukaModalCetakMassalLiburan;
window.onKamarMassalChanged = onKamarMassalChanged;
window.prosesCetakMassalLiburan = prosesCetakMassalLiburan;
window.bukaModalScanBalekPondok = bukaModalScanBalekPondok;
window.tutupModalScanBalekPondok = tutupModalScanBalekPondok;
window.switchScanTab = switchScanTab;
window.onScanBarcodeKeydown = onScanBarcodeKeydown;
window.submitInputBarcodeManual = submitInputBarcodeManual;
window.prosesScanBarcodeBalek = prosesScanBarcodeBalek;
window.toggleCameraScanner = toggleCameraScanner;
window.stopCameraScanner = stopCameraScanner;
window.switchRekapTab = switchRekapTab;
window.renderScanBalekLists = renderScanBalekLists;
window.cetakSuratIzinPulang = cetakSuratIzinPulang;
window.exportLiburanSantriExcel = exportLiburanSantriExcel;
window.exportPulangSantriExcel = exportPulangSantriExcel;
window.onSearchSantriLiburan = onSearchSantriLiburan;
window.onFocusSantriLiburan = onFocusSantriLiburan;
window.selectSantriForLiburan = selectSantriForLiburan;
window.clearSelectedSantriLiburan = clearSelectedSantriLiburan;

// Listener Tutup Dropdown Search Santri Liburan saat Klik di Luar
document.addEventListener('click', function(e) {
    const contLib = document.getElementById('liburan-scope-single-box');
    const dropLib = document.getElementById('dropdown-santri-liburan');
    if (dropLib && contLib && !contLib.contains(e.target)) {
        dropLib.classList.add('hidden');
    }
});
