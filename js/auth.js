/**
 * ==========================================================================
 * e-Pondok Keuangan PP. AL-USYMUNI - Auth & Keamanan Pengurus Module
 * Layar kunci login, autentikasi pengurus/bendahara, sesi login, & ganti kredensial
 * ==========================================================================
 */

// Inisialisasi Sistem Keamanan & Kunci Pengurus
function initAuth() {
    if (!appSettings) return;

    // Pastikan data kredensial default tersedia dan perbarui jika masih akun bawaan lama (admin / 123)
    if (!appSettings.adminAuth || (appSettings.adminAuth.username === 'admin' && appSettings.adminAuth.password === '123')) {
        appSettings.adminAuth = {
            username: 'admin@ppu',
            password: '@juna123',
            nama: (appSettings.adminAuth && appSettings.adminAuth.nama) || 'Administrator',
            role: (appSettings.adminAuth && appSettings.adminAuth.role) || 'Bendahara Utama'
        };
        saveDataToStorage();
    }

    // Perbarui profil pengurus di header aplikasi
    updateHeaderProfile();

    // Periksa status login sesi saat ini
    const isAuth = sessionStorage.getItem('epondok_auth') === 'logged_in';
    const lockScreen = document.getElementById('screen-auth-lock');

    if (lockScreen) {
        if (!isAuth) {
            lockScreen.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
            const inputUser = document.getElementById('auth-username');
            if (inputUser) setTimeout(() => inputUser.focus(), 200);
        } else {
            lockScreen.classList.add('hidden', 'opacity-0', 'pointer-events-none');
        }
    }
}

// Perbarui Tampilan Profil di Header Utama
function updateHeaderProfile() {
    const auth = (appSettings && appSettings.adminAuth) || {
        username: 'admin',
        nama: 'Administrator',
        role: 'Bendahara Utama'
    };

    const elNama = document.getElementById('header-admin-nama');
    if (elNama) elNama.innerText = auth.nama || 'Administrator';

    const elRole = document.getElementById('header-admin-role');
    if (elRole) elRole.innerText = auth.role || 'Bendahara Utama';

    const elAvatar = document.getElementById('header-admin-avatar');
    if (elAvatar) {
        const initial = (auth.nama || 'A').trim().charAt(0).toUpperCase();
        elAvatar.innerText = initial;
    }
}

// Eksekusi Login / Buka Kunci Aplikasi
function submitLoginAuth(event) {
    if (event) event.preventDefault();

    const inputUser = document.getElementById('auth-username');
    const inputPass = document.getElementById('auth-password');
    const errAlert = document.getElementById('auth-error-alert');
    const errMsg = document.getElementById('auth-error-msg');
    const cardLock = document.getElementById('auth-card-box');

    const username = inputUser ? inputUser.value.trim() : '';
    const password = inputPass ? inputPass.value : '';

    const currentAuth = (appSettings && appSettings.adminAuth) || {
        username: 'admin@ppu',
        password: '@juna123'
    };

    const validUser = (currentAuth.username || 'admin@ppu').toLowerCase();
    const validPass = currentAuth.password || '@juna123';

    if (username.toLowerCase() === validUser && password === validPass) {
        // Login Berhasil!
        sessionStorage.setItem('epondok_auth', 'logged_in');

        if (errAlert) errAlert.classList.add('hidden');

        const lockScreen = document.getElementById('screen-auth-lock');
        if (lockScreen) {
            lockScreen.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                lockScreen.classList.add('hidden');
            }, 300);
        }

        if (inputPass) inputPass.value = '';
        updateHeaderProfile();

        if (typeof showToast === 'function') {
            showToast(`Akses dibuka. Selamat datang, ${currentAuth.nama || 'Pengurus'}!`);
        }
    } else {
        // Login Gagal!
        if (errAlert && errMsg) {
            errMsg.innerText = "Username atau Password salah! Periksa kembali.";
            errAlert.classList.remove('hidden');
        }

        if (cardLock) {
            cardLock.classList.add('animate-shake');
            setTimeout(() => cardLock.classList.remove('animate-shake'), 500);
        }

        if (inputPass) {
            inputPass.value = '';
            inputPass.focus();
        }
    }
}

