# Backend Absensi Klinik

Backend untuk aplikasi absensi klinik sederhana yang dibangun dengan Node.js, Express, dan MySQL.

## Fitur

-   Autentikasi pengguna (Login)
-   Manajemen Pengguna (CRUD) oleh Admin
-   Pencatatan Absensi berbasis lokasi
-   Filter data absensi (harian, mingguan, bulanan, semua)
-   Pembatasan login karyawan pada satu perangkat

## Prasyarat

-   [Node.js](https://nodejs.org/) (v14 atau lebih baru)
-   [npm](https://www.npmjs.com/)
-   [MySQL](https://www.mysql.com/) atau database yang kompatibel

## Instalasi

1.  Clone repositori ini:
    ```bash
    git clone <URL_REPOSITORI>
    cd absensi-backend
    ```

2.  Install dependensi:
    ```bash
    npm install
    ```

## Konfigurasi

1.  Buat file `.env` di direktori root proyek dengan menyalin dari `.env.example` (jika ada) atau membuatnya dari awal.

2.  Isi file `.env` dengan konfigurasi database dan JWT Secret Anda:
    ```
    PORT=3000

    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=password
    DB_NAME=absensi_klinik
    DB_PORT=3306

    JWT_SECRET=rahasia-super-aman
    ```

3.  Pastikan Anda memiliki file `ca.pem` di dalam direktori `config/` jika koneksi database Anda memerlukan SSL.

## Menjalankan Aplikasi

-   Untuk mode pengembangan (dengan auto-reload menggunakan nodemon):
    ```bash
    npm run dev
    ```

-   Untuk mode produksi:
    ```bash
    npm start
    ```

Server akan berjalan di `http://localhost:3000`.

## Struktur Database

Aplikasi ini menggunakan dua tabel utama: `users` dan `absensi`.

-   **`users`**: Menyimpan data pengguna.
    -   `id` (INT, Primary Key)
    -   `nama_lengkap` (VARCHAR)
    -   `username` (VARCHAR, Unique)
    -   `password` (VARCHAR, Hashed)
    -   `role` (ENUM: 'admin', 'karyawan')
    -   `jabatan` (VARCHAR, Nullable)
    -   `device_id` (VARCHAR, Nullable, Unique per karyawan)
    -   `last_absen_date` (DATE, Nullable)
    -   `created_at` (TIMESTAMP)

-   **`absensi`**: Menyimpan catatan waktu absensi.
    -   `id` (INT, Primary Key)
    -   `user_id` (INT, Foreign Key to users.id)
    -   `waktu_absen` (DATETIME)
    -   `latitude` (DECIMAL)
    -   `longitude` (DECIMAL)

## Endpoint API

### 1. Autentikasi (`/api/auth`)

-   **`POST /login`**: Login pengguna.
    -   **Body**:
        ```json
        {
            "username": "user",
            "password": "password123",
            "device_id": "unique-device-identifier" // Wajib untuk role 'karyawan'
        }
        ```
    -   **Response Sukses (200)**:
        ```json
        {
            "message": "Login berhasil!",
            "token": "jwt.token.string",
            "user": {
                "userId": 1,
                "role": "karyawan",
                "namaLengkap": "Nama Lengkap User"
            }
        }
        ```

### 2. Pengguna (`/api/users`)

> **Catatan**: Semua endpoint ini memerlukan autentikasi dan hak akses `admin`.

-   **`GET /`**: Mendapatkan semua data pengguna.
-   **`POST /`**: Membuat pengguna baru (role default: `karyawan`).
    -   **Body**:
        ```json
        {
            "nama_lengkap": "User Baru",
            "username": "userbaru",
            "password": "passwordnya",
            "jabatan": "Staf"
        }
        ```
-   **`DELETE /:id`**: Menghapus pengguna berdasarkan ID.
-   **`PUT /reset-device/:id`**: Menghapus `device_id` terdaftar milik seorang karyawan, memungkinkan mereka untuk login dari perangkat baru.
-   **`PUT /reset-password/:id`**: Mengubah password pengguna.
    -   **Body**:
        ```json
        {
            "newPassword": "passwordbaruyangaman"
        }
        ```

### 3. Absensi (`/api/absensi`)

> **Catatan**: Semua endpoint ini memerlukan autentikasi.

-   **`POST /`**: Merekam absensi baru untuk pengguna yang terautentikasi.
    -   **Body**:
        ```json
        {
            "koordinat": {
                "latitude": -6.200000,
                "longitude": 106.816666
            },
            "waktuAbsen": "2025-10-07T10:00:00Z" // ISO 8601 String
        }
        ```
-   **`GET /status`**: Mengecek apakah pengguna sudah melakukan absensi hari ini.
-   **`GET /`**: (Admin) Mendapatkan semua data absensi dari semua pengguna.
    -   **Query Params (Opsional)**:
        -   `filter`: `today` | `week` | `month` | `date` | `all` (default)
        -   `date`: `YYYY-MM-DD` (wajib jika `filter=date`)
        -   `tzOffset`: Perbedaan timezone dari UTC dalam menit (misal: WIB adalah `-420`).
-   **`GET /:userId`**: Mendapatkan riwayat absensi seorang pengguna. Admin bisa melihat data semua pengguna, sedangkan karyawan hanya bisa melihat datanya sendiri.
