"""Serve the production build with isolated, disposable history for browser tests."""

from pathlib import Path
import signal
import tempfile

from werkzeug.serving import make_server

from backend import create_app


def main():
    def stop(*_):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, stop)
    with tempfile.TemporaryDirectory(prefix="osteo-browser-tests-") as directory:
        app = create_app({"DATA_DIR": Path(directory)})
        server = make_server("127.0.0.1", 5001, app, threaded=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()


if __name__ == "__main__":
    main()
