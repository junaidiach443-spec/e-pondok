/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Struk & Cetak Thermal 58mm Module
 * Generator struk thermal monospace, preview struk, cetak browser & RawBT
 * ==========================================================================
 */

// Buka Modal Cetak untuk Kartu Syahriah
function cetakKartuSyahriah() {
    window.currentCetakType = 'Syahriah';
    const inputBendahara = document.getElementById('input-nama-bendahara');
    if (inputBendahara) inputBendahara.value = 'Bendahara';
    
    updatePreviewStruk();
    bukaModal('modal-cetak');
}

// Buka Modal Cetak untuk Tagihan Kustom
function cetakKartuKustom() {
    window.currentCetakType = 'Kustom';
    const inputBendahara = document.getElementById('input-nama-bendahara');
    if (inputBendahara) inputBendahara.value = 'Bendahara';
    
    updatePreviewStruk();
    bukaModal('modal-cetak');
}

// Generate Format Teks Struk Monospace 58mm untuk Syahriah
function generateStrukText(namaBendahara) {
    const s = santriData.find(x => x.id === currentDetailSantriId);
    if (!s) return "";

    const TA = getTahunAjaranAktif();
    let trx = transactions.filter(t => t.santriId === s.id && t.kategori === 'Syahriah' && t.ta === TA && t.type === 'in');
    
    let text = "  Pondok Pesantren Al-Usymuni\n";
    text += "     Tarate Pandian Sumenep\n";
    text += "--------------------------------\n\n";
    text += "REKAP PEMBAYARAN SYAHRIAH\n\n";
    text += `Nama : ${s.nama}\n`;
    text += `Kamar: ${s.kamar || '-'}\n`;
    text += "--------------------------------\n";
    text += "Bulan   Jumlah Status  Tanggal\n";
    
    let totalBayar = 0;
    bulanIslam.forEach(bulan => {
        const trxBulan = trx.find(t => t.desc.includes(bulan));
        let blnShort = bulan.substring(0, 6).padEnd(6, ' ');
        
        let cleanNom = formatRupiah(appSettings.tarifSyahriah).replace(/Rp\s?/g, '').trim(); 
        let padNom = cleanNom.substring(0, 6).padEnd(6, ' ');
        
        if (trxBulan) {
            totalBayar += (appSettings.tarifSyahriah || 0);
            let tglObj = new Date(trxBulan.date);
            let tgl = tglObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }); 
            text += `${blnShort} ${padNom} Lunas  ${tgl}\n`;
        } else {
            text += `${blnShort} ${padNom} Blm    -\n`;
        }
    });
    
    const totalTagihan = appSettings.tarifSyahriah * 12;
    const sisa = totalTagihan - totalBayar;
    
    let padTotal = formatRupiah(totalTagihan).replace(/Rp\s?/g, '').trim();
    let padDibayar = formatRupiah(totalBayar).replace(/Rp\s?/g, '').trim();
    let padSisa = formatRupiah(sisa).replace(/Rp\s?/g, '').trim();

    text += "--------------------------------\n\n";
    text += `Total:           Rp ${padTotal.padStart(7, ' ')}\n`;
    text += `Dibayar:         Rp ${padDibayar.padStart(7, ' ')}\n`;
    text += `Sisa:            Rp ${padSisa.padStart(7, ' ')}\n`;
    text += "--------------------------------\n\n";
    
    const masehi = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const elHijri = document.getElementById("tanggal-hari-ini");
    const hijri = elHijri ? elHijri.innerText.replace(' H', '') : "";
    
    text += `${masehi} / ${hijri} H\n\n\n`;
    text += `(..............................)\n`;
    
    let namaBtn = namaBendahara || 'Bendahara';
    let padLeft = Math.floor((32 - namaBtn.length) / 2);
    if (padLeft < 0) padLeft = 0;
    text += `${' '.repeat(padLeft)}${namaBtn}\n`;
    
    text += "\n\n- - - - - - - - - - - - - - - - \n";
    return text;
}

