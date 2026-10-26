# Artefak penelitian

Notebook `classify-osteoporosis.ipynb` dan folder `train-*` serta `val-*` merupakan keluaran penelitian asli. Isinya dipertahankan saat dipindahkan dari root repositori.

Backend membaca metrik dan gambar evaluasi dari `train-*/`. Pointer Git LFS berada di `train-*/weights/`; skrip `scripts/download_models.py` menyimpan bobot unduhan di `.models/` pada root repositori. Folder `val-*` menyimpan hasil validasi terpisah dan tidak digunakan sebagai pengganti metrik pelatihan pada dashboard.

Notebook masih memuat path lingkungan eksperimen semula. Sesuaikan path dan dependensinya jika ingin menjalankan ulang eksperimen; aplikasi lokal menggunakan perintah pada README utama.
