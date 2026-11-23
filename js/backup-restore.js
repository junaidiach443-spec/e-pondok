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

    // 3. Tampilkan Banner Cadangan Otomatis jika ada snapshot tersimpan
    renderAutoSnapshotBox();

    // 4. Reset State Dropzone Restore jika belum ada file aktif
    if (!selectedRestoreData) {
        batalPilihFileRestore();
    }
}

// Render Kotak Cadangan Otomatis Instan Sebelum Dikosongkan
function renderAutoSnapshotBox() {
    const boxAuto = document.getElementById('container-auto-snapshot-restore');
    if (!boxAuto) return;
    try {
        const raw = localStorage.getItem('epondok_auto_snapshot_before_clean');
        if (!raw) {
            boxAuto.classList.add('hidden');
            boxAuto.innerHTML = '';
            return;
        }
        const parsed = JSON.parse(raw);
        const dataTrx = (parsed.database && parsed.database.transactions) || [];
        if (!Array.isArray(dataTrx) || dataTrx.length === 0) {
            boxAuto.classList.add('hidden');
            boxAuto.innerHTML = '';
            return;
        }
        const totalKas = (parsed.summary && parsed.summary.totalKasMasuk) || dataTrx.filter(t => t.type === 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const waktuStr = parsed.exportDateFormatted || 'Baru saja';

        boxAuto.classList.remove('hidden');
        boxAuto.innerHTML = `
            <div class="p-4 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border-2 border-blue-300 rounded-xl space-y-2.5 shadow-sm">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                        <span class="font-bold text-blue-900 text-xs">Cadangan Otomatis Tersedia (Sebelum Dikosongkan)</span>
                    </div>
                    <span class="text-[10px] text-blue-700 font-mono">${waktuStr}</span>
                </div>
                <p class="text-[11px] text-gray-700 leading-relaxed">
                    Tersimpan <b>${dataTrx.length} Transaksi Keuangan</b> (Total Kas: <b>${formatRupiah(totalKas)}</b>) untuk <b>T.A ${parsed.tahunAjaranAktif || '-'}</b> tepat sebelum tombol "Bersihkan Transaksi" ditekan.
                </p>
                <button type="button" onclick="pulihkanDariAutoSnapshot()" class="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-rotate-left"></i> Pulihkan Otomatis Sekarang (Tanpa Perlu Cari File)
                </button>
            </div>
        `;
    } catch (e) {
        boxAuto.classList.add('hidden');
    }
}

// Pulihkan Data Langsung dari Snapshot Otomatis Terakhir
function pulihkanDariAutoSnapshot() {
    try {
        const raw = localStorage.getItem('epondok_auto_snapshot_before_clean');
        if (!raw) {
            if (typeof showToast === 'function') showToast("Tidak ada cadangan otomatis tersimpan.", "warning");
            return;
        }
        const parsed = JSON.parse(raw);
        const dataSantri = (parsed.database && parsed.database.santriData) || [];
        const dataTrx = (parsed.database && parsed.database.transactions) || [];
        const dataSettings = (parsed.database && parsed.database.appSettings) || {};
        const dataMutasi = (parsed.database && parsed.database.mutasiKamarList) || [];
        const dataLiburan = (parsed.database && parsed.database.liburanSantriList) || [];
        const dataPulang = (parsed.database && parsed.database.pulangSantriList) || [];

        const payload = {
            santriData: dataSantri,
            transactions: dataTrx,
            appSettings: dataSettings,
            mutasiKamarList: dataMutasi,
            liburanSantriList: dataLiburan,
            pulangSantriList: dataPulang,
            _detectedTa: parsed.tahunAjaranAktif || ''
        };

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Pulihkan Cadangan Otomatis?',
                html: `
                    <div class="text-left text-xs text-gray-600 space-y-2 mt-2">
                        <p class="font-bold text-gray-800">Transaksi sebelum dikosongkan akan dikembalikan secara instan:</p>
                        <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-blue-900 font-medium">
                            <div>• Riwayat Transaksi: <b>${dataTrx.length} Transaksi</b></div>
                            <div>• Total Kas Masuk: <b>${formatRupiah(parsed.summary?.totalKasMasuk || 0)}</b></div>
                            <div>• Tahun Ajaran: <b>${parsed.tahunAjaranAktif || '-'}</b></div>
                            <div>• Waktu Cadangan: <b>${parsed.exportDateFormatted || '-'}</b></div>
                        </div>
                        <p class="text-[11px] text-gray-500 pt-1">
                            Lanjutkan pemulihan instan sekarang?
                        </p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#1d4ed8',
                confirmButtonText: '<i class="fas fa-rotate-left mr-1"></i> Ya, Pulihkan Instan',
                cancelButtonText: 'Batal'
            }).then((res) => {
                if (res.isConfirmed) {
                    eksekusiSimpanRestore(payload);
                }
            });
        } else {
            eksekusiSimpanRestore(payload);
        }
    } catch (e) {
        console.error("Gagal pulihkan dari auto-snapshot:", e);
        if (typeof showToast === 'function') showToast("Gagal memulihkan snapshot: " + e.message, "error");
    }
}

// 1. Ekspor & Unduh File Cadangan Database (JSON)
function downloadBackupJSON(customFilename = null) {
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
        const defaultFilename = `backup_epondok_alusymuni_${dateStr}_${hourStr}${minStr}.json`;
        const filename = (typeof customFilename === 'string' && customFilename.trim()) ? customFilename.trim() : defaultFilename;

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
            let dataSantri = (parsed.database && parsed.database.santriData) || 
                             (parsed.data && parsed.data.santriData) || 
                             parsed.santriData || 
                             [];

            let dataTrx = (parsed.database && parsed.database.transactions) || 
                          (parsed.data && parsed.data.transactions) || 
                          parsed.transactions || 
                          [];

            let dataSettings = (parsed.database && parsed.database.appSettings) || 
                               (parsed.data && parsed.data.appSettings) || 
                               parsed.appSettings || 
                               {};

            let dataMutasi = (parsed.database && parsed.database.mutasiKamarList) || 
                             (parsed.data && parsed.data.mutasiKamarList) || 
                             parsed.mutasiKamarList || 
                             [];

            let dataLiburan = (parsed.database && parsed.database.liburanSantriList) || 
                              (parsed.data && parsed.data.liburanSantriList) || 
                              parsed.liburanSantriList || 
                              [];

            let dataPulang = (parsed.database && parsed.database.pulangSantriList) || 
                             (parsed.data && parsed.data.pulangSantriList) || 
                             parsed.pulangSantriList || 
                             [];

            let infoExportDate = parsed.exportDateFormatted || parsed.exportDate || '-';
            let infoApp = parsed.appName || 'e-Pondok Cadangan';

            if (!Array.isArray(dataSantri) && !Array.isArray(dataTrx) && (!dataSettings || Object.keys(dataSettings).length === 0)) {
                throw new Error("File tidak memuat data santri, transaksi, maupun pengaturan.");
            }

            selectedRestoreData = {
                santriData: Array.isArray(dataSantri) ? dataSantri : [],
                transactions: Array.isArray(dataTrx) ? dataTrx : [],
                appSettings: (dataSettings && typeof dataSettings === 'object') ? dataSettings : {},
                mutasiKamarList: Array.isArray(dataMutasi) ? dataMutasi : [],
                liburanSantriList: Array.isArray(dataLiburan) ? dataLiburan : [],
                pulangSantriList: Array.isArray(dataPulang) ? dataPulang : []
            };

            // Deteksi Tahun Ajaran dari Transaksi di File Cadangan
            const taCountMap = {};
            (selectedRestoreData.transactions || []).forEach(t => {
                if (t && t.ta) taCountMap[t.ta] = (taCountMap[t.ta] || 0) + 1;
            });
            let detectedTa = '';
            let maxCount = 0;
            for (const [taVal, count] of Object.entries(taCountMap)) {
                if (count > maxCount) {
                    maxCount = count;
                    detectedTa = taVal;
                }
            }
            if (!detectedTa) {
                detectedTa = parsed.tahunAjaranAktif || 
                             (selectedRestoreData.appSettings && selectedRestoreData.appSettings.tahunAjaranList?.find(t => t.aktif)?.ta) || 
                             '';
            }
            selectedRestoreData._detectedTa = detectedTa;

            // Hitung total kas masuk dari file cadangan untuk preview
            let totalKasFile = selectedRestoreData.transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            if (totalKasFile === 0 && parsed.summary && parsed.summary.totalKasMasuk) {
                totalKasFile = parsed.summary.totalKasMasuk;
            }

            // Tampilkan Preview File yang Dipilih
            tampilkanPreviewFileRestore(file.name, file.size, infoExportDate, selectedRestoreData, totalKasFile, detectedTa);

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
function tampilkanPreviewFileRestore(fileName, fileSize, exportDate, data, totalKas = 0, detectedTa = '') {
    const boxEmpty = document.getElementById('restore-box-empty');
    const boxPreview = document.getElementById('restore-box-preview');
    const btnExecute = document.getElementById('btn-eksekusi-restore');
    const alertBox = document.getElementById('restore-preview-alert');

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
    if (elTrx) {
        if (data.transactions.length > 0) {
            elTrx.innerHTML = `<span class="text-blue-700 font-bold">${data.transactions.length} Transaksi</span> <span class="text-[10px] text-gray-500 font-normal">(${formatRupiah(totalKas)})</span>`;
        } else {
            elTrx.innerHTML = `<span class="text-rose-600 font-extrabold">0 Transaksi (Kosong)</span>`;
        }
    }

    if (alertBox) {
        alertBox.classList.remove('hidden');
        if (data.transactions.length === 0) {
            alertBox.innerHTML = `
                <div class="bg-rose-50 border-2 border-rose-300 p-3.5 rounded-xl text-xs text-rose-800 space-y-1.5 shadow-sm">
                    <div class="font-extrabold flex items-center gap-2 text-rose-700 text-sm">
                        <i class="fas fa-exclamation-triangle text-base"></i> File Ini Memuat 0 Transaksi!
                    </div>
                    <p class="text-[11px] leading-relaxed text-gray-700">
                        File yang Anda pilih <b>tidak memiliki riwayat transaksi/tagihan</b>. Kemungkinan besar ini adalah file cadangan yang diunduh <i>setelah</i> transaksi dibersihkan/dihapus.
                    </p>
                    <div class="p-2.5 bg-white/90 rounded-lg border border-rose-200 text-[11px] text-rose-950 font-medium space-y-1">
                        <p>👉 <b>Solusi Pemulihan:</b></p>
                        <p>1. Klik tombol <b>"Batal"</b> di pojok kanan atas preview ini.</p>
                        <p>2. Cari file cadangan di folder <b>Downloads</b> Anda yang diunduh <b>sebelum</b> transaksi dibersihkan (file yang ukurannya lebih besar atau memiliki nama waktu yang lebih awal).</p>
                    </div>
                </div>
            `;
        } else {
            const taLabel = detectedTa ? `Tahun Ajaran <b>${detectedTa}</b>` : 'Tahun Ajaran Aktif';
            alertBox.innerHTML = `
                <div class="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl text-xs text-emerald-800 space-y-1 shadow-sm">
                    <div class="font-bold flex items-center gap-2 text-emerald-700 text-sm">
                        <i class="fas fa-check-circle text-base"></i> File Cadangan Lengkap Ditemukan!
                    </div>
                    <p class="text-[11px] leading-relaxed text-gray-700">
                        Memuat <b>${data.transactions.length} Transaksi</b> dengan Total Kas Masuk <b>${formatRupiah(totalKas)}</b> untuk ${taLabel}.
                    </p>
                    <p class="text-[10px] text-emerald-700 font-medium">
                        ✓ Sistem otomatis menyelaraskan Tahun Ajaran agar tagihan dan saldo dashboard langsung tampil normal.
                    </p>
                </div>
            `;
        }
    }

    if (btnExecute) {
        btnExecute.disabled = false;
        btnExecute.classList.remove('opacity-50', 'cursor-not-allowed');
        if (data.transactions.length === 0) {
            btnExecute.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i> Pulihkan File (Perhatian: 0 Transaksi)`;
            btnExecute.className = "w-full bg-amber-600 hover:bg-amber-700 text-white py-3 px-5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2";
        } else {
            btnExecute.innerHTML = `<i class="fas fa-upload mr-1"></i> Pulihkan Database Sekarang (${data.transactions.length} Transaksi)`;
            btnExecute.className = "w-full bg-blue-700 hover:bg-indigo-700 text-white py-3 px-5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2";
        }
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
    const alertBox = document.getElementById('restore-preview-alert');

    if (boxEmpty) boxEmpty.classList.remove('hidden');
    if (boxPreview) boxPreview.classList.add('hidden');
    if (alertBox) {
        alertBox.classList.add('hidden');
        alertBox.innerHTML = '';
    }

    if (btnExecute) {
        btnExecute.disabled = true;
        btnExecute.classList.add('opacity-50', 'cursor-not-allowed');
        btnExecute.innerHTML = `<i class="fas fa-upload mr-1"></i> Pulihkan Database Sekarang`;
        btnExecute.className = "w-full bg-blue-700 hover:bg-indigo-700 text-white py-3 px-5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 opacity-50 cursor-not-allowed";
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

    let warningKosong = '';
    if (trxBaru === 0) {
        warningKosong = `
            <div class="bg-rose-50 border border-rose-300 p-2.5 rounded-lg text-rose-800 text-xs font-bold mt-2">
                <i class="fas fa-exclamation-triangle mr-1"></i> PERINGATAN: File cadangan ini TIDAK memiliki riwayat transaksi (0 Transaksi). Seluruh tagihan dan kas akan bernilai Rp 0 jika file ini dipulihkan.
            </div>
        `;
    }

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
            ${warningKosong}
            <p class="text-xs text-gray-500 mt-2">
                Lanjutkan pemulihan database sekarang?
            </p>
        </div>
    `;

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: trxBaru === 0 ? 'Pulihkan File 0 Transaksi?' : 'Konfirmasi Pulihkan Data',
            html: pesanKonfirmasi,
            icon: trxBaru === 0 ? 'error' : 'warning',
            showCancelButton: true,
            confirmButtonColor: trxBaru === 0 ? '#d97706' : '#1d4ed8',
            cancelButtonColor: '#64748b',
            confirmButtonText: trxBaru === 0 ? '<i class="fas fa-upload mr-1"></i> Tetap Pulihkan File Kosong' : '<i class="fas fa-upload mr-1"></i> Ya, Pulihkan Database',
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
        window._isRestoringDatabase = true;
        const restoreTs = Date.now();

        // 1. Bersihkan seluruh marker penghapusan & timestamp reset lama dari LocalStorage
        // PENTING: Set epondok_restore_ts & epondok_last_trx_reset_ts ke restoreTs saat ini (BUKAN 0!)
        // agar Cloud Sync tidak menghapus kembali transaksi yang baru saja dipulihkan!
        localStorage.removeItem('epondok_deleted_trx_ids');
        localStorage.removeItem('epondok_last_trx_reset_ts');
        localStorage.setItem('epondok_deleted_trx_ids', '[]');
        localStorage.setItem('epondok_last_trx_reset_ts', String(restoreTs));
        localStorage.setItem('epondok_restore_ts', String(restoreTs));
        localStorage.setItem('epondok_trx_reset_version', '2026-11-10-clean-v15');

        // Batalkan timer auto-sync yang mungkin sedang menggantung
        if (typeof syncDebounceTimer !== 'undefined' && syncDebounceTimer) {
            clearTimeout(syncDebounceTimer);
            syncDebounceTimer = null;
        }

        // 2. Normalisasi & Validasi Pengaturan Sistem (appSettings)
        let restoredSettings = payload.appSettings || {};
        if (typeof restoredSettings !== 'object' || !restoredSettings) {
            restoredSettings = {};
        }

        // Hapus sisa marker reset lama di appSettings
        restoredSettings.deletedTrxIds = [];
        delete restoredSettings.trxResetTimestamp;
        delete restoredSettings._cloudTrxExtras;

        // Validasi tarif syahriah & tarif komponen bulanan agar tidak bernilai 0 / NaN
        if (!restoredSettings.tarifSyahriah || isNaN(Number(restoredSettings.tarifSyahriah)) || Number(restoredSettings.tarifSyahriah) <= 0) {
            if (restoredSettings.tarifKomponenBulanan && typeof restoredSettings.tarifKomponenBulanan === 'object') {
                const p = Number(restoredSettings.tarifKomponenBulanan.pondok) || 0;
                const m = Number(restoredSettings.tarifKomponenBulanan.madrasah) || 0;
                const k = Number(restoredSettings.tarifKomponenBulanan.makan) || 0;
                restoredSettings.tarifSyahriah = (p + m + k) > 0 ? (p + m + k) : 250000;
            } else {
                restoredSettings.tarifSyahriah = 250000;
            }
        }
        if (!restoredSettings.tarifKomponenBulanan || typeof restoredSettings.tarifKomponenBulanan !== 'object') {
            const tot = Number(restoredSettings.tarifSyahriah) || 250000;
            restoredSettings.tarifKomponenBulanan = {
                pondok: 100000,
                madrasah: 50000,
                makan: Math.max(0, tot - 150000)
            };
        }

        // Deteksi Tahun Ajaran Dominan dari transaksi
        const rawTrx = payload.transactions || [];
        const taCountMap = {};
        rawTrx.forEach(t => {
            if (t && t.ta) taCountMap[t.ta] = (taCountMap[t.ta] || 0) + 1;
        });
        let predominantTa = payload._detectedTa || '';
        let maxCount = 0;
        for (const [taVal, count] of Object.entries(taCountMap)) {
            if (count > maxCount) {
                maxCount = count;
                predominantTa = taVal;
            }
        }

        // Pastikan tahun ajaran aktif tersedia dan SELARAS dengan transaksi cadangan
        if (!Array.isArray(restoredSettings.tahunAjaranList) || restoredSettings.tahunAjaranList.length === 0) {
            restoredSettings.tahunAjaranList = [
                { ta: '1446/1447', aktif: false },
                { ta: '1447/1448', aktif: true }
            ];
        }

        if (predominantTa) {
            let foundTa = restoredSettings.tahunAjaranList.find(t => t.ta === predominantTa);
            if (!foundTa) {
                restoredSettings.tahunAjaranList.push({ ta: predominantTa, aktif: true });
            }
            restoredSettings.tahunAjaranList.forEach(t => {
                t.aktif = (t.ta === predominantTa);
            });
        } else {
            const hasActive = restoredSettings.tahunAjaranList.some(t => t.aktif);
            if (!hasActive) {
                restoredSettings.tahunAjaranList[restoredSettings.tahunAjaranList.length - 1].aktif = true;
            }
        }
        const activeTa = (restoredSettings.tahunAjaranList.find(t => t.aktif) || {}).ta || '1447/1448';

        // 3. Normalisasi Data Transaksi
        const cleanTransactions = rawTrx.map(t => {
            if (!t || typeof t !== 'object') return null;
            return {
                ...t,
                amount: Number(t.amount) || 0,
                ta: t.ta || activeTa,
                type: t.type || 'in',
                metode: t.metode || 'Tunai'
            };
        }).filter(Boolean);

        // 4. Perbarui State Global
        santriData = Array.isArray(payload.santriData) ? payload.santriData : [];
        transactions = cleanTransactions;
        appSettings = restoredSettings;
        mutasiKamarList = Array.isArray(payload.mutasiKamarList) ? payload.mutasiKamarList : [];
        liburanSantriList = Array.isArray(payload.liburanSantriList) ? payload.liburanSantriList : [];
        pulangSantriList = Array.isArray(payload.pulangSantriList) ? payload.pulangSantriList : [];

        window.santriData = santriData;
        window.transactions = transactions;
        window.appSettings = appSettings;
        window.mutasiKamarList = mutasiKamarList;
        window.liburanSantriList = liburanSantriList;
        window.pulangSantriList = pulangSantriList;

        // Reset filter dashboard ke T.A agar langsung sinkron dengan transaksi yang dipulihkan
        if (typeof dashboardPeriodFilter !== 'undefined') {
            dashboardPeriodFilter = 'ta';
        }

        // 5. Simpan Permanen ke LocalStorage
        saveDataToStorage();

        // Segera batalkan debounce auto-sync yang dipicu saveDataToStorage agar tidak mendahului force-push restore
        if (typeof syncDebounceTimer !== 'undefined' && syncDebounceTimer) {
            clearTimeout(syncDebounceTimer);
            syncDebounceTimer = null;
        }

        // 6. Muat Ulang & Sinkronkan Seluruh Modul Tampilan Aplikasi
        if (typeof updateDateHeader === 'function') updateDateHeader();
        if (typeof updateFiltersAndDropdowns === 'function') updateFiltersAndDropdowns();
        if (typeof renderSemuaTabel === 'function') renderSemuaTabel();
        if (typeof renderSyahriah === 'function') renderSyahriah();
        if (typeof renderPengaturanTahunAjaran === 'function') renderPengaturanTahunAjaran();
        if (typeof renderPengaturanTagihan === 'function') renderPengaturanTagihan();
        if (typeof renderPengaturanPembayaranLain === 'function') renderPengaturanPembayaranLain();
        if (typeof renderPengaturanPJDivisi === 'function') renderPengaturanPJDivisi();
        if (typeof renderPengaturanKhususIkhtibar === 'function') renderPengaturanKhususIkhtibar();
        if (typeof renderPengaturanKamar === 'function') renderPengaturanKamar();
        if (typeof initFormTarifBulananPengaturan === 'function') initFormTarifBulananPengaturan();
        if (typeof renderPengeluaranMenu === 'function') renderPengeluaranMenu();
        if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();
        if (typeof renderPembayaranLainPage === 'function') renderPembayaranLainPage();
        if (typeof renderPembayaranKustomList === 'function') renderPembayaranKustomList();
        if (typeof renderLaporan === 'function') renderLaporan();
        if (typeof renderLaporanRekap === 'function') renderLaporanRekap();
        if (typeof updateDashboard === 'function') updateDashboard();

        if (typeof currentDetailSantriId !== 'undefined' && currentDetailSantriId && typeof bukaDetailSyahriah === 'function') {
            bukaDetailSyahriah(currentDetailSantriId);
        }
        if (typeof window.currentKategoriLaporan !== 'undefined' && window.currentKategoriLaporan && typeof renderIsiLaporanDetail === 'function') {
            renderIsiLaporanDetail();
        }

        // 7. Unggah Force-Push ke Google Sheets agar database di Cloud ikut terpulihkan utuh
        if (typeof pushToCloud === 'function' && typeof cloudConfig !== 'undefined' && cloudConfig.webAppUrl) {
            pushToCloud({ silent: true, isRestorePush: true }).finally(() => {
                window._isRestoringDatabase = false;
            });
        } else {
            window._isRestoringDatabase = false;
        }

        // 8. Perbarui Tampilan Halaman Backup & Restore
        batalPilihFileRestore();
        renderBackupRestorePage();

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Database Berhasil Dipulihkan!',
                html: `
                    <div class="text-sm text-gray-600 mt-2 space-y-1 text-left bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <p class="text-gray-900 font-bold mb-2">Ringkasan Data yang Dipulihkan:</p>
                        <p>• Data Santri: <b>${santriData.length} Santri</b></p>
                        <p>• Riwayat Transaksi: <b>${transactions.length} Transaksi</b></p>
                        <p>• Tarif Syahriah: <b>${formatRupiah(appSettings.tarifSyahriah)}/bulan</b></p>
                        <p>• Tahun Ajaran Aktif: <b>${activeTa}</b></p>
                        <p class="text-xs text-blue-700 font-bold pt-2 border-t border-gray-200 mt-2">Semua tagihan, riwayat, dan saldo siap digunakan kembali.</p>
                    </div>
                `,
                confirmButtonColor: '#1d4ed8',
                confirmButtonText: '<i class="fas fa-check mr-1"></i> Selesai'
            });
        } else if (typeof showToast === 'function') {
            showToast("Database berhasil dipulihkan!");
        }
    } catch (err) {
        window._isRestoringDatabase = false;
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
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-CA');
            const hourStr = String(now.getHours()).padStart(2, '0');
            const minStr = String(now.getMinutes()).padStart(2, '0');
            const filenameKhusus = `backup_epondok_SEBELUM_BERSIHKAN_${dateStr}_${hourStr}${minStr}.json`;
            const TA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : (appSettings.tahunAjaranList?.find(t => t.aktif)?.ta || '-');

            // Simpan snapshot otomatis instan ke localStorage agar bisa dipulihkan 1-klik tanpa perlu cari file
            const autoSnapshotPayload = {
                appName: "e-Pondok Keuangan PP. AL-USYMUNI",
                version: "2.0",
                exportDate: now.toISOString(),
                exportDateFormatted: now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' }) + ' WIB',
                tahunAjaranAktif: TA,
                summary: {
                    totalSantri: (santriData || []).length,
                    totalTransaksi: (transactions || []).length,
                    totalKasMasuk: (transactions || []).filter(t => t.type === 'in').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
                },
                database: {
                    santriData: JSON.parse(JSON.stringify(santriData || [])),
                    transactions: JSON.parse(JSON.stringify(transactions || [])),
                    appSettings: JSON.parse(JSON.stringify(appSettings || {})),
                    mutasiKamarList: JSON.parse(JSON.stringify(mutasiKamarList || [])),
                    liburanSantriList: JSON.parse(JSON.stringify(liburanSantriList || [])),
                    pulangSantriList: JSON.parse(JSON.stringify(pulangSantriList || []))
                }
            };
            try {
                localStorage.setItem('epondok_auto_snapshot_before_clean', JSON.stringify(autoSnapshotPayload));
            } catch (snapErr) {
                console.warn("Gagal simpan auto-snapshot ke localStorage:", snapErr);
            }

            downloadBackupJSON(filenameKhusus);

            // Tandai seluruh ID transaksi lama sebagai terhapus agar tidak tertarik kembali dari perangkat/Cloud lain
            if (typeof trackDeletedTransactionId === 'function' && Array.isArray(transactions)) {
                transactions.forEach(t => { if (t && t.id) trackDeletedTransactionId(t.id); });
            }
            const resetTs = Date.now();
            if (typeof appSettings === 'object' && appSettings) {
                appSettings.trxResetTimestamp = resetTs;
                appSettings._cloudTrxExtras = {};
                window.appSettings = appSettings;
            }
            localStorage.setItem('epondok_last_trx_reset_ts', String(resetTs));

            transactions = [];
            window.transactions = [];
            saveDataToStorage();
            if (typeof triggerAutoSyncToCloud === 'function') triggerAutoSyncToCloud(true);

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
                html: `
                    <div class="text-sm text-gray-600 space-y-2 mt-2 text-left bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <p class="font-bold text-gray-800">Seluruh riwayat transaksi telah dikosongkan.</p>
                        <p class="text-xs text-gray-500">File cadangan otomatis sebelum dibersihkan telah tersimpan di folder Downloads:</p>
                        <div class="bg-blue-50 border border-blue-200 p-2.5 rounded-lg font-mono text-xs text-blue-800 font-bold break-all">
                            <i class="fas fa-file-code mr-1"></i> ${filenameKhusus}
                        </div>
                        <p class="text-[11px] text-gray-400">Gunakan file ini jika di masa depan Anda ingin memulihkan transaksi kembali.</p>
                    </div>
                `,
                confirmButtonColor: '#1d4ed8'
            });
        }
    });
}

// Kosongkan Seluruh Data Master Santri & Transaksi (Hapus Permanen untuk Mulai Baru)
function kosongkanDataMasterSantri() {
    if (typeof Swal === 'undefined') return;

    const totalSantriSaatIni = (window.santriData || santriData || []).length;
    const totalTrxSaatIni = (window.transactions || transactions || []).length;

    Swal.fire({
        title: 'Hapus Permanen Data Master Santri?',
        html: `
            <div class="text-left text-sm text-gray-600 space-y-2.5 mt-1">
                <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <p class="font-extrabold flex items-center gap-1.5 text-rose-700 text-sm">
                        <i class="fas fa-exclamation-triangle"></i> PERHATIAN: Hapus Permanen Tanpa Pengarsipan!
                    </p>
                    <p class="text-[11px] leading-relaxed text-gray-700">
                        Seluruh data santri (${totalSantriSaatIni} Santri), riwayat perizinan & mutasi, serta seluruh riwayat transaksi (${totalTrxSaatIni} Trx) akan <b>dihapus permanen</b> agar Anda dapat memasukkan data santri baru dari awal.
                    </p>
                </div>
                <div class="bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-xs space-y-1">
                    <p class="text-blue-900 font-bold mb-1">Yang TETAP DISIMPAN & AMAN (TIDAK DIHAPUS):</p>
                    <p class="text-blue-800">• Daftar Master Kamar (${((appSettings && appSettings.kamarList) || []).length} Kamar)</p>
                    <p class="text-blue-800">• Pengaturan Tahun Ajaran & Master Tarif Syahriah/Bulanan</p>
                    <p class="text-blue-800">• Pos Pembayaran Lain & Akun Login Admin</p>
                </div>
                <p class="text-[11px] text-gray-500">
                    <i class="fas fa-info-circle text-blue-600 mr-1"></i> Data dihapus langsung secara bersih. Anda dapat mengunduh cadangan/arsip nanti setelah data riil baru selesai dimasukkan.
                </p>
                <p class="text-xs font-bold text-gray-800 pt-1">
                    Ketik kata konfirmasi <span class="text-rose-600 font-mono font-extrabold">HAPUS MASTER</span> di bawah ini:
                </p>
            </div>
        `,
        input: 'text',
        inputPlaceholder: 'Ketik HAPUS MASTER di sini...',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus Permanen Sekarang',
        cancelButtonText: 'Batal',
        preConfirm: (value) => {
            if ((value || '').trim().toUpperCase() !== 'HAPUS MASTER') {
                Swal.showValidationMessage('Kata konfirmasi salah! Ketik kata HAPUS MASTER.');
                return false;
            }
            return true;
        }
    }).then((res) => {
        if (res.isConfirmed) {
            // Bersihkan snapshot cadangan lama agar benar-benar terhapus permanen
            try {
                localStorage.removeItem('epondok_auto_snapshot_before_clean');
            } catch (snapErr) {
                console.warn("Gagal hapus auto-snapshot dari localStorage:", snapErr);
            }

            // Tandai transaksi sebagai terhapus
            if (typeof trackDeletedTransactionId === 'function' && Array.isArray(transactions)) {
                transactions.forEach(t => { if (t && t.id) trackDeletedTransactionId(t.id); });
            }

            const resetTs = Date.now();
            localStorage.setItem('epondok_santri_reset_ts', String(resetTs));
            localStorage.setItem('epondok_last_trx_reset_ts', String(resetTs));

            if (typeof appSettings === 'object' && appSettings) {
                appSettings.santriResetTimestamp = resetTs;
                appSettings.trxResetTimestamp = resetTs;
                appSettings._cloudSantriExtras = {};
                appSettings._cloudTrxExtras = {};
                window.appSettings = appSettings;
            }

            // Kosongkan seluruh data master santri & transaksi
            santriData = [];
            window.santriData = [];
            transactions = [];
            window.transactions = [];
            mutasiKamarList = [];
            window.mutasiKamarList = [];
            liburanSantriList = [];
            window.liburanSantriList = [];
            pulangSantriList = [];
            window.pulangSantriList = [];

            saveDataToStorage();

            // Push ke Cloud agar data master di Google Sheets ikut dikosongkan (Force-push / isRestorePush: true)
            if (typeof pushToCloud === 'function' && typeof cloudConfig !== 'undefined' && cloudConfig.webAppUrl) {
                pushToCloud({ silent: true, isRestorePush: true });
            }

            // Segarkan seluruh tampilan
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof renderSemuaTabel === 'function') renderSemuaTabel();
            if (typeof renderSantri === 'function') renderSantri();
            if (typeof renderKamar === 'function') renderKamar();
            if (typeof renderPengaturanKamar === 'function') renderPengaturanKamar();
            if (typeof renderMutasiKamarSection === 'function') renderMutasiKamarSection();
            if (typeof renderPembayaranLainPage === 'function') renderPembayaranLainPage();
            if (typeof renderSyahriah === 'function') renderSyahriah();
            if (typeof renderBulanSyahriah === 'function' && typeof currentDetailSantriId !== 'undefined' && currentDetailSantriId) renderBulanSyahriah();
            if (typeof renderLaporan === 'function') renderLaporan();
            if (typeof renderPengeluaran === 'function') renderPengeluaran();
            if (typeof renderPembayaranKustomList === 'function') renderPembayaranKustomList();
            renderBackupRestorePage();

            Swal.fire({
                icon: 'success',
                title: 'Data Master Dihapus Permanen!',
                html: `
                    <div class="text-sm text-gray-600 space-y-2 mt-2 text-left bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <p class="font-bold text-gray-800">Aplikasi bersih dan siap untuk penginputan data santri baru.</p>
                        <p class="text-xs text-gray-600">
                            Seluruh data master santri dan riwayat transaksi telah dihapus permanen. Anda dapat langsung mulai memasukkan data santri baru melalui menu <b>Data Santri → Tambah Santri</b> atau melalui impor Excel/CSV.
                        </p>
                        <p class="text-[11px] text-gray-500">
                            Setelah data santri baru selesai dimasukkan, Anda dapat membuat cadangan/arsip kapan saja melalui tombol "Unduh Cadangan Lengkap (.JSON)" di atas.
                        </p>
                    </div>
                `,
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
window.pulihkanDariAutoSnapshot = pulihkanDariAutoSnapshot;
window.kosongkanDataMasterSantri = kosongkanDataMasterSantri;
