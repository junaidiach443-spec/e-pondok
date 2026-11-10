/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Pengaturan Sistem Module
 * Konfigurasi master tahun ajaran, tarif syahriah, pos tagihan, & divisi kepanitiaan
 * ==========================================================================
 */

// Render Tabel Pengaturan Tahun Ajaran
function renderPengaturanTahunAjaran() {
    const tb = document.getElementById('table-tahun-ajaran');
    if (!tb) return;

    tb.innerHTML = appSettings.tahunAjaranList.map((t, i) => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 font-bold text-gray-800 text-base">${t.ta}</td>
            <td class="px-6 py-4">
                ${t.aktif 
                    ? `<span class="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full shadow-sm"><div class="w-2 h-2 rounded-full bg-blue-700"></div> Aktif</span>`
                    : `<span class="inline-flex px-4 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">Tidak Aktif</span>`
                }
            </td>
            <td class="px-6 py-4 text-right">
                ${!t.aktif ? `<button onclick="aktifkanTahun(${i})" class="w-9 h-9 rounded-full border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors mr-2 shadow-sm" title="Aktifkan"><i class="fas fa-check"></i></button>` : ''}
                <button onclick="hapusTahun(${i})" class="text-rose-400 hover:text-rose-600 p-2" title="Hapus"><i class="fas fa-trash-alt text-lg"></i></button>
            </td>
        </tr>
    `).join('');
}

// Tambah Tahun Ajaran Baru
function tambahTahunAjaran() {
    const inputEl = document.getElementById('input-tahun-baru');
    const n = inputEl ? inputEl.value.trim() : '';
    if (!n) return showToast("Isi nama tahun ajaran!", "error");

    appSettings.tahunAjaranList.push({ ta: n, aktif: false });
    saveDataToStorage();
    if (inputEl) inputEl.value = '';
    renderPengaturanTahunAjaran();
    showToast("Tahun Ajaran Ditambahkan");
}

// Aktifkan Tahun Ajaran Tertentu
function aktifkanTahun(index) {
    if (!appSettings.tahunAjaranList || !appSettings.tahunAjaranList[index]) return;
    appSettings.tahunAjaranList.forEach(t => t.aktif = false);
    appSettings.tahunAjaranList[index].aktif = true;
    saveDataToStorage();
    renderPengaturanTahunAjaran();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderSyahriah === 'function') renderSyahriah();
    if (typeof renderPembayaranLainPage === 'function') renderPembayaranLainPage();
    if (typeof renderPengeluaran === 'function') renderPengeluaran();
    if (typeof renderLaporan === 'function') renderLaporan();
    if (typeof renderLiburanSantriPage === 'function') renderLiburanSantriPage();
    if (typeof renderPulangSantriPage === 'function') renderPulangSantriPage();
    if (typeof renderDaftarBebasSyahriah === 'function') renderDaftarBebasSyahriah();
    if (typeof updateDateHeader === 'function') updateDateHeader();
    showToast(`Tahun Ajaran ${appSettings.tahunAjaranList[index].ta} Diaktifkan`);
}

// Hapus Tahun Ajaran
function hapusTahun(index) {
    if (appSettings.tahunAjaranList.length <= 1) return showToast("Minimal harus ada 1 Tahun Ajaran", "error");
    if (appSettings.tahunAjaranList[index].aktif) return showToast("Tidak bisa menghapus tahun yang sedang aktif", "error");

    showConfirm("Hapus Tahun Ajaran", "Yakin ingin menghapus tahun ajaran ini?", () => {
        appSettings.tahunAjaranList.splice(index, 1);
        saveDataToStorage();
        renderPengaturanTahunAjaran();
        showToast("Tahun Ajaran Dihapus");
    });
}

// Render Tabel Master Tagihan Kustom & Dispensasi Syahriah
function renderPengaturanTagihan() {
    renderDaftarBebasSyahriah();
    const tb = document.getElementById('table-tagihan-kustom');
    if (!tb) return;

    tb.innerHTML = appSettings.tagihanKustom.map((t, i) => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 font-bold text-gray-800 uppercase">${t.nama}</td>
            <td class="px-4 py-3 text-right text-gray-600 font-medium">${formatRupiah(t.nominal)}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="editTagihanKustom(${i})" class="text-indigo-500 hover:text-indigo-700 p-1 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="hapusTagihanKustom(${i})" class="text-rose-400 hover:text-rose-600 p-1" title="Hapus"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

// Simpan Tarif Syahriah Bulanan
function simpanPengaturanUmum() {
    const elTarif = document.getElementById('setting-tarif');
    appSettings.tarifSyahriah = parseInt(elTarif.value) || 0;
    saveDataToStorage();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderSyahriah === 'function') renderSyahriah();
    showToast("Tarif Syahriah Tersimpan");
}

// ==========================================================================
// Pengaturan Santri Bebas Tanggungan Syahriah (Dispensasi Penuh 100%)
// ==========================================================================

// Render Tabel Santri Bebas Syahriah
function renderDaftarBebasSyahriah() {
    const tb = document.getElementById('table-bebas-syahriah');
    const badgeCount = document.getElementById('badge-total-bebas-syahriah');
    if (!tb) return;

    const list = appSettings.santriBebasSyahriah || [];
    if (badgeCount) badgeCount.innerText = `${list.length} Santri`;

    if (list.length === 0) {
        tb.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-gray-400">Belum ada santri yang dibebaskan syahriah.</td></tr>';
        return;
    }

    const santriMap = new Map((santriData || []).map(s => [s.id, s]));

    tb.innerHTML = list.map(item => {
        const s = santriMap.get(item.santriId) || { nama: 'Santri Tidak Ditemukan', nis: '-', kamar: '-' };
        const alasan = item.alasan || item.kategori || 'Dispensasi Penuh';
        const tgl = item.tanggal ? formatTanggalIndo(item.tanggal) : '-';

        return `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-50">
                <td class="px-4 py-3">
                    <div class="font-bold text-gray-900">${s.nama}</div>
                    <div class="text-[10px] text-gray-400 font-mono mt-0.5">Ditetapkan: ${tgl}</div>
                </td>
                <td class="px-4 py-3 font-mono text-gray-600">
                    <div class="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block text-[11px]">
                        Kamar ${s.kamar || s.kamarTerakhir || '-'}
                    </div>
                    <div class="text-[10px] text-gray-400 mt-0.5">NIS: ${s.nis || '-'}</div>
                </td>
                <td class="px-4 py-3">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        <i class="fas fa-gift text-blue-600 text-[10px]"></i> ${alasan}
                    </span>
                </td>
                <td class="px-4 py-3 text-center">
                    <button onclick="hapusBebasSyahriah('${item.santriId}')" class="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-colors inline-flex items-center justify-center shadow-xs cursor-pointer" title="Hapus Status Bebas Syahriah">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// State untuk pencarian combobox bebas syahriah
let selectedSantriBebas = null;

// Buka Modal Tambah Santri Bebas Syahriah
function bukaModalBebasSyahriah() {
    selectedSantriBebas = null;
    const inputId = document.getElementById('bebas-syahriah-santri-id');
    const inputSearch = document.getElementById('bebas-syahriah-search-input');
    const inputKat = document.getElementById('bebas-syahriah-kategori');
    const inputKet = document.getElementById('bebas-syahriah-keterangan');
    const dropdown = document.getElementById('dropdown-santri-bebas');
    const cardSelected = document.getElementById('card-selected-santri-bebas');
    const btnClear = document.getElementById('btn-clear-santri-bebas');

    if (inputId) inputId.value = '';
    if (inputSearch) {
        inputSearch.value = '';
        inputSearch.disabled = false;
    }
    if (inputKet) inputKet.value = '';
    if (inputKat) inputKat.value = 'Yatim / Piatu';
    if (dropdown) {
        dropdown.innerHTML = '';
        dropdown.classList.add('hidden');
    }
    if (cardSelected) cardSelected.classList.add('hidden');
    if (btnClear) btnClear.classList.add('hidden');

    bukaModal('modal-bebas-syahriah');
}

// Pencarian Santri untuk Bebas Syahriah (Menampilkan Nama & Kamar)
function onSearchSantriBebas(query) {
    const dropdown = document.getElementById('dropdown-santri-bebas');
    const btnClear = document.getElementById('btn-clear-santri-bebas');
    if (!dropdown) return;

    if (btnClear) {
        if (query) btnClear.classList.remove('hidden');
        else btnClear.classList.add('hidden');
    }

    const q = (query || '').toLowerCase().trim();
    const sudahBebasSet = new Set((appSettings.santriBebasSyahriah || []).map(x => (typeof x === 'string' ? x : x.santriId)));
    
    const candidates = (santriData || [])
        .filter(s => s.status === 'Aktif' && !sudahBebasSet.has(s.id))
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
                Santri tidak ditemukan atau sudah terdaftar bebas syahriah.
            </div>
        `;
        dropdown.classList.remove('hidden');
        return;
    }

    dropdown.innerHTML = candidates.map(s => `
        <div onclick="pilihSantriBebas('${s.id}')" class="p-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors">
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    ${(s.nama || '?').charAt(0).toUpperCase()}
                </div>
                <div class="truncate">
                    <div class="font-bold text-xs text-gray-900 uppercase truncate">${s.nama}</div>
                    <div class="text-[10px] text-gray-500 font-mono mt-0.5">NIS: ${s.nis || '-'}</div>
                </div>
            </div>
            <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-blue-800 border border-blue-200 shrink-0 font-mono">
                Kamar ${s.kamar || '-'}
            </span>
        </div>
    `).join('');

    dropdown.classList.remove('hidden');
}

// Handler Fokus Input Bebas Syahriah
function onFocusSantriBebas() {
    const inputSearch = document.getElementById('bebas-syahriah-search-input');
    onSearchSantriBebas(inputSearch ? inputSearch.value : '');
}

// Pilih Santri dari Dropdown Bebas Syahriah
function pilihSantriBebas(santriId) {
    const s = (santriData || []).find(x => x.id === santriId);
    if (!s) return;

    selectedSantriBebas = s;
    const inputId = document.getElementById('bebas-syahriah-santri-id');
    const inputSearch = document.getElementById('bebas-syahriah-search-input');
    const dropdown = document.getElementById('dropdown-santri-bebas');
    const cardSelected = document.getElementById('card-selected-santri-bebas');
    const btnClear = document.getElementById('btn-clear-santri-bebas');

    if (inputId) inputId.value = s.id;
    if (inputSearch) {
        inputSearch.value = s.nama;
        inputSearch.disabled = true;
    }
    if (dropdown) dropdown.classList.add('hidden');
    if (btnClear) btnClear.classList.remove('hidden');

    if (cardSelected) {
        const elAvatar = document.getElementById('bebas-avatar');
        const elNama = document.getElementById('bebas-nama');
        const elNis = document.getElementById('bebas-nis');
        const elKamar = document.getElementById('bebas-kamar');

        if (elAvatar) elAvatar.innerText = (s.nama || '?').charAt(0).toUpperCase();
        if (elNama) elNama.innerText = s.nama;
        if (elNis) elNis.innerText = 'NIS: ' + (s.nis || '-');
        if (elKamar) elKamar.innerText = 'Kamar ' + (s.kamar || '-');
        cardSelected.classList.remove('hidden');
    }
}

// Bersihkan Pilihan Santri Bebas Syahriah
function clearSelectedSantriBebas() {
    selectedSantriBebas = null;
    const inputId = document.getElementById('bebas-syahriah-santri-id');
    const inputSearch = document.getElementById('bebas-syahriah-search-input');
    const cardSelected = document.getElementById('card-selected-santri-bebas');
    const btnClear = document.getElementById('btn-clear-santri-bebas');
    const dropdown = document.getElementById('dropdown-santri-bebas');

    if (inputId) inputId.value = '';
    if (inputSearch) {
        inputSearch.value = '';
        inputSearch.disabled = false;
        inputSearch.focus();
    }
    if (cardSelected) cardSelected.classList.add('hidden');
    if (btnClear) btnClear.classList.add('hidden');
    if (dropdown) dropdown.classList.add('hidden');
}

// Simpan Santri Bebas Syahriah
function simpanBebasSyahriah() {
    const selSantri = document.getElementById('bebas-syahriah-santri-id');
    const inputKat = document.getElementById('bebas-syahriah-kategori');
    const inputKet = document.getElementById('bebas-syahriah-keterangan');

    const santriId = selSantri ? selSantri.value : '';
    const kat = inputKat ? inputKat.value : 'Dispensasi';
    const ket = inputKet ? inputKet.value.trim() : '';

    if (!santriId) return showToast("Ketik dan pilih santri terlebih dahulu!", "error");

    if (!appSettings.santriBebasSyahriah) {
        appSettings.santriBebasSyahriah = [];
    }

    // Cek duplikasi
    const exists = appSettings.santriBebasSyahriah.some(x => (typeof x === 'string' ? x : x.santriId) === santriId);
    if (exists) return showToast("Santri ini sudah terdaftar bebas syahriah!", "error");

    const alasanLengkap = ket ? `${kat} (${ket})` : kat;
    const TA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448';

    appSettings.santriBebasSyahriah.push({
        santriId: santriId,
        alasan: alasanLengkap,
        kategori: kat,
        keterangan: ket,
        tanggal: new Date().toLocaleDateString('en-CA'),
        ta: TA
    });

    saveDataToStorage();
    renderDaftarBebasSyahriah();
    if (typeof renderSyahriah === 'function') renderSyahriah();
    if (typeof updateDashboard === 'function') updateDashboard();
    tutupModal('modal-bebas-syahriah');

    const s = (santriData || []).find(x => x.id === santriId);
    showToast(`${s ? s.nama : 'Santri'} berhasil dibebaskan dari syahriah!`);
}

// Hapus Bebas Syahriah
function hapusBebasSyahriah(santriId) {
    const s = (santriData || []).find(x => x.id === santriId);
    const namaSantri = s ? s.nama : 'Santri';

    showConfirm("Hapus Status Bebas Syahriah", `Kembalikan kewajiban pembayaran syahriah bulanan untuk ${namaSantri}?`, () => {
        if (!appSettings.santriBebasSyahriah) appSettings.santriBebasSyahriah = [];
        appSettings.santriBebasSyahriah = appSettings.santriBebasSyahriah.filter(x => x.santriId !== santriId);
        saveDataToStorage();
        renderDaftarBebasSyahriah();
        if (typeof renderSyahriah === 'function') renderSyahriah();
        if (typeof updateDashboard === 'function') updateDashboard();
        showToast(`Kewajiban syahriah ${namaSantri} telah diaktifkan kembali`);
    });
}

// Buka Modal Tambah Tagihan Kustom
function bukaModalTagihanKustom() {
    document.getElementById('tagihan-index').value = ''; 
    document.getElementById('tagihan-nama').value = ''; 
    document.getElementById('tagihan-nominal').value = '';
    document.getElementById('modal-tagihan-title').innerText = 'Tambah Tagihan';
    bukaModal('modal-tagihan');
}

// Buka Modal Edit Tagihan Kustom
function editTagihanKustom(index) {
    const t = appSettings.tagihanKustom[index];
    if (t) {
        document.getElementById('tagihan-index').value = index;
        document.getElementById('tagihan-nama').value = t.nama;
        document.getElementById('tagihan-nominal').value = t.nominal;
        document.getElementById('modal-tagihan-title').innerText = 'Edit Tagihan';
        bukaModal('modal-tagihan');
    }
}

// Simpan Tagihan Kustom (Menangani Tambah & Edit)
function simpanTagihanKustom() {
    const idx = document.getElementById('tagihan-index').value;
    const n = document.getElementById('tagihan-nama').value.trim();
    const nom = parseInt(document.getElementById('tagihan-nominal').value);
    
    if (!n || !nom) return showToast("Isi nama dan nominal tagihan", "error");
    
    if (idx !== "" && idx !== null && idx !== undefined) {
        appSettings.tagihanKustom[parseInt(idx)] = { nama: n, nominal: nom };
    } else {
        appSettings.tagihanKustom.push({ nama: n, nominal: nom });
    }
    
    saveDataToStorage();
    renderPengaturanTagihan();
    if (typeof renderPengeluaranMenu === 'function') renderPengeluaranMenu();
    if (typeof updateDashboard === 'function') updateDashboard();
    tutupModal('modal-tagihan');
    showToast("Tagihan Tersimpan");
}

// Hapus Pos Tagihan Kustom
function hapusTagihanKustom(index) {
    showConfirm("Hapus Tagihan", "Hapus pos tagihan ini?", () => {
        appSettings.tagihanKustom.splice(index, 1);
        saveDataToStorage();
        renderPengaturanTagihan();
        if (typeof renderPengeluaranMenu === 'function') renderPengeluaranMenu();
        if (typeof updateDashboard === 'function') updateDashboard();
        showToast("Tagihan Dihapus");
    });
}

// Render Tabel Pengaturan Pasangan Divisi & Penanggung Jawab
function renderPengaturanPJDivisi() {
    const list = document.getElementById('list-kepanitiaan');
    if (!list) return;

    if (appSettings.kepanitiaan.length === 0) {
        list.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-gray-400">Belum ada data. Tambahkan di atas.</td></tr>';
    } else {
        list.innerHTML = appSettings.kepanitiaan.map((item, index) => `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-50">
                <td class="px-6 py-4 font-bold text-gray-800 uppercase">${item.divisi}</td>
                <td class="px-6 py-4 text-gray-600 uppercase font-medium">${item.pj}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="hapusKepanitiaan(${index})" class="text-rose-400 hover:text-rose-600 p-2 bg-rose-50 rounded-lg transition-colors" title="Hapus"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `).join('');
    }
    if (typeof renderFilterDivisi === 'function') renderFilterDivisi(); 
}

// Tambah Pasangan Divisi & Penanggung Jawab
function tambahKepanitiaan() {
    const inputDiv = document.getElementById('input-nama-divisi');
    const inputPj = document.getElementById('input-nama-pj');
    const div = inputDiv ? inputDiv.value.trim().toUpperCase() : '';
    const pj = inputPj ? inputPj.value.trim().toUpperCase() : '';

    if (!div || !pj) {
        showToast("Nama Divisi dan PJ wajib diisi semua!", "error");
        return;
    }
    
    appSettings.kepanitiaan.push({ divisi: div, pj: pj });
    saveDataToStorage();
    if (inputDiv) inputDiv.value = '';
    if (inputPj) inputPj.value = '';
    renderPengaturanPJDivisi();
    showToast("Pasangan Divisi & PJ ditambahkan");
}

// Hapus Pasangan Divisi & PJ
function hapusKepanitiaan(index) {
    showConfirm("Hapus Data", "Hapus pasangan Divisi & PJ ini dari pengaturan?", () => {
        appSettings.kepanitiaan.splice(index, 1);
        saveDataToStorage();
        renderPengaturanPJDivisi();
        showToast("Berhasil dihapus");
    });
}

// ==========================================================================
// Pengaturan Jenis Pembayaran Lain
// ==========================================================================

// Render Tabel Master Jenis Pembayaran Lain
function renderPengaturanPembayaranLain() {
    const tb = document.getElementById('table-jenis-pembayaran-lain');
    if (!tb) return;

    const list = appSettings.pembayaranLainList || [];
    if (list.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">Belum ada jenis pembayaran lain. Klik tombol di bawah untuk menambahkan.</td></tr>';
        return;
    }

    tb.innerHTML = list.map((item, index) => {
        let targetBadge = '';
        if (item.targetTipe === 'kustom') {
            const targetCount = (item.targetSantri || []).length;
            targetBadge = `<div class="flex items-center gap-1.5">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <i class="fas fa-user-check text-amber-600"></i> ${targetCount} Santri Kustom
                </span>
                <button onclick="aturTargetSantriPL(${index})" class="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-bold cursor-pointer" title="Ubah daftar nama santri sasaran">Ubah</button>
            </div>`;
        } else if (item.targetTipe === 'santri_baru') {
            const angkatan = item.targetAngkatan || (typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '-');
            targetBadge = `<div class="flex items-center gap-1.5">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <i class="fas fa-user-plus text-blue-600"></i> Santri Baru (${angkatan})
                </span>
                <button onclick="aturTargetSantriPL(${index})" class="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-bold cursor-pointer" title="Ubah sasaran santri baru">Ubah</button>
            </div>`;
        } else {
            targetBadge = `<div class="flex items-center gap-1.5">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                    <i class="fas fa-users text-indigo-600"></i> Semua Santri
                </span>
                <button onclick="aturTargetSantriPL(${index})" class="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-bold cursor-pointer" title="Kustomisasi sasaran santri">Kustom</button>
            </div>`;
        }

        return `
        <tr class="hover:bg-gray-50 transition-colors border-b border-gray-50">
            <td class="px-6 py-4">
                <div class="font-bold text-gray-800 text-sm">${item.nama}</div>
                <div class="text-[11px] text-gray-400 font-mono mt-0.5">${item.id || ('PL-' + (index + 1))}</div>
            </td>
            <td class="px-6 py-4 text-right font-extrabold text-gray-700 font-mono text-sm">
                ${formatRupiah(item.nominal)}
            </td>
            <td class="px-6 py-4">
                ${targetBadge}
            </td>
            <td class="px-6 py-4 text-xs text-gray-500">
                ${item.keterangan || '-'}
            </td>
            <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-center gap-1">
                    <button onclick="aturTargetSantriPL(${index})" class="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white transition-colors flex items-center justify-center shadow-sm cursor-pointer" title="Atur Sasaran Santri"><i class="fas fa-users-gear text-xs"></i></button>
                    <button onclick="editJenisPembayaranLain(${index})" class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center shadow-sm cursor-pointer" title="Edit"><i class="fas fa-edit text-xs"></i></button>
                    <button onclick="hapusJenisPembayaranLain(${index})" class="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-colors flex items-center justify-center shadow-sm cursor-pointer" title="Hapus"><i class="fas fa-trash-alt text-xs"></i></button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Buka Modal Tambah Jenis Pembayaran Lain
function bukaModalJenisPembayaranLain() {
    document.getElementById('jenis-pl-index').value = '';
    document.getElementById('jenis-pl-nama').value = '';
    document.getElementById('jenis-pl-nominal').value = '';
    document.getElementById('jenis-pl-keterangan').value = '';
    document.getElementById('modal-jenis-pl-title').innerText = 'Tambah Jenis Pembayaran Lain';
    bukaModal('modal-jenis-pembayaran-lain');
}

// Buka Modal Edit Jenis Pembayaran Lain
function editJenisPembayaranLain(index) {
    const list = appSettings.pembayaranLainList || [];
    const item = list[index];
    if (!item) return;

    document.getElementById('jenis-pl-index').value = index;
    document.getElementById('jenis-pl-nama').value = item.nama;
    document.getElementById('jenis-pl-nominal').value = item.nominal;
    document.getElementById('jenis-pl-keterangan').value = item.keterangan || '';
    document.getElementById('modal-jenis-pl-title').innerText = 'Edit Jenis Pembayaran Lain';
    bukaModal('modal-jenis-pembayaran-lain');
}

// Simpan Jenis Pembayaran Lain (Tambah & Edit)
function simpanJenisPembayaranLain() {
    const idx = document.getElementById('jenis-pl-index').value;
    const nama = document.getElementById('jenis-pl-nama').value.trim();
    const nominal = parseInt(document.getElementById('jenis-pl-nominal').value);
    const keterangan = document.getElementById('jenis-pl-keterangan').value.trim();

    if (!nama) return showToast("Nama jenis pembayaran wajib diisi!", "error");
    if (isNaN(nominal) || nominal < 0) return showToast("Tarif nominal harus angka yang valid!", "error");

    if (!appSettings.pembayaranLainList) {
        appSettings.pembayaranLainList = [];
    }

    if (idx !== "" && idx !== null && idx !== undefined) {
        const itemIdx = parseInt(idx);
        const existing = appSettings.pembayaranLainList[itemIdx];
        const oldNama = existing ? existing.nama : null;

        appSettings.pembayaranLainList[itemIdx] = {
            id: existing ? existing.id : ('PL-' + (itemIdx + 1)),
            nama: nama,
            nominal: nominal,
            keterangan: keterangan,
            targetTipe: existing?.targetTipe || 'semua',
            targetSantri: existing?.targetSantri || []
        };

        // Jika nama diubah, sinkronkan tarif khusus, transaksi & jenis aktif
        if (oldNama && oldNama !== nama) {
            if (appSettings.tarifKhususPL && Array.isArray(appSettings.tarifKhususPL)) {
                appSettings.tarifKhususPL.forEach(k => {
                    if (k.jenis === oldNama) k.jenis = nama;
                });
            }
            if (window.currentSelectedJenisPL === oldNama) {
                window.currentSelectedJenisPL = nama;
            }
            if (typeof transactions !== 'undefined' && Array.isArray(transactions)) {
                transactions.forEach(t => {
                    if (t.subJenis === oldNama) t.subJenis = nama;
                    if (t.kategori === oldNama) t.kategori = nama;
                });
            }
        }
    } else {
        appSettings.pembayaranLainList.push({
            id: 'PL-' + (appSettings.pembayaranLainList.length + 1),
            nama: nama,
            nominal: nominal,
            keterangan: keterangan,
            targetTipe: 'semua',
            targetSantri: []
        });
        if (!window.currentSelectedJenisPL) {
            window.currentSelectedJenisPL = nama;
        }
    }

    saveDataToStorage();
    renderPengaturanPembayaranLain();
    if (typeof updateDropdownJenisPembayaranLain === 'function') updateDropdownJenisPembayaranLain();
    if (typeof renderPembayaranLainPage === 'function') renderPembayaranLainPage();
    if (typeof renderFilterPosPL === 'function') renderFilterPosPL();
    tutupModal('modal-jenis-pembayaran-lain');
    showToast("Jenis Pembayaran Berhasil Disimpan");
}

// Hapus Jenis Pembayaran Lain
function hapusJenisPembayaranLain(index) {
    showConfirm("Hapus Jenis Pembayaran", "Yakin ingin menghapus jenis pembayaran ini dari pengaturan?", () => {
        if (appSettings.pembayaranLainList && appSettings.pembayaranLainList[index]) {
            const deleted = appSettings.pembayaranLainList[index];
            const deletedName = deleted.nama;

            // Hapus jenis pembayaran dari list master
            appSettings.pembayaranLainList.splice(index, 1);

            // Bersihkan data tarif khusus yang terhubung dengan jenis pembayaran ini
            if (appSettings.tarifKhususPL && Array.isArray(appSettings.tarifKhususPL)) {
                appSettings.tarifKhususPL = appSettings.tarifKhususPL.filter(k => k.jenis !== deletedName);
            }

            // Alihkan jenis yang aktif ke jenis lain yang masih ada, atau kosongkan jika habis
            if (window.currentSelectedJenisPL === deletedName || !appSettings.pembayaranLainList.some(i => i.nama === window.currentSelectedJenisPL)) {
                window.currentSelectedJenisPL = appSettings.pembayaranLainList.length > 0 ? appSettings.pembayaranLainList[0].nama : '';
            }

            saveDataToStorage();
            renderPengaturanPembayaranLain();
            if (typeof updateDropdownJenisPembayaranLain === 'function') updateDropdownJenisPembayaranLain();
            if (typeof renderPembayaranLainPage === 'function') renderPembayaranLainPage();
            if (typeof renderFilterPosPL === 'function') renderFilterPosPL();
            showToast("Jenis Pembayaran Dihapus");
        }
    });
}

// ==========================================================================
// Pengaturan Sasaran Santri Kustom Pembayaran Lain
// ==========================================================================

window.tempTargetSantriPL = new Set();
let currentSearchTargetPL = '';

// Buka Modal Atur Sasaran Santri PL
function aturTargetSantriPL(index) {
    const list = appSettings.pembayaranLainList || [];
    const item = list[index];
    if (!item) return;

    document.getElementById('target-pl-item-index').value = index;
    document.getElementById('modal-target-pl-title').innerText = `Atur Sasaran: ${item.nama}`;
    document.getElementById('modal-target-pl-subtitle').innerText = `Tarif: ${formatRupiah(item.nominal)} - Tentukan santri mana saja yang dikenakan tagihan ini.`;

    const tipe = item.targetTipe || 'semua';
    window.tempTargetSantriPL = new Set(item.targetSantri || []);

    // Inisialisasi selector angkatan santri baru
    const selAngkatan = document.getElementById('target-pl-angkatan');
    if (selAngkatan) {
        const activeTA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '1447/1448';
        const listTA = (appSettings.tahunAjaranList || []).map(t => t.ta);
        if (activeTA && !listTA.includes(activeTA)) listTA.push(activeTA);
        const selectedAngkatan = item.targetAngkatan || activeTA;

        selAngkatan.innerHTML = listTA.map(ta => `
            <option value="${ta}" ${ta === selectedAngkatan ? 'selected' : ''}>Angkatan / T.A ${ta} ${ta === activeTA ? '(Aktif Saat Ini)' : ''}</option>
        `).join('');

        updateCountSantriBaruPL(selectedAngkatan);
    }

    // Inisialisasi dropdown filter kamar di opsi kustom
    const selKamarKustom = document.getElementById('target-pl-filter-kamar');
    if (selKamarKustom && typeof getAllNamaKamar === 'function') {
        const kamarList = getAllNamaKamar();
        selKamarKustom.innerHTML = `<option value="all">Semua Kamar</option>` +
            kamarList.map(k => `<option value="${k}">Kamar ${k}</option>`).join('');
    }

    const radioEl = document.querySelector(`input[name="target-pl-tipe"][value="${tipe}"]`);
    if (radioEl) radioEl.checked = true;

    onTargetPLTipeChanged(tipe);

    const searchInput = document.getElementById('target-pl-search');
    if (searchInput) searchInput.value = '';
    currentSearchTargetPL = '';

    renderListTargetPL();
    bukaModal('modal-target-santri-pl');
}

// Hitung Jumlah Santri Baru Berdasarkan Angkatan Masuk
function countSantriBaruByAngkatan(targetAngkatan) {
    const cleanTA = (str) => (str || '').replace(/[\/\-\s]/g, '').toLowerCase();
    const target = cleanTA(targetAngkatan || (typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : ''));
    return (santriData || []).filter(s => s.status === 'Aktif' && (
        (s.tahunMasuk && cleanTA(s.tahunMasuk) === target) ||
        (!s.tahunMasuk && s.isBaru)
    )).length;
}

// Update Badge Counter Santri Baru
function updateCountSantriBaruPL(targetAngkatan) {
    const badge = document.getElementById('target-pl-santri-baru-count');
    const count = countSantriBaruByAngkatan(targetAngkatan);
    if (badge) badge.innerText = `${count} Santri Baru`;
}

// Handler Saat Pilihan Angkatan Santri Baru Berubah
function onTargetPLAngkatanChanged(val) {
    updateCountSantriBaruPL(val);
    const summaryFooter = document.getElementById('target-pl-footer-summary');
    if (summaryFooter) {
        const count = countSantriBaruByAngkatan(val);
        summaryFooter.innerText = `Tagihan hanya dibebankan khusus kepada ${count} santri baru (Angkatan ${val})`;
    }
}

// Handler Saat Tipe Sasaran Berubah (Semua vs Santri Baru vs Kustom)
function onTargetPLTipeChanged(type) {
    const isSemua = (type === 'semua');
    const isSantriBaru = (type === 'santri_baru');
    const isKustom = (type === 'kustom');

    const optSemua = document.getElementById('opt-target-semua');
    const optSantriBaru = document.getElementById('opt-target-santri-baru');
    const optKustom = document.getElementById('opt-target-kustom');
    const containerSantriBaru = document.getElementById('container-target-pl-santri-baru');
    const containerKustom = document.getElementById('container-target-pl-kustom');
    const summaryFooter = document.getElementById('target-pl-footer-summary');

    if (optSemua) {
        optSemua.className = isSemua
            ? "relative flex flex-col p-3 rounded-xl border-2 border-indigo-500 bg-indigo-50/60 cursor-pointer transition-all shadow-xs"
            : "relative flex flex-col p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-indigo-300 cursor-pointer transition-all";
    }

    if (optSantriBaru) {
        optSantriBaru.className = isSantriBaru
            ? "relative flex flex-col p-3 rounded-xl border-2 border-blue-500 bg-blue-50/60 cursor-pointer transition-all shadow-xs"
            : "relative flex flex-col p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-300 cursor-pointer transition-all";
    }

    if (optKustom) {
        optKustom.className = isKustom
            ? "relative flex flex-col p-3 rounded-xl border-2 border-amber-500 bg-amber-50/60 cursor-pointer transition-all shadow-xs"
            : "relative flex flex-col p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-amber-300 cursor-pointer transition-all";
    }

    if (containerSantriBaru) {
        if (isSantriBaru) containerSantriBaru.classList.remove('hidden');
        else containerSantriBaru.classList.add('hidden');
    }

    if (containerKustom) {
        if (isKustom) containerKustom.classList.remove('hidden');
        else containerKustom.classList.add('hidden');
    }

    if (summaryFooter) {
        if (isSemua) {
            summaryFooter.innerText = "Semua santri pondok dikenai tagihan";
        } else if (isSantriBaru) {
            const angkatan = document.getElementById('target-pl-angkatan')?.value || (typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '');
            const count = countSantriBaruByAngkatan(angkatan);
            summaryFooter.innerText = `Tagihan hanya dibebankan khusus kepada ${count} santri baru (Angkatan ${angkatan})`;
        } else {
            summaryFooter.innerText = `Tagihan hanya dibebankan kepada ${window.tempTargetSantriPL.size} santri terpilih`;
        }
    }
}

// Shortcut: Centang Hanya Santri Baru Pada Checklist Kustom
function pilihSantriBaruPL() {
    const targetAngkatan = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '';
    const cleanTA = (str) => (str || '').replace(/[\/\-\s]/g, '').toLowerCase();
    const target = cleanTA(targetAngkatan);

    let countAdded = 0;
    (santriData || []).filter(s => s.status === 'Aktif').forEach(s => {
        if ((s.tahunMasuk && cleanTA(s.tahunMasuk) === target) || (!s.tahunMasuk && s.isBaru)) {
            window.tempTargetSantriPL.add(s.id);
            countAdded++;
        }
    });

    renderListTargetPL(currentSearchTargetPL);
    showToast(`${countAdded} Santri Baru berhasil dicentang!`);
}

// Render Checklist Santri Target PL
function renderListTargetPL(filterText = '') {
    const container = document.getElementById('list-target-santri-pl-items');
    const countInfo = document.getElementById('target-pl-count-info');
    const summaryFooter = document.getElementById('target-pl-footer-summary');

    if (countInfo) countInfo.innerText = `${window.tempTargetSantriPL.size} Santri Terpilih`;
    if (summaryFooter) {
        const isKustom = document.querySelector('input[name="target-pl-tipe"]:checked')?.value === 'kustom';
        if (isKustom) {
            summaryFooter.innerText = `Tagihan hanya dibebankan kepada ${window.tempTargetSantriPL.size} santri terpilih`;
        }
    }

    if (!container) return;

    const q = (filterText || '').toLowerCase().trim();
    const selKamar = document.getElementById('target-pl-filter-kamar')?.value || 'all';

    const activeSantri = (santriData || [])
        .filter(s => s.status === 'Aktif')
        .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));

    const filtered = activeSantri.filter(s => {
        if (selKamar !== 'all' && (s.kamar || '') !== selKamar) return false;
        if (!q) return true;
        const nama = (s.nama || '').toLowerCase();
        const nis = (s.nis || '').toLowerCase();
        const kamar = (s.kamar || '').toLowerCase();
        return nama.includes(q) || nis.includes(q) || kamar.includes(q);
    });

    if (filtered.length === 0) {
        const safeQuery = (typeof escapeHtml === 'function') ? escapeHtml(filterText) : filterText;
        container.innerHTML = `<div class="p-6 text-center text-xs text-gray-400">Tidak ada santri yang cocok dengan filter pencarian.</div>`;
        return;
    }

    container.innerHTML = filtered.map(s => {
        const checked = window.tempTargetSantriPL.has(s.id);
        const isBaruBadge = s.tahunMasuk 
            ? `<span class="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded text-[9px] border border-gray-200">Masuk ${s.tahunMasuk}</span>` 
            : '';

        return `
            <label class="flex items-center justify-between p-3 hover:bg-indigo-50/40 cursor-pointer transition-colors ${checked ? 'bg-indigo-50/20' : ''}">
                <div class="flex items-center gap-3">
                    <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleSantriTargetPL('${s.id}')" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300">
                    <div>
                        <div class="font-bold text-gray-900 text-xs">${s.nama}</div>
                        <div class="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-0.5">
                            <span>NIS: ${s.nis || '-'}</span>
                            <span>•</span>
                            <span class="text-indigo-700 font-bold">Kamar ${s.kamar || '-'}</span>
                            <span>•</span>
                            ${isBaruBadge}
                        </div>
                    </div>
                </div>
                <span class="text-[11px] font-bold ${checked ? 'text-indigo-600' : 'text-gray-400'} font-mono">
                    ${checked ? '<i class="fas fa-check-circle"></i> Ditargetkan' : 'Dilewati'}
                </span>
            </label>
        `;
    }).join('');
}

// Toggle Checkbox Santri
function toggleSantriTargetPL(santriId) {
    if (window.tempTargetSantriPL.has(santriId)) {
        window.tempTargetSantriPL.delete(santriId);
    } else {
        window.tempTargetSantriPL.add(santriId);
    }
    renderListTargetPL(currentSearchTargetPL);
}

// Pilih Semua Santri yang Tampil
function pilihSemuaSantriPL() {
    const q = (currentSearchTargetPL || '').toLowerCase().trim();
    const selKamar = document.getElementById('target-pl-filter-kamar')?.value || 'all';
    const activeSantri = (santriData || []).filter(s => s.status === 'Aktif');
    activeSantri.forEach(s => {
        if (selKamar !== 'all' && (s.kamar || '') !== selKamar) return;
        if (!q || (s.nama || '').toLowerCase().includes(q) || (s.nis || '').toLowerCase().includes(q) || (s.kamar || '').toLowerCase().includes(q)) {
            window.tempTargetSantriPL.add(s.id);
        }
    });
    renderListTargetPL(currentSearchTargetPL);
}

// Batal Pilih Semua
function batalPilihSemuaSantriPL() {
    window.tempTargetSantriPL.clear();
    renderListTargetPL(currentSearchTargetPL);
}

// Centang Khusus Santri Baru di Tab Kustom
function pilihSantriBaruPL() {
    const activeTA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '';
    const cleanTA = (str) => (str || '').replace(/[\/\-\s]/g, '').toLowerCase();
    const target = cleanTA(activeTA);

    const activeSantri = (santriData || []).filter(s => s.status === 'Aktif');
    let countAdded = 0;
    activeSantri.forEach(s => {
        const isBaru = (s.tahunMasuk && cleanTA(s.tahunMasuk) === target) || (!s.tahunMasuk && s.isBaru);
        if (isBaru) {
            window.tempTargetSantriPL.add(s.id);
            countAdded++;
        }
    });

    renderListTargetPL(currentSearchTargetPL);
    showToast(`${countAdded} santri baru berhasil dicentang`);
}

// Filter List Target PL
function filterListTargetPL(val) {
    currentSearchTargetPL = val || '';
    renderListTargetPL(currentSearchTargetPL);
}

// Simpan Sasaran Santri PL
function simpanTargetSantriPL() {
    const idxStr = document.getElementById('target-pl-item-index')?.value;
    if (idxStr === "" || idxStr === null || idxStr === undefined) return;
    const index = parseInt(idxStr);

    const list = appSettings.pembayaranLainList || [];
    const item = list[index];
    if (!item) return;

    const tipeChecked = document.querySelector('input[name="target-pl-tipe"]:checked')?.value || 'semua';

    if (tipeChecked === 'kustom') {
        item.targetTipe = 'kustom';
        item.targetSantri = Array.from(window.tempTargetSantriPL);
        item.targetAngkatan = '';
        if (item.targetSantri.length === 0) {
            return showToast("Pilih minimal 1 santri untuk target kustom!", "error");
        }
    } else if (tipeChecked === 'santri_baru') {
        const angkatan = document.getElementById('target-pl-angkatan')?.value || (typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '');
        item.targetTipe = 'santri_baru';
        item.targetAngkatan = angkatan;
        item.targetSantri = [];
    } else {
        item.targetTipe = 'semua';
        item.targetSantri = [];
        item.targetAngkatan = '';
    }

    saveDataToStorage();
    renderPengaturanPembayaranLain();
    if (typeof renderPembayaranLainPage === 'function') renderPembayaranLainPage();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderLaporan === 'function') renderLaporan();
    tutupModal('modal-target-santri-pl');
    showToast(`Sasaran untuk "${item.nama}" berhasil diperbarui!`);
}