// Generate Format Teks Struk Monospace 58mm untuk Tagihan Kustom
function generateStrukKustomText(namaBendahara) {
    const s = santriData.find(x => x.id === currentDetailSantriId);
    if (!s) return "";

    const TA = getTahunAjaranAktif();
    let trx = transactions.filter(t => t.santriId === s.id && t.kategori === window.currentTagihanKustom && t.ta === TA && t.type === 'in');
    
    let infoTarif = (typeof getTarifSantriKustom === 'function') 
        ? getTarifSantriKustom(s.id, window.currentTagihanKustom) 
        : { isKhusus: false, nominal: 0, bebas: false };
    let tk = appSettings.tagihanKustom.find(k => k.nama === window.currentTagihanKustom);
    let totalTagihan = infoTarif.isKhusus ? infoTarif.nominal : (tk ? tk.nominal : 0);
    let totalBayar = trx.reduce((sum, t) => sum + t.amount, 0);
    let sisa = infoTarif.bebas ? 0 : Math.max(0, totalTagihan - totalBayar);

    let text = "  Pondok Pesantren Al-Usymuni\n";
    text += "     Tarate Pandian Sumenep\n";
    text += "--------------------------------\n\n";
    text += `PEMBAYARAN ${window.currentTagihanKustom.toUpperCase()}\n\n`;
    text += `Nama : ${s.nama}\n`;
    text += `Kamar: ${s.kamar || '-'}\n`;
    text += "--------------------------------\n";
    text += "Tanggal       Nominal\n";
    
    if (trx.length === 0) {
        text += "- Belum ada pembayaran -\n";
    } else {
        trx.forEach(t => {
            let tglObj = new Date(t.date);
            let tgl = tglObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }); 
            let nom = formatRupiah(t.amount).replace(/Rp\s?/g, '').trim().padStart(10, ' ');
            text += `${tgl.padEnd(13, ' ')} ${nom}\n`;
        });
    }

    let padTotal = formatRupiah(totalTagihan).replace(/Rp\s?/g, '').trim();
    let padDibayar = formatRupiah(totalBayar).replace(/Rp\s?/g, '').trim();
    let padSisa = formatRupiah(sisa).replace(/Rp\s?/g, '').trim();

    text += "--------------------------------\n\n";
    text += `Total:           Rp ${padTotal.padStart(7, ' ')}\n`;
    text += `Dibayar:         Rp ${padDibayar.padStart(7, ' ')}\n`;
    text += `Sisa:            Rp ${padSisa.padStart(7, ' ')}\n`;
    text += "--------------------------------\n\n";
    
    const masehi = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const elHijri = document.getElementById("tanggal-hari-ini");
    const hijri = elHijri ? elHijri.innerText.replace(' H', '') : "";
    
    text += `${masehi} / ${hijri} H\n\n\n`;
    text += `(..............................)\n`;
    
    let namaBtn = namaBendahara || 'Bendahara';
    let padLeft = Math.floor((32 - namaBtn.length) / 2);
    if (padLeft < 0) padLeft = 0;
    text += `${' '.repeat(padLeft)}${namaBtn}\n`;
    
    text += "\n\n- - - - - - - - - - - - - - - - \n";
    return text;
}

// Buka Modal Cetak untuk Pembayaran Lain
function cetakStrukPembayaranLain(trxId) {
    window.currentCetakType = 'PembayaranLain';
    window.currentPembayaranLainTrxId = trxId;
    const inputBendahara = document.getElementById('input-nama-bendahara');
    if (inputBendahara) inputBendahara.value = 'Bendahara';
    
    updatePreviewStruk();
    bukaModal('modal-cetak');
}

