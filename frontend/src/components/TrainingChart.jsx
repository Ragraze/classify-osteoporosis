import { useEffect, useId, useRef, useState } from "react";
import { number, percent } from "../api.js";

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
        setSize((previous) =>
          Math.abs(previous.width - width) < 1 &&
          Math.abs(previous.height - height) < 1
            ? previous
            : { width, height },
        );
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
