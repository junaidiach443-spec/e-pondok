/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Syahriah Bulanan Module
 * Pembayaran SPP 12 Bulan Hijriah, Kartu Syahriah Santri, & Multi-Select Bayar
 * ==========================================================================
 */

// Render Daftar Santri di Halaman Syahriah dengan Filter Kamar, Status, & Pagination 20 Data
function renderSyahriah(resetPage = false) {
    if (resetPage && window.paginationState) {
        window.paginationState.syahriah.page = 1;
    }
    const TA = getTahunAjaranAktif();
    const tb = document.getElementById('table-syahriah');
    const searchEl = document.getElementById('search-syahriah');
    const search = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const fKamarEl = document.getElementById('filter-kamar-syahriah');
    const fKamar = fKamarEl ? fKamarEl.value : 'all';
    const fStatusEl = document.getElementById('filter-status-syahriah');
    const fStatus = fStatusEl ? fStatusEl.value : 'Aktif';
    if (!tb) return;
    
    let d = [...santriData].sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
    if (fStatus !== 'all') {
        d = d.filter(s => s.status === fStatus);
    }
    if (fKamar !== 'all') {
        d = d.filter(s => s.kamar === fKamar);
    }
    if (search) {
        d = d.filter(s => (s.nama || '').toLowerCase().includes(search) || (s.nis || '').toLowerCase().includes(search));
    }

    const totalItems = d.length;
    const page = window.paginationState ? window.paginationState.syahriah.page : 1;
    const pageSize = (window.paginationState && window.paginationState.syahriah.pageSize) || 20;

    const paged = typeof paginateArray === 'function'
        ? paginateArray(d, page, pageSize)
        : { items: d.slice(0, 20), total: totalItems, currentPage: 1, totalPages: 1 };

    if (window.paginationState) {
        window.paginationState.syahriah.page = paged.currentPage;
    }

    if (paged.items.length === 0) {
        tb.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-gray-400"><i class="fas fa-search text-2xl mb-2 text-gray-300"></i><p>Tidak ada data santri ditemukan</p></td></tr>`;
    } else {
        tb.innerHTML = paged.items.map(s => {
            let isBebas = (typeof isSantriBebasSyahriah === 'function') ? isSantriBebasSyahriah(s.id) : false;
            let trx = transactions.filter(t => t.santriId === s.id && t.kategori === 'Syahriah' && t.ta === TA && t.type === 'in');
            let totalBayar = trx.reduce((sum, t) => sum + t.amount, 0);
            let progress = isBebas ? 100 : Math.min(100, Math.round((totalBayar / (appSettings.tarifSyahriah * 12)) * 100));

            // Hitung jumlah bulan yang sudah lunas dibayar
            let bulanLunasCount = 0;
            if (isBebas) {
                bulanLunasCount = 12;
            } else {
                const bList = (typeof bulanIslam !== 'undefined') ? bulanIslam : (window.bulanIslam || []);
                const listBulanTerbayar = bList.filter(b => trx.some(t => (t.desc || '').includes(b)));
                bulanLunasCount = listBulanTerbayar.length;
                if (bulanLunasCount === 0 && totalBayar > 0 && appSettings.tarifSyahriah > 0) {
                    bulanLunasCount = Math.min(12, Math.floor(totalBayar / appSettings.tarifSyahriah));
                } else if (appSettings.tarifSyahriah > 0) {
                    bulanLunasCount = Math.min(12, Math.max(bulanLunasCount, Math.floor(totalBayar / appSettings.tarifSyahriah)));
                }
            }
            
            let statusBadge = '';
            if (isBebas) {
                statusBadge = `<span class="px-2 py-0.5 text-[9px] bg-blue-50 text-blue-700 rounded font-bold border border-blue-200 ml-1.5"><i class="fas fa-gift mr-1"></i>Bebas Syahriah</span>`;
            } else if (s.status !== 'Aktif') {
                statusBadge = `<span class="px-2 py-0.5 text-[9px] bg-gray-100 text-gray-500 rounded font-semibold border border-gray-200 ml-1.5">${s.status}</span>`;
            }

            return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center flex-wrap gap-1">
                        <span class="font-bold text-gray-800 uppercase">${s.nama}</span>
                        ${statusBadge}
                    </div>
                    <div class="font-mono text-[10px] text-gray-400 mt-0.5">${s.nis}</div>
                </td>
                <td class="px-6 py-4 text-gray-600 font-medium">${s.kamar || '-'}</td>
                <td class="px-6 py-4 w-52">
                    <div class="flex justify-between items-center text-xs mb-1.5">
                        <span class="${progress === 100 ? 'text-blue-600 font-bold' : 'text-gray-600 font-semibold'}">${progress}%</span>
                        <span class="text-[11px] font-bold ${progress === 100 ? 'text-blue-600' : (bulanLunasCount > 0 ? 'text-indigo-600' : 'text-gray-400')}">
                            ${isBebas ? '12/12 Bln (Bebas)' : `${bulanLunasCount}/12 Bulan`}
                        </span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div class="${progress === 100 ? 'bg-blue-500' : 'bg-indigo-500'} h-2 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <button onclick="bukaDetailSyahriah('${s.id}')" class="bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:text-white text-indigo-700 px-5 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors">Detail & Bayar</button>
                </td>
            </tr>`;
        }).join('');
    }

    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls({
            containerId: 'pagination-syahriah',
            totalItems: totalItems,
            currentPage: paged.currentPage,
            pageSize: pageSize,
            onPageChange: 'gantiHalamanSyahriah'
        });
    }
}

// Buka Kartu Rincian Syahriah Santri
function bukaDetailSyahriah(santriId) {
    currentDetailSantriId = santriId;
    selectedBulanPay = []; 
    hideActionPanel();

    const s = santriData.find(x => x.id === santriId);
    if (!s) return;

    // Cek update transaksi terbaru dari cloud di latar belakang saat membuka rincian santri
    if (typeof pullFromCloud === 'function' && typeof cloudConfig !== 'undefined' && cloudConfig.webAppUrl) {
        pullFromCloud({ silent: true });
    }

    const viewList = document.getElementById('view-syahriah-list');
    const viewDetail = document.getElementById('view-syahriah-detail');
    const headerList = document.getElementById('header-syahriah-list');
    
    if (viewList) viewList.classList.add('hidden');
    if (headerList) headerList.classList.add('hidden');
    if (viewDetail) viewDetail.classList.remove('hidden');
    
    document.getElementById('detail-ta').innerText = getTahunAjaranAktif();
    document.getElementById('detail-nama').innerText = s.nama;
    document.getElementById('detail-nis').innerText = s.nis;
    document.getElementById('detail-kamar').innerText = s.kamar || '-';

    const TA = getTahunAjaranAktif();
    const trx = transactions.filter(t => t.santriId === s.id && t.kategori === 'Syahriah' && t.ta === TA && t.type === 'in');
    
    const isBebas = (typeof isSantriBebasSyahriah === 'function') ? isSantriBebasSyahriah(s.id) : false;
    const totalTagihan = isBebas ? 0 : (appSettings.tarifSyahriah * 12);
    const sudahDibayar = trx.reduce((sum, t) => sum + t.amount, 0);
    const sisa = Math.max(0, totalTagihan - sudahDibayar);

    document.getElementById('detail-total-tagihan').innerText = isBebas ? 'Rp 0 (Bebas)' : formatRupiah(totalTagihan);
    document.getElementById('detail-sudah-dibayar').innerText = formatRupiah(sudahDibayar);
    document.getElementById('detail-sisa').innerText = isBebas ? 'Rp 0 (Bebas)' : formatRupiah(sisa);

    const badgeLunas = document.getElementById('detail-status-lunas');
    if (badgeLunas) {
        if (isBebas) {
            badgeLunas.className = "px-4 py-2 bg-blue-100 text-blue-700 font-bold text-sm rounded-lg border border-blue-200 uppercase tracking-wider";
            badgeLunas.innerText = "LUNAS (BEBAS BIAYA)";
        } else if (sisa <= 0) {
            badgeLunas.className = "px-4 py-2 bg-blue-100 text-blue-700 font-bold text-sm rounded-lg border border-blue-200 uppercase tracking-wider";
            badgeLunas.innerText = "LUNAS";
        } else {
            badgeLunas.className = "px-4 py-2 bg-[#fef3c7] text-[#b45309] font-bold text-sm rounded-lg border border-[#fde68a] uppercase tracking-wider";
            badgeLunas.innerText = "BELUM LUNAS";
        }
    }

    renderBulanSyahriah();
}

// Render Tabel 12 Bulan Syahriah (Lunas vs Belum)
function renderBulanSyahriah() {
    const s = santriData.find(x => x.id === currentDetailSantriId);
    if (!s) return;

    const TA = getTahunAjaranAktif();
    const trx = (transactions || []).filter(t => t.santriId === s.id && t.kategori === 'Syahriah' && t.ta === TA && t.type === 'in');
    
    // Sinkronkan Ringkasan Keuangan di Kartu Detail
    const isBebas = (typeof isSantriBebasSyahriah === 'function') ? isSantriBebasSyahriah(s.id) : false;
    const totalTagihan = isBebas ? 0 : ((appSettings.tarifSyahriah || 250000) * 12);
    const sudahDibayar = trx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const sisa = Math.max(0, totalTagihan - sudahDibayar);

    const elTotalTagihan = document.getElementById('detail-total-tagihan');
    const elSudahDibayar = document.getElementById('detail-sudah-dibayar');
    const elSisa = document.getElementById('detail-sisa');
    const badgeLunas = document.getElementById('detail-status-lunas');

    if (elTotalTagihan) elTotalTagihan.innerText = isBebas ? 'Rp 0 (Bebas)' : formatRupiah(totalTagihan);
    if (elSudahDibayar) elSudahDibayar.innerText = formatRupiah(sudahDibayar);
    if (elSisa) elSisa.innerText = isBebas ? 'Rp 0 (Bebas)' : formatRupiah(sisa);

    if (badgeLunas) {
        if (isBebas) {
            badgeLunas.className = "px-4 py-2 bg-blue-100 text-blue-800 font-bold text-sm rounded-lg border border-blue-300 uppercase tracking-wider flex items-center gap-1.5 shadow-2xs";
            badgeLunas.innerHTML = '<i class="fas fa-check-circle"></i> LUNAS (BEBAS BIAYA)';
        } else if (sisa <= 0) {
            badgeLunas.className = "px-4 py-2 bg-blue-100 text-blue-800 font-bold text-sm rounded-lg border border-blue-300 uppercase tracking-wider flex items-center gap-1.5 shadow-2xs";
            badgeLunas.innerHTML = '<i class="fas fa-check-circle"></i> LUNAS';
        } else {
            badgeLunas.className = "px-4 py-2 bg-amber-100 text-amber-800 font-bold text-sm rounded-lg border border-amber-300 uppercase tracking-wider flex items-center gap-1.5 shadow-2xs";
            badgeLunas.innerHTML = '<i class="fas fa-clock"></i> BELUM LUNAS';
        }
    }

    let listHtml = '';
    let unPaidCount = 0;

    for (let i = 0; i < 12; i++) {
        const namaBulan = bulanIslam[i];
        const trxBulan = trx.find(t => (t.desc || '').includes(namaBulan));
        const isPaid = !!trxBulan;
        const isSelected = selectedBulanPay.includes(namaBulan);
        
        if (isPaid) {
            let tglFormatted = '-';
            try {
                const rawDate = String(trxBulan.date || '');
                const cleanDate = rawDate.split('T')[0];
                const parts = cleanDate.split('-');
                if (parts.length === 3) {
                    tglFormatted = `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
                } else {
                    const d = new Date(trxBulan.date);
                    if (!isNaN(d.getTime())) {
                        tglFormatted = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
                    }
                }
            } catch (e) {
                tglFormatted = String(trxBulan.date || '-');
            }

            listHtml += `
            <tr class="hover:bg-blue-50/30 transition-colors">
                <td class="px-6 py-4 text-gray-400 font-medium">${i + 1}</td>
                <td class="px-6 py-4 font-bold text-gray-800">${namaBulan}</td>
                <td class="px-6 py-4 text-gray-500 font-mono text-sm">${formatRupiah(appSettings.tarifSyahriah || 250000)}</td>
                <td class="px-6 py-4"><span class="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200 flex items-center w-max gap-1"><i class="fas fa-check"></i> Lunas</span></td>
                <td class="px-6 py-4 text-center">
                    <div class="flex flex-col items-center justify-center gap-1.5">
                        <span class="text-[10px] text-gray-400 font-medium">${tglFormatted}</span>
                        <button onclick="batalBayarSyahriah('${trxBulan.id}', '${namaBulan}')" class="text-gray-400 hover:text-rose-500 transition-colors p-1" title="Batalkan Pembayaran Bulan ${namaBulan}"><i class="fas fa-times-circle text-[15px]"></i></button>
                    </div>
                </td>
            </tr>`;
        } else {
            unPaidCount++;
            listHtml += `
            <tr class="hover:bg-blue-50/20 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/60' : ''}" onclick="toggleBulanPay('${namaBulan}')">
                <td class="px-6 py-4 text-gray-400 font-medium">${i + 1}</td>
                <td class="px-6 py-4 font-bold ${isSelected ? 'text-blue-700' : 'text-gray-600'}">${namaBulan}</td>
                <td class="px-6 py-4 text-gray-500 font-mono text-sm">${formatRupiah(appSettings.tarifSyahriah || 250000)}</td>
                <td class="px-6 py-4"><span class="text-xs text-gray-400 font-medium">Belum Bayar</span></td>
                <td class="px-6 py-4 text-center" onclick="event.stopPropagation()">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleBulanPay('${namaBulan}')" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer">
                </td>
            </tr>`;
        }
    }
    document.getElementById('list-bulan-bayar').innerHTML = listHtml;
    
    const cbSemua = document.getElementById('cb-pilih-semua');
    if (cbSemua) {
        if (unPaidCount === 0) {
            cbSemua.disabled = true;
            cbSemua.checked = false;
        } else {
            cbSemua.disabled = false;
            cbSemua.checked = (selectedBulanPay.length === unPaidCount && unPaidCount > 0);
        }
    }

    updateActionPanel();
}

