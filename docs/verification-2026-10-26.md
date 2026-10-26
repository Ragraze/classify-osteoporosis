# Verifikasi perubahan 26 Oktober 2026

Lingkup: hapus satu hasil riwayat beserta citranya, sidebar biru, tema elegant white, dan empat ikon navigasi. Arah visual mengikuti permintaan pengguna dan keputusan di `design-notes.md`: ENERGY 2 / RHYTHM 2 / MOTION 1.

## Hasil pengujian

- PASS: `python -m pytest -q`, 24 tes. Penghapusan diuji pada database sementara: data terpilih dan citra hilang, hasil lain tetap tersedia, ringkasan serta CSV berubah, ID tidak ditemukan menghasilkan 404, citra yang sudah hilang tidak menghalangi penghapusan, dan kegagalan menghapus citra mempertahankan rekaman.
- PASS: `npm run build` menghasilkan build produksi.
- PASS: Playwright, 10 tes. Browser memakai database sementara, termasuk inferensi Nano asli, konfirmasi hapus, Batal, Escape, pemulihan fokus, kegagalan server, percobaan ulang, tombol selama proses, jumlah riwayat, serta perpindahan dari halaman akhir setelah baris terakhir dihapus.
- PASS: Axe WCAG A/AA pada empat halaman dalam preferensi sistem light dan dark, serta dialog hapus. Tema tetap putih pada kedua preferensi sesuai permintaan.
- PASS: layout 320, 390, 768, 1024, 1440 px dan teks 200% tanpa overflow horizontal.

Library Chromium yang tidak tersedia disiapkan di `/tmp/osteo-browser-libs`, tanpa pemasangan sistem. Perintah pengujian pada lingkungan ini:

```bash
LD_LIBRARY_PATH=/tmp/osteo-browser-libs/extracted/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=/tmp/osteo-playwright npm run test:e2e
```

## Delivery Gate untuk perubahan ini

| Aturan | Status dan bukti |
| --- | --- |
| R-01 | PASS: biru sidebar diminta pengguna; bidang utama tetap putih. |
| R-02 | PASS: teks yang ditambahkan tidak menggunakan em dash. |
| R-03 | PASS: tes viewport 320–1440 px dan teks 200%; kontrol minimal 44 px. |
| R-04 | PASS: ikon mewakili ringkasan, citra, grafik evaluasi, dan waktu riwayat; alasan tercatat di catatan desain. |
| R-05 | PASS: susunan ruang analisis, evaluasi, dan riwayat mengikuti pekerjaan pengguna yang sudah ada. |
| R-06 | PASS: stack font sistem tetap dipakai untuk keterbacaan dan konsistensi kontrol. |
| R-07 | PASS: tidak menambahkan pola latar. |
| R-08 | PASS: tidak menambahkan panah dekoratif. |
| R-09 | PASS: jumlah pada navigasi berasal dari API, tanpa badge pemasaran. |
| R-10 | PASS: tidak menggunakan glassmorphism. |
| R-11 | PASS: radius kontrol 8 px dan dialog 20 px mengikuti sistem yang sudah ada. |
| R-12 | PASS: bayangan dialog membedakan modal dari konten di belakangnya. |
| R-13 | PASS: tidak menggunakan glow. |
| R-14 | PASS: tidak menambahkan kartu fitur. |
| R-15 | PASS: label menyebut tindakan Hapus, Hapus riwayat, dan Batal. |
| R-16 | PASS: teks menyebut hasil analisis dan penghapusan, tanpa klaim pemasaran. |
| R-17 | PASS: statistik dimuat ulang dari database sesudah penghapusan; tes memeriksa jumlahnya. |
| R-18 | PASS: tidak menambahkan testimoni atau identitas orang. |
| R-19 | PASS: MOTION 1; tidak ada animasi dekoratif baru. |
| R-20 | PASS: citra lutut, dua kelas, metrik model, dan daftar analisis tetap menjadi isi utama. |
| R-21 | PASS: pengguna secara eksplisit meminta tema putih; preferensi sistem dark tetap menampilkan tema putih. |
| R-22 | PASS: tidak menambahkan ilustrasi. |
| R-23 | PASS: warna sidebar, tema putih, dan ikon diminta langsung oleh pengguna. |
| R-24 | PASS: empat tautan sidebar mengarah ke empat halaman aplikasi yang tersedia. |
| R-25 | PASS: Axe tanpa pelanggaran; putih/biru 10,19:1, teks sekunder sidebar/biru 7,64:1, putih/tombol hapus 6,57:1; batas kontrol/putih 3,58:1. |
| R-26 | PASS: Hapus membuka dialog; Batal dan Escape menutupnya; konfirmasi memanggil DELETE dan memperbarui tampilan. |
| R-27 | PASS: keadaan kosong, memuat, gagal, proses penghapusan, dan berhasil diuji. |
| R-28 | PASS: tidak menambahkan FAQ. |
| R-29 | PASS: palet netral dan biru; warna sinyal serta merah hanya untuk arti kelas, pesan, dan tindakan permanen. |
| R-30 | PASS: tidak menambahkan tiruan antarmuka produk lain. |
| R-31 | PASS: alasan warna, ikon, dialog, fokus awal, dan pengaturan fokus tercatat di catatan desain. |
| R-32 | PASS: fokus awal Batal, Enter untuk membuka, Escape untuk menutup, dan pemulihan fokus diuji. |
| R-33 | PASS: perubahan UI ditulis langsung pada JSX dan CSS. |
| R-34 | PASS: tema putih teruji pada preferensi sistem terang dan gelap. |
| R-35 | PASS: build dan 10 tes browser mencakup unggah, detail, filter, ekspor, grafik, evaluasi, navigasi, dan hapus. |
| R-36 | PASS: tidak menambahkan klaim keamanan, kepatuhan, atau performa. |
| R-37 | PASS: arah visual berasal dari permintaan pengguna dan catatan desain yang sudah ada. |
| R-38 | PASS: data produksi berasal dari API; data sintetis pagination hanya dipakai di tes terisolasi. |

