import csv
import io
from pathlib import Path

import pytest
from PIL import Image

from backend import create_app
from backend.models import ModelUnavailable, Predictor


class FixedPredictor:
    def predict(self, image, variant):
        assert image.mode == "RGB"
        assert variant == "nano"
        return {"label": "normal", "confidence": 0.8, "probabilities": {"normal": 0.8, "osteoporosis": 0.2}, "inference_ms": 12.5}


@pytest.fixture
def app(tmp_path):
    return create_app({"TESTING": True, "DATA_DIR": tmp_path, "PREDICTOR": FixedPredictor()})


@pytest.fixture
def client(app):
    return app.test_client()


def image_data(format="PNG", size=(64, 64)):
    stream = io.BytesIO()
    Image.new("L", size, color=128).save(stream, format=format)
    stream.seek(0)
    return stream


def upload(client, filename="xray.png"):
    return client.post("/api/predictions", data={"image": (image_data(), filename), "model": "nano"})


@pytest.fixture
def dataset_client(app, tmp_path):
    directory = tmp_path / "dataset"
    for label in ("normal", "osteoporosis"):
        (directory / label).mkdir(parents=True)
    Image.new("RGB", (800, 600)).save(directory / "normal" / "xray.png")
    Image.new("L", (64, 64)).save(directory / "normal" / "second.JPG")
    Image.new("L", (80, 80)).save(directory / "osteoporosis" / "knee.JPEG")
    (directory / "normal" / "broken.png").write_bytes(bytes(1024))
    (directory / "normal" / "xray.png:Zone.Identifier").write_text("metadata")
    (directory / "normal" / "archive.zip").write_bytes(b"not an image")
    outside = tmp_path / "outside.jpg"
    Image.new("RGB", (64, 64)).save(outside)
    (directory / "normal" / "outside.jpg").symlink_to(outside)
    app.config["DATASET_DIR"] = directory
    return app.test_client()


def test_dataset_lists_readable_images_by_class_and_page(dataset_client):
    first = dataset_client.get("/api/dataset?label=normal&per_page=1").json
    second = dataset_client.get("/api/dataset?label=normal&per_page=1&page=2").json
    assert first["total"] == 2
    assert first["unreadable"] == 1
    assert len(first["items"]) == len(second["items"]) == 1
    assert {first["items"][0]["filename"], second["items"][0]["filename"]} == {"xray.png", "second.JPG"}
    osteoporosis = dataset_client.get("/api/dataset?label=osteoporosis").json
    assert osteoporosis["total"] == 1 and osteoporosis["unreadable"] == 0
    assert osteoporosis["items"][0]["filename"] == "knee.JPEG"


def test_dataset_serves_original_and_thumbnail(dataset_client):
    original = dataset_client.get("/api/dataset/normal/xray.png")
    assert original.status_code == 200 and original.mimetype == "image/png"
    assert Image.open(io.BytesIO(original.data)).size == (800, 600)
    thumbnail = dataset_client.get("/api/dataset/normal/xray.png?thumbnail=1")
    assert thumbnail.status_code == 200 and thumbnail.mimetype == "image/jpeg"
    assert Image.open(io.BytesIO(thumbnail.data)).size == (400, 300)
    assert dataset_client.get("/api/dataset/normal/broken.png").status_code == 422


@pytest.mark.parametrize("path", ["normal/outside.jpg", "normal/xray.png:Zone.Identifier", "normal/archive.zip", "normal/missing.png", "other/xray.png", "normal/..%2Foutside.jpg"])
def test_dataset_rejects_unavailable_or_unsupported_paths(dataset_client, path):
    response = dataset_client.get("/api/dataset/" + path)
    assert response.status_code == 404
    assert response.is_json


@pytest.mark.parametrize("query", ["label=other", "page=0", "page=invalid", "per_page=0", "per_page=49"])
def test_dataset_rejects_invalid_queries(dataset_client, query):
    assert dataset_client.get("/api/dataset?" + query).status_code == 400


def test_dataset_missing_directory_is_empty(client, app, tmp_path):
    app.config["DATASET_DIR"] = tmp_path / "missing-dataset"
    data = client.get("/api/dataset").json
    assert data["items"] == [] and data["total"] == data["unreadable"] == 0


