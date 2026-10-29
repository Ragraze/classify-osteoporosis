# Classify Osteoporosis

A dashboard for knee X-ray image classification experiments with YOLOv8, a Flask API, and a React frontend. The original project was a final assignment for a digital image processing course at the Faculty of Computer Science, Universitas Brawijaya.

The dashboard lets you compare training metrics across five model variants, browse the source dataset, classify an image, and review or export prediction history. The floating GitHub button in the bottom-right corner opens this repository in a new tab.

## Branches and technology stacks

| Branch | Backend | Frontend | Purpose |
| --- | --- | --- | --- |
| [`main`](https://github.com/Ragraze/classify-osteoporosis/tree/main) | Django 5.2 | React 19 + Vite | Current application |
| [`master`](https://github.com/Ragraze/classify-osteoporosis/tree/master) | Flask 3.1 | React 19 + Vite | Preserved Flask version |

Both versions use YOLOv8 for CPU inference and SQLite for prediction history.
Local dependencies and frontend builds are shared by the branches: run
`npm run setup` again after switching branches to install the matching backend
requirements. Stop the development servers before switching branches.

This README describes the **Flask + React version on `master`**.

## Project structure

```text
Dockerfile            React build, model download, and CPU inference container
.dockerignore         Files excluded from the Docker build context
backend/              Flask API, dataset/model catalogs, inference, and storage
frontend/
  src/pages/          Analysis, Evaluation, Dataset, and History pages
  src/components/     Shared controls, charts, and dialogs
  e2e/                Browser tests
dataset/              Source images organized by class
research/
  classify-osteoporosis.ipynb
  train-*/            Training metrics, plots, and Git LFS weight pointers
  val-*/              Original research validation artifacts
scripts/              Development server, model downloads, and test server
tests/                API tests
```

Git ignores local dependencies and generated data in `.venv/`, `.models/`, `instance/`, `frontend/node_modules/`, `frontend/dist/`, and `artifacts/`. The original notebook and research outputs live in `research/`. Paths inside the notebook still refer to the original training environment.

## Local development

Requirements: Python 3.10+, Node.js 22.12+ or a newer LTS release, and npm.

Install everything and start the app from the repository root:

```bash
npm install
npm run dev
```

`npm install` creates `.venv/`, installs the CPU inference runtime and Python dependencies, runs `npm ci` for the frontend, and downloads all five model weights into `.models/`. The first setup needs internet access. Python must be available as `python3` on Linux/macOS or `python` on Windows. If Python lacks `ensurepip`, setup uses the system pip to bootstrap the virtual environment; install `python3-venv` or provide system pip if neither is available. If installation was interrupted or lifecycle scripts were disabled, run `npm run setup` to finish it.

Open <http://127.0.0.1:5173>. To build the frontend from the root, run `npm run build`. The Docker instructions below provide an alternative that does not install local Python or Node dependencies.

For manual setup instead:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements-dev.txt
python scripts/download_models.py --model all
cd frontend
npm ci
cd ..
python scripts/dev.py
```

Open <http://127.0.0.1:5173>. The Flask API runs at <http://127.0.0.1:5000>. Vite proxies `/api` requests to Flask, so a separate CORS configuration is unnecessary.

On Debian or Ubuntu, install `python3-venv` if virtual environment creation fails because `ensurepip` is unavailable. If pip is already installed, you can also use:

```bash
python3 -m venv --without-pip .venv
python3 -m pip --python .venv/bin/python install pip
```

To download only the smaller default model, run `python scripts/download_models.py --model nano`. The script retrieves Git LFS objects from this repository, verifies their size and SHA-256 checksum, and saves the weights in `.models/`. It preserves the tracked LFS pointers. Weights downloaded with `git lfs pull` are also supported.

## Production build and single-server setup

```bash
cd frontend
npm run build
cd ..
source .venv/bin/activate
gunicorn --bind 127.0.0.1:5000 --workers 1 --threads 4 --timeout 120 'backend:create_app()'
```

Flask serves both the React build and the API at <http://127.0.0.1:5000>. Inference runs on the CPU. The backend loads a model on first use and keeps one model in memory at a time, so the first prediction takes longer. A single worker avoids duplicating large model weights in memory.

## Docker

Build and run from the repository root:

```bash
docker build -t classify-osteoporosis .
docker run --rm --name classify-osteoporosis \
  -p 127.0.0.1:5000:5000 \
  -v osteoporosis-data:/app/instance \
  classify-osteoporosis
```

Open <http://127.0.0.1:5000>. The image includes the React production build, Flask API, source dataset, training metrics, and all five model weights. The build downloads and verifies weights from Git LFS; local Python/Node dependencies and local weights are not required. The first build needs internet access and downloads the CPU inference runtime as well as the model weights.

For a smaller image with only Nano weights, use:

```bash
docker build --build-arg MODEL_VARIANT=nano -t classify-osteoporosis:nano .
```

Other supported values are `small`, `medium`, `large`, and `xlarge`. Metrics for all variants remain available; inference requires the selected variant's weights. The default is `all`.

The container runs as an unprivileged user and serves the dashboard and API through one Gunicorn worker with four threads. Its health check calls `/api/health`. The named volume `osteoporosis-data` preserves SQLite history and uploaded images when the container is removed. Local `instance/` data is excluded from the image and is not imported automatically.

Stop the container from another terminal:

```bash
docker stop classify-osteoporosis
```

## Data and models

- Five YOLOv8 variants: Nano, Small, Medium, Large, and Xlarge.
- Training metrics and curves come from `research/train-*/results.csv`. Chart source labels retain the original run names, `train-*/results.csv`, relative to `research/`. The best accuracy is the maximum validation top-1 accuracy recorded during training. It does not measure clinical performance or accuracy on new uploads.
- Displayed epochs follow the original CSV numbering, starting at one. The epoch count is the number of CSV rows.
- Confusion matrices are original training artifacts; the app does not recalculate them from user uploads.
- Model classes are `normal` and `osteoporosis`. Probabilities are model output scores, not calibrated estimates of clinical risk.
- Uploads must be PNG or JPEG, no larger than 10 MB, at least 32 × 32 pixels, and no more than 25 megapixels. The backend converts images to RGB and saves them as PNG without EXIF metadata.
- SQLite history and uploaded images live in the Git-ignored `instance/` directory. Set `OSTEO_INSTANCE_PATH` to use another location. History statistics remain empty until a prediction succeeds.
- The dataset gallery counts unreadable source files separately and displays only readable images.

This application is intended for local experiments. Classification results are not clinical diagnoses. The app has no authentication or data isolation between users. Add access controls before exposing a server that stores sensitive images.

## API

Interactive Swagger documentation is available at <http://127.0.0.1:5173/api/docs>
in development and <http://127.0.0.1:5000/api/docs> in Docker or the single-server
setup. The OpenAPI 3.0 JSON document is served at `/api/openapi.json`.
Swagger assets are bundled with the Python dependency, so opening the docs does
not require a CDN. **Try it out** calls the same server: uploading stores a real
prediction, and DELETE permanently removes a prediction and its image.
The UI configuration follows the [Swagger UI configuration reference](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/).

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | API health and inference runtime package availability |
| `GET /api/dashboard` | Prediction history statistics and model catalog |
| `GET /api/models` | Metrics, epoch series, and weight availability for each model |
| `GET /api/dataset` | Dataset images filtered by `label`, `page`, and `per_page`; unreadable files counted separately |
| `GET /api/dataset/<label>/<file>` | Original image; add `thumbnail=1` for a JPEG preview up to 400 × 400 pixels |
| `POST /api/predictions` | Multipart `image` and `model`; run inference and save the result |
| `GET /api/predictions` | History with `search`, `label`, `model`, `page`, and `per_page` filters |
| `GET /api/predictions/<id>` | Prediction details |
| `DELETE /api/predictions/<id>` | Delete one prediction and its stored image |
| `GET /api/predictions/<id>/image` | Normalized image for a prediction |
| `GET /api/predictions/export` | CSV export using the same filters as history |
| `GET /api/models/<model>/artifacts/<file>` | Model artifacts: `confusion_matrix.png` or `results.png` |

Example prediction:

```bash
curl -F 'image=@/path/to/xray.png' -F 'model=nano' http://127.0.0.1:5000/api/predictions
```

API errors use the JSON format `{ "error": "..." }`. Missing weights or an unavailable inference runtime return HTTP 503. The app does not generate simulated predictions.

On the History page, **Hapus** (Delete) opens a confirmation dialog. Confirming permanently removes the prediction and its stored image, then updates history counts and summary statistics. The dashboard interface remains in Indonesian.

## Testing

```bash
source .venv/bin/activate
python -m pytest -q
cd frontend
npm run build
npx playwright install chromium
npm run test:e2e
```

API tests use a deterministic predictor to verify storage and response contracts. They do not evaluate model accuracy.

Browser tests serve the production build through Flask on port 5001 with a temporary database. Test history is removed when the server stops. Upload and deletion tests run real Nano inference on an existing validation montage to verify the application flow; they are not medical evaluations or accuracy measurements. Nano weights and the inference runtime must be available.

Browser checks also cover Axe accessibility scans with light and dark system preferences, layouts from 320 to 1440 pixels, and text enlarged to 200%. On Linux, Chromium may require `npx playwright install-deps chromium` with administrator access.

The GitHub mark comes from [GitHub Octicons](https://github.com/primer/octicons).

Implementation references: [Flask file uploads](https://flask.palletsprojects.com/en/stable/patterns/fileuploads/), [Ultralytics classification](https://docs.ultralytics.com/tasks/classify/), [Vite](https://vite.dev/guide/), and [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/).

## License

The application source code and project documentation are available under the [MIT License](LICENSE).

Dataset images, model weights, and original research artifacts are outside the scope of this license. Refer to their original sources for reuse terms. Third-party assets retain their own licenses.