## Liveliness dan craftsmanship

| Item | Status dan bukti |
| --- | --- |
| ENERGY / RHYTHM / MOTION | PASS: 2 / 2 / 1 mengikuti catatan desain; warna navigasi menegaskan identitas tanpa animasi tambahan. |
| Titik fokus | PASS: isi halaman tetap menjadi fokus; dialog menjadi fokus tunggal saat penghapusan dikonfirmasi. |
| Spasi | PASS: daftar dan dialog memakai skala spasi serta kontrol yang sudah ada. |
| Aksen | PASS: biru menghubungkan navigasi dengan aksi; merah terbatas pada penghapusan. |
| Motif identitas | PASS: citra lutut dan skor dua kelas tetap berulang di alur analisis dan riwayat. |
| Design Read | PASS: arah visual dan tiga dial tercatat di catatan desain. |
| C-1 | PASS: setiap perubahan visual mempunyai alasan yang tercatat. |
| C-2 | PASS: tombol baru menjalankan aksi yang diuji, termasuk gagal dan mencoba ulang. |
| C-3 | PASS: kontrol tambahan melayani pengelolaan hasil analisis yang diminta. |
| C-4 | PASS: viewport, pembesaran teks, preferensi tema, keyboard, serta keadaan API diuji. |
| C-5 | PASS: tidak ada klaim atau data tampilan yang dibuat untuk mengisi antarmuka. |

## Pembersihan teks antarmuka

Permintaan berikutnya: tampilkan inti saja. Dihapus dari semua halaman: breadcrumb Workspace, tombol Perbarui data, subjudul dan keterangan sidebar, tanggal hari ini, footer penelitian, disclaimer hasil, paragraf pengantar, penjelasan metode, keterangan CSV, dan judul promosi. Data dan kontrol utama tetap tersedia.

- Hard Gate PASS: build produksi berhasil; 10 tes browser yang diperbarui lolos, termasuk unggah, detail, hapus, kegagalan API, ekspor, navigasi model, Axe, viewport 320–1440 px, dan teks 200%.
- Purpose Gate PASS: tidak ada warna, ikon, font, efek, atau aset baru; CSS untuk breadcrumb, sidebar, dan footer yang dihapus ikut dibersihkan. Jarak navigasi 32 px mempertahankan pemisahan nama aplikasi dan menu.
- Liveliness PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 tetap mengikuti arahan biru dan putih. Judul, citra, grafik, dan data menjadi fokus setelah teks pengantar dihapus.
- Craftsmanship PASS: tombol analisis, pilihan model, detail, filter, ekspor, konfirmasi hapus, Batal, dan Escape tetap lulus tes. Screenshot desktop ditinjau setelah perubahan.
- Copywriting PASS: tidak ada klaim atau data baru; teks yang tersisa berupa label tindakan, data, batas unggahan, status, kesalahan, serta konsekuensi penghapusan.

## Validasi pratinjau citra

Pemeriksaan 372 citra dataset menemukan 210 citra valid dan 162 file di `dataset/osteoporosis` yang seluruh byte-nya bernilai nol. File tersebut tidak menyimpan gambar yang dapat dipulihkan dari salinan ini. Daftar lengkap tersedia di `artifacts/dataset-invalid-images.txt`; file sumber dan ZIP tidak diubah.

