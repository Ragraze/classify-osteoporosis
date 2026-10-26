import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone


SCHEMA = """
CREATE TABLE IF NOT EXISTS predictions (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    image_name TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    model TEXT NOT NULL,
    label TEXT NOT NULL,
    confidence REAL NOT NULL,
    probabilities TEXT NOT NULL,
    inference_ms REAL NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS predictions_created_at ON predictions(created_at DESC);
"""


@contextmanager
def connection(path):
    db = sqlite3.connect(path, timeout=15)
    db.row_factory = sqlite3.Row
    try:
        yield db
        db.commit()
    finally:
        db.close()


def initialize(path):
    with connection(path) as db:
        db.executescript(SCHEMA)


def serialize(row):
    data = dict(row)
    data.pop("image_name", None)
    data["probabilities"] = json.loads(data["probabilities"])
    data["image_url"] = f"/api/predictions/{data['id']}/image"
    return data


def save(path, item):
    record = {**item, "probabilities": json.dumps(item["probabilities"])}
    keys = list(record)
    with connection(path) as db:
        db.execute(f"INSERT INTO predictions ({', '.join(keys)}) VALUES ({', '.join('?' for _ in keys)})", list(record.values()))


def find(path, prediction_id):
    with connection(path) as db:
        return db.execute("SELECT * FROM predictions WHERE id = ?", (prediction_id,)).fetchone()


def delete(path, prediction_id, uploads):
    with connection(path) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT image_name FROM predictions WHERE id = ?", (prediction_id,)).fetchone()
        if row is None:
            return False
        db.execute("DELETE FROM predictions WHERE id = ?", (prediction_id,))
        (uploads / row["image_name"]).unlink(missing_ok=True)
    return True


def history(path, search="", label="", model="", page=1, per_page=10):
    clauses, values = [], []
    if search:
        clauses.append("(instr(lower(filename), lower(?)) > 0 OR instr(lower(id), lower(?)) > 0)")
        values.extend([search, search])
    for column, value in (("label", label), ("model", model)):
        if value:
            clauses.append(f"{column} = ?")
            values.append(value)
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    with connection(path) as db:
        total = db.execute("SELECT COUNT(*) FROM predictions" + where, values).fetchone()[0]
        rows = db.execute("SELECT * FROM predictions" + where + " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", [*values, per_page, (page - 1) * per_page]).fetchall()
    return {"items": [serialize(row) for row in rows], "total": total, "page": page, "per_page": per_page}


def summary(path):
    with connection(path) as db:
        row = db.execute("""SELECT COUNT(*) AS total,
            COALESCE(SUM(label = 'normal'), 0) AS normal,
            COALESCE(SUM(label = 'osteoporosis'), 0) AS osteoporosis,
            AVG(confidence) AS avg_confidence,
            AVG(inference_ms) AS avg_inference_ms FROM predictions""").fetchone()
        counts = dict(db.execute("SELECT substr(created_at, 1, 10), COUNT(*) FROM predictions GROUP BY substr(created_at, 1, 10)").fetchall())
    today = datetime.now(timezone.utc).date()
    activity = [{"date": (today - timedelta(days=6-index)).isoformat(), "count": counts.get((today - timedelta(days=6-index)).isoformat(), 0)} for index in range(7)]
    return {**dict(row), "activity": activity, "recent": history(path, per_page=5)["items"]}
