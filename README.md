# Animal Books AR

Satu halaman = satu marker = satu hewan 3D = satu suara sesuai nama. Delapan halaman didukung; hanya satu hewan aktif pada satu waktu. Tidak ada link kontak, database, atau backend aplikasi.

## Menjalankan

Buka folder ini di VS Code. Klik kanan `index.html` > **Open with Live Server**. Halaman langsung meminta izin kamera dan memulai scan. Arahkan kamera ke halaman buku, lalu ketuk hewan untuk mendengar suara. Tampilan hanya berisi status singkat; tombol coba lagi muncul jika kamera gagal dan audio berhenti otomatis maksimal 15 detik setelah mulai diputar.

Pratinjau pengembangan tetap tersedia melalui `/?preview=1`, tidak ditampilkan pada alur scan biasa.

Kamera HP memerlukan HTTPS. Localhost dapat digunakan pada komputer yang menjalankan Live Server. Dependensi CDN Three.js 0.160.0 dan MindAR 1.2.5 membutuhkan koneksi internet. Aplikasi tidak memerlukan npm install/build.

## Pemetaan aset

| Target index | Marker | Model | Suara |
| --- | --- | --- | --- |
| 0 | elephant.png | elephant3d.glb | elephant.mp3 |
| 1 | frog.png | frog3d.glb | frog.mp3 |
| 2 | kitten.png | kitten3d.glb | kitten.mp3 |
| 3 | lion.png | lion3d.glb | lion.mp3 |
| 4 | monkey.png | monkey3d.glb | monkey.mp3 |
| 5 | rooster.png | rooster3d.glb | rooster.mp3 |
| 6 | tiger.png | tiger3d.glb | tiger.mp3 |
| 7 | wolf.png | wolf3d.glb | wolf.mp3 |

Folder masing-masing: `assets/markers/`, `assets/models/`, dan `assets/sounds/`. Cover tidak dijadikan target. `assets/markers/animals.mind` sudah dikompilasi dari delapan PNG asli dengan compiler MindAR, bukan file placeholder. Satu file menyimpan delapan target terpisah; `maxTrack: 1` membatasi hewan yang ditampilkan bersamaan.

## Mengganti aset

Semua pemetaan, posisi, rotasi, ukuran, dan filter tracking ada di `config.js`. Urutan `targetIndex` harus sama dengan urutan compile. Jika gambar marker ditambah, diganti, atau diurutkan ulang, buka `tools/compile.html` melalui Live Server. Setelah compile selesai, unduh dan timpa `assets/markers/animals.mind`. Mengganti hanya model atau suara tidak membutuhkan compile ulang.

File model diunduh bertahap di latar belakang setelah kamera siap, lalu diproses saat halaman terkait terdeteksi. Model yang telah diproses disimpan dalam memori. `height` membatasi tinggi; lebar/kedalaman juga dibatasi agar muat di halaman. `position` menggunakan koordinat halaman, `rotation` radian, dan `faceCamera: true` dan rotasi nol menjaga hewan menghadap kamera; geser horizontal pada model untuk melihat sisi lainnya. Posisi tetap mengikuti marker yang harus terlihat. Aset saat ini tidak memiliki animation clips; jika aset pengganti memiliki animasi, Idle atau clip pertama dimainkan.

## Optimasi

Model aktif telah dioptimalkan dengan penyederhanaan mesh, quantization, dan tekstur WebP maksimal 1024px. Total asli 247.24 MB menjadi 18.96 MB. File asli tersimpan di `.optimization/originals/`, yang dikecualikan dari Git dan Docker. Optimasi dapat mengurangi detail saat diperbesar; gunakan cadangan jika perlu kualitas asli. GLB aktif bisa dibaca GLTFLoader tanpa decoder Draco tambahan.

## Validasi

`node --check app.js` dan `node --check config.js` memeriksa sintaks.

`node tools/verify.cjs` menjalankan server lokal sementara dan Chrome headless: memuat delapan GLB asli, raycast setiap hewan, memutar MP3 asli, memeriksa stop audio, serta mengenali delapan gambar melalui kamera simulasi menggunakan MindAR sebenarnya. Target hilang menyembunyikan konten dan menghentikan audio. Screenshot tersimpan di `verification/`.

`node tools/compile-targets.cjs` adalah alternatif compile otomatis yang menulis animals.mind. Kedua helper memerlukan Node modern (WebSocket global) dan Chrome Windows pada lokasi standar. Ini alat pengembangan saja, bukan dependency aplikasi.

Uji browser tersebut sudah lulus. Kamera fisik HP, izin kamera perangkat, pencahayaan, sudut buku, dan kestabilan tracking pada cetakan masih perlu diuji langsung. Decoder MP3 sudah diuji; kecocokan isi rekaman dengan jenis hewan mengikuti file yang diberikan dan belum diaudit secara pendengaran.

## Deployment

Dockerfile, nginx.conf.template, dan railway.toml menyediakan server statis untuk Railway. Belum ada deployment atau repository baru yang dibuat pada penyelesaian ini. Jangan menggunakan domain/repository Business Card untuk project ini tanpa instruksi.

Referensi: [MindAR multi-targets](https://hiukim.github.io/mind-ar-js-doc/examples/multi-targets/).

Model belum dimuat: tidak ada bentuk placeholder. Label nama di bawah model dan tombol hentikan suara dihapus. File MP3 asli tetap utuh; batas 15 detik diterapkan saat playback.

Kamera memakai satu stream untuk izin dan tracking. Adapter `_startVideo` khusus versi MindAR 1.2.5 memakai stream itu agar kamera tidak ditutup/dibuka ulang. Bila versi MindAR diperbarui, uji adapter ini kembali. Warmup 2 / miss 3 frame dan smoothing rate 28 mengurangi latensi; kestabilan perlu diuji di HP/buku cetak.

Orientasi terbaru: hewan menghadap kamera (`faceCamera: true`, rotation nol). Geser horizontal pada model untuk memutar 360 derajat; ketukan singkat memainkan suara. Rotasi manual dipertahankan relatif terhadap kamera dan direset saat berpindah ke hewan lain. Ini tidak menggunakan sensor gyro terpisah.

Nama bilingual kini tampil di atas model; judul Inggris dan Indonesia dari marker tampil dua baris di bawahnya. Teks diatur lewat labelName, subtitleEn, subtitleId di config.js. Label muncul setelah GLB siap, mengikuti kamera dan tidak ikut berputar saat model digeser.
