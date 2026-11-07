/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Pengeluaran Kas Module
 * Pencatatan beban/biaya (Syahriah, Pembayaran Lain, & Tagihan Kustom)
 * Filter pos/divisi panitia, auto-fill PJ, export Excel, & perhitungan saldo
 * ==========================================================================
 */

// Render Menu Dinamis untuk Tagihan Kustom di Sidebar & Page Select
function renderPengeluaranMenu() {
    const pMenuPemasukan = document.getElementById('menu-tagihan-kustom-pemasukan');
    if (pMenuPemasukan) {
        pMenuPemasukan.innerHTML = (appSettings.tagihanKustom || []).map(t => 
            `<a href="#" onclick="bukaHalamanPembayaranKustom('${t.nama}')" class="block px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 font-medium transition-colors">Pembayaran ${t.nama}</a>`
        ).join('');
    }
    const pMenuPengeluaran = document.getElementById('menu-tagihan-kustom-pengeluaran');
    if (pMenuPengeluaran) {
        pMenuPengeluaran.innerHTML = (appSettings.tagihanKustom || []).map(t => {
            const navId = 'nav-pengeluaran-' + t.nama.toLowerCase().replace(/\s+/g, '-');
            return `<a href="#" onclick="bukaHalamanPengeluaran('${t.nama}')" id="${navId}" class="block px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-rose-600 hover:bg-rose-50 font-medium transition-colors">Dana ${t.nama}</a>`;
        }).join('');
    }

    // Perbarui opsi dropdown sumber dana di header halaman pengeluaran
    const selPage = document.getElementById('select-kategori-pengeluaran-page');
    if (selPage) {
        let opts = '<option value="Syahriah">Dana Syahriah</option><option value="Pembayaran Lain">Dana Pembayaran Lain</option>';
        (appSettings.tagihanKustom || []).forEach(t => {
            opts += `<option value="${t.nama}">Dana ${t.nama}</option>`;
        });
        selPage.innerHTML = opts;
        if (window.currentKategoriPengeluaran) {
            selPage.value = window.currentKategoriPengeluaran;
        }
    }
}

// Render Dropdown Filter Divisi (Khusus Ikhtibar)
function renderFilterDivisi() {
    const selFilter = document.getElementById('filter-peng-divisi');
    if (selFilter) {
        const val = selFilter.value;
        selFilter.innerHTML = '<option value="all">Semua Divisi</option>' + 
            (appSettings.kepanitiaan || []).map(k => `<option value="${k.divisi}">${k.divisi}</option>`).join('');
        selFilter.value = val || 'all'; 
    }
}

// Render Dropdown Filter Pos Pembayaran Lain
function renderFilterPosPL() {
    const selFilter = document.getElementById('filter-peng-pos-pl');
    if (selFilter) {
        const val = selFilter.value;
        const list = appSettings.pembayaranLainList || [];
        let html = '<option value="all">Semua Pos Pembayaran Lain</option>';
        list.forEach(p => {
            html += `<option value="${p.nama}">${p.nama}</option>`;
        });
        html += '<option value="Umum">Operasional / Umum</option>';
        selFilter.innerHTML = html;
        selFilter.value = val || 'all';
    }
}

