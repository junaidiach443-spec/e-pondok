/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Data Santri Module
 * CRUD data santri, filter kamar, pencarian, import & export Excel / CSV,
 * serta download template input file standar
 * ==========================================================================
 */

// Data sementara saat preview import file
let tempImportSantriData = [];

// Perbarui Pilihan Filter Kamar di Halaman Data Santri, Syahriah & Datalist Kamar
function updateFiltersAndDropdowns() {
    const kamars = (typeof getAllNamaKamar === 'function') 
        ? getAllNamaKamar() 
        : [...new Set(santriData.map(s => s.kamar).filter(Boolean))].sort();

    const fk = document.getElementById('filter-kamar');
    if (fk) {
        const curVal = fk.value || 'all';
        fk.innerHTML = '<option value="all">Semua Kamar</option>' + kamars.map(k => `<option value="${k}" ${k === curVal ? 'selected' : ''}>Kamar ${k}</option>`).join('');
    }

    const fkSyahriah = document.getElementById('filter-kamar-syahriah');
    if (fkSyahriah) {
        const curVal = fkSyahriah.value || 'all';
        fkSyahriah.innerHTML = '<option value="all">Semua Kamar</option>' + kamars.map(k => `<option value="${k}" ${k === curVal ? 'selected' : ''}>Kamar ${k}</option>`).join('');
    }

    const dl = document.getElementById('list-master-kamar-santri');
    if (dl) {
        dl.innerHTML = kamars.map(k => `<option value="${k}">Kamar ${k}</option>`).join('');
    }

    updateMasterFiltersAndDropdowns();
}

// Perbarui Filter & Pilihan Khusus di Halaman Master Data Santri (Arsip)
function updateMasterFiltersAndDropdowns() {
    // 1. Filter Angkatan / Tahun Masuk
    const fTahun = document.getElementById('filter-tahun-master');
    if (fTahun) {
        const curVal = fTahun.value || 'all';
        const tahunListFromSantri = (santriData || []).map(s => s.tahunMasuk).filter(Boolean);
        const tahunListFromBoyong = (santriData || []).map(s => s.tahunBoyong).filter(Boolean);
        const tahunListFromSettings = (appSettings.tahunAjaranList || []).map(t => t.ta).filter(Boolean);
        const allTahun = [...new Set([...tahunListFromSantri, ...tahunListFromBoyong, ...tahunListFromSettings])].sort().reverse();

        fTahun.innerHTML = '<option value="all">Semua Angkatan / Tahun</option>' + 
            allTahun.map(t => `<option value="${t}" ${t === curVal ? 'selected' : ''}>Angkatan / TA ${t}</option>`).join('');
    }

    // 2. Filter Kamar di Master Arsip (Kamar Aktif & Kamar Terakhir)
    const fKamarMaster = document.getElementById('filter-kamar-master');
    if (fKamarMaster) {
        const curVal = fKamarMaster.value || 'all';
        const kamarsAktif = (santriData || []).map(s => s.kamar).filter(Boolean);
        const kamarsTerakhir = (santriData || []).map(s => s.kamarTerakhir).filter(Boolean);
        const kamarsMaster = (appSettings.kamarList || []).map(k => (typeof k === 'string' ? k : k.nama).trim()).filter(Boolean);
        const allKamars = [...new Set([...kamarsAktif, ...kamarsTerakhir, ...kamarsMaster])].filter(k => k && k !== '-').sort();

        fKamarMaster.innerHTML = '<option value="all">Semua Kamar</option>' + 
            allKamars.map(k => `<option value="${k}" ${k === curVal ? 'selected' : ''}>Kamar ${k}</option>`).join('');
    }

    // 3. Dropdown Tahun Ajaran Boyong di Modal Boyong
    const selBoyongTa = document.getElementById('boyong-ta');
    if (selBoyongTa) {
        const activeTA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '';
        const list = (appSettings.tahunAjaranList || []).map(t => t.ta);
        if (list.length === 0 && activeTA) list.push(activeTA);
        selBoyongTa.innerHTML = list.map(t => `<option value="${t}" ${t === activeTA ? 'selected' : ''}>${t} ${t === activeTA ? '(Aktif)' : ''}</option>`).join('');
    }
}

// ==========================================================================
// 1. Data Santri Kamar (Aktif Tahun Sekarang)
// ==========================================================================

