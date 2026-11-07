/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Laporan & Riwayat Module
 * Rekapitulasi tunggakan santri (Syahriah, Pembayaran Lain, Tagihan Kustom),
 * riwayat seluruh mutasi kas, kartu KPI, & export Excel (.xlsx / .csv)
 * ==========================================================================
 */

// Render Riwayat Seluruh Transaksi Masuk & Keluar
// Render Riwayat Seluruh Transaksi Masuk & Keluar dengan Pagination 20 Data
function renderLaporan(resetPage = false) { 
    if (resetPage && window.paginationState) {
        window.paginationState.riwayat.page = 1;
    }
    const filterTipeEl = document.getElementById('filter-tipe');
    const f = filterTipeEl ? filterTipeEl.value : 'all'; 
    const filterMetodeEl = document.getElementById('filter-metode-riwayat');
    const fMetode = filterMetodeEl ? filterMetodeEl.value : 'all';
    const elSearch = document.getElementById('search-riwayat');
    const src = elSearch ? elSearch.value.toLowerCase().trim() : '';
    const tb = document.getElementById('table-riwayat'); 
    if (!tb) return;
    
    // Hitung ringkasan kas masuk Tunai vs Transfer
    let totalKasTunai = 0;
    let totalKasTransfer = 0;
    transactions.forEach(t => {
        if (t.type === 'in') {
            if (t.metode === 'Transfer') {
                totalKasTransfer += t.amount;
            } else {
                totalKasTunai += t.amount;
            }
        }
    });

    const elSumTunai = document.getElementById('riwayat-total-tunai');
    if (elSumTunai) elSumTunai.innerText = formatRupiah(totalKasTunai);

    const elSumTransfer = document.getElementById('riwayat-total-transfer');
    if (elSumTransfer) elSumTransfer.innerText = formatRupiah(totalKasTransfer);

    let d = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)); 
    if (f !== 'all') d = d.filter(t => t.type === f); 
    if (fMetode !== 'all') d = d.filter(t => (t.metode || 'Tunai') === fMetode);
    
    if (src) {
        d = d.filter(t => {
            let namaPihak = "";
            if (t.type === 'in') {
                if (t.santriId) {
                    const s = santriData.find(x => x.id === t.santriId);
                    if (s) namaPihak = s.nama.toLowerCase();
                } else if (t.pembayar) {
                    namaPihak = t.pembayar.toLowerCase();
                }
            } else if (t.type === 'out') {
                namaPihak = (t.pj || "").toLowerCase();
            }
            return namaPihak.includes(src) || (t.desc || '').toLowerCase().includes(src) || (t.subJenis || '').toLowerCase().includes(src);
        });
    }

    const totalItems = d.length;
    const page = window.paginationState ? window.paginationState.riwayat.page : 1;
    const pageSize = (window.paginationState && window.paginationState.riwayat.pageSize) || 20;

    const paged = typeof paginateArray === 'function'
        ? paginateArray(d, page, pageSize)
        : { items: d.slice(0, 20), total: totalItems, currentPage: 1, totalPages: 1 };

    if (window.paginationState) {
        window.paginationState.riwayat.page = paged.currentPage;
    }

    tb.innerHTML = paged.items.length ? paged.items.map(t => {
        let pihakTerkait = "-";
        if (t.type === 'in') {
            if (t.santriId) {
                const s = santriData.find(x => x.id === t.santriId);
                if (s) pihakTerkait = `<span class="font-bold text-gray-800 uppercase">${s.nama}</span><div class="text-[10px] text-gray-500 font-mono mt-0.5">${s.nis} (Santri)</div>`;
            } else if (t.pembayar) {
                pihakTerkait = `<span class="font-bold text-gray-800 uppercase">${t.pembayar}</span><div class="text-[10px] text-emerald-600 font-semibold mt-0.5">Umum / Wali</div>`;
            }
        } else if (t.type === 'out') {
            pihakTerkait = `<span class="font-bold text-gray-800 uppercase">${t.pj || '-'}</span><div class="text-[10px] bg-indigo-50 text-indigo-600 inline-block px-1.5 py-0.5 rounded mt-1 font-bold">${t.divisi || (t.subJenis ? 'Pos ' + t.subJenis : 'Umum')}</div>`;
        }

        let badgeSubKategori = '';
        if (t.subJenis) {
            badgeSubKategori = `<span class="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200 ml-1.5">${t.subJenis}</span>`;
        }

        const isTransfer = (t.metode === 'Transfer');
        const badgeMetode = isTransfer 
            ? `<span class="px-2.5 py-1 text-[11px] rounded-lg font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5"><i class="fas fa-university text-[10px]"></i> Transfer</span>`
            : `<span class="px-2.5 py-1 text-[11px] rounded-lg font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5"><i class="fas fa-money-bill-wave text-[10px]"></i> Tunai</span>`;

        return `<tr class="hover:bg-gray-50 border-b border-gray-50 transition-colors">
            <td class="p-4 text-gray-600"><div class="font-bold text-gray-800">${new Date(t.date).toLocaleDateString('id-ID')}</div><div class="font-mono text-[10px] text-gray-400 mt-0.5">${t.id}</div></td>
            <td class="p-4 uppercase">${pihakTerkait}</td>
            <td class="p-4 text-sm"><div class="font-bold text-gray-700 flex items-center">${t.kategori}${badgeSubKategori}</div><div class="uppercase text-gray-500 text-xs mt-0.5">${t.desc}</div></td>
            <td class="p-4 text-center"><span class="px-3 py-1 text-[10px] border rounded-lg font-bold uppercase tracking-widest ${t.type === 'in' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'}">${t.type === 'in' ? 'Masuk' : 'Keluar'}</span></td>
            <td class="p-4 text-center">${badgeMetode}</td>
            <td class="p-4 text-right font-extrabold text-lg font-mono ${t.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}">${t.type === 'in' ? '+' : '-'} ${formatRupiah(t.amount)}</td>
            <td class="p-4 text-center"><button onclick="hapusTransaksi('${t.id}')" class="text-gray-400 hover:text-rose-600 p-2 transition-colors" title="Hapus"><i class="fas fa-trash-alt"></i></button></td>
        </tr>`;
    }).join('') : '<tr><td colspan="7" class="p-10 text-center text-gray-400"><i class="fas fa-history text-3xl mb-2 text-gray-300"></i><p>Tidak ada riwayat transaksi yang cocok</p></td></tr>'; 

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls({
            containerId: 'pagination-riwayat',
            totalItems: totalItems,
            currentPage: paged.currentPage,
            pageSize: pageSize,
            onPageChange: 'gantiHalamanRiwayat'
        });
    }
}