// Toggle Checklist Pilih Semua Bulan yang Belum Bayar
function togglePilihSemua() {
    const s = santriData.find(x => x.id === currentDetailSantriId);
    const TA = getTahunAjaranAktif();
    const trx = transactions.filter(t => t.santriId === s.id && t.kategori === 'Syahriah' && t.ta === TA && t.type === 'in');
    
    let unpaidMonths = [];
    bulanIslam.forEach(bulan => {
        if (!trx.some(t => t.desc.includes(bulan))) unpaidMonths.push(bulan);
    });

    const cbSemua = document.getElementById('cb-pilih-semua');
    if (cbSemua && cbSemua.checked) {
        selectedBulanPay = [...unpaidMonths];
    } else {
        selectedBulanPay = [];
    }
    renderBulanSyahriah();
}

// Batalkan Transaksi Pembayaran Bulan Syahriah (Hanya Membatalkan Bulan Terpilih)
function batalBayarSyahriah(trxId, namaBulan) {
    const s = santriData.find(x => x.id === currentDetailSantriId);
    const namaSantri = s ? s.nama : 'Santri';
    const labelBulan = namaBulan ? `bulan ${namaBulan}` : 'pembayaran ini';

    showConfirm("Batalkan Pembayaran?", `Batalkan pembayaran Syahriah ${labelBulan} untuk ${namaSantri}? Status bulan ini akan dikembalikan menjadi belum bayar.`, () => {
        let targetTrx = transactions.find(t => t.id === trxId);
        
        // Fallback jika id tidak cocok langsung, cari berdasarkan santri dan nama bulan
        if (!targetTrx && namaBulan) {
            const TA = getTahunAjaranAktif();
            targetTrx = transactions.find(t => 
                t.santriId === currentDetailSantriId &&
                t.kategori === 'Syahriah' &&
                t.ta === TA &&
                t.type === 'in' &&
                (t.desc || '').includes(namaBulan)
            );
        }

        if (!targetTrx) {
            showToast("Data transaksi tidak ditemukan!", "error");
            return;
        }

        // Cek daftar bulan yang ada di deskripsi transaksi
        const monthsInTrx = bulanIslam.filter(b => (targetTrx.desc || '').includes(b));

        if (monthsInTrx.length > 1 && namaBulan) {
            // Transaksi ini menggabungkan beberapa bulan sekaligus!
            // HANYA kurangi bulan yang dipilih agar bulan lainnya TETAP LUNAS
            const remainingMonths = monthsInTrx.filter(b => b !== namaBulan);
            const nominalPerBulan = Math.round(targetTrx.amount / monthsInTrx.length);

            targetTrx.desc = 'Syahriah: ' + remainingMonths.join(', ');
            targetTrx.amount = Math.max(0, targetTrx.amount - nominalPerBulan);
        } else {
            // Hanya 1 bulan atau tidak ada bulan lain, hapus seluruh objek transaksi
            if (targetTrx && targetTrx.id && typeof trackDeletedTransactionId === 'function') {
                trackDeletedTransactionId(targetTrx.id);
            }
            transactions = transactions.filter(t => t.id !== targetTrx.id);
        }

        // Pastikan juga jika ada duplikat/sisa transaksi untuk santri dan bulan yang sama
        if (namaBulan && currentDetailSantriId) {
            const TA = getTahunAjaranAktif();
            transactions = transactions.filter(t => {
                if (t.santriId === currentDetailSantriId && t.kategori === 'Syahriah' && t.ta === TA && t.type === 'in') {
                    const descMonths = bulanIslam.filter(b => (t.desc || '').includes(b));
                    if (descMonths.length === 1 && descMonths[0] === namaBulan) {
                        if (typeof trackDeletedTransactionId === 'function') {
                            trackDeletedTransactionId(t.id);
                        }
                        return false;
                    }
                    if (descMonths.includes(namaBulan)) {
                        const rem = descMonths.filter(b => b !== namaBulan);
                        t.desc = 'Syahriah: ' + rem.join(', ');
                        t.amount = Math.max(0, Math.round(t.amount * rem.length / descMonths.length));
                        return rem.length > 0;
                    }
                }
                return true;
            });
        }

        window.transactions = transactions;
        saveDataToStorage();
        if (typeof triggerAutoSyncToCloud === 'function') {
            triggerAutoSyncToCloud(true);
        }
        updateDashboard();
        if (typeof renderSyahriah === 'function') renderSyahriah();
        bukaDetailSyahriah(currentDetailSantriId); 
        showToast(`Pembayaran ${labelBulan} berhasil dibatalkan`);
    });
}