// Render Tabel Santri Kamar Aktif dengan Pagination 20 Data
function renderSemuaTabel(resetPage = false) {
    if (resetPage && window.paginationState) {
        window.paginationState.santri.page = 1;
    }
    const fKamar = document.getElementById('filter-kamar') ? document.getElementById('filter-kamar').value : 'all';
    const search = document.getElementById('search-santri') ? document.getElementById('search-santri').value.toLowerCase().trim() : '';
    
    // Data Santri Kamar diambil langsung tersinkronisasi dari Master Arsip (hanya santri dengan status 'Aktif')
    let d = [...santriData].filter(s => s.status === 'Aktif').sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));

    const badgeKamarTotal = document.getElementById('badge-total-santri-kamar');
    if (badgeKamarTotal) {
        badgeKamarTotal.innerText = `${d.length} Santri Aktif`;
    }

    if (fKamar !== 'all') d = d.filter(s => s.kamar === fKamar);
    if (search) d = d.filter(s => (s.nama || '').toLowerCase().includes(search) || (s.nis || '').toLowerCase().includes(search));

    const totalItems = d.length;
    const page = window.paginationState ? window.paginationState.santri.page : 1;
    const pageSize = (window.paginationState && window.paginationState.santri.pageSize) || 20;

    const paged = typeof paginateArray === 'function' 
        ? paginateArray(d, page, pageSize) 
        : { items: d.slice(0, 20), total: totalItems, currentPage: 1, totalPages: 1 };

    if (window.paginationState) {
        window.paginationState.santri.page = paged.currentPage;
    }

    const tb = document.getElementById('table-santri');
    if (tb) {
        tb.innerHTML = paged.items.length ? paged.items.map((s, idx) => {
            let waLinkHtml = '';
            if (s.noHpWali) {
                const cleanPhone = s.noHpWali.replace(/\D/g, '').replace(/^0/, '62');
                const waliText = s.namaWali ? `<span class="text-gray-500 font-medium">Wali: ${s.namaWali}</span>` : '';
                waLinkHtml = `
                    <div class="space-y-1">
                        ${waliText ? `<div class="text-[11px] leading-tight text-gray-600 font-medium">${s.namaWali}</div>` : ''}
                        <a href="https://wa.me/${cleanPhone}" target="_blank" class="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 hover:text-emerald-900 font-bold bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors shadow-2xs" title="Chat WhatsApp Wali">
                            <i class="fab fa-whatsapp text-emerald-600"></i> ${s.noHpWali}
                        </a>
                    </div>
                `;
            } else {
                waLinkHtml = s.namaWali 
                    ? `<div class="text-xs text-gray-700 font-medium">${s.namaWali}</div><span class="text-[10px] text-gray-400 italic">No. WA belum ada</span>`
                    : `<span class="text-xs text-gray-300 italic">Belum diisi</span>`;
            }

            const badgeKota = s.asalKota 
                ? `<span class="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200 mt-1 uppercase tracking-wider"><i class="fas fa-location-dot text-[8px] mr-0.5 text-indigo-500"></i>${s.asalKota}</span>` 
                : '';

            return `
            <tr class="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                <td class="px-6 py-4 font-mono text-gray-500 text-xs">${s.nis || '-'}</td>
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-800 uppercase flex items-center gap-2">
                        <span class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">${s.nama ? s.nama.charAt(0) : '?'}</span>
                        <div>
                            <div>${s.nama}</div>
                            ${badgeKota}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-800 font-bold font-mono">
                    <span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                        Kamar ${s.kamar || '-'}
                    </span>
                </td>
                <td class="px-6 py-4">${waLinkHtml}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 text-[10px] border rounded-lg font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border-emerald-200">
                        ${s.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                    ${s.noHpWali ? `<button onclick="bukaChatWaliSantri('${s.id}')" class="text-emerald-600 hover:text-emerald-800 p-2 transition-colors cursor-pointer" title="Kirim Pesan WhatsApp"><i class="fab fa-whatsapp text-lg"></i></button>` : ''}
                    <button onclick="siapkanMutasiKamar('${s.id}')" class="text-teal-600 hover:text-teal-800 p-2 ml-0.5 transition-colors cursor-pointer" title="Mutasi / Pindah Kamar"><i class="fas fa-exchange-alt"></i></button>
                    <button onclick="bukaModalBoyongSantri('${s.id}')" class="text-amber-600 hover:text-amber-800 p-2 ml-0.5 transition-colors cursor-pointer" title="Proses Boyong / GT (Keluarkan dari Kamar)"><i class="fas fa-sign-out-alt"></i></button>
                    <button onclick="editSantri('${s.id}')" class="text-indigo-600 hover:text-indigo-800 p-2 ml-0.5 transition-colors cursor-pointer" title="Edit Data"><i class="fas fa-edit"></i></button>
                    <button onclick="hapusSantri('${s.id}')" class="text-rose-400 hover:text-rose-600 p-2 ml-0.5 transition-colors cursor-pointer" title="Hapus"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
        }).join('') : `<tr><td colspan="6" class="p-10 text-center text-gray-400"><i class="fas fa-bed text-3xl mb-2 text-gray-300"></i><p>Tidak ada santri aktif kamar yang sesuai dengan filter</p></td></tr>`;
    }

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls({
            containerId: 'pagination-santri',
            totalItems: totalItems,
            currentPage: paged.currentPage,
            pageSize: pageSize,
            onPageChange: 'gantiHalamanSantri'
        });
    }

    if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();
}

// ==========================================================================
// 2. Master Data Santri (Arsip Seluruh Tahun dari Tahun ke Tahun)
// ==========================================================================

// Render Tabel Master Santri (Arsip Seluruh Tahun)
function renderMasterSantriTable(resetPage = false) {
    if (resetPage && window.paginationState && window.paginationState.masterSantri) {
        window.paginationState.masterSantri.page = 1;
    }

    // 1. Hitung Statistik Real-Time Master Arsip
    const totalSemua = (santriData || []).length;
    const totalAktif = (santriData || []).filter(s => s.status === 'Aktif').length;
    const totalBoyong = (santriData || []).filter(s => s.status === 'Boyong').length;
    const totalGT = (santriData || []).filter(s => s.status === 'GT').length;
    const uniqueTahun = [...new Set((santriData || []).map(s => s.tahunMasuk).filter(Boolean))].length;

    const elTotal = document.getElementById('master-kpi-total') || document.getElementById('dash-kpi-total');
    if (elTotal) elTotal.innerText = `${totalSemua} Santri`;

    const elAktif = document.getElementById('master-kpi-aktif') || document.getElementById('dash-kpi-aktif');
    if (elAktif) elAktif.innerText = `${totalAktif} Santri`;

    const elBoyong = document.getElementById('master-kpi-boyong') || document.getElementById('dash-kpi-boyong');
    if (elBoyong) elBoyong.innerText = `${totalBoyong} Santri`;

    const elGt = document.getElementById('master-kpi-gt') || document.getElementById('dash-kpi-gt');
    if (elGt) elGt.innerText = `${totalGT} Santri`;

    const elDashTotal = document.getElementById('dash-kpi-total');
    if (elDashTotal) elDashTotal.innerText = `${totalSemua} Santri`;
    const elDashAktif = document.getElementById('dash-kpi-aktif');
    if (elDashAktif) elDashAktif.innerText = `${totalAktif} Santri`;
    const elDashBoyong = document.getElementById('dash-kpi-boyong');
    if (elDashBoyong) elDashBoyong.innerText = `${totalBoyong} Santri`;
    const elDashGt = document.getElementById('dash-kpi-gt');
    if (elDashGt) elDashGt.innerText = `${totalGT} Santri`;

    const elTahun = document.getElementById('master-kpi-tahun');
    if (elTahun) elTahun.innerText = `${Math.max(1, uniqueTahun)} Angkatan`;

    // 2. Ambil Input Filter
    const fStatusEl = document.getElementById('filter-status-master');
    const fStatus = fStatusEl ? fStatusEl.value : 'all';

    const fTahunEl = document.getElementById('filter-tahun-master');
    const fTahun = fTahunEl ? fTahunEl.value : 'all';

    const fKamarEl = document.getElementById('filter-kamar-master');
    const fKamar = fKamarEl ? fKamarEl.value : 'all';

    const searchEl = document.getElementById('search-master-santri');
    const search = searchEl ? searchEl.value.toLowerCase().trim() : '';

    // 3. Terapkan Filter
    let d = [...santriData].sort((a, b) => (a.no || 0) - (b.no || 0) || (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));

    if (fStatus !== 'all') {
        d = d.filter(s => s.status === fStatus);
    }
    if (fTahun !== 'all') {
        d = d.filter(s => s.tahunMasuk === fTahun || s.tahunBoyong === fTahun);
    }
    if (fKamar !== 'all') {
        d = d.filter(s => (s.kamar || '').toUpperCase() === fKamar.toUpperCase() || (s.kamarTerakhir || '').toUpperCase() === fKamar.toUpperCase());
    }
    if (search) {
        d = d.filter(s => 
            (s.nama || '').toLowerCase().includes(search) || 
            (s.nis || '').toLowerCase().includes(search) || 
            (s.nik || '').toLowerCase().includes(search) || 
            (s.tempatLahir || '').toLowerCase().includes(search) || 
            (s.tanggalLahir || '').toLowerCase().includes(search) || 
            (s.ayah || '').toLowerCase().includes(search) || 
            (s.ibu || '').toLowerCase().includes(search) || 
            (s.namaWali || '').toLowerCase().includes(search) || 
            (s.noHpWali || '').toLowerCase().includes(search) || 
            (s.desa || '').toLowerCase().includes(search) || 
            (s.kecamatan || '').toLowerCase().includes(search) || 
            (s.kabupaten || '').toLowerCase().includes(search) || 
            (s.asalKota || '').toLowerCase().includes(search) || 
            (s.alasanBoyong || '').toLowerCase().includes(search) ||
            (s.kamar || '').toLowerCase().includes(search) ||
            (s.kamarTerakhir || '').toLowerCase().includes(search) ||
            (s.diniyah || '').toLowerCase().includes(search) ||
            (s.umum || '').toLowerCase().includes(search) ||
            (s.status || '').toLowerCase().includes(search)
        );
    }

    const totalItems = d.length;
    const page = (window.paginationState && window.paginationState.masterSantri) ? window.paginationState.masterSantri.page : 1;
    const pageSize = (window.paginationState && window.paginationState.masterSantri && window.paginationState.masterSantri.pageSize) || 20;

    const paged = typeof paginateArray === 'function' 
        ? paginateArray(d, page, pageSize) 
        : { items: d.slice(0, 20), total: totalItems, currentPage: 1, totalPages: 1 };

    if (window.paginationState && window.paginationState.masterSantri) {
        window.paginationState.masterSantri.page = paged.currentPage;
    }

    const tb = document.getElementById('table-master-santri');
    if (tb) {
        if (paged.items.length === 0) {
            tb.innerHTML = `
                <tr>
                    <td colspan="9" class="p-12 text-center text-gray-400">
                        <i class="fas fa-archive text-3xl mb-2 text-gray-300"></i>
                        <p class="font-medium text-sm text-gray-600">Tidak ada data arsip santri yang sesuai</p>
                        <p class="text-xs text-gray-400 mt-0.5">Coba ubah kata kunci pencarian atau sesuaikan pilihan filter di atas.</p>
                    </td>
                </tr>
            `;
        } else {
            tb.innerHTML = paged.items.map((s, idx) => {
                const no = paged.startIndex + idx + 1;
                const isBoyong = s.status === 'Boyong';
                const isGT = s.status === 'GT';
                const isAktif = s.status === 'Aktif';

                // Status Badge
                let statusBadge = '';
                if (isAktif) {
                    statusBadge = `<span class="px-2.5 py-1 text-[11px] border rounded-lg font-bold bg-emerald-50 text-emerald-700 border-emerald-200 inline-flex items-center gap-1.5"><i class="fas fa-check-circle text-[10px]"></i> Aktif</span>`;
                } else if (isBoyong) {
                    statusBadge = `<span class="px-2.5 py-1 text-[11px] border rounded-lg font-bold bg-rose-50 text-rose-700 border-rose-200 inline-flex items-center gap-1.5"><i class="fas fa-box-archive text-[10px]"></i> Boyong</span>`;
                } else {
                    statusBadge = `<span class="px-2.5 py-1 text-[11px] border rounded-lg font-bold bg-amber-50 text-amber-800 border-amber-300 inline-flex items-center gap-1.5" title="Guru Tugas / Non-Mukim (GT)"><i class="fas fa-user-graduate text-[10px]"></i> Guru Tugas (GT)</span>`;
                }

                // Kamar Display
                let kamarDisplay = '';
                if (isAktif && (s.kamar || s.kamarTerakhir)) {
                    kamarDisplay = `<span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold font-mono border border-emerald-200 text-xs">Kamar ${s.kamar || s.kamarTerakhir}</span>`;
                } else {
                    const eksKmr = s.kamarTerakhir || s.kamar || '-';
                    kamarDisplay = `<span class="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-200" title="Kamar terakhir">Eks: ${eksKmr}</span>`;
                }

                // Pendidikan Display (Diniyah & Umum)
                const dinText = s.diniyah ? `Tk. ${s.diniyah}` : '-';
                const umumText = s.umum || '-';
                const pendidikanDisplay = `
                    <div class="space-y-1">
                        <div class="flex items-center gap-1">
                            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-50 text-purple-700 border border-purple-200" title="Jenjang Diniyah">
                                Din: ${dinText}
                            </span>
                            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200" title="Pendidikan Umum">
                                ${umumText}
                            </span>
                        </div>
                    </div>
                `;

                // Alamat Domisili Display
                const desaKec = [s.desa, s.kecamatan].filter(Boolean).join(', ') || s.asalKota || '-';
                const kabPos = [s.kabupaten, s.kodePos ? `(${s.kodePos})` : ''].filter(Boolean).join(' ');
                const alamatDisplay = `
                    <div class="space-y-0.5 max-w-[210px]">
                        <div class="text-xs font-semibold text-gray-800 truncate" title="${desaKec}">${desaKec}</div>
                        <div class="text-[11px] text-gray-500 truncate" title="${kabPos}">${kabPos || s.provinsi || ''}</div>
                    </div>
                `;

                // Orang Tua & Kontak Wali Display
                let waliDisplay = '';
                const namaOrtu = s.ayah ? `Ayah: ${s.ayah}` : (s.ibu ? `Ibu: ${s.ibu}` : (s.namaWali || 'Wali Santri'));
                if (s.noHpWali || s.hp) {
                    const cleanPhone = (s.noHpWali || s.hp).replace(/\D/g, '').replace(/^0/, '62');
                    waliDisplay = `
                        <div class="space-y-0.5">
                            <div class="text-xs font-medium text-gray-800 truncate max-w-[170px]" title="Ayah: ${s.ayah || '-'} | Ibu: ${s.ibu || '-'}">${namaOrtu}</div>
                            <a href="https://wa.me/${cleanPhone}" target="_blank" class="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold hover:underline">
                                <i class="fab fa-whatsapp text-emerald-600"></i> ${s.noHpWali || s.hp}
                            </a>
                        </div>
                    `;
                } else {
                    waliDisplay = `
                        <div class="space-y-0.5">
                            <div class="text-xs font-medium text-gray-800 truncate max-w-[170px]" title="Ayah: ${s.ayah || '-'} | Ibu: ${s.ibu || '-'}">${namaOrtu}</div>
                            <span class="text-[10px] text-gray-400 italic">No. WA belum ada</span>
                        </div>
                    `;
                }

                // Tombol Aksi Spesifik Status
                let actionStatusBtn = '';
                if (!isAktif) {
                    actionStatusBtn = `
                        <button onclick="bukaModalAktifkanSantri('${s.id}')" 
                                class="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1" 
                                title="Aktifkan Kembali ke Kamar (Mondok Lagi)">
                            <i class="fas fa-door-closed text-[10px]"></i> Aktifkan
                        </button>
                    `;
                } else {
                    actionStatusBtn = `
                        <button onclick="bukaModalBoyongSantri('${s.id}')" 
                                class="text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1" 
                                title="Proses Boyong atau Pindah Status ke GT">
                            <i class="fas fa-sign-out-alt text-[10px]"></i> Boyong / GT
                        </button>
                    `;
                }

                const bgRowClass = isBoyong ? 'bg-rose-50/20' : (isGT ? 'bg-amber-50/20' : '');

                return `
                    <tr class="hover:bg-gray-50/80 transition-colors border-b border-gray-100 ${bgRowClass}">
                        <td class="px-4 py-3.5 text-center text-gray-400 text-xs font-mono">${no}</td>
                        <td class="px-4 py-3.5">
                            <div class="font-mono text-xs font-bold text-gray-900">${s.nis || '-'}</div>
                            <div class="text-[11px] font-mono text-gray-500 mt-0.5">NIK: ${s.nik || '-'}</div>
                        </td>
                        <td class="px-4 py-3.5">
                            <div class="flex items-center gap-2.5">
                                <span class="w-8 h-8 rounded-xl ${isAktif ? 'bg-indigo-50 text-indigo-700' : (isBoyong ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')} flex items-center justify-center font-bold text-xs shrink-0">
                                    ${s.nama ? s.nama.charAt(0) : '?'}
                                </span>
                                <div>
                                    <div class="font-bold text-gray-900 text-xs sm:text-sm uppercase tracking-tight">${s.nama}</div>
                                    <div class="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                        <i class="fas fa-cake-candles text-[9px] text-amber-500"></i> ${s.tempatLahir ? s.tempatLahir + ', ' : ''}${s.tanggalLahir || '-'}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3.5">${kamarDisplay}</td>
                        <td class="px-4 py-3.5">${pendidikanDisplay}</td>
                        <td class="px-4 py-3.5">${alamatDisplay}</td>
                        <td class="px-4 py-3.5">${waliDisplay}</td>
                        <td class="px-4 py-3.5 text-center">${statusBadge}</td>
                        <td class="px-4 py-3.5 text-center whitespace-nowrap">
                            <div class="flex items-center justify-center gap-1">
                                <button onclick="bukaModalDetailArsipSantri('${s.id}')" class="text-blue-600 hover:text-blue-800 p-1.5 transition-colors" title="Lihat Profil & Arsip Lengkap">
                                    <i class="fas fa-id-card"></i>
                                </button>
                                <button onclick="editSantri('${s.id}')" class="text-indigo-600 hover:text-indigo-800 p-1.5 transition-colors" title="Edit Data Santri">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${actionStatusBtn}
                                <button onclick="hapusSantri('${s.id}')" class="text-rose-400 hover:text-rose-600 p-1.5 transition-colors" title="Hapus Permanen">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls({
            containerId: 'pagination-master-santri',
            totalItems: totalItems,
            currentPage: paged.currentPage,
            pageSize: pageSize,
            onPageChange: 'gantiHalamanMasterSantri'
        });
    }
}

// Buka Chat WhatsApp Langsung ke Wali Santri
function bukaChatWaliSantri(id) {
    const s = santriData.find(x => x.id === id);
    if (!s || !s.noHpWali) return showToast("Nomor WhatsApp belum terdaftar!", "warning");
    const cleanPhone = s.noHpWali.replace(/\D/g, '').replace(/^0/, '62');
    const salam = `Assalamu'alaikum Wr. Wb. Bapak/Ibu Wali dari Ananda *${s.nama}* (Kamar: ${s.kamar || s.kamarTerakhir || '-'}). Kami dari Pengurus Keuangan PP. AL-USYMUNI...`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(salam)}`, '_blank');
}

// Buka Modal Tambah Santri Baru
function bukaModalSantri() {
    document.getElementById('santri-id').value = '';
    document.getElementById('santri-nis').value = 'NIS-' + Date.now().toString().slice(-6);
    if (document.getElementById('santri-nik')) document.getElementById('santri-nik').value = '';
    if (document.getElementById('santri-instansi')) document.getElementById('santri-instansi').value = 'PPU';
    if (document.getElementById('santri-tgl-masuk')) document.getElementById('santri-tgl-masuk').value = '';
    document.getElementById('santri-nama').value = '';
    if (document.getElementById('santri-tempat-lahir')) document.getElementById('santri-tempat-lahir').value = '';
    if (document.getElementById('santri-tanggal-lahir')) document.getElementById('santri-tanggal-lahir').value = '';
    document.getElementById('santri-kamar').value = '';
    document.getElementById('santri-status').value = 'Aktif';
    if (document.getElementById('santri-diniyah')) document.getElementById('santri-diniyah').value = '';
    if (document.getElementById('santri-umum')) document.getElementById('santri-umum').value = '';
    if (document.getElementById('santri-ayah')) document.getElementById('santri-ayah').value = '';
    if (document.getElementById('santri-ibu')) document.getElementById('santri-ibu').value = '';
    if (document.getElementById('santri-nohp')) document.getElementById('santri-nohp').value = '';
    if (document.getElementById('santri-desa')) document.getElementById('santri-desa').value = '';
    if (document.getElementById('santri-kecamatan')) document.getElementById('santri-kecamatan').value = '';
    if (document.getElementById('santri-kabupaten')) document.getElementById('santri-kabupaten').value = '';
    if (document.getElementById('santri-provinsi')) document.getElementById('santri-provinsi').value = 'JAWA TIMUR';
    if (document.getElementById('santri-kodepos')) document.getElementById('santri-kodepos').value = '';
    
    const elThMasuk = document.getElementById('santri-tahun-masuk');
    if (elThMasuk) elThMasuk.value = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448';

    const elWali = document.getElementById('santri-wali');
    if (elWali) elWali.value = '';
    const elKota = document.getElementById('santri-kota');
    if (elKota) elKota.value = '';
    
    toggleFieldBoyongModalSantri('Aktif');

    document.getElementById('modal-santri-title').innerText = 'Tambah Data Santri';
    updateFiltersAndDropdowns();
    bukaModal('modal-santri');
}

// Toggle field boyong / GT saat status santri di modal diubah
function toggleFieldBoyongModalSantri(status) {
    const container = document.getElementById('container-santri-boyong-fields');
    if (!container) return;
    if (status === 'Boyong' || status === 'GT') {
        container.classList.remove('hidden');
        const tglInput = document.getElementById('santri-tanggal-boyong');
        if (tglInput && !tglInput.value) tglInput.value = new Date().toLocaleDateString('en-CA');
        const kmrInput = document.getElementById('santri-kamar-terakhir');
        const curKmr = document.getElementById('santri-kamar')?.value;
        if (kmrInput && !kmrInput.value && curKmr) kmrInput.value = curKmr;
        const alsInput = document.getElementById('santri-alasan-boyong');
        if (alsInput && !alsInput.value) {
            alsInput.value = status === 'GT' ? 'Guru Tugas (GT) / Non-Mukim' : 'Boyong dari asrama';
        }
        const lbl = document.getElementById('label-boyong-gt-info');
        if (lbl) {
            lbl.innerHTML = `<i class="fas fa-archive text-amber-700"></i> Informasi Riwayat ${status === 'GT' ? 'Status Guru Tugas / Non-Mukim (GT)' : 'Boyong'}`;
        }
    } else {
        container.classList.add('hidden');
    }
}

// Generate Nomor NIS Otomatis
function generateNisOtomatis() {
    const input = document.getElementById('santri-nis');
    if (input) {
        input.value = 'NIS-' + Date.now().toString().slice(-6);
        input.focus();
    }
}

// Simpan Data Santri (Tambah / Edit)
function simpanSantri() {
    const id = document.getElementById('santri-id').value;
    const inputNis = document.getElementById('santri-nis');
    const nis = (inputNis ? inputNis.value.trim() : '') || ('NIS-' + Date.now().toString().slice(-6));
    const nik = document.getElementById('santri-nik') ? document.getElementById('santri-nik').value.trim() : '';
    const instansi = (document.getElementById('santri-instansi')?.value.trim()) || 'PPU';
    const tglMasuk = document.getElementById('santri-tgl-masuk')?.value.trim() || '';
    const nama = document.getElementById('santri-nama').value.trim().toUpperCase();
    const tempatLahir = document.getElementById('santri-tempat-lahir')?.value.trim().toUpperCase() || '';
    const tanggalLahir = document.getElementById('santri-tanggal-lahir')?.value.trim() || '';
    let kamar = document.getElementById('santri-kamar').value.trim().toUpperCase();
    const status = document.getElementById('santri-status').value;
    const diniyah = document.getElementById('santri-diniyah')?.value.trim().toUpperCase() || '';
    const umum = document.getElementById('santri-umum')?.value.trim().toUpperCase() || '';
    const ayah = document.getElementById('santri-ayah')?.value.trim().toUpperCase() || '';
    const ibu = document.getElementById('santri-ibu')?.value.trim().toUpperCase() || '';
    const noHp = document.getElementById('santri-nohp')?.value.trim() || '';
    const desa = document.getElementById('santri-desa')?.value.trim().toUpperCase() || '';
    const kecamatan = document.getElementById('santri-kecamatan')?.value.trim().toUpperCase() || '';
    const kabupaten = document.getElementById('santri-kabupaten')?.value.trim().toUpperCase() || '';
    const provinsi = document.getElementById('santri-provinsi')?.value.trim().toUpperCase() || 'JAWA TIMUR';
    const kodePos = document.getElementById('santri-kodepos')?.value.trim() || '';

    const elThMasuk = document.getElementById('santri-tahun-masuk');
    const tahunMasuk = (elThMasuk ? elThMasuk.value.trim() : '') || (typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448');

    const elTglBoyong = document.getElementById('santri-tanggal-boyong');
    const tanggalBoyong = elTglBoyong ? elTglBoyong.value : '';

    const elKamarTerakhir = document.getElementById('santri-kamar-terakhir');
    let kamarTerakhir = elKamarTerakhir ? elKamarTerakhir.value.trim().toUpperCase() : '';

    const elAlasanBoyong = document.getElementById('santri-alasan-boyong');
    const alasanBoyong = elAlasanBoyong ? elAlasanBoyong.value.trim() : '';

    if (!nama) return showToast("Nama santri wajib diisi!", "error");

    // Jika santri berstatus Boyong atau GT, kosongkan kamar aktif dan simpan ke kamarTerakhir
    if (status === 'Boyong' || status === 'GT') {
        if (!kamarTerakhir) kamarTerakhir = kamar || '-';
        kamar = ''; // dilepas dari kamar aktif
    } else {
        kamarTerakhir = kamar;
    }

    // Jika kamar diinput dan belum terdaftar di master kamar, daftarkan otomatis
    if (kamar) {
        if (!appSettings.kamarList) appSettings.kamarList = [];
        const exists = appSettings.kamarList.some(k => (typeof k === 'string' ? k : k.nama).trim().toUpperCase() === kamar);
        if (!exists) {
            appSettings.kamarList.push({ id: 'KMR-' + Date.now(), nama: kamar, kapasitas: 20 });
        }
    }

    const namaWali = ayah || ibu || 'Wali Santri';
    const asalKota = kabupaten || kecamatan || 'Sumenep';

    if (id) {
        let idx = santriData.findIndex(s => s.id === id);
        if (idx > -1) {
            santriData[idx] = { 
                ...santriData[idx], 
                nis, 
                nik,
                instansi,
                tglMasuk: tglMasuk || santriData[idx].tglMasuk || '',
                nama, 
                tempatLahir,
                tanggalLahir,
                kamar, 
                status, 
                diniyah,
                umum,
                ayah,
                ibu,
                hp: noHp,
                noHpWali: noHp,
                desa,
                kecamatan,
                kabupaten,
                provinsi,
                kodePos,
                namaWali, 
                asalKota,
                tahunMasuk,
                kamarTerakhir: kamarTerakhir || santriData[idx].kamarTerakhir || '-',
                tanggalBoyong: (status === 'Boyong' || status === 'GT') ? (tanggalBoyong || santriData[idx].tanggalBoyong) : '',
                tahunBoyong: (status === 'Boyong' || status === 'GT') ? (santriData[idx].tahunBoyong || getTahunAjaranAktif()) : '',
                alasanBoyong: (status === 'Boyong' || status === 'GT') ? (alasanBoyong || santriData[idx].alasanBoyong) : ''
            };
        }
    } else {
        const nextNo = (santriData.reduce((max, s) => Math.max(max, s.no || 0), 0) || santriData.length) + 1;
        santriData.push({ 
            id: 'S-' + (1000 + nextNo), 
            no: nextNo,
            nis, 
            nik,
            instansi,
            tglMasuk: tglMasuk || new Date().toLocaleDateString('id-ID'),
            nama, 
            tempatLahir,
            tanggalLahir,
            kamar, 
            status, 
            diniyah,
            umum,
            ayah,
            ibu,
            hp: noHp,
            noHpWali: noHp,
            desa,
            kecamatan,
            kabupaten,
            provinsi,
            kodePos,
            namaWali, 
            asalKota,
            tahunMasuk,
            kamarTerakhir: kamarTerakhir || '-',
            tanggalBoyong: (status === 'Boyong' || status === 'GT') ? (tanggalBoyong || new Date().toLocaleDateString('en-CA')) : '',
            tahunBoyong: (status === 'Boyong' || status === 'GT') ? getTahunAjaranAktif() : '',
            alasanBoyong: (status === 'Boyong' || status === 'GT') ? (alasanBoyong || (status === 'GT' ? 'Guru Tugas (GT) / Non-Mukim' : 'Boyong dari asrama')) : ''
        });
    }

    saveDataToStorage();
    updateFiltersAndDropdowns();
    renderSemuaTabel();
    renderMasterSantriTable();
    updateDashboard();
    if (typeof renderPengaturanKamar === 'function') renderPengaturanKamar();
    if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();
    tutupModal('modal-santri');
    showToast("Data Santri Berhasil Disimpan");
}

// Buka Modal Edit Santri
function editSantri(id) {
    const s = santriData.find(x => x.id === id);
    if (s) {
        document.getElementById('santri-id').value = s.id;
        document.getElementById('santri-nis').value = s.nis || '';
        if (document.getElementById('santri-nik')) document.getElementById('santri-nik').value = s.nik || '';
        if (document.getElementById('santri-instansi')) document.getElementById('santri-instansi').value = s.instansi || 'PPU';
        if (document.getElementById('santri-tgl-masuk')) document.getElementById('santri-tgl-masuk').value = s.tglMasuk || '';
        document.getElementById('santri-nama').value = s.nama || '';
        if (document.getElementById('santri-tempat-lahir')) document.getElementById('santri-tempat-lahir').value = s.tempatLahir || '';
        if (document.getElementById('santri-tanggal-lahir')) document.getElementById('santri-tanggal-lahir').value = s.tanggalLahir || '';
        document.getElementById('santri-kamar').value = s.kamar || '';
        document.getElementById('santri-status').value = s.status || 'Aktif';
        if (document.getElementById('santri-diniyah')) document.getElementById('santri-diniyah').value = s.diniyah || '';
        if (document.getElementById('santri-umum')) document.getElementById('santri-umum').value = s.umum || '';
        if (document.getElementById('santri-ayah')) document.getElementById('santri-ayah').value = s.ayah || '';
        if (document.getElementById('santri-ibu')) document.getElementById('santri-ibu').value = s.ibu || '';
        if (document.getElementById('santri-nohp')) document.getElementById('santri-nohp').value = s.noHpWali || s.hp || '';
        if (document.getElementById('santri-desa')) document.getElementById('santri-desa').value = s.desa || '';
        if (document.getElementById('santri-kecamatan')) document.getElementById('santri-kecamatan').value = s.kecamatan || '';
        if (document.getElementById('santri-kabupaten')) document.getElementById('santri-kabupaten').value = s.kabupaten || s.asalKota || '';
        if (document.getElementById('santri-provinsi')) document.getElementById('santri-provinsi').value = s.provinsi || 'JAWA TIMUR';
        if (document.getElementById('santri-kodepos')) document.getElementById('santri-kodepos').value = s.kodePos || '';

        const elThMasuk = document.getElementById('santri-tahun-masuk');
        if (elThMasuk) elThMasuk.value = s.tahunMasuk || (typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448');

        const elWali = document.getElementById('santri-wali');
        if (elWali) elWali.value = s.namaWali || s.ayah || s.ibu || '';

        const elKota = document.getElementById('santri-kota');
        if (elKota) elKota.value = s.asalKota || s.kabupaten || '';

        const elTgl = document.getElementById('santri-tanggal-boyong');
        if (elTgl) elTgl.value = s.tanggalBoyong || '';

        const elKmrAkhir = document.getElementById('santri-kamar-terakhir');
        if (elKmrAkhir) elKmrAkhir.value = s.kamarTerakhir || s.kamar || '';

        const elAlasan = document.getElementById('santri-alasan-boyong');
        if (elAlasan) elAlasan.value = s.alasanBoyong || '';

        toggleFieldBoyongModalSantri(s.status || 'Aktif');

        document.getElementById('modal-santri-title').innerText = 'Edit Data Santri';
        updateFiltersAndDropdowns();
        bukaModal('modal-santri');
    }
}

// Hapus Data Santri Permanen
function hapusSantri(id) {
    const s = santriData.find(x => x.id === id);
    const nama = s ? s.nama : 'santri ini';
    showConfirm("Hapus Santri Permanen?", `Perhatian: Yakin ingin menghapus ${nama} secara permanen dari database master? Jika santri hanya keluar/lulus, disarankan menggunakan fitur "Boyong" agar riwayat tetap tersimpan.`, () => {
        santriData = santriData.filter(x => x.id !== id);
        saveDataToStorage();
        updateFiltersAndDropdowns();
        renderSemuaTabel();
        renderMasterSantriTable();
        updateDashboard();
        if (typeof renderPengaturanKamar === 'function') renderPengaturanKamar();
        showToast("Santri Berhasil Dihapus Permanen");
    });
}

// ==========================================================================
// 3. Fitur Boyong & Aktifkan Kembali Santri
// ==========================================================================

// ==========================================================================
// Pengecekan Kelunasan Tagihan Santri Sebelum Boyong
// ==========================================================================
function hitungRincianTunggakanSantri(santriId, targetBulanIndex = null) {
    const s = (santriData || []).find(x => x.id === santriId);
    if (!s) return { totalTunggakan: 0, items: [], isLunas: true };

    const TA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448';
    const items = [];
    let totalTunggakan = 0;

    // 1. Syahriah (SPP Bulanan di TA Aktif - Dihitung hanya sampai bulan boyong jika santri boyong)
    const isBebas = (typeof isSantriBebasSyahriah === 'function') ? isSantriBebasSyahriah(s.id) : false;
    if (!isBebas) {
        const tarifSyahriah = (appSettings && appSettings.tarifSyahriah) || 0;
        
        let bulanMaksIndex = 11; // default 12 bulan penuh
        if (targetBulanIndex !== null && targetBulanIndex !== undefined && targetBulanIndex >= 0) {
            bulanMaksIndex = Math.min(11, targetBulanIndex);
        } else if (s.status === 'Boyong' && s.bulanBoyongIndex !== undefined && s.bulanBoyongIndex >= 0) {
            bulanMaksIndex = Math.min(11, s.bulanBoyongIndex);
        }

        const jumlahBulanWajib = bulanMaksIndex + 1;
        const targetSyahriah = tarifSyahriah * jumlahBulanWajib;
        const trxSyahriah = (transactions || []).filter(t => t.santriId === s.id && t.kategori === 'Syahriah' && t.ta === TA && t.type === 'in');
        
        const bulanIslamList = (typeof bulanIslam !== 'undefined') ? bulanIslam : [
            'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir',
            'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syaban',
            'Ramadhan', 'Syawal', 'Dzulqaidah', 'Dzulhijjah'
        ];
        const bulanWajibList = bulanIslamList.slice(0, jumlahBulanWajib);
        const bulanBelumBayar = bulanWajibList.filter(bln => !trxSyahriah.some(t => (t.desc || '').includes(bln)));
        const tunggakanSyahriah = bulanBelumBayar.length * tarifSyahriah;

        if (tunggakanSyahriah > 0) {
            items.push({
                kategori: 'Syahriah',
                nama: `Syahriah (s/d ${bulanIslamList[bulanMaksIndex]} - TA ${TA})`,
                keterangan: `${bulanBelumBayar.length} Bulan: ${bulanBelumBayar.join(', ')}`,
                tunggakan: tunggakanSyahriah,
                target: targetSyahriah,
                sudahBayar: trxSyahriah.reduce((sum, t) => sum + (t.amount || 0), 0),
                actionType: 'syahriah',
                bulanBelumBayar: bulanBelumBayar
            });
            totalTunggakan += tunggakanSyahriah;
        }
    }

    // 2. Pembayaran Lain-Lain
    const listPL = (appSettings && appSettings.pembayaranLainList) || [];
    listPL.forEach(pl => {
        const infoTarif = (typeof getTarifSantriPL === 'function')
            ? getTarifSantriPL(s.id, pl.nama)
            : { nominal: pl.nominal || 0, bebas: false };
        if (!infoTarif.bebas) {
            const targetPL = infoTarif.nominal;
            const trxPL = (transactions || []).filter(t =>
                t.santriId === s.id &&
                t.type === 'in' &&
                t.ta === TA &&
                (t.subJenis === pl.nama || (t.kategori === 'Pembayaran Lain' && t.subJenis === pl.nama) || t.kategori === pl.nama)
            );
            const totalBayarPL = trxPL.reduce((sum, t) => sum + (t.amount || 0), 0);
            const tunggakanPL = Math.max(0, targetPL - totalBayarPL);
            if (tunggakanPL > 0) {
                items.push({
                    kategori: 'Pembayaran Lain',
                    subJenis: pl.nama,
                    nama: `${pl.nama} (${TA})`,
                    keterangan: `Sisa tagihan yang belum lunas`,
                    tunggakan: tunggakanPL,
                    target: targetPL,
                    sudahBayar: totalBayarPL,
                    actionType: 'pembayaran-lain'
                });
                totalTunggakan += tunggakanPL;
            }
        }
    });

    // 3. Tagihan Kustom (Ikhtibar, dll)
    const listKustom = (appSettings && appSettings.tagihanKustom) || [];
    listKustom.forEach(tk => {
        const infoTarifKustom = (typeof getTarifSantriKustom === 'function')
            ? getTarifSantriKustom(s.id, tk.nama)
            : { isKhusus: false, nominal: tk.nominal || 0, bebas: false };
        if (!infoTarifKustom.bebas) {
            const targetKustom = infoTarifKustom.isKhusus ? infoTarifKustom.nominal : (tk.nominal || 0);
            const trxKustom = (transactions || []).filter(t =>
                t.santriId === s.id &&
                t.kategori === tk.nama &&
                t.ta === TA &&
                t.type === 'in'
            );
            const totalBayarKustom = trxKustom.reduce((sum, t) => sum + (t.amount || 0), 0);
            const tunggakanKustom = Math.max(0, targetKustom - totalBayarKustom);
            if (tunggakanKustom > 0) {
                items.push({
                    kategori: tk.nama,
                    nama: `${tk.nama} (${TA})`,
                    keterangan: `Sisa tagihan kepanitiaan/khusus`,
                    tunggakan: tunggakanKustom,
                    target: targetKustom,
                    sudahBayar: totalBayarKustom,
                    actionType: 'kustom'
                });
                totalTunggakan += tunggakanKustom;
            }
        }
    });

    return {
        totalTunggakan,
        items,
        isLunas: totalTunggakan === 0
    };
}

// Update Box Status Tanggungan & Kelunasan di Modal Boyong
function updateBoyongStatusTanggungan(santriId) {
    const container = document.getElementById('boyong-tanggungan-container');
    const btnSubmit = document.getElementById('btn-submit-boyong');
    if (!container) return;

    if (!santriId) {
        container.innerHTML = `
            <div class="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-500">
                <i class="fas fa-hand-pointer text-base text-gray-400 mb-1 block"></i>
                Silakan pilih santri di atas untuk memverifikasi status kelunasan tagihan.
            </div>`;
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.className = "px-5 py-2.5 rounded-lg bg-gray-300 text-gray-500 font-bold shadow-none text-sm cursor-not-allowed flex items-center gap-1.5";
        }
        return;
    }

    const s = (santriData || []).find(x => x.id === santriId);
    if (!s) return;

    const selBulan = document.getElementById('boyong-sampai-bulan');
    const targetBulanIdx = selBulan ? parseInt(selBulan.value) : 11;
    const res = hitungRincianTunggakanSantri(santriId, targetBulanIdx);

    if (res.totalTunggakan > 0) {
        // ADA TUNGGAKAN - BLOKIR BOYONG
        let itemsHtml = res.items.map(it => `
            <div class="flex items-center justify-between py-1.5 border-b border-rose-100 last:border-b-0 text-xs">
                <div>
                    <span class="font-bold text-gray-800">${it.nama}</span>
                    <span class="text-[10px] text-gray-500 ml-1">(${it.keterangan})</span>
                </div>
                <span class="font-mono font-bold text-rose-600">${formatRupiah(it.tunggakan)}</span>
            </div>
        `).join('');

        const tipeChecked = document.querySelector('input[name="proses-status-tipe"]:checked')?.value || 'Boyong';
        const labelProses = (tipeChecked === 'GT') ? 'status Guru Tugas / Non-Mukim (GT)' : 'boyong';

        container.innerHTML = `
            <div class="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
                            <i class="fas fa-times-circle"></i>
                        </div>
                        <div>
                            <h4 class="font-extrabold text-rose-800 text-xs tracking-wide uppercase">Syarat Belum Terpenuhi: Ada Tanggungan</h4>
                            <p class="text-[11px] text-rose-700">Santri belum dapat dialihkan ke ${labelProses} sebelum melunasi seluruh tagihan.</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] text-rose-500 uppercase font-bold block">Total Tunggakan</span>
                        <span class="text-base font-extrabold font-mono text-rose-700">${formatRupiah(res.totalTunggakan)}</span>
                    </div>
                </div>

                <div class="bg-white/80 rounded-lg p-2.5 border border-rose-200">
                    ${itemsHtml}
                </div>

                <div class="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-rose-200/60">
                    <span class="text-[11px] text-rose-800 italic">Selesaikan pelunasan sebelum konfirmasi ${labelProses}:</span>
                    <button type="button" onclick="lunasiSemuaTanggunganSantri('${santriId}')" class="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                        <i class="fas fa-check-double"></i> Lunasi Semua Tanggungan Sekarang
                    </button>
                </div>
            </div>`;

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.className = "px-5 py-2.5 rounded-lg bg-gray-300 text-gray-500 font-bold shadow-none text-sm cursor-not-allowed flex items-center gap-1.5";
            btnSubmit.title = `Santri wajib melunasi seluruh tagihan sebelum diproses ke ${labelProses}!`;
        }
    } else {
        // LUNAS - BEBAS TANGGUNGAN
        const tipeChecked = document.querySelector('input[name="proses-status-tipe"]:checked')?.value || 'Boyong';
        const labelProses = (tipeChecked === 'GT') ? 'status Guru Tugas / Non-Mukim (GT)' : 'boyong';
        const submitLabel = (tipeChecked === 'GT') ? 'Konfirmasi Status Guru Tugas (GT)' : 'Konfirmasi Boyong Santri';

        container.innerHTML = `
            <div class="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm shrink-0 shadow-xs">
                        <i class="fas fa-check"></i>
                    </div>
                    <div>
                        <h4 class="font-extrabold text-emerald-800 text-xs tracking-wide uppercase">Bebas Tanggungan (Lunas)</h4>
                        <p class="text-[11px] text-emerald-700">Tidak ada tanggungan tagihan apapun. Syarat pelunasan 100% terpenuhi, santri siap diproses ${labelProses}.</p>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <span class="text-[10px] text-emerald-600 uppercase font-bold block">Tunggakan</span>
                    <span class="text-base font-extrabold font-mono text-emerald-700">Rp 0</span>
                </div>
            </div>`;

        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.className = "px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold shadow-md transition-all text-sm flex items-center gap-1.5 cursor-pointer";
            btnSubmit.title = `Klik untuk memproses ${labelProses}`;
            const btnLabelEl = document.getElementById('label-btn-submit-boyong');
            if (btnLabelEl) btnLabelEl.innerText = submitLabel;
        }
    }
}

