import { useEffect, useRef, useState } from "react";
import { errorMessage, number } from "../api.js";
import { historyCSV, queryHistory } from "../history.js";
import { Loading, Message } from "../components/Feedback.jsx";
import { ModelSelect } from "../components/ModelSelect.jsx";
import { PredictionsTable } from "../components/PredictionsTable.jsx";
import { DeletePredictionDialog } from "../components/DeletePredictionDialog.jsx";

export default function History({ revision, models, onDetail, onChange }) {
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
    const filters = {
      search: debounced,
      label,
      model,
      page,
      per_page: 10,
    };
    Promise.resolve().then(() => queryHistory(filters))
      .then((result) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(result.total / result.per_page));
        if (page > lastPage) {
          setPage(lastPage);
        } else {
          setData(result);
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(errorMessage(failure));
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
      const csv = historyCSV({ search: debounced, label, model });
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
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
            <h2 id="history-title" ref={historyHeading} tabIndex="-1">
              Analisis tersimpan
            </h2>
            <p>
              {data
                ? `${number(data.total)} hasil${filtered ? " sesuai filter" : ""}`
                : "Memuat jumlah hasil…"}
            </p>
            <p>Riwayat disimpan di browser ini. Menghapus data situs akan menghapus riwayat dan citra tersimpan.</p>
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
            setSuccess(
              `Riwayat ${item.filename} dan citra tersimpannya berhasil dihapus.`,
            );
            onChange();
            historyHeading.current?.focus();
          }}
        />
      )}
    </div>
  );
}
