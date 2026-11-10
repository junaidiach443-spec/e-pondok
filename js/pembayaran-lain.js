/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Pembayaran Lain-Lain Module
 * Manajemen pembayaran non-syahriah berbasis data santri, filter kamar,
 * pengaturan santri khusus (tarif dispensasi/bebas), struk thermal & riwayat
 * ==========================================================================
 */

// Tab aktif saat ini: 'santri' (Daftar Santri) atau 'riwayat' (Riwayat Transaksi)
let currentTabPL = 'santri';

// Render Utama Halaman Pembayaran Lain
function renderPembayaranLainPage() {
    // 1. Sinkronisasi dropdown jenis pembayaran yang aktif
    updateDropdownJenisPembayaranLain();

    // 2. Pastikan jenis pembayaran aktif valid
    const list = appSettings.pembayaranLainList || [];
    if (list.length === 0) {
        tampilkanStateBelumAdaJenisPL();
        return;
    }

    if (!window.currentSelectedJenisPL || !list.some(i => i.nama === window.currentSelectedJenisPL)) {
        window.currentSelectedJenisPL = list[0].nama;
    }

    const selJenis = document.getElementById('select-active-jenis-pl');
    if (selJenis) selJenis.value = window.currentSelectedJenisPL;

    // Pastikan struktur tabel santri kembali jika sebelumnya state kosong
    pastikanStrukturTabelSantriPL();

    // 3. Update info ringkasan tarif standar jenis aktif
    updateInfoTarifStandarPL();

    // 4. Update dropdown filter kamar
    updateFilterKamarPLDropdown();

    // 5. Render konten sesuai tab aktif
    if (currentTabPL === 'santri') {
        renderSantriPLTable();
    } else {
        renderRiwayatPLTable();
    }
}

// Beralih Tab (Daftar Santri vs Riwayat Transaksi)
function switchTabPL(tabName) {
    currentTabPL = tabName;
    const tabSantriBtn = document.getElementById('tab-btn-santri-pl');
    const tabRiwayatBtn = document.getElementById('tab-btn-riwayat-pl');
    const viewSantri = document.getElementById('view-santri-pl');
    const viewRiwayat = document.getElementById('view-riwayat-pl');

    if (tabName === 'santri') {
        if (tabSantriBtn) {
            tabSantriBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white shadow-sm flex items-center gap-2 transition-all";
        }
        if (tabRiwayatBtn) {
            tabRiwayatBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center gap-2 transition-all";
        }
        if (viewSantri) viewSantri.classList.remove('hidden');
        if (viewRiwayat) viewRiwayat.classList.add('hidden');
        renderSantriPLTable();
    } else {
        if (tabSantriBtn) {
            tabSantriBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center gap-2 transition-all";
        }
        if (tabRiwayatBtn) {
            tabRiwayatBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white shadow-sm flex items-center gap-2 transition-all";
        }
        if (viewSantri) viewSantri.classList.add('hidden');
        if (viewRiwayat) viewRiwayat.classList.remove('hidden');
        renderRiwayatPLTable();
    }
}

// Perbarui Pilihan Dropdown Jenis Pembayaran Lain
function updateDropdownJenisPembayaranLain() {
    const sel = document.getElementById('select-active-jenis-pl');
    if (!sel) return;

    const list = appSettings.pembayaranLainList || [];
    if (list.length === 0) {
        sel.innerHTML = '<option value="">Belum ada jenis pembayaran</option>';
        return;
    }

    sel.innerHTML = list.map(item => `
        <option value="${item.nama}" ${item.nama === window.currentSelectedJenisPL ? 'selected' : ''}>
            ${item.nama} (${formatRupiah(item.nominal)})
        </option>
    `).join('');
}

// Ganti Jenis Pembayaran Lain Aktif
function gantiJenisPL(jenisNama) {
    const list = appSettings.pembayaranLainList || [];
    if (!jenisNama || !list.some(i => i.nama === jenisNama)) {
        if (list.length > 0) {
            jenisNama = list[0].nama;
        } else {
            tampilkanStateBelumAdaJenisPL();
            return;
        }
    }
    window.currentSelectedJenisPL = jenisNama;
    pastikanStrukturTabelSantriPL();
    updateInfoTarifStandarPL();
    if (currentTabPL === 'santri') {
        renderSantriPLTable();
    } else {
        renderRiwayatPLTable();
    }
}

// Update Banner Info Tarif Standar
function updateInfoTarifStandarPL() {
    const list = appSettings.pembayaranLainList || [];
    const item = list.find(i => i.nama === window.currentSelectedJenisPL);
    
    const elTarif = document.getElementById('info-tarif-standar-pl');
    const elKet = document.getElementById('info-keterangan-pl');
    const elTitle = document.getElementById('title-active-jenis-pl');

    if (item) {
        if (elTarif) elTarif.innerText = formatRupiah(item.nominal);
        if (elKet) elKet.innerText = item.keterangan || 'Tidak ada keterangan';
        if (elTitle) elTitle.innerText = item.nama;
    } else {
        if (elTarif) elTarif.innerText = 'Rp 0';
        if (elKet) elKet.innerText = '-';
        if (elTitle) elTitle.innerText = 'Pembayaran Lain';
    }
}