// 1-Click Lunasi Seluruh Tanggungan Santri Sebelum Boyong / GT
function lunasiSemuaTanggunganSantri(santriId) {
    const s = (santriData || []).find(x => x.id === santriId);
    if (!s) return showToast("Data santri tidak ditemukan!", "error");

    const selBulan = document.getElementById('boyong-sampai-bulan');
    const targetBulanIdx = selBulan ? parseInt(selBulan.value) : 11;
    const res = hitungRincianTunggakanSantri(santriId, targetBulanIdx);
    if (res.totalTunggakan <= 0) {
        return showToast("Santri sudah bebas tanggungan (lunas)!", "info");
    }

    const tipeChecked = document.querySelector('input[name="proses-status-tipe"]:checked')?.value || 'Boyong';
    const labelProses = (tipeChecked === 'GT') ? 'Status Guru Tugas / Non-Mukim (GT)' : 'Boyong';

    showConfirm(
        `Pelunasan Tanggungan ${labelProses}?`,
        `Lunasi seluruh tanggungan ananda ${s.nama} sebesar ${formatRupiah(res.totalTunggakan)}? Transaksi pembayaran akan dicatat ke riwayat pembukuan kas.`,
        () => {
            const TA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448';
            const today = new Date().toLocaleDateString('en-CA');
            const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
            const kasir = currentUser ? (currentUser.nama || currentUser.username) : 'Admin';

            // Catat pembayaran untuk setiap item tunggakan
            res.items.forEach(item => {
                if (item.actionType === 'syahriah') {
                    const listBln = item.bulanBelumBayar || [];
                    listBln.forEach(bln => {
                        transactions.push({
                            id: (typeof generateId === 'function') ? generateId('TRX') : 'TRX-' + Date.now() + Math.random().toString(36).substr(2, 4),
                            type: 'in',
                            kategori: 'Syahriah',
                            santriId: s.id,
                            santriNama: s.nama,
                            santriNis: s.nis,
                            santriKamar: s.kamar || s.kamarTerakhir || '-',
                            amount: (appSettings && appSettings.tarifSyahriah) || 0,
                            date: today,
                            desc: `Syahriah Bulan ${bln} (${TA}) - Pelunasan ${labelProses}`,
                            ta: TA,
                            metode: 'Cash',
                            kasir: kasir,
                            createdAt: new Date().toISOString()
                        });
                    });
                } else if (item.actionType === 'pembayaran-lain') {
                    transactions.push({
                        id: (typeof generateId === 'function') ? generateId('TRX') : 'TRX-' + Date.now() + Math.random().toString(36).substr(2, 4),
                        type: 'in',
                        kategori: 'Pembayaran Lain',
                        subJenis: item.subJenis,
                        santriId: s.id,
                        santriNama: s.nama,
                        santriNis: s.nis,
                        santriKamar: s.kamar || s.kamarTerakhir || '-',
                        amount: item.tunggakan,
                        date: today,
                        desc: `${item.subJenis} (${TA}) - Pelunasan ${labelProses}`,
                        ta: TA,
                        metode: 'Cash',
                        kasir: kasir,
                        createdAt: new Date().toISOString()
                    });
                } else {
                    transactions.push({
                        id: (typeof generateId === 'function') ? generateId('TRX') : 'TRX-' + Date.now() + Math.random().toString(36).substr(2, 4),
                        type: 'in',
                        kategori: item.kategori,
                        santriId: s.id,
                        santriNama: s.nama,
                        santriNis: s.nis,
                        santriKamar: s.kamar || s.kamarTerakhir || '-',
                        amount: item.tunggakan,
                        date: today,
                        desc: `${item.nama} - Pelunasan ${labelProses}`,
                        ta: TA,
                        metode: 'Cash',
                        kasir: kasir,
                        createdAt: new Date().toISOString()
                    });
                }
            });

            saveDataToStorage();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof renderSyahriah === 'function') renderSyahriah();
            if (typeof renderPembayaranLainPage === 'function') renderPembayaranLainPage();

            showToast(`Seluruh tanggungan ananda ${s.nama} berhasil dilunasi!`, 'success');
            updateBoyongStatusTanggungan(santriId);
        },
        false
    );
}

