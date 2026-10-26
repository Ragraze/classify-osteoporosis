# Research artifacts

The `classify-osteoporosis.ipynb` notebook and the `train-*` and `val-*` directories contain the original research outputs. Their contents were preserved when moved from the repository root.

The backend reads metrics and evaluation images from `train-*/`. Git LFS pointers are stored in `train-*/weights/`; `scripts/download_models.py` saves downloaded weights in `.models/` at the repository root. The `val-*` directories hold separate validation results and do not replace the training metrics shown in the dashboard.

The notebook still contains paths from the original experiment environment. Adjust those paths and dependencies before rerunning the experiment. To run the local application, follow the commands in the [main README](../README.md).
