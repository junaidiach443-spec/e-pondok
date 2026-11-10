/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Backup & Restore Database Module
 * Pengelolaan pencadangan (export JSON), pemulihan data (import JSON),
 * statistik penyimpanan LocalStorage, serta keamanan data pesantren.
 * ==========================================================================
 */

let selectedRestoreData = null;
let selectedRestoreFileName = '';

// Render Utama Halaman Backup & Restore
function renderBackupRestorePage() {
    // 1. Hitung Statistik Real-Time Database Saat Ini
    const totalSantri = (santriData || []).length;
    const santriAktif = (santriData || []).filter(s => s.status === 'Aktif').length;
    const santriBoyong = (santriData || []).filter(s => s.status === 'Boyong').length;
    const totalTrx = (transactions || []).length;
    const totalPL = ((appSettings && appSettings.pembayaranLainList) || []).length;
    const totalKamar = ((appSettings && appSettings.kamarList) || []).length;
    const totalMutasi = (mutasiKamarList || []).length;

    // Hitung Estimasi Ukuran Penyimpanan LocalStorage
    let bytesUsed = 0;
    try {
        const keys = ['santriData', 'transactions', 'appSettings', 'mutasiKamarList'];
        keys.forEach(k => {
            const item = localStorage.getItem(k);
            if (item) bytesUsed += item.length * 2; // ~2 bytes per karakter UTF-16
        });
    } catch (e) {
        bytesUsed = 0;
    }
    const kbUsed = (bytesUsed / 1024).toFixed(1);

    // Update Counter di Tampilan
    const elSantri = document.getElementById('stat-backup-santri');
    if (elSantri) elSantri.innerText = `${totalSantri} Santri (${santriAktif} Aktif • ${santriBoyong} Boyong)`;

    const elTrx = document.getElementById('stat-backup-trx');
    if (elTrx) elTrx.innerText = `${totalTrx} Transaksi`;

    const elMaster = document.getElementById('stat-backup-master');
    if (elMaster) elMaster.innerText = `${totalPL} Pos PL • ${totalKamar} Kamar`;

    const elSize = document.getElementById('stat-backup-size');
    if (elSize) elSize.innerText = `${kbUsed} KB`;

    // 2. Info Tanggal Terakhir Dicadangkan
    const lastDate = localStorage.getItem('lastBackupDate');
    const elLastDate = document.getElementById('text-last-backup-date');
    if (elLastDate) {
        if (lastDate) {
            const d = new Date(lastDate);
            elLastDate.innerHTML = `<i class="fas fa-calendar-check text-blue-600 mr-1.5"></i> ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} pk ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
        } else {
            elLastDate.innerHTML = `<span class="text-amber-600 font-semibold"><i class="fas fa-exclamation-circle mr-1"></i> Belum pernah dicadangkan</span>`;
        }
    }

    // 3. Reset State Dropzone Restore jika belum ada file aktif
    if (!selectedRestoreData) {
        batalPilihFileRestore();
    }
}

// 1. Ekspor & Unduh File Cadangan Database (JSON)
function downloadBackupJSON() {
    try {
        const now = new Date();
        const TA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : (appSettings.tahunAjaranList?.find(t => t.aktif)?.ta || '-');

        // Struktur Standar Payload Cadangan e-Pondok
        const backupPayload = {
            appName: "e-Pondok Keuangan PP. AL-USYMUNI",
            version: "2.0",
            exportDate: now.toISOString(),
            exportDateFormatted: now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' }) + ' WIB',
            tahunAjaranAktif: TA,
            summary: {
                totalSantri: (santriData || []).length,
                santriAktif: (santriData || []).filter(s => s.status === 'Aktif').length,
                totalTransaksi: (transactions || []).length,
                totalKasMasuk: (transactions || []).filter(t => t.type === 'in').reduce((sum, t) => sum + (t.amount || 0), 0),
                totalKasKeluar: (transactions || []).filter(t => t.type === 'out').reduce((sum, t) => sum + (t.amount || 0), 0),
                totalMutasiKamar: (mutasiKamarList || []).length,
                totalLiburanSantri: (liburanSantriList || []).length,
                totalPulangSantri: (pulangSantriList || []).length
            },
            database: {
                santriData: santriData || [],
                transactions: transactions || [],
                appSettings: appSettings || {},
                mutasiKamarList: mutasiKamarList || [],
                liburanSantriList: liburanSantriList || [],
                pulangSantriList: pulangSantriList || []
            }
        };

        const jsonString = JSON.stringify(backupPayload, null, 2);
        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });

        // Format nama file: backup_epondok_alusymuni_YYYY-MM-DD_HHmm.json
        const dateStr = now.toLocaleDateString('en-CA');
        const hourStr = String(now.getHours()).padStart(2, '0');
        const minStr = String(now.getMinutes()).padStart(2, '0');
        const filename = `backup_epondok_alusymuni_${dateStr}_${hourStr}${minStr}.json`;

        // Trigger Download
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Catat Waktu Backup Terakhir
        localStorage.setItem('lastBackupDate', now.toISOString());
        renderBackupRestorePage();

        // Notifikasi Sukses
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Cadangan Database Berhasil Diunduh!',
                html: `
                    <div class="text-sm text-gray-600 space-y-2 mt-2 text-left bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div class="flex items-center gap-2 text-gray-800 font-bold">
                            <i class="fas fa-file-code text-blue-600 text-lg"></i>
                            <span class="font-mono text-xs break-all">${filename}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 text-xs">
                            <div><span class="text-gray-400">Santri:</span> <b>${backupPayload.summary.totalSantri} Data</b></div>
                            <div><span class="text-gray-400">Transaksi:</span> <b>${backupPayload.summary.totalTransaksi} Data</b></div>
                            <div><span class="text-gray-400">Tahun Ajaran:</span> <b>${TA}</b></div>
                            <div><span class="text-gray-400">Ukuran File:</span> <b>${(blob.size / 1024).toFixed(1)} KB</b></div>
                        </div>
                        <div class="pt-2 border-t border-gray-200 text-[11px] text-blue-800 font-medium">
                            <i class="fas fa-shield-alt mr-1"></i> Simpan file ini di flashdisk bendahara atau Google Drive pesantren sebagai arsip aman.
                        </div>
                    </div>
                `,
                confirmButtonText: '<i class="fas fa-check mr-1"></i> Selesai',
                confirmButtonColor: '#1d4ed8'
            });
        } else if (typeof showToast === 'function') {
            showToast("Cadangan database berhasil diunduh!");
        }
    } catch (err) {
        console.error("Gagal membuat cadangan database:", err);
        if (typeof showToast === 'function') showToast("Gagal membuat cadangan: " + err.message, "error");
    }
}

// 2. Pemilihan & Validasi File Cadangan untuk Dipulihkan
function handleFileSelectRestore(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
        if (typeof showToast === 'function') showToast("Format file harus .json!", "error");
        event.target.value = '';
        return;
    }

    selectedRestoreFileName = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const rawContent = e.target.result;
            const parsed = JSON.parse(rawContent);

            // Validasi apakah struktur file berisi database e-Pondok
            let dataSantri = null;
            let dataTrx = null;
            let dataSettings = null;
            let dataMutasi = null;
            let infoExportDate = '-';
            let infoApp = 'e-Pondok Cadangan';

            if (parsed.database) {
                // Format Standar Payload e-Pondok
                dataSantri = parsed.database.santriData;
                dataTrx = parsed.database.transactions;
                dataSettings = parsed.database.appSettings;
                dataMutasi = parsed.database.mutasiKamarList || [];
                infoExportDate = parsed.exportDateFormatted || parsed.exportDate || '-';
                infoApp = parsed.appName || infoApp;
            } else if (parsed.santriData || parsed.transactions || parsed.appSettings) {
                // Format direct dump
                dataSantri = parsed.santriData;
                dataTrx = parsed.transactions;
                dataSettings = parsed.appSettings;
                dataMutasi = parsed.mutasiKamarList || [];
            } else {
                throw new Error("Struktur isi file JSON tidak cocok dengan data e-Pondok.");
            }

            if (!Array.isArray(dataSantri) && !Array.isArray(dataTrx) && !dataSettings) {
                throw new Error("File tidak memuat data santri, transaksi, maupun pengaturan.");
            }

            selectedRestoreData = {
                santriData: Array.isArray(dataSantri) ? dataSantri : [],
                transactions: Array.isArray(dataTrx) ? dataTrx : [],
                appSettings: dataSettings || {},
                mutasiKamarList: Array.isArray(dataMutasi) ? dataMutasi : []
            };

            // Tampilkan Preview File yang Dipilih
            tampilkanPreviewFileRestore(file.name, file.size, infoExportDate, selectedRestoreData);

        } catch (err) {
            console.error("Gagal membaca file cadangan:", err);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'File Tidak Valid',
                    text: 'File yang dipilih bukan cadangan e-Pondok yang sah atau file rusak. ' + (err.message || ''),
                    confirmButtonColor: '#e11d48'
                });
            } else if (typeof showToast === 'function') {
                showToast("File JSON tidak valid!", "error");
            }
            batalPilihFileRestore();
        }
    };
    reader.readAsText(file);
}

// Tampilkan Rincian File yang Siap Dipulihkan
function tampilkanPreviewFileRestore(fileName, fileSize, exportDate, data) {
    const boxEmpty = document.getElementById('restore-box-empty');
    const boxPreview = document.getElementById('restore-box-preview');
    const btnExecute = document.getElementById('btn-eksekusi-restore');

    if (boxEmpty) boxEmpty.classList.add('hidden');
    if (boxPreview) boxPreview.classList.remove('hidden');

    const elName = document.getElementById('restore-preview-filename');
    if (elName) elName.innerText = fileName;

    const elSize = document.getElementById('restore-preview-filesize');
    if (elSize) elSize.innerText = `${(fileSize / 1024).toFixed(1)} KB`;

    const elDate = document.getElementById('restore-preview-date');
    if (elDate) elDate.innerText = exportDate || '-';

    const elSantri = document.getElementById('restore-preview-santri');
    if (elSantri) elSantri.innerText = `${data.santriData.length} Santri`;

    const elTrx = document.getElementById('restore-preview-trx');
    if (elTrx) elTrx.innerText = `${data.transactions.length} Transaksi`;

    if (btnExecute) {
        btnExecute.disabled = false;
        btnExecute.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// Batalkan Pilihan File Restore
function batalPilihFileRestore() {
    selectedRestoreData = null;
    selectedRestoreFileName = '';

    const input = document.getElementById('file-restore-json');
    if (input) input.value = '';

    const boxEmpty = document.getElementById('restore-box-empty');
    const boxPreview = document.getElementById('restore-box-preview');
    const btnExecute = document.getElementById('btn-eksekusi-restore');

    if (boxEmpty) boxEmpty.classList.remove('hidden');
    if (boxPreview) boxPreview.classList.add('hidden');

    if (btnExecute) {
        btnExecute.disabled = true;
        btnExecute.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// 3. Eksekusi Pemulihan Data (Restore ke LocalStorage & State Global)
function prosesRestoreData() {
    if (!selectedRestoreData) {
        if (typeof showToast === 'function') showToast("Pilih file cadangan JSON terlebih dahulu!", "warning");
        return;
    }

    const restorePayload = selectedRestoreData;
    const santriBaru = restorePayload.santriData.length;
    const trxBaru = restorePayload.transactions.length;

    const pesanKonfirmasi = `
        <div class="text-left text-sm text-gray-600 space-y-2 mt-2">
            <p class="text-rose-600 font-bold">
                <i class="fas fa-exclamation-triangle mr-1"></i> Tindakan ini akan menimpa seluruh data saat ini!
            </p>
            <div class="bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs space-y-1">
                <div>• Data Santri akan diganti: <b>${santriBaru} Data</b></div>
                <div>• Data Transaksi akan diganti: <b>${trxBaru} Data</b></div>
                <div>• Pengaturan tarif, kamar & tahun ajaran akan disesuaikan dengan file cadangan.</div>
            </div>
            <p class="text-xs text-gray-500 mt-2">
                Pastikan Anda telah membuat cadangan data saat ini jika masih memerlukannya. Lanjutkan pemulihan?
            </p>
        </div>
    `;

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Konfirmasi Pulihkan Data',
            html: pesanKonfirmasi,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#1d4ed8',
            cancelButtonColor: '#64748b',
            confirmButtonText: '<i class="fas fa-upload mr-1"></i> Ya, Pulihkan Database',
            cancelButtonText: 'Batalkan',
            focusCancel: true
        }).then((result) => {
            if (result.isConfirmed) {
                eksekusiSimpanRestore(restorePayload);
            }
        });
    } else {
        if (confirm("Yakin ingin memulihkan database? Data yang ada saat ini akan digantikan dengan isi file cadangan.")) {
            eksekusiSimpanRestore(restorePayload);
        }
    }
}

// Simpan Data Hasil Restore ke LocalStorage dan Refresh Seluruh Komponen
function eksekusiSimpanRestore(payload) {
    try {
        // 1. Perbarui State Global
        santriData = payload.santriData || [];
        transactions = payload.transactions || [];
        appSettings = payload.appSettings || {};
        mutasiKamarList = payload.mutasiKamarList || [];
        liburanSantriList = payload.liburanSantriList || [];
        pulangSantriList = payload.pulangSantriList || [];
        window.santriData = santriData;
        window.transactions = transactions;
        window.appSettings = appSettings;
        window.mutasiKamarList = mutasiKamarList;
        window.liburanSantriList = liburanSantriList;
        window.pulangSantriList = pulangSantriList;

        // 2. Simpan Permanen ke LocalStorage
        saveDataToStorage();

        // 3. Muat Ulang & Sinkronkan Seluruh Modul Aplikasi
        if (typeof updateFiltersAndDropdowns === 'function') updateFiltersAndDropdowns();
        if (typeof renderSemuaTabel === 'function') renderSemuaTabel();
        if (typeof renderSyahriah === 'function') renderSyahriah();
        if (typeof renderPengaturanTahunAjaran === 'function') renderPengaturanTahunAjaran();
        if (typeof renderPengaturanTagihan === 'function') renderPengaturanTagihan();
        if (typeof renderPengaturanPembayaranLain === 'function') renderPengaturanPembayaranLain();
        if (typeof renderPengaturanPJDivisi === 'function') renderPengaturanPJDivisi();
        if (typeof renderPengaturanKhususIkhtibar === 'function') renderPengaturanKhususIkhtibar();
        if (typeof renderPengaturanKamar === 'function') renderPengaturanKamar();
        if (typeof renderPengeluaranMenu === 'function') renderPengeluaranMenu();
        if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();
        if (typeof renderPembayaranLainPage === 'function') renderPembayaranLainPage();
        if (typeof renderLaporan === 'function') renderLaporan();
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof updateDateHeader === 'function') updateDateHeader();

        // 4. Perbarui Tampilan Halaman Backup & Restore
        batalPilihFileRestore();
        renderBackupRestorePage();

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Database Berhasil Dipulihkan!',
                html: `
                    <div class="text-sm text-gray-600 mt-2 space-y-1">
                        <p>Seluruh data santri, riwayat transaksi, dan pengaturan telah berhasil diperbarui sesuai file cadangan.</p>
                        <p class="text-xs text-blue-700 font-bold mt-2">Aplikasi siap digunakan kembali.</p>
                    </div>
                `,
                confirmButtonColor: '#1d4ed8',
                confirmButtonText: '<i class="fas fa-check mr-1"></i> Selesai'
            });
        } else if (typeof showToast === 'function') {
            showToast("Database berhasil dipulihkan!");
        }
    } catch (err) {
        console.error("Gagal mengeksekusi restore data:", err);
        if (typeof showToast === 'function') showToast("Gagal memulihkan database: " + err.message, "error");
    }
}

// 4. Bersihkan Transaksi Percobaan (Aman: Hanya Transaksi, Data Master Tetap Aman)
function bersihkanTransaksiPercobaan() {
    if (typeof Swal === 'undefined') return;

    Swal.fire({
        title: 'Kosongkan Transaksi Percobaan?',
        html: `
            <div class="text-left text-sm text-gray-600 space-y-2 mt-1">
                <p class="text-rose-600 font-bold">
                    <i class="fas fa-trash-alt mr-1"></i> Perhatian: Fitur ini menghapus seluruh riwayat transaksi keuangan (Syahriah, Ikhtibar, Pembayaran Lain, dan Pengeluaran).
                </p>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                    <p class="text-gray-700 font-semibold mb-1">Yang TETAP DISIMPAN (TIDAK DIHAPUS):</p>
                    <p>• Data Santri & Kamar</p>
                    <p>• Pengaturan Tahun Ajaran & Master Tarif</p>
                    <p>• Riwayat Perpindahan Kamar (Mutasi)</p>
                </div>
                <p class="text-xs text-gray-500">
                    Sangat berguna saat selesai melakukan uji coba dan hendak memulai pembukuan riil tahun ajaran baru.
                </p>
                <p class="text-xs font-bold text-gray-700 pt-1">
                    Ketik kata <span class="text-rose-600 font-mono font-extrabold">BERSIHKAN</span> di bawah ini untuk konfirmasi:
                </p>
            </div>
        `,
        input: 'text',
        inputPlaceholder: 'Ketik BERSIHKAN di sini...',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Bersihkan Transaksi',
        cancelButtonText: 'Batal',
        preConfirm: (value) => {
            if ((value || '').trim().toUpperCase() !== 'BERSIHKAN') {
                Swal.showValidationMessage('Kata konfirmasi salah! Ketik kata BERSIHKAN.');
                return false;
            }
            return true;
        }
    }).then((res) => {
        if (res.isConfirmed) {
            // Otomatis unduh cadangan dulu sebelum dibersihkan demi keamanan bendahara
            downloadBackupJSON();

            transactions = [];
            window.transactions = [];
            saveDataToStorage();

            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof renderSemuaTabel === 'function') renderSemuaTabel();
            if (typeof renderPembayaranLainPage === 'function') renderPembayaranLainPage();
            if (typeof renderSyahriah === 'function') renderSyahriah();
            if (typeof renderBulanSyahriah === 'function' && typeof currentDetailSantriId !== 'undefined' && currentDetailSantriId) renderBulanSyahriah();
            if (typeof renderLaporan === 'function') renderLaporan();
            if (typeof renderPengeluaran === 'function') renderPengeluaran();
            if (typeof renderPembayaranKustomList === 'function') renderPembayaranKustomList();
            renderBackupRestorePage();

            Swal.fire({
                icon: 'success',
                title: 'Transaksi Percobaan Dibersihkan!',
                text: 'Seluruh riwayat transaksi telah dikosongkan. File cadangan otomatis telah diunduh sebagai arsip keselamatan.',
                confirmButtonColor: '#1d4ed8'
            });
        }
    });
}

// Expose ke global window
window.renderBackupRestorePage = renderBackupRestorePage;
window.downloadBackupJSON = downloadBackupJSON;
window.handleFileSelectRestore = handleFileSelectRestore;
window.batalPilihFileRestore = batalPilihFileRestore;
window.prosesRestoreData = prosesRestoreData;
window.bersihkanTransaksiPercobaan = bersihkanTransaksiPercobaan;