def test_dataset_updates_metadata_when_file_changes(dataset_client, app):
    assert dataset_client.get("/api/dataset").json["total"] == 2
    (app.config["DATASET_DIR"] / "normal" / "xray.png").write_bytes(bytes(128))
    data = dataset_client.get("/api/dataset").json
    assert data["total"] == 1 and data["unreadable"] == 2


def test_empty_dashboard_uses_repository_metrics(client):
    data = client.get("/api/dashboard").json
    assert data["total"] == 0
    assert data["avg_confidence"] is None
    assert len(data["activity"]) == 7
    assert len(data["models"]) == 5
    nano = data["models"][0]
    assert nano["epochs"] == 60
    assert nano["best_accuracy"] == pytest.approx(0.85714)
    assert nano["best_epoch"] == 26
    assert len(nano["series"]) == 60


def test_upload_persists_result_image_and_statistics(client, app):
    response = upload(client)
    assert response.status_code == 201
    data = response.json
    assert data["label"] == "normal"
    assert data["probabilities"]["osteoporosis"] == 0.2
    assert (data["width"], data["height"]) == (64, 64)
    assert "image_name" not in data
    assert client.get(data["image_url"]).mimetype == "image/png"
    assert client.get(f"/api/predictions/{data['id']}").json == data
    stats = client.get("/api/dashboard").json
    assert stats["total"] == stats["normal"] == 1
    assert stats["osteoporosis"] == 0
    assert stats["avg_confidence"] == 0.8
    assert stats["activity"][-1]["count"] == 1
    second = create_app({"TESTING": True, "DATA_DIR": app.config["DATA_DIR"], "PREDICTOR": FixedPredictor()})
    assert second.test_client().get("/api/predictions").json["total"] == 1


def test_delete_removes_only_selected_history_and_image(client, app):
    removed = upload(client, "remove.png").json
    kept = upload(client, "keep.png").json
    image_path = app.config["DATA_DIR"] / "uploads" / f"{removed['id']}.png"
    response = client.delete(f"/api/predictions/{removed['id']}")
    assert response.status_code == 200
    assert not image_path.exists()
    assert client.get(f"/api/predictions/{removed['id']}").status_code == 404
    assert client.get(removed["image_url"]).status_code == 404
    assert client.get(kept["image_url"]).status_code == 200
    history = client.get("/api/predictions").json
    assert history["total"] == 1
    assert [item["id"] for item in history["items"]] == [kept["id"]]
    stats = client.get("/api/dashboard").json
    assert stats["total"] == stats["normal"] == 1
    assert stats["activity"][-1]["count"] == 1
    assert [item["id"] for item in stats["recent"]] == [kept["id"]]
    csv_data = client.get("/api/predictions/export").data.decode("utf-8-sig")
    assert "remove.png" not in csv_data and "keep.png" in csv_data
    second = create_app({"TESTING": True, "DATA_DIR": app.config["DATA_DIR"], "PREDICTOR": FixedPredictor()})
    assert second.test_client().get("/api/predictions").json["total"] == 1
    assert client.delete(f"/api/predictions/{removed['id']}").status_code == 404


def test_delete_last_history_with_missing_image(client, app):
    item = upload(client).json
    (app.config["DATA_DIR"] / "uploads" / f"{item['id']}.png").unlink()
    assert client.delete(f"/api/predictions/{item['id']}").status_code == 200
    stats = client.get("/api/dashboard").json
    assert stats["total"] == 0
    assert stats["recent"] == []
    assert stats["avg_confidence"] is None


def test_delete_unknown_history_returns_json(client):
    response = client.delete("/api/predictions/missing")
    assert response.status_code == 404
    assert response.is_json


def test_delete_image_failure_keeps_record(client, app, monkeypatch):
    item = upload(client).json
    image_path = app.config["DATA_DIR"] / "uploads" / f"{item['id']}.png"
    original_unlink = Path.unlink

    def fail_image_unlink(path, *args, **kwargs):
        if path == image_path:
            raise PermissionError("Cannot remove image")
        return original_unlink(path, *args, **kwargs)

    monkeypatch.setattr(Path, "unlink", fail_image_unlink)
    assert client.delete(f"/api/predictions/{item['id']}").status_code == 500
    assert image_path.exists()
    assert client.get(f"/api/predictions/{item['id']}").status_code == 200
    assert client.get("/api/predictions").json["total"] == 1