// Buka Halaman Pengeluaran Spesifik Kategori (Syahriah / Pembayaran Lain / Ikhtibar dll)
function bukaHalamanPengeluaran(kategori) {
    kategori = kategori || 'Syahriah';
    window.currentKategoriPengeluaran = kategori;
    
    const subTitle = document.getElementById('subtitle-pengeluaran');
    if (subTitle) subTitle.innerText = `Dana ${kategori}`;

    // Sinkronkan dropdown di header halaman
    const selPage = document.getElementById('select-kategori-pengeluaran-page');
    if (selPage) {
        if (!selPage.innerHTML.includes(kategori)) {
            renderPengeluaranMenu();
        }
        selPage.value = kategori;
    }
    
    // Pastikan accordion menu pengeluaran di sidebar terbuka
    const menuPengeluaran = document.getElementById('menu-pengeluaran');
    const iconPengeluaran = document.getElementById('icon-menu-pengeluaran');
    if (menuPengeluaran && menuPengeluaran.classList.contains('hidden')) {
        menuPengeluaran.classList.remove('hidden');
        if (iconPengeluaran) iconPengeluaran.classList.add('rotate-180');
    }

    const divContainer = document.getElementById('filter-divisi-container');
    const plContainer = document.getElementById('filter-pl-container');
    const isPL = (kategori === 'Pembayaran Lain');
    const isIkhtibar = ((kategori || '').toLowerCase().includes('ikhtibar'));
    
    if (isPL) {
        if (divContainer) divContainer.classList.add('hidden');
        if (plContainer) {
            plContainer.classList.remove('hidden');
            renderFilterPosPL();
        }
    } else if (isIkhtibar) {
        if (plContainer) plContainer.classList.add('hidden');
        if (divContainer) {
            divContainer.classList.remove('hidden');
            renderFilterDivisi();
        }
    } else {
        if (divContainer) divContainer.classList.add('hidden');
        if (plContainer) plContainer.classList.add('hidden');
        const fDiv = document.getElementById('filter-peng-divisi');
        if (fDiv) fDiv.value = 'all';
    }

    renderPengeluaran();
    navigate('pengeluaran');

    // Highlight submenu yang sedang aktif di Pengeluaran
    document.querySelectorAll('#menu-pengeluaran a').forEach(el => {
        el.classList.remove('bg-rose-50', 'text-rose-600', 'font-bold');
        el.classList.add('text-gray-500');
    });

    let activeNavId = 'nav-pengeluaran-syahriah';
    if (kategori === 'Pembayaran Lain') {
        activeNavId = 'nav-pengeluaran-pembayaran-lain';
    } else if (kategori !== 'Syahriah') {
        activeNavId = 'nav-pengeluaran-' + kategori.toLowerCase().replace(/\s+/g, '-');
    }
    const activeEl = document.getElementById(activeNavId);
    if (activeEl) {
        activeEl.classList.remove('text-gray-500');
        activeEl.classList.add('bg-rose-50', 'text-rose-600', 'font-bold');
    }
}