- R-26/R-27 PASS: pemilihan file memeriksa signature PNG/JPEG sebelum membuat pratinjau dan memberi pesan singkat untuk file rusak. Nilai input dikosongkan setelah pemilihan agar berkas yang sama bisa dipilih ulang.
- C-4 PASS: pratinjau terikat ke objek File yang sesuai, dan pembacaan header lama diabaikan ketika pengguna memilih berkas berikutnya.
- R-35 PASS: build berhasil dan 11 tes browser lolos, termasuk file berisi nol, PNG terpotong, pemilihan ulang, unggah, inferensi asli, dan hapus riwayat.
- Pemeriksaan server development PASS: `dataset/osteoporosis/13.JPEG` ditolak karena tidak berisi gambar; `dataset/osteoporosis/1.JPEG` menampilkan pratinjau, mengaktifkan tombol analisis, serta berhasil dipilih ulang tanpa error runtime.

## Penggabungan ringkasan dan analisis

- Hard Gate PASS: unggah dan hasil tampil di atas statistik serta grafik dalam satu halaman. Judul Ringkasan dan bagian Analisis terbaru dihapus sesuai permintaan; daftar hasil tersedia di Riwayat.
- Purpose Gate PASS: tiga tujuan navigasi menggantikan empat tujuan; panel ajakan unggah yang berulang dihapus. Sidebar biru dan tema putih tetap mengikuti arahan pengguna.
- Liveliness PASS: ENERGY 2 / RHYTHM 2 / MOTION 1; unggah dan hasil menjadi fokus, disusul statistik dan grafik. Tata letak navigasi disesuaikan untuk tiga menu.
- Craftsmanship PASS: build berhasil dan 11 tes browser lolos, termasuk pembaruan statistik setelah inferensi, hasil yang tetap tersedia saat kembali dari Riwayat, penghapusan, Axe, viewport 320–1440 px, dan teks 200%.
- Kompatibilitas PASS: tautan `#ringkasan` membuka halaman Analisis citra. Rute tersimpan yang tidak lagi tersedia menggunakan halaman gabungan agar pembaruan development tidak menghasilkan halaman kosong.

## Urutan baris halaman Analisis citra

- Hard Gate PASS: tiga kartu Analisis tersimpan, Kelas normal, dan Kelas osteoporosis dihapus dari halaman Analisis citra. Statistik model di halaman Evaluasi tetap tersedia.
- Purpose Gate PASS: baris Akurasi validasi dan Perbandingan model dipindahkan ke atas baris Citra untuk dianalisis dan Hasil klasifikasi sesuai permintaan pengguna, dengan urutan DOM yang sama seperti urutan visual.
- Liveliness PASS: struktur dua baris tetap memakai ENERGY 2 / RHYTHM 2 / MOTION 1, sidebar biru, dan panel putih.
- Craftsmanship PASS: build berhasil dan 11 tes browser lolos. Pemeriksaan server development memastikan urutan baris pada lebar 1440 serta 390 px, tidak ada tiga kartu statistik tersebut, dan pratinjau citra valid tetap dimuat.

## Sidebar, Dataset, dan evaluasi akhir

- Hard Gate PASS: sidebar berjudul Classify Osteoporosis dengan urutan Evaluasi model, Dataset, Analisis citra, Riwayat. Footer menampilkan Metode penelitian, YOLOv8 tebal, dan Klasifikasi citra digital lutut kaki sesuai permintaan.
- Purpose Gate PASS: satu tab Dataset memuat galeri Normal dan Osteoporosis bersama; ikon folder menunjukkan tujuan Dataset. Setiap kelas memiliki pagination sendiri dan tautan citra asli, dengan thumbnail untuk mengurangi ukuran unduhan.
- Honesty PASS: galeri berasal dari folder asli. API memisahkan 186 citra Normal yang terbaca serta 24 citra Osteoporosis yang terbaca dari 162 berkas Osteoporosis yang tidak terbaca. Berkas sumber tidak diubah.
- Layout PASS: grafik Akurasi validasi dan Perbandingan model dihapus dari Analisis citra. Di Evaluasi model, panel YOLOv8 berada di kiri, ringkasan akurasi dan epoch di kanan; urutannya tetap YOLOv8 lebih dulu pada ponsel.
- Liveliness PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 serta warna biru/putih tetap dipakai. Tinggi grafik mengikuti viewport; label SVG menggunakan dimensi area gambar yang sebenarnya. Judul YOLOv8 tetap di kiri dan diratakan tengah secara vertikal dengan kontrol grafik.
- API PASS: 39 tes lolos, termasuk pagination dataset, gambar asli, thumbnail, penolakan file rusak, pengabaian metadata Windows dan symlink, serta pembaruan cache metadata ketika file berubah.
- Craftsmanship PASS: build dan 12 tes browser lolos, termasuk dua galeri dalam satu halaman, pagination independen, membuka citra asli, inferensi, riwayat, penghapusan, Axe, viewport 320–1440 px, dan teks 200%.
- Pemeriksaan langsung PASS: kartu grafik pada mode akurasi dan loss muat pada tinggi layar desktop 640, 720, 768, dan 900 px; confusion matrix muat pada layar 720 px. Titik tengah vertikal judul dan kontrol header berbeda kurang dari 2 px. Screenshot `artifacts/evaluation-fit-screen.png` ditinjau.
