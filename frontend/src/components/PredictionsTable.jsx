import { dateTime, modelName, percent } from "../api.js";
import { Label } from "./Label.jsx";

export function PredictionsTable({
  items,
  onDetail,
  onDelete,
  emptyAction,
  filtered = false,
}) {
  if (!items.length)
    return (
      <div className="empty-state compact">
        <h3>
          {filtered
            ? "Tidak ada hasil yang cocok"
            : "Belum ada analisis tersimpan"}
        </h3>
        <p>
          {filtered
            ? "Ubah kata pencarian atau filter untuk melihat hasil lainnya."
            : "Unggah citra untuk memulai."}
        </p>
        {emptyAction}
      </div>
    );
  return (
    <div className={`prediction-list${onDelete ? " with-delete" : ""}`}>
      <div className="prediction-row table-heading" aria-hidden="true">
        <span>Citra</span>
        <span>Kelas prediksi</span>
        <span>Skor model</span>
        <span>Model</span>
        <span>Waktu analisis</span>
        {onDelete && <span>Tindakan</span>}
      </div>
      <ul>
        {items.map((item) => (
          <li className="prediction-row" key={item.id}>
            <button
              className="file-link"
              onClick={() => onDetail(item)}
              aria-label={`Detail ${item.filename}`}
            >
              <img src={item.image_url} alt="" loading="lazy" />
              <span>{item.filename}</span>
            </button>
            <span className="mobile-field">
              <span className="mobile-label">Kelas</span>
              <Label value={item.label} />
            </span>
            <span className="mobile-field numeric">
              <span className="mobile-label">Skor</span>
              {percent(item.confidence)}
            </span>
            <span className="mobile-field">
              <span className="mobile-label">Model</span>
              {modelName(item.model)}
            </span>
            <time dateTime={item.created_at}>{dateTime(item.created_at)}</time>
            {onDelete && (
              <button
                className="text-button danger-text delete-prediction"
                onClick={() => onDelete(item)}
                aria-label={`Hapus ${item.filename}`}
              >
                Hapus
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
