import { useEffect, useRef, useState } from "react";
import { errorMessage, number, requestJSON } from "../api.js";
import { Loading, Message } from "../components/Feedback.jsx";
import { ModelSelect } from "../components/ModelSelect.jsx";
import { Result } from "../components/Result.jsx";
import { savePrediction } from "../history.js";

export default function Analysis({ models, onPrediction }) {
  const input = useRef(null);
  const selection = useRef(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState("nano");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const model = models.find((item) => item.id === selected);
  const previewURL = preview?.file === file ? preview.url : "";
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const chooseFile = async (next) => {
    if (!next || busy) return;
    const currentSelection = ++selection.current;
    setFile(null);
    setResult(null);
    setError("");
    if (
      (!["image/png", "image/jpeg"].includes(next.type) &&
        !/\.(png|jpe?g)$/i.test(next.name)) ||
      next.size > 10 * 1024 * 1024 ||
      !next.size
    ) {
      setError("Gunakan citra PNG atau JPG/JPEG berukuran maksimal 10 MB.");
      return;
    }
    try {
      const header = new Uint8Array(await next.slice(0, 12).arrayBuffer());
      if (currentSelection !== selection.current) return;
      const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      const isPNG =
        header.length >= png.length &&
        png.every((byte, index) => header[index] === byte);
      const isJPEG =
        header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      if (!isPNG && !isJPEG) {
        setError(
          "File citra rusak atau tidak berisi gambar. Pilih salinan aslinya.",
        );
        return;
      }
      setFile(next);
    } catch {
      if (currentSelection === selection.current) {
        setError("File citra tidak dapat dibaca. Pilih ulang file aslinya.");
      }
    }
  };
  const reset = () => {
    selection.current += 1;
    setFile(null);
    setResult(null);
    setError("");
    if (input.current) input.current.value = "";
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!file || busy || !model?.ready) return;
    setBusy(true);
    setError("");
    setResult(null);
    const payload = new FormData();
    payload.append("image", file);
    payload.append("model", selected);
    try {
      const prediction = await requestJSON("/api/predictions", {
        method: "POST",
        body: payload,
      });
      savePrediction(prediction);
      setResult(prediction);
      onPrediction();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-content">
      <div className="analysis-grid">
        <section className="panel upload-panel" aria-labelledby="upload-title">
          <header className="panel-heading">
            <div>
              <h2 id="upload-title">Citra untuk dianalisis</h2>
              <p>PNG atau JPG/JPEG · maksimal 10 MB</p>
            </div>
            {file && (
              <button className="text-button" onClick={reset} disabled={busy}>
                Hapus pilihan
              </button>
            )}
          </header>
          <form onSubmit={submit}>
            <input
              ref={input}
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg"
              aria-label="Pilih citra X-ray"
              tabIndex="-1"
              onChange={(event) => {
                const next = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                chooseFile(next);
              }}
              disabled={busy}
            />
            <div
              className={`dropzone ${file && previewURL ? "has-image" : ""} ${dragging ? "dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (event.dataTransfer.files.length > 1) {
                  setError("Pilih satu citra untuk setiap analisis.");
                  return;
                }
                chooseFile(event.dataTransfer.files[0]);
              }}
            >
              {file && previewURL ? (
                <>
                  <img
                    className="xray-preview"
                    src={previewURL}
                    alt={`Pratinjau ${file.name}`}
                    onError={() => {
                      setError(
                        "Citra rusak atau tidak lengkap. Pilih salinan aslinya.",
                      );
                      setFile(null);
                    }}
                  />
                  <div className="image-caption">
                    <span>{file.name}</span>
                    <span>{number(file.size / 1024)} KB</span>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <h3>Letakkan citra di sini</h3>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => input.current.click()}
                  >
                    Pilih citra
                  </button>
                </div>
              )}
            </div>
            {file && (
              <button
                type="button"
                className="text-button replace-file"
                disabled={busy}
                onClick={() => {
                  input.current.value = "";
                  input.current.click();
                }}
              >
                Ganti citra
              </button>
            )}
            <div className="analysis-controls">
              <ModelSelect
                models={models}
                value={selected}
                onChange={(value) => {
                  setSelected(value);
                  setResult(null);
                }}
                label="Model klasifikasi"
                readyOnly
                disabled={busy}
              />
              <button
                className="button primary"
                type="submit"
                disabled={!file || busy || !model?.ready}
              >
                {busy ? "Menganalisis…" : "Jalankan analisis"}
              </button>
            </div>
            {!model?.ready && (
              <Message kind="info">Model belum siap. Pilih model lain.</Message>
            )}
            {error && <Message>{error}</Message>}
            {busy && <Loading>Menjalankan {model.name}…</Loading>}
          </form>
        </section>
        <section className="panel result-panel" aria-labelledby="result-title">
          <header className="panel-heading">
            <div>
              <h2 id="result-title">Hasil klasifikasi</h2>
              {result && <p role="status">Analisis tersimpan.</p>}
            </div>
          </header>
          {result ? (
            <>
              <Result item={result} />
              <a className="button secondary" href="#riwayat">
                Lihat riwayat
              </a>
            </>
          ) : (
            <div className="empty-state result-empty">
              <h3>
                {busy ? "Citra sedang dianalisis" : "Hasil akan tampil di sini"}
              </h3>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