// ==========================================================================
// Pencarian Santri Combobox untuk Modal Boyong / GT
// ==========================================================================

function onSearchSantriBoyong(query) {
    const dropdown = document.getElementById('dropdown-santri-boyong');
    const btnClear = document.getElementById('btn-clear-santri-boyong');
    if (!dropdown) return;

    if (btnClear) {
        if (query) btnClear.classList.remove('hidden');
        else btnClear.classList.add('hidden');
    }

    const q = (query || '').toLowerCase().trim();
    const candidates = (santriData || [])
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
                <i class="fas fa-search text-gray-300 text-lg mb-1 block"></i>
                Tidak ada santri aktif yang cocok dengan kata kunci pencarian.
            </div>
        `;
        dropdown.classList.remove('hidden');
        return;
    }

    dropdown.innerHTML = candidates.map(s => `
        <div onclick="selectSantriForBoyong('${s.id}')" class="p-3 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors">
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                    ${(s.nama || '?').charAt(0).toUpperCase()}
                </div>
                <div class="truncate">
                    <div class="font-bold text-xs text-gray-900 uppercase truncate">${s.nama}</div>
                    <div class="text-[10px] text-gray-500 font-mono mt-0.5">NIS: ${s.nis || '-'}</div>
                </div>
            </div>
            <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-emerald-800 border border-emerald-200 shrink-0 font-mono">
                Kamar ${s.kamar || '-'}
            </span>
        </div>
    `).join('');

    dropdown.classList.remove('hidden');
}

function onFocusSantriBoyong() {
    const inputSearch = document.getElementById('boyong-search-input');
    onSearchSantriBoyong(inputSearch ? inputSearch.value : '');
}

function selectSantriForBoyong(santriId) {
    const s = (santriData || []).find(x => x.id === santriId);
    if (!s) return;

    const inputHidden = document.getElementById('boyong-select-santri');
    const inputSearch = document.getElementById('boyong-search-input');
    const dropdown = document.getElementById('dropdown-santri-boyong');
    const btnClear = document.getElementById('btn-clear-santri-boyong');

    if (inputHidden) inputHidden.value = s.id;
    if (inputSearch) {
        inputSearch.value = s.nama;
    }
    if (dropdown) dropdown.classList.add('hidden');
    if (btnClear) btnClear.classList.remove('hidden');

    onBoyongSantriSelectChanged(s.id);
}

function clearSelectedSantriBoyong() {
    const inputHidden = document.getElementById('boyong-select-santri');
    const inputSearch = document.getElementById('boyong-search-input');
    const dropdown = document.getElementById('dropdown-santri-boyong');
    const btnClear = document.getElementById('btn-clear-santri-boyong');

    if (inputHidden) inputHidden.value = '';
    if (inputSearch) {
        inputSearch.value = '';
        inputSearch.focus();
    }
    if (dropdown) dropdown.classList.add('hidden');
    if (btnClear) btnClear.classList.add('hidden');

    onBoyongSantriSelectChanged('');
}

// Buka Modal Boyong / GT Santri dari Kamar (Dapat dipanggil dengan santriId atau tanpa argumen dari menu boyong)
function bukaModalBoyongSantri(santriId = null, defaultTipe = 'Boyong') {
    const containerSelect = document.getElementById('container-select-santri-boyong');
    const dropdown = document.getElementById('dropdown-santri-boyong');
    if (dropdown) dropdown.classList.add('hidden');

    // Set Default Tanggal ke Hari Ini
    const inputTgl = document.getElementById('boyong-tanggal');
    if (inputTgl) inputTgl.value = new Date().toLocaleDateString('en-CA');

    // Populate Tahun Ajaran
    const selTA = document.getElementById('boyong-ta');
    if (selTA) {
        const activeTA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448';
        const list = (appSettings.tahunAjaranList || []).map(t => t.ta);
        if (!list.includes(activeTA)) list.push(activeTA);
        selTA.innerHTML = list.map(t => `<option value="${t}" ${t === activeTA ? 'selected' : ''}>TA ${t} ${t === activeTA ? '(Aktif)' : ''}</option>`).join('');
    }

    // Populate Bulan Islam untuk Batas Tanggungan Syahriah Boyong
    const selBulan = document.getElementById('boyong-sampai-bulan');
    if (selBulan) {
        const bulanIslamList = (typeof bulanIslam !== 'undefined') ? bulanIslam : [
            'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir',
            'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syaban',
            'Ramadhan', 'Syawal', 'Dzulqaidah', 'Dzulhijjah'
        ];
        selBulan.innerHTML = bulanIslamList.map((bln, idx) => `
            <option value="${idx}">Bulan ke-${idx + 1} (${bln})</option>
        `).join('');
        if (!selBulan.value) selBulan.value = "0";
    }

    // Set radio option tipe proses (Boyong atau GT)
    const radioEl = document.querySelector(`input[name="proses-status-tipe"][value="${defaultTipe}"]`);
    if (radioEl) radioEl.checked = true;
    onProsesStatusTipeChanged(defaultTipe);

    if (santriId) {
        if (containerSelect) containerSelect.classList.add('hidden');
        selectSantriForBoyong(santriId);
    } else {
        if (containerSelect) containerSelect.classList.remove('hidden');
        clearSelectedSantriBoyong();
    }

    bukaModal('modal-boyong-santri');
}

// Handler Saat Pilihan Status Pengalihan Berubah (Boyong vs GT)
function onProsesStatusTipeChanged(type) {
    const isGT = (type === 'GT');
    const labelBoyong = document.getElementById('opt-label-boyong');
    const labelGT = document.getElementById('opt-label-gt');
    const modalTitle = document.getElementById('modal-boyong-title');
    const modalSub = document.getElementById('modal-boyong-subtitle');
    const modalIcon = document.getElementById('modal-boyong-header-icon');
    const labelBtn = document.getElementById('label-btn-submit-boyong');
    const selKategori = document.getElementById('boyong-kategori');
    const textInfo = document.getElementById('text-boyong-info');
    const inputAlasan = document.getElementById('boyong-alasan');
    const labelTanggal = document.getElementById('label-boyong-tanggal');
    const labelKategori = document.getElementById('label-boyong-kategori');
    const labelAlasan = document.getElementById('label-boyong-alasan');

    if (isGT) {
        if (labelBoyong) labelBoyong.className = "relative flex flex-col p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-amber-300 cursor-pointer transition-all";
        if (labelGT) labelGT.className = "relative flex flex-col p-3 rounded-xl border-2 border-amber-500 bg-amber-50/60 cursor-pointer transition-all shadow-xs";
        if (modalTitle) modalTitle.innerText = "Proses Status Santri ke Guru Tugas (GT) / Non-Mukim";
        if (modalSub) modalSub.innerText = "Santri dilepas dari kamar asrama (tidak di data kamar) tapi tetap tercatat sebagai santri aktif di Master Santri.";
        if (modalIcon) modalIcon.innerHTML = `<i class="fas fa-user-graduate"></i>`;
        if (labelBtn) labelBtn.innerText = "Konfirmasi Status Guru Tugas (GT)";
        if (labelTanggal) labelTanggal.innerHTML = `<i class="far fa-calendar-alt text-amber-600 mr-1"></i> Tanggal Penugasan / Beralih ke GT <span class="text-rose-500">*</span>`;
        if (labelKategori) labelKategori.innerText = "Kategori / Penugasan Guru Tugas (GT)";
        if (labelAlasan) labelAlasan.innerHTML = `Catatan / Alasan Guru Tugas (GT) <span class="text-rose-500">*</span>`;
        if (textInfo) {
            textInfo.innerHTML = "<b>Santri GT (Guru Tugas / Non-Mukim):</b> Santri akan dikeluarkan dari kamar asrama aktif (kuota kasur kamar kosong kembali), <b>tidak akan muncul di Data Kamar</b>, namun statusnya tetap tercatat sebagai santri aktif dengan status <b>\"GT\"</b> di Master Santri.";
        }
        if (selKategori) {
            selKategori.innerHTML = `
                <option value="Guru Tugas (Lembaga / Ranting Mitra)">🎓 Guru Tugas (Pengabdian Mengajar di Lembaga / Ranting Mitra)</option>
                <option value="Non-Mukim / Santri Kalong">🏠 Non-Mukim / Santri Kalong (Pulang-Pergi)</option>
                <option value="Tinggal Bersama Orang Tua / Wali">👨‍👩‍👦 Tinggal Bersama Orang Tua / Wali di Luar</option>
                <option value="Santri Mandiri / Khidmah Luar">🤝 Khidmah / Penugasan Khusus Pesantren</option>
                <option value="Pemulihan Kesehatan">🏥 Pemulihan Kesehatan / Rawat Jalan</option>
                <option value="Lainnya">✍️ Alasan Lainnya (Ketik Manual)</option>
            `;
            selKategori.value = "Guru Tugas (Lembaga / Ranting Mitra)";
        }
        if (inputAlasan) inputAlasan.value = "Santri beralih ke status Guru Tugas (GT) / Non-Mukim di PP. AL-USYMUNI";
    } else {
        if (labelBoyong) labelBoyong.className = "relative flex flex-col p-3 rounded-xl border-2 border-amber-500 bg-amber-50/60 cursor-pointer transition-all shadow-xs";
        if (labelGT) labelGT.className = "relative flex flex-col p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-amber-300 cursor-pointer transition-all";
        if (modalTitle) modalTitle.innerText = "Proses Boyong Santri";
        if (modalSub) modalSub.innerText = "Verifikasi kelunasan tagihan & keluarkan santri dari kamar aktif.";
        if (modalIcon) modalIcon.innerHTML = `<i class="fas fa-sign-out-alt"></i>`;
        if (labelBtn) labelBtn.innerText = "Konfirmasi Boyong Santri";
        if (labelTanggal) labelTanggal.innerHTML = `<i class="far fa-calendar-alt text-amber-600 mr-1"></i> Tanggal Boyong <span class="text-rose-500">*</span>`;
        if (labelKategori) labelKategori.innerText = "Kategori / Jenis Boyong";
        if (labelAlasan) labelAlasan.innerHTML = `Catatan / Alasan Boyong Santri <span class="text-rose-500">*</span>`;
        if (textInfo) {
            textInfo.innerHTML = "<b>Santri Boyong:</b> Santri dikeluarkan dari kamar aktif (kuota kasur kosong kembali), dan riwayat santri <b>tetap tersimpan permanen di Master Santri</b> dengan status <b>\"Boyong\"</b>.";
        }
        if (selKategori) {
            selKategori.innerHTML = `
                <option value="Tamat / Khatam Mondok">🎓 Tamat / Khatam Mondok</option>
                <option value="Lulus Tingkatan">📜 Lulus Tingkatan / Pendidikan</option>
                <option value="Pindah Pondok / Sekolah">🏫 Pindah Pondok / Sekolah Lain</option>
                <option value="Permintaan Wali / Keluarga">👨‍👩‍👦 Permintaan Orang Tua / Keluarga</option>
                <option value="Alasan Kesehatan">🏥 Alasan Kesehatan</option>
                <option value="Lainnya">📝 Alasan Lainnya (Ketik Manual)</option>
            `;
            selKategori.value = "Tamat / Khatam Mondok";
        }
        if (inputAlasan) inputAlasan.value = "Tamat / Khatam Mondok di PP. AL-USYMUNI";
    }

    const idEl = document.getElementById('boyong-santri-id');
    if (idEl && idEl.value) {
        updateBoyongStatusTanggungan(idEl.value);
    }
}

// Handler saat batas bulan syahriah boyong berubah
function onBoyongSampaiBulanChanged() {
    const selBulan = document.getElementById('boyong-sampai-bulan');
    const badgeInfo = document.getElementById('badge-boyong-bulan-info');
    const santriId = document.getElementById('boyong-santri-id')?.value || document.getElementById('boyong-select-santri')?.value;

    if (selBulan && badgeInfo) {
        const blnIdx = parseInt(selBulan.value) || 0;
        const bulanIslamList = (typeof bulanIslam !== 'undefined') ? bulanIslam : [
            'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir',
            'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syaban',
            'Ramadhan', 'Syawal', 'Dzulqaidah', 'Dzulhijjah'
        ];
        const blnName = bulanIslamList[blnIdx] || `Bulan ${blnIdx + 1}`;
        badgeInfo.innerText = `Wajib s/d Bulan ke-${blnIdx + 1} (${blnName})`;
    }

    if (santriId) {
        updateBoyongStatusTanggungan(santriId);
    }
}

// Handler Saat Santri Dipilih di Modal Boyong / GT
function onBoyongSantriSelectChanged(santriId) {
    const s = (santriData || []).find(x => x.id === santriId);
    const idEl = document.getElementById('boyong-santri-id');
    const namaEl = document.getElementById('boyong-santri-nama');
    const nisEl = document.getElementById('boyong-santri-nis');
    const kamarEl = document.getElementById('boyong-santri-kamar');
    const avatarEl = document.getElementById('boyong-avatar');

    if (!s) {
        if (idEl) idEl.value = '';
        if (namaEl) namaEl.innerText = 'Belum Ada Santri Dipilih';
        if (nisEl) nisEl.innerText = '-';
        if (kamarEl) kamarEl.innerText = 'Kamar: -';
        if (avatarEl) avatarEl.innerText = '?';
        updateBoyongStatusTanggungan('');
        return;
    }

    if (idEl) idEl.value = s.id;
    if (namaEl) namaEl.innerText = s.nama;
    if (nisEl) nisEl.innerText = 'NIS: ' + (s.nis || '-');
    if (kamarEl) kamarEl.innerText = 'Kamar: ' + (s.kamar || s.kamarTerakhir || '-');
    if (avatarEl) avatarEl.innerText = s.nama ? s.nama.charAt(0) : '?';

    updateBoyongStatusTanggungan(s.id);
}

// Handler Saat Kategori Boyong / GT Berubah di Modal
function onBoyongKategoriChanged(val) {
    const inputAlasan = document.getElementById('boyong-alasan');
    if (!inputAlasan) return;

    if (val === 'Tamat / Khatam Mondok') {
        inputAlasan.value = 'Tamat / Khatam Mondok di PP. AL-USYMUNI';
    } else if (val === 'Lulus Tingkatan') {
        inputAlasan.value = 'Lulus Tingkatan Pendidikan / Madrasah';
    } else if (val === 'Non-Mukim / Santri Kalong') {
        inputAlasan.value = 'Santri Kalong / Pulang-Pergi (Non-Mukim) PP. AL-USYMUNI';
    } else if (val === 'Tinggal Bersama Orang Tua / Wali') {
        inputAlasan.value = 'Tinggal bersama orang tua / wali di luar asrama';
    } else if (val === 'Santri Mandiri / Khidmah Luar') {
        inputAlasan.value = 'Santri mandiri / penugasan khidmah di luar asrama';
    } else if (val === 'Pindah Pondok / Sekolah') {
        inputAlasan.value = 'Pindah ke Pondok Pesantren / Sekolah Lain';
    } else if (val === 'Permintaan Wali / Keluarga' || val === 'Permintaan Orang Tua') {
        inputAlasan.value = 'Permintaan Orang Tua / Urusan Keluarga';
    } else if (val === 'Alasan Kesehatan') {
        inputAlasan.value = 'Izin pulang pemulihan kesehatan / rawat jalan';
    } else {
        inputAlasan.value = '';
        inputAlasan.focus();
    }
}

// Proses Eksekusi Boyong / GT Santri (Memeriksa Kelunasan Tagihan Terlebih Dahulu)
function prosesBoyongSantri() {
    const sId = document.getElementById('boyong-santri-id').value;
    const tanggal = document.getElementById('boyong-tanggal').value;
    const ta = document.getElementById('boyong-ta').value;
    const alasan = document.getElementById('boyong-alasan').value.trim();
    const tipe = document.querySelector('input[name="proses-status-tipe"]:checked')?.value || 'Boyong';

    const labelTipe = (tipe === 'GT') ? 'status Guru Tugas / Non-Mukim (GT)' : 'boyong';

    if (!sId) return showToast("Pilih santri terlebih dahulu!", "error");
    if (!tanggal) return showToast(`Tanggal ${tipe === 'GT' ? 'perubahan status GT' : 'boyong'} wajib diisi!`, "error");
    if (!alasan) return showToast("Alasan atau keterangan wajib diisi!", "error");

    const s = (santriData || []).find(x => x.id === sId);
    if (!s) return showToast("Data santri tidak ditemukan!", "error");

    const selBulan = document.getElementById('boyong-sampai-bulan');
    const bulanBoyongIdx = selBulan ? parseInt(selBulan.value) : 11;

    // VALIDASI KELUNASAN TANGGUNGAN: Wajib Lunas sampai bulan boyong!
    const tanggunganInfo = hitungRincianTunggakanSantri(sId, bulanBoyongIdx);
    if (tanggunganInfo.totalTunggakan > 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Tunggakan Belum Lunas!',
                html: `Ananda <b>${s.nama}</b> masih memiliki tanggungan tagihan sebesar <b>${formatRupiah(tanggunganInfo.totalTunggakan)}</b>.<br><br>Sesuai aturan pesantren, santri yang akan dialihkan ke <b>${labelTipe}</b> wajib melunasi tanggungan (sampai bulan boyong) terlebih dahulu.`,
                confirmButtonColor: '#e11d48'
            });
        } else {
            alert(`Tunggakan belum lunas! Santri masih memiliki tanggungan sebesar ${formatRupiah(tanggunganInfo.totalTunggakan)}. Wajib lunas sebelum diproses.`);
        }
        return;
    }

    const kamarLama = s.kamar || s.kamarTerakhir || '-';

    // Update Data Santri:
    // Jika GT: status 'GT', kamar dikosongkan (agar tidak ada di data kamar), kamarTerakhir dicatat
    // Jika Boyong: status 'Boyong', kamar dikosongkan, kamarTerakhir dicatat
    const bulanIslamList = (typeof bulanIslam !== 'undefined') ? bulanIslam : [];
    s.status = tipe;
    s.kamarTerakhir = kamarLama;
    s.kamar = ''; // Kamar dikosongkan agar kapasitas kamar asrama bertambah dan santri TIDAK ADA di Data Kamar
    s.tanggalBoyong = tanggal;
    s.tahunBoyong = ta || (typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '');
    s.bulanBoyong = bulanIslamList[bulanBoyongIdx] || ('Bulan ke-' + (bulanBoyongIdx + 1));
    s.bulanBoyongIndex = bulanBoyongIdx;
    s.alasanBoyong = alasan;

    // Simpan ke storage dan sinkronkan seluruh modul
    saveDataToStorage();
    updateFiltersAndDropdowns();
    renderSemuaTabel();
    renderMasterSantriTable();
    if (typeof renderBoyongSantriTable === 'function') renderBoyongSantriTable();
    updateDashboard();
    if (typeof renderPengaturanKamar === 'function') renderPengaturanKamar();
    if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();

    tutupModal('modal-boyong-santri');
    if (tipe === 'GT') {
        showToast(`Ananda ${s.nama} berhasil dialihkan ke status GT (bebas tanggungan). Santri dilepas dari kamar dan tetap aktif di Master Santri.`);
    } else {
        showToast(`Ananda ${s.nama} resmi diboyongkan (bebas tanggungan). Data tersimpan di Master Santri.`);
    }
}

// Buka Modal Aktifkan Kembali Santri yang Sudah Boyong ke Kamar
function bukaModalAktifkanSantri(santriId) {
    const s = (santriData || []).find(x => x.id === santriId);
    if (!s) return showToast("Data santri tidak ditemukan!", "error");

    document.getElementById('aktifkan-santri-id').value = s.id;
    document.getElementById('aktifkan-santri-nama').innerText = s.nama;
    document.getElementById('aktifkan-santri-nis').innerText = 'NIS: ' + (s.nis || '-');
    document.getElementById('aktifkan-santri-kamar-terakhir').innerText = 'Kamar Terakhir: ' + (s.kamarTerakhir || '-');

    const elAvatar = document.getElementById('aktifkan-avatar');
    if (elAvatar) elAvatar.innerText = s.nama ? s.nama.charAt(0) : '?';

    // Saran kamar baru dari kamar terakhir
    const inputKamar = document.getElementById('aktifkan-kamar-baru');
    if (inputKamar) inputKamar.value = (s.kamarTerakhir && s.kamarTerakhir !== '-') ? s.kamarTerakhir : '';

    const inputTgl = document.getElementById('aktifkan-tanggal');
    if (inputTgl) inputTgl.value = new Date().toLocaleDateString('en-CA');

    const inputCatatan = document.getElementById('aktifkan-catatan');
    if (inputCatatan) inputCatatan.value = 'Mondok kembali di PP. AL-USYMUNI';

    updateFiltersAndDropdowns();
    bukaModal('modal-aktifkan-santri');
}

// Proses Eksekusi Aktifkan Kembali Santri ke Kamar
function prosesAktifkanSantri() {
    const sId = document.getElementById('aktifkan-santri-id').value;
    const kamarBaru = document.getElementById('aktifkan-kamar-baru').value.trim().toUpperCase();
    const catatan = document.getElementById('aktifkan-catatan').value.trim();

    if (!sId) return showToast("Santri tidak valid!", "error");
    if (!kamarBaru) return showToast("Pilih / ketik kamar baru santri!", "error");

    const s = (santriData || []).find(x => x.id === sId);
    if (!s) return showToast("Data santri tidak ditemukan!", "error");

    // Pastikan kamar terdaftar di master kamar
    if (!appSettings.kamarList) appSettings.kamarList = [];
    const exists = appSettings.kamarList.some(k => (typeof k === 'string' ? k : k.nama).trim().toUpperCase() === kamarBaru);
    if (!exists) {
        appSettings.kamarList.push({ id: 'KMR-' + Date.now(), nama: kamarBaru, kapasitas: 20 });
    }

    s.status = 'Aktif';
    s.kamar = kamarBaru;
    s.kamarTerakhir = kamarBaru;
    if (catatan) {
        s.alasanBoyong = s.alasanBoyong ? `${s.alasanBoyong} (Aktif kembali: ${catatan})` : catatan;
    }

    saveDataToStorage();
    updateFiltersAndDropdowns();
    renderSemuaTabel();
    renderMasterSantriTable();
    if (typeof renderBoyongSantriTable === 'function') renderBoyongSantriTable();
    updateDashboard();
    if (typeof renderPengaturanKamar === 'function') renderPengaturanKamar();
    if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();

    tutupModal('modal-aktifkan-santri');
    showToast(`Alhamdulillah, ${s.nama} aktif kembali dan menempati Kamar ${kamarBaru}!`);
}

// ==========================================================================
// 4. Modul Halaman Boyong Santri (Tabel, Filter, Cetak Surat, & Export)
// ==========================================================================

// Perbarui Filter Tahun & Kategori di Halaman Boyong Santri
function updateBoyongFiltersAndDropdowns() {
    const selTA = document.getElementById('filter-ta-boyong');
    const selAngkatan = document.getElementById('filter-angkatan-boyong');

    if (selTA) {
        const currentVal = selTA.value;
        const setTA = new Set();
        const activeTA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448';
        if (activeTA) setTA.add(activeTA);
        (appSettings.tahunAjaranList || []).forEach(t => { if (t.ta) setTA.add(t.ta); });
        santriData.forEach(s => { if (s.tahunBoyong) setTA.add(s.tahunBoyong); });

        let listTA = Array.from(setTA).sort().reverse();
        selTA.innerHTML = `<option value="all">Semua Tahun Boyong</option>` +
            listTA.map(t => `<option value="${t}" ${t === currentVal ? 'selected' : ''}>TA ${t} ${t === activeTA ? '(Aktif)' : ''}</option>`).join('');
    }

    if (selAngkatan) {
        const currentVal = selAngkatan.value;
        const setAngkatan = new Set();
        santriData.forEach(s => {
            if (s.tahunMasuk) setAngkatan.add(s.tahunMasuk);
        });
        const listAngkatan = Array.from(setAngkatan).sort().reverse();
        selAngkatan.innerHTML = `<option value="all">Semua Angkatan Masuk</option>` +
            listAngkatan.map(a => `<option value="${a}" ${a === currentVal ? 'selected' : ''}>Angkatan ${a}</option>`).join('');
    }
}

// Render Tabel Riwayat Santri Boyong & GT
function renderBoyongSantriTable(resetPage = false) {
    if (resetPage && window.paginationState && window.paginationState.boyongSantri) {
        window.paginationState.boyongSantri.page = 1;
    }

    const tb = document.getElementById('table-boyong-santri');
    const searchEl = document.getElementById('search-boyong-santri');
    const search = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const fStatusEl = document.getElementById('filter-status-boyong');
    const fStatus = fStatusEl ? fStatusEl.value : 'all';
    const fTaEl = document.getElementById('filter-ta-boyong');
    const fTa = fTaEl ? fTaEl.value : 'all';
    const fKatEl = document.getElementById('filter-kategori-boyong');
    const fKat = fKatEl ? fKatEl.value : 'all';
    const fAngkatanEl = document.getElementById('filter-angkatan-boyong');
    const fAngkatan = fAngkatanEl ? fAngkatanEl.value : 'all';

    const activeTA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448';

    // 1. Update KPI Cards
    const allBoyong = (santriData || []).filter(s => s.status === 'Boyong');
    const allGT = (santriData || []).filter(s => s.status === 'GT');
    const allAktif = (santriData || []).filter(s => s.status === 'Aktif');

    const elKpiTotal = document.getElementById('boyong-kpi-total');
    if (elKpiTotal) elKpiTotal.innerText = allBoyong.length;

    const elKpiGT = document.getElementById('boyong-kpi-gt');
    if (elKpiGT) elKpiGT.innerText = allGT.length;

    const elKpiAktif = document.getElementById('boyong-kpi-santri-aktif');
    if (elKpiAktif) elKpiAktif.innerText = allAktif.length;

    const elTotalCount = document.getElementById('boyong-total-count');

    // 2. Filter data (memuat baik Boyong maupun GT)
    let d = (santriData || []).filter(s => s.status === 'Boyong' || s.status === 'GT').sort((a, b) => {
        const dateA = a.tanggalBoyong || '';
        const dateB = b.tanggalBoyong || '';
        return dateB.localeCompare(dateA);
    });

    if (fStatus !== 'all') {
        d = d.filter(s => s.status === fStatus);
    }
    if (fTa !== 'all') {
        d = d.filter(s => s.tahunBoyong === fTa);
    }
    if (fKat !== 'all') {
        d = d.filter(s => (s.alasanBoyong || '').toLowerCase().includes(fKat.toLowerCase()));
    }
    if (fAngkatan !== 'all') {
        d = d.filter(s => (s.tahunMasuk || '') === fAngkatan);
    }
    if (search) {
        d = d.filter(s =>
            (s.nama || '').toLowerCase().includes(search) ||
            (s.nis || '').toLowerCase().includes(search) ||
            (s.nik || '').toLowerCase().includes(search) ||
            (s.status || '').toLowerCase().includes(search) ||
            (s.kamarTerakhir || '').toLowerCase().includes(search) ||
            (s.alasanBoyong || '').toLowerCase().includes(search)
        );
    }

    if (elTotalCount) elTotalCount.innerText = `${d.length} santri tercatat`;

    if (!tb) return;

    const totalItems = d.length;
    const page = (window.paginationState && window.paginationState.boyongSantri) ? window.paginationState.boyongSantri.page : 1;
    const pageSize = (window.paginationState && window.paginationState.boyongSantri && window.paginationState.boyongSantri.pageSize) || 20;

    const paged = typeof paginateArray === 'function'
        ? paginateArray(d, page, pageSize)
        : { items: d.slice(0, 20), total: totalItems, currentPage: 1, totalPages: 1 };

    if (window.paginationState && window.paginationState.boyongSantri) {
        window.paginationState.boyongSantri.page = paged.currentPage;
    }

    if (paged.items.length === 0) {
        tb.innerHTML = `<tr><td colspan="9" class="p-10 text-center text-gray-400"><i class="fas fa-archive text-3xl mb-2 text-gray-300"></i><p class="font-medium">Tidak ada data santri Boyong / GT ditemukan.</p><p class="text-xs text-gray-400 mt-1">Gunakan tombol "+ Proses Boyong / GT" untuk memproses pengalihan status santri.</p></td></tr>`;
    } else {
        const startNo = (paged.currentPage - 1) * pageSize;
        tb.innerHTML = paged.items.map((s, idx) => {
            const no = startNo + idx + 1;
            const isGT = (s.status === 'GT');
            const tglProsesStr = s.tanggalBoyong 
                ? new Date(s.tanggalBoyong).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) 
                : '-';

            const statusBadge = isGT
                ? `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider inline-flex items-center gap-1"><i class="fas fa-clock-rotate-left text-[9px]"></i> GT</span>`
                : `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider inline-flex items-center gap-1"><i class="fas fa-user-graduate text-[9px]"></i> Boyong</span>`;

            return `
            <tr class="hover:bg-amber-50/30 transition-colors">
                <td class="px-5 py-3.5 text-center text-gray-400 font-mono text-xs">${no}</td>
                <td class="px-5 py-3.5">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg ${isGT ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'} flex items-center justify-center font-bold text-xs shrink-0">
                            ${s.nama ? s.nama.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div class="min-w-0">
                            <span class="font-bold text-gray-800 uppercase block truncate">${s.nama}</span>
                            <span class="font-mono text-[10px] text-gray-400">${s.nis || '-'}</span>
                        </div>
                    </div>
                </td>
                <td class="px-5 py-3.5 text-center">${statusBadge}</td>
                <td class="px-5 py-3.5 font-mono text-xs text-gray-600 font-medium">
                    ${s.tahunMasuk ? `<span class="bg-gray-100 px-2 py-0.5 rounded text-gray-700 border border-gray-200">${s.tahunMasuk}</span>` : '-'}
                </td>
                <td class="px-5 py-3.5">
                    <span class="font-bold text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        Kamar ${s.kamarTerakhir || '-'}
                    </span>
                </td>
                <td class="px-5 py-3.5">
                    <div class="font-medium text-gray-800 text-xs">${tglProsesStr}</div>
                    <div class="text-[10px] text-gray-400 font-mono">TA ${s.tahunBoyong || '-'}</div>
                </td>
                <td class="px-5 py-3.5">
                    <div class="text-xs text-gray-700 max-w-xs truncate" title="${s.alasanBoyong || '-'}">
                        ${s.alasanBoyong || '-'}
                    </div>
                </td>
                <td class="px-5 py-3.5 text-center">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <i class="fas fa-shield-check text-xs"></i> Lunas (Bebas)
                    </span>
                </td>
                <td class="px-5 py-3.5 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="cetakSuratKeteranganBoyong('${s.id}')" class="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer" title="Cetak Surat Keterangan & Bebas Tanggungan">
                            <i class="fas fa-print text-xs"></i>
                        </button>
                        <button onclick="bukaModalDetailArsipSantri('${s.id}')" class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer" title="Lihat Profil Lengkap">
                            <i class="fas fa-eye text-xs"></i>
                        </button>
                        <button onclick="bukaModalAktifkanSantri('${s.id}')" class="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer" title="Aktifkan Kembali ke Kamar (Mondok Lagi)">
                            <i class="fas fa-undo text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls({
            containerId: 'pagination-boyong-santri',
            totalItems: totalItems,
            currentPage: paged.currentPage,
            pageSize: pageSize,
            onPageChange: 'gantiHalamanBoyongSantri'
        });
    }
}

// Export Data Santri Boyong & GT ke Excel
function exportBoyongSantriExcel() {
    const d = (santriData || []).filter(s => s.status === 'Boyong' || s.status === 'GT');
    if (d.length === 0) return showToast("Belum ada data santri boyong / GT untuk diekspor!", "info");

    const rows = d.map((s, idx) => ({
        "No": idx + 1,
        "NIS": s.nis || '',
        "Nama Santri": s.nama || '',
        "Status": s.status || '',
        "Angkatan Masuk": s.tahunMasuk || '',
        "Kamar Terakhir": s.kamarTerakhir || '',
        "Tanggal Proses": s.tanggalBoyong || '',
        "Tahun Ajaran": s.tahunBoyong || '',
        "Kategori / Alasan": s.alasanBoyong || '',
        "Status Keuangan": "Bebas Tanggungan (Lunas)",
        "Nama Orang Tua": s.ayah || s.ibu || s.namaWali || '',
        "No. WhatsApp": s.hp || s.noHpWali || '',
        "Alamat": s.desa ? `${s.desa}, ${s.kecamatan || ''}, ${s.kabupaten || ''}` : (s.asalKota || '')
    }));

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Arsip_Santri_Boyong_dan_GT_${dateStr}`;

    if (typeof XLSX !== 'undefined') {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Boyong & GT");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
        const headers = Object.keys(rows[0]);
        let csv = headers.join(",") + "\n";
        rows.forEach(r => {
            csv += headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(",") + "\n";
        });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.csv`;
        link.click();
    }
    showToast("Data santri boyong & GT berhasil diekspor ke Excel!", "success");
}

// Cetak Surat Keterangan Boyong / GT & Bebas Tanggungan Pesantren
function cetakSuratKeteranganBoyong(santriId) {
    const s = (santriData || []).find(x => x.id === santriId);
    if (!s) return showToast("Data santri tidak ditemukan!", "error");

    const isGT = (s.status === 'GT');
    const tglProsesStr = s.tanggalBoyong 
        ? new Date(s.tanggalBoyong).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) 
        : '-';
    const tglCetakStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const suratJudul = isGT 
        ? "SURAT KETERANGAN GURU TUGAS / NON-MUKIM (GT) & BEBAS TANGGUNGAN"
        : "SURAT KETERANGAN BOYONG & BEBAS TANGGUNGAN";
    const suratNomor = isGT
        ? `SK-GT/${s.nis || 'PP'}/${new Date().getFullYear()}`
        : `SKB/${s.nis || 'PP'}/${new Date().getFullYear()}`;
    const penutupTeks = isGT
        ? "menerangkan dengan sebenarnya bahwa santri tersebut di atas telah menyelesaikan seluruh kewajiban administrasi keuangan pesantren dan resmi dialihkan statusnya menjadi <b>Guru Tugas / Non-Mukim (GT)</b> di Pondok Pesantren AL-USYMUNI."
        : "menerangkan dengan sebenarnya bahwa santri tersebut di atas telah menyelesaikan seluruh kewajiban administrasi keuangan pesantren dan resmi dinyatakan <b>Boyong (Alumni)</b> dari Pondok Pesantren AL-USYMUNI.";

    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return showToast("Popup diblokir browser! Izinkan popup untuk mencetak surat.", "error");

    w.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>${suratJudul} - ${s.nama}</title>
        <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.6; padding: 20px; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 25px; }
            .header h2 { margin: 0; font-size: 20px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; }
            .header h3 { margin: 4px 0 0; font-size: 16px; font-weight: bold; }
            .header p { margin: 4px 0 0; font-size: 12px; color: #333; }
            .title { text-align: center; margin-bottom: 25px; }
            .title h4 { margin: 0; font-size: 16px; text-decoration: underline; text-transform: uppercase; font-weight: bold; }
            .title p { margin: 3px 0 0; font-size: 12px; font-style: italic; }
            .content { font-size: 14px; margin-bottom: 20px; text-align: justify; }
            .table-bio { width: 100%; margin: 15px 0; border-collapse: collapse; font-size: 14px; }
            .table-bio td { padding: 4px 8px; vertical-align: top; }
            .table-bio td:first-child { width: 200px; font-weight: bold; }
            .table-bio td:nth-child(2) { width: 15px; }
            .status-box { background: #f0fdf4; border: 1.5px solid #16a34a; padding: 12px 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #166534; }
            .footer-sign { width: 100%; margin-top: 50px; font-size: 14px; border-collapse: collapse; }
            .footer-sign td { width: 50%; text-align: center; vertical-align: top; }
            .space-sign { height: 75px; }
            .btn-print { position: fixed; top: 15px; right: 15px; background: #16a34a; color: white; padding: 10px 18px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
            @media print {
                .btn-print { display: none; }
                body { padding: 0; }
            }
        </style>
    </head>
    <body>
        <button class="btn-print" onclick="window.print()">🖨️ Cetak Surat (PDF / Print)</button>

        <div class="header">
            <h2>PONDOK PESANTREN AL-USYMUNI</h2>
            <h3>PENGURUS BAGIAN KETERTIBAN & KEUANGAN ASRAMA</h3>
            <p>Alamat: PP. Al-Usymuni, Tarate, Sumenep, Madura, Jawa Timur • Telp: (0328) 662888</p>
        </div>

        <div class="title">
            <h4>${suratJudul}</h4>
            <p>Nomor: ${suratNomor}</p>
        </div>

        <div class="content">
            <p>Yang bertanda tangan di bawah ini Pengurus Pondok Pesantren AL-USYMUNI, ${penutupTeks}</p>

            <table class="table-bio">
                <tr><td>Nama Lengkap</td><td>:</td><td><b>${s.nama}</b></td></tr>
                <tr><td>Nomor Induk Santri (NIS)</td><td>:</td><td>${s.nis || '-'}</td></tr>
                <tr><td>Nomor Induk Kependudukan (NIK)</td><td>:</td><td>${s.nik || '-'}</td></tr>
                <tr><td>Status Santri</td><td>:</td><td><b>${isGT ? 'Guru Tugas / Non-Mukim (GT)' : 'Sudah Boyong (Alumni)'}</b></td></tr>
                <tr><td>Angkatan / Tahun Masuk</td><td>:</td><td>${s.tahunMasuk || s.tglMasuk || '-'}</td></tr>
                <tr><td>Kamar Terakhir</td><td>:</td><td>Kamar ${s.kamarTerakhir || '-'}</td></tr>
                <tr><td>Nama Orang Tua / Wali</td><td>:</td><td>${s.ayah || s.ibu || s.namaWali || '-'}</td></tr>
                <tr><td>Alamat Asal</td><td>:</td><td>${s.desa ? `${s.desa}, ${s.kecamatan || ''}, ${s.kabupaten || ''}` : (s.asalKota || '-')}</td></tr>
                <tr><td>Tanggal ${isGT ? 'Alih Status GT' : 'Boyong'}</td><td>:</td><td>${tglProsesStr} (TA ${s.tahunBoyong || '-'})</td></tr>
                <tr><td>Alasan / Keterangan</td><td>:</td><td>${s.alasanBoyong || '-'}</td></tr>
            </table>

            <div class="status-box">
                <b>KETERANGAN KELUNASAN TANGGUNGAN:</b><br>
                Berdasarkan rekapitulasi data keuangan pesantren, santri yang bersangkutan telah memenuhi syarat administrasi dan <b>DINYATAKAN BEBAS DARI SELURUH TANGGUNGAN KEUANGAN / TAGIHAN PESANTREN</b> (Syahriah Bulanan, Pembayaran Lain, dan Tagihan Kepanitiaan/Kustom).
            </div>

            <p>Demikian Surat Keterangan ini diterbitkan dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
        </div>

        <table class="footer-sign">
            <tr>
                <td>
                    Wali Santri,
                    <div class="space-sign"></div>
                    <b>( ${s.ayah || s.ibu || s.namaWali || '................................'} )</b>
                </td>
                <td>
                    Sumenep, ${tglCetakStr}<br>
                    Pengurus Pesantren,
                    <div class="space-sign"></div>
                    <b>( Pengurus Bagian Administrasi )</b>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `);
    w.document.close();
}

