import re

import pytest
from openapi_spec_validator import validate

from backend import create_app


@pytest.fixture
def app(tmp_path):
    return create_app({"TESTING": True, "DATA_DIR": tmp_path})


def test_openapi_is_valid_and_covers_all_api_routes(app):
    response = app.test_client().get('/api/openapi.json')
    assert response.status_code == 200
    spec = response.get_json()
    validate(spec)
    documented = {
        (path, method.upper())
        for path, operations in spec['paths'].items()
        for method in operations
    }
    actual = {
        (re.sub(r'<([^>]+)>', r'{\1}', rule.rule), method)
        for rule in app.url_map.iter_rules()
        if rule.rule.startswith('/api/') and rule.endpoint.split('.')[0] != 'api_docs'
        for method in rule.methods - {'HEAD', 'OPTIONS'}
    }
    assert documented == actual


def test_swagger_serves_local_assets_and_spec(app):
    client = app.test_client()
    for path in ('/api/docs', '/api/docs/'):
        response = client.get(path)
        assert response.status_code == 200
        assert response.mimetype == 'text/html'
        html = response.get_data(as_text=True)
        assert '/api/openapi.json' in html
        assert 'validatorUrl: null' in html
        assert 'https://' not in html
    for name in ('swagger-ui.css', 'swagger-ui-bundle.js'):
        response = client.get('/api/docs/assets/' + name)
        assert response.status_code == 200
        assert len(response.data) > 1000
    assert client.get('/api/docs/assets/missing.js').status_code == 404


def test_spec_respects_application_mount_path(app):
    response = app.test_client().get('/api/openapi.json', environ_overrides={'SCRIPT_NAME': '/osteoporosis'})
    assert response.get_json()['servers'] == [{'url': '/osteoporosis'}]
