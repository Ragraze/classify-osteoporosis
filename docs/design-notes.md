# Catatan desain

Acuan pengguna: skill apple-design. Prinsip HIG diterapkan pada web React melalui elemen HTML, CSS semantic tokens, dan ARIA; aplikasi ini tidak meniru window chrome macOS.

## Tujuan

Ruang kerja penelitian untuk mengunggah satu citra X-ray lutut, memilih varian YOLOv8, meninjau skor dua kelas, dan membandingkan eksperimen pelatihan. Fokus layar analisis adalah citra dan probabilitas kelas, bukan statistik pasien.

Design Read: ENERGY 2 / RHYTHM 2 / MOTION 1. Sistem visual sengaja tenang untuk pemeriksaan citra dan angka. Hirarki berganti dari ruang kerja citra ke grafik lalu daftar riwayat. Tidak ada animasi dekoratif. Arahan terbaru pengguna: sidebar biru, tema elegant white, dan ikon pada setiap tab sidebar.

Pengguna meminta teks antarmuka hanya memuat inti. Breadcrumb, tombol perbarui manual, tanggal hari ini, subjudul sidebar, footer penelitian, disclaimer, paragraf pengantar, dan catatan implementasi dihapus. Judul halaman, label data, batas unggahan, status proses, pesan kesalahan, dan konfirmasi penghapusan tetap menyampaikan informasi saat diperlukan. Navigasi langsung mengikuti nama aplikasi dengan jarak 32 px pada desktop.

Navigasi terbaru mengikuti urutan pengguna: Evaluasi model, Dataset, Analisis citra, lalu Riwayat. Normal dan Osteoporosis ditampilkan bersama sebagai dua bagian dalam satu tab Dataset, tanpa submenu terpisah. Nama aplikasi menjadi Classify Osteoporosis. Bagian bawah sidebar memuat Metode penelitian, YOLOv8 dengan huruf tebal, dan Klasifikasi citra digital lutut kaki.

Analisis citra hanya memuat unggah citra dan hasil klasifikasi. Grafik Akurasi validasi, Perbandingan model, tiga kartu statistik, judul Ringkasan, dan daftar Analisis terbaru dihapus dari halaman ini. Grafik pelatihan tetap tersedia di Evaluasi model. Formulir beserta hasilnya tetap disimpan saat berpindah halaman; tautan lama `#ringkasan` membuka Analisis citra.

Dataset menggunakan citra yang benar-benar tersedia pada folder Normal dan Osteoporosis. Kedua galeri memakai thumbnail agar pemuatan ringan, tautan untuk membuka citra asli, serta pagination 12 citra yang bekerja secara terpisah untuk tiap kelas. File yang tidak terbaca dihitung terpisah dan tidak ditampilkan sebagai gambar rusak.

Evaluasi model memakai dua kolom pada desktop: panel YOLOv8 dan grafik di kiri, ringkasan akurasi serta epoch di kanan. Urutan DOM juga menempatkan YOLOv8 lebih dulu. Pada layar sempit ringkasan pindah ke bawah grafik agar setiap kontrol tetap muat.

Tinggi grafik mengikuti tinggi viewport agar kartu YOLOv8 lebih ringkas dan muat pada layar laptop. Koordinat SVG mengikuti ukuran area grafik yang sebenarnya sehingga label serta posisi kursor tetap sesuai setelah grafik diperkecil. Confusion matrix juga dibatasi tingginya dengan object-fit contain agar gambar tetap utuh.

Judul YOLOv8 tetap di kiri header, dengan perataan tengah secara vertikal terhadap tombol pilihan grafik di sebelah kanan.

## Token dan keputusan

| Peran | Warna | Alasan |
| --- | --- | --- |
| Canvas | `#f7f9fc` | Putih kebiruan membedakan ruang kerja dari panel putih |
| Surface | `#ffffff` | Permukaan putih sesuai arahan elegant white |
| Sidebar | `#123d8a` | Biru pekat menegaskan navigasi utama sesuai permintaan pengguna |
| Teks sidebar | `#ffffff` / `#d2dfff` | Label dan metadata tetap terbaca di atas biru |
| Teks | `#1e293b` | Kontras kuat untuk label dan angka |
| Teks sekunder | `#536176` | Metadata tetap terbaca pada panel putih |
| Aksi | `#2455cd` | Menghubungkan tindakan utama dengan navigasi biru |
| Sinyal | `#8c4908` | Membedakan kelas osteoporosis dan pesan, selalu disertai teks |
| Hapus | `#b42318` | Menandai tindakan permanen, hanya untuk tombol hapus |

