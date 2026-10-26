import { className, dateTime, modelName, number, percent } from "../api.js";
import { Label } from "./Label.jsx";

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
