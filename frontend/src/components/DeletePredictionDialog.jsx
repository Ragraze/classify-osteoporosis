import { useEffect, useId, useRef, useState } from "react";
import { errorMessage } from "../api.js";
import { deletePrediction } from "../history.js";
import { Message } from "./Feedback.jsx";

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
      deletePrediction(item.id);
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
        <button
          className="button secondary"
          autoFocus
          disabled={deleting}
          onClick={close}
        >
          Batal
        </button>
        <button className="button danger" disabled={deleting} onClick={remove}>
          {deleting ? "Menghapus…" : "Hapus riwayat"}
        </button>
      </div>
      {deleting && (
        <p role="status" className="subtle">
          Menghapus riwayat dan citra tersimpan…
        </p>
      )}
    </dialog>
  );
}