Font menggunakan stack sistem agar kontrol terasa familiar dan tidak membutuhkan unduhan. Body 16 px; judul 29–36 px; label 13–14 px; catatan sumber 11–12 px. Semua ukuran teks memakai rem. Angka memakai tabular numerals agar hasil mudah dibandingkan.

Radius 8 px untuk kontrol, 16 px untuk panel, 20 px untuk dialog. Bayangan hanya memisahkan pilihan navigasi, segmen terpilih, dan dialog yang berada di atas konten. Tidak memakai glass, glow, gradien, logo buatan, avatar, atau data contoh.

Tema selalu putih sesuai arahan pengguna, termasuk ketika sistem memilih dark mode. Kontrol minimal 44 px. Fokus keyboard 3 px, dialog native mendukung Escape dan pengembalian fokus. Reduced motion dan forced colors ditangani oleh CSS. Tidak ada transparansi konten yang perlu dinonaktifkan.

Kontras dihitung dengan formula luminansi relatif WCAG, bukan diperkirakan dari screenshot:

| Pasangan | Rasio |
| --- | --- |
| Putih / sidebar biru | 10,19:1 |
| Teks sekunder sidebar / sidebar biru | 7,64:1 |
| Teks sekunder / canvas | 5,96:1 |
| Putih / tombol hapus | 6,57:1 |

Ikon SVG sidebar memakai currentColor dan label teks tetap terlihat: bingkai citra untuk analisis, kurva untuk evaluasi, folder untuk dataset, serta jam untuk riwayat. Ikon bersifat dekoratif bagi pembaca layar karena nama tujuan sudah tertulis. Tidak ada dependensi ikon tambahan.

Tombol Hapus berada pada tiap hasil di halaman Riwayat. Dialog menyebut nama citra dan konsekuensi penghapusan permanen; fokus awal pada Batal mencegah konfirmasi tanpa sengaja. Selama penghapusan, tombol dinonaktifkan dan status dibacakan. Setelah berhasil, fokus pindah ke judul riwayat dan statistik dimuat ulang. Penghapusan hasil terakhir pada suatu halaman mengembalikan daftar ke halaman terakhir yang masih berisi data.

## Struktur

Regular:

```text
Navigasi | Unggah citra          | Hasil klasifikasi
         | Dataset dan evaluasi pada halaman masing-masing
```

Compact:

```text
Nama aplikasi
Navigasi empat tujuan
Unggah citra
Hasil klasifikasi
```

Halaman analisis menggunakan dua panel pada ruang yang cukup: citra di kiri, probabilitas di kanan. Pada layar sempit hasil muncul setelah kontrol citra. Pola ini khusus untuk tugas klasifikasi, sehingga citra dan hasil tetap berdekatan.

## Referensi skill yang dibaca

- `layout.md › Visual hierarchy`: pengelompokan, urutan, dan progressive disclosure.
- `typography.md › Conveying hierarchy`: ukuran dan bobot menjaga hirarki.
- `accessibility.md › Vision`: pembesaran teks dan informasi selain warna.
- `color.md › Inclusive color`: label teks menyertai warna kelas.
- `buttons.md › Best practices`: label menyebut tindakan.
- `charting-data.md › Designing effective charts`: grafik sederhana, sumbu dan tabel data.
- `loading.md › Showing progress`: status indeterminate ketika durasi belum diketahui.
- `sidebars.md › Best practices`: navigasi dangkal dan adaptif.
- `cross-platform.md`: CSS tokens, zoom, ARIA, dan komponen web sebagai padanan prinsip native.

Keputusan craft: citra monokrom dan probabilitas dua kelas menjadi identitas produk. Aksesori dekoratif dihilangkan agar tidak bersaing dengan citra atau mengesankan kepastian klinis.