// Pilih / Batal Pilih Bulan untuk Dibayar
function toggleBulanPay(bulan) {
    if (selectedBulanPay.includes(bulan)) {
        selectedBulanPay = selectedBulanPay.filter(b => b !== bulan);
    } else {
        selectedBulanPay.push(bulan);
    }
    renderBulanSyahriah();
}

// Update Panel Konfirmasi Bayar di Bawah Layar
function updateActionPanel() {
    const panel = document.getElementById('action-panel-bayar');
    if (!panel) return;

    const viewDetail = document.getElementById('view-syahriah-detail');
    const isDetailVisible = viewDetail && !viewDetail.classList.contains('hidden');

    if (selectedBulanPay.length > 0 && isDetailVisible) {
        panel.classList.remove('translate-y-full', 'hidden');
        document.getElementById('action-total-rp').innerText = formatRupiah(selectedBulanPay.length * appSettings.tarifSyahriah);
        document.getElementById('action-total-item').innerText = selectedBulanPay.length + ' Bulan';
        document.getElementById('action-btn-count').innerText = selectedBulanPay.length;
    } else {
        panel.classList.add('translate-y-full');
        setTimeout(() => {
            if (selectedBulanPay.length === 0 || !isDetailVisible) panel.classList.add('hidden');
        }, 200);
    }
}