// Render Kartu Pilihan Laporan di Halaman Laporan Utama
function renderLaporanRekap() {
    const container = document.getElementById('container-kartu-laporan');
    if (!container) return;

    let cards = `
        <!-- Kartu Laporan Syahriah -->
        <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer relative overflow-hidden group" onclick="bukaHalamanLaporanDetail('Syahriah')">
            <div class="absolute -right-6 -top-6 w-32 h-32 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-700 z-0"></div>
            <div class="relative z-10">
                <div class="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl mb-4 shadow-sm"><i class="fas fa-file-invoice-dollar"></i></div>
                <h3 class="text-xl font-bold text-gray-800">Laporan Syahriah</h3>
                <p class="text-sm text-gray-500 mt-1">Rekapitulasi status pembayaran & tunggakan SPP bulanan.</p>
                <div class="mt-6 text-sm font-bold text-indigo-600 group-hover:translate-x-2 transition-transform flex items-center gap-2">Buka Laporan <i class="fas fa-arrow-right"></i></div>
            </div>
        </div>

        <!-- Kartu Laporan Pembayaran Lain -->
        <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer relative overflow-hidden group" onclick="bukaHalamanLaporanDetail('Pembayaran Lain')">
            <div class="absolute -right-6 -top-6 w-32 h-32 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-700 z-0"></div>
            <div class="relative z-10">
                <div class="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-4 shadow-sm"><i class="fas fa-hand-holding-dollar"></i></div>
                <h3 class="text-xl font-bold text-gray-800">Laporan Pembayaran Lain</h3>
                <p class="text-sm text-gray-500 mt-1">Rekap Kitab, Seragam, Pendaftaran, Infaq dll per santri.</p>
                <div class="mt-6 text-sm font-bold text-emerald-600 group-hover:translate-x-2 transition-transform flex items-center gap-2">Buka Laporan <i class="fas fa-arrow-right"></i></div>
            </div>
        </div>
    `;
    
    (appSettings.tagihanKustom || []).forEach((tk, idx) => {
        const color = colorPalette[(idx + 1) % colorPalette.length] || colorPalette[0];
        const cName = color.bg.split('-')[1]; 
        cards += `
        <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer relative overflow-hidden group" onclick="bukaHalamanLaporanDetail('${tk.nama}')">
            <div class="absolute -right-6 -top-6 w-32 h-32 ${color.bg} opacity-10 rounded-full group-hover:scale-150 transition-transform duration-700 z-0"></div>
            <div class="relative z-10">
                <div class="w-14 h-14 rounded-xl ${color.bg} bg-opacity-10 text-${cName}-600 flex items-center justify-center text-2xl mb-4 shadow-sm"><i class="fas fa-tags"></i></div>
                <h3 class="text-xl font-bold text-gray-800">Laporan ${tk.nama}</h3>
                <p class="text-sm text-gray-500 mt-1">Rekap pembayaran ${tk.nama}.</p>
                <div class="mt-6 text-sm font-bold text-gray-500 group-hover:text-gray-800 group-hover:translate-x-2 transition-transform flex items-center gap-2">Buka Laporan <i class="fas fa-arrow-right"></i></div>
            </div>
        </div>
        `;
    });
    container.innerHTML = cards;
}

