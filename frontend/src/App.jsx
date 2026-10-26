import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, number, percent, requestJSON } from "./api.js";
import {
  DetailDialog,
  DeletePredictionDialog,
  Loading,
  Message,
  ModelSelect,
  NavigationIcon,
  PredictionsTable,
  Result,
  TrainingChart,
} from "./components.jsx";

const pages = [
  { id: "evaluasi", title: "Evaluasi model" },
  { id: "dataset", title: "Dataset" },
  { id: "analisis", title: "Analisis citra" },
  { id: "riwayat", title: "Riwayat" },
];

const datasetRoutes = ["dataset-normal", "dataset-osteoporosis"];
const validRoute = (route) => pages.some((page) => page.id === route) || datasetRoutes.includes(route);

function getRoute() {
  const hash = window.location.hash.slice(1);
  if (datasetRoutes.includes(hash)) return "dataset";
  return validRoute(hash) ? hash : "analisis";
}

export default function App() {
  const [requestedRoute, setRoute] = useState(getRoute);
  const route = datasetRoutes.includes(requestedRoute) ? "dataset" : validRoute(requestedRoute) ? requestedRoute : "analisis";
  const page = pages.find((item) => item.id === route) || pages.find((item) => item.id === "dataset");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const heading = useRef(null);
  const sidebar = useRef(null);
  const workspace = useRef(null);
  const compactHeader = useRef(null);
  const menuToggle = useRef(null);
  const restoreMenuFocus = useRef(true);
  const previousRoute = useRef(route);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 879px)");
    const onResize = () => { if (!media.matches) setMenuOpen(false); };
    media.addEventListener("change", onResize);
    return () => media.removeEventListener("change", onResize);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const content = workspace.current;
    const header = compactHeader.current;
    const panel = sidebar.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    content.inert = true;
    header.inert = true;
    const focusable = () => [...panel.querySelectorAll('a[href], button:not(:disabled)')];
    (panel.querySelector('a[aria-current="page"]') || focusable()[0])?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        restoreMenuFocus.current = true;
        setMenuOpen(false);
      }
      if (event.key === "Tab") {
        const controls = focusable();
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      content.inert = false;
      header.inert = false;
      if (restoreMenuFocus.current) menuToggle.current?.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  const closeMenu = () => {
    restoreMenuFocus.current = true;
    setMenuOpen(false);
  };
  const navigate = () => {
    window.scrollTo({ top: 0 });
    if (menuOpen) {
      restoreMenuFocus.current = false;
      setMenuOpen(false);
      requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    }
  };

  useEffect(() => {
    const onHash = () => {
      setRoute(getRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    document.title = `${page.title} · Classify Osteoporosis`;
    if (previousRoute.current !== route) {
      heading.current?.focus({ preventScroll: true });
      previousRoute.current = route;
    }
  }, [route]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    requestJSON("/api/dashboard", { signal: controller.signal })
      .then(setData)
      .catch((failure) => {
        if (failure.name !== "AbortError") setError(errorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  const onPrediction = () => {
    reload();
    setAnnouncement("Analisis selesai dan tersimpan di riwayat.");
  };
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          heading.current?.focus();
          heading.current?.scrollIntoView({ block: "start" });
        }}
      >
        Lewati navigasi
      </a>
      <header className="compact-header" ref={compactHeader}>
        <button
          className="menu-toggle"
          ref={menuToggle}
          aria-label="Buka menu navigasi"
          aria-controls="primary-sidebar"
          aria-expanded={menuOpen}
          onClick={() => {
            restoreMenuFocus.current = true;
            setMenuOpen(true);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M5 6h14M5 12h14M5 18h14" />
          </svg>
        </button>
        <span>Classify Osteoporosis</span>
      </header>
      {menuOpen && <div className="menu-backdrop" aria-hidden="true" onClick={closeMenu} />}
      <aside
        className={`sidebar${menuOpen ? " is-open" : ""}`}
        id="primary-sidebar"
        ref={sidebar}
        role={menuOpen ? "dialog" : undefined}
        aria-modal={menuOpen ? true : undefined}
        aria-label="Menu navigasi"
      >
        <button className="sidebar-close" aria-label="Tutup menu navigasi" onClick={closeMenu}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        <a className="wordmark" href="#analisis" onClick={navigate}>
          <span>Classify</span>
          <span>Osteoporosis</span>
        </a>
        <nav aria-label="Navigasi utama">
          {pages.map((item) => (
            <div className="nav-group" key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={navigate}
              aria-current={route === item.id ? "page" : undefined}
            >
              <span className="nav-label">
                <NavigationIcon page={item.id} />
                <span>{item.title}</span>
              </span>
              {item.id === "riwayat" && data && (
                <span className="nav-count">{number(data.total)}</span>
              )}
            </a>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>Metode penelitian</span>
          <strong>YOLOv8</strong>
          <p>Klasifikasi citra digital lutut kaki</p>
        </div>
      </aside>
      <div className="workspace" ref={workspace}>
        <main id="main-content">
          <div className={route === "analisis" ? "sr-only" : "page-heading"}>
            <h1 ref={heading} tabIndex="-1">{page.title}</h1>
          </div>
          {error && <Message onRetry={reload}>{error}</Message>}
          {!data && loading && <Loading />}
          {data && (
            <>
              <div className="page-content" hidden={route !== "analisis"}>
                <Analysis models={data.models} onPrediction={onPrediction} />
              </div>
              {route === "evaluasi" && <Evaluation models={data.models} />}
              {route === "dataset" && (
                <div className="page-content">
                  <Dataset label="normal" />
                  <Dataset label="osteoporosis" />
                </div>
              )}
              {route === "riwayat" && (
                <History
                  revision={revision}
                  models={data.models}
                  onDetail={setDetail}
                  onChange={reload}
                />
              )}
            </>
          )}
        </main>
      </div>
      <div className="sr-only" role="status">
        {announcement}
      </div>
      <DetailDialog item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function Dataset({ label }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const title = label === "normal" ? "Normal" : "Osteoporosis";

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ label, page, per_page: 12 });
    requestJSON(`/api/dataset?${params}`, { signal: controller.signal })
      .then((result) => {
        const lastPage = Math.max(1, Math.ceil(result.total / result.per_page));
        if (page > lastPage) setPage(lastPage);
        else setData(result);
      })
      .catch((failure) => {
        if (failure.name !== "AbortError") setError(errorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [label, page, attempt]);

  return (
    <section className="panel dataset-panel" aria-labelledby={`dataset-${label}-title`}>
      <header className="panel-heading">
        <div>
          <h2 id={`dataset-${label}-title`}>{title}</h2>
          <p>
            {data ? `${number(data.total)} citra${data.unreadable ? ` · ${number(data.unreadable)} tidak terbaca` : ""}` : "Memuat citra…"}
          </p>
        </div>
      </header>
      {error && <Message onRetry={() => setAttempt((value) => value + 1)}>{error}</Message>}
      {loading ? <Loading>Memuat citra dataset…</Loading> : data && (
        data.items.length ? (
          <ul className="dataset-grid">
            {data.items.map((item) => <DatasetCard key={item.filename} item={item} label={title} />)}
          </ul>
        ) : <p className="empty-copy">Belum ada citra {title} yang dapat ditampilkan.</p>
      )}
      {data?.total > data?.per_page && (
        <div className="pagination">
          <span>Halaman {page} dari {Math.ceil(data.total / data.per_page)}</span>
          <div>
            <button className="button secondary" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button>
            <button className="button secondary" disabled={page * data.per_page >= data.total || loading} onClick={() => setPage((value) => value + 1)}>Berikutnya</button>
          </div>
        </div>
      )}
    </section>
  );
}

function DatasetCard({ item, label }) {
  const [failed, setFailed] = useState(false);
  return (
    <li className="dataset-card">
      {failed ? <div className="dataset-unavailable">Citra tidak dapat dimuat.</div> : (
        <a className="dataset-image" href={item.image_url} target="_blank" rel="noreferrer" aria-label={`Buka citra ${label}: ${item.filename}`}>
          <img src={`${item.image_url}?thumbnail=1`} alt={`Citra ${label}: ${item.filename}`} loading="lazy" onError={() => setFailed(true)} />
        </a>
      )}
      <div className="dataset-caption">
        <strong>{item.filename}</strong>
        <span>{item.width} × {item.height} px</span>
      </div>
    </li>
  );
}

function Analysis({ models, onPrediction }) {
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
      const isPNG = header.length >= png.length && png.every((byte, index) => header[index] === byte);
      const isJPEG = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      if (!isPNG && !isJPEG) {
        setError("File citra rusak atau tidak berisi gambar. Pilih salinan aslinya.");
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
              <Message kind="info">
                Model belum siap. Pilih model lain.
              </Message>
            )}
            {error && <Message>{error}</Message>}
            {busy && (
              <Loading>
                Menjalankan {model.name}…
              </Loading>
            )}
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

function Evaluation({ models }) {
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
      <section className="summary-strip evaluation-summary" aria-label={`Ringkasan ${model.name}`}>
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

function History({ revision, models, onDetail, onChange }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [label, setLabel] = useState("");
  const [model, setModel] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [deletingItem, setDeletingItem] = useState(null);
  const [success, setSuccess] = useState("");
  const historyHeading = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      search: debounced,
      label,
      model,
      page,
      per_page: 10,
    });
    requestJSON(`/api/predictions?${params}`, { signal: controller.signal })
      .then((result) => {
        const lastPage = Math.max(1, Math.ceil(result.total / result.per_page));
        if (page > lastPage) {
          setPage(lastPage);
        } else {
          setData(result);
        }
      })
      .catch((failure) => {
        if (failure.name !== "AbortError") setError(errorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debounced, label, model, page, revision, attempt]);
  const exportCSV = async () => {
    setExporting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/predictions/export?${new URLSearchParams({ search: debounced, label, model })}`,
        { signal: AbortSignal.timeout(30000) },
      );
      if (!response.ok) throw new Error("Ekspor CSV gagal. Coba lagi.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "riwayat-analisis.csv";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setExporting(false);
    }
  };
  const filtered = Boolean(debounced || label || model);
  const clear = () => {
    setSearch("");
    setDebounced("");
    setLabel("");
    setModel("");
    setPage(1);
  };
  return (
    <div className="page-content">
      <section className="panel history-panel" aria-labelledby="history-title">
        <header className="panel-heading">
          <div>
            <h2 id="history-title" ref={historyHeading} tabIndex="-1">Analisis tersimpan</h2>
            <p>
              {data
                ? `${number(data.total)} hasil${filtered ? " sesuai filter" : ""}`
                : "Memuat jumlah hasil…"}
            </p>
          </div>
          <button
            className="button secondary"
            disabled={
              !data?.total || loading || exporting || search !== debounced
            }
            onClick={exportCSV}
          >
            {exporting ? "Mengekspor…" : "Ekspor CSV"}
          </button>
        </header>
        <div className="history-filters">
          <label className="field search-field">
            <span>Cari citra</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Nama berkas atau ID analisis"
            />
          </label>
          <label className="field">
            <span>Kelas prediksi</span>
            <select
              value={label}
              onChange={(event) => {
                setLabel(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua kelas</option>
              <option value="normal">Normal</option>
              <option value="osteoporosis">Osteoporosis</option>
            </select>
          </label>
          <label className="field">
            <span>Model riwayat</span>
            <select
              value={model}
              onChange={(event) => {
                setModel(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua model</option>
              {models.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <Message onRetry={() => setAttempt((value) => value + 1)}>
            {error}
          </Message>
        )}
        {success && <Message kind="success">{success}</Message>}
        {loading ? (
          <Loading>Memuat riwayat analisis…</Loading>
        ) : (
          data && (
            <PredictionsTable
              items={data.items}
              onDetail={onDetail}
              onDelete={(item) => {
                setSuccess("");
                setDeletingItem(item);
              }}
              filtered={filtered}
              emptyAction={
                filtered ? (
                  <button className="button secondary" onClick={clear}>
                    Hapus filter
                  </button>
                ) : (
                  <a className="button secondary" href="#analisis">
                    Analisis citra pertama
                  </a>
                )
              }
            />
          )
        )}
        {data?.total > 0 && (
          <div className="pagination">
            <span>
              Halaman {page} dari {Math.max(1, Math.ceil(data.total / 10))}
            </span>
            <div>
              <button
                className="button secondary"
                disabled={page === 1 || loading}
                onClick={() => setPage((value) => value - 1)}
              >
                Sebelumnya
              </button>
              <button
                className="button secondary"
                disabled={page * 10 >= data.total || loading}
                onClick={() => setPage((value) => value + 1)}
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </section>
      {deletingItem && (
        <DeletePredictionDialog
          item={deletingItem}
          onClose={() => setDeletingItem(null)}
          onDeleted={(item) => {
            setDeletingItem(null);
            setSuccess(`Riwayat ${item.filename} dan citra tersimpannya berhasil dihapus.`);
            onChange();
            historyHeading.current?.focus();
          }}
        />
      )}
    </div>
  );
}