// Buka Modal Detail Profil & Arsip Santri
function bukaModalDetailArsipSantri(santriId) {
    const s = (santriData || []).find(x => x.id === santriId);
    if (!s) return showToast("Data santri tidak ditemukan!", "error");

    const container = document.getElementById('content-detail-arsip-santri');
    const footerLeft = document.getElementById('detail-arsip-action-left');
    if (!container) return;

    const isBoyong = s.status === 'Boyong';
    const isGT = s.status === 'GT';
    const isAktif = s.status === 'Aktif';
    const TA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448';

    // Hitung riwayat pembayaran santri ini
    const santriTrx = (transactions || []).filter(t => t.santriId === s.id && t.type === 'in');
    const totalSemuaBayar = santriTrx.reduce((sum, t) => sum + (t.amount || 0), 0);
    const syahriahBayar = santriTrx.filter(t => t.kategori === 'Syahriah' && t.ta === TA).reduce((sum, t) => sum + (t.amount || 0), 0);

    let statusBoxHtml = '';
    if (isBoyong || isGT) {
        statusBoxHtml = `
            <div class="${isBoyong ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'} rounded-2xl p-4 border space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold ${isBoyong ? 'text-rose-800' : 'text-amber-800'} uppercase tracking-wider flex items-center gap-1.5">
                        <i class="${isBoyong ? 'fas fa-box-archive text-rose-600' : 'fas fa-user-graduate text-amber-600'}"></i> Riwayat Status: ${s.status === 'GT' ? 'Guru Tugas (GT)' : s.status}
                    </span>
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${isBoyong ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}">
                        ${isBoyong ? 'Arsip Santri Boyong' : 'Guru Tugas / Non-Mukim (GT)'}
                    </span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div>
                        <span class="text-gray-500 font-medium">Kamar Terakhir:</span>
                        <div class="font-bold text-gray-800 mt-0.5 font-mono">Kamar ${s.kamarTerakhir || s.kamar || '-'}</div>
                    </div>
                    <div>
                        <span class="text-gray-500 font-medium">Catatan / Penugasan:</span>
                        <div class="font-bold text-gray-800 mt-0.5">${s.alasanBoyong || (isGT ? 'Guru Tugas (GT) / Non-Mukim' : 'Telah boyong dari pondok')}</div>
                    </div>
                </div>
            </div>
        `;
    }

    const cleanPhone = (s.noHpWali || s.hp || '').replace(/\D/g, '').replace(/^0/, '62');

    container.innerHTML = `
        <!-- Header Profil -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-indigo-50/30 p-4 rounded-2xl border border-gray-200">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl ${isAktif ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : (isBoyong ? 'bg-rose-600 text-white shadow-md shadow-rose-200' : 'bg-amber-500 text-white shadow-md shadow-amber-200')} flex items-center justify-center font-extrabold text-2xl shrink-0">
                    ${s.nama ? s.nama.charAt(0) : '?'}
                </div>
                <div>
                    <h3 class="text-lg font-extrabold text-gray-900 uppercase tracking-tight">${s.nama}</h3>
                    <div class="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-600 font-mono">
                        <span class="font-bold text-gray-800">NIS: ${s.nis || '-'}</span>
                        <span>•</span>
                        <span class="text-gray-600">NIK: ${s.nik || '-'}</span>
                        <span>•</span>
                        <span class="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold border border-indigo-200">${s.instansi || 'PPU'}</span>
                    </div>
                </div>
            </div>
            <div>
                ${isAktif 
                    ? `<span class="px-3 py-1.5 text-xs border rounded-xl font-bold bg-emerald-50 text-emerald-700 border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs"><i class="fas fa-check-circle"></i> Santri Aktif Kamar</span>`
                    : (isBoyong 
                        ? `<span class="px-3 py-1.5 text-xs border rounded-xl font-bold bg-rose-50 text-rose-700 border-rose-300 inline-flex items-center gap-1.5 shadow-2xs"><i class="fas fa-box-archive"></i> Sudah Boyong</span>`
                        : `<span class="px-3 py-1.5 text-xs border rounded-xl font-bold bg-amber-50 text-amber-800 border-amber-300 inline-flex items-center gap-1.5 shadow-2xs"><i class="fas fa-user-graduate"></i> Guru Tugas / Non-Mukim (GT)</span>`)
                }
            </div>
        </div>

        ${statusBoxHtml}

        <!-- Grid 4 Kotak Detail -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <!-- Asrama & Pendidikan -->
            <div class="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <span class="text-indigo-600 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <i class="fas fa-bed"></i> Kamar & Pendidikan
                </span>
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <div>
                        <span class="text-gray-400 text-[10px]">Kamar / Asrama:</span>
                        <div class="font-extrabold text-gray-800 font-mono text-sm">${isAktif ? `Kamar ${s.kamar || s.kamarTerakhir || '-'}` : `Eks: ${s.kamarTerakhir || s.kamar || '-'}`}</div>
                    </div>
                    <div>
                        <span class="text-gray-400 text-[10px]">Tgl Masuk:</span>
                        <div class="font-semibold text-gray-700 text-[11px] truncate" title="${s.tglMasuk || '-'}">${s.tglMasuk || '-'}</div>
                    </div>
                    <div>
                        <span class="text-gray-400 text-[10px]">Kelas Diniyah:</span>
                        <div class="font-bold text-purple-700">${s.diniyah ? 'Tingkat ' + s.diniyah : '-'}</div>
                    </div>
                    <div>
                        <span class="text-gray-400 text-[10px]">Sekolah Umum:</span>
                        <div class="font-bold text-blue-700">${s.umum || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- Kelahiran -->
            <div class="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <span class="text-indigo-600 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <i class="fas fa-cake-candles"></i> Tempat & Tanggal Lahir
                </span>
                <div class="space-y-1.5 pt-1">
                    <div>
                        <span class="text-gray-400 text-[10px]">Tempat Lahir:</span>
                        <div class="font-bold text-gray-800">${s.tempatLahir || '-'}</div>
                    </div>
                    <div>
                        <span class="text-gray-400 text-[10px]">Tanggal Lahir:</span>
                        <div class="font-bold text-gray-800">${s.tanggalLahir || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- Orang Tua & Kontak -->
            <div class="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <span class="text-indigo-600 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <i class="fas fa-users"></i> Orang Tua & Kontak Wali
                </span>
                <div class="space-y-1.5 pt-1">
                    <div class="flex justify-between">
                        <div>
                            <span class="text-gray-400 text-[10px]">Ayah:</span>
                            <div class="font-bold text-gray-800">${s.ayah || '-'}</div>
                        </div>
                        <div>
                            <span class="text-gray-400 text-[10px]">Ibu:</span>
                            <div class="font-bold text-gray-800">${s.ibu || '-'}</div>
                        </div>
                    </div>
                    <div class="pt-1 flex items-center justify-between">
                        <div>
                            <span class="text-gray-400 text-[10px]">No. WhatsApp / HP:</span>
                            <div class="font-mono font-bold text-emerald-700">${s.noHpWali || s.hp || 'Belum ada'}</div>
                        </div>
                        ${cleanPhone ? `
                            <a href="https://wa.me/${cleanPhone}" target="_blank" class="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 text-xs inline-flex items-center gap-1 transition-colors">
                                <i class="fab fa-whatsapp text-emerald-600"></i> Chat WA
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Alamat Lengkap -->
            <div class="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <span class="text-indigo-600 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <i class="fas fa-location-dot"></i> Alamat Domisili Lengkap
                </span>
                <div class="space-y-1 pt-1">
                    <div>
                        <span class="text-gray-400 text-[10px]">Desa / Kecamatan:</span>
                        <div class="font-bold text-gray-800">${[s.desa, s.kecamatan].filter(Boolean).join(', ') || '-'}</div>
                    </div>
                    <div>
                        <span class="text-gray-400 text-[10px]">Kabupaten / Provinsi:</span>
                        <div class="font-bold text-gray-800">${[s.kabupaten, s.provinsi].filter(Boolean).join(', ')} ${s.kodePos ? '(' + s.kodePos + ')' : ''}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Ringkasan Keuangan Santri -->
        <div class="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 space-y-3">
            <h4 class="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <i class="fas fa-wallet text-indigo-600"></i> Ringkasan Pembayaran Keuangan
            </h4>
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-white p-3 rounded-xl border border-gray-200">
                    <span class="text-[10px] font-bold text-gray-400 uppercase">Total Riwayat Terbayar</span>
                    <h5 class="text-sm sm:text-base font-extrabold text-emerald-700 font-mono mt-0.5">${formatRupiah(totalSemuaBayar)}</h5>
                    <p class="text-[10px] text-gray-400 mt-0.5">${santriTrx.length} transaksi tercatat</p>
                </div>
                <div class="bg-white p-3 rounded-xl border border-gray-200">
                    <span class="text-[10px] font-bold text-gray-400 uppercase">Syahriah TA ${TA}</span>
                    <h5 class="text-sm sm:text-base font-extrabold text-indigo-700 font-mono mt-0.5">${formatRupiah(syahriahBayar)}</h5>
                    <p class="text-[10px] text-gray-400 mt-0.5">Tahun berjalan</p>
                </div>
            </div>
        </div>
    `;

    if (footerLeft) {
        if (!isAktif) {
            footerLeft.innerHTML = `
                <button onclick="tutupModal('modal-detail-arsip-santri'); bukaModalAktifkanSantri('${s.id}')" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5">
                    <i class="fas fa-door-closed"></i> Aktifkan Kembali ke Kamar
                </button>
            `;
        } else {
            footerLeft.innerHTML = `
                <button onclick="tutupModal('modal-detail-arsip-santri'); bukaModalBoyongSantri('${s.id}')" class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5">
                    <i class="fas fa-sign-out-alt"></i> Keluarkan / Boyong
                </button>
            `;
        }
    }

    bukaModal('modal-detail-arsip-santri');
}

// Download Template File Input Standar Master Santri
function downloadTemplateMasterSantri() {
    const headers = ["NO", "INSTANSI", "TGL MASUK", "NIS", "NIK", "NAMA", "TEMPAT LAHIR", "TANGGAL LAHIR", "KAMAR", "DINIYAH", "UMUM", "HP", "DESA", "KECAMATAN", "KABUPATEN", "PROVINSI", "KODE POS", "AYAH", "IBU", "STATUS"];
    const sampleRows = [
        [1, "PPU", "20 Syawal 1440 H. | 24 Juni 2019 M", "1440-19-028", "3529032705040001", "ABDULLA", "SUMENEP", "27 Juni 2004", "A-02", "I", "SMA", "085230292683", "MANDING TIMUR", "MANDING", "SUMENEP", "JAWA TIMUR", "69452", "ACH. MAULANA", "AMYANI", "BOYONG"],
        [2, "PPU", "11 Syawal 1438 | 08 Juli 2017 M.", "1438-17-011", "3529030605040001", "ACHMAD JUNAIDI", "SUMENEP", "05 Juni 2004", "B-01", "III", "SMP", "082330074833", "MANDING LAOK", "MANDING", "SUMENEP", "JAWA TIMUR", "69452", "Hawawi", "Buriya", "AKTIF"]
    ];

    if (window.XLSX) {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Master_Santri_Template");
        XLSX.writeFile(wb, "Template_Master_Santri_PPU.xlsx");
    } else {
        const csvLines = [headers.join(",")];
        sampleRows.forEach(r => csvLines.push(r.map(v => `"${v}"`).join(",")));
        const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Template_Master_Santri_PPU.csv";
        link.click();
    }
    showToast("Template master santri berhasil diunduh");
}

// Export Seluruh Data Santri dari Tahun ke Tahun (Master Arsip Lengkap) ke Excel
function exportMasterSantriExcel() {
    const list = [...santriData].sort((a, b) => (a.no || 0) - (b.no || 0) || (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
    if (list.length === 0) return showToast("Tidak ada data santri untuk diekspor!", "warning");

    const headers = ["NO", "INSTANSI", "TGL MASUK", "NIS", "NIK", "NAMA", "TEMPAT LAHIR", "TANGGAL LAHIR", "KAMAR", "DINIYAH", "UMUM", "HP", "DESA", "KECAMATAN", "KABUPATEN", "PROVINSI", "KODE POS", "AYAH", "IBU", "STATUS"];
    const rows = list.map((s, idx) => [
        s.no || (idx + 1),
        s.instansi || 'PPU',
        s.tglMasuk || '-',
        s.nis || '-',
        s.nik || '-',
        s.nama,
        s.tempatLahir || '-',
        s.tanggalLahir || '-',
        s.kamar || s.kamarTerakhir || '-',
        s.diniyah || '-',
        s.umum || '-',
        s.hp || s.noHpWali || '-',
        s.desa || '-',
        s.kecamatan || '-',
        s.kabupaten || '-',
        s.provinsi || 'JAWA TIMUR',
        s.kodePos || '-',
        s.ayah || '-',
        s.ibu || '-',
        (s.status || 'Aktif').toUpperCase()
    ]);

    const fileName = `Master_Arsip_Santri_PP_AlUsymuni_${new Date().toLocaleDateString('en-CA')}`;

    if (window.XLSX) {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [
            { wch: 6 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
            { wch: 28 }, { wch: 15 }, { wch: 18 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
            { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 12 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Master_Santri");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
        let csvLines = [headers.join(",")];
        rows.forEach(r => csvLines.push(r.map(v => `"${v}"`).join(",")));
        const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.csv`;
        link.click();
    }
    showToast("Seluruh arsip data santri berhasil diekspor");
}

