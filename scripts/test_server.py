"""Serve the production build with a disposable runtime cache for browser tests."""

import signal
import tempfile

import os
from wsgiref.simple_server import make_server

from django.core.wsgi import get_wsgi_application


def main():
    def stop(*_):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, stop)
    with tempfile.TemporaryDirectory(prefix="osteo-browser-tests-") as directory:
        os.environ["OSTEO_INSTANCE_PATH"] = directory
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
        app = get_wsgi_application()
        server = make_server("127.0.0.1", 5001, app)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()


if __name__ == "__main__":
    main()