// Sembunyikan Panel Aksi Bayar
function hideActionPanel(immediate = false) {
    const panel = document.getElementById('action-panel-bayar');
    if (!panel) return;
    panel.classList.add('translate-y-full');
    if (immediate) {
        panel.classList.add('hidden');
    } else {
        setTimeout(() => {
            if (selectedBulanPay.length === 0) panel.classList.add('hidden');
        }, 200);
    }
}

// Proses Eksekusi Pembayaran Syahriah Bulan Terpilih
function prosesBayarSyahriahSelected() {
    if (selectedBulanPay.length === 0) return;
    const s = santriData.find(x => x.id === currentDetailSantriId);
    
    showConfirm("Konfirmasi Bayar", `Bayar SPP ${selectedBulanPay.length} bulan untuk ${s.nama}?`, () => {
        const elMetode = document.getElementById('syahriah-metode-bayar');
        const metodeBayar = elMetode ? elMetode.value : 'Tunai';
        const now = Date.now();
        const tglHariIni = new Date().toLocaleDateString('en-CA');
        const taAktif = getTahunAjaranAktif();
        const tarif = appSettings.tarifSyahriah || 250000;

        // Simpan setiap bulan secara terpisah agar masing-masing memiliki riwayat mandiri
        // dan dapat dibatalkan per bulan secara independen
        const kasirNama = (appSettings && appSettings.adminAuth && appSettings.adminAuth.nama) || 'Bendahara';
        selectedBulanPay.forEach((bulan, idx) => {
            const uniqueTrxId = (typeof generateTrxId === 'function') 
                ? generateTrxId('TRX') 
                : ('TRX-' + now + '-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + idx);

            transactions.push({
                id: uniqueTrxId,
                santriId: s.id,
                santriNama: s.nama,
                santriNis: s.nis,
                santriKamar: s.kamar || s.kamarTerakhir || '-',
                ta: taAktif,
                kategori: 'Syahriah',
                type: 'in',
                amount: tarif,
                desc: `Syahriah: ${bulan}`,
                metode: metodeBayar,
                kasir: kasirNama,
                date: tglHariIni
            });
        });
        
        window.transactions = transactions;
        saveDataToStorage();
        if (typeof triggerAutoSyncToCloud === 'function') {
            triggerAutoSyncToCloud(true); // Kirim instan ke Google Sheets tanpa delay!
        }
        selectedBulanPay = [];
        hideActionPanel(true);
        updateDashboard();
        if (typeof renderSyahriah === 'function') renderSyahriah();
        bukaDetailSyahriah(currentDetailSantriId); 
        showToast("Pembayaran Lunas!");
    }, false); 
}

// Kembali dari Kartu Syahriah ke Daftar Santri
function kembaliKeDaftarSyahriah() {
    selectedBulanPay = [];
    hideActionPanel(true);
    const vList = document.getElementById('view-syahriah-list');
    const hList = document.getElementById('header-syahriah-list');
    const vDetail = document.getElementById('view-syahriah-detail');
    if (vList) vList.classList.remove('hidden');
    if (hList) hList.classList.remove('hidden');
    if (vDetail) vDetail.classList.add('hidden');
    renderSyahriah();
}

// Expose ke global window
window.renderSyahriah = renderSyahriah;
window.bukaDetailSyahriah = bukaDetailSyahriah;
window.renderBulanSyahriah = renderBulanSyahriah;
window.togglePilihSemua = togglePilihSemua;
window.batalBayarSyahriah = batalBayarSyahriah;
window.toggleBulanPay = toggleBulanPay;
window.updateActionPanel = updateActionPanel;
window.hideActionPanel = hideActionPanel;
window.prosesBayarSyahriahSelected = prosesBayarSyahriahSelected;
window.kembaliKeDaftarSyahriah = kembaliKeDaftarSyahriah;
