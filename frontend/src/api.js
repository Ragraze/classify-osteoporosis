export async function requestJSON(path, options = {}) {
  const response = await fetch(path, {
    signal: AbortSignal.timeout(120000),
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.error || `Permintaan gagal (${response.status}). Coba lagi.`,
    );
  if (!data)
    throw new Error(
      "Respons server tidak dapat dibaca. Periksa koneksi lalu coba lagi.",
    );
  return data;
}

export function errorMessage(error) {
  if (error.name === "TimeoutError")
    return "Server belum merespons. Tunggu sebentar, lalu perbarui riwayat sebelum mencoba lagi.";
  if (error instanceof TypeError)
    return "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.";
  return error.message || "Permintaan gagal. Coba lagi.";
}

export const percent = (value, digits = 1) =>
  value == null
    ? "Belum ada"
    : new Intl.NumberFormat("id-ID", {
        style: "percent",
        maximumFractionDigits: digits,
      }).format(value);
export const number = (value) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);
export const dateTime = (value) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const className = (value) =>
  value === "normal" ? "Normal" : "Osteoporosis";
export const modelName = (value) =>
  ({
    nano: "YOLOv8n",
    small: "YOLOv8s",
    medium: "YOLOv8m",
    large: "YOLOv8l",
    xlarge: "YOLOv8x",
  })[value] || value;
