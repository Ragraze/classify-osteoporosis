import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, number, requestJSON } from "./api.js";
import { DetailDialog } from "./components/DetailDialog.jsx";
import { Loading, Message } from "./components/Feedback.jsx";
import { NavigationIcon } from "./components/NavigationIcon.jsx";
import { GitHubLink } from "./components/GitHubLink.jsx";
import Analysis from "./pages/Analysis.jsx";
import Dataset from "./pages/Dataset.jsx";
import Evaluation from "./pages/Evaluation.jsx";
import History from "./pages/History.jsx";

const pages = [
  { id: "evaluasi", title: "Evaluasi model" },
  { id: "dataset", title: "Dataset" },
  { id: "analisis", title: "Analisis citra" },
  { id: "riwayat", title: "Riwayat" },
];

const datasetRoutes = ["dataset-normal", "dataset-osteoporosis"];
const validRoute = (route) =>
  pages.some((page) => page.id === route) || datasetRoutes.includes(route);

function getRoute() {
  const hash = window.location.hash.slice(1);
  if (datasetRoutes.includes(hash)) return "dataset";
  return validRoute(hash) ? hash : "analisis";
}

export default function App() {
  const [requestedRoute, setRoute] = useState(getRoute);
  const route = datasetRoutes.includes(requestedRoute)
    ? "dataset"
    : validRoute(requestedRoute)
      ? requestedRoute
      : "analisis";
  const page =
    pages.find((item) => item.id === route) ||
    pages.find((item) => item.id === "dataset");
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
    const onResize = () => {
      if (!media.matches) setMenuOpen(false);
    };
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
    const focusable = () => [
      ...panel.querySelectorAll("a[href], button:not(:disabled)"),
    ];
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
      if (restoreMenuFocus.current)
        menuToggle.current?.focus({ preventScroll: true });
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
      requestAnimationFrame(() =>
        heading.current?.focus({ preventScroll: true }),
      );
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
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 6h14M5 12h14M5 18h14" />
          </svg>
        </button>
        <span>Classify Osteoporosis</span>
      </header>
      {menuOpen && (
        <div className="menu-backdrop" aria-hidden="true" onClick={closeMenu} />
      )}
      <aside
        className={`sidebar${menuOpen ? " is-open" : ""}`}
        id="primary-sidebar"
        ref={sidebar}
        role={menuOpen ? "dialog" : undefined}
        aria-modal={menuOpen ? true : undefined}
        aria-label="Menu navigasi"
      >
        <button
          className="sidebar-close"
          aria-label="Tutup menu navigasi"
          onClick={closeMenu}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
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
            <h1 ref={heading} tabIndex="-1">
              {page.title}
            </h1>
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
        <footer className="repository-footer">
          <GitHubLink />
        </footer>
      </div>
      <div className="sr-only" role="status">
        {announcement}
      </div>
      <DetailDialog item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
