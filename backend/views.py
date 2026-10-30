import base64
import io
import logging
import os
import re
import unicodedata
import uuid
import warnings
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, JsonResponse
from django.urls import reverse
from PIL import Image, ImageOps, UnidentifiedImageError

from . import dataset
from .models import (
    VARIANTS,
    ModelUnavailable,
    Predictor,
    catalog,
    runtime_installed,
    training_path,
)

logger = logging.getLogger(__name__)


class APIError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message


def abort(status, description=None):
    raise APIError(status, description or "Halaman atau data tidak ditemukan.")


@lru_cache(maxsize=8)
def initialize_runtime(data, root):
    data = Path(data)
    data.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("YOLO_CONFIG_DIR", str(data / "ultralytics"))
    os.environ.setdefault("MPLCONFIGDIR", str(data / "matplotlib"))
    return Predictor(root)


def runtime():
    return initialize_runtime(settings.DATA_DIR, settings.REPO_ROOT)


def safe_filename(name):
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = name.replace("\\", " ").replace("/", " ")
    return re.sub(r"[^A-Za-z0-9_.-]", "", "_".join(name.split())).strip("._")


def send_file(source, mimetype=None):
    return FileResponse(
        source.open("rb") if isinstance(source, Path) else source, content_type=mimetype
    )


def send_from_directory(directory, filename, mimetype=None):
    root = Path(directory).resolve()
    target = (root / filename).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        abort(404)
    return send_file(target, mimetype)


def health(request):
    return JsonResponse(dict(status="ok", runtime_installed=runtime_installed()))


def models(request):
    return JsonResponse(dict(items=catalog(settings.REPO_ROOT)))


def dataset_images(request):
    label = request.GET.get("label", "normal")
    if label not in dataset.LABELS:
        abort(400, description="Kelas dataset tidak valid.")
    try:
        page = int(request.GET.get("page", 1))
        per_page = int(request.GET.get("per_page", 12))
        if page < 1 or not 1 <= per_page <= 48:
            raise ValueError
    except ValueError:
        abort(
            400,
            description="Halaman harus positif dan jumlah per halaman antara 1 dan 48.",
        )
    items, unreadable = dataset.catalog(settings.DATASET_DIR, label)
    selected = items[(page - 1) * per_page : page * per_page]
    for item in selected:
        item["image_url"] = reverse(
            "dataset_image", kwargs={"label": label, "filename": item["filename"]}
        )
    return JsonResponse(
        dict(
            items=selected,
            label=label,
            total=len(items),
            unreadable=unreadable,
            page=page,
            per_page=per_page,
        )
    )


def dataset_image(request, label, filename):
    path = dataset.find_image(settings.DATASET_DIR, label, filename)
    if path is None:
        abort(404)
    stat = path.stat()
    metadata = dataset.image_metadata(str(path), stat.st_size, stat.st_mtime_ns)
    if metadata is None:
        abort(422, description="File citra rusak atau tidak berisi gambar.")
    if request.GET.get("thumbnail") == "1":
        with Image.open(path) as image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.thumbnail((400, 400))
            output = io.BytesIO()
            image.save(output, "JPEG", quality=85)
        output.seek(0)
        return send_file(output, mimetype="image/jpeg")
    mimetype = "image/png" if metadata["format"] == "PNG" else "image/jpeg"
    return send_file(path, mimetype=mimetype)


def predict(request):
    variant = request.POST.get("model", "nano")
    if variant not in VARIANTS:
        abort(400, description="Pilih salah satu model yang tersedia.")
    file = request.FILES.get("image")
    if file is None or not file.name:
        abort(400, description="Pilih citra PNG atau JPEG terlebih dahulu.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = Image.open(file)
            if image.format not in ("PNG", "JPEG"):
                abort(400, description="Format citra harus PNG atau JPEG.")
            if (
                image.width < 32
                or image.height < 32
                or image.width * image.height > 25_000_000
            ):
                abort(
                    400,
                    description="Dimensi citra minimal 32 × 32 dan maksimal 25 megapiksel.",
                )
            image.load()
            image = ImageOps.exif_transpose(image).convert("RGB")
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        abort(
            400,
            description="Citra tidak dapat dibaca. Gunakan berkas PNG atau JPEG yang valid.",
        )
    predictor = runtime()
    try:
        result = (settings.PREDICTOR or predictor).predict(image, variant)
    except ModelUnavailable as error:
        logger.warning("Inferensi tidak tersedia", exc_info=True)
        return JsonResponse({"error": str(error)}, status=503)

    prediction_id = uuid.uuid4().hex
    item = {
        "id": prediction_id,
        "filename": safe_filename(file.name)[:180] or "citra.png",
        "width": image.width,
        "height": image.height,
        "model": variant,
        **result,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="microseconds"),
    }
    output = io.BytesIO()
    image.save(output, "PNG")
    item["image_url"] = "data:image/png;base64," + base64.b64encode(output.getvalue()).decode("ascii")
    return JsonResponse(item, status=201)


def artifact(request, variant, filename):
    if variant not in VARIANTS or filename not in (
        "confusion_matrix.png",
        "results.png",
    ):
        abort(404)
    return send_from_directory(training_path(settings.REPO_ROOT, variant), filename)


def frontend(request, path=""):
    if path == "api" or path.startswith("api/"):
        abort(404)
    dist = Path(settings.FRONTEND_DIR)
    if not (dist / "index.html").is_file():
        return JsonResponse(
            {
                "message": "Backend aktif. Jalankan frontend dengan npm run dev atau buat build frontend terlebih dahulu."
            }
        )
    if (
        path
        and (dist / path).is_file()
        and (dist / path).resolve().is_relative_to(dist.resolve())
    ):
        return send_from_directory(dist, path)
    return send_file(dist / "index.html")