// Kunci Aplikasi (Logout Sesi Pengurus)
function kunciAplikasi() {
    sessionStorage.removeItem('epondok_auth');

    const lockScreen = document.getElementById('screen-auth-lock');
    if (lockScreen) {
        lockScreen.classList.remove('hidden');
        setTimeout(() => {
            lockScreen.classList.remove('opacity-0', 'pointer-events-none');
        }, 10);
    }

    const inputPass = document.getElementById('auth-password');
    if (inputPass) inputPass.value = '';

    const errAlert = document.getElementById('auth-error-alert');
    if (errAlert) errAlert.classList.add('hidden');

    if (typeof showToast === 'function') {
        showToast("Sesi berhasil keluar (Logout).", "info");
    }
}

// Toggle Tampilkan / Sembunyikan Password
function toggleLihatPassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Render Data Form Pengaturan Kredensial di Halaman Pengaturan
function renderPengaturanAuth() {
    const auth = (appSettings && appSettings.adminAuth) || {
        username: 'admin@ppu',
        nama: 'Administrator',
        role: 'Bendahara Utama'
    };

    const inputUser = document.getElementById('setting-auth-username');
    if (inputUser) inputUser.value = auth.username || 'admin@ppu';

    const inputNama = document.getElementById('setting-auth-nama');
    if (inputNama) inputNama.value = auth.nama || 'Administrator';

    const inputRole = document.getElementById('setting-auth-role');
    if (inputRole) inputRole.value = auth.role || 'Bendahara Utama';

    const inputPassLama = document.getElementById('setting-auth-password-lama');
    if (inputPassLama) inputPassLama.value = '';

    const inputPassBaru = document.getElementById('setting-auth-password-baru');
    if (inputPassBaru) inputPassBaru.value = '';
}

// Simpan Kredensial Pengurus Baru dari Halaman Pengaturan
function simpanPengaturanAuth() {
    const inputUser = document.getElementById('setting-auth-username');
    const inputNama = document.getElementById('setting-auth-nama');
    const inputRole = document.getElementById('setting-auth-role');
    const inputPassLama = document.getElementById('setting-auth-password-lama');
    const inputPassBaru = document.getElementById('setting-auth-password-baru');

    const newUsername = inputUser ? inputUser.value.trim() : '';
    const newNama = inputNama ? inputNama.value.trim() : '';
    const newRole = inputRole ? inputRole.value.trim() : '';
    const passLama = inputPassLama ? inputPassLama.value : '';
    const passBaru = inputPassBaru ? inputPassBaru.value : '';

    if (!newUsername) return showToast("Username tidak boleh kosong!", "error");
    if (!newNama) return showToast("Nama pengurus tidak boleh kosong!", "error");

    if (!appSettings.adminAuth) {
        appSettings.adminAuth = { username: 'admin@ppu', password: '@juna123' };
    }

    // Jika ingin mengubah password
    if (passBaru) {
        const currentPass = appSettings.adminAuth.password || '@juna123';
        if (passLama !== currentPass) {
            return showToast("Password lama salah! Masukkan password saat ini untuk verifikasi.", "error");
        }
        if (passBaru.length < 3) {
            return showToast("Password baru minimal 3 karakter!", "error");
        }
        appSettings.adminAuth.password = passBaru;
    }

    appSettings.adminAuth.username = newUsername;
    appSettings.adminAuth.nama = newNama;
    appSettings.adminAuth.role = newRole || 'Bendahara Utama';

    saveDataToStorage();
    updateHeaderProfile();
    renderPengaturanAuth();

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Kredensial Berhasil Disimpan!',
            text: `Username sekarang: "${newUsername}". Gunakan informasi ini saat membuka kunci sistem.`,
            confirmButtonColor: '#059669'
        });
    } else if (typeof showToast === 'function') {
        showToast("Pengaturan keamanan berhasil diperbarui!");
    }
}

// Expose ke global window
window.initAuth = initAuth;
window.submitLoginAuth = submitLoginAuth;
window.kunciAplikasi = kunciAplikasi;
window.toggleLihatPassword = toggleLihatPassword;
window.renderPengaturanAuth = renderPengaturanAuth;
window.simpanPengaturanAuth = simpanPengaturanAuth;
window.updateHeaderProfile = updateHeaderProfile;
