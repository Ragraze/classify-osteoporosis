# Docker verification

The root `Dockerfile` builds the React frontend, prepares model weights, and serves the production frontend and Flask API with Gunicorn. The runtime uses CPU PyTorch and an unprivileged user. `.dockerignore` excludes credentials, local dependencies, history, archives, and generated artifacts from the build context.

## Checks performed

- PASS: a complete `docker build -t classify-osteoporosis .` from the repository with Git LFS pointer files and no local weights in the build context.
- PASS: SHA-256 verification of all five downloaded model weights.
- PASS: a separate `MODEL_VARIANT=nano` build. Its model catalog retains all five training series and enables inference only for Nano.
- PASS: the model preparation stage also builds with a materialized Nano weight file, as produced by Git LFS, and normalizes it into the model cache.
- PASS: the production container becomes healthy through the Docker health check and serves requests through Gunicorn.
- PASS: the process runs as UID 10001, and `torch.version.cuda` is `None`.
- PASS: the React HTML and its JavaScript asset return successfully.
- PASS: all five model catalogs report ready, Nano retains 60 training epochs, and all five confusion matrix images are readable.
- PASS: both dataset classes return image listings and readable JPEG thumbnails.
- PASS: an actual Nano prediction returns HTTP 201, stores its normalized image, updates the dashboard, and appears in the CSV export.
- PASS: the prediction and image survive removal and recreation of the container using the same named volume.
- PASS: `.git`, local credentials, `.venv`, `node_modules`, and the dataset ZIP are absent from the runtime application directory.
- PASS: README local links and `git diff --check`.

The runtime checks used containers with `--network none` and no published host ports. Test containers and their temporary data volume were removed after verification. The application source and UI were unchanged.
