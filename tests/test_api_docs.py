import re

import pytest
from openapi_spec_validator import validate

from django.test import Client

from backend.urls import API_ROUTES


@pytest.fixture
def app(tmp_path, app_factory):
    return app_factory(DATA_DIR=tmp_path)


def test_openapi_is_valid_and_covers_all_api_routes(app):
    response = Client().get("/api/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    validate(spec)
    documented = {
        (path, method.upper())
        for path, operations in spec["paths"].items()
        for method in operations
    }
    actual = {
        ("/" + re.sub(r"<(?:str:)?([^>]+)>", r"{\1}", route), method)
        for route, view, methods, name in API_ROUTES
        for method in methods
    }
    assert documented == actual


def test_swagger_serves_local_assets_and_spec(app):
    client = Client()
    for path in ("/api/docs", "/api/docs/"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.headers["Content-Type"].startswith("text/html")
        html = response.content.decode()
        assert "/api/openapi.json" in html
        assert "validatorUrl: null" in html
        assert "https://" not in html
    for name in ("swagger-ui.css", "swagger-ui-bundle.js"):
        response = client.get("/api/docs/assets/" + name)
        assert response.status_code == 200
        assert len(b"".join(response.streaming_content)) > 1000
    assert client.get("/api/docs/assets/missing.js").status_code == 404


def test_spec_respects_application_mount_path(app):
    response = Client().get("/api/openapi.json", SCRIPT_NAME="/osteoporosis")
    assert response.json()["servers"] == [{"url": "/osteoporosis"}]