// ==========================================================================
// Fitur: Template Input, Import Excel/CSV, & Export Excel
// ==========================================================================

// Download Template File Input Standar
function downloadTemplateSantri() {
    const headers = ["NIS", "Nama Santri", "Kamar", "Status", "No. HP / WA Wali", "Nama Orang Tua / Wali", "Asal Daerah / Kota"];
    const sampleRows = [
        ["2024001", "AHMAD FAUZI", "I - A", "Aktif", "081234567890", "H. Moh. Hasan", "Sumenep"],
        ["2024002", "MUHAMMAD RIZKI", "I - B", "Aktif", "085233445566", "Ust. Achmad", "Pamekasan"],
        ["2024003", "SITI AISYAH", "II - A", "Aktif", "087811223344", "H. Abdurrahman", "Bangkalan"],
        ["", "ZULFA NURUL", "II - B", "Aktif", "", "Ibu Fatimah", "Sampang"] // NIS kosong akan di-generate otomatis
    ];

    if (window.XLSX) {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
        ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 18 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template_Santri");
        XLSX.writeFile(wb, "Template_Import_Santri.xlsx");
    } else {
        const csvLines = [headers.join(",")];
        sampleRows.forEach(r => csvLines.push(r.map(v => `"${v}"`).join(",")));
        const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Template_Import_Santri.csv";
        link.click();
    }
    showToast("Template berhasil diunduh");
}

