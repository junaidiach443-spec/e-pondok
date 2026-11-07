/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Utility Functions
 * Helper format rupiah, toast SweetAlert2, modal confirm, & header tanggal hijriah
 * ==========================================================================
 */

// Format Rupiah Indonesia
function formatRupiah(angka) {
    if (angka === null || angka === undefined || isNaN(angka)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

// Notifikasi Toast dengan SweetAlert2
function showToast(title, icon = 'success') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: icon,
            title: title,
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
        });
    } else {
        alert(title);
    }
}

// Dialog Konfirmasi dengan SweetAlert2
function showConfirm(title, text, confirmCallback, isDanger = true) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: isDanger ? '#e11d48' : '#5b52e5',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Ya, Lanjutkan!',
            cancelButtonText: 'Batal',
            customClass: { popup: 'rounded-2xl' }
        }).then((result) => {
            if (result.isConfirmed) confirmCallback();
        });
    } else {
        if (confirm(`${title}\n${text}`)) {
            confirmCallback();
        }
    }
}

// Update Tanggal Masehi & Hijriah di Header
function updateDateHeader() {
    try {
        const date = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        let dateString = date.toLocaleDateString("id-ID", options);
        
        if (Intl.DateTimeFormat) {
            const hijriFormatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic', options);
            dateString = hijriFormatter.format(date) + ' H';
        }
        const elTgl = document.getElementById("tanggal-hari-ini");
        if (elTgl) elTgl.innerText = dateString;
    } catch (e) {
        const elTgl = document.getElementById("tanggal-hari-ini");
        if (elTgl) elTgl.innerText = new Date().toLocaleDateString("id-ID");
    }
    
    const headerTa = document.getElementById("header-tahun-ajaran");
    if (headerTa && typeof getTahunAjaranAktif === 'function') {
        headerTa.innerText = getTahunAjaranAktif();
    }
    const headerTaMob = document.getElementById("header-tahun-ajaran-mobile");
    if (headerTaMob && typeof getTahunAjaranAktif === 'function') {
        headerTaMob.innerText = getTahunAjaranAktif();
    }
}

// Expose ke global window
window.formatRupiah = formatRupiah;
window.showToast = showToast;
window.showConfirm = showConfirm;
window.updateDateHeader = updateDateHeader;

// ==========================================================================
// Fitur Pagination Global (Default 20 Data per Halaman)
// ==========================================================================
const paginationState = {
    masterSantri: { page: 1, pageSize: 20 },
    boyongSantri: { page: 1, pageSize: 20 },
    santri: { page: 1, pageSize: 20 },
    mutasi: { page: 1, pageSize: 20 },
    syahriah: { page: 1, pageSize: 20 },
    kustom: { page: 1, pageSize: 20 },
    santriPL: { page: 1, pageSize: 20 },
    riwayatPL: { page: 1, pageSize: 20 },
    pengeluaran: { page: 1, pageSize: 20 },
    riwayat: { page: 1, pageSize: 20 },
    laporanDetail: { page: 1, pageSize: 20 },
    liburanSantri: { page: 1, pageSize: 20 },
    pulangSantri: { page: 1, pageSize: 20 }
};

function paginateArray(array, page = 1, pageSize = 20) {
    if (!Array.isArray(array)) {
        return { items: [], total: 0, totalPages: 1, currentPage: 1, pageSize, startIndex: 0, endIndex: 0 };
    }
    const total = array.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const items = array.slice(startIndex, endIndex);

    return {
        items,
        total,
        totalPages,
        currentPage,
        pageSize,
        startIndex,
        endIndex
    };
}