// Generate Format Teks Struk Monospace 58mm untuk Pembayaran Lain
function generateStrukPembayaranLainText(namaBendahara) {
    const trx = transactions.find(t => t.id === window.currentPembayaranLainTrxId) || 
                transactions.filter(t => t.kategori === 'Pembayaran Lain' && t.type === 'in').slice(-1)[0];
    if (!trx) return "Data transaksi tidak ditemukan";

    let namaPembayar = "-";
    let detailPembayar = "";
    if (trx.santriId) {
        const s = santriData.find(x => x.id === trx.santriId);
        if (s) {
            namaPembayar = s.nama;
            detailPembayar = `NIS     : ${s.nis}\nKamar   : ${s.kamar || '-'}\n`;
        }
    } else {
        namaPembayar = trx.pembayar || 'Umum';
        detailPembayar = `Tipe    : Umum / Wali Santri\n`;
    }

    const jenisNama = trx.subJenis || trx.kategori;
    const tglObj = new Date(trx.date);
    const tglStr = tglObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nomStr = formatRupiah(trx.amount).replace(/Rp\s?/g, '').trim();

    let text = "  Pondok Pesantren Al-Usymuni\n";
    text += "     Tarate Pandian Sumenep\n";
    text += "--------------------------------\n\n";
    text += "BUKTI PEMBAYARAN\n";
    text += `No. Trx : ${trx.id}\n`;
    text += `Tanggal : ${tglStr}\n`;
    text += "--------------------------------\n";
    text += `Jenis   : ${jenisNama}\n`;
    text += `Nama    : ${namaPembayar}\n`;
    text += detailPembayar;
    if (trx.desc && trx.desc !== jenisNama) {
        text += `Ket     : ${trx.desc}\n`;
    }
    text += "--------------------------------\n";
    text += `Metode  : ${trx.metode || 'Tunai'}\n`;
    text += `Jumlah  : Rp ${nomStr.padStart(14, ' ')}\n`;
    text += "Status  : LUNAS\n";
    text += "--------------------------------\n\n";

    const masehi = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const elHijri = document.getElementById("tanggal-hari-ini");
    const hijri = elHijri ? elHijri.innerText.replace(' H', '') : "";

    text += `${masehi} / ${hijri} H\n\n\n`;
    text += `(..............................)\n`;

    let namaBtn = namaBendahara || 'Bendahara';
    let padLeft = Math.floor((32 - namaBtn.length) / 2);
    if (padLeft < 0) padLeft = 0;
    text += `${' '.repeat(padLeft)}${namaBtn}\n`;

    text += "\n\n- - - - - - - - - - - - - - - - \n";
    return text;
}

// Update Konten Teks Preview Struk di Layar
function updatePreviewStruk() {
    const elInput = document.getElementById('input-nama-bendahara');
    const nama = elInput ? elInput.value : 'Bendahara';
    
    if (window.currentCetakType === 'Syahriah') {
        window.currentReceiptText = generateStrukText(nama);
    } else if (window.currentCetakType === 'PembayaranLain') {
        window.currentReceiptText = generateStrukPembayaranLainText(nama);
    } else {
        window.currentReceiptText = generateStrukKustomText(nama);
    }
    
    const preContent = document.getElementById('struk-preview-content');
    if (preContent) preContent.innerText = window.currentReceiptText;
}

// Eksekusi Cetak via Pop-up Window Browser / Driver Printer Laptop
function prosesCetakBrowser() {
    const printWindow = window.open('', '_blank');
    const judul = window.currentCetakType === 'PembayaranLain' 
        ? (window.currentPembayaranLainTrxId || 'Struk')
        : currentDetailSantriId;
        
    printWindow.document.write(`
        <html><head><title>Struk - ${judul}</title>
        <style>
            body { font-family: 'Courier New', Courier, monospace; width: 58mm; margin: 0; padding: 10px; font-size: 11px; color: #000; line-height: 1.2; white-space: pre-wrap; word-wrap: break-word;}
            @media print { 
                body { width: 58mm; margin: 0; padding: 0; }
                @page { margin: 0; size: 58mm auto; }
            }
        </style>
        </head><body><pre style="margin:0;font-family:inherit;font-size:inherit;">${window.currentReceiptText}</pre>
        <script>window.onload = function() { window.print(); window.close(); }<\/script>
        </body></html>
    `);
    printWindow.document.close();
}

