import os
from contextlib import ExitStack

import django
import pytest
from django.conf import settings
from django.test import override_settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()


@pytest.fixture
def app_factory():
    from backend.views import initialize_runtime

    with ExitStack() as stack:

        def configure(**config):
            config.pop("TESTING", None)
            stack.enter_context(
                override_settings(
                    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"], **config
                )
            )
            return settings

        yield configure
    initialize_runtime.cache_clear()
