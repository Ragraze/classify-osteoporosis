import { useEffect, useId, useRef } from "react";
import { Result } from "./Result.jsx";

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
