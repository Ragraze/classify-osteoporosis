from django.http import JsonResponse
from django.urls import path, re_path
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from swagger_ui_bundle import swagger_ui_path

from . import api_docs, views


def prediction_collection(request):
    return (
        views.predict(request)
        if request.method == "POST"
        else views.predictions(request)
    )


def prediction_item(request, prediction_id):
    return (
        views.delete_prediction(request, prediction_id)
        if request.method == "DELETE"
        else views.detail(request, prediction_id)
    )


def docs_asset(request, filename):
    return views.send_from_directory(swagger_ui_path, filename)


API_ROUTES = [
    ("api/health", ensure_csrf_cookie(views.health), ["GET"], "health"),
    ("api/models", views.models, ["GET"], "models"),
    ("api/dashboard", views.dashboard, ["GET"], "dashboard"),
    ("api/dataset", views.dataset_images, ["GET"], "dataset_images"),
    (
        "api/dataset/<str:label>/<str:filename>",
        views.dataset_image,
        ["GET"],
        "dataset_image",
    ),
    ("api/predictions", prediction_collection, ["GET", "POST"], "predictions"),
    ("api/predictions/export", views.export, ["GET"], "export"),
    (
        "api/predictions/<str:prediction_id>",
        prediction_item,
        ["GET", "DELETE"],
        "detail",
    ),
    (
        "api/predictions/<str:prediction_id>/image",
        views.prediction_image,
        ["GET"],
        "prediction_image",
    ),
    (
        "api/models/<str:variant>/artifacts/<str:filename>",
        views.artifact,
        ["GET"],
        "artifact",
    ),
]
urlpatterns = [
    path(
        route,
        require_http_methods(methods + (["HEAD"] if "GET" in methods else []))(view),
        name=name,
    )
    for route, view, methods, name in API_ROUTES
]
urlpatterns += [
    path(
        "api/openapi.json",
        require_http_methods(["GET", "HEAD"])(api_docs.openapi),
        name="openapi",
    ),
    re_path(
        r"^api/docs/?$",
        require_http_methods(["GET", "HEAD"])(api_docs.swagger),
        name="swagger",
    ),
    path(
        "api/docs/assets/<path:filename>",
        require_http_methods(["GET", "HEAD"])(docs_asset),
        name="docs_asset",
    ),
    path("", require_http_methods(["GET", "HEAD"])(views.frontend)),
    path("<path:path>", require_http_methods(["GET", "HEAD"])(views.frontend)),
]


def handler400(request, exception):
    return JsonResponse({"error": "Permintaan tidak valid."}, status=400)


def handler404(request, exception):
    return JsonResponse({"error": "Halaman atau data tidak ditemukan."}, status=404)


def handler500(request):
    return JsonResponse(
        {"error": "Permintaan gagal. Periksa log backend lalu coba lagi."}, status=500
    )