// ==========================================================================
// Pengaturan Pembeda Tarif Santri: Pembayaran Ikhtibar
// ==========================================================================

let selectedSantriForKhususIkhtibar = new Set();

// Render Halaman / Komponen Pengaturan Tarif Khusus Ikhtibar
function renderPengaturanKhususIkhtibar() {
    const elCard = document.getElementById('card-pembeda-tarif-ikhtibar');
    if (!elCard) return;

    // 1. Inisialisasi Filter Kamar
    const elKamar = document.getElementById('filter-kamar-khusus-ikhtibar');
    if (elKamar) {
        const currentKamarVal = elKamar.value || 'all';
        const uniqueRooms = [...new Set((santriData || []).map(s => s.kamar).filter(Boolean))].sort();
        let kamarOptions = '<option value="all">Semua Kamar</option>';
        uniqueRooms.forEach(k => {
            kamarOptions += `<option value="${k}">${k}</option>`;
        });
        elKamar.innerHTML = kamarOptions;
        if (uniqueRooms.includes(currentKamarVal)) {
            elKamar.value = currentKamarVal;
        }
    }

    // 2. Inisialisasi Pilihan Tagihan Ikhtibar
    const elTagihan = document.getElementById('select-tagihan-khusus-ikhtibar');
    if (elTagihan) {
        const currentTagihanVal = elTagihan.value;
        const tagihanList = (appSettings.tagihanKustom || []);
        let options = '';
        tagihanList.forEach(t => {
            options += `<option value="${t.nama}">${t.nama} (Standar: ${formatRupiah(t.nominal)})</option>`;
        });
        if (tagihanList.length === 0) {
            options = '<option value="Ikhtibar PPU">Ikhtibar PPU</option>';
        }
        elTagihan.innerHTML = options;
        if (currentTagihanVal && tagihanList.some(t => t.nama === currentTagihanVal)) {
            elTagihan.value = currentTagihanVal;
        } else {
            const ikhtibarTag = tagihanList.find(t => t.nama.toLowerCase().includes('ikhtibar'));
            if (ikhtibarTag) elTagihan.value = ikhtibarTag.nama;
        }
    }

    // 3. Render List Santri yang bisa diklik
    renderListPilihSantriIkhtibar();

    // 4. Render Tabel Santri yang sudah tersimpan tarif khusus
    renderTableSantriKhususIkhtibarSaved();
}

