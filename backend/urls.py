from django.http import JsonResponse
from django.urls import path, re_path
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from swagger_ui_bundle import swagger_ui_path

from . import api_docs, views


def docs_asset(request, filename):
    return views.send_from_directory(swagger_ui_path, filename)


API_ROUTES = [
    ("api/health", ensure_csrf_cookie(views.health), ["GET"], "health"),
    ("api/models", views.models, ["GET"], "models"),
    ("api/dataset", views.dataset_images, ["GET"], "dataset_images"),
    (
        "api/dataset/<str:label>/<str:filename>",
        views.dataset_image,
        ["GET"],
        "dataset_image",
    ),
    ("api/predictions", views.predict, ["POST"], "predictions"),
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