// Buka Modal Import Santri
function bukaModalImportSantri() {
    tempImportSantriData = [];
    const fileInput = document.getElementById('file-import-santri');
    if (fileInput) fileInput.value = '';

    const labelFile = document.getElementById('label-file-selected');
    if (labelFile) {
        labelFile.innerText = '';
        labelFile.classList.add('hidden');
    }

    const previewContainer = document.getElementById('container-preview-import');
    if (previewContainer) previewContainer.classList.add('hidden');

    const btnProses = document.getElementById('btn-proses-import');
    if (btnProses) {
        btnProses.disabled = true;
        btnProses.innerHTML = `<i class="fas fa-check"></i> Proses Import`;
    }

    bukaModal('modal-import-santri');
}

// Handler Preview File Excel / CSV Saat Dipilih
function previewImportSantri(event) {
    const file = event.target.files[0];
    if (!file) return;

    const labelFile = document.getElementById('label-file-selected');
    if (labelFile) {
        labelFile.innerText = `File: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        labelFile.classList.remove('hidden');
    }

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel && window.XLSX) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1 });
                parseAndShowPreviewRows(rows);
            } catch (err) {
                showToast("Gagal membaca file Excel: " + err.message, "error");
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        // Fallback teks CSV
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                const rows = lines.map(line => {
                    const delimiter = line.includes(';') ? ';' : ',';
                    let tokens = [];
                    let inQuotes = false;
                    let curToken = '';
                    for (let i = 0; i < line.length; i++) {
                        let c = line[i];
                        if (c === '"') {
                            inQuotes = !inQuotes;
                        } else if (c === delimiter && !inQuotes) {
                            tokens.push(curToken.trim());
                            curToken = '';
                        } else {
                            curToken += c;
                        }
                    }
                    tokens.push(curToken.trim());
                    return tokens.map(t => t.replace(/^"|"$/g, '').trim());
                });
                parseAndShowPreviewRows(rows);
            } catch (err) {
                showToast("Gagal membaca file CSV: " + err.message, "error");
            }
        };
        reader.readAsText(file);
    }
}

// Parsing Raw Rows dan Render Preview ke Tabel
function parseAndShowPreviewRows(rows) {
    if (!rows || rows.length < 2) {
        return showToast("File tidak berisi baris data yang cukup!", "error");
    }

    const header = rows[0].map(h => (h || '').toString().toLowerCase().trim());
    
    // Deteksi index kolom
    let nisIdx = header.findIndex(h => h.includes('nis') || h.includes('induk'));
    let namaIdx = header.findIndex(h => h.includes('nama') && !h.includes('wali') && !h.includes('orang'));
    let kamarIdx = header.findIndex(h => h.includes('kamar') || h.includes('asrama') || h.includes('kelas'));
    let statusIdx = header.findIndex(h => h.includes('status'));
    let hpIdx = header.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telepon') || h.includes('whatsapp') || h.includes('kontak'));
    let waliIdx = header.findIndex(h => h.includes('wali') || h.includes('orang tua') || h.includes('ayah') || h.includes('ibu'));
    let kotaIdx = header.findIndex(h => h.includes('kota') || h.includes('asal') || h.includes('daerah') || h.includes('alamat'));

    if (namaIdx === -1) namaIdx = 1; // Default kolom kedua
    if (nisIdx === -1) nisIdx = 0;   // Default kolom pertama
    if (kamarIdx === -1) kamarIdx = 2;
    if (statusIdx === -1) statusIdx = 3;

    tempImportSantriData = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const nama = (row[namaIdx] || '').toString().trim();
        const nis = (row[nisIdx] || '').toString().trim();
        const kamar = (row[kamarIdx] || '').toString().trim();
        let status = (row[statusIdx] || '').toString().trim();
        const noHpWali = (hpIdx > -1 && row[hpIdx]) ? row[hpIdx].toString().trim() : '';
        const namaWali = (waliIdx > -1 && row[waliIdx]) ? row[waliIdx].toString().trim() : '';
        const asalKota = (kotaIdx > -1 && row[kotaIdx]) ? row[kotaIdx].toString().trim() : '';

        if (!nama && !nis) continue; // Baris kosong
        if (!nama) continue; // Nama wajib

        if (!status || !['aktif', 'tidak aktif'].includes(status.toLowerCase())) {
            status = 'Aktif';
        } else {
            status = status.toLowerCase() === 'aktif' ? 'Aktif' : 'Tidak Aktif';
        }

        tempImportSantriData.push({ nis, nama, kamar, status, noHpWali, namaWali, asalKota });
    }

    if (tempImportSantriData.length === 0) {
        return showToast("Tidak ditemukan data santri yang valid di dalam file!", "error");
    }

    // Tampilkan preview
    const previewContainer = document.getElementById('container-preview-import');
    const tablePreview = document.getElementById('table-preview-import');
    const countEl = document.getElementById('count-preview-import');
    const btnProses = document.getElementById('btn-proses-import');

    if (countEl) countEl.innerText = tempImportSantriData.length;
    
    if (tablePreview) {
        const previewRows = tempImportSantriData.slice(0, 10);
        let html = previewRows.map(item => `
            <tr>
                <td class="px-3 py-2 font-mono text-gray-500">${item.nis || '<span class="text-amber-500 italic">Auto</span>'}</td>
                <td class="px-3 py-2 font-bold text-gray-800">
                    ${item.nama}
                    ${item.asalKota ? `<span class="text-[10px] text-gray-500 font-normal ml-1">(${item.asalKota})</span>` : ''}
                </td>
                <td class="px-3 py-2 text-gray-600">${item.kamar || '-'}</td>
                <td class="px-3 py-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}">${item.status}</span></td>
            </tr>
        `).join('');

        if (tempImportSantriData.length > 10) {
            html += `<tr><td colspan="4" class="px-3 py-2 text-center text-gray-400 italic bg-gray-50">... dan ${tempImportSantriData.length - 10} data lainnya</td></tr>`;
        }
        tablePreview.innerHTML = html;
    }

    if (previewContainer) previewContainer.classList.remove('hidden');
    if (btnProses) {
        btnProses.disabled = false;
        btnProses.innerHTML = `<i class="fas fa-check mr-1.5"></i> Proses Import (${tempImportSantriData.length} Santri)`;
    }
}

// Eksekusi Import Santri ke Data Utama
function prosesEksekusiImportSantri() {
    if (!tempImportSantriData || tempImportSantriData.length === 0) {
        return showToast("Tidak ada data untuk diimport!", "error");
    }

    const checkUpdate = document.getElementById('check-update-existing');
    const updateExisting = checkUpdate ? checkUpdate.checked : true;

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    tempImportSantriData.forEach(item => {
        let nis = item.nis;
        if (!nis) {
            nis = 'NIS-' + (Date.now() + Math.floor(Math.random() * 10000)).toString().slice(-6);
        }

        const existingIdx = santriData.findIndex(s => s.nis && s.nis.toString().trim() === nis);

        if (existingIdx > -1) {
            if (updateExisting) {
                santriData[existingIdx].nama = item.nama;
                santriData[existingIdx].kamar = item.kamar || santriData[existingIdx].kamar;
                santriData[existingIdx].status = item.status || santriData[existingIdx].status;
                if (item.noHpWali) santriData[existingIdx].noHpWali = item.noHpWali;
                if (item.namaWali) santriData[existingIdx].namaWali = item.namaWali;
                if (item.asalKota) santriData[existingIdx].asalKota = item.asalKota;
                updatedCount++;
            } else {
                skippedCount++;
            }
        } else {
            santriData.push({
                id: 'S-' + (Date.now() + Math.floor(Math.random() * 10000)),
                nis: nis,
                nama: item.nama,
                kamar: item.kamar || '',
                status: item.status || 'Aktif',
                noHpWali: item.noHpWali || '',
                namaWali: item.namaWali || '',
                asalKota: item.asalKota || ''
            });
            addedCount++;
        }
    });

    saveDataToStorage();
    updateFiltersAndDropdowns();
    renderSemuaTabel();
    updateDashboard();
    tutupModal('modal-import-santri');

    Swal.fire({
        icon: 'success',
        title: 'Import Data Santri Selesai!',
        html: `
            <div class="text-sm text-gray-600 space-y-1 mt-2 text-left bg-gray-50 p-4 rounded-xl border border-gray-100 font-mono">
                <p>• Santri baru ditambahkan: <b class="text-emerald-600">${addedCount}</b></p>
                <p>• Santri diperbarui: <b class="text-indigo-600">${updatedCount}</b></p>
                ${skippedCount > 0 ? `<p>• Dilewati (NIS sama): <b class="text-gray-500">${skippedCount}</b></p>` : ''}
                <p class="pt-2 border-t border-gray-200 text-gray-700 font-bold">Total Santri Sekarang: ${santriData.length}</p>
            </div>
        `,
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#4f46e5'
    });
}

// Export Data Santri ke Excel (.xlsx) atau CSV
function exportSantriExcel() {
    const headers = ["No", "NIS", "Nama Lengkap", "Kamar / Asrama", "Nama Wali", "No. HP / WA Wali", "Asal Daerah / Kota", "Status Santri"];
    const rows = santriData.map((s, idx) => [
        idx + 1,
        s.nis || '-',
        s.nama,
        s.kamar || '-',
        s.namaWali || '-',
        s.noHpWali || '-',
        s.asalKota || '-',
        s.status
    ]);

    const fileName = `Data_Santri_${getTahunAjaranAktif().replace('/', '_')}`;

    if (window.XLSX) {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 28 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data_Santri");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
        let csvLines = [headers.join(",")];
        rows.forEach(r => csvLines.push(r.map(v => `"${v}"`).join(",")));
        const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.csv`;
        link.click();
    }
    showToast("Data santri berhasil diekspor");
}

// ==========================================================================
// Fitur: Mutasi / Pindah Kamar Santri
// ==========================================================================

// Render Bagian Mutasi Kamar (KPI, Sebaran Kamar, Dropdown & Riwayat)
function renderMutasiKamarSection() {
    const page = document.getElementById('page-mutasi-kamar');
    const card = document.getElementById('card-mutasi-kamar');
    if (!page && !card) return;

    const aktifSantri = (santriData || []).filter(s => s.status === 'Aktif');

    // 1. Update KPI Ringkasan
    const kpiSantri = document.getElementById('mutasi-kpi-santri');
    const kpiKamar = document.getElementById('mutasi-kpi-kamar');
    const kpiRiwayat = document.getElementById('mutasi-kpi-riwayat');

    const uniqueRooms = (typeof getAllNamaKamar === 'function') 
        ? getAllNamaKamar() 
        : [...new Set(aktifSantri.map(s => (s.kamar || '').trim()).filter(Boolean))].sort();

    if (kpiSantri) kpiSantri.innerText = aktifSantri.length;
    if (kpiKamar) kpiKamar.innerText = uniqueRooms.length;
    if (kpiRiwayat) kpiRiwayat.innerText = (window.mutasiKamarList || []).length;

    // 2. Render Sebaran Santri per Kamar
    const gridSebaran = document.getElementById('grid-sebaran-kamar');
    const countKamarInfo = document.getElementById('mutasi-count-kamar-info');
    if (countKamarInfo) countKamarInfo.innerText = `${uniqueRooms.length} Kamar Terdata`;

    if (gridSebaran) {
        const roomCounts = {};
        aktifSantri.forEach(s => {
            const k = (s.kamar || 'Tanpa Kamar').trim();
            roomCounts[k] = (roomCounts[k] || 0) + 1;
        });

        if (uniqueRooms.length === 0) {
            gridSebaran.innerHTML = `<p class="col-span-full text-xs text-gray-400 py-2">Belum ada data kamar terdaftar.</p>`;
        } else {
            gridSebaran.innerHTML = uniqueRooms.map(k => `
                <div onclick="pilihKamarTujuanCepat('${k}')" 
                     class="group p-3 rounded-xl border border-gray-200 bg-white hover:border-teal-500 hover:bg-teal-50/50 hover:shadow-xs cursor-pointer transition-all select-none">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-gray-700 uppercase group-hover:text-teal-700 font-mono">${k}</span>
                        <span class="w-2 h-2 rounded-full bg-teal-400"></span>
                    </div>
                    <div class="mt-2 flex items-baseline gap-1">
                        <span class="text-lg font-extrabold text-teal-700 font-mono">${roomCounts[k] || 0}</span>
                        <span class="text-[10px] text-gray-400 font-medium">Santri</span>
                    </div>
                </div>
            `).join('');
        }
    }

    // 3. Update Pilihan Santri Mutasi jika sedang terseleksi
    const hidSantri = document.getElementById('mutasi-santri-id');
    const inputSearch = document.getElementById('mutasi-search-input');
    if (hidSantri && hidSantri.value) {
        const s = aktifSantri.find(x => x.id === hidSantri.value);
        if (s && inputSearch) {
            inputSearch.value = `${s.nama} (${s.nis || '-'})`;
            const inputKamarAsal = document.getElementById('mutasi-kamar-asal');
            if (inputKamarAsal) inputKamarAsal.value = s.kamar || '-';
        }
    }

    // 4. Populate Dropdown Kamar yang Sudah Ada
    const selKamarAda = document.getElementById('mutasi-select-kamar-ada');
    if (selKamarAda) {
        let options = '<option value="">Pilih Kamar...</option>';
        uniqueRooms.forEach(k => {
            options += `<option value="${k}">${k}</option>`;
        });
        selKamarAda.innerHTML = options;
    }

    // 5. Set Default Tanggal Mutasi ke Hari Ini jika Kosong
    const inputDate = document.getElementById('mutasi-tanggal');
    if (inputDate && !inputDate.value) {
        inputDate.value = new Date().toLocaleDateString('en-CA');
    }

    // 6. Render Tabel Riwayat Mutasi
    renderTableRiwayatMutasi();
}

