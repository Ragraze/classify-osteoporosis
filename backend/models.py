import csv
import importlib.util
import math
from pathlib import Path
from threading import Lock
from time import perf_counter

VARIANTS = {"nano": "n", "small": "s", "medium": "m", "large": "l", "xlarge": "x"}


def training_path(root, variant):
    return Path(root) / "research" / f"train-{variant}"


class ModelUnavailable(RuntimeError):
    pass


def weight_path(root, variant):
    cached = Path(root) / ".models" / f"{variant}.pt"
    return (
        cached
        if cached.is_file()
        else training_path(root, variant) / "weights" / "best.pt"
    )


def is_weight_file(path):
    if not path.is_file() or path.stat().st_size < 1024:
        return False
    with path.open("rb") as stream:
        return not stream.read(64).startswith(
            b"version https://git-lfs.github.com/spec/"
        )


def runtime_installed():
    return all(
        importlib.util.find_spec(name) is not None
        for name in ("ultralytics", "torch", "torchvision")
    )


def catalog(root):
    installed = runtime_installed()
    models = []
    for variant, suffix in VARIANTS.items():
        rows = []
        csv_path = training_path(root, variant) / "results.csv"
        if csv_path.is_file():
            with csv_path.open(newline="") as stream:
                for original in csv.DictReader(stream):
                    row = {
                        key.strip(): value.strip() for key, value in original.items()
                    }
                    rows.append(
                        {
                            "epoch": int(row["epoch"]),
                            "accuracy": float(row["metrics/accuracy_top1"]),
                            "train_loss": float(row["train/loss"]),
                            "val_loss": float(row["val/loss"]),
                        }
                    )
        best = max(rows, key=lambda row: row["accuracy"], default=None)
        available = is_weight_file(weight_path(root, variant))
        models.append(
            {
                "id": variant,
                "name": f"YOLOv8{suffix}",
                "variant": variant.capitalize(),
                "epochs": len(rows),
                "best_accuracy": best["accuracy"] if best else None,
                "best_epoch": best["epoch"] if best else None,
                "source": f"train-{variant}/results.csv",
                "weights_available": available,
                "ready": available and installed,
                "status": (
                    "ready"
                    if available and installed
                    else "missing_runtime" if available else "missing_weights"
                ),
                "series": rows,
                "artifacts": {
                    "confusion_matrix": f"/api/models/{variant}/artifacts/confusion_matrix.png",
                    "results": f"/api/models/{variant}/artifacts/results.png",
                },
            }
        )
    return models


class Predictor:
    def __init__(self, root):
        self.root = Path(root)
        self._model = None
        self._variant = None
        self._lock = Lock()

    def predict(self, image, variant):
        path = weight_path(self.root, variant)
        if not is_weight_file(path):
            raise ModelUnavailable(
                f"Bobot {variant} belum tersedia. Jalankan python scripts/download_models.py --model {variant}."
            )
        if not runtime_installed():
            raise ModelUnavailable(
                "Runtime inferensi belum tersedia. Instal requirements.txt pada virtual environment backend."
            )

        with self._lock:
            try:
                from ultralytics import YOLO

                if self._variant != variant:
                    self._model = YOLO(str(path), task="classify")
                    self._variant = variant
                start = perf_counter()
                result = self._model.predict(
                    image, imgsz=512, device="cpu", verbose=False
                )[0]
                elapsed = round((perf_counter() - start) * 1000, 2)
                if result.probs is None:
                    raise ValueError(
                        "Model tidak mengembalikan probabilitas klasifikasi."
                    )
                values = result.probs.data.cpu().tolist()
                names = result.names
                probabilities = {
                    str(names[index]).lower(): float(value)
                    for index, value in enumerate(values)
                }
                if set(probabilities) != {"normal", "osteoporosis"}:
                    raise ValueError("Kelas model harus normal dan osteoporosis.")
                if any(
                    not math.isfinite(value) or not 0 <= value <= 1
                    for value in probabilities.values()
                ):
                    raise ValueError("Probabilitas model tidak valid.")
                label = max(probabilities, key=probabilities.get)
                return {
                    "label": label,
                    "confidence": probabilities[label],
                    "probabilities": probabilities,
                    "inference_ms": elapsed,
                }
            except Exception as error:
                self._model = None
                self._variant = None
                raise ModelUnavailable(
                    "Model gagal dijalankan. Periksa kompatibilitas bobot dan runtime pada log backend."
                ) from error