// Eksekusi Cetak Langsung ke Printer Bluetooth Android via RawBT Intent
function prosesCetakRawBT() {
    const textEncoded = encodeURI(window.currentReceiptText);
    window.location.href = `intent:${textEncoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}

// Format Pesan Struk Khusus WhatsApp (Menggunakan emoji dan formatting WA)
function formatStrukForWhatsApp(type, santri, namaBendahara) {
    const TA = typeof getTahunAjaranAktif === 'function' ? getTahunAjaranAktif() : '';
    const masehi = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const elHijri = document.getElementById("tanggal-hari-ini");
    const hijri = elHijri ? elHijri.innerText.replace(' H', '') : "";
    const bendahara = namaBendahara || 'Bendahara';

    if (type === 'PembayaranLain') {
        const trx = (transactions || []).find(t => t.id === window.currentPembayaranLainTrxId) || 
                    (transactions || []).filter(t => t.kategori === 'Pembayaran Lain' && t.type === 'in').slice(-1)[0];
        if (!trx) return window.currentReceiptText || "";

        let namaP = santri ? santri.nama : (trx.pembayar || 'Umum');
        let detailP = santri ? `*NIS:* ${santri.nis}\n*Kamar:* ${santri.kamar || '-'}` : `*Tipe:* Umum / Wali`;

        return `*PONDOK PESANTREN AL-USYMUNI*\n` +
               `_Tarate Pandian Sumenep_\n` +
               `━━━━━━━━━━━━━━━━━━━━\n` +
               `📜 *BUKTI PEMBAYARAN RESMI*\n` +
               `━━━━━━━━━━━━━━━━━━━━\n` +
               `*No. Transaksi:* \`${trx.id}\`\n` +
               `*Tanggal:* ${new Date(trx.date).toLocaleDateString('id-ID')}\n` +
               `*Nama Pembayar:* *${namaP}*\n` +
               `${detailP}\n` +
               `*Jenis:* *${trx.subJenis || trx.kategori}*\n` +
               (trx.desc && trx.desc !== trx.subJenis ? `*Keterangan:* ${trx.desc}\n` : '') +
               `*Metode:* ${trx.metode || 'Tunai'}\n` +
               `*Jumlah:* *${formatRupiah(trx.amount)}*\n` +
               `*Status:* ✅ *LUNAS*\n` +
               `━━━━━━━━━━━━━━━━━━━━\n` +
               `🗓️ _${masehi} / ${hijri} H_\n` +
               `Tertanda,\n` +
               `*${bendahara}*\n` +
               `_(Pengurus Keuangan PP. AL-USYMUNI)_\n\n` +
               `_Jazakumullahu Khairan Katsiran._`;
    }

    if (type === 'Syahriah') {
        if (!santri) return window.currentReceiptText || "";
        let trx = (transactions || []).filter(t => t.santriId === santri.id && t.kategori === 'Syahriah' && t.ta === TA && t.type === 'in');
        let totalBayar = trx.reduce((sum, t) => sum + t.amount, 0);
        let totalTagihan = appSettings.tarifSyahriah * 12;
        let sisa = Math.max(0, totalTagihan - totalBayar);

        let rincianBulan = "";
        (bulanIslam || []).forEach(b => {
            const trxB = trx.find(t => (t.desc || '').includes(b));
            if (trxB) {
                rincianBulan += `• ${b}: ✅ *Lunas* (${new Date(trxB.date).toLocaleDateString('id-ID')})\n`;
            } else {
                rincianBulan += `• ${b}: ⏳ _Belum Dibayar_\n`;
            }
        });

        return `*PONDOK PESANTREN AL-USYMUNI*\n` +
               `_Tarate Pandian Sumenep_\n` +
               `━━━━━━━━━━━━━━━━━━━━\n` +
               `📋 *REKAP PEMBAYARAN SYAHRIAH*\n` +
               `━━━━━━━━━━━━━━━━━━━━\n` +
               `*Nama Santri:* *${santri.nama}*\n` +
               `*NIS:* ${santri.nis}\n` +
               `*Kamar:* ${santri.kamar || '-'}\n` +
               `*Tahun Ajaran:* ${TA}\n` +
               `━━━━━━━━━━━━━━━━━━━━\n` +
               `*STATUS 12 BULAN HIJRIAH:*\n` +
               `${rincianBulan}` +
               `━━━━━━━━━━━━━━━━━━━━\n` +
               `*Total Tagihan (1 Thn):* ${formatRupiah(totalTagihan)}\n` +
               `*Sudah Dibayar:* *${formatRupiah(totalBayar)}*\n` +
               `*Sisa Tanggungan:* *${formatRupiah(sisa)}*\n` +
               `━━━━━━━━━━━━━━━━━━━━\n` +
               `🗓️ _${masehi} / ${hijri} H_\n` +
               `Tertanda,\n` +
               `*${bendahara}*\n` +
               `_(Pengurus Keuangan PP. AL-USYMUNI)_\n\n` +
               `_Jazakumullahu Khairan Katsiran._`;
    }

    // Tagihan Kustom
    if (!santri) return window.currentReceiptText || "";
    const tagihanNama = window.currentTagihanKustom || 'Tagihan';
    let trx = (transactions || []).filter(t => t.santriId === santri.id && t.kategori === tagihanNama && t.ta === TA && t.type === 'in');
    let infoTarif = (typeof getTarifSantriKustom === 'function') 
        ? getTarifSantriKustom(santri.id, tagihanNama) 
        : { isKhusus: false, nominal: 0, bebas: false };
    let tk = (appSettings.tagihanKustom || []).find(k => k.nama === tagihanNama);
    let totalTagihan = infoTarif.isKhusus ? infoTarif.nominal : (tk ? tk.nominal : 0);
    let totalBayar = trx.reduce((sum, t) => sum + t.amount, 0);
    let sisa = infoTarif.bebas ? 0 : Math.max(0, totalTagihan - totalBayar);

    let listTrx = "";
    if (trx.length === 0) {
        listTrx = "_Belum ada pembayaran recorded._\n";
    } else {
        trx.forEach((t, i) => {
            listTrx += `${i + 1}. ${new Date(t.date).toLocaleDateString('id-ID')} : *${formatRupiah(t.amount)}* (${t.metode || 'Tunai'})\n`;
        });
    }

    return `*PONDOK PESANTREN AL-USYMUNI*\n` +
           `_Tarate Pandian Sumenep_\n` +
           `━━━━━━━━━━━━━━━━━━━━\n` +
           `💳 *BUKTI PEMBAYARAN ${tagihanNama.toUpperCase()}*\n` +
           `━━━━━━━━━━━━━━━━━━━━\n` +
           `*Nama Santri:* *${santri.nama}*\n` +
           `*NIS:* ${santri.nis}\n` +
           `*Kamar:* ${santri.kamar || '-'}\n` +
           `*Tahun Ajaran:* ${TA}\n` +
           `━━━━━━━━━━━━━━━━━━━━\n` +
           `*RIWAYAT PEMBAYARAN:*\n` +
           `${listTrx}` +
           `━━━━━━━━━━━━━━━━━━━━\n` +
           `*Total Tagihan:* ${formatRupiah(totalTagihan)}\n` +
           `*Sudah Dibayar:* *${formatRupiah(totalBayar)}*\n` +
           `*Sisa Tanggungan:* *${formatRupiah(sisa)}*\n` +
           `*Status:* ${sisa <= 0 ? '✅ *LUNAS*' : '⏳ *BELUM LUNAS*'}\n` +
           `━━━━━━━━━━━━━━━━━━━━\n` +
           `🗓️ _${masehi} / ${hijri} H_\n` +
           `Tertanda,\n` +
           `*${bendahara}*\n` +
           `_(Pengurus Keuangan PP. AL-USYMUNI)_\n\n` +
           `_Jazakumullahu Khairan Katsiran._`;
}

