# Verifikasi perapian struktur, 26 Oktober 2026

Halaman React dipisahkan ke `frontend/src/pages/` dan komponen bersama ke `frontend/src/components/`. Python diformat dengan Black, JavaScript/JSX dengan Prettier. Notebook serta folder pelatihan dan validasi dipindahkan ke `research/`; pembacaan metrik, artefak, pointer bobot, dan fixture browser mengikuti lokasi baru.

Metadata Windows `*:Zone.Identifier` sebanyak 372 file dan ZIP kosong dihapus. Dataset sumber, arsip dataset asli, bobot lokal, serta riwayat aplikasi dipertahankan. Dependensi, cache, hasil build, dan hasil tes tetap diabaikan Git.

## Hasil pemeriksaan

- PASS: 39 tes API melalui `.venv/bin/python -m pytest -q`.
- PASS: build produksi melalui `npm run build`.
- PASS: 13 tes Playwright, termasuk inferensi Nano asli, galeri dataset, ekspor, penghapusan, navigasi mobile, Axe, viewport 320–1440 px, dan teks 200%.
- PASS: 20 perbandingan screenshot identik secara byte, mencakup Analisis, Evaluasi, Dataset, dan Riwayat pada lebar 320, 390, 768, 1024, dan 1440 px. Perbandingan menggunakan build sebelum perapian dari commit `5fd2ab2` serta build sesudah perapian, dengan database kosong terpisah dan backend yang sama.
- PASS: CSS sama persis dengan commit sebelum perapian; tidak ada perubahan aturan visual.
- PASS: 126 file penelitian yang dipindahkan sama persis secara byte, termasuk notebook dan seluruh pointer Git LFS.
- PASS: unduhan model Nano memverifikasi checksum bobot lokal pada lokasi baru.
- PASS: Black dan Prettier dalam mode pemeriksaan, serta `git diff --check`.

Chromium dan library tambahan ditempatkan di `/tmp/`, tanpa mengubah dependensi aplikasi. Perintah browser pada sesi ini:

```bash
LD_LIBRARY_PATH=/tmp/osteo-browser-libs/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=/tmp/osteo-playwright npm run test:e2e
```

Screenshot pembanding dan hasil JSON berada di `/tmp/osteo-visual-comparison/` selama sesi ini; hasil lokal tersebut tidak dikirim ke GitHub.

## Gate antislop

- Hard Gate PASS: CSS tetap sama; 20 screenshot identik; tes browser memeriksa kontrol, status, keyboard, aksesibilitas, dan ukuran layar.
- Purpose Gate PASS: tidak menambahkan teknik visual atau konten; perubahan hanya struktur file, path internal, dan format kode.
- Liveliness PASS: arah visual ENERGY 2 / RHYTHM 2 / MOTION 1 pada catatan desain tetap dipertahankan, dibuktikan oleh screenshot identik.
- Craftsmanship PASS: build, 39 tes API, 13 tes browser, formatter, serta pemeriksaan integritas artefak lolos. Tidak ada komentar dekoratif atau komentar generik yang ditambahkan; skill antislop-code tidak memerlukan perubahan komentar.
