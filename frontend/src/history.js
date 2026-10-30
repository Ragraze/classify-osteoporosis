export const STORAGE_KEY = "classify-osteoporosis-history-v1";

function validPrediction(item) {
  return item && typeof item.id === "string" && typeof item.filename === "string"
    && ["nano", "small", "medium", "large", "xlarge"].includes(item.model)
    && ["normal", "osteoporosis"].includes(item.label)
    && Number.isFinite(item.confidence) && Number.isFinite(item.inference_ms)
    && Number.isFinite(item.probabilities?.normal)
    && Number.isFinite(item.probabilities?.osteoporosis)
    && Number.isFinite(Date.parse(item.created_at))
    && typeof item.image_url === "string"
    && /^data:image\/(png|jpeg);base64,/.test(item.image_url);
}

export function readHistory() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error("Penyimpanan browser diblokir. Izinkan penyimpanan situs lalu coba lagi.");
  }
  if (raw === null) return [];
  try {
    const stored = JSON.parse(raw);
    if (stored.version !== 1 || !Array.isArray(stored.items)
      || !stored.items.every(validPrediction)) throw new Error();
    return stored.items;
  } catch {
    throw new Error("Riwayat browser tidak dapat dibaca. Data lama tidak ditimpa; periksa data situs sebelum mencoba lagi.");
  }
}

function writeHistory(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error("Perubahan belum tersimpan. Penyimpanan browser penuh atau diblokir. Ekspor riwayat sebelum menghapus data lama.");
  }
}

export function savePrediction(item) {
  if (!validPrediction(item)) throw new Error("Hasil analisis tidak valid dan belum disimpan.");
  const items = readHistory();
  writeHistory([item, ...items.filter(row => row.id !== item.id)]);
}

export function deletePrediction(id) {
  writeHistory(readHistory().filter(item => item.id !== id));
}

export function queryHistory({ search = "", label = "", model = "", page = 1, per_page = 10 } = {}) {
  const term = search.toLowerCase();
  const items = readHistory().filter(item =>
    (!term || item.filename.toLowerCase().includes(term) || item.id.toLowerCase().includes(term))
    && (!label || item.label === label) && (!model || item.model === model))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  return { items: items.slice((page - 1) * per_page, page * per_page), total: items.length, page, per_page };
}

export function historyCSV(filters) {
  const columns = ["id", "filename", "model", "label", "confidence", "inference_ms", "created_at"];
  const { items } = queryHistory({ ...filters, per_page: Number.MAX_SAFE_INTEGER });
  const cell = value => {
    let text = String(value);
    if (/^\s*[=+@-]/.test(text)) text = "'" + text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return "\ufeff" + [columns, ...items.map(item => columns.map(key => item[key]))]
    .map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