// Handler ketika tagihan kustom dropdown diganti
function onTagihanKhususIkhtibarChanged() {
    renderListPilihSantriIkhtibar();
}

// Toggle Bebas Biaya (Rp 0)
function toggleBebasIkhtibarInput() {
    const chk = document.getElementById('check-bebas-ikhtibar');
    const inputNom = document.getElementById('input-nominal-khusus-ikhtibar');
    if (!chk || !inputNom) return;

    if (chk.checked) {
        inputNom.value = 0;
        inputNom.disabled = true;
        inputNom.classList.add('bg-gray-100', 'text-gray-400');
    } else {
        inputNom.disabled = false;
        inputNom.classList.remove('bg-gray-100', 'text-gray-400');
        if (inputNom.value == 0) {
            inputNom.value = '';
        }
    }
}

// Render List Santri yang Bisa Dipilih (Klik Nama)
function renderListPilihSantriIkhtibar() {
    const container = document.getElementById('list-santri-ikhtibar-selectable');
    const countInfo = document.getElementById('info-santri-ikhtibar-count');
    const badgeSelected = document.getElementById('badge-count-selected-ikhtibar');
    if (!container) return;

    const searchInput = document.getElementById('search-khusus-ikhtibar');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filterKamar = document.getElementById('filter-kamar-khusus-ikhtibar');
    const kamarVal = filterKamar ? filterKamar.value : 'all';

    const selectTagihan = document.getElementById('select-tagihan-khusus-ikhtibar');
    const tagihanNama = selectTagihan ? selectTagihan.value : 'Ikhtibar PPU';

    let list = (santriData || []).filter(s => s.status === 'Aktif');

    if (kamarVal !== 'all') {
        list = list.filter(s => s.kamar === kamarVal);
    }
    if (search) {
        list = list.filter(s => 
            (s.nama || '').toLowerCase().includes(search) || 
            (s.nis || '').toLowerCase().includes(search) ||
            (s.kamar || '').toLowerCase().includes(search)
        );
    }

    if (countInfo) {
        countInfo.innerText = `(Menampilkan ${list.length} santri)`;
    }
    if (badgeSelected) {
        badgeSelected.innerText = `${selectedSantriForKhususIkhtibar.size} Santri`;
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-8 text-center text-gray-400 text-sm">
                <i class="fas fa-user-slash text-2xl mb-1 text-gray-300"></i>
                <p>Tidak ada santri yang cocok dengan filter / pencarian.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(s => {
        const isSelected = selectedSantriForKhususIkhtibar.has(s.id);
        const infoTarif = (typeof getTarifSantriKustom === 'function') 
            ? getTarifSantriKustom(s.id, tagihanNama) 
            : { isKhusus: false, bebas: false, nominal: 0 };

        let tarifBadge = '';
        if (infoTarif.isKhusus) {
            if (infoTarif.bebas) {
                tarifBadge = `<span class="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full"><i class="fas fa-gift text-[9px]"></i> Bebas (Rp 0)</span>`;
            } else {
                tarifBadge = `<span class="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full"><i class="fas fa-tag text-[9px]"></i> Khusus: ${formatRupiah(infoTarif.nominal)}</span>`;
            }
        } else {
            tarifBadge = `<span class="text-[10px] bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">Standar</span>`;
        }

        return `
            <div onclick="toggleSelectSantriIkhtibar('${s.id}')"
                 class="group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                     isSelected 
                         ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-400 shadow-sm' 
                         : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50/70'
                 }">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-indigo-600 text-white' : 'border border-gray-300 bg-white group-hover:border-indigo-400'
                    }">
                        ${isSelected ? '<i class="fas fa-check text-[11px]"></i>' : ''}
                    </div>
                    <div class="truncate">
                        <div class="font-bold text-xs uppercase text-gray-800 truncate group-hover:text-indigo-600 transition-colors">${s.nama}</div>
                        <div class="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                            <span class="font-mono text-[10px] text-gray-400">${s.nis}</span>
                            <span>•</span>
                            <span class="font-medium bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">${s.kamar || '-'}</span>
                        </div>
                    </div>
                </div>
                <div class="ml-2 flex-shrink-0">
                    ${tarifBadge}
                </div>
            </div>
        `;
    }).join('');
}

// Toggle Pilih Santri
function toggleSelectSantriIkhtibar(santriId) {
    if (selectedSantriForKhususIkhtibar.has(santriId)) {
        selectedSantriForKhususIkhtibar.delete(santriId);
    } else {
        selectedSantriForKhususIkhtibar.add(santriId);
    }
    renderListPilihSantriIkhtibar();
}

// Pilih Semua Santri yang Tampil di List
function pilihSemuaSantriIkhtibarTampil() {
    const searchInput = document.getElementById('search-khusus-ikhtibar');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filterKamar = document.getElementById('filter-kamar-khusus-ikhtibar');
    const kamarVal = filterKamar ? filterKamar.value : 'all';

    let list = (santriData || []).filter(s => s.status === 'Aktif');
    if (kamarVal !== 'all') list = list.filter(s => s.kamar === kamarVal);
    if (search) {
        list = list.filter(s => 
            (s.nama || '').toLowerCase().includes(search) || 
            (s.nis || '').toLowerCase().includes(search) ||
            (s.kamar || '').toLowerCase().includes(search)
        );
    }

    list.forEach(s => selectedSantriForKhususIkhtibar.add(s.id));
    renderListPilihSantriIkhtibar();
    showToast(`${list.length} santri terpilih`);
}

// Batal Pilih Semua
function batalPilihSemuaSantriIkhtibar() {
    selectedSantriForKhususIkhtibar.clear();
    renderListPilihSantriIkhtibar();
    showToast("Pilihan santri dikosongkan");
}

// Simpan Tarif Khusus Ikhtibar untuk Santri Terpilih
function simpanTarifKhususIkhtibar() {
    if (selectedSantriForKhususIkhtibar.size === 0) {
        return showToast("Pilih minimal satu nama santri di bawah untuk menerapkan tarif khusus!", "warning");
    }

    const selectTagihan = document.getElementById('select-tagihan-khusus-ikhtibar');
    const tagihanNama = selectTagihan ? selectTagihan.value : 'Ikhtibar PPU';

    const chkBebas = document.getElementById('check-bebas-ikhtibar');
    const isBebas = chkBebas ? chkBebas.checked : false;

    const inputNom = document.getElementById('input-nominal-khusus-ikhtibar');
    const rawNom = inputNom ? inputNom.value.trim() : '';
    const nominal = isBebas ? 0 : parseInt(rawNom);

    if (!isBebas && (rawNom === '' || isNaN(nominal) || nominal < 0)) {
        return showToast("Masukkan nominal tarif khusus yang valid atau centang Bebas (Rp 0)!", "error");
    }

    if (!appSettings.tarifKhususIkhtibar) {
        appSettings.tarifKhususIkhtibar = [];
    }

    const arrSelected = Array.from(selectedSantriForKhususIkhtibar);
    arrSelected.forEach(sId => {
        // Hapus entry lama jika ada untuk santri dan tagihan ini
        appSettings.tarifKhususIkhtibar = appSettings.tarifKhususIkhtibar.filter(item => 
            !(item.santriId === sId && (item.tagihanNama === tagihanNama || (tagihanNama.toLowerCase().includes('ikhtibar') && (item.tagihanNama || '').toLowerCase().includes('ikhtibar'))))
        );

        // Tambah entry tarif khusus baru
        appSettings.tarifKhususIkhtibar.push({
            santriId: sId,
            tagihanNama: tagihanNama,
            nominal: nominal,
            bebas: isBebas,
            updatedAt: new Date().toISOString()
        });
    });

    saveDataToStorage();

    // Reset pilihan santri dan input
    selectedSantriForKhususIkhtibar.clear();
    if (inputNom && !isBebas) inputNom.value = '';
    if (chkBebas) {
        chkBebas.checked = false;
        toggleBebasIkhtibarInput();
    }

    renderListPilihSantriIkhtibar();
    renderTableSantriKhususIkhtibarSaved();

    // Trigger update dashboard dan view kustom jika aktif
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderPembayaranKustomList === 'function') renderPembayaranKustomList();

    showToast(`Berhasil menyimpan tarif khusus untuk ${arrSelected.length} santri!`);
}