// Buka Halaman Rincian Rekapitulasi Laporan Spesifik
function bukaHalamanLaporanDetail(kategori) {
    window.currentKategoriLaporan = kategori;
    const titleEl = document.getElementById('title-laporan-detail');
    if (titleEl) titleEl.innerText = 'Laporan ' + kategori;
    
    const taEl = document.getElementById('ta-laporan-detail');
    if (taEl) taEl.innerText = getTahunAjaranAktif();
    
    // Inisialisasi dropdown filter kamar
    const filterKamar = document.getElementById('lap-filter-kamar');
    if (filterKamar) {
        let kamars = [...new Set(santriData.map(s => s.kamar).filter(Boolean))].sort();
        filterKamar.innerHTML = '<option value="all">Semua Kamar</option>' + kamars.map(k => `<option value="${k}">${k}</option>`).join('');
        filterKamar.value = 'all';
    }

    // Inisialisasi dropdown filter pos Pembayaran Lain jika kategori Pembayaran Lain
    const posContainer = document.getElementById('lap-filter-pos-pl-container');
    const selPos = document.getElementById('lap-filter-pos-pl');
    if (posContainer) {
        if (kategori === 'Pembayaran Lain') {
            posContainer.classList.remove('hidden');
            if (selPos) {
                const list = appSettings.pembayaranLainList || [];
                let html = '<option value="all">Semua Pos Pembayaran Lain</option>';
                list.forEach(p => {
                    html += `<option value="${p.nama}">${p.nama}</option>`;
                });
                selPos.innerHTML = html;
                selPos.value = 'all';
            }
        } else {
            posContainer.classList.add('hidden');
        }
    }

    // Reset nilai filter pencarian
    const searchEl = document.getElementById('lap-search');
    if (searchEl) searchEl.value = '';
    const statusSantriEl = document.getElementById('lap-filter-status-santri');
    if (statusSantriEl) statusSantriEl.value = 'Aktif';
    const statusBayarEl = document.getElementById('lap-filter-status-bayar');
    if (statusBayarEl) statusBayarEl.value = 'all';

    document.getElementById('page-laporan').classList.add('hidden');
    document.getElementById('page-laporan-detail').classList.remove('hidden');
    renderIsiLaporanDetail();
}

