# Animal Books AR ? keputusan project

Project terpisah di C:/Users/PT KIW/Documents/TFA/Animal Book AR.

- Keputusan terakhir user: satu halaman, satu marker, satu hewan, satu suara sesuai nama file.
- Delapan hewan: elephant, frog, kitten, lion, monkey, rooster, tiger, wolf.
- Aset asli sudah disediakan. Cover tidak dipakai sebagai marker.
- config.js memetakan target index 0?7, GLB, MP3, ukuran dan posisi.
- animals.mind sudah dikompilasi dari delapan marker. Compile ulang bila marker/urutan berubah.
- Three.js 0.160.0, MindAR 1.2.5, HTML/CSS/JavaScript tanpa npm build/backend.
- Tap model memainkan suara; tidak ada action link. Hanya satu suara dan satu target aktif.
- Model dimuat sesuai kebutuhan. Cadangan sebelum optimasi di .optimization/originals.
- Pengujian delapan model, raycast, audio asli, tracking kamera simulasi, dan target lost sudah lulus.
- Uji HP dengan buku cetak masih dibutuhkan; tidak mengklaim kamera fisik sudah diuji.
- Jangan mengubah atau deploy ke BusinessCard/SitePlan. Deployment baru belum diminta.

Lihat README.md untuk menjalankan, pemetaan lengkap, compiler, dan validasi.

Update: total 11 hewan, tambahan dog/sheep/cow dengan marker/model/suara asli. Index lama 0-7 tetap, index baru 8-10. Tiga target baru memakai crop ilustrasi di config.js karena layout halaman mirip. Nama bilingual di atas dan judul marker di bawah, rotasi drag, audio maksimal 15 detik.