// Render Data & Filter Pengeluaran
function renderPengeluaran() {
    if (!window.currentKategoriPengeluaran) {
        window.currentKategoriPengeluaran = 'Syahriah';
    }
    const TA = getTahunAjaranAktif();
    const isPL = window.currentKategoriPengeluaran === 'Pembayaran Lain';
    const fPosPL = (isPL && document.getElementById('filter-peng-pos-pl')) ? document.getElementById('filter-peng-pos-pl').value : 'all';

    // Ambil transaksi sesuai kategori & tahun ajaran (pencocokan case-insensitive aman)
    const currentKatLower = (window.currentKategoriPengeluaran || 'Syahriah').toLowerCase().trim();
    let trx = (transactions || []).filter(t => t.ta === TA && (t.kategori || '').toLowerCase().trim() === currentKatLower);
    
    // Hitung total masuk & keluar untuk kartu KPI
    let totalMasuk = 0;
    let totalKeluar = 0;

    trx.forEach(t => {
        if (isPL && fPosPL !== 'all') {
            const matchesPos = (t.subJenis === fPosPL) || (t.desc && t.desc.toLowerCase().includes(fPosPL.toLowerCase()));
            if (matchesPos) {
                if (t.type === 'in') totalMasuk += t.amount;
                else totalKeluar += t.amount;
            }
        } else {
            if (t.type === 'in') totalMasuk += t.amount;
            else totalKeluar += t.amount;
        }
    });
    
    const elMasuk = document.getElementById('peng-card-masuk');
    const elKeluar = document.getElementById('peng-card-keluar');
    const elSaldo = document.getElementById('peng-card-saldo');

    if (elMasuk) elMasuk.innerText = formatRupiah(totalMasuk);
    if (elKeluar) elKeluar.innerText = formatRupiah(totalKeluar);
    if (elSaldo) elSaldo.innerText = formatRupiah(totalMasuk - totalKeluar);

    // Ambil baris pengeluaran (type === 'out')
    let d = trx.filter(t => t.type === 'out').sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const start = document.getElementById('filter-peng-start') ? document.getElementById('filter-peng-start').value : '';
    const end = document.getElementById('filter-peng-end') ? document.getElementById('filter-peng-end').value : '';
    const fDivisi = document.getElementById('filter-peng-divisi') ? document.getElementById('filter-peng-divisi').value : 'all';
    const descEl = document.getElementById('filter-peng-desc');
    const desc = descEl ? descEl.value.toLowerCase() : '';

    if (start) d = d.filter(t => t.date >= start);
    if (end) d = d.filter(t => t.date <= end);
    if (isPL && fPosPL !== 'all') {
        d = d.filter(t => t.subJenis === fPosPL || (t.desc && t.desc.toLowerCase().includes(fPosPL.toLowerCase())));
    }
    if (!isPL && fDivisi && fDivisi !== 'all') {
        d = d.filter(t => t.divisi === fDivisi);
    }
    if (desc) {
        d = d.filter(t => (t.desc || '').toLowerCase().includes(desc) || 
                          (t.pj || '').toLowerCase().includes(desc) || 
                          (t.subJenis || '').toLowerCase().includes(desc));
    }

    const totalItems = d.length;
    const page = window.paginationState ? window.paginationState.pengeluaran.page : 1;
    const pageSize = (window.paginationState && window.paginationState.pengeluaran.pageSize) || 20;

    const paged = typeof paginateArray === 'function'
        ? paginateArray(d, page, pageSize)
        : { items: d.slice(0, 20), total: totalItems, currentPage: 1, totalPages: 1, startIndex: 0 };

    if (window.paginationState) {
        window.paginationState.pengeluaran.page = paged.currentPage;
    }

    const tb = document.getElementById('table-pengeluaran');
    if (tb) {
        tb.innerHTML = paged.items.length ? paged.items.map((t, i) => {
            let badgeDivisiOrPos = '';
            if (t.subJenis) {
                badgeDivisiOrPos = `<div class="text-[10px] bg-emerald-50 text-emerald-700 font-bold inline-block px-2 py-0.5 rounded mt-1 border border-emerald-200"><i class="fas fa-tag text-[9px] mr-1"></i>${t.subJenis}</div>`;
            } else if (t.divisi) {
                badgeDivisiOrPos = `<div class="text-[10px] bg-indigo-50 text-indigo-600 font-bold inline-block px-2 py-0.5 rounded mt-1 border border-indigo-100">${t.divisi}</div>`;
            }

            return `
            <tr class="hover:bg-gray-50 border-b border-gray-50 transition-colors">
                <td class="px-6 py-4 text-gray-500">${paged.startIndex + i + 1}</td>
                <td class="px-6 py-4 font-medium text-gray-700">${new Date(t.date).toLocaleDateString('id-ID')}</td>
                <td class="px-6 py-4 font-bold text-gray-800 uppercase">${t.desc}</td>
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-700 text-xs">${t.pj || '-'}</div>
                    ${badgeDivisiOrPos}
                </td>
                <td class="px-6 py-4 text-right font-extrabold text-rose-600 font-mono">${formatRupiah(t.amount)}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="hapusTransaksi('${t.id}')" class="text-gray-400 hover:text-rose-600 p-2 transition-colors" title="Hapus"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
        }).join('') : '<tr><td colspan="6" class="p-10 text-center text-gray-400"><i class="fas fa-receipt text-3xl mb-2 text-gray-300"></i><p>Tidak ada data pengeluaran ditemukan</p></td></tr>';
    }

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls({
            containerId: 'pagination-pengeluaran',
            totalItems: totalItems,
            currentPage: paged.currentPage,
            pageSize: pageSize,
            onPageChange: 'gantiHalamanPengeluaran'
        });
    }
}

// Auto-fill Nama Penanggung Jawab Berdasarkan Divisi (Ikhtibar)
function autoFillPJ() {
    const elDivisi = document.getElementById('peng-divisi');
    const selDivisi = elDivisi ? elDivisi.value : '';
    const inputPJ = document.getElementById('peng-pj');
    if (!inputPJ) return;

    if (selDivisi && Array.isArray(appSettings.kepanitiaan)) {
        const found = appSettings.kepanitiaan.find(k => k.divisi === selDivisi);
        if (found) inputPJ.value = found.pj;
    } else {
        inputPJ.value = '';
    }
}

// Handler saat dropdown Kategori di modal berubah
function onModalKategoriPengeluaranChange() {
    const katModal = document.getElementById('peng-kategori-modal');
    const kategori = (katModal ? katModal.value : null) || window.currentKategoriPengeluaran || 'Syahriah';
    const divContainer = document.getElementById('container-input-divisi');
    const selDivisi = document.getElementById('peng-divisi');
    const plContainer = document.getElementById('container-input-pos-pl');
    const selPosPL = document.getElementById('peng-pos-pl');
    const hintPj = document.getElementById('hint-pj');
    const inputPj = document.getElementById('peng-pj');
    const modalTitle = document.getElementById('modal-pengeluaran-title');
    
    if (modalTitle) {
        modalTitle.innerText = `Catat Pengeluaran: ${kategori}`;
    }

    const katLower = (kategori || '').toLowerCase();
    if (kategori === 'Pembayaran Lain') {
        if (divContainer) divContainer.classList.add('hidden');
        if (selDivisi) selDivisi.value = '';
        if (plContainer) {
            plContainer.classList.remove('hidden');
            const list = appSettings.pembayaranLainList || [];
            let options = '';
            list.forEach(item => {
                options += `<option value="${item.nama}">${item.nama}</option>`;
            });
            options += `<option value="Umum">Operasional / Umum</option>`;
            if (selPosPL) selPosPL.innerHTML = options;
        }
        if (hintPj) hintPj.innerText = "Ketikkan nama penerima dana / PJ pos pembayaran lain.";
        if (inputPj) {
            inputPj.removeAttribute('readonly');
            inputPj.classList.remove('bg-gray-100', 'text-gray-500');
            inputPj.classList.add('bg-white', 'text-gray-800');
        }
    } else if (katLower.includes('ikhtibar')) {
        if (plContainer) plContainer.classList.add('hidden');
        if (divContainer) {
            divContainer.classList.remove('hidden');
            if (selDivisi) {
                selDivisi.innerHTML = '<option value="">-- Pilih Divisi --</option>' + 
                    (appSettings.kepanitiaan || []).map(k => `<option value="${k.divisi}">${k.divisi}</option>`).join('');
            }
        }
        if (hintPj) hintPj.innerText = "Pilih divisi, maka nama PJ otomatis terisi sesuai pengaturan.";
        if (inputPj) {
            inputPj.setAttribute('readonly', 'true');
            inputPj.classList.add('bg-gray-100', 'text-gray-500');
            inputPj.classList.remove('bg-white', 'text-gray-800');
        }
    } else {
        if (plContainer) plContainer.classList.add('hidden');
        if (divContainer) divContainer.classList.add('hidden');
        if (selDivisi) selDivisi.value = '';
        if (hintPj) hintPj.innerText = "Ketikkan nama penerima dana / PJ.";
        if (inputPj) {
            inputPj.removeAttribute('readonly');
            inputPj.classList.remove('bg-gray-100', 'text-gray-500');
            inputPj.classList.add('bg-white', 'text-gray-800');
        }
    }
}

// Buka Modal Input Catat Pengeluaran
function bukaModalPengeluaran() {
    if (!window.currentKategoriPengeluaran) {
        window.currentKategoriPengeluaran = 'Syahriah';
    }

    const elNom = document.getElementById('peng-nominal');
    const elDesc = document.getElementById('peng-desc');
    const elPj = document.getElementById('peng-pj');
    const elDate = document.getElementById('peng-date');
    const elMetode = document.getElementById('peng-metode');
    
    if (elNom) elNom.value = '';
    if (elDesc) elDesc.value = '';
    if (elPj) elPj.value = '';
    if (elDate) elDate.value = new Date().toLocaleDateString('en-CA');
    if (elMetode) elMetode.value = 'Tunai';

    const katModal = document.getElementById('peng-kategori-modal');
    if (katModal) {
        const listKustom = appSettings.tagihanKustom || [];
        let options = '<option value="Syahriah">Dana Syahriah</option><option value="Pembayaran Lain">Dana Pembayaran Lain</option>';
        listKustom.forEach(t => {
            options += `<option value="${t.nama}">Dana ${t.nama}</option>`;
        });
        katModal.innerHTML = options;
        katModal.value = window.currentKategoriPengeluaran;
        if (!katModal.value) {
            katModal.value = 'Syahriah';
            window.currentKategoriPengeluaran = 'Syahriah';
        }
    }

    onModalKategoriPengeluaranChange();
    bukaModal('modal-pengeluaran');
}

// Eksekusi Simpan Catat Pengeluaran
function catatPengeluaran() {
    const elNom = document.getElementById('peng-nominal');
    const rawNom = elNom ? elNom.value.toString().replace(/[^0-9]/g, '') : '';
    const nom = parseInt(rawNom, 10);
    
    if (isNaN(nom) || nom <= 0) {
        showToast("Nominal pengeluaran harus lebih dari 0!", "error");
        if (elNom) elNom.focus();
        return;
    }

    const elDesc = document.getElementById('peng-desc');
    const desc = elDesc ? elDesc.value.trim() : '';
    if (!desc) {
        showToast("Keterangan pengeluaran wajib diisi!", "error");
        if (elDesc) elDesc.focus();
        return;
    }

    const katModal = document.getElementById('peng-kategori-modal');
    const kategori = (katModal ? katModal.value : null) || window.currentKategoriPengeluaran || 'Syahriah';
    window.currentKategoriPengeluaran = kategori;

    let date = document.getElementById('peng-date') ? document.getElementById('peng-date').value : '';
    if (!date) {
        date = new Date().toLocaleDateString('en-CA');
    }

    const pj = document.getElementById('peng-pj') ? document.getElementById('peng-pj').value.trim() : '';
    const divisi = document.getElementById('peng-divisi') ? document.getElementById('peng-divisi').value : '';
    const isPL = (kategori === 'Pembayaran Lain');
    const subJenis = isPL && document.getElementById('peng-pos-pl') ? document.getElementById('peng-pos-pl').value : '';

    const elMetode = document.getElementById('peng-metode');
    const metodeBayar = elMetode ? elMetode.value : 'Tunai';

    const newTx = {
        id: 'TRX-' + Date.now(),
        ta: getTahunAjaranAktif(),
        kategori: kategori,
        type: 'out',
        amount: nom,
        desc: desc,
        pj: pj || '-',
        metode: metodeBayar,
        date: date
    };

    if (isPL) {
        newTx.subJenis = subJenis || 'Umum';
    } else if (divisi) {
        newTx.divisi = divisi;
    }

    if (!Array.isArray(transactions)) transactions = window.transactions || [];
    transactions.push(newTx);
    window.transactions = transactions;

    saveDataToStorage();
    tutupModal('modal-pengeluaran');
    
    renderPengeluaran();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderLaporan === 'function') renderLaporan();
    if (typeof renderPembayaranLainPage === 'function' && isPL) renderPembayaranLainPage();
    
    showToast("Transaksi pengeluaran berhasil dicatat", "success");
}

// Hapus Catatan Transaksi
function hapusTransaksi(id) {
    showConfirm("Hapus Transaksi", "Transaksi yang dihapus tidak bisa dikembalikan. Lanjutkan?", () => {
        transactions = (transactions || []).filter(t => t.id !== id);
        window.transactions = transactions;
        saveDataToStorage();
        if (typeof renderPengeluaran === 'function') renderPengeluaran();
        if (typeof renderLaporan === 'function') renderLaporan();
        if (typeof renderPembayaranLainPage === 'function') renderPembayaranLainPage();
        if (typeof renderSyahriah === 'function') renderSyahriah();
        if (typeof renderBulanSyahriah === 'function' && typeof currentDetailSantriId !== 'undefined' && currentDetailSantriId) renderBulanSyahriah();
        if (typeof renderPembayaranKustomList === 'function') renderPembayaranKustomList();
        updateDashboard();
        showToast("Transaksi Dihapus", "info");
    });
}

// Ekspor Tabel Pengeluaran ke Format CSV / Excel
function exportExcelPengeluaran() {
    const tb = document.getElementById('table-pengeluaran');
    if (!tb) return;

    let csv = [];
    const rows = tb.querySelectorAll("tr");
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll("td, th");
        if (cols.length <= 1 && i > 0) continue;
        for (let j = 0; j < cols.length - 1; j++) { 
            let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, " ").trim();
            row.push('"' + data + '"');
        }
        csv.push(row.join(","));
    }
    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const safeKategori = (window.currentKategoriPengeluaran || 'Pengeluaran').replace(/\s+/g, '_');
    link.download = `Pengeluaran_${safeKategori}.csv`;
    link.click();
}

// Expose ke global window
window.renderPengeluaranMenu = renderPengeluaranMenu;
window.renderFilterDivisi = renderFilterDivisi;
window.renderFilterPosPL = renderFilterPosPL;
window.bukaHalamanPengeluaran = bukaHalamanPengeluaran;
window.renderPengeluaran = renderPengeluaran;
window.autoFillPJ = autoFillPJ;
window.onModalKategoriPengeluaranChange = onModalKategoriPengeluaranChange;
window.bukaModalPengeluaran = bukaModalPengeluaran;
window.catatPengeluaran = catatPengeluaran;
window.hapusTransaksi = hapusTransaksi;
window.exportExcelPengeluaran = exportExcelPengeluaran;
