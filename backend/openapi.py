from .models import VARIANTS


def ref(name):
    return {"$ref": f"#/components/schemas/{name}"}


def obj(properties, required=None):
    return {"type": "object", "properties": properties, "required": required or list(properties)}


def array(schema):
    return {"type": "array", "items": schema}


def parameter(name, schema, location="query", description=""):
    return {"name": name, "in": location, "required": location == "path",
            "schema": schema, "description": description}


def response(schema, description="Berhasil", media="application/json"):
    return {"description": description, "content": {media: {"schema": schema}}}


def operation(summary, tag, schema, *, parameters=None, errors=(), status="200", media="application/json", description=""):
    return {"summary": summary, "description": description, "tags": [tag],
            "parameters": parameters or [], "responses": {
                status: response(schema, media=media),
                **{str(code): {"$ref": f"#/components/responses/Error{code}"} for code in (*errors, 500)},
            }}


def specification():
    string = {"type": "string"}
    integer = {"type": "integer"}
    number = {"type": "number"}
    boolean = {"type": "boolean"}
    binary = {"type": "string", "format": "binary"}
    score = {"type": "number", "minimum": 0, "maximum": 1}
    label = {"type": "string", "enum": ["normal", "osteoporosis"]}
    model = {"type": "string", "enum": list(VARIANTS)}
    nullable_number = {"type": "number", "nullable": True}
    nullable_integer = {"type": "integer", "nullable": True}
    schemas = {
        "Error": obj({"error": string}),
        "Health": obj({"status": {"type": "string", "enum": ["ok"]}, "runtime_installed": boolean}),
        "Prediction": obj({
            "id": string, "filename": string, "width": integer, "height": integer,
            "model": model, "label": label, "confidence": score,
            "probabilities": obj({"normal": score, "osteoporosis": score}),
            "inference_ms": number, "created_at": {"type": "string", "format": "date-time"},
            "image_url": string,
        }),
        "Model": obj({
            "id": model, "name": string, "variant": string, "epochs": integer,
            "best_accuracy": {**score, "nullable": True}, "best_epoch": nullable_integer,
            "source": string, "weights_available": boolean, "ready": boolean,
            "status": {"type": "string", "enum": ["ready", "missing_runtime", "missing_weights"]},
            "series": array(obj({"epoch": integer, "accuracy": score, "train_loss": number, "val_loss": number})),
            "artifacts": obj({"confusion_matrix": string, "results": string}),
        }),
        "DatasetImage": obj({"filename": string, "width": integer, "height": integer,
                             "format": {"type": "string", "enum": ["PNG", "JPEG"]}, "image_url": string}),
        "PredictionPage": obj({"items": array(ref("Prediction")), "total": integer, "page": integer, "per_page": integer}),
        "DatasetPage": obj({"items": array(ref("DatasetImage")), "label": label, "total": integer,
                            "unreadable": integer, "page": integer, "per_page": integer}),
        "Dashboard": obj({
            "total": integer, "normal": integer, "osteoporosis": integer,
            "avg_confidence": nullable_number, "avg_inference_ms": nullable_number,
            "activity": array(obj({"date": {"type": "string", "format": "date"}, "count": integer})),
            "recent": array(ref("Prediction")), "models": array(ref("Model")),
        }),
    }
    filters = [
        parameter("search", string, description="Cari nama file atau ID; dibatasi 200 karakter."),
        parameter("label", {"type": "string", "enum": ["", "normal", "osteoporosis"]}),
        parameter("model", {"type": "string", "enum": ["", *VARIANTS]}),
    ]
    page = parameter("page", {"type": "integer", "minimum": 1, "default": 1})
    prediction_id = parameter("prediction_id", string, "path", "ID prediksi dari respons unggahan.")
    paths = {
        "/api/health": {"get": operation("Status API dan ketersediaan runtime", "Status", ref("Health"))},
        "/api/dashboard": {"get": operation("Ringkasan riwayat dan katalog model", "Status", ref("Dashboard"))},
        "/api/models": {"get": operation("Model, metrik pelatihan, dan ketersediaan bobot", "Model", obj({"items": array(ref("Model"))}))},
        "/api/dataset": {"get": operation("Daftar citra dataset", "Dataset", ref("DatasetPage"), parameters=[
            parameter("label", {**label, "default": "normal"}), page,
            parameter("per_page", {"type": "integer", "minimum": 1, "maximum": 48, "default": 12}),
        ], errors=(400,))},
        "/api/dataset/{label}/{filename}": {"get": operation("Unduh citra dataset atau thumbnail", "Dataset", binary, parameters=[
            parameter("label", label, "path"), parameter("filename", string, "path"),
            parameter("thumbnail", {"type": "string", "enum": ["1"]}, description="Gunakan 1 untuk JPEG maksimal 400 × 400 piksel."),
        ], errors=(404, 422), media="image/png")},
        "/api/predictions": {
            "get": operation("Riwayat prediksi", "Prediksi", ref("PredictionPage"), parameters=[*filters, page,
                parameter("per_page", {"type": "integer", "minimum": 1, "maximum": 100, "default": 10}),
            ], errors=(400,)),
            "post": operation("Klasifikasi citra dan simpan hasil", "Prediksi", ref("Prediction"), status="201", errors=(400, 413, 503),
                description="Unggah PNG/JPEG maksimal 10 MB, minimal 32 × 32 piksel, maksimal 25 megapiksel. "
                            "Citra disimpan sebagai PNG RGB tanpa EXIF. Inferensi CPU; pemakaian model pertama lebih lambat."),
        },
        "/api/predictions/export": {"get": operation("Ekspor riwayat sebagai CSV", "Prediksi", string, parameters=filters, errors=(400,), media="text/csv")},
        "/api/predictions/{prediction_id}": {
            "get": operation("Detail prediksi", "Prediksi", ref("Prediction"), parameters=[prediction_id], errors=(404,)),
            "delete": operation("Hapus permanen prediksi beserta citranya", "Prediksi", obj({"message": string}), parameters=[prediction_id], errors=(404,),
                description="Menghapus riwayat dan file gambar tersimpan. Aksi ini tidak dapat dibatalkan."),
        },
        "/api/predictions/{prediction_id}/image": {"get": operation("Unduh citra prediksi tersimpan", "Prediksi", binary, parameters=[prediction_id], errors=(404,), media="image/png")},
        "/api/models/{variant}/artifacts/{filename}": {"get": operation("Unduh grafik hasil pelatihan", "Model", binary, parameters=[
            parameter("variant", model, "path"),
            parameter("filename", {"type": "string", "enum": ["confusion_matrix.png", "results.png"]}, "path"),
        ], errors=(404,), media="image/png")},
    }
    paths["/api/dataset/{label}/{filename}"]["get"]["responses"]["200"]["content"]["image/jpeg"] = {"schema": binary}
    paths["/api/predictions"]["post"]["requestBody"] = {
        "required": True, "content": {"multipart/form-data": {"schema": {
            "type": "object", "required": ["image"], "properties": {
                "image": {**binary, "description": "Citra PNG atau JPEG."},
                "model": {**model, "default": "nano"},
            },
        }}},
    }
    error_descriptions = {
        400: "Parameter atau citra tidak valid.", 404: "Data atau file tidak ditemukan.",
        413: "Ukuran unggahan melebihi batas 10 MB.", 422: "File citra dataset rusak.",
        500: "Kesalahan internal; periksa log backend.", 503: "Bobot atau runtime inferensi tidak tersedia, atau inferensi gagal.",
    }
    return {
        "openapi": "3.0.3",
        "info": {"title": "Classify Osteoporosis API", "version": "1.0.0",
                 "description": "API eksperimen klasifikasi X-ray lutut. Hasil model bukan diagnosis klinis. "
                                "API tidak memakai autentikasi. Try it out mengirim permintaan ke server ini; "
                                "unggahan menyimpan hasil dan DELETE menghapus data secara permanen."},
        "servers": [{"url": "/"}],
        "tags": [{"name": name} for name in ("Status", "Model", "Dataset", "Prediksi")],
        "paths": paths,
        "components": {"schemas": schemas, "responses": {
            f"Error{code}": response(ref("Error"), description) for code, description in error_descriptions.items()
        }},
    }
