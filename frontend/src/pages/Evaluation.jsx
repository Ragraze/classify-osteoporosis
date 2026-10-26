import { useEffect, useState } from "react";
import { percent } from "../api.js";
import { Message } from "../components/Feedback.jsx";
import { TrainingChart } from "../components/TrainingChart.jsx";

export default function Evaluation({ models }) {
  const [selected, setSelected] = useState("nano");
  const [metric, setMetric] = useState("accuracy");
  const [view, setView] = useState("curve");
  const [failedImage, setFailedImage] = useState(false);
  const model = models.find((item) => item.id === selected) || models[0];
  useEffect(() => setFailedImage(false), [selected, view]);
  return (
    <div className="page-content">
      <div
        className="model-tabs"
        role="group"
        aria-label="Pilih model evaluasi"
      >
        {models.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected(item.id)}
            aria-pressed={selected === item.id}
          >
            <strong>{item.name}</strong>
            <span>{item.variant}</span>
          </button>
        ))}
      </div>
      <div className="evaluation-grid">
        <section className="panel evaluation-panel">
          <header className="panel-heading">
            <div>
              <h2>
                {model.name} · {model.variant}
              </h2>
            </div>
            <div
              className="segmented"
              role="group"
              aria-label="Jenis visualisasi"
            >
              <button
                aria-pressed={view === "curve"}
                onClick={() => setView("curve")}
              >
                Kurva pelatihan
              </button>
              <button
                aria-pressed={view === "matrix"}
                onClick={() => setView("matrix")}
              >
                Confusion matrix
              </button>
            </div>
          </header>
          {view === "curve" ? (
            <>
              <div
                className="metric-switch"
                role="group"
                aria-label="Metrik grafik"
              >
                <button
                  aria-pressed={metric === "accuracy"}
                  onClick={() => setMetric("accuracy")}
                >
                  Akurasi validasi
                </button>
                <button
                  aria-pressed={metric === "loss"}
                  onClick={() => setMetric("loss")}
                >
                  Loss
                </button>
              </div>
              <TrainingChart model={model} metric={metric} />
            </>
          ) : failedImage ? (
            <Message onRetry={() => setFailedImage(false)}>
              Artefak model tidak dapat dimuat. Periksa koneksi lalu coba lagi.
            </Message>
          ) : (
            <figure className="matrix-figure">
              <img
                src={model.artifacts.confusion_matrix}
                alt={`Confusion matrix ${model.name} untuk kelas normal dan osteoporosis, artefak validasi pelatihan`}
                onError={() => setFailedImage(true)}
              />
            </figure>
          )}
        </section>
        <section
          className="summary-strip evaluation-summary"
          aria-label={`Ringkasan ${model.name}`}
        >
          <div>
            <span>Akurasi validasi terbaik</span>
            <strong>{percent(model.best_accuracy)}</strong>
          </div>
          <div>
            <span>Epoch terbaik</span>
            <strong>{model.best_epoch ?? "Belum ada"}</strong>
          </div>
          <div>
            <span>Epoch tercatat</span>
            <strong>{model.epochs}</strong>
          </div>
        </section>
      </div>
    </div>
  );
}
