/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Tagihan Kustom / Kepanitiaan Module
 * Mengelola pembayaran bertahap untuk Ikhtibar, Uang Gedung, dll
 * ==========================================================================
 */

// Buka Halaman Tagihan Kustom Spesifik
function bukaHalamanPembayaranKustom(namaTagihan) {
    window.currentTagihanKustom = namaTagihan;
    const titleEl = document.getElementById('title-pembayaran-kustom');
    if (titleEl) titleEl.innerText = 'Pembayaran ' + namaTagihan;
    navigate('pembayaran-kustom');
}

// Render Tabel Daftar Santri untuk Tagihan Kustom dengan Pagination 20 Data
function renderPembayaranKustomList(resetPage = false) {
    if (resetPage && window.paginationState) {
        window.paginationState.kustom.page = 1;
    }
    const TA = getTahunAjaranAktif();
    const tb = document.getElementById('table-pembayaran-kustom');
    const searchEl = document.getElementById('search-kustom');
    const search = searchEl ? searchEl.value.toLowerCase().trim() : '';
    if (!tb) return;
    
    let tk = appSettings.tagihanKustom.find(k => k.nama === window.currentTagihanKustom);
    let nominalTarget = tk ? tk.nominal : 0;

    let d = santriData.filter(s => s.status === 'Aktif').sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
    if (search) d = d.filter(s => (s.nama || '').toLowerCase().includes(search) || (s.nis || '').toLowerCase().includes(search));

    const totalItems = d.length;
    const page = window.paginationState ? window.paginationState.kustom.page : 1;
    const pageSize = (window.paginationState && window.paginationState.kustom.pageSize) || 20;

    const paged = typeof paginateArray === 'function'
        ? paginateArray(d, page, pageSize)
        : { items: d.slice(0, 20), total: totalItems, currentPage: 1, totalPages: 1 };

    if (window.paginationState) {
        window.paginationState.kustom.page = paged.currentPage;
    }

    if (paged.items.length === 0) {
        tb.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-gray-400"><i class="fas fa-search text-2xl mb-2 text-gray-300"></i><p>Tidak ada data santri ditemukan</p></td></tr>`;
    } else {
        tb.innerHTML = paged.items.map(s => {
            let infoTarif = (typeof getTarifSantriKustom === 'function') 
                ? getTarifSantriKustom(s.id, window.currentTagihanKustom) 
                : { isKhusus: false, nominal: nominalTarget, bebas: false };
            let santriNominal = infoTarif.isKhusus ? infoTarif.nominal : nominalTarget;

            let trx = transactions.filter(t => t.santriId === s.id && t.kategori === window.currentTagihanKustom && t.ta === TA && t.type === 'in');
            let totalBayar = trx.reduce((sum, t) => sum + t.amount, 0);
            
            let progress = 0;
            if (infoTarif.bebas || santriNominal === 0) {
                progress = 100;
            } else if (santriNominal > 0) {
                progress = Math.min(100, Math.round((totalBayar / santriNominal) * 100));
            }

            let tarifBadge = '';
            if (infoTarif.isKhusus) {
                if (infoTarif.bebas) {
                    tarifBadge = `<span class="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full ml-1.5"><i class="fas fa-gift text-[9px]"></i> Bebas</span>`;
                } else {
                    tarifBadge = `<span class="inline-flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full ml-1.5"><i class="fas fa-tag text-[9px]"></i> Khusus: ${formatRupiah(santriNominal)}</span>`;
                }
            }
            
            return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center flex-wrap gap-1">
                        <span class="font-bold text-gray-800 uppercase">${s.nama}</span>
                        ${tarifBadge}
                    </div>
                    <div class="font-mono text-[10px] text-gray-400 mt-0.5">${s.nis}</div>
                </td>
                <td class="px-6 py-4 text-gray-600 font-medium">${s.kamar || '-'}</td>
                <td class="px-6 py-4 w-48">
                    <div class="flex justify-between text-xs mb-1.5"><span class="${progress === 100 ? 'text-[#0ca678] font-bold' : 'text-gray-500 font-medium'}">${progress}%</span></div>
                    <div class="w-full bg-gray-100 rounded-full h-2"><div class="bg-[#0ca678] h-2 rounded-full" style="width: ${progress}%"></div></div>
                </td>
                <td class="px-6 py-4 text-center">
                    <button onclick="bukaDetailPembayaranKustom('${s.id}')" class="bg-emerald-50 border border-emerald-100 hover:bg-[#0ca678] hover:text-white text-emerald-700 px-5 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors">Kelola Tagihan</button>
                </td>
            </tr>`;
        }).join('');
    }

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls({
            containerId: 'pagination-kustom',
            totalItems: totalItems,
            currentPage: paged.currentPage,
            pageSize: pageSize,
            onPageChange: 'gantiHalamanKustom'
        });
    }
}

// Buka Kartu Rincian Tagihan Kustom Santri
function bukaDetailPembayaranKustom(santriId) {
    currentDetailSantriId = santriId;

    const s = santriData.find(x => x.id === santriId);
    if (!s) return;

    const viewList = document.getElementById('view-kustom-list');
    const viewDetail = document.getElementById('view-kustom-detail');
    const headerList = document.getElementById('header-kustom-list');
    
    if (viewList) viewList.classList.add('hidden');
    if (headerList) headerList.classList.add('hidden');
    if (viewDetail) viewDetail.classList.remove('hidden');
    
    document.getElementById('detail-kustom-title').innerText = 'Tagihan ' + window.currentTagihanKustom;
    document.getElementById('detail-kustom-ta').innerText = getTahunAjaranAktif();
    document.getElementById('detail-kustom-nama').innerText = s.nama;
    document.getElementById('detail-kustom-nis').innerText = s.nis;
    document.getElementById('detail-kustom-kamar').innerText = s.kamar || '-';

    renderDetailPembayaranKustomData();
}

// Render Data Finansial & Riwayat Pembayaran Tagihan Kustom
function renderDetailPembayaranKustomData() {
    const s = santriData.find(x => x.id === currentDetailSantriId);
    if (!s) return;

    const TA = getTahunAjaranAktif();
    const trx = transactions.filter(t => t.santriId === s.id && t.kategori === window.currentTagihanKustom && t.ta === TA && t.type === 'in');
    
    let infoTarif = (typeof getTarifSantriKustom === 'function') 
        ? getTarifSantriKustom(s.id, window.currentTagihanKustom) 
        : { isKhusus: false, nominal: 0, bebas: false };

    let tk = appSettings.tagihanKustom.find(k => k.nama === window.currentTagihanKustom);
    let totalTagihan = infoTarif.isKhusus ? infoTarif.nominal : (tk ? tk.nominal : 0);
    const sudahDibayar = trx.reduce((sum, t) => sum + t.amount, 0);
    const sisa = infoTarif.bebas ? 0 : Math.max(0, totalTagihan - sudahDibayar);

    document.getElementById('detail-kustom-total-tagihan').innerText = formatRupiah(totalTagihan);
    document.getElementById('detail-kustom-sudah-dibayar').innerText = formatRupiah(sudahDibayar);
    document.getElementById('detail-kustom-sisa').innerText = formatRupiah(sisa);

    // Alert informasi tarif khusus jika berlaku
    let elInfoBanner = document.getElementById('detail-kustom-info-khusus');
    if (!elInfoBanner) {
        const headerInfoParent = document.getElementById('detail-kustom-title')?.parentElement;
        if (headerInfoParent) {
            elInfoBanner = document.createElement('div');
            elInfoBanner.id = 'detail-kustom-info-khusus';
            headerInfoParent.insertAdjacentElement('afterend', elInfoBanner);
        }
    }
    if (elInfoBanner) {
        if (infoTarif.isKhusus) {
            elInfoBanner.className = "mb-4 bg-purple-50 border border-purple-200 text-purple-800 rounded-xl px-4 py-3 flex items-center justify-between text-xs font-medium";
            elInfoBanner.innerHTML = `
                <div class="flex items-center gap-2">
                    <i class="fas fa-user-tag text-purple-600 text-base"></i>
                    <span>Santri ini memiliki <b>Tarif Khusus</b>: <b class="font-bold underline">${infoTarif.bebas ? 'Bebas Biaya (Rp 0)' : formatRupiah(infoTarif.nominal)}</b> (${infoTarif.keterangan || 'Dispensasi'})</span>
                </div>
                <button onclick="navigate('pengaturan')" class="text-purple-700 hover:text-purple-900 underline font-bold text-xs ml-2 shrink-0">Ubah di Pengaturan</button>
            `;
            elInfoBanner.classList.remove('hidden');
        } else {
            elInfoBanner.classList.add('hidden');
        }
    }

    const badgeLunas = document.getElementById('detail-kustom-status-lunas');
    const inputBayar = document.getElementById('input-bayar-kustom');

    if (badgeLunas && inputBayar) {
        if (infoTarif.bebas) {
            badgeLunas.className = "px-4 py-2 bg-emerald-100 text-emerald-800 font-bold text-sm rounded-lg border border-emerald-300 uppercase tracking-wider";
            badgeLunas.innerText = "BEBAS BIAYA";
            inputBayar.value = 0;
            inputBayar.disabled = true;
        } else if (sisa <= 0) {
            badgeLunas.className = "px-4 py-2 bg-[#d1fae5] text-[#059669] font-bold text-sm rounded-lg border border-emerald-200 uppercase tracking-wider";
            badgeLunas.innerText = "LUNAS";
            inputBayar.value = 0;
            inputBayar.disabled = true;
        } else {
            badgeLunas.className = "px-4 py-2 bg-[#fef3c7] text-[#b45309] font-bold text-sm rounded-lg border border-[#fde68a] uppercase tracking-wider";
            badgeLunas.innerText = "BELUM LUNAS";
            inputBayar.disabled = false;
            inputBayar.value = sisa; // Default isi otomatis dengan sisa tagihan
        }
    }

    // Render Tabel Riwayat Pembayaran Tagihan Ini
    const tbRiwayat = document.getElementById('list-riwayat-bayar-kustom');
    if (tbRiwayat) {
        tbRiwayat.innerHTML = trx.length ? trx.map((t, i) => `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 text-gray-400 font-medium">${i + 1}</td>
                <td class="px-6 py-4 font-medium text-gray-800">${new Date(t.date).toLocaleDateString('id-ID')}</td>
                <td class="px-6 py-4 text-[#0ca678] font-bold text-sm">${formatRupiah(t.amount)}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="hapusRiwayatKustom('${t.id}')" class="text-rose-400 hover:text-rose-600 transition-colors" title="Batalkan"><i class="fas fa-trash-alt text-[15px]"></i></button>
                </td>
            </tr>
        `).join('') : `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400 text-sm">Belum ada riwayat pembayaran.</td></tr>`;
    }
}

// Proses Simpan Pembayaran Tagihan Kustom
function prosesBayarKustom() {
    const inputEl = document.getElementById('input-bayar-kustom');
    const nom = parseInt(inputEl.value);
    if (!nom || nom <= 0) return showToast("Masukkan nominal yang valid!", "error");

    const s = santriData.find(x => x.id === currentDetailSantriId);
    
    const elMetode = document.getElementById('kustom-metode-bayar');
    const metodeBayar = elMetode ? elMetode.value : 'Tunai';

    showConfirm("Konfirmasi Bayar", `Simpan pembayaran ${window.currentTagihanKustom} sebesar ${formatRupiah(nom)} (${metodeBayar}) untuk ${s.nama}?`, () => {
        transactions.push({
            id: (typeof generateTrxId === 'function') ? generateTrxId('TRX') : ('TRX-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()),
            santriId: s.id,
            ta: getTahunAjaranAktif(),
            kategori: window.currentTagihanKustom,
            type: 'in',
            amount: nom,
            desc: `Pembayaran ${window.currentTagihanKustom}`,
            metode: metodeBayar,
            date: new Date().toLocaleDateString('en-CA')
        });
        
        window.transactions = transactions;
        saveDataToStorage();
        if (typeof triggerAutoSyncToCloud === 'function') triggerAutoSyncToCloud(true);
        updateDashboard();
        renderDetailPembayaranKustomData(); 
        if (typeof renderPembayaranKustomList === 'function') renderPembayaranKustomList();
        showToast("Pembayaran Berhasil Disimpan!");
    }, false); 
}

// Hapus Riwayat Pembayaran Tagihan Kustom
function hapusRiwayatKustom(trxId) {
    showConfirm("Hapus Pembayaran?", "Uang yang sudah masuk akan dihapus dari riwayat. Yakin?", () => {
        if (typeof trackDeletedTransactionId === 'function') {
            trackDeletedTransactionId(trxId);
        }
        transactions = transactions.filter(t => t.id !== trxId);
        window.transactions = transactions;
        saveDataToStorage();
        if (typeof triggerAutoSyncToCloud === 'function') triggerAutoSyncToCloud(true);
        updateDashboard();
        renderDetailPembayaranKustomData(); 
        if (typeof renderPembayaranKustomList === 'function') renderPembayaranKustomList();
        showToast("Pembayaran dibatalkan");
    });
}

// Kembali ke Tabel Santri Tagihan Kustom
function kembaliKeDaftarKustom() {
    const vList = document.getElementById('view-kustom-list');
    const hList = document.getElementById('header-kustom-list');
    const vDetail = document.getElementById('view-kustom-detail');
    if (vList) vList.classList.remove('hidden');
    if (hList) hList.classList.remove('hidden');
    if (vDetail) vDetail.classList.add('hidden');
    renderPembayaranKustomList();
}

// Expose ke global window
window.bukaHalamanPembayaranKustom = bukaHalamanPembayaranKustom;
window.renderPembayaranKustomList = renderPembayaranKustomList;
window.bukaDetailPembayaranKustom = bukaDetailPembayaranKustom;
window.renderDetailPembayaranKustomData = renderDetailPembayaranKustomData;
window.prosesBayarKustom = prosesBayarKustom;
window.hapusRiwayatKustom = hapusRiwayatKustom;
window.kembaliKeDaftarKustom = kembaliKeDaftarKustom;
