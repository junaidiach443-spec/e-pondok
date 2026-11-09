/**
 * =======================================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Google Apps Script Cloud Backend & Multi-Device Sync
 * =======================================================================================
 * 
 * Skrip ini dipasang di Google Apps Script yang terhubung ke Google Spreadsheet.
 * Berfungsi sebagai REST API Web App untuk sinkronisasi data e-Pondok secara real-time
 * di semua perangkat (Laptop Pengurus, HP Android/iOS, Komputer Kantor, Tablet).
 *
 * FITUR UTAMA:
 * 1. Otomatis membuat & memformat lembar (Tabs): Santri, Transaksi, Pengaturan, MutasiKamar, _METADATA_
 * 2. Mendukung GET (ping, getAllData / pull) dan POST (saveAllData / push, partial updates)
 * 3. Format respons JSON standar dengan penanganan CORS lengkap
 * 4. Kompatibel dengan semua browser & perangkat tanpa CORS blocking
 * =======================================================================================
 */

// Konfigurasi Nama Tab / Lembar Kerja di Google Spreadsheet
var SHEET_NAMES = {
  SANTRI: 'Santri',
  TRANSAKSI: 'Transaksi',
  PENGATURAN: 'Pengaturan',
  MUTASI: 'MutasiKamar',
  METADATA: '_METADATA_'
};

/**
 * Handle HTTP GET Request
 * Contoh parameter URL:
 * ?action=ping
 * ?action=getAllData
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = (params && params.action) ? params.action : 'getAllData';

    // 1. Cek Koneksi / Ping
    if (action === 'ping') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      return createJsonResponse({
        status: 'success',
        message: 'Koneksi Google Apps Script e-Pondok Berhasil!',
        appName: 'e-Pondok PP. AL-USYMUNI Cloud Sync',
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        sheets: ss.getSheets().map(function(s) { return s.getName(); }),
        timestamp: new Date().toISOString()
      });
    }

    // 2. Ambil Seluruh Data Database (Pull Data)
    if (action === 'getAllData' || action === 'pull') {
      var fullData = readAllDataFromSpreadsheet();
      return createJsonResponse({
        status: 'success',
        message: 'Data berhasil diambil dari Google Sheets',
        data: fullData,
        timestamp: new Date().toISOString()
      });
    }

    return createJsonResponse({
      status: 'error',
      message: 'Aksi GET tidak dikenali: ' + action
    });

  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: 'Gagal memproses permintaan GET: ' + err.toString(),
      stack: err.stack
    });
  }
}

/**
 * Handle HTTP POST Request
 * Menerima payload JSON untuk menyimpan data dari aplikasi ke Google Sheets
 */
function doPost(e) {
  try {
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Fallback jika dikirim via URL encoded
        if (e.parameter && e.parameter.data) {
          requestData = JSON.parse(e.parameter.data);
        } else {
          throw new Error('Format data POST tidak valid (harus JSON): ' + parseErr.toString());
        }
      }
    } else if (e && e.parameter && e.parameter.data) {
      requestData = JSON.parse(e.parameter.data);
    } else {
      throw new Error('Tidak ada data yang dikirim dalam POST body.');
    }

    var action = requestData.action || (e.parameter ? e.parameter.action : 'saveAllData');

    // 1. Simpan Seluruh Database (Push / Sync)
    if (action === 'saveAllData' || action === 'sync' || action === 'push') {
      var payload = requestData.data || requestData;
      var syncResult = writeAllDataToSpreadsheet(payload);

      return createJsonResponse({
        status: 'success',
        message: 'Data berhasil disinkronkan ke Google Spreadsheet!',
        summary: syncResult,
        timestamp: new Date().toISOString()
      });
    }

    // 2. Ping via POST
    if (action === 'ping') {
      return createJsonResponse({
        status: 'success',
        message: 'Ping POST berhasil!',
        timestamp: new Date().toISOString()
      });
    }

    // 3. Ambil Seluruh Data via POST (Fallback)
    if (action === 'getAllData' || action === 'pull') {
      var fullData = readAllDataFromSpreadsheet();
      return createJsonResponse({
        status: 'success',
        message: 'Data berhasil diambil dari Google Sheets',
        data: fullData,
        timestamp: new Date().toISOString()
      });
    }



    return createJsonResponse({
      status: 'error',
      message: 'Aksi POST tidak dikenali: ' + action
    });

  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: 'Gagal memproses permintaan POST: ' + err.toString(),
      stack: err.stack
    });
  }
}

