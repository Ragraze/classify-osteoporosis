import csv
import io
import os
import uuid
import warnings
from datetime import datetime, timezone
from pathlib import Path

from flask import (
    Flask,
    Response,
    abort,
    jsonify,
    request,
    send_file,
    send_from_directory,
    url_for,
)
from PIL import Image, ImageOps, UnidentifiedImageError
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename

from . import dataset, storage
from .api_docs import docs
from .models import (
    VARIANTS,
    ModelUnavailable,
    Predictor,
    catalog,
    runtime_installed,
    training_path,
)


def create_app(test_config=None):
    root = Path(__file__).resolve().parent.parent
    instance = Path(
        os.environ.get("OSTEO_INSTANCE_PATH", str(root / "instance"))
    ).resolve()
    app = Flask(__name__, static_folder=None, instance_path=str(instance))
    app.register_blueprint(docs)
    app.config.from_mapping(
        MAX_CONTENT_LENGTH=10 * 1024 * 1024,
        MAX_FORM_MEMORY_SIZE=512 * 1024,
        MAX_FORM_PARTS=8,
        DATA_DIR=instance,
        REPO_ROOT=root,
        FRONTEND_DIR=root / "frontend" / "dist",
        DATASET_DIR=root / "dataset",
    )
    if test_config:
        app.config.update(test_config)
    data = Path(app.config["DATA_DIR"])
    data.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("YOLO_CONFIG_DIR", str(data / "ultralytics"))
    os.environ.setdefault("MPLCONFIGDIR", str(data / "matplotlib"))
    uploads = data / "uploads"
    uploads.mkdir(exist_ok=True)
    database = data / "dashboard.sqlite3"
    storage.initialize(database)
    predictor = app.config.get("PREDICTOR") or Predictor(app.config["REPO_ROOT"])

    @app.after_request
    def headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.errorhandler(HTTPException)
    def http_error(error):
        messages = {
            404: "Halaman atau data tidak ditemukan.",
            405: "Metode permintaan tidak diizinkan.",
            413: "Ukuran unggahan melebihi batas 10 MB.",
        }
        return jsonify(error=messages.get(error.code, error.description)), error.code

    @app.errorhandler(Exception)
    def unexpected_error(error):
        app.logger.exception("Permintaan gagal")
        return (
            jsonify(error="Permintaan gagal. Periksa log backend lalu coba lagi."),
            500,
        )

    @app.get("/api/health")
    def health():
        return jsonify(status="ok", runtime_installed=runtime_installed())

    @app.get("/api/models")
    def models():
        return jsonify(items=catalog(app.config["REPO_ROOT"]))

    @app.get("/api/dashboard")
    def dashboard():
        return jsonify(
            **storage.summary(database), models=catalog(app.config["REPO_ROOT"])
        )

    @app.get("/api/dataset")
    def dataset_images():
        label = request.args.get("label", "normal")
        if label not in dataset.LABELS:
            abort(400, description="Kelas dataset tidak valid.")
        try:
            page = int(request.args.get("page", 1))
            per_page = int(request.args.get("per_page", 12))
            if page < 1 or not 1 <= per_page <= 48:
                raise ValueError
        except ValueError:
            abort(
                400,
                description="Halaman harus positif dan jumlah per halaman antara 1 dan 48.",
            )
        items, unreadable = dataset.catalog(app.config["DATASET_DIR"], label)
        selected = items[(page - 1) * per_page : page * per_page]
        for item in selected:
            item["image_url"] = url_for(
                "dataset_image", label=label, filename=item["filename"]
            )
        return jsonify(
            items=selected,
            label=label,
            total=len(items),
            unreadable=unreadable,
            page=page,
            per_page=per_page,
        )

    @app.get("/api/dataset/<label>/<filename>")
    def dataset_image(label, filename):
        path = dataset.find_image(app.config["DATASET_DIR"], label, filename)
        if path is None:
            abort(404)
        stat = path.stat()
        metadata = dataset.image_metadata(str(path), stat.st_size, stat.st_mtime_ns)
        if metadata is None:
            abort(422, description="File citra rusak atau tidak berisi gambar.")
        if request.args.get("thumbnail") == "1":
            with Image.open(path) as image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((400, 400))
                output = io.BytesIO()
                image.save(output, "JPEG", quality=85)
            output.seek(0)
            return send_file(output, mimetype="image/jpeg")
        mimetype = "image/png" if metadata["format"] == "PNG" else "image/jpeg"
        return send_file(path, mimetype=mimetype)

    def filters():
        label = request.args.get("label", "")
        model = request.args.get("model", "")
        if label not in ("", "normal", "osteoporosis") or model not in ("", *VARIANTS):
            abort(400, description="Filter kelas atau model tidak valid.")
        return {
            "search": request.args.get("search", "")[:200],
            "label": label,
            "model": model,
        }

    @app.get("/api/predictions")
    def predictions():
        try:
            page = int(request.args.get("page", 1))
            per_page = int(request.args.get("per_page", 10))
            if page < 1 or not 1 <= per_page <= 100:
                raise ValueError
        except ValueError:
            abort(
                400,
                description="Halaman harus positif dan jumlah per halaman antara 1 dan 100.",
            )
        return jsonify(
            storage.history(database, **filters(), page=page, per_page=per_page)
        )

    @app.get("/api/predictions/export")
    def export():
        selected = filters()
        columns = [
            "id",
            "filename",
            "model",
            "label",
            "confidence",
            "inference_ms",
            "created_at",
        ]

        def generate():
            output = io.StringIO(newline="")
            writer = csv.writer(output)
            writer.writerow(columns)
            yield "\ufeff" + output.getvalue()
            page = 1
            while True:
                result = storage.history(database, **selected, page=page, per_page=100)
                for row in result["items"]:
                    output.seek(0)
                    output.truncate(0)
                    values = [row[column] for column in columns]
                    values = [
                        (
                            "'" + value
                            if isinstance(value, str)
                            and value.lstrip().startswith(("=", "+", "-", "@"))
                            else value
                        )
                        for value in values
                    ]
                    writer.writerow(values)
                    yield output.getvalue()
                if page * 100 >= result["total"]:
                    break
                page += 1

        return Response(
            generate(),
            mimetype="text/csv",
            headers={
                "Content-Disposition": 'attachment; filename="riwayat-analisis.csv"'
            },
        )

    @app.post("/api/predictions")
    def predict():
        variant = request.form.get("model", "nano")
        if variant not in VARIANTS:
            abort(400, description="Pilih salah satu model yang tersedia.")
        file = request.files.get("image")
        if file is None or not file.filename:
            abort(400, description="Pilih citra PNG atau JPEG terlebih dahulu.")
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                image = Image.open(file.stream)
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
        try:
            result = predictor.predict(image, variant)
        except ModelUnavailable as error:
            app.logger.warning("Inferensi tidak tersedia", exc_info=True)
            return jsonify(error=str(error)), 503

        prediction_id = uuid.uuid4().hex
        image_name = f"{prediction_id}.png"
        image_path = uploads / image_name
        item = {
            "id": prediction_id,
            "filename": secure_filename(file.filename)[:180] or "citra.png",
            "image_name": image_name,
            "width": image.width,
            "height": image.height,
            "model": variant,
            **result,
            "created_at": datetime.now(timezone.utc).isoformat(timespec="microseconds"),
        }
        try:
            image.save(image_path, "PNG")
            storage.save(database, item)
        except Exception:
            image_path.unlink(missing_ok=True)
            raise
        return jsonify(storage.serialize(storage.find(database, prediction_id))), 201

    @app.get("/api/predictions/<prediction_id>")
    def detail(prediction_id):
        row = storage.find(database, prediction_id)
        if row is None:
            abort(404)
        return jsonify(storage.serialize(row))

    @app.delete("/api/predictions/<prediction_id>")
    def delete_prediction(prediction_id):
        if not storage.delete(database, prediction_id, uploads):
            abort(404)
        return jsonify(message="Riwayat analisis dan citra tersimpan berhasil dihapus.")

    @app.get("/api/predictions/<prediction_id>/image")
    def prediction_image(prediction_id):
        row = storage.find(database, prediction_id)
        if row is None:
            abort(404)
        return send_from_directory(uploads, row["image_name"], mimetype="image/png")

    @app.get("/api/models/<variant>/artifacts/<filename>")
    def artifact(variant, filename):
        if variant not in VARIANTS or filename not in (
            "confusion_matrix.png",
            "results.png",
        ):
            abort(404)
        return send_from_directory(
            training_path(app.config["REPO_ROOT"], variant), filename
        )

    @app.get("/")
    @app.get("/<path:path>")
    def frontend(path=""):
        if path == "api" or path.startswith("api/"):
            abort(404)
        dist = Path(app.config["FRONTEND_DIR"])
        if not (dist / "index.html").is_file():
            return (
                jsonify(
                    message="Backend aktif. Jalankan frontend dengan npm run dev atau buat build frontend terlebih dahulu."
                ),
                200,
            )
        if (
            path
            and (dist / path).is_file()
            and (dist / path).resolve().is_relative_to(dist.resolve())
        ):
            return send_from_directory(dist, path)
        return send_file(dist / "index.html")

    return app