// Render Tabel Rincian Status Kelunasan Santri & Hitung Kartu KPI
function renderIsiLaporanDetail(resetPage = false) {
    if (resetPage && window.paginationState) {
        window.paginationState.laporanDetail.page = 1;
    }
    const TA = getTahunAjaranAktif();
    const tb = document.getElementById('table-laporan-detail');
    const search = document.getElementById('lap-search') ? document.getElementById('lap-search').value.toLowerCase().trim() : '';
    const statSantri = document.getElementById('lap-filter-status-santri') ? document.getElementById('lap-filter-status-santri').value : 'all';
    const fKamar = document.getElementById('lap-filter-kamar') ? document.getElementById('lap-filter-kamar').value : 'all';
    const statBayar = document.getElementById('lap-filter-status-bayar') ? document.getElementById('lap-filter-status-bayar').value : 'all';
    const isPL = window.currentKategoriLaporan === 'Pembayaran Lain';
    const fPosPL = (isPL && document.getElementById('lap-filter-pos-pl')) ? document.getElementById('lap-filter-pos-pl').value : 'all';
    if (!tb) return;

    let dataLap = santriData.map(s => {
        let nominalTarget = 0;
        let totalBayar = 0;
        let tunggakan = 0;
        let statusLunas = false;
        let isBebas = false;
        let blnNunggakInfo = '';
        let infoKhusus = '';

        if (window.currentKategoriLaporan === 'Syahriah') {
            nominalTarget = appSettings.tarifSyahriah * 12;
            const trx = transactions.filter(t => t.santriId === s.id && t.kategori === 'Syahriah' && t.ta === TA && t.type === 'in');
            totalBayar = trx.reduce((sum, t) => sum + t.amount, 0);
            tunggakan = Math.max(0, nominalTarget - totalBayar);
            statusLunas = tunggakan <= 0;
            if (tunggakan > 0) {
                const jmlBulan = Math.ceil(tunggakan / appSettings.tarifSyahriah);
                blnNunggakInfo = `<div class="text-[10px] text-gray-500 font-medium mt-0.5">${jmlBulan} Bulan</div>`;
            }
        } else if (isPL) {
            if (fPosPL !== 'all') {
                const infoTarif = (typeof getTarifSantriPL === 'function') ? getTarifSantriPL(s.id, fPosPL) : { nominal: 0, bebas: false, isKhusus: false };
                isBebas = infoTarif.bebas;
                nominalTarget = isBebas ? 0 : infoTarif.nominal;
                if (infoTarif.bebas) infoKhusus = 'Bebas Biaya';
                else if (infoTarif.isKhusus) infoKhusus = 'Dispensasi';

                const trx = transactions.filter(t => 
                    t.santriId === s.id && 
                    t.type === 'in' && 
                    t.ta === TA && 
                    (t.subJenis === fPosPL || (t.kategori === 'Pembayaran Lain' && t.subJenis === fPosPL) || t.kategori === fPosPL)
                );
                totalBayar = trx.reduce((sum, t) => sum + t.amount, 0);
                tunggakan = isBebas ? 0 : Math.max(0, nominalTarget - totalBayar);
                statusLunas = isBebas || (nominalTarget > 0 && totalBayar >= nominalTarget);
            } else {
                // Semua Pos Pembayaran Lain
                const listPL = appSettings.pembayaranLainList || [];
                listPL.forEach(p => {
                    const infoTarif = (typeof getTarifSantriPL === 'function') ? getTarifSantriPL(s.id, p.nama) : { nominal: p.nominal, bebas: false };
                    if (!infoTarif.bebas) {
                        nominalTarget += infoTarif.nominal;
                    }
                });

                const trx = transactions.filter(t => t.santriId === s.id && t.kategori === 'Pembayaran Lain' && t.ta === TA && t.type === 'in');
                totalBayar = trx.reduce((sum, t) => sum + t.amount, 0);
                tunggakan = Math.max(0, nominalTarget - totalBayar);
                statusLunas = (nominalTarget === 0) || (totalBayar >= nominalTarget);
            }
        } else {
            // Tagihan Kustom (Ikhtibar dll)
            const infoTarifKustom = (typeof getTarifSantriKustom === 'function') 
                ? getTarifSantriKustom(s.id, window.currentKategoriLaporan) 
                : { isKhusus: false, nominal: 0, bebas: false };

            if (infoTarifKustom.isKhusus) {
                isBebas = infoTarifKustom.bebas;
                nominalTarget = infoTarifKustom.bebas ? 0 : infoTarifKustom.nominal;
                infoKhusus = infoTarifKustom.bebas ? '(Bebas Biaya)' : `(Tarif Khusus: ${formatRupiah(infoTarifKustom.nominal)})`;
            } else {
                const kustom = (appSettings.tagihanKustom || []).find(k => k.nama === window.currentKategoriLaporan);
                nominalTarget = kustom ? kustom.nominal : 0;
            }

            const trx = transactions.filter(t => t.santriId === s.id && t.kategori === window.currentKategoriLaporan && t.ta === TA && t.type === 'in');
            totalBayar = trx.reduce((sum, t) => sum + t.amount, 0);
            tunggakan = Math.max(0, nominalTarget - totalBayar);
            statusLunas = (nominalTarget === 0) || (tunggakan <= 0);
        }

        return {
            ...s,
            nominalTarget,
            totalBayar,
            tunggakan,
            statusLunas,
            isBebas,
            blnNunggakInfo,
            infoKhusus
        };
    });

    if (statSantri !== 'all') dataLap = dataLap.filter(s => s.status === statSantri);
    if (fKamar !== 'all') dataLap = dataLap.filter(s => s.kamar === fKamar);
    if (search) dataLap = dataLap.filter(s => (s.nama || '').toLowerCase().includes(search) || (s.nis || '').toLowerCase().includes(search));
    if (statBayar === 'Lunas') dataLap = dataLap.filter(s => s.statusLunas);
    if (statBayar === 'Belum Lunas') dataLap = dataLap.filter(s => !s.statusLunas);

    // Hitung & Perbarui Kartu KPI
    const kpiTarget = dataLap.reduce((sum, s) => sum + s.nominalTarget, 0);
    const kpiTerbayar = dataLap.reduce((sum, s) => sum + s.totalBayar, 0);
    const kpiTunggakan = dataLap.reduce((sum, s) => sum + s.tunggakan, 0);

    const elKpiTarget = document.getElementById('lap-card-target');
    const elKpiTerbayar = document.getElementById('lap-card-terbayar');
    const elKpiTunggakan = document.getElementById('lap-card-tunggakan');

    if (elKpiTarget) elKpiTarget.innerText = formatRupiah(kpiTarget);
    if (elKpiTerbayar) elKpiTerbayar.innerText = formatRupiah(kpiTerbayar);
    if (elKpiTunggakan) elKpiTunggakan.innerText = formatRupiah(kpiTunggakan);

    // Simpan dataset hasil filter untuk ekspor penuh
    window.currentFilteredDataLap = dataLap;

    const totalItems = dataLap.length;
    const page = window.paginationState ? window.paginationState.laporanDetail.page : 1;
    const pageSize = (window.paginationState && window.paginationState.laporanDetail.pageSize) || 20;

    const paged = typeof paginateArray === 'function'
        ? paginateArray(dataLap, page, pageSize)
        : { items: dataLap.slice(0, 20), total: totalItems, currentPage: 1, totalPages: 1, startIndex: 0 };

    if (window.paginationState) {
        window.paginationState.laporanDetail.page = paged.currentPage;
    }

    tb.innerHTML = paged.items.length ? paged.items.map((s, i) => {
        let badgeStatus = '';
        if (s.isBebas) {
            badgeStatus = `<span class="px-3 py-1.5 text-[10px] border border-purple-200 text-purple-700 bg-purple-50 rounded-lg font-bold uppercase tracking-wider inline-flex items-center gap-1"><i class="fas fa-gift text-[9px]"></i> Bebas</span>`;
        } else if (s.statusLunas) {
            badgeStatus = `<span class="px-3 py-1.5 text-[10px] border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg font-bold uppercase tracking-wider inline-flex items-center gap-1"><i class="fas fa-check-circle text-[9px]"></i> Lunas</span>`;
        } else if (s.totalBayar > 0) {
            badgeStatus = `<span class="px-3 py-1.5 text-[10px] border border-amber-200 text-amber-700 bg-amber-50 rounded-lg font-bold uppercase tracking-wider inline-flex items-center gap-1"><i class="fas fa-clock text-[9px]"></i> Cicilan</span>`;
        } else {
            badgeStatus = `<span class="px-3 py-1.5 text-[10px] border border-rose-200 text-rose-700 bg-rose-50 rounded-lg font-bold uppercase tracking-wider inline-flex items-center gap-1"><i class="fas fa-times-circle text-[9px]"></i> Belum Lunas</span>`;
        }

        return `
        <tr class="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
            <td class="px-6 py-4 text-gray-500">${paged.startIndex + i + 1}</td>
            <td class="px-6 py-4">
                <div class="font-bold text-gray-800 uppercase flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">${s.nama ? s.nama.charAt(0) : '?'}</span>
                    ${s.nama}
                </div>
                <div class="text-[10px] font-mono text-gray-400 mt-0.5 ml-9">${s.nis || '-'}</div>
            </td>
            <td class="px-6 py-4 text-gray-600 font-medium">${s.kamar || '-'}</td>
            <td class="px-6 py-4 font-mono font-bold text-gray-700 text-sm">
                ${formatRupiah(s.nominalTarget)}
                ${s.infoKhusus ? `<div class="text-[10px] text-amber-600 font-bold mt-0.5">${s.infoKhusus}</div>` : ''}
            </td>
            <td class="px-6 py-4 font-mono font-bold text-emerald-600 text-sm">
                ${formatRupiah(s.totalBayar)}
            </td>
            <td class="px-6 py-4 font-mono font-bold ${s.tunggakan > 0 ? 'text-rose-600' : 'text-gray-400'} text-sm">
                ${s.tunggakan > 0 ? formatRupiah(s.tunggakan) : '<span class="text-emerald-500 font-normal">Rp 0</span>'}
                ${s.blnNunggakInfo || ''}
            </td>
            <td class="px-6 py-4 text-center">
                ${badgeStatus}
            </td>
            <td class="px-6 py-4 text-center whitespace-nowrap">
                ${s.tunggakan > 0 ? `
                    <button type="button" onclick="kirimPengingatTagihanWA('${s.id}', '${window.currentKategoriLaporan}', ${s.tunggakan})" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer" title="Kirim Tagihan via WhatsApp">
                        <i class="fab fa-whatsapp text-sm"></i> Tagih WA
                    </button>
                ` : `<span class="text-xs text-gray-300">-</span>`}
            </td>
        </tr>`;
    }).join('') : `<tr><td colspan="8" class="p-10 text-center text-gray-400"><i class="fas fa-file-excel text-3xl mb-2 text-gray-300"></i><p>Tidak ada data laporan yang sesuai filter</p></td></tr>`;

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls({
            containerId: 'pagination-laporan-detail',
            totalItems: totalItems,
            currentPage: paged.currentPage,
            pageSize: pageSize,
            onPageChange: 'gantiHalamanLaporanDetail'
        });
    }
}

