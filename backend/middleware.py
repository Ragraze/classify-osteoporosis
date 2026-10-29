import logging

from django.conf import settings
from django.core.exceptions import BadRequest, PermissionDenied, SuspiciousOperation
from django.http import Http404, JsonResponse
from django.utils.deprecation import MiddlewareMixin

from .views import APIError

logger = logging.getLogger(__name__)


def csrf_failure(request, reason=""):
    return JsonResponse(
        {"error": "Token CSRF tidak valid. Muat ulang halaman lalu coba lagi."},
        status=403,
    )


class APIMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.get_host()
        try:
            length = int(request.META.get("CONTENT_LENGTH") or 0)
        except ValueError:
            return JsonResponse({"error": "Ukuran permintaan tidak valid."}, status=400)
        if length > settings.MAX_CONTENT_LENGTH:
            return JsonResponse(
                {"error": "Ukuran unggahan melebihi batas 10 MB."}, status=413
            )

    def process_exception(self, request, exception):
        if isinstance(exception, APIError):
            status, message = exception.status, exception.message
        elif isinstance(exception, Http404):
            status, message = 404, "Halaman atau data tidak ditemukan."
        elif isinstance(exception, PermissionDenied):
            status, message = 403, "Permintaan tidak diizinkan."
        elif isinstance(exception, (BadRequest, SuspiciousOperation)):
            status, message = 400, "Permintaan tidak valid."
        else:
            logger.exception("Permintaan gagal")
            status, message = (
                500,
                "Permintaan gagal. Periksa log backend lalu coba lagi.",
            )
        return JsonResponse({"error": message}, status=status)

    def process_response(self, request, response):
        if request.path_info.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        if response.status_code == 405:
            allowed = response.headers.get("Allow", "")
            response = JsonResponse(
                {"error": "Metode permintaan tidak diizinkan."}, status=405
            )
            response.headers["Allow"] = allowed
            response.headers["Cache-Control"] = "no-store"
        return response