@pytest.mark.parametrize("payload,message", [
    ({}, "Pilih citra"),
    ({"model": "../nano", "image": (io.BytesIO(b"invalid"), "x.png")}, "model"),
    ({"image": (io.BytesIO(b"not an image"), "fake.png")}, "tidak dapat dibaca"),
    ({"image": (image_data("GIF"), "image.gif")}, "Format"),
    ({"image": (image_data(size=(20, 20)), "tiny.png")}, "Dimensi"),
])
def test_rejects_invalid_uploads(client, payload, message):
    response = client.post("/api/predictions", data=payload)
    assert response.status_code == 400
    assert message in response.json["error"]
    assert client.get("/api/predictions").json["total"] == 0


def test_upload_limit_is_json(client):
    response = client.post("/api/predictions", data={"image": (io.BytesIO(b"x" * (11 * 1024 * 1024)), "large.png")})
    assert response.status_code == 413
    assert "10 MB" in response.json["error"]


def test_valid_image_larger_than_multipart_buffer_is_accepted(client):
    stream = io.BytesIO()
    Image.effect_noise((700, 700), 100).convert("RGB").save(stream, format="PNG")
    assert stream.tell() > 64 * 1024
    stream.seek(0)
    response = client.post("/api/predictions", data={"image": (stream, "large-valid.png"), "model": "nano"})
    assert response.status_code == 201


def test_model_failure_does_not_save_image_or_record(tmp_path):
    class Offline:
        def predict(self, *_):
            raise ModelUnavailable("Bobot tidak tersedia.")

    app = create_app({"TESTING": True, "DATA_DIR": tmp_path, "PREDICTOR": Offline()})
    client = app.test_client()
    response = upload(client)
    assert response.status_code == 503
    assert response.json["error"] == "Bobot tidak tersedia."
    assert not list((tmp_path / "uploads").iterdir())
    assert client.get("/api/predictions").json["total"] == 0


def test_search_filters_pagination_and_csv(client):
    upload(client, "knee-first.png")
    upload(client, "knee-second.png")
    assert client.get("/api/predictions?search=second").json["total"] == 1
    assert client.get("/api/predictions?search=%25").json["total"] == 0
    assert client.get("/api/predictions?label=osteoporosis").json["total"] == 0
    assert client.get("/api/predictions?model=small").json["total"] == 0
    page = client.get("/api/predictions?per_page=1&page=2").json
    assert page["total"] == 2 and len(page["items"]) == 1
    assert page["items"][0]["filename"] == "knee-first.png"
    response = client.get("/api/predictions/export?search=second")
    assert response.mimetype == "text/csv"
    rows = list(csv.DictReader(io.StringIO(response.data.decode("utf-8-sig"))))
    assert len(rows) == 1 and rows[0]["filename"] == "knee-second.png"


@pytest.mark.parametrize("query", ["page=0", "page=hi", "per_page=101", "label=fake", "model=unknown"])
def test_invalid_history_filters(client, query):
    assert client.get("/api/predictions?" + query).status_code == 400


def test_unknown_api_paths_stay_json(client):
    for path in ("/api", "/api/unknown", "/api/predictions/missing", "/api/predictions/missing/image", "/api/models/nano/artifacts/args.yaml"):
        response = client.get(path)
        assert response.status_code == 404
        assert response.is_json


def test_training_artifact_is_served(client):
    response = client.get("/api/models/nano/artifacts/confusion_matrix.png")
    assert response.status_code == 200
    assert response.mimetype == "image/png"


def test_predictor_rejects_lfs_pointer_without_loading_runtime(tmp_path):
    weights = tmp_path / "train-nano" / "weights"
    weights.mkdir(parents=True)
    (weights / "best.pt").write_text("version https://git-lfs.github.com/spec/v1\n")
    with pytest.raises(ModelUnavailable, match="download_models"):
        Predictor(tmp_path).predict(Image.new("RGB", (64, 64)), "nano")


def test_frontend_build_and_assets_are_served(tmp_path):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<html>Dashboard</html>")
    (dist / "app.js").write_text("console.log('app')")
    app = create_app({"TESTING": True, "DATA_DIR": tmp_path / "data", "FRONTEND_DIR": dist})
    client = app.test_client()
    assert b"Dashboard" in client.get("/").data
    assert b"Dashboard" in client.get("/models").data
    assert b"console.log" in client.get("/app.js").data
    assert client.get("/api/missing").status_code == 404