/**
 * Membaca semua data dari Spreadsheet dan menyusunnya sesuai struktur e-Pondok
 */
function readAllDataFromSpreadsheet() {
  ensureAllSheetsExist();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Baca Data Santri
  var santriSheet = ss.getSheetByName(SHEET_NAMES.SANTRI);
  var santriRows = getRowsAsObjects(santriSheet);
  var santriData = santriRows.map(function(r) {
    return {
      id: String(r.id || ''),
      nis: String(r.nis || ''),
      nama: String(r.nama || ''),
      kamar: String(r.kamar || ''),
      status: String(r.status || 'Aktif'),
      noHpWali: String(r.noHpWali || ''),
      namaWali: String(r.namaWali || ''),
      asalKota: String(r.asalKota || ''),
      tahunMasuk: String(r.tahunMasuk || ''),
      kamarTerakhir: String(r.kamarTerakhir || ''),
      tanggalBoyong: String(r.tanggalBoyong || ''),
      tahunBoyong: String(r.tahunBoyong || ''),
      alasanBoyong: String(r.alasanBoyong || '')
    };
  });

  // 2. Baca Data Transaksi
  var trxSheet = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
  var trxRows = getRowsAsObjects(trxSheet);
  var transactions = trxRows.map(function(r) {
    var t = {
      id: String(r.id || ''),
      ta: String(r.ta || ''),
      kategori: String(r.kategori || ''),
      type: String(r.type || 'in'),
      amount: Number(r.amount) || 0,
      desc: String(r.desc || ''),
      date: String(r.date || '')
    };
    if (r.santriId) t.santriId = String(r.santriId);
    if (r.subJenis) t.subJenis = String(r.subJenis);
    if (r.metode) t.metode = String(r.metode);
    if (r.pembayar) t.pembayar = String(r.pembayar);
    if (r.pj) t.pj = String(r.pj);
    if (r.divisi) t.divisi = String(r.divisi);
    if (r.bulan) {
      try {
        t.bulan = JSON.parse(r.bulan);
      } catch (e) {
        t.bulan = [r.bulan];
      }
    }
    return t;
  });

  // 3. Baca Data Mutasi Kamar
  var mutasiSheet = ss.getSheetByName(SHEET_NAMES.MUTASI);
  var mutasiRows = getRowsAsObjects(mutasiSheet);
  var mutasiKamarList = mutasiRows.map(function(r) {
    return {
      id: String(r.id || ''),
      santriId: String(r.santriId || ''),
      dariKamar: String(r.dariKamar || ''),
      keKamar: String(r.keKamar || ''),
      tanggal: String(r.tanggal || ''),
      alasan: String(r.alasan || ''),
      dicatatOleh: String(r.dicatatOleh || 'Pengurus')
    };
  });

  // 4. Baca Pengaturan Sistem & Riwayat Hapus
  var settingsSheet = ss.getSheetByName(SHEET_NAMES.PENGATURAN);
  var appSettings = null;
  var deletedTrxIds = [];
  if (settingsSheet) {
    var data = settingsSheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === 'FULL_SETTINGS_JSON' && data[i][1]) {
        try {
          appSettings = JSON.parse(data[i][1]);
        } catch (e) {
          appSettings = null;
        }
      }
      if (data[i][0] === 'DELETED_TRX_IDS' && data[i][1]) {
        try {
          deletedTrxIds = JSON.parse(data[i][1]);
        } catch (e) {
          deletedTrxIds = [];
        }
      }
    }
  }

  if (appSettings && Array.isArray(appSettings.deletedTrxIds) && deletedTrxIds.length === 0) {
    deletedTrxIds = appSettings.deletedTrxIds;
  }

  // Filter keluar transaksi yang telah dihapus
  if (deletedTrxIds && deletedTrxIds.length > 0) {
    var delSet = {};
    deletedTrxIds.forEach(function(id) { delSet[id] = true; });
    transactions = transactions.filter(function(t) { return !delSet[t.id]; });
  }

  // Jika belum ada pengaturan, beri null agar client menggunakan default atau fallback
  return {
    santriData: santriData,
    transactions: transactions,
    appSettings: appSettings,
    mutasiKamarList: mutasiKamarList,
    deletedTrxIds: deletedTrxIds
  };
}

