# Tur Virtual 360 Benteng Rotterdam

Aplikasi tur virtual berbasis panorama 360 derajat untuk menjelajahi area Benteng Rotterdam. Pengunjung dapat berpindah antar-spot, membuka informasi sejarah, dan melihat objek 3D pada lokasi tertentu.

## Fitur

- Panorama 360 dari `NOMOR1.jpg` sampai `NOMOR18.jpg`
- Hotspot navigasi antar-spot
- Hotspot informasi dengan deskripsi
- Dukungan objek 3D berformat `.glb`
- Editor sementara untuk mengatur posisi hotspot dan objek 3D
- Mode pengguna tanpa panel editor

## Menambahkan Model 3D

Yang dimasukkan ke aplikasi bukan gambar 3D, melainkan **model 3D berformat `.glb`**. File `.jpg` atau `.png` hanya dapat digunakan sebagai gambar tekstur atau gambar preview.

### Cara 1: File model di dalam repository

1. Masukkan file `.glb` ke folder proyek, misalnya `1.glb`.
2. Buka `index.html`.
3. Sesuaikan pemetaan pada `MODEL_FILES`:

```js
const MODEL_FILES = {
  "#model1": "1.glb",
  "#model2": "2.glb",
  "#model3": "3.glb",
};
```

4. Tambahkan model ke spot yang diinginkan pada `tourData`:

```js
nomor11: {
  sky: "#img-nomor11",
  hotspots: [],
  models: [
    {
      modelId: "#model1",
      position: "0 -1.8 -5",
      scale: "1 1 1",
      rotation: "0 0 0",
    },
  ],
},
```

Nilai `position`, `scale`, dan `rotation` dapat disesuaikan setelah model tampil.

### Cara 2: Model dari link GitHub

Model dapat menggunakan URL langsung, selama link tersebut mengarah ke file `.glb` dan dapat diakses oleh browser. Gunakan link **Raw** dari GitHub, bukan link halaman HTML GitHub:

```js
const MODEL_FILES = {
  "#model1":
    "https://raw.githubusercontent.com/USERNAME/REPOSITORY/main/models/1.glb",
};
```

Jika link berasal dari repository lain, server harus mengizinkan akses lintas domain (CORS). Untuk hasil paling stabil, simpan file `.glb` di repository proyek sendiri.

## Menggunakan Tools Editor

Tools editor hanya dimuat pada URL mode edit:

```text
http://localhost/AR%20VR/AR%20VR/?edit=1
```

### Editor navigasi

1. Aktifkan **Navigation Raycast Editor**.
2. Pilih tipe hotspot navigasi atau informasi.
3. Arahkan kursor ke lokasi tujuan.
4. Kunci koordinat dan salin hasilnya ke `tourData`.

### Editor objek 3D

1. Aktifkan **Object 3D Editor**.
2. Pilih spot tujuan dan model 3D.
3. Tentukan posisi model dari kursor.
4. Atur posisi, skala, dan rotasi.
5. Simpan perubahan melalui tombol **Simpan index.html**.
6. Periksa hasilnya pada mode pengguna biasa tanpa `?edit=1`.

Mode pengguna biasa:

```text
http://localhost/AR%20VR/AR%20VR/
```

## Catatan Publikasi GitHub

- Pastikan file `.glb`, panorama, dan tekstur ikut diunggah ke repository.
- Gunakan nama file dan ekstensi yang benar-benar sama dengan pemetaan di `MODEL_FILES`.
- Jangan mengunggah model atau tekstur yang tidak memiliki izin penggunaan.
- Cantumkan sumber, pembuat, dan lisensi setiap model 3D dari pihak lain.
- Uji aplikasi melalui server lokal atau GitHub Pages; jangan hanya membuka `index.html` langsung jika aset eksternal tidak terbaca.

## Struktur Utama

```text
index.html          Halaman utama dan data tur
model-editor.js     Editor posisi objek 3D
navigation-editor.js Editor posisi hotspot
NOMOR*.jpg          Panorama 360
*.glb               Model 3D
assets/             Tekstur dan aset tambahan
```