// Update Dropdown Filter Kamar
function updateFilterKamarPLDropdown() {
    const selKamar = document.getElementById('filter-kamar-pl');
    if (!selKamar) return;

    const currentVal = selKamar.value || 'all';
    let kamars = [...new Set(santriData.map(s => s.kamar).filter(Boolean))].sort();

    let html = '<option value="all">Semua Kamar</option>';
    kamars.forEach(k => {
        html += `<option value="${k}" ${k === currentVal ? 'selected' : ''}>Kamar ${k}</option>`;
    });
    selKamar.innerHTML = html;
}

// Render Tabel Santri untuk Jenis Pembayaran yang Dipilih
function renderSantriPLTable() {
    const listPL = appSettings.pembayaranLainList || [];
    if (listPL.length === 0) {
        tampilkanStateBelumAdaJenisPL();
        return;
    }

    pastikanStrukturTabelSantriPL();

    const tb = document.getElementById('table-santri-pl');
    if (!tb) return;

    let jenisAktif = window.currentSelectedJenisPL;
    if (!jenisAktif || !listPL.some(i => i.nama === jenisAktif)) {
        jenisAktif = listPL[0].nama;
        window.currentSelectedJenisPL = jenisAktif;
        updateDropdownJenisPembayaranLain();
        updateInfoTarifStandarPL();
    }

    const filterKamar = document.getElementById('filter-kamar-pl') ? document.getElementById('filter-kamar-pl').value : 'all';
    const filterStatus = document.getElementById('filter-status-pl') ? document.getElementById('filter-status-pl').value : 'all';
    const search = document.getElementById('search-santri-pl') ? document.getElementById('search-santri-pl').value.toLowerCase().trim() : '';

    const TA = getTahunAjaranAktif();

    // Ambil santri aktif
    let listSantri = santriData.filter(s => s.status === 'Aktif').sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));

    // Filter Kamar
    if (filterKamar !== 'all') {
        listSantri = listSantri.filter(s => s.kamar === filterKamar);
    }

    // Filter Pencarian (Nama / NIS)
    if (search) {
        listSantri = listSantri.filter(s => s.nama.toLowerCase().includes(search) || s.nis.toLowerCase().includes(search));
    }

    // Hitung Metrik & Status Tiap Santri
    let totalTargetSemua = 0;
    let totalTerkumpulSemua = 0;
    let countLunas = 0;
    let countSantriKhusus = 0;

    const santriWithStatus = listSantri.map(s => {
        // Cek apakah santri memiliki tarif khusus
        const infoTarif = getTarifSantriPL(s.id, jenisAktif);
        const tagihan = infoTarif.nominal;
        const isBebas = infoTarif.bebas;
        const isKhusus = infoTarif.isKhusus;

        if (isKhusus) countSantriKhusus++;

        // Cari transaksi pembayaran santri untuk jenis ini pada TA yang aktif
        const trx = transactions.filter(t => 
            t.santriId === s.id && 
            t.type === 'in' && 
            t.ta === TA &&
            (t.subJenis === jenisAktif || t.kategori === jenisAktif || (t.kategori === 'Pembayaran Lain' && t.subJenis === jenisAktif))
        );

        const sudahBayar = trx.reduce((sum, t) => sum + t.amount, 0);
        const sisa = Math.max(0, tagihan - sudahBayar);

        let statusCode = 'belum';
        let statusBadge = '';

        if (infoTarif.tidakDitargetkan) {
            statusCode = 'non_target';
            statusBadge = `<span class="px-3 py-1 bg-gray-100 text-gray-500 border border-gray-200 text-xs font-medium rounded-lg inline-flex items-center gap-1.5"><i class="fas fa-ban text-[11px] text-gray-400"></i> Bukan Sasaran</span>`;
        } else if (isBebas) {
            statusCode = 'bebas';
            statusBadge = `<span class="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg inline-flex items-center gap-1.5"><i class="fas fa-gift text-[11px]"></i> Bebas Biaya</span>`;
        } else if (tagihan > 0 && sudahBayar >= tagihan) {
            statusCode = 'lunas';
            countLunas++;
            statusBadge = `<span class="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg inline-flex items-center gap-1.5"><i class="fas fa-check-circle text-[11px]"></i> Lunas</span>`;
        } else if (sudahBayar > 0) {
            statusCode = 'cicil';
            statusBadge = `<span class="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg inline-flex items-center gap-1.5"><i class="fas fa-clock text-[11px]"></i> Belum Lunas</span>`;
        } else {
            statusCode = 'belum';
            statusBadge = `<span class="px-3 py-1 bg-gray-100 text-gray-500 border border-gray-200 text-xs font-medium rounded-lg inline-flex items-center gap-1.5"><i class="fas fa-hourglass-start text-[11px]"></i> Belum Bayar</span>`;
        }

        totalTargetSemua += tagihan;
        totalTerkumpulSemua += sudahBayar;

        return {
            santri: s,
            infoTarif,
            tagihan,
            sudahBayar,
            sisa,
            statusCode,
            statusBadge,
            trxCount: trx.length
        };
    });

    // Filter berdasarkan status jika dipilih
    let filteredList = santriWithStatus;
    if (filterStatus === 'lunas') {
        filteredList = filteredList.filter(item => item.statusCode === 'lunas' || item.statusCode === 'bebas');
    } else if (filterStatus === 'belum') {
        filteredList = filteredList.filter(item => item.statusCode === 'belum' || item.statusCode === 'cicil');
    } else if (filterStatus === 'khusus') {
        filteredList = filteredList.filter(item => item.infoTarif.isKhusus && !item.infoTarif.tidakDitargetkan);
    } else if (filterStatus === 'non_target') {
        filteredList = filteredList.filter(item => item.statusCode === 'non_target');
    }

    // Update Kartu KPI Header
    const elKpiTotal = document.getElementById('kpi-total-tagihan-pl');
    if (elKpiTotal) elKpiTotal.innerText = formatRupiah(totalTargetSemua);

    const elKpiTerkumpul = document.getElementById('kpi-terkumpul-pl');
    if (elKpiTerkumpul) elKpiTerkumpul.innerText = formatRupiah(totalTerkumpulSemua);

    const elKpiSisa = document.getElementById('kpi-sisa-piutang-pl');
    const totalSisa = Math.max(0, totalTargetSemua - totalTerkumpulSemua);
    if (elKpiSisa) elKpiSisa.innerText = formatRupiah(totalSisa);

    const elKpiPersen = document.getElementById('kpi-persen-lunas-pl');
    const targetCount = santriWithStatus.filter(i => !i.infoTarif.tidakDitargetkan).length;
    const persen = totalTargetSemua > 0 ? Math.min(100, Math.round((totalTerkumpulSemua / totalTargetSemua) * 100)) : 100;
    if (elKpiPersen) elKpiPersen.innerText = `${persen}% (${countLunas}/${targetCount} Sasaran)`;

    // Render Tabel dengan Pagination 20 Data
    const totalItems = filteredList.length;
    const page = window.paginationState ? window.paginationState.santriPL.page : 1;
    const pageSize = (window.paginationState && window.paginationState.santriPL.pageSize) || 20;

    const paged = typeof paginateArray === 'function'
        ? paginateArray(filteredList, page, pageSize)
        : { items: filteredList.slice(0, 20), total: totalItems, currentPage: 1, totalPages: 1 };

    if (window.paginationState) {
        window.paginationState.santriPL.page = paged.currentPage;
    }

    if (filteredList.length === 0) {
        tb.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-400">
                    <i class="fas fa-users-slash text-3xl mb-3 text-gray-300"></i>
                    <p class="font-medium text-gray-600">Tidak ada data santri yang cocok dengan filter.</p>
                    <p class="text-xs text-gray-400 mt-1">Coba sesuaikan pilihan kamar atau kata kunci pencarian.</p>
                </td>
            </tr>
        `;
        if (typeof renderPaginationControls === 'function') {
            renderPaginationControls({
                containerId: 'pagination-santri-pl',
                totalItems: 0,
                currentPage: 1,
                pageSize: pageSize,
                onPageChange: 'gantiHalamanSantriPL'
            });
        }
        return;
    }

    tb.innerHTML = paged.items.map(item => {
        const s = item.santri;
        const info = item.infoTarif;

        // Tampilan Tagihan (Standar vs Khusus vs Bukan Sasaran)
        let tagihanHtml = '';
        if (info.tidakDitargetkan) {
            tagihanHtml = `
                <div>
                    <span class="font-bold text-gray-400 text-sm font-mono">-</span>
                    <div class="text-[10px] text-gray-500 font-medium bg-gray-100 inline-block px-1.5 py-0.5 rounded mt-0.5">
                        <i class="fas fa-ban text-[9px] mr-0.5 text-gray-400"></i> ${info.keterangan || 'Bukan Sasaran'}
                    </div>
                </div>
            `;
        } else if (info.bebas) {
            tagihanHtml = `
                <div>
                    <span class="font-extrabold text-purple-700 text-sm font-mono">Rp 0</span>
                    <div class="text-[10px] text-purple-600 font-bold bg-purple-50 inline-block px-1.5 py-0.5 rounded mt-0.5" title="${info.keterangan || 'Bebas'}">
                        <i class="fas fa-star text-[9px]"></i> Bebas: ${info.keterangan || 'Khusus'}
                    </div>
                </div>
            `;
        } else if (info.isKhusus) {
            tagihanHtml = `
                <div>
                    <span class="font-extrabold text-amber-700 text-sm font-mono">${formatRupiah(info.nominal)}</span>
                    <div class="text-[10px] text-amber-600 font-bold bg-amber-50 inline-block px-1.5 py-0.5 rounded mt-0.5" title="${info.keterangan || 'Tarif Khusus'}">
                        <i class="fas fa-tag text-[9px]"></i> Khusus: ${info.keterangan || 'Dispensasi'}
                    </div>
                </div>
            `;
        } else {
            tagihanHtml = `
                <div>
                    <span class="font-extrabold text-gray-800 text-sm font-mono">${formatRupiah(info.nominal)}</span>
                    <div class="text-[10px] text-gray-400 font-medium">Standar</div>
                </div>
            `;
        }

        return `
            <tr class="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl ${info.tidakDitargetkan ? 'bg-gray-100 text-gray-400' : (info.isKhusus ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700')} flex items-center justify-center font-bold text-sm shrink-0">
                            ${s.nama.charAt(0)}
                        </div>
                        <div>
                            <div class="font-bold text-gray-800 uppercase text-sm">${s.nama}</div>
                            <div class="text-[11px] text-gray-500 font-mono">NIS: ${s.nis}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg font-mono">
                        ${s.kamar || '-'}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    ${tagihanHtml}
                </td>
                <td class="px-6 py-4 text-right">
                    <span class="font-bold ${item.sudahBayar > 0 ? 'text-blue-600' : 'text-gray-400'} text-sm font-mono">
                        ${formatRupiah(item.sudahBayar)}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <span class="font-bold ${item.sisa > 0 ? 'text-rose-600' : 'text-gray-400'} text-sm font-mono">
                        ${formatRupiah(item.sisa)}
                    </span>
                </td>
                <td class="px-6 py-4 text-center">
                    ${item.statusBadge}
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <!-- Tombol Bayar -->
                        <button onclick="bukaModalBayarSantriPL('${s.id}')" class="px-3 py-1.5 rounded-lg ${info.tidakDitargetkan ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-blue-600 hover:bg-blue-700 text-white'} font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5" title="Catat Pembayaran">
                            <i class="fas fa-hand-holding-usd text-xs"></i> Bayar
                        </button>
                        <!-- Tombol Edit Khusus -->
                        <button onclick="bukaModalEditKhususPL('${s.id}')" class="px-2.5 py-1.5 rounded-lg ${info.isKhusus && !info.tidakDitargetkan ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} font-bold text-xs transition-colors flex items-center gap-1" title="Atur Santri Khusus (Dispensasi/Bebas)">
                            <i class="fas fa-sliders-h text-xs"></i>
                            <span class="hidden sm:inline">Khusus</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls({
            containerId: 'pagination-santri-pl',
            totalItems: totalItems,
            currentPage: paged.currentPage,
            pageSize: pageSize,
            onPageChange: 'gantiHalamanSantriPL'
        });
    }
}