function renderPaginationControls({
    containerId,
    totalItems,
    currentPage = 1,
    pageSize = 20,
    onPageChange
}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalItems <= 0) {
        container.innerHTML = '';
        return;
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const fromIndex = totalItems > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0;
    const toIndex = Math.min(safeCurrentPage * pageSize, totalItems);

    let pages = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        if (safeCurrentPage <= 4) {
            pages = [1, 2, 3, 4, 5, '...', totalPages];
        } else if (safeCurrentPage >= totalPages - 3) {
            pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
        }
    }

    let buttonsHtml = '';
    // Tombol Previous
    buttonsHtml += `
        <button type="button" class="pagination-btn" ${safeCurrentPage <= 1 ? 'disabled' : ''} onclick="${onPageChange}(${safeCurrentPage - 1})" title="Halaman Sebelumnya">
            <i class="fa-solid fa-chevron-left text-[10px] mr-1"></i> Prev
        </button>
    `;

    pages.forEach(p => {
        if (p === '...') {
            buttonsHtml += `<span class="px-2 py-1 text-slate-400 text-xs select-none">...</span>`;
        } else {
            const isActive = p === safeCurrentPage;
            buttonsHtml += `
                <button type="button" class="pagination-btn ${isActive ? 'active' : ''}" onclick="${onPageChange}(${p})" title="Halaman ${p}">
                    ${p}
                </button>
            `;
        }
    });

    // Tombol Next
    buttonsHtml += `
        <button type="button" class="pagination-btn" ${safeCurrentPage >= totalPages ? 'disabled' : ''} onclick="${onPageChange}(${safeCurrentPage + 1})" title="Halaman Selanjutnya">
            Next <i class="fa-solid fa-chevron-right text-[10px] ml-1"></i>
        </button>
    `;

    container.innerHTML = `
        <div class="pagination-container">
            <div class="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                <span>Menampilkan <strong class="font-bold text-slate-700 font-mono">${fromIndex}</strong> - <strong class="font-bold text-slate-700 font-mono">${toIndex}</strong> dari <strong class="font-bold text-slate-700 font-mono">${totalItems}</strong> data</span>
                ${totalPages > 1 ? `<span class="text-slate-400 font-normal">(Hal ${safeCurrentPage} dari ${totalPages})</span>` : ''}
            </div>
            ${totalPages > 1 ? `<div class="flex items-center gap-1.5 flex-wrap justify-center">${buttonsHtml}</div>` : ''}
        </div>
    `;
}

// Navigasi Page Handlers Global
function gantiHalamanMasterSantri(p) {
    paginationState.masterSantri.page = p;
    if (typeof renderMasterSantriTable === 'function') renderMasterSantriTable();
}

function gantiHalamanBoyongSantri(p) {
    paginationState.boyongSantri.page = p;
    if (typeof renderBoyongSantriTable === 'function') renderBoyongSantriTable();
}

function gantiHalamanSantri(p) {
    paginationState.santri.page = p;
    if (typeof renderSemuaTabel === 'function') renderSemuaTabel();
}

function gantiHalamanMutasi(p) {
    paginationState.mutasi.page = p;
    if (typeof renderTableRiwayatMutasi === 'function') renderTableRiwayatMutasi();
}

function gantiHalamanSyahriah(p) {
    paginationState.syahriah.page = p;
    if (typeof renderSyahriah === 'function') renderSyahriah();
}

function gantiHalamanKustom(p) {
    paginationState.kustom.page = p;
    if (typeof renderPembayaranKustomList === 'function') renderPembayaranKustomList();
}

function gantiHalamanSantriPL(p) {
    paginationState.santriPL.page = p;
    if (typeof renderSantriPLTable === 'function') renderSantriPLTable();
}

function gantiHalamanRiwayatPL(p) {
    paginationState.riwayatPL.page = p;
    if (typeof renderRiwayatPLTable === 'function') renderRiwayatPLTable();
}

function gantiHalamanPengeluaran(p) {
    paginationState.pengeluaran.page = p;
    if (typeof renderPengeluaran === 'function') renderPengeluaran();
}

function gantiHalamanRiwayat(p) {
    paginationState.riwayat.page = p;
    if (typeof renderLaporan === 'function') renderLaporan();
}

function gantiHalamanLaporanDetail(p) {
    paginationState.laporanDetail.page = p;
    if (typeof renderIsiLaporanDetail === 'function') renderIsiLaporanDetail();
}

window.paginationState = paginationState;
window.paginateArray = paginateArray;
window.renderPaginationControls = renderPaginationControls;
window.gantiHalamanMasterSantri = gantiHalamanMasterSantri;
window.gantiHalamanBoyongSantri = gantiHalamanBoyongSantri;
window.gantiHalamanSantri = gantiHalamanSantri;
window.gantiHalamanMutasi = gantiHalamanMutasi;
window.gantiHalamanSyahriah = gantiHalamanSyahriah;
window.gantiHalamanKustom = gantiHalamanKustom;
window.gantiHalamanSantriPL = gantiHalamanSantriPL;
window.gantiHalamanRiwayatPL = gantiHalamanRiwayatPL;
window.gantiHalamanPengeluaran = gantiHalamanPengeluaran;
window.gantiHalamanRiwayat = gantiHalamanRiwayat;
window.gantiHalamanLaporanDetail = gantiHalamanLaporanDetail;