// Render Tabel Riwayat Mutasi Kamar
function renderTableRiwayatMutasi(resetPage = false) {
    if (resetPage && window.paginationState) {
        window.paginationState.mutasi.page = 1;
    }
    const tb = document.getElementById('table-riwayat-mutasi');
    const badge = document.getElementById('badge-total-mutasi');
    if (!tb) return;

    const searchInput = document.getElementById('search-riwayat-mutasi');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let list = window.mutasiKamarList || [];

    if (badge) badge.innerText = `${list.length} Riwayat Mutasi`;

    if (search) {
        list = list.filter(m => 
            (m.nama || '').toLowerCase().includes(search) || 
            (m.nis || '').toLowerCase().includes(search) ||
            (m.kamarLama || '').toLowerCase().includes(search) ||
            (m.kamarBaru || '').toLowerCase().includes(search) ||
            (m.alasan || '').toLowerCase().includes(search)
        );
    }

    const totalItems = list.length;
    const page = window.paginationState ? window.paginationState.mutasi.page : 1;
    const pageSize = (window.paginationState && window.paginationState.mutasi.pageSize) || 20;

    const paged = typeof paginateArray === 'function'
        ? paginateArray(list, page, pageSize)
        : { items: list.slice(0, 20), total: totalItems, currentPage: 1, totalPages: 1, startIndex: 0 };

    if (window.paginationState) {
        window.paginationState.mutasi.page = paged.currentPage;
    }

    if (list.length === 0) {
        tb.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-400">
                    <i class="fas fa-history text-2xl mb-1 text-gray-300"></i>
                    <p class="text-sm">${search ? 'Tidak ada riwayat mutasi yang cocok dengan pencarian.' : 'Belum ada riwayat mutasi kamar santri.'}</p>
                </td>
            </tr>
        `;
        if (typeof renderPaginationControls === 'function') {
            renderPaginationControls({
                containerId: 'pagination-mutasi',
                totalItems: 0,
                currentPage: 1,
                pageSize: pageSize,
                onPageChange: 'gantiHalamanMutasi'
            });
        }
        return;
    }

    tb.innerHTML = paged.items.map((item, idx) => `
        <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100">
            <td class="px-5 py-3 text-center text-gray-400 text-xs">${paged.startIndex + idx + 1}</td>
            <td class="px-5 py-3 text-xs text-gray-600 font-medium whitespace-nowrap">
                ${new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </td>
            <td class="px-5 py-3">
                <div class="font-bold text-gray-800 uppercase text-xs">${item.nama}</div>
                <div class="font-mono text-[10px] text-gray-400">${item.nis || '-'}</div>
            </td>
            <td class="px-5 py-3">
                <div class="flex items-center gap-2 text-xs">
                    <span class="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold font-mono border border-gray-200">${item.kamarLama || '-'}</span>
                    <i class="fas fa-arrow-right text-teal-600 text-xs"></i>
                    <span class="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold font-mono border border-teal-200">${item.kamarBaru}</span>
                </div>
            </td>
            <td class="px-5 py-3 text-xs text-gray-600 max-w-xs truncate">${item.alasan || '-'}</td>
            <td class="px-5 py-3 text-center whitespace-nowrap">
                <button onclick="batalkanMutasiKamar('${item.id}')" class="text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 border border-rose-200 shadow-xs" title="Kembalikan santri ke kamar asal">
                    <i class="fas fa-undo text-[10px]"></i> Batal
                </button>
            </td>
        </tr>
    `).join('');

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls({
            containerId: 'pagination-mutasi',
            totalItems: totalItems,
            currentPage: paged.currentPage,
            pageSize: pageSize,
            onPageChange: 'gantiHalamanMutasi'
        });
    }
}

// ==========================================================================
// SEARCHABLE COMBOBOX: CARI & PILIH SANTRI MUTASI KAMAR (BISA DIKETIK & OTOMATIS)
// ==========================================================================

function onSearchSantriMutasi(query) {
    const dropdown = document.getElementById('dropdown-santri-mutasi');
    const btnClear = document.getElementById('btn-clear-santri-mutasi');
    if (!dropdown) return;

    if (btnClear) {
        if (query) btnClear.classList.remove('hidden');
        else btnClear.classList.add('hidden');
    }

    const q = (query || '').toLowerCase().trim();
    const candidates = (santriData || [])
        .filter(s => s.status === 'Aktif')
        .filter(s => {
            if (!q) return true;
            const nama = (s.nama || '').toLowerCase();
            const nis = (s.nis || '').toLowerCase();
            const kamar = (s.kamar || '').toLowerCase();
            return nama.includes(q) || nis.includes(q) || kamar.includes(q);
        })
        .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }))
        .slice(0, 35);

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
            <div onclick="selectSantriForMutasi('${s.id}')" class="p-3 hover:bg-teal-50/70 cursor-pointer transition-colors flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-xs shrink-0">
                    ${inisial}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-gray-800 text-xs truncate">${s.nama}</div>
                    <div class="text-[11px] text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>NIS: ${s.nis || '-'}</span>
                        <span>•</span>
                        <span class="text-teal-700 font-bold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">Kamar: ${s.kamar || '-'}</span>
                    </div>
                </div>
                <div class="text-xs text-teal-600 font-bold shrink-0">
                    Pilih <i class="fas fa-chevron-right text-[10px]"></i>
                </div>
            </div>
        `;
    });

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
}

function onFocusSantriMutasi() {
    const input = document.getElementById('mutasi-search-input');
    onSearchSantriMutasi(input ? input.value : '');
}

function selectSantriForMutasi(santriId) {
    const s = (santriData || []).find(x => x.id === santriId);
    if (!s) return;

    const inputHidden = document.getElementById('mutasi-santri-id');
    const inputSearch = document.getElementById('mutasi-search-input');
    const inputKamarAsal = document.getElementById('mutasi-kamar-asal');
    const inputKamarBaru = document.getElementById('mutasi-kamar-baru');
    const dropdown = document.getElementById('dropdown-santri-mutasi');
    const btnClear = document.getElementById('btn-clear-santri-mutasi');

    if (inputHidden) inputHidden.value = s.id;
    if (inputSearch) inputSearch.value = `${s.nama} (${s.nis || '-'})`;
    if (inputKamarAsal) inputKamarAsal.value = s.kamar || '-';
    if (inputKamarBaru) {
        inputKamarBaru.value = '';
        inputKamarBaru.focus();
    }
    if (dropdown) dropdown.classList.add('hidden');
    if (btnClear) btnClear.classList.remove('hidden');

    onMutasiSantriSelected();
}

function clearSelectedSantriMutasi() {
    const inputHidden = document.getElementById('mutasi-santri-id');
    const inputSearch = document.getElementById('mutasi-search-input');
    const inputKamarAsal = document.getElementById('mutasi-kamar-asal');
    const dropdown = document.getElementById('dropdown-santri-mutasi');
    const btnClear = document.getElementById('btn-clear-santri-mutasi');

    if (inputHidden) inputHidden.value = '';
    if (inputSearch) {
        inputSearch.value = '';
        inputSearch.focus();
    }
    if (inputKamarAsal) inputKamarAsal.value = '';
    if (dropdown) dropdown.classList.add('hidden');
    if (btnClear) btnClear.classList.add('hidden');

    onMutasiSantriSelected();
}

// Handler Saat Santri Dipilih di Dropdown Mutasi
function onMutasiSantriSelected() {
    const selSantri = document.getElementById('mutasi-santri-id');
    const inputKamarAsal = document.getElementById('mutasi-kamar-asal');
    const inputKamarBaru = document.getElementById('mutasi-kamar-baru');
    if (!selSantri || !inputKamarAsal) return;

    const sId = selSantri.value;
    if (!sId) {
        inputKamarAsal.value = '';
        return;
    }

    const s = (santriData || []).find(x => x.id === sId);
    if (s) {
        inputKamarAsal.value = s.kamar || '-';
        if (inputKamarBaru) inputKamarBaru.value = '';
    }
}

// Cepat Isi Kamar Tujuan dari Dropdown atau Grid Kamar yang Ada
function pilihKamarTujuanCepat(kamar) {
    if (!kamar) return;
    const inputKamarBaru = document.getElementById('mutasi-kamar-baru');
    if (inputKamarBaru) {
        inputKamarBaru.value = kamar;
        inputKamarBaru.focus();
    }
}

// Buka dan Siapkan Form Mutasi untuk Santri Tertentu (dari Tombol Tabel Santri)
function siapkanMutasiKamar(santriId) {
    const s = (santriData || []).find(x => x.id === santriId);
    if (!s) return;

    navigate('mutasi-kamar');

    setTimeout(() => {
        selectSantriForMutasi(santriId);

        const inputKamarBaru = document.getElementById('mutasi-kamar-baru');
        const card = document.getElementById('card-mutasi-kamar');
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (inputKamarBaru) {
            inputKamarBaru.focus();
        }

        showToast(`Pilih kamar baru untuk ${s.nama}`, "info");
    }, 150);
}

// Proses Eksekusi Mutasi Kamar Santri
function prosesMutasiKamar() {
    const selSantri = document.getElementById('mutasi-santri-id');
    const inputKamarBaru = document.getElementById('mutasi-kamar-baru');
    const inputTanggal = document.getElementById('mutasi-tanggal');
    const inputAlasan = document.getElementById('mutasi-alasan');

    const sId = selSantri ? selSantri.value : '';
    const kamarBaru = inputKamarBaru ? inputKamarBaru.value.trim().toUpperCase() : '';
    const tanggal = inputTanggal && inputTanggal.value ? inputTanggal.value : new Date().toLocaleDateString('en-CA');
    const alasan = inputAlasan ? inputAlasan.value.trim() : '';

    if (!sId) return showToast("Pilih santri yang akan dipindahkan!", "error");
    if (!kamarBaru) return showToast("Tentukan kamar tujuan baru santri!", "error");

    const s = (santriData || []).find(x => x.id === sId);
    if (!s) return showToast("Data santri tidak ditemukan!", "error");

    const kamarLama = (s.kamar || '-').trim().toUpperCase();
    if (kamarLama === kamarBaru) {
        return showToast(`Kamar tujuan (${kamarBaru}) tidak boleh sama dengan kamar saat ini!`, "warning");
    }

    showConfirm("Konfirmasi Pindah Kamar", `Pindahkan ${s.nama} dari Kamar ${kamarLama} ke Kamar ${kamarBaru}?`, () => {
        // 1. Catat riwayat mutasi
        if (!window.mutasiKamarList) window.mutasiKamarList = [];
        window.mutasiKamarList.unshift({
            id: 'MUT-' + Date.now(),
            santriId: s.id,
            nama: s.nama,
            nis: s.nis || '-',
            kamarLama: kamarLama,
            kamarBaru: kamarBaru,
            tanggal: tanggal,
            alasan: alasan || 'Pindah Kamar Santri',
            createdAt: new Date().toISOString()
        });

        // 2. Perbarui kamar santri
        s.kamar = kamarBaru;

        // 3. Simpan dan perbarui semua view
        saveDataToStorage();
        updateFiltersAndDropdowns();
        renderSemuaTabel();
        renderMutasiKamarSection();

        // 4. Reset input kamar baru, alasan, & pilihan santri
        if (inputKamarBaru) inputKamarBaru.value = '';
        if (inputAlasan) inputAlasan.value = '';
        const selKamarAda = document.getElementById('mutasi-select-kamar-ada');
        if (selKamarAda) selKamarAda.value = '';
        clearSelectedSantriMutasi();

        showToast(`Berhasil memindahkan ${s.nama} ke Kamar ${kamarBaru}!`);
    });
}

// Batalkan Riwayat Mutasi (Kembalikan Santri ke Kamar Asal)
function batalkanMutasiKamar(mutasiId) {
    const list = window.mutasiKamarList || [];
    const item = list.find(m => m.id === mutasiId);
    if (!item) return;

    showConfirm("Batalkan Mutasi?", `Kembalikan ${item.nama} ke kamar asalnya (${item.kamarLama})?`, () => {
        const s = (santriData || []).find(x => x.id === item.santriId);
        if (s) {
            s.kamar = item.kamarLama;
        }

        window.mutasiKamarList = list.filter(m => m.id !== mutasiId);
        saveDataToStorage();
        updateFiltersAndDropdowns();
        renderSemuaTabel();
        renderMutasiKamarSection();

        showToast(`Mutasi dibatalkan. ${item.nama} kembali ke Kamar ${item.kamarLama}`);
    });
}

// Ekspor Riwayat Mutasi Kamar ke Excel / CSV
function exportMutasiKamarExcel() {
    const list = window.mutasiKamarList || [];
    if (list.length === 0) {
        return showToast("Belum ada riwayat mutasi untuk diekspor!", "warning");
    }

    const headers = ["No", "Tanggal Mutasi", "NIS", "Nama Santri", "Kamar Lama (Asal)", "Kamar Baru (Tujuan)", "Alasan / Keterangan"];
    const rows = list.map((item, idx) => [
        idx + 1,
        item.tanggal,
        item.nis || '-',
        item.nama,
        item.kamarLama || '-',
        item.kamarBaru,
        item.alasan || '-'
    ]);

    const fileName = `Riwayat_Mutasi_Kamar_${new Date().toLocaleDateString('en-CA')}`;

    if (window.XLSX) {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 30 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Riwayat_Mutasi");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
        let csvLines = [headers.join(",")];
        rows.forEach(r => csvLines.push(r.map(v => `"${v}"`).join(",")));
        const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.csv`;
        link.click();
    }
    showToast("Riwayat mutasi kamar berhasil diekspor");
}

// Expose ke global window
window.updateFiltersAndDropdowns = updateFiltersAndDropdowns;
window.updateMasterFiltersAndDropdowns = updateMasterFiltersAndDropdowns;
window.renderSemuaTabel = renderSemuaTabel;
window.renderMasterSantriTable = renderMasterSantriTable;
window.bukaModalSantri = bukaModalSantri;
window.toggleFieldBoyongModalSantri = toggleFieldBoyongModalSantri;
window.simpanSantri = simpanSantri;
window.editSantri = editSantri;
window.hapusSantri = hapusSantri;
window.hitungRincianTunggakanSantri = hitungRincianTunggakanSantri;
window.updateBoyongStatusTanggungan = updateBoyongStatusTanggungan;
window.lunasiSemuaTanggunganSantri = lunasiSemuaTanggunganSantri;
window.bukaModalBoyongSantri = bukaModalBoyongSantri;
window.onSearchSantriBoyong = onSearchSantriBoyong;
window.onFocusSantriBoyong = onFocusSantriBoyong;
window.selectSantriForBoyong = selectSantriForBoyong;
window.clearSelectedSantriBoyong = clearSelectedSantriBoyong;
window.onBoyongSantriSelectChanged = onBoyongSantriSelectChanged;
window.onBoyongSampaiBulanChanged = onBoyongSampaiBulanChanged;
window.onProsesStatusTipeChanged = onProsesStatusTipeChanged;
window.onBoyongKategoriChanged = onBoyongKategoriChanged;
window.prosesBoyongSantri = prosesBoyongSantri;
window.bukaModalAktifkanSantri = bukaModalAktifkanSantri;
window.prosesAktifkanSantri = prosesAktifkanSantri;
window.updateBoyongFiltersAndDropdowns = updateBoyongFiltersAndDropdowns;
window.renderBoyongSantriTable = renderBoyongSantriTable;
window.exportBoyongSantriExcel = exportBoyongSantriExcel;
window.cetakSuratKeteranganBoyong = cetakSuratKeteranganBoyong;
window.bukaModalDetailArsipSantri = bukaModalDetailArsipSantri;
window.downloadTemplateSantri = downloadTemplateSantri;
window.downloadTemplateMasterSantri = downloadTemplateMasterSantri;
window.exportMasterSantriExcel = exportMasterSantriExcel;
window.bukaModalImportSantri = bukaModalImportSantri;
window.previewImportSantri = previewImportSantri;
window.prosesEksekusiImportSantri = prosesEksekusiImportSantri;
window.exportSantriExcel = exportSantriExcel;
window.renderMutasiKamarSection = renderMutasiKamarSection;
window.renderTableRiwayatMutasi = renderTableRiwayatMutasi;
window.onMutasiSantriSelected = onMutasiSantriSelected;
window.pilihKamarTujuanCepat = pilihKamarTujuanCepat;
window.siapkanMutasiKamar = siapkanMutasiKamar;
window.prosesMutasiKamar = prosesMutasiKamar;
window.batalkanMutasiKamar = batalkanMutasiKamar;
window.exportMutasiKamarExcel = exportMutasiKamarExcel;
window.generateNisOtomatis = generateNisOtomatis;
window.bukaChatWaliSantri = bukaChatWaliSantri;
window.onSearchSantriMutasi = onSearchSantriMutasi;
window.onFocusSantriMutasi = onFocusSantriMutasi;
window.selectSantriForMutasi = selectSantriForMutasi;
window.clearSelectedSantriMutasi = clearSelectedSantriMutasi;

// Listener Tutup Dropdown Search Santri saat Klik di Luar
document.addEventListener('click', function(e) {
    const contMutasi = document.getElementById('container-select-santri-mutasi');
    const dropMutasi = document.getElementById('dropdown-santri-mutasi');
    if (dropMutasi && contMutasi && !contMutasi.contains(e.target)) {
        dropMutasi.classList.add('hidden');
    }
});