// Render Tabel Santri yang Tersimpan Tarif Khusus
function renderTableSantriKhususIkhtibarSaved() {
    const tb = document.getElementById('table-santri-khusus-ikhtibar-saved');
    const badge = document.getElementById('badge-total-khusus-saved');
    if (!tb) return;

    const list = appSettings.tarifKhususIkhtibar || [];
    if (badge) badge.innerText = `${list.length} Santri`;

    if (list.length === 0) {
        tb.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-400">
                    <i class="fas fa-info-circle text-2xl mb-1 text-gray-300"></i>
                    <p class="text-sm">Belum ada santri dengan tarif khusus Ikhtibar. Semua santri menggunakan tarif standar.</p>
                </td>
            </tr>
        `;
        return;
    }

    tb.innerHTML = list.map((item, idx) => {
        const s = (santriData || []).find(x => x.id === item.santriId);
        const nama = s ? s.nama : '(Santri Tidak Ditemukan)';
        const nis = s ? s.nis : '-';
        const kamar = s ? (s.kamar || '-') : '-';

        return `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100">
                <td class="px-5 py-3 text-center text-gray-400 text-xs">${idx + 1}</td>
                <td class="px-5 py-3">
                    <div class="font-bold text-gray-800 uppercase text-sm">${nama}</div>
                    <div class="font-mono text-[10px] text-gray-400">${nis}</div>
                </td>
                <td class="px-5 py-3 text-gray-600 font-medium text-xs">${kamar}</td>
                <td class="px-5 py-3 text-gray-700 font-semibold text-xs">${item.tagihanNama || 'Ikhtibar PPU'}</td>
                <td class="px-5 py-3 text-right font-mono font-bold text-sm">
                    ${item.bebas 
                        ? '<span class="inline-flex px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">Bebas Biaya (Rp 0)</span>' 
                        : `<span class="text-indigo-600">${formatRupiah(item.nominal)}</span>`
                    }
                </td>
                <td class="px-5 py-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="siapkanEditTarifKhususIkhtibar('${item.santriId}', '${item.tagihanNama || ''}')" 
                                class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center shadow-sm" 
                                title="Edit Tarif">
                            <i class="fas fa-edit text-xs"></i>
                        </button>
                        <button onclick="hapusTarifKhususIkhtibar('${item.santriId}', '${item.tagihanNama || ''}')" 
                                class="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-colors flex items-center justify-center shadow-sm" 
                                title="Kembalikan ke Tarif Standar">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Muat Data Santri untuk Diedit di Form
function siapkanEditTarifKhususIkhtibar(santriId, tagihanNama) {
    const list = appSettings.tarifKhususIkhtibar || [];
    const item = list.find(k => k.santriId === santriId && (!tagihanNama || k.tagihanNama === tagihanNama));
    if (!item) return;

    // Set tagihan
    const elTagihan = document.getElementById('select-tagihan-khusus-ikhtibar');
    if (elTagihan && item.tagihanNama) elTagihan.value = item.tagihanNama;

    // Set nominal / bebas
    const chkBebas = document.getElementById('check-bebas-ikhtibar');
    const inputNom = document.getElementById('input-nominal-khusus-ikhtibar');
    if (chkBebas) {
        chkBebas.checked = Boolean(item.bebas);
        toggleBebasIkhtibarInput();
    }
    if (inputNom && !item.bebas) {
        inputNom.value = item.nominal;
    }

    // Set santri terpilih
    selectedSantriForKhususIkhtibar.clear();
    selectedSantriForKhususIkhtibar.add(santriId);

    // Cari santri ini di search input agar langsung terlihat di atas list
    const s = (santriData || []).find(x => x.id === santriId);
    const searchInput = document.getElementById('search-khusus-ikhtibar');
    if (searchInput && s) {
        searchInput.value = s.nama;
    }

    renderListPilihSantriIkhtibar();

    // Scroll smoothly ke card pengaturan
    const card = document.getElementById('card-pembeda-tarif-ikhtibar');
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showToast(`Data tarif khusus ${s ? s.nama : ''} siap diedit`);
}

// Hapus Tarif Khusus (Kembalikan ke Tarif Standar)
function hapusTarifKhususIkhtibar(santriId, tagihanNama) {
    const s = (santriData || []).find(x => x.id === santriId);
    const nama = s ? s.nama : 'santri ini';

    showConfirm("Kembalikan ke Standar?", `Yakin ingin mengembalikan nominal Ikhtibar untuk ${nama} ke tarif standar?`, () => {
        if (appSettings.tarifKhususIkhtibar) {
            appSettings.tarifKhususIkhtibar = appSettings.tarifKhususIkhtibar.filter(item => 
                !(item.santriId === santriId && (!tagihanNama || item.tagihanNama === tagihanNama))
            );
            saveDataToStorage();
            renderListPilihSantriIkhtibar();
            renderTableSantriKhususIkhtibarSaved();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof renderPembayaranKustomList === 'function') renderPembayaranKustomList();
            showToast(`Tarif ${nama} telah dikembalikan ke standar`);
        }
    });
}

// ==========================================================================
// Fitur: Pengaturan Master Kamar / Asrama Santri
// ==========================================================================

// Render Tabel Master Kamar
function renderPengaturanKamar() {
    const tb = document.getElementById('table-master-kamar');
    const badge = document.getElementById('badge-total-kamar-master');
    if (!tb) return;

    if (!appSettings.kamarList) {
        appSettings.kamarList = [];
    }

    const list = appSettings.kamarList;
    if (badge) badge.innerText = `${list.length} Kamar`;

    if (list.length === 0) {
        tb.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-400">
                    <i class="fas fa-door-open text-2xl mb-1 text-gray-300"></i>
                    <p class="text-sm">Belum ada master kamar yang ditambahkan. Masukkan kamar baru di atas.</p>
                </td>
            </tr>
        `;
        return;
    }

    const aktifSantri = (santriData || []).filter(s => s.status === 'Aktif');

    tb.innerHTML = list.map((k, idx) => {
        const namaKamar = (typeof k === 'string' ? k : k.nama).trim();
        const kapasitas = (typeof k === 'object' && k.kapasitas) ? parseInt(k.kapasitas) : 20;
        const kamarId = (typeof k === 'object' && k.id) ? k.id : ('KMR-' + (idx + 1));
        
        // Hitung santri aktif di kamar ini
        const penghuniCount = aktifSantri.filter(s => (s.kamar || '').trim().toUpperCase() === namaKamar.toUpperCase()).length;

        // Status Ketersediaan
        let badgeStatus = '';
        if (penghuniCount >= kapasitas) {
            badgeStatus = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">Penuh (${penghuniCount}/${kapasitas})</span>`;
        } else if (penghuniCount > 0) {
            badgeStatus = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">Terisi (${penghuniCount}/${kapasitas})</span>`;
        } else {
            badgeStatus = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">Kosong (0/${kapasitas})</span>`;
        }

        return `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100">
                <td class="px-5 py-3 text-center text-gray-400 text-xs">${idx + 1}</td>
                <td class="px-5 py-3 font-bold text-gray-800 uppercase font-mono text-sm">
                    <div class="flex items-center gap-2">
                        <span class="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs shrink-0">
                            <i class="fas fa-door-closed"></i>
                        </span>
                        <span>${namaKamar}</span>
                    </div>
                </td>
                <td class="px-5 py-3 text-center font-mono text-xs text-gray-600 font-bold">
                    ${kapasitas} Santri
                </td>
                <td class="px-5 py-3 text-center font-mono text-sm font-extrabold text-sky-700">
                    ${penghuniCount} Santri
                </td>
                <td class="px-5 py-3 text-center">
                    ${badgeStatus}
                </td>
                <td class="px-5 py-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="editKamarMaster('${kamarId}')" 
                                class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center shadow-xs" 
                                title="Edit Kamar">
                            <i class="fas fa-edit text-xs"></i>
                        </button>
                        <button onclick="hapusKamarMaster('${kamarId}')" 
                                class="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-colors flex items-center justify-center shadow-xs" 
                                title="Hapus Kamar">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Tambah Kamar Baru ke Master Pengaturan
function tambahKamarMaster() {
    const inputNama = document.getElementById('input-kamar-nama');
    const inputKap = document.getElementById('input-kamar-kapasitas');
    
    const nama = inputNama ? inputNama.value.trim().toUpperCase() : '';
    const kapasitas = inputKap && inputKap.value ? parseInt(inputKap.value) : 20;

    if (!nama) {
        return showToast("Nama / kode kamar wajib diisi!", "error");
    }

    if (!appSettings.kamarList) appSettings.kamarList = [];

    // Cek duplikasi
    const exists = appSettings.kamarList.some(k => {
        const kNama = (typeof k === 'string' ? k : k.nama).trim().toUpperCase();
        return kNama === nama;
    });

    if (exists) {
        return showToast(`Kamar ${nama} sudah terdaftar!`, "warning");
    }

    appSettings.kamarList.push({
        id: 'KMR-' + Date.now(),
        nama: nama,
        kapasitas: kapasitas > 0 ? kapasitas : 20
    });

    saveDataToStorage();

    // Reset input
    if (inputNama) inputNama.value = '';
    if (inputKap) inputKap.value = '20';

    renderPengaturanKamar();
    if (typeof updateFiltersAndDropdowns === 'function') updateFiltersAndDropdowns();
    if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();
    if (typeof renderListPilihSantriIkhtibar === 'function') renderListPilihSantriIkhtibar();

    showToast(`Kamar ${nama} berhasil ditambahkan!`);
}

// Edit Kamar Master
function editKamarMaster(kamarId) {
    if (!appSettings.kamarList) return;
    const item = appSettings.kamarList.find(k => (typeof k === 'object' && k.id === kamarId));
    if (!item) return;

    const oldName = item.nama;
    const oldKap = item.kapasitas || 20;

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Edit Data Kamar',
            html: `
                <div class="text-left space-y-3 pt-2">
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1">Nama / Kode Kamar</label>
                        <input id="swal-edit-kamar-nama" class="swal2-input !m-0 !w-full uppercase font-bold" value="${oldName}">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1">Kapasitas Santri</label>
                        <input id="swal-edit-kamar-kap" type="number" min="1" class="swal2-input !m-0 !w-full font-mono" value="${oldKap}">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Simpan Perubahan',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#1d4ed8',
            preConfirm: () => {
                const newName = document.getElementById('swal-edit-kamar-nama').value.trim().toUpperCase();
                const newKap = parseInt(document.getElementById('swal-edit-kamar-kap').value) || 20;
                if (!newName) {
                    Swal.showValidationMessage('Nama kamar tidak boleh kosong!');
                    return false;
                }
                return { newName, newKap };
            }
        }).then(result => {
            if (result.isConfirmed && result.value) {
                const { newName, newKap } = result.value;

                item.nama = newName;
                item.kapasitas = newKap;

                // Jika nama kamar berubah, sinkronkan juga kamar santri yang terdaftar di kamar lama
                if (newName !== oldName) {
                    let affectedCount = 0;
                    (santriData || []).forEach(s => {
                        if ((s.kamar || '').trim().toUpperCase() === oldName.toUpperCase()) {
                            s.kamar = newName;
                            affectedCount++;
                        }
                    });
                    if (affectedCount > 0) {
                        showToast(`${affectedCount} santri disesuaikan ke kamar baru`, 'info');
                    }
                }

                saveDataToStorage();
                renderPengaturanKamar();
                if (typeof updateFiltersAndDropdowns === 'function') updateFiltersAndDropdowns();
                if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();
                if (typeof renderSemuaTabel === 'function') renderSemuaTabel();

                showToast(`Kamar ${newName} berhasil diperbarui!`);
            }
        });
    }
}

