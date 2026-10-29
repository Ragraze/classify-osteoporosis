import os
import secrets
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("OSTEO_INSTANCE_PATH", REPO_ROOT / "instance")).resolve()
DATASET_DIR = REPO_ROOT / "dataset"
FRONTEND_DIR = REPO_ROOT / "frontend" / "dist"
PREDICTOR = None
DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"
# The app uses no signed sessions; set a stable secret before adding authentication.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or secrets.token_urlsafe(50)
ALLOWED_HOSTS = os.environ.get(
    "DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]"
).split(",")
CSRF_TRUSTED_ORIGINS = [
    value
    for value in os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")
    if value
]
ROOT_URLCONF = "backend.urls"
WSGI_APPLICATION = "backend.wsgi.application"
INSTALLED_APPS = []
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "backend.middleware.APIMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
]
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [REPO_ROOT / "backend" / "templates"],
        "APP_DIRS": False,
    }
]
DATA_UPLOAD_MAX_MEMORY_SIZE = 512 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 8
DATA_UPLOAD_MAX_NUMBER_FILES = 8
MAX_CONTENT_LENGTH = 10 * 1024 * 1024
CSRF_FAILURE_VIEW = "backend.middleware.csrf_failure"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
USE_TZ = True
