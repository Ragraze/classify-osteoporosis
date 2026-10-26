import { useEffect, useState } from "react";
import { errorMessage, number, requestJSON } from "../api.js";
import { Loading, Message } from "../components/Feedback.jsx";

export default function Dataset({ label }) {
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
    <section
      className="panel dataset-panel"
      aria-labelledby={`dataset-${label}-title`}
    >
      <header className="panel-heading">
        <div>
          <h2 id={`dataset-${label}-title`}>{title}</h2>
          <p>
            {data
              ? `${number(data.total)} citra${data.unreadable ? ` · ${number(data.unreadable)} tidak terbaca` : ""}`
              : "Memuat citra…"}
          </p>
        </div>
      </header>
      {error && (
        <Message onRetry={() => setAttempt((value) => value + 1)}>
          {error}
        </Message>
      )}
      {loading ? (
        <Loading>Memuat citra dataset…</Loading>
      ) : (
        data &&
        (data.items.length ? (
          <ul className="dataset-grid">
            {data.items.map((item) => (
              <DatasetCard key={item.filename} item={item} label={title} />
            ))}
          </ul>
        ) : (
          <p className="empty-copy">
            Belum ada citra {title} yang dapat ditampilkan.
          </p>
        ))
      )}
      {data?.total > data?.per_page && (
        <div className="pagination">
          <span>
            Halaman {page} dari {Math.ceil(data.total / data.per_page)}
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
              disabled={page * data.per_page >= data.total || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Berikutnya
            </button>
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
      {failed ? (
        <div className="dataset-unavailable">Citra tidak dapat dimuat.</div>
      ) : (
        <a
          className="dataset-image"
          href={item.image_url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Buka citra ${label}: ${item.filename}`}
        >
          <img
            src={`${item.image_url}?thumbnail=1`}
            alt={`Citra ${label}: ${item.filename}`}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </a>
      )}
      <div className="dataset-caption">
        <strong>{item.filename}</strong>
        <span>
          {item.width} × {item.height} px
        </span>
      </div>
    </li>
  );
}
