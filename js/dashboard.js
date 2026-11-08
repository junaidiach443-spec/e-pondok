/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Dashboard Module
 * Ringkasan total santri, pemasukan harian, capaian pembayaran, & ringkasan kas
 * ==========================================================================
 */

let dashboardPeriodFilter = 'ta'; // 'ta' (Tahun Ajaran Aktif) atau 'all' (Semua Waktu - Kas Riil)

function setDashboardPeriodFilter(filter) {
    dashboardPeriodFilter = filter;
    updateDashboard();
}

function updateDashboard() {
    const TA = getTahunAjaranAktif();
    const activeSantriList = (santriData || []).filter(s => s.status === 'Aktif');
    const santriAktif = activeSantriList.length;

    // Hitung Statistik Real-Time Demografi & Status Santri
    const allSantri = santriData || [];
    const totalSemua = allSantri.length;
    const totalBoyong = allSantri.filter(s => s.status === 'Boyong').length;
    const totalGT = allSantri.filter(s => s.status === 'GT').length;

    const setKpiText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    setKpiText('dash-kpi-total', `${totalSemua} Santri`);
    setKpiText('dash-kpi-aktif', `${santriAktif} Santri`);
    setKpiText('dash-kpi-boyong', `${totalBoyong} Santri`);
    setKpiText('dash-kpi-gt', `${totalGT} Santri`);

    setKpiText('master-kpi-total', `${totalSemua} Santri`);
    setKpiText('master-kpi-aktif', `${santriAktif} Santri`);
    setKpiText('master-kpi-boyong', `${totalBoyong} Santri`);
    setKpiText('master-kpi-gt', `${totalGT} Santri`);

    const elTotalSantri = document.getElementById('dash-total-santri');
    if (elTotalSantri) elTotalSantri.innerText = santriAktif;

    const today = new Date().toLocaleDateString('en-CA');

    // Perbarui kontrol toggle dan badge filter di header dashboard
    const elTaLabel = document.getElementById('dash-ta-label');
    if (elTaLabel) elTaLabel.innerText = TA;

    const btnTa = document.getElementById('btn-dash-ta');
    const btnAll = document.getElementById('btn-dash-all');
    const elFilterBadge = document.getElementById('dash-filter-badge');
    const elFilterDesc = document.getElementById('dash-filter-desc');

    if (dashboardPeriodFilter === 'ta') {
        if (btnTa) {
            btnTa.className = "flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm bg-white text-indigo-700";
        }
        if (btnAll) {
            btnAll.className = "flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 transition-all bg-transparent shadow-none";
        }
        if (elFilterBadge) {
            elFilterBadge.innerText = `T.A ${TA}`;
            elFilterBadge.className = "text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono";
        }
        if (elFilterDesc) {
            elFilterDesc.innerHTML = `Menampilkan data pembukuan khusus <b>Tahun Ajaran ${TA}</b>. Otomatis mulai Rp 0 saat pindah tahun ajaran baru.`;
        }
    } else {
        if (btnTa) {
            btnTa.className = "flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 transition-all bg-transparent shadow-none";
        }
        if (btnAll) {
            btnAll.className = "flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm bg-white text-indigo-700";
        }
        if (elFilterBadge) {
            elFilterBadge.innerText = "Semua Waktu (Kas Riil)";
            elFilterBadge.className = "text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono";
        }
        if (elFilterDesc) {
            elFilterDesc.innerHTML = `Menampilkan akumulasi seluruh kas riil pesantren (brankas tunai & rekening bank) <b>sepanjang masa</b>.`;
        }
    }

    let incomeToday = 0;
    let expenseToday = 0;
    let trxTodayCount = 0;

    let kasMasuk = 0;
    let kasKeluar = 0;
    let kasTunaiMasuk = 0;
    let kasTunaiKeluar = 0;
    let kasTransferMasuk = 0;
    let kasTransferKeluar = 0;

    (transactions || []).forEach(t => {
        const amount = Number(t.amount) || 0;
        const isTransfer = (t.metode === 'Transfer');
        const matchPeriod = (dashboardPeriodFilter === 'all') || ((t.ta || '') === TA);

        if (t.type === 'in') {
            if (matchPeriod) {
                kasMasuk += amount;
                if (isTransfer) {
                    kasTransferMasuk += amount;
                } else {
                    kasTunaiMasuk += amount;
                }

                if (t.date === today) {
                    incomeToday += amount;
                    trxTodayCount++;
                }
            }
        } else if (t.type === 'out') {
            if (matchPeriod) {
                kasKeluar += amount;
                if (isTransfer) {
                    kasTransferKeluar += amount;
                } else {
                    kasTunaiKeluar += amount;
                }

                if (t.date === today) {
                    expenseToday += amount;
                }
            }
        }
    });

    // Saldo Kas Bersih
    const saldoKas = kasMasuk - kasKeluar;
    const saldoKasTunai = kasTunaiMasuk - kasTunaiKeluar;
    const saldoKasTransfer = kasTransferMasuk - kasTransferKeluar;

    // Perbarui Kartu 2: Saldo Kas
    const elKasTitle = document.getElementById('dash-kas-title');
    const elKasBadge = document.getElementById('dash-kas-badge');
    const elSaldoKas = document.getElementById('dash-saldo-kas');
    const elSaldoTunai = document.getElementById('dash-saldo-tunai');
    const elSaldoTransfer = document.getElementById('dash-saldo-transfer');

    if (elKasTitle) {
        elKasTitle.innerText = (dashboardPeriodFilter === 'ta') ? `Saldo Kas (T.A ${TA})` : 'Total Saldo Kas Pondok';
    }
    if (elKasBadge) {
        elKasBadge.innerText = (dashboardPeriodFilter === 'ta') ? `T.A ${TA}` : 'Kas Riil';
    }
    if (elSaldoKas) elSaldoKas.innerText = formatRupiah(saldoKas);
    if (elSaldoTunai) elSaldoTunai.innerText = formatRupiah(saldoKasTunai);
    if (elSaldoTransfer) elSaldoTransfer.innerText = formatRupiah(saldoKasTransfer);

    // Perbarui Kartu 3: Pemasukan
    const elIncomeTitle = document.getElementById('dash-income-title');
    const elTrxToday = document.getElementById('dash-trx-today');
    const elIncomeMain = document.getElementById('dash-income-today');
    const elIncomeSubLeft = document.getElementById('dash-income-sub-left');
    const elExpenseToday = document.getElementById('dash-expense-today');

    if (dashboardPeriodFilter === 'ta') {
        if (elIncomeTitle) elIncomeTitle.innerText = `Total Pemasukan (T.A ${TA})`;
        if (elTrxToday) elTrxToday.innerText = `${trxTodayCount} Trx Hari Ini`;
        if (elIncomeMain) elIncomeMain.innerText = formatRupiah(kasMasuk);
        if (elIncomeSubLeft) {
            elIncomeSubLeft.innerHTML = `<i class="fas fa-clock mr-1"></i> Hari ini: <b class="text-white font-mono">${formatRupiah(incomeToday)}</b>`;
        }
        if (elExpenseToday) elExpenseToday.innerText = formatRupiah(kasKeluar);
    } else {
        if (elIncomeTitle) elIncomeTitle.innerText = 'Pemasukan Hari Ini';
        if (elTrxToday) elTrxToday.innerText = `${trxTodayCount} Transaksi`;
        if (elIncomeMain) elIncomeMain.innerText = formatRupiah(incomeToday);
        if (elIncomeSubLeft) {
            elIncomeSubLeft.innerHTML = `<i class="fas fa-clock mr-1"></i> Hari ini`;
        }
        if (elExpenseToday) elExpenseToday.innerText = formatRupiah(expenseToday);
    }

    // Kategori Penilaian Capaian Pembayaran
    let allCategories = [
        {
            nama: 'Syahriah',
            calcTarget: () => {
                return santriAktif * (appSettings.tarifSyahriah * 12);
            }
        }
    ];

    (appSettings.tagihanKustom || []).forEach(tk => {
        allCategories.push({
            nama: tk.nama,
            calcTarget: () => {
                let target = 0;
                activeSantriList.forEach(s => {
                    const info = (typeof getTarifSantriKustom === 'function') 
                        ? getTarifSantriKustom(s.id, tk.nama) 
                        : { isKhusus: false, bebas: false, nominal: tk.nominal };
                    if (!info.bebas) {
                        target += info.isKhusus ? info.nominal : tk.nominal;
                    }
                });
                return target;
            }
        });
    });

    allCategories.push({
        nama: 'Pembayaran Lain',
        calcTarget: () => {
            let target = 0;
            const plList = appSettings.pembayaranLainList || [];
            activeSantriList.forEach(s => {
                plList.forEach(pl => {
                    const info = (typeof getTarifSantriPL === 'function')
                        ? getTarifSantriPL(s.id, pl.nama)
                        : { isKhusus: false, bebas: false, nominal: pl.nominal };
                    if (!info.bebas) {
                        target += info.isKhusus ? info.nominal : (pl.nominal || 0);
                    }
                });
            });
            return target;
        }
    });

    const progressContainer = document.getElementById('dash-progress-container');
    const summaryContainer = document.getElementById('dash-summary-container');
    if (!progressContainer || !summaryContainer) return;

    progressContainer.innerHTML = '';
    summaryContainer.innerHTML = '';

    allCategories.forEach((cat, index) => {
        let totalMasuk = 0;
        let totalKeluar = 0;

        (transactions || []).filter(t => (dashboardPeriodFilter === 'all' || (t.ta || '') === TA) && t.kategori === cat.nama).forEach(t => {
            if (t.type === 'in') totalMasuk += t.amount;
            if (t.type === 'out') totalKeluar += t.amount;
        });

        const totalTarget = typeof cat.calcTarget === 'function' ? cat.calcTarget() : 0;
        const percentProgress = totalTarget > 0 ? Math.min(100, Math.round((totalMasuk / totalTarget) * 100)) : 0;
        const color = colorPalette[index % colorPalette.length] || colorPalette[0];
        const labelPeriode = (dashboardPeriodFilter === 'all') ? 'Semua Waktu' : 'T.A Ini';

        // Capaian Pembayaran Bar
        progressContainer.innerHTML += `
            <div>
                <div class="flex justify-between items-end mb-2.5">
                    <span class="text-sm font-bold text-gray-800">${cat.nama} <span class="text-xs font-normal text-gray-400 ml-1">(${labelPeriode})</span></span>
                    <span class="text-xl font-extrabold text-gray-800 font-mono">${percentProgress}%</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2.5 mb-2.5 overflow-hidden">
                    <div class="${color.bg} h-2.5 rounded-full progress-bar-fill transition-all duration-700" style="width: 0%" data-target="${percentProgress}%"></div>
                </div>
                <div class="flex justify-between text-xs text-gray-400 font-medium font-mono">
                    <span>Terkumpul: <b class="text-emerald-600">${formatRupiah(totalMasuk)}</b></span>
                    <span>Target: ${formatRupiah(totalTarget)}</span>
                </div>
            </div>
        `;

        // Ringkasan Card Keuangan
        const sisaKas = totalMasuk - totalKeluar;
        summaryContainer.innerHTML += `
            <div class="p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-2">
                        <div class="w-2.5 h-2.5 rounded-full ${color.bg}"></div>
                        <span class="font-bold text-gray-800">${cat.nama}</span>
                    </div>
                    <span class="px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-bold rounded font-mono">${percentProgress}%</span>
                </div>
                <div class="space-y-1.5 font-mono">
                    <div class="flex justify-between text-xs"><span class="text-gray-500 font-sans">Target Global</span><span class="font-bold text-gray-800">${formatRupiah(totalTarget)}</span></div>
                    <div class="flex justify-between text-xs"><span class="text-gray-500 font-sans">Pemasukan</span><span class="font-bold text-emerald-600">${formatRupiah(totalMasuk)}</span></div>
                    <div class="flex justify-between text-xs"><span class="text-gray-500 font-sans">Pengeluaran</span><span class="font-bold text-rose-600">${formatRupiah(totalKeluar)}</span></div>
                    <div class="pt-2 mt-2 border-t border-gray-100 flex justify-between text-sm"><span class="font-bold text-gray-800 font-sans">Sisa Kas</span><span class="font-extrabold text-[#5b52e5]">${formatRupiah(sisaKas)}</span></div>
                </div>
            </div>
        `;
    });

    // Animasi Progress Bar
    setTimeout(() => {
        document.querySelectorAll('.progress-bar-fill').forEach(el => {
            el.style.width = el.getAttribute('data-target');
        });
    }, 100);
}

// Expose ke global window
window.dashboardPeriodFilter = dashboardPeriodFilter;
window.setDashboardPeriodFilter = setDashboardPeriodFilter;
window.updateDashboard = updateDashboard;