/**
 * Menulis seluruh data dari client ke Google Spreadsheet
 */
function writeAllDataToSpreadsheet(payload) {
  ensureAllSheetsExist();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var santriData = payload.santriData || [];
  var transactions = payload.transactions || [];
  var appSettings = payload.appSettings || {};
  var mutasiKamarList = payload.mutasiKamarList || [];

  // 1. Tulis Sheet Santri
  var santriSheet = ss.getSheetByName(SHEET_NAMES.SANTRI);
  santriSheet.clearContents();
  var santriHeaders = ['id', 'nis', 'nama', 'kamar', 'status', 'noHpWali', 'namaWali', 'asalKota', 'tahunMasuk', 'kamarTerakhir', 'tanggalBoyong', 'tahunBoyong', 'alasanBoyong', 'updatedAt'];
  var santriRows = [santriHeaders];
  var nowStr = new Date().toISOString();

  santriData.forEach(function(s) {
    santriRows.push([
      String(s.id || ''),
      String(s.nis || ''),
      String(s.nama || ''),
      String(s.kamar || ''),
      String(s.status || 'Aktif'),
      String(s.noHpWali || ''),
      String(s.namaWali || ''),
      String(s.asalKota || ''),
      String(s.tahunMasuk || ''),
      String(s.kamarTerakhir || ''),
      String(s.tanggalBoyong || ''),
      String(s.tahunBoyong || ''),
      String(s.alasanBoyong || ''),
      nowStr
    ]);
  });
  if (santriRows.length > 0) {
    santriSheet.getRange(1, 1, santriRows.length, santriHeaders.length).setValues(santriRows);
    formatHeaderRow(santriSheet, '#059669'); // Hijau Emerald
  }

  // 2. Tulis Sheet Transaksi
  var trxSheet = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
  trxSheet.clearContents();
  var trxHeaders = ['id', 'santriId', 'ta', 'kategori', 'subJenis', 'type', 'amount', 'metode', 'pembayar', 'desc', 'date', 'pj', 'divisi', 'bulan', 'updatedAt'];
  var trxRows = [trxHeaders];

  // Kumpulkan set ID yang dihapus
  var delIds = Array.isArray(payload.deletedTrxIds) ? payload.deletedTrxIds : [];
  if (appSettings && Array.isArray(appSettings.deletedTrxIds)) {
    delIds = delIds.concat(appSettings.deletedTrxIds);
  }
  var delIdSet = {};
  delIds.forEach(function(id) { if (id) delIdSet[id] = true; });

  transactions.forEach(function(t) {
    if (!t || !t.id || delIdSet[t.id]) return; // Lewati transaksi yang dihapus
    trxRows.push([
      String(t.id || ''),
      String(t.santriId || ''),
      String(t.ta || ''),
      String(t.kategori || ''),
      String(t.subJenis || ''),
      String(t.type || 'in'),
      Number(t.amount) || 0,
      String(t.metode || 'Tunai'),
      String(t.pembayar || ''),
      String(t.desc || ''),
      String(t.date || ''),
      String(t.pj || ''),
      String(t.divisi || ''),
      t.bulan ? JSON.stringify(t.bulan) : '',
      nowStr
    ]);
  });
  if (trxRows.length > 0) {
    trxSheet.getRange(1, 1, trxRows.length, trxHeaders.length).setValues(trxRows);
    formatHeaderRow(trxSheet, '#059669'); // Emerald
  }

  // 3. Tulis Sheet Mutasi Kamar
  var mutasiSheet = ss.getSheetByName(SHEET_NAMES.MUTASI);
  mutasiSheet.clearContents();
  var mutasiHeaders = ['id', 'santriId', 'dariKamar', 'keKamar', 'tanggal', 'alasan', 'dicatatOleh', 'updatedAt'];
  var mutasiRows = [mutasiHeaders];

  mutasiKamarList.forEach(function(m) {
    mutasiRows.push([
      String(m.id || ''),
      String(m.santriId || ''),
      String(m.dariKamar || ''),
      String(m.keKamar || ''),
      String(m.tanggal || ''),
      String(m.alasan || ''),
      String(m.dicatatOleh || ''),
      nowStr
    ]);
  });
  if (mutasiRows.length > 0) {
    mutasiSheet.getRange(1, 1, mutasiRows.length, mutasiHeaders.length).setValues(mutasiRows);
    formatHeaderRow(mutasiSheet, '#0f766e'); // Teal
  }

  // 4. Tulis Sheet Pengaturan
  var settingsSheet = ss.getSheetByName(SHEET_NAMES.PENGATURAN);
  settingsSheet.clearContents();
  var settingsRows = [
    ['Key', 'Value', 'Keterangan'],
    ['FULL_SETTINGS_JSON', JSON.stringify(appSettings), 'Cadangan utuh format JSON Pengaturan Sistem'],
    ['DELETED_TRX_IDS', JSON.stringify(delIds), 'Daftar ID transaksi yang dihapus'],
    ['TarifSyahriah', appSettings.tarifSyahriah || 0, 'Nominal Syahriah Bulanan'],
    ['TahunAjaranAktif', (function() {
      var active = (appSettings.tahunAjaranList || []).find(function(t) { return t.aktif; });
      return active ? active.ta : '-';
    })(), 'Tahun Ajaran Aktif Saat Ini'],
    ['TotalPosPembayaranLain', (appSettings.pembayaranLainList || []).length, 'Jumlah Pos Pembayaran Lain'],
    ['TotalMasterKamar', (appSettings.kamarList || []).length, 'Jumlah Master Kamar'],
    ['LastSyncTime', nowStr, 'Waktu Sinkronisasi Terakhir']
  ];
  settingsSheet.getRange(1, 1, settingsRows.length, 3).setValues(settingsRows);
  formatHeaderRow(settingsSheet, '#d97706'); // Amber

  // 5. Update Metadata Sync
  var metaSheet = ss.getSheetByName(SHEET_NAMES.METADATA);
  metaSheet.clearContents();
  var metaRows = [
    ['Property', 'Value'],
    ['Sistem', 'e-Pondok Keuangan PP. AL-USYMUNI'],
    ['Versi Skrip', '2.0.0 Cloud Sync'],
    ['Terakhir Diperbarui', nowStr],
    ['Total Santri', santriData.length],
    ['Total Transaksi', transactions.length],
    ['Total Mutasi Kamar', mutasiKamarList.length]
  ];
  metaSheet.getRange(1, 1, metaRows.length, 2).setValues(metaRows);
  formatHeaderRow(metaSheet, '#475569'); // Slate

  return {
    totalSantri: santriData.length,
    totalTransaksi: transactions.length,
    totalMutasi: mutasiKamarList.length,
    timestamp: nowStr
  };
}