// Ekspor Laporan Saat Ini ke Format Excel (.xlsx) atau CSV (Mencakup Semua Data Filtered)
function exportLaporanSaatIni() {
    const list = window.currentFilteredDataLap || [];
    if (list.length === 0) {
        return showToast("Tidak ada data laporan untuk diekspor!", "warning");
    }

    const kategori = window.currentKategoriLaporan || 'Keuangan';
    const ta = getTahunAjaranAktif();
    const isSyahriah = kategori === 'Syahriah';
    const isPL = kategori === 'Pembayaran Lain';
    const fPos = (isPL && document.getElementById('lap-filter-pos-pl')) ? document.getElementById('lap-filter-pos-pl').value : 'all';

    let titleSuffix = (isPL && fPos !== 'all') ? `_${fPos}` : '';
    const fileName = `Laporan_${kategori}${titleSuffix}_${ta.replace('/', '_')}`;

    const headers = ["No", "NIS", "Nama Santri", "Kamar", "Nama Wali", "No. WA Wali", "Total Tagihan", "Sudah Dibayar", "Sisa Tunggakan", "Status Kelunasan"];
    if (isSyahriah) headers.push("Tunggakan (Bulan)");

    let exportRows = [];
    list.forEach((s, idx) => {
        let statusStr = s.isBebas ? 'Bebas' : (s.statusLunas ? 'Lunas' : (s.totalBayar > 0 ? 'Cicilan' : 'Belum Lunas'));
        let rowData = [
            idx + 1,
            s.nis || '-',
            s.nama || '-',
            s.kamar || '-',
            s.namaWali || '-',
            s.noHpWali || '-',
            formatRupiah(s.nominalTarget),
            formatRupiah(s.totalBayar),
            formatRupiah(s.tunggakan),
            statusStr
        ];
        if (isSyahriah) {
            let bln = s.tunggakan > 0 ? Math.ceil(s.tunggakan / appSettings.tarifSyahriah) : 0;
            rowData.push(bln + " Bulan");
        }
        exportRows.push(rowData);
    });

    if (window.XLSX) {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...exportRows]);
        ws['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 16 }];
        if (isSyahriah) ws['!cols'].push({ wch: 16 });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
        let csvLines = [headers.join(",")];
        exportRows.forEach(r => csvLines.push(r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(",")));
        const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.csv`;
        link.click();
    }
    showToast("Laporan berhasil diekspor");
}

// Kirim Pengingat Tagihan Pembayaran via WhatsApp
function kirimPengingatTagihanWA(santriId, kategori, tunggakan) {
    const santri = (santriData || []).find(s => s.id === santriId);
    if (!santri) {
        return showToast("Data santri tidak ditemukan!", "error");
    }

    const buatPesan = () => {
        const ta = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '';
        const namaPesantren = (appSettings && appSettings.namaPesantren) || 'PONDOK PESANTREN AL-USYMUNI';
        const waliGreeting = santri.namaWali ? `Bpk/Ibu *${santri.namaWali}* (Wali dari *${santri.nama}*)` : `Bpk/Ibu Wali dari *${santri.nama}*`;

        return `*PEMBERITAHUAN ADMINISTRASI KEUANGAN*\n` +
               `*${namaPesantren.toUpperCase()}*\n` +
               `================================\n\n` +
               `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
               `Kepada Yth. ${waliGreeting},\n` +
               `Semoga Bapak/Ibu sekeluarga senantiasa berada dalam lindungan dan limpahan rahmat Allah SWT.\n\n` +
               `Kami dari bagian keuangan ingin menyampaikan informasi terkait kewajiban administrasi santri berikut:\n\n` +
               `*Nama Santri:* ${santri.nama}\n` +
               `*NIS:* ${santri.nis || '-'}\n` +
               `*Kamar / Kelas:* ${santri.kamar || '-'}\n` +
               `*Tahun Ajaran:* ${ta}\n` +
               `*Pos Kewajiban:* ${kategori || 'Administrasi'}\n` +
               `*Sisa Tunggakan:* *${formatRupiah(tunggakan)}*\n\n` +
               `Mohon kiranya Bapak/Ibu dapat melakukan pelunasan administrasi tersebut di kantor bendahara pesantren atau via transfer.\n\n` +
               `_Apabila Bapak/Ibu telah melakukan pembayaran atau terdapat kekeliruan pencatatan, mohon konfirmasi dengan membalas pesan ini atau mengirimkan bukti transfer._\n\n` +
               `Jazakumullahu Khairan Katsiran.\n` +
               `Wassalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
               `_Pengurus Keuangan / Bendahara Pesantren_`;
    };

    const kirimKeNo = (rawPhone) => {
        const phone = rawPhone.replace(/\D/g, '').replace(/^0/, '62');
        const pesan = buatPesan();
        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(pesan)}`, '_blank');
        if (typeof showToast === 'function') {
            showToast("Membuka WhatsApp ke nomor wali...");
        }
    };

    if (santri.noHpWali && santri.noHpWali.trim()) {
        kirimKeNo(santri.noHpWali);
    } else {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Kirim Tagihan via WhatsApp',
                html: `
                    <div class="text-left text-xs text-gray-600 mb-3 space-y-1">
                        <p>Santri: <b class="text-gray-900">${santri.nama}</b> (${santri.kamar || '-'})</p>
                        <p>Tunggakan: <b class="text-rose-600">${formatRupiah(tunggakan)}</b> (${kategori})</p>
                        <p class="text-gray-500 mt-2">Nomor WhatsApp wali belum tersimpan. Masukkan nomor WhatsApp untuk mengirim tagihan:</p>
                    </div>
                `,
                input: 'tel',
                inputPlaceholder: 'Contoh: 08123456789 atau 628123456789',
                inputValue: santri.noHpWali || '',
                showCancelButton: true,
                confirmButtonText: '<i class="fab fa-whatsapp mr-1"></i> Buka WhatsApp',
                confirmButtonColor: '#25D366',
                cancelButtonText: 'Batal',
                inputValidator: (val) => {
                    if (!val || val.trim().length < 8) {
                        return 'Masukkan nomor WhatsApp yang valid!';
                    }
                }
            }).then((res) => {
                if (res.isConfirmed && res.value) {
                    santri.noHpWali = res.value.trim();
                    if (typeof saveDataToStorage === 'function') saveDataToStorage();
                    if (typeof renderSemuaTabel === 'function') renderSemuaTabel();
                    kirimKeNo(res.value);
                }
            });
        } else {
            const noInput = prompt(`Nomor WhatsApp wali untuk ${santri.nama} (contoh: 08123456789):`);
            if (noInput) {
                santri.noHpWali = noInput.trim();
                if (typeof saveDataToStorage === 'function') saveDataToStorage();
                kirimKeNo(noInput);
            }
        }
    }
}

// Expose ke global window
window.renderLaporan = renderLaporan;
window.renderLaporanRekap = renderLaporanRekap;
window.bukaHalamanLaporanDetail = bukaHalamanLaporanDetail;
window.renderIsiLaporanDetail = renderIsiLaporanDetail;
window.exportLaporanSaatIni = exportLaporanSaatIni;
window.kirimPengingatTagihanWA = kirimPengingatTagihanWA;
