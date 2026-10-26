# Classify Osteoporosis

Dashboard untuk eksperimen klasifikasi citra X-ray lutut dengan YOLOv8, backend Flask, dan frontend React. Proyek awal merupakan tugas akhir pengolahan citra digital di Fakultas Ilmu Komputer, Universitas Brawijaya.

## Menjalankan secara lokal

Prasyarat: Python 3.10+, Node.js 22.12+ atau versi LTS yang lebih baru, dan npm.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements-dev.txt
python scripts/download_models.py --model all
cd frontend
npm ci
cd ..
python scripts/dev.py
```

Buka <http://127.0.0.1:5173>. API Flask berjalan di <http://127.0.0.1:5000>; Vite meneruskan permintaan `/api` ke Flask sehingga tidak membutuhkan konfigurasi CORS.

Pada Debian/Ubuntu, jika pembuatan virtual environment gagal karena `ensurepip` tidak tersedia, instal paket `python3-venv` terlebih dahulu. Alternatif jika pip sudah tersedia:

```bash
python3 -m venv --without-pip .venv
python3 -m pip --python .venv/bin/python install pip
```

Untuk memasang hanya model default yang lebih kecil, gunakan `python scripts/download_models.py --model nano`. Skrip mengambil objek Git LFS dari repo ini, memverifikasi ukuran dan SHA-256, lalu menyimpan bobot di `.models/`. Pointer Git LFS yang dilacak Git tetap utuh. Bobot yang sudah tersedia melalui `git lfs pull` juga didukung.

## Build dan satu server

```bash
cd frontend
npm run build
cd ..
source .venv/bin/activate
gunicorn --bind 127.0.0.1:5000 --workers 1 --threads 4 --timeout 120 'backend:create_app()'
```

Flask menyajikan build React dan API melalui <http://127.0.0.1:5000>. Inferensi berjalan di CPU, memuat model saat pertama digunakan, dan memakai satu model dalam memori. Pemuatan pertama lebih lama daripada prediksi berikutnya. Satu worker mencegah duplikasi bobot besar dalam memori.

## Data dan model

- Lima varian YOLOv8: Nano, Small, Medium, Large, dan Xlarge.
- Metrik dan kurva berasal dari `train-*/results.csv`. Nilai terbaik merupakan maksimum akurasi top-1 pada validasi selama pelatihan, bukan hasil uji klinis atau akurasi pada unggahan baru.
- Epoch pada tampilan mengikuti penomoran CSV asli, mulai dari satu. Jumlah epoch adalah jumlah baris CSV.
- Artefak confusion matrix berasal dari folder pelatihan asli, bukan dihitung dari unggahan pengguna.
- Kelas model: `normal` dan `osteoporosis`. Probabilitas adalah skor keluaran model, bukan estimasi risiko klinis yang terkalibrasi.
- Citra PNG/JPEG maksimal 10 MB, minimal 32 × 32 piksel, dan maksimal 25 megapiksel. Citra dikonversi ke RGB dan disimpan ulang sebagai PNG tanpa metadata EXIF.
- Riwayat SQLite dan citra tersimpan di `instance/`, yang diabaikan Git. Atur `OSTEO_INSTANCE_PATH` untuk memindahkan direktori data. Statistik awal kosong sampai ada analisis yang berhasil.

Aplikasi ditujukan untuk eksperimen lokal. Hasil klasifikasi bukan diagnosis klinis. Aplikasi belum memiliki autentikasi atau isolasi data antar pengguna; jangan mempublikasikan server yang menyimpan citra sensitif tanpa menambahkan kontrol akses.

## API

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/health` | Status API dan ketersediaan paket runtime |
| `GET /api/dashboard` | Statistik riwayat dan katalog model |
| `GET /api/models` | Metrik, seri epoch, dan status bobot setiap model |
| `GET /api/dataset` | Daftar citra dataset menurut `label`, `page`, dan `per_page`; file yang tidak terbaca dihitung terpisah |
| `GET /api/dataset/<label>/<file>` | Citra asli; gunakan `thumbnail=1` untuk pratinjau JPEG maksimal 400 × 400 piksel |
| `POST /api/predictions` | Multipart `image` dan `model`, menjalankan prediksi lalu menyimpan hasil |
| `GET /api/predictions` | Riwayat dengan `search`, `label`, `model`, `page`, `per_page` |
| `GET /api/predictions/<id>` | Detail prediksi |
| `DELETE /api/predictions/<id>` | Hapus satu riwayat analisis beserta citra tersimpannya |
| `GET /api/predictions/<id>/image` | Citra prediksi yang sudah dinormalisasi |
| `GET /api/predictions/export` | Ekspor CSV dengan filter yang sama dengan riwayat |
| `GET /api/models/<model>/artifacts/<file>` | Artefak `confusion_matrix.png` atau `results.png` |

Contoh prediksi:

```bash
curl -F 'image=@/path/to/xray.png' -F 'model=nano' http://127.0.0.1:5000/api/predictions
```

Kesalahan API menggunakan JSON `{ "error": "..." }`. Bobot/runtime yang tidak tersedia menghasilkan HTTP 503; aplikasi tidak membuat hasil prediksi simulasi.

Pada halaman Riwayat, tombol **Hapus** di setiap hasil membuka konfirmasi. Penghapusan permanen mencakup hasil analisis dan citra tersimpan; jumlah riwayat serta statistik ringkasan ikut diperbarui.

## Pengujian

```bash
source .venv/bin/activate
python -m pytest -q
cd frontend
npm run build
npx playwright install chromium
npm run test:e2e
```

Pengujian API memakai predictor deterministik untuk menguji penyimpanan dan kontrak respons, bukan menilai akurasi model.

Pengujian browser menjalankan build produksi melalui Flask pada port 5001 dengan database sementara, lalu menghapus riwayat pengujian ketika server berhenti. Pengujian unggah dan hapus riwayat menjalankan inferensi asli dengan montage validasi yang sudah ada di repo untuk memeriksa alur teknis; ini bukan evaluasi medis atau pengukuran akurasi. Model Nano dan runtime inferensi harus tersedia. Pengujian juga mencakup Axe untuk tema putih pada preferensi sistem terang/gelap, layout 320–1440 px, dan pembesaran teks 200%. Pada Linux, Chromium mungkin memerlukan `npx playwright install-deps chromium` dengan akses administrator.

Catatan desain dan pengukuran kontras tersedia di [docs/design-notes.md](docs/design-notes.md).

Referensi implementasi: [Flask file uploads](https://flask.palletsprojects.com/en/stable/patterns/fileuploads/), [Ultralytics classification](https://docs.ultralytics.com/tasks/classify/), dan [Vite](https://vite.dev/guide/).