// Hapus Kamar Master
function hapusKamarMaster(kamarId) {
    if (!appSettings.kamarList) return;
    const item = appSettings.kamarList.find(k => (typeof k === 'object' && k.id === kamarId));
    if (!item) return;

    const namaKamar = item.nama;
    const penghuni = (santriData || []).filter(s => s.status === 'Aktif' && (s.kamar || '').trim().toUpperCase() === namaKamar.toUpperCase());

    const warningText = penghuni.length > 0 
        ? `Perhatian: Ada ${penghuni.length} santri aktif yang saat ini menghuni kamar ${namaKamar}. Hapus kamar ini dari daftar master? (Data kamar pada santri tidak otomatis terhapus)`
        : `Yakin ingin menghapus kamar ${namaKamar} dari daftar master?`;

    showConfirm("Hapus Kamar", warningText, () => {
        appSettings.kamarList = appSettings.kamarList.filter(k => (typeof k === 'object' ? k.id !== kamarId : k !== namaKamar));
        saveDataToStorage();
        renderPengaturanKamar();
        if (typeof updateFiltersAndDropdowns === 'function') updateFiltersAndDropdowns();
        if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();
        showToast(`Kamar ${namaKamar} berhasil dihapus`);
    });
}

// Expose ke global window
window.renderPengaturanTahunAjaran = renderPengaturanTahunAjaran;
window.tambahTahunAjaran = tambahTahunAjaran;
window.aktifkanTahun = aktifkanTahun;
window.hapusTahun = hapusTahun;
window.renderPengaturanTagihan = renderPengaturanTagihan;
window.simpanPengaturanUmum = simpanPengaturanUmum;
window.bukaModalTagihanKustom = bukaModalTagihanKustom;
window.editTagihanKustom = editTagihanKustom;
window.simpanTagihanKustom = simpanTagihanKustom;
window.hapusTagihanKustom = hapusTagihanKustom;
window.renderPengaturanPJDivisi = renderPengaturanPJDivisi;
window.tambahKepanitiaan = tambahKepanitiaan;
window.hapusKepanitiaan = hapusKepanitiaan;
window.renderPengaturanPembayaranLain = renderPengaturanPembayaranLain;
window.bukaModalJenisPembayaranLain = bukaModalJenisPembayaranLain;
window.editJenisPembayaranLain = editJenisPembayaranLain;
window.simpanJenisPembayaranLain = simpanJenisPembayaranLain;
window.hapusJenisPembayaranLain = hapusJenisPembayaranLain;
window.renderPengaturanKhususIkhtibar = renderPengaturanKhususIkhtibar;
window.onTagihanKhususIkhtibarChanged = onTagihanKhususIkhtibarChanged;
window.toggleBebasIkhtibarInput = toggleBebasIkhtibarInput;
window.renderListPilihSantriIkhtibar = renderListPilihSantriIkhtibar;
window.toggleSelectSantriIkhtibar = toggleSelectSantriIkhtibar;
window.pilihSemuaSantriIkhtibarTampil = pilihSemuaSantriIkhtibarTampil;
window.batalPilihSemuaSantriIkhtibar = batalPilihSemuaSantriIkhtibar;
window.simpanTarifKhususIkhtibar = simpanTarifKhususIkhtibar;
window.renderTableSantriKhususIkhtibarSaved = renderTableSantriKhususIkhtibarSaved;
window.siapkanEditTarifKhususIkhtibar = siapkanEditTarifKhususIkhtibar;
window.hapusTarifKhususIkhtibar = hapusTarifKhususIkhtibar;
window.renderPengaturanKamar = renderPengaturanKamar;
window.tambahKamarMaster = tambahKamarMaster;
window.editKamarMaster = editKamarMaster;
window.hapusKamarMaster = hapusKamarMaster;
window.renderDaftarBebasSyahriah = renderDaftarBebasSyahriah;
window.bukaModalBebasSyahriah = bukaModalBebasSyahriah;
window.simpanBebasSyahriah = simpanBebasSyahriah;
window.hapusBebasSyahriah = hapusBebasSyahriah;
window.onSearchSantriBebas = onSearchSantriBebas;
window.onFocusSantriBebas = onFocusSantriBebas;
window.pilihSantriBebas = pilihSantriBebas;
window.clearSelectedSantriBebas = clearSelectedSantriBebas;
window.aturTargetSantriPL = aturTargetSantriPL;
window.onTargetPLTipeChanged = onTargetPLTipeChanged;
window.onTargetPLAngkatanChanged = onTargetPLAngkatanChanged;
window.renderListTargetPL = renderListTargetPL;
window.toggleSantriTargetPL = toggleSantriTargetPL;
window.pilihSemuaSantriPL = pilihSemuaSantriPL;
window.batalPilihSemuaSantriPL = batalPilihSemuaSantriPL;
window.pilihSantriBaruPL = pilihSantriBaruPL;
window.filterListTargetPL = filterListTargetPL;
window.simpanTargetSantriPL = simpanTargetSantriPL;


