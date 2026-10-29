from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie

from .openapi import specification


def openapi(request):
    spec = specification()
    spec["servers"] = [{"url": request.META.get("SCRIPT_NAME") or "/"}]
    return JsonResponse(spec)


@ensure_csrf_cookie
def swagger(request):
    return render(request, "api_docs.html")