// ==========================================================================
// Modal Bayar Santri (1-Click Bayar)
// ==========================================================================

function bukaModalBayarSantriPL(santriId) {
    const s = santriData.find(x => x.id === santriId);
    if (!s) return;

    const jenisAktif = window.currentSelectedJenisPL;
    const infoTarif = getTarifSantriPL(s.id, jenisAktif);

    // Ambil histori pembayaran sebelumnya pada TA aktif
    const TA = getTahunAjaranAktif();
    const trx = transactions.filter(t => 
        t.santriId === s.id && 
        t.type === 'in' && 
        t.ta === TA &&
        (t.subJenis === jenisAktif || t.kategori === jenisAktif || (t.kategori === 'Pembayaran Lain' && t.subJenis === jenisAktif))
    );

    const sudahBayar = trx.reduce((sum, t) => sum + t.amount, 0);
    const tagihan = infoTarif.nominal;
    const sisa = Math.max(0, tagihan - sudahBayar);

    // Isi Form Modal
    document.getElementById('bayar-pl-santri-id').value = s.id;
    document.getElementById('bayar-pl-santri-nama').innerText = s.nama;
    document.getElementById('bayar-pl-santri-nis').innerText = `NIS: ${s.nis} • Kamar ${s.kamar || '-'}`;
    document.getElementById('bayar-pl-jenis-nama').innerText = jenisAktif;
    document.getElementById('bayar-pl-tagihan').innerText = infoTarif.tidakDitargetkan ? 'Rp 0 (Bukan Sasaran)' : (infoTarif.bebas ? 'Rp 0 (Bebas Biaya)' : formatRupiah(tagihan));
    document.getElementById('bayar-pl-sudah-bayar').innerText = formatRupiah(sudahBayar);
    document.getElementById('bayar-pl-sisa').innerText = formatRupiah(sisa);

    // Isi nominal default dengan sisa tagihan (atau tarif standar jika sisa 0)
    const nominalDefault = sisa > 0 ? sisa : (infoTarif.bebas ? 0 : tagihan);
    document.getElementById('bayar-pl-nominal').value = nominalDefault;
    document.getElementById('bayar-pl-tanggal').value = new Date().toLocaleDateString('en-CA');
    document.getElementById('bayar-pl-keterangan').value = sisa <= nominalDefault ? 'Lunas' : 'Cicilan';

    bukaModal('modal-bayar-santri-pl');
}