/**
 * Pastikan semua tab/sheet wajib ada di Spreadsheet
 */
function ensureAllSheetsExist() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsToCreate = [
    SHEET_NAMES.SANTRI,
    SHEET_NAMES.TRANSAKSI,
    SHEET_NAMES.MUTASI,
    SHEET_NAMES.PENGATURAN,
    SHEET_NAMES.METADATA
  ];

  sheetsToCreate.forEach(function(name) {
    var s = ss.getSheetByName(name);
    if (!s) {
      ss.insertSheet(name);
    }
  });

  // Hapus 'Sheet1' default jika kosong dan ada sheet lain
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      if (defaultSheet.getLastRow() === 0) {
        ss.deleteSheet(defaultSheet);
      }
    } catch (e) {}
  }
}

/**
 * Helper untuk membaca sheet menjadi daftar Object berdasarkan Header di baris 1
 */
function getRowsAsObjects(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    var hasContent = false;
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      obj[headers[j]] = val;
      if (val !== '' && val !== null && val !== undefined) {
        hasContent = true;
      }
    }
    if (hasContent && (obj.id || obj.nis || obj.nama || obj.desc)) {
      results.push(obj);
    }
  }
  return results;
}

/**
 * Format baris header agar terlihat rapi dan elegan di Google Sheets
 */
function formatHeaderRow(sheet, hexColor) {
  try {
    var lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      var headerRange = sheet.getRange(1, 1, 1, lastCol);
      headerRange.setBackground(hexColor || '#059669');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setFontFamily('Arial');
      sheet.setFrozenRows(1);
    }
  } catch (e) {}
}

/**
 * Format Response JSON dengan Header CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Fungsi pembantu manual untuk pengujian langsung di editor Apps Script
 */
function testInitDatabase() {
  ensureAllSheetsExist();
  Logger.log('Semua sheet berhasil diinisialisasi!');
}
