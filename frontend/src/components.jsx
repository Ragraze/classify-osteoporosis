import { useEffect, useId, useRef, useState } from "react";
import { className, dateTime, errorMessage, modelName, number, percent, requestJSON } from "./api.js";

export function NavigationIcon({ page }) {
  const paths = {
    dataset: <><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M3 9h18" /></>,
    analisis: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
    evaluasi: <><path d="M4 3v17h17M8 15l4-5 4 2 5-7" /></>,
    riwayat: <><path d="M3 10a9 9 0 1 1 2.5 8M3 4v6h6" /><path d="M12 7v5l3 2" /></>,
  };
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[page]}
    </svg>
  );
}

export function Message({ children, onRetry, kind = "error" }) {
  return (
    <div
      className={`message ${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <p>{children}</p>
      {onRetry && (
        <button className="button secondary" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Loading({ children = "Memuat data…" }) {
  return (
    <div className="loading-state" role="status">
      <progress aria-label={children} />
      <p>{children}</p>
    </div>
  );
}

export function Label({ value }) {
  return <span className={`class-label ${value}`}>{className(value)}</span>;
}

export function ModelSelect({
  models,
  value,
  onChange,
  label = "Model",
  readyOnly = false,
  disabled = false,
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {models.map((model) => (
          <option
            key={model.id}
            value={model.id}
            disabled={readyOnly && !model.ready}
          >
            {model.name} · {model.variant}
            {readyOnly && !model.ready ? " (belum siap)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TrainingChart({ model, metric = "accuracy" }) {
  const titleId = useId();
  const descId = useId();
  const chart = useRef(null);
  const [size, setSize] = useState({ width: 760, height: 260 });
  const [cursor, setCursor] = useState(null);
  useEffect(() => {
    const element = chart.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize((previous) => Math.abs(previous.width - width) < 1 && Math.abs(previous.height - height) < 1 ? previous : { width, height });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [model.id]);
  useEffect(() => setCursor(null), [model.id, metric]);
  const rows = model.series;
  if (!rows.length)
    return (
      <p className="empty-copy">Seri pelatihan model ini belum tersedia.</p>
    );
  const accuracy = metric === "accuracy";
  const keys = accuracy ? ["accuracy"] : ["train_loss", "val_loss"];
  const max = accuracy
    ? 1
    : Math.max(...rows.flatMap((row) => keys.map((key) => row[key])), 0.01) *
      1.1;
  const { width, height } = size;
  const left = 52,
    right = 20,
    top = 16,
    bottom = 38;
  const x = (index) =>
    left + (index / Math.max(rows.length - 1, 1)) * (width - left - right);
  const y = (value) =>
    height - bottom - (value / max) * (height - top - bottom);
  const selected = Math.min(
    cursor ?? rows.findIndex((row) => row.epoch === model.best_epoch),
    rows.length - 1,
  );
  const current = rows[Math.max(selected, 0)];
  const display = (value) => (accuracy ? percent(value, 0) : number(value));
  const path = (key) =>
    rows
      .map((row, index) => `${index ? "L" : "M"} ${x(index)} ${y(row[key])}`)
      .join(" ");
  const ticks = [
    ...new Set([0, Math.round((rows.length - 1) / 2), rows.length - 1]),
  ];
  const move = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio =
      (((event.clientX - rect.left) / rect.width) * width - left) /
      (width - left - right);
    setCursor(
      Math.max(
        0,
        Math.min(rows.length - 1, Math.round(ratio * (rows.length - 1))),
      ),
    );
  };
  return (
    <div className="training-chart">
      <div className="chart-readout" aria-live="polite">
        <span>Epoch {current.epoch}</span>
        {accuracy ? (
          <strong>
            {percent(current.accuracy)} <span>akurasi validasi</span>
          </strong>
        ) : (
          <strong>
            {number(current.val_loss)} <span>loss validasi</span>
          </strong>
        )}
      </div>
      <svg
        ref={chart}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        onPointerMove={move}
      >
        <title id={titleId}>
          {accuracy ? "Akurasi validasi" : "Loss pelatihan dan validasi"}{" "}
          {model.name} per epoch
        </title>
        <desc id={descId}>
          Sumber {model.source}. {rows.length} epoch. Akurasi validasi terbaik{" "}
          {percent(model.best_accuracy)}, pada epoch {model.best_epoch}. Data
          lengkap tersedia pada tabel di bawah grafik.
        </desc>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1={left}
              y1={y(fraction * max)}
              x2={width - right}
              y2={y(fraction * max)}
              className="chart-grid"
            />
            <text x={left - 12} y={y(fraction * max) + 4} textAnchor="end">
              {display(fraction * max)}
            </text>
          </g>
        ))}
        {ticks.map((index) => (
          <text key={index} x={x(index)} y={height - 12} textAnchor="middle">
            {rows[index].epoch}
          </text>
        ))}
        {accuracy && (
          <path
            d={`${path("accuracy")} L ${x(rows.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`}
            className="chart-area"
          />
        )}
        {keys.map((key, index) => (
          <path
            key={key}
            d={path(key)}
            className={`chart-line ${index ? "alternate" : ""}`}
          />
        ))}
        <line
          x1={x(Math.max(selected, 0))}
          x2={x(Math.max(selected, 0))}
          y1={top}
          y2={height - bottom}
          className="chart-cursor"
        />
        <circle
          cx={x(Math.max(selected, 0))}
          cy={y(current[keys[0]])}
          r="5"
          className="chart-point"
        />
      </svg>
      <div className="chart-axis-labels">
        <span>{accuracy ? "Akurasi top-1 (%)" : "Loss"}</span>
        <span>Epoch, mulai dari {rows[0].epoch}</span>
      </div>
      {!accuracy && (
        <div className="chart-legend">
          <span>Garis utuh: pelatihan</span>
          <span>Garis putus: validasi</span>
        </div>
      )}
      <label className="chart-slider">
        <span>Epoch yang ditinjau</span>
        <input
          type="range"
          min="0"
          max={rows.length - 1}
          value={Math.max(selected, 0)}
          onChange={(event) => setCursor(Number(event.target.value))}
        />
        <output>{current.epoch}</output>
      </label>
      <details className="data-disclosure">
        <summary>Lihat data per epoch</summary>
        <div
          className="table-scroll"
          tabIndex="0"
          role="region"
          aria-label="Data pelatihan per epoch"
        >
          <table>
            <caption className="sr-only">
              Metrik pelatihan {model.name}, sumber {model.source}
            </caption>
            <thead>
              <tr>
                <th>Epoch</th>
                <th>Akurasi validasi</th>
                <th>Loss pelatihan</th>
                <th>Loss validasi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.epoch}>
                  <td>{row.epoch}</td>
                  <td>{percent(row.accuracy)}</td>
                  <td>{row.train_loss}</td>
                  <td>{row.val_loss}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

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

export function Result({ item }) {
  return (
    <div className="result-content">
      <span className="subtle">Kelas prediksi</span>
      <h3 className="result-class">
        <Label value={item.label} />
      </h3>
      <div className="confidence-value">
        {percent(item.confidence)}
        <span>skor model</span>
      </div>
      <div className="probabilities">
        {["normal", "osteoporosis"].map((label) => (
          <div key={label}>
            <div>
              <span>{className(label)}</span>
              <strong>{percent(item.probabilities[label])}</strong>
            </div>
            <meter
              min="0"
              max="1"
              value={item.probabilities[label]}
              aria-label={`Skor kelas ${className(label)}`}
            />
          </div>
        ))}
      </div>
      <dl className="result-meta">
        <div>
          <dt>Model</dt>
          <dd>{modelName(item.model)}</dd>
        </div>
        <div>
          <dt>Inferensi</dt>
          <dd>{number(item.inference_ms)} ms</dd>
        </div>
        <div>
          <dt>Dimensi citra</dt>
          <dd>
            {item.width} × {item.height} px
          </dd>
        </div>
        <div>
          <dt>Tersimpan</dt>
          <dd>{dateTime(item.created_at)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function DetailDialog({ item, onClose }) {
  const dialog = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (item && !dialog.current.open) dialog.current.showModal();
    if (!item && dialog.current.open) dialog.current.close();
  }, [item]);
  return (
    <dialog
      ref={dialog}
      className="detail-dialog"
      onClose={onClose}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      {item && (
        <>
          <header>
            <div>
              <h2 id={titleId}>{item.filename}</h2>
            </div>
            <button
              className="button secondary"
              onClick={() => dialog.current.close()}
            >
              Tutup
            </button>
          </header>
          <div className="detail-body">
            <div className="detail-image">
              <img
                src={item.image_url}
                alt={`Citra yang dianalisis: ${item.filename}`}
              />
            </div>
            <Result item={item} />
          </div>
        </>
      )}
    </dialog>
  );
}

export function DeletePredictionDialog({ item, onClose, onDeleted }) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dialog.current.showModal();
  }, []);

  const close = () => {
    dialog.current.close();
    onClose();
  };

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    setError("");
    try {
      await requestJSON(`/api/predictions/${item.id}`, { method: "DELETE" });
      dialog.current.close();
      onDeleted(item);
    } catch (failure) {
      setError(errorMessage(failure));
      setDeleting(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      className="detail-dialog delete-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={deleting}
      onCancel={(event) => {
        event.preventDefault();
        if (!deleting) close();
      }}
    >
      <h2 id={titleId}>Hapus riwayat analisis?</h2>
      <p id={descriptionId}>
        Hasil analisis <strong>{item.filename}</strong> dan citra tersimpannya
        akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
      </p>
      {error && <Message>{error}</Message>}
      <div className="dialog-actions">
        <button className="button secondary" autoFocus disabled={deleting} onClick={close}>
          Batal
        </button>
        <button className="button danger" disabled={deleting} onClick={remove}>
          {deleting ? "Menghapus…" : "Hapus riwayat"}
        </button>
      </div>
      {deleting && <p role="status" className="subtle">Menghapus riwayat dan citra tersimpan…</p>}
    </dialog>
  );
}