// Simpan Pembayaran Santri
function simpanBayarSantriPL() {
    const santriId = document.getElementById('bayar-pl-santri-id').value;
    const inputNominal = document.getElementById('bayar-pl-nominal');
    const inputTanggal = document.getElementById('bayar-pl-tanggal');
    const inputKet = document.getElementById('bayar-pl-keterangan');

    const s = santriData.find(x => x.id === santriId);
    if (!s) return showToast("Santri tidak ditemukan", "error");

    const nominal = parseInt(inputNominal.value);
    if (isNaN(nominal) || nominal <= 0) {
        return showToast("Nominal bayar harus lebih dari 0!", "error");
    }

    const jenisAktif = window.currentSelectedJenisPL;
    const tanggal = inputTanggal.value || new Date().toLocaleDateString('en-CA');
    const ket = inputKet.value.trim();
    const descText = ket ? `${jenisAktif}: ${ket}` : jenisAktif;

    const newTrxId = (typeof generateTrxId === 'function') 
        ? generateTrxId('TRX') 
        : ('TRX-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase());

    const elMetode = document.getElementById('bayar-pl-metode');
    const metodeBayar = elMetode ? elMetode.value : 'Tunai';

    const newTrx = {
        id: newTrxId,
        santriId: s.id,
        ta: getTahunAjaranAktif(),
        kategori: 'Pembayaran Lain',
        subJenis: jenisAktif,
        type: 'in',
        amount: nominal,
        desc: descText,
        metode: metodeBayar,
        date: tanggal
    };

    transactions.push(newTrx);
    saveDataToStorage();
    if (typeof triggerAutoSyncToCloud === 'function') triggerAutoSyncToCloud(true);

    tutupModal('modal-bayar-santri-pl');
    renderPembayaranLainPage();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderLaporan === 'function') renderLaporan();

    Swal.fire({
        icon: 'success',
        title: 'Pembayaran Berhasil!',
        html: `
            <div class="text-sm text-gray-600 space-y-1 mt-2">
                <p><b>Santri:</b> ${s.nama}</p>
                <p><b>Jenis:</b> ${jenisAktif}</p>
                <p><b>Nominal:</b> <span class="text-blue-600 font-bold font-mono">${formatRupiah(nominal)}</span></p>
                <p class="text-xs text-gray-400 mt-2">Apakah Anda ingin mencetak struk thermal 58mm?</p>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-print mr-1"></i> Cetak Struk',
        cancelButtonText: 'Selesai',
        confirmButtonColor: '#1d4ed8',
        cancelButtonColor: '#64748b'
    }).then((res) => {
        if (res.isConfirmed) {
            cetakStrukPembayaranLain(newTrx.id);
        }
    });
}

// ==========================================================================
// Modal Edit Santri Khusus (Dispensasi / Bebas / Tarif Khusus)
// ==========================================================================

function bukaModalEditKhususPL(santriId) {
    const s = santriData.find(x => x.id === santriId);
    if (!s) return;

    const jenisAktif = window.currentSelectedJenisPL;
    const defaultItem = (appSettings.pembayaranLainList || []).find(p => p.nama === jenisAktif);
    const standardNominal = defaultItem ? defaultItem.nominal : 0;

    const infoTarif = getTarifSantriPL(s.id, jenisAktif);

    // Isi Form Modal
    document.getElementById('khusus-pl-santri-id').value = s.id;
    document.getElementById('khusus-pl-santri-nama').innerText = s.nama;
    document.getElementById('khusus-pl-santri-nis').innerText = `NIS: ${s.nis} • Kamar ${s.kamar || '-'}`;
    document.getElementById('khusus-pl-jenis-nama').innerText = jenisAktif;
    document.getElementById('khusus-pl-tarif-standar').innerText = formatRupiah(standardNominal);

    const checkBebas = document.getElementById('khusus-pl-check-bebas');
    const inputNominal = document.getElementById('khusus-pl-nominal');
    const inputKet = document.getElementById('khusus-pl-keterangan');

    if (infoTarif.isKhusus) {
        checkBebas.checked = infoTarif.bebas;
        inputNominal.value = infoTarif.bebas ? 0 : infoTarif.nominal;
        inputNominal.disabled = infoTarif.bebas;
        inputKet.value = infoTarif.keterangan || '';
    } else {
        checkBebas.checked = false;
        inputNominal.value = standardNominal;
        inputNominal.disabled = false;
        inputKet.value = '';
    }

    bukaModal('modal-edit-khusus-pl');
}

// Toggle Checkbox Bebas Biaya di Modal Khusus
function toggleCheckBebasPL() {
    const checkBebas = document.getElementById('khusus-pl-check-bebas');
    const inputNominal = document.getElementById('khusus-pl-nominal');
    if (!checkBebas || !inputNominal) return;

    if (checkBebas.checked) {
        inputNominal.value = 0;
        inputNominal.disabled = true;
    } else {
        inputNominal.disabled = false;
        const defaultItem = (appSettings.pembayaranLainList || []).find(p => p.nama === window.currentSelectedJenisPL);
        inputNominal.value = defaultItem ? defaultItem.nominal : 0;
    }
}

// Simpan Pengaturan Santri Khusus
function simpanPengaturanSantriKhususPL() {
    const santriId = document.getElementById('khusus-pl-santri-id').value;
    const checkBebas = document.getElementById('khusus-pl-check-bebas');
    const inputNominal = document.getElementById('khusus-pl-nominal');
    const inputKet = document.getElementById('khusus-pl-keterangan');

    const jenisAktif = window.currentSelectedJenisPL;
    const isBebas = checkBebas ? checkBebas.checked : false;
    const nominal = isBebas ? 0 : parseInt(inputNominal.value);
    const ket = inputKet ? inputKet.value.trim() : '';

    if (!isBebas && (isNaN(nominal) || nominal < 0)) {
        return showToast("Masukkan nominal tarif khusus yang valid!", "error");
    }

    if (!appSettings.tarifKhususPL) appSettings.tarifKhususPL = [];

    // Cari apakah sudah pernah diatur
    const idx = appSettings.tarifKhususPL.findIndex(k => k.santriId === santriId && k.jenis === jenisAktif);
    const itemData = {
        santriId: santriId,
        jenis: jenisAktif,
        bebas: isBebas,
        nominal: nominal,
        keterangan: ket || (isBebas ? 'Bebas Biaya' : 'Tarif Khusus')
    };

    if (idx !== -1) {
        appSettings.tarifKhususPL[idx] = itemData;
    } else {
        appSettings.tarifKhususPL.push(itemData);
    }

    saveDataToStorage();
    tutupModal('modal-edit-khusus-pl');
    renderSantriPLTable();
    showToast("Status khusus santri berhasil disimpan");
}

// Reset Santri ke Tarif Standar (Hapus dari Daftar Khusus)
function resetSantriKeStandarPL() {
    const santriId = document.getElementById('khusus-pl-santri-id').value;
    const jenisAktif = window.currentSelectedJenisPL;

    showConfirm("Reset ke Standar", "Kembalikan tarif santri ini ke tarif standar pengaturan?", () => {
        if (!appSettings.tarifKhususPL) appSettings.tarifKhususPL = [];
        const idx = appSettings.tarifKhususPL.findIndex(k => k.santriId === santriId && k.jenis === jenisAktif);
        if (idx !== -1) {
            appSettings.tarifKhususPL.splice(idx, 1);
            saveDataToStorage();
            tutupModal('modal-edit-khusus-pl');
            renderSantriPLTable();
            showToast("Tarif dikembalikan ke standar");
        } else {
            tutupModal('modal-edit-khusus-pl');
        }
    });
}

// ==========================================================================
// Tab Riwayat Transaksi Pembayaran Lain
// ==========================================================================

function renderRiwayatPLTable() {
    const listPL = appSettings.pembayaranLainList || [];
    if (listPL.length === 0) {
        tampilkanStateBelumAdaJenisPL();
        return;
    }

    const tb = document.getElementById('table-riwayat-pl');
    if (!tb) return;

    let jenisAktif = window.currentSelectedJenisPL;
    if (!jenisAktif || !listPL.some(i => i.nama === jenisAktif)) {
        jenisAktif = listPL[0].nama;
        window.currentSelectedJenisPL = jenisAktif;
        updateDropdownJenisPembayaranLain();
        updateInfoTarifStandarPL();
    }

    const search = document.getElementById('search-riwayat-pl') ? document.getElementById('search-riwayat-pl').value.toLowerCase().trim() : '';
    const tglMulai = document.getElementById('filter-tgl-mulai-pl') ? document.getElementById('filter-tgl-mulai-pl').value : '';
    const tglSelesai = document.getElementById('filter-tgl-selesai-pl') ? document.getElementById('filter-tgl-selesai-pl').value : '';

    const TA = getTahunAjaranAktif();
    let data = transactions.filter(t => 
        t.type === 'in' && 
        t.ta === TA &&
        (t.subJenis === jenisAktif || t.kategori === jenisAktif || (t.kategori === 'Pembayaran Lain' && t.subJenis === jenisAktif))
    );

    if (tglMulai) data = data.filter(t => t.date >= tglMulai);
    if (tglSelesai) data = data.filter(t => t.date <= tglSelesai);

    if (search) {
        data = data.filter(t => {
            let nama = '';
            let nis = '';
            if (t.santriId) {
                const s = santriData.find(x => x.id === t.santriId);
                if (s) {
                    nama = s.nama.toLowerCase();
                    nis = s.nis.toLowerCase();
                }
            } else if (t.pembayar) {
                nama = t.pembayar.toLowerCase();
            }
            return nama.includes(search) || nis.includes(search) || (t.desc || '').toLowerCase().includes(search) || t.id.toLowerCase().includes(search);
        });
    }

    const totalItems = data.length;
    const page = window.paginationState ? window.paginationState.riwayatPL.page : 1;
    const pageSize = (window.paginationState && window.paginationState.riwayatPL.pageSize) || 20;

    const paged = typeof paginateArray === 'function'
        ? paginateArray(data, page, pageSize)
        : { items: data.slice(0, 20), total: totalItems, currentPage: 1, totalPages: 1 };

    if (window.paginationState) {
        window.paginationState.riwayatPL.page = paged.currentPage;
    }

    if (data.length === 0) {
        tb.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-400">
                    <i class="fas fa-receipt text-3xl mb-3 text-gray-300"></i>
                    <p class="font-medium text-gray-600">Belum ada riwayat kuitansi untuk ${jenisAktif}.</p>
                </td>
            </tr>
        `;
        if (typeof renderPaginationControls === 'function') {
            renderPaginationControls({
                containerId: 'pagination-riwayat-pl',
                totalItems: 0,
                currentPage: 1,
                pageSize: pageSize,
                onPageChange: 'gantiHalamanRiwayatPL'
            });
        }
        return;
    }

    tb.innerHTML = paged.items.map(t => {
        let pembayarHtml = '';
        if (t.santriId) {
            const s = santriData.find(x => x.id === t.santriId);
            pembayarHtml = s ? `
                <div class="font-bold text-gray-800 uppercase text-sm">${s.nama}</div>
                <div class="text-[11px] text-gray-500 font-mono">NIS: ${s.nis} • Kamar ${s.kamar || '-'}</div>
            ` : `<span class="font-bold text-gray-700 uppercase">Santri ${t.santriId}</span>`;
        } else {
            pembayarHtml = `
                <div class="font-bold text-gray-800 uppercase text-sm">${t.pembayar || 'Umum'}</div>
                <div class="text-[11px] text-blue-600 font-semibold">Umum / Wali Santri</div>
            `;
        }

        return `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100">
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-800">${new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div class="font-mono text-[10px] text-gray-400 mt-0.5">${t.id}</div>
                </td>
                <td class="px-6 py-4">${pembayarHtml}</td>
                <td class="px-6 py-4 text-right">
                    <span class="font-extrabold text-blue-600 text-sm font-mono">+ ${formatRupiah(t.amount)}</span>
                </td>
                <td class="px-6 py-4 text-xs text-gray-600 max-w-xs truncate" title="${t.desc || '-'}">
                    ${t.desc || '-'}
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">Lunas</span>
                    <div class="text-[10px] font-semibold ${t.metode === 'Transfer' ? 'text-blue-600' : 'text-blue-600'} flex items-center justify-center gap-1 mt-0.5">
                        <i class="fas ${t.metode === 'Transfer' ? 'fa-university' : 'fa-money-bill-wave'} text-[9px]"></i> ${t.metode || 'Tunai'}
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="cetakStrukPembayaranLain('${t.id}')" class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center shadow-sm" title="Cetak Struk 58mm">
                            <i class="fas fa-print text-xs"></i>
                        </button>
                        <button onclick="hapusPembayaranLain('${t.id}')" class="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-colors flex items-center justify-center shadow-sm" title="Hapus Transaksi">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls({
            containerId: 'pagination-riwayat-pl',
            totalItems: totalItems,
            currentPage: paged.currentPage,
            pageSize: pageSize,
            onPageChange: 'gantiHalamanRiwayatPL'
        });
    }
}

// Pastikan struktur tabel santri ada di view-santri-pl
function pastikanStrukturTabelSantriPL() {
    const viewSantri = document.getElementById('view-santri-pl');
    if (!viewSantri) return;
    if (!document.getElementById('table-santri-pl')) {
        viewSantri.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-200">
                        <tr>
                            <th class="px-6 py-4">Nama Santri & NIS</th>
                            <th class="px-6 py-4">Kamar</th>
                            <th class="px-6 py-4 text-right">Tagihan</th>
                            <th class="px-6 py-4 text-right">Sudah Bayar</th>
                            <th class="px-6 py-4 text-right">Sisa</th>
                            <th class="px-6 py-4 text-center">Status</th>
                            <th class="px-6 py-4 text-center w-36">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="table-santri-pl" class="divide-y divide-gray-100"></tbody>
                </table>
            </div>
            <div id="pagination-santri-pl"></div>
        `;
    }
}

// State jika belum ada jenis pembayaran di Pengaturan
function tampilkanStateBelumAdaJenisPL() {
    window.currentSelectedJenisPL = '';

    // 1. Reset Header & Pilihan Dropdown
    const elTitle = document.getElementById('title-active-jenis-pl');
    if (elTitle) elTitle.innerText = 'Pembayaran Lain-Lain';

    const elTarif = document.getElementById('info-tarif-standar-pl');
    if (elTarif) elTarif.innerText = 'Rp 0';

    const elKet = document.getElementById('info-keterangan-pl');
    if (elKet) elKet.innerText = 'Belum ada jenis pembayaran aktif';

    const sel = document.getElementById('select-active-jenis-pl');
    if (sel) sel.innerHTML = '<option value="">Belum ada jenis pembayaran</option>';

    // 2. Reset Semua Kartu KPI ke 0
    const elKpiTotal = document.getElementById('kpi-total-tagihan-pl');
    if (elKpiTotal) elKpiTotal.innerText = 'Rp 0';

    const elKpiTerkumpul = document.getElementById('kpi-terkumpul-pl');
    if (elKpiTerkumpul) elKpiTerkumpul.innerText = 'Rp 0';

    const elKpiSisa = document.getElementById('kpi-sisa-piutang-pl');
    if (elKpiSisa) elKpiSisa.innerText = 'Rp 0';

    const elKpiPersen = document.getElementById('kpi-persen-lunas-pl');
    if (elKpiPersen) elKpiPersen.innerText = '0%';

    // 3. Tampilkan pesan kosong yang rapi tanpa merusak struktur DOM
    pastikanStrukturTabelSantriPL();

    const tbSantri = document.getElementById('table-santri-pl');
    if (tbSantri) {
        tbSantri.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-400">
                    <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-3">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <p class="font-bold text-gray-700 text-base">Belum Ada Jenis Pembayaran Lain</p>
                    <p class="text-xs text-gray-400 mt-1 max-w-md mx-auto">Silakan tambahkan jenis pembayaran lain terlebih dahulu melalui menu Pengaturan.</p>
                    <button onclick="navigate('pengaturan')" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-colors inline-flex items-center gap-2">
                        <i class="fas fa-cog"></i> Buka Pengaturan Sistem
                    </button>
                </td>
            </tr>
        `;
    }

    const pagSantri = document.getElementById('pagination-santri-pl');
    if (pagSantri) pagSantri.innerHTML = '';

    const tbRiwayat = document.getElementById('table-riwayat-pl');
    if (tbRiwayat) {
        tbRiwayat.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-400">
                    <p class="font-medium text-gray-500">Belum ada jenis pembayaran aktif.</p>
                </td>
            </tr>
        `;
    }

    const pagRiwayat = document.getElementById('pagination-riwayat-pl');
    if (pagRiwayat) pagRiwayat.innerHTML = '';
}

// Modal Catat Pembayaran Umum (Non-Santri / Wali Santri)
function bukaModalCatatPembayaranUmumPL() {
    const jenisAktif = window.currentSelectedJenisPL;
    const defaultItem = (appSettings.pembayaranLainList || []).find(p => p.nama === jenisAktif);
    const standardNominal = defaultItem ? defaultItem.nominal : 0;

    document.getElementById('umum-pl-jenis-nama').innerText = jenisAktif;
    document.getElementById('umum-pl-nama').value = '';
    document.getElementById('umum-pl-nominal').value = standardNominal;
    document.getElementById('umum-pl-tanggal').value = new Date().toLocaleDateString('en-CA');
    document.getElementById('umum-pl-keterangan').value = 'Pembayaran dari wali santri / donatur';

    bukaModal('modal-catat-umum-pl');
}

// Simpan Pembayaran Umum
function simpanPembayaranUmumPL() {
    const nama = document.getElementById('umum-pl-nama').value.trim();
    const nominal = parseInt(document.getElementById('umum-pl-nominal').value);
    const tanggal = document.getElementById('umum-pl-tanggal').value || new Date().toLocaleDateString('en-CA');
    const ket = document.getElementById('umum-pl-keterangan').value.trim();

    if (!nama) return showToast("Masukkan nama pembayar / donatur!", "error");
    if (isNaN(nominal) || nominal <= 0) return showToast("Nominal harus lebih dari 0!", "error");

    const jenisAktif = window.currentSelectedJenisPL;
    const descText = ket ? `${jenisAktif}: ${ket}` : jenisAktif;
    const newTrxId = (typeof generateTrxId === 'function') 
        ? generateTrxId('TRX') 
        : ('TRX-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase());

    const elMetode = document.getElementById('umum-pl-metode');
    const metodeBayar = elMetode ? elMetode.value : 'Tunai';

    const newTrx = {
        id: newTrxId,
        santriId: null,
        pembayar: nama.toUpperCase(),
        ta: getTahunAjaranAktif(),
        kategori: 'Pembayaran Lain',
        subJenis: jenisAktif,
        type: 'in',
        amount: nominal,
        desc: descText,
        metode: metodeBayar,
        date: tanggal
    };

    transactions.push(newTrx);
    saveDataToStorage();
    if (typeof triggerAutoSyncToCloud === 'function') triggerAutoSyncToCloud(true);

    tutupModal('modal-catat-umum-pl');
    renderPembayaranLainPage();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderLaporan === 'function') renderLaporan();

    Swal.fire({
        icon: 'success',
        title: 'Pembayaran Umum Disimpan!',
        html: `
            <div class="text-sm text-gray-600 space-y-1 mt-2">
                <p><b>Pembayar:</b> ${nama.toUpperCase()}</p>
                <p><b>Jenis:</b> ${jenisAktif}</p>
                <p><b>Nominal:</b> <span class="text-blue-600 font-bold font-mono">${formatRupiah(nominal)}</span></p>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-print mr-1"></i> Cetak Struk',
        cancelButtonText: 'Selesai',
        confirmButtonColor: '#1d4ed8',
        cancelButtonColor: '#64748b'
    }).then((res) => {
        if (res.isConfirmed) {
            cetakStrukPembayaranLain(newTrx.id);
        }
    });
}

// Hapus Transaksi Pembayaran Lain
function hapusPembayaranLain(trxId) {
    showConfirm("Hapus Transaksi", "Yakin ingin menghapus kuitansi pembayaran ini? Kas masuk akan dikurangi.", () => {
        const idx = transactions.findIndex(t => t.id === trxId);
        if (idx !== -1) {
            if (typeof trackDeletedTransactionId === 'function') {
                trackDeletedTransactionId(trxId);
            }
            transactions.splice(idx, 1);
            saveDataToStorage();
            if (typeof triggerAutoSyncToCloud === 'function') triggerAutoSyncToCloud(true);
            renderPembayaranLainPage();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof renderLaporan === 'function') renderLaporan();
            showToast("Transaksi Berhasil Dihapus");
        }
    });
}

// Ekspor Riwayat Pembayaran Lain ke CSV / Excel
function exportExcelPembayaranLain() {
    const jenisAktif = window.currentSelectedJenisPL;
    let data = transactions.filter(t => 
        t.type === 'in' && 
        (t.subJenis === jenisAktif || t.kategori === jenisAktif || (t.kategori === 'Pembayaran Lain' && t.subJenis === jenisAktif))
    );

    if (data.length === 0) {
        return showToast("Tidak ada data untuk diekspor", "error");
    }

    let csv = "ID Transaksi,Tanggal,Tipe Pembayar,Nama Pembayar,NIS,Kamar,Jenis Pembayaran,Nominal,Keterangan\n";
    
    data.forEach(t => {
        let tipe = t.santriId ? 'Santri' : 'Umum/Wali';
        let nama = '';
        let nis = '-';
        let kamar = '-';

        if (t.santriId) {
            const s = santriData.find(x => x.id === t.santriId);
            if (s) {
                nama = s.nama;
                nis = s.nis;
                kamar = s.kamar || '-';
            }
        } else {
            nama = t.pembayar || 'Umum';
        }

        const jenis = t.subJenis || t.kategori;
        const ket = (t.desc || '').replace(/,/g, ' ');

        csv += `"${t.id}","${t.date}","${tipe}","${nama}","${nis}","${kamar}","${jenis}",${t.amount},"${ket}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Pembayaran_${jenisAktif.replace(/[\s\/]/g, '_')}_${new Date().toLocaleDateString('en-CA')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Expose ke global window
window.renderPembayaranLainPage = renderPembayaranLainPage;
window.switchTabPL = switchTabPL;
window.gantiJenisPL = gantiJenisPL;
window.renderSantriPLTable = renderSantriPLTable;
window.renderRiwayatPLTable = renderRiwayatPLTable;
window.bukaModalBayarSantriPL = bukaModalBayarSantriPL;
window.simpanBayarSantriPL = simpanBayarSantriPL;
window.bukaModalEditKhususPL = bukaModalEditKhususPL;
window.toggleCheckBebasPL = toggleCheckBebasPL;
window.simpanPengaturanSantriKhususPL = simpanPengaturanSantriKhususPL;
window.resetSantriKeStandarPL = resetSantriKeStandarPL;
window.bukaModalCatatPembayaranUmumPL = bukaModalCatatPembayaranUmumPL;
window.simpanPembayaranUmumPL = simpanPembayaranUmumPL;
window.hapusPembayaranLain = hapusPembayaranLain;
window.exportExcelPembayaranLain = exportExcelPembayaranLain;
window.tampilkanStateBelumAdaJenisPL = tampilkanStateBelumAdaJenisPL;
window.pastikanStrukturTabelSantriPL = pastikanStrukturTabelSantriPL;