// Kirim Struk Pembayaran via WhatsApp
function kirimStrukWhatsApp() {
    let santri = null;
    let targetPhone = '';

    if (window.currentCetakType === 'PembayaranLain') {
        const trx = (transactions || []).find(t => t.id === window.currentPembayaranLainTrxId) || 
                    (transactions || []).filter(t => t.kategori === 'Pembayaran Lain' && t.type === 'in').slice(-1)[0];
        if (trx && trx.santriId) {
            santri = (santriData || []).find(x => x.id === trx.santriId);
        }
    } else {
        santri = (santriData || []).find(x => x.id === currentDetailSantriId);
    }

    if (santri && santri.noHpWali) {
        targetPhone = santri.noHpWali.replace(/\D/g, '').replace(/^0/, '62');
    }

    const bendaharaInput = document.getElementById('input-nama-bendahara');
    const namaBendahara = bendaharaInput ? bendaharaInput.value : 'Bendahara';

    const pesanWA = formatStrukForWhatsApp(window.currentCetakType, santri, namaBendahara);

    if (targetPhone) {
        window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(pesanWA)}`, '_blank');
        if (typeof showToast === 'function') {
            showToast("Membuka WhatsApp ke nomor wali santri...");
        }
    } else {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Kirim Struk via WhatsApp',
                html: `
                    <div class="text-left text-xs text-gray-600 mb-3 space-y-1">
                        <p>${santri ? `Santri: <b class="text-gray-900">${santri.nama}</b>` : 'Wali / Pembayar umum'}</p>
                        <p class="text-gray-500">Nomor WhatsApp wali belum tersimpan. Masukkan nomor WhatsApp di bawah ini:</p>
                    </div>
                `,
                input: 'tel',
                inputPlaceholder: 'Contoh: 08123456789 atau 628123456789',
                inputValue: santri && santri.noHpWali ? santri.noHpWali : '',
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
                    const phone = res.value.replace(/\D/g, '').replace(/^0/, '62');
                    if (santri && !santri.noHpWali) {
                        santri.noHpWali = res.value.trim();
                        saveDataToStorage();
                        if (typeof renderSemuaTabel === 'function') renderSemuaTabel();
                    }
                    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(pesanWA)}`, '_blank');
                    if (typeof showToast === 'function') {
                        showToast("Membuka WhatsApp...");
                    }
                }
            });
        } else {
            const noInput = prompt("Masukkan nomor WhatsApp wali (contoh: 08123456789):");
            if (noInput) {
                const phone = noInput.replace(/\D/g, '').replace(/^0/, '62');
                window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(pesanWA)}`, '_blank');
            }
        }
    }
}

// Expose ke global window
window.cetakKartuSyahriah = cetakKartuSyahriah;
window.cetakKartuKustom = cetakKartuKustom;
window.cetakStrukPembayaranLain = cetakStrukPembayaranLain;
window.generateStrukText = generateStrukText;
window.generateStrukKustomText = generateStrukKustomText;
window.generateStrukPembayaranLainText = generateStrukPembayaranLainText;
window.updatePreviewStruk = updatePreviewStruk;
window.prosesCetakBrowser = prosesCetakBrowser;
window.prosesCetakRawBT = prosesCetakRawBT;
window.kirimStrukWhatsApp = kirimStrukWhatsApp;
window.formatStrukForWhatsApp = formatStrukForWhatsApp;
